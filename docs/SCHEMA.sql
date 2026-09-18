/* ============================================================================
   ARHAM ELECTRONICS ERP — PRODUCTION SCHEMA v2
   Database: PostgreSQL (Supabase)
   ============================================================================

   ⚠️  IMPORTANT RULES (Section 37 ke mutabiq)
   ---------------------------------------------------------------------------
   1. Yeh file IDEMPOTENT hai — IF NOT EXISTS use hui hai. Dobara run safe hai.
   2. Koi DROP TABLE / DROP COLUMN nahi. Koi data destroy nahi hota.
   3. Financial/stock transactions KABHI hard-delete nahi hote — sirf
      status = 'cancelled' / 'reversed' hota hai (Section 27).
   4. Har imported record apna source trace karta hai:
      source_file, source_sheet, source_row, migration_batch (Section 5).
   5. Dashboard/report totals KABHI manually store nahi hote —
      woh transactions se DERIVED hote hain (Section 42).
   6. Reconciliation columns source_value aur erp_value DONO rakhte hain —
      conflict par dono mehfooz (Section 37).

   MIGRATION PATH (Section 5):
     source -> migration_rows (staging) -> normalize -> match ->
     manual review -> master -> transactions -> reconciliation -> verified
   ============================================================================ */


/* ============================================================================
   SECTION 1 — EXTENSIONS & UTILITIES
   ============================================================================ */

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

/* Updated-at trigger function (dobar-dobar reuse hoti hai) */
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/* Normalized-name function — Postgres side par bhi wahi logic jo
   js/core/normalize.js mein hai. Matching SQL aur JS dono jagah consistent. */
CREATE OR REPLACE FUNCTION normalize_name(input TEXT)
RETURNS TEXT AS $$
DECLARE
  s TEXT;
BEGIN
  IF input IS NULL THEN RETURN ''; END IF;
  s := lower(input);
  s := regexp_replace(s, '[^a-z0-9\s]', ' ', 'g');   -- punctuation hatao
  s := regexp_replace(s, '\s+', ' ', 'g');           -- extra spaces
  s := btrim(s);
  -- business noise words hatao
  s := regexp_replace(s, '\y(electronics|electronic|electric|elec|elt|traders|trader|trading|enterprises|enterprise|company|sons|brothers|limited|pvt|ltd|inc|corp|stores?)\y', ' ', 'g');
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := btrim(s);
  -- "6 kv" -> "6kv"
  s := regexp_replace(s, '\y([0-9]+)\s+(kv|kva|kw|w|ah|v|mm|inch|in|amp|a)\y', '\1\2', 'g');
  RETURN s;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


/* ============================================================================
   SECTION 2 — ENUM TYPES (idempotent quotes)
   ============================================================================ */

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE record_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE txn_status AS ENUM ('draft', 'posted', 'cancelled', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM (
    'opening_stock', 'purchase', 'sale',
    'purchase_return', 'sales_return', 'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_direction AS ENUM ('in', 'out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'cash', 'bank', 'cheque', 'online', 'card', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM (
    'asset', 'liability', 'equity', 'revenue', 'expense'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM (
    'staged', 'normalized', 'matched', 'new', 'needs_review',
    'approved', 'rejected', 'committed', 'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


/* ============================================================================
   SECTION 3 — USERS & SECURITY  (Section 25, 26)
   ============================================================================ */

/* profiles — Supabase auth.users se 1:1 linked. Role yahan rehta hai. */
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  email         TEXT,
  full_name     TEXT,
  role          user_role NOT NULL DEFAULT 'staff',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

/* Role permissions — Section 25 ka permission matrix, DB mein editable */
CREATE TABLE IF NOT EXISTS role_permissions (
  id          SERIAL PRIMARY KEY,
  role        user_role NOT NULL,
  permission  TEXT NOT NULL,
  allowed     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (role, permission)
);


/* ============================================================================
   SECTION 4 — MASTER DATA  (Section 17, 6, 7)
   ============================================================================ */

CREATE TABLE IF NOT EXISTS brands (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  name_key   TEXT NOT NULL,
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name_key)
);

CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  name_key   TEXT NOT NULL,
  parent_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name_key)
);

CREATE TABLE IF NOT EXISTS warehouses (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  location   TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

/* products — Section 17 ka full field set.
   ⚠️  current_quantity / current_value YAHAN STORE NAHI HOTE.
       Woh stock_movements se DERIVED hote hain (Section 8, 42).
       Sirf cached_quantity rakha hai — reconciliation target, source of truth nahi. */
CREATE TABLE IF NOT EXISTS products (
  id              SERIAL PRIMARY KEY,
  sku             TEXT UNIQUE,
  name            TEXT NOT NULL,
  name_key        TEXT NOT NULL,
  brand_id        INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  model           TEXT,
  unit            TEXT DEFAULT 'pcs',
  cost_price      NUMERIC(14,2) NOT NULL DEFAULT 0,    -- default sale-time cost
  sale_price      NUMERIC(14,2) NOT NULL DEFAULT 0,
  minimum_stock   NUMERIC(14,3) NOT NULL DEFAULT 0,
  warehouse_id    INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
  status          record_status NOT NULL DEFAULT 'active',
  notes           TEXT,

  /* Reconciliation-only cache. Source of truth = stock_movements. */
  cached_quantity NUMERIC(14,3),
  cached_value    NUMERIC(14,2),

  /* Source traceability (Section 5) */
  source_file     TEXT,
  source_sheet    TEXT,
  source_row      INTEGER,
  migration_batch TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_name_key ON products (name_key);
CREATE INDEX IF NOT EXISTS idx_products_brand    ON products (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_status   ON products (status);

/* product_aliases — Section 6: "Preserve aliases/source names" */
CREATE TABLE IF NOT EXISTS product_aliases (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  alias_name   TEXT NOT NULL,
  alias_key    TEXT NOT NULL,
  source_file  TEXT,
  source_sheet TEXT,
  source_row   INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_aliases_key ON product_aliases (alias_key);

/* customers — Section 7 */
CREATE TABLE IF NOT EXISTS customers (
  id              SERIAL PRIMARY KEY,
  code            TEXT UNIQUE,
  name            TEXT NOT NULL,
  name_key        TEXT NOT NULL,
  phone           TEXT,
  phone_key       TEXT,
  address         TEXT,
  city            TEXT,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  opening_date    DATE,
  credit_limit    NUMERIC(14,2),
  status          record_status NOT NULL DEFAULT 'active',
  notes           TEXT,
  source_file     TEXT,
  source_sheet    TEXT,
  source_row      INTEGER,
  migration_batch TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_name_key  ON customers (name_key);
CREATE INDEX IF NOT EXISTS idx_customers_phone_key ON customers (phone_key);

/* customers aliases — Section 7: "Preserve aliases/source names" */
CREATE TABLE IF NOT EXISTS customer_aliases (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  alias_name   TEXT NOT NULL,
  alias_key    TEXT NOT NULL,
  source_file  TEXT,
  source_sheet TEXT,
  source_row   INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_aliases_key ON customer_aliases (alias_key);

/* suppliers — Section 7 */
CREATE TABLE IF NOT EXISTS suppliers (
  id              SERIAL PRIMARY KEY,
  code            TEXT UNIQUE,
  name            TEXT NOT NULL,
  name_key        TEXT NOT NULL,
  phone           TEXT,
  phone_key       TEXT,
  address         TEXT,
  city            TEXT,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  opening_date    DATE,
  status          record_status NOT NULL DEFAULT 'active',
  notes           TEXT,
  source_file     TEXT,
  source_sheet    TEXT,
  source_row      INTEGER,
  migration_batch TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name_key  ON suppliers (name_key);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone_key ON suppliers (phone_key);

CREATE TABLE IF NOT EXISTS supplier_aliases (
  id           SERIAL PRIMARY KEY,
  supplier_id  INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  alias_name   TEXT NOT NULL,
  alias_key    TEXT NOT NULL,
  source_file  TEXT,
  source_sheet TEXT,
  source_row   INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_aliases_key ON supplier_aliases (alias_key);


/* ============================================================================
   SECTION 5 — CHART OF ACCOUNTS & JOURNAL  (Section 14)
   ============================================================================ */

CREATE TABLE IF NOT EXISTS accounts (
  id             SERIAL PRIMARY KEY,
  code           TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  account_type   account_type NOT NULL,
  parent_id      INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  is_cash        BOOLEAN NOT NULL DEFAULT FALSE,
  is_bank        BOOLEAN NOT NULL DEFAULT FALSE,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id            SERIAL PRIMARY KEY,
  entry_no      TEXT UNIQUE NOT NULL,
  entry_date    DATE NOT NULL,
  description   TEXT,
  reference     TEXT,
  status        txn_status NOT NULL DEFAULT 'posted',
  total_debit   NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_credit  NUMERIC(14,2) NOT NULL DEFAULT 0,
  cancelled_at  TIMESTAMPTZ,
  cancel_reason TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* Double-entry integrity: debits MUST equal credits */
  CONSTRAINT chk_journal_balanced CHECK (total_debit = total_credit)
);
CREATE INDEX IF NOT EXISTS idx_journal_date   ON journal_entries (entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_status ON journal_entries (status);

CREATE TABLE IF NOT EXISTS journal_lines (
  id               SERIAL PRIMARY KEY,
  journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
  account_id       INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  debit            NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit           NUMERIC(14,2) NOT NULL DEFAULT 0,
  description      TEXT,
  /* Ek line mein debit YA credit — dono nahi, aur ek zero/positive */
  CONSTRAINT chk_line_one_sided CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  ),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry   ON journal_lines (journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines (account_id);


/* ============================================================================
   SECTION 6 — INVOICE / VOUCHER SEQUENCES  (Section 18: unique numbering)
   ============================================================================ */

CREATE TABLE IF NOT EXISTS invoice_sequences (
  id          SERIAL PRIMARY KEY,
  seq_key     TEXT UNIQUE NOT NULL,   -- e.g. "INV-2026"
  prefix      TEXT NOT NULL,
  year        INTEGER NOT NULL,
  last_value  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

/* Atomic sequence allocator — concurrent users ke liye safe */
CREATE OR REPLACE FUNCTION next_sequence(p_prefix TEXT, p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_key   TEXT := p_prefix || '-' || p_year;
  v_val   INTEGER;
BEGIN
  INSERT INTO invoice_sequences (seq_key, prefix, year, last_value)
  VALUES (v_key, p_prefix, p_year, 0)
  ON CONFLICT (seq_key) DO NOTHING;

  UPDATE invoice_sequences
     SET last_value = last_value + 1,
         updated_at = now()
   WHERE seq_key = v_key
  RETURNING last_value INTO v_val;

  RETURN v_key || '-' || lpad(v_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;


/* ============================================================================
   SECTION 7 — INVENTORY MOVEMENTS  (Section 8)
   ⚠️  YEH TABLE INVENTORY KA SOURCE OF TRUTH HAI.
       Quantity kabhi overwrite NA hoti — sirf movement add hoti hai.
   ============================================================================ */

CREATE TABLE IF NOT EXISTS stock_movements (
  id              BIGSERIAL PRIMARY KEY,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id    INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
  occurred_at     DATE NOT NULL,
  movement_type   movement_type NOT NULL,

  /* Signed quantity: + inbound, - outbound (JS core/inventory.js se match) */
  quantity        NUMERIC(14,3) NOT NULL,
  unit_cost       NUMERIC(14,4) NOT NULL DEFAULT 0,
  total_cost      NUMERIC(14,2) NOT NULL DEFAULT 0,

  /* Link to the transaction that caused this movement */
  sale_id         BIGINT,
  purchase_id     BIGINT,
  sales_return_id BIGINT,
  purchase_return_id BIGINT,
  adjustment_id   BIGINT,
  reference       TEXT,

  /* Source traceability (Section 5) */
  source_file     TEXT,
  source_sheet    TEXT,
  source_row      INTEGER,
  migration_batch TEXT,

  notes           TEXT,
  status          txn_status NOT NULL DEFAULT 'posted',
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  /* Zero-quantity movement ka koi matlab nahi */
  CONSTRAINT chk_movement_nonzero CHECK (quantity <> 0)
);
CREATE INDEX IF NOT EXISTS idx_movements_product  ON stock_movements (product_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_movements_date     ON stock_movements (occurred_at);
CREATE INDEX IF NOT EXISTS idx_movements_type     ON stock_movements (movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_sale     ON stock_movements (sale_id);
CREATE INDEX IF NOT EXISTS idx_movements_purchase ON stock_movements (purchase_id);

/* Quantity ka single source of truth — DERIVED, stored nahi */
CREATE OR REPLACE VIEW v_product_stock AS
SELECT
  p.id                                                                   AS product_id,
  p.sku,
  p.name,
  p.minimum_stock,
  COALESCE(SUM(m.quantity) FILTER (WHERE m.status = 'posted'), 0)         AS quantity,
  CASE
    WHEN COALESCE(SUM(m.quantity) FILTER (WHERE m.status = 'posted' AND m.quantity > 0), 0) > 0
      THEN ROUND(
             COALESCE(SUM(m.quantity * m.unit_cost) FILTER (WHERE m.status='posted' AND m.quantity > 0), 0)
             / SUM(m.quantity) FILTER (WHERE m.status='posted' AND m.quantity > 0)
           , 4)
    ELSE 0
  END                                                                     AS avg_cost
FROM products p
LEFT JOIN stock_movements m ON m.product_id = p.id
GROUP BY p.id, p.sku, p.name, p.minimum_stock;

/* Low-stock view (Section 16: Low Stock Items) */
CREATE OR REPLACE VIEW v_low_stock AS
SELECT * FROM v_product_stock
WHERE quantity <= minimum_stock;


/* ============================================================================
   SECTION 8 — SALES  (Section 9, 18)
   ============================================================================ */

CREATE TABLE IF NOT EXISTS sales (
  id               BIGSERIAL PRIMARY KEY,
  invoice_no       TEXT UNIQUE NOT NULL,
  sale_date        DATE NOT NULL,
  customer_id      INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name    TEXT,                    -- cash sale ke liye snapshot
  is_cash_sale     BOOLEAN NOT NULL DEFAULT FALSE,

  subtotal         NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax              NUMERIC(14,2) NOT NULL DEFAULT 0,
  total            NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance          NUMERIC(14,2) NOT NULL DEFAULT 0,   -- credit portion

  cogs             NUMERIC(14,2) NOT NULL DEFAULT 0,   -- from weighted avg
  gross_profit     NUMERIC(14,2) NOT NULL DEFAULT 0,

  status           txn_status NOT NULL DEFAULT 'posted',
  payment_method   payment_method,
  reference        TEXT,
  notes            TEXT,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_date     ON sales (sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_status   ON sales (status);

CREATE TABLE IF NOT EXISTS sale_items (
  id            BIGSERIAL PRIMARY KEY,
  sale_id       BIGINT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity      NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(14,2) NOT NULL,
  discount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total    NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_cost     NUMERIC(14,4) NOT NULL DEFAULT 0,   -- snapshot at sale time
  cogs          NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale    ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items (product_id);

/* sales_returns — Section 11. Original sale KABHI destroy nahi hoti. */
CREATE TABLE IF NOT EXISTS sales_returns (
  id             BIGSERIAL PRIMARY KEY,
  return_no      TEXT UNIQUE NOT NULL,
  return_date    DATE NOT NULL,
  sale_id        BIGINT REFERENCES sales(id) ON DELETE SET NULL,
  customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  gross_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
  cogs_reversed  NUMERIC(14,2) NOT NULL DEFAULT 0,
  reason         TEXT,
  status         txn_status NOT NULL DEFAULT 'posted',
  cancelled_at   TIMESTAMPTZ,
  cancel_reason  TEXT,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_returns_date     ON sales_returns (return_date);
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer ON sales_returns (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_sale     ON sales_returns (sale_id);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id              BIGSERIAL PRIMARY KEY,
  sales_return_id BIGINT NOT NULL REFERENCES sales_returns(id) ON DELETE RESTRICT,
  sale_item_id    BIGINT REFERENCES sale_items(id) ON DELETE SET NULL,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity        NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_cost       NUMERIC(14,4) NOT NULL DEFAULT 0,
  line_total      NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


/* ============================================================================
   SECTION 9 — PURCHASES  (Section 10, 19)
   ============================================================================ */

CREATE TABLE IF NOT EXISTS purchases (
  id               BIGSERIAL PRIMARY KEY,
  bill_no          TEXT,
  purchase_date    DATE NOT NULL,
  supplier_id      INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name    TEXT,

  subtotal         NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax              NUMERIC(14,2) NOT NULL DEFAULT 0,
  total            NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance          NUMERIC(14,2) NOT NULL DEFAULT 0,

  status           txn_status NOT NULL DEFAULT 'posted',
  payment_method   payment_method,
  reference        TEXT,
  notes            TEXT,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchases_date     ON purchases (purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status   ON purchases (status);

CREATE TABLE IF NOT EXISTS purchase_items (
  id            BIGSERIAL PRIMARY KEY,
  purchase_id   BIGINT NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity      NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost     NUMERIC(14,2) NOT NULL,
  discount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total    NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product  ON purchase_items (product_id);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id             BIGSERIAL PRIMARY KEY,
  return_no      TEXT UNIQUE NOT NULL,
  return_date    DATE NOT NULL,
  purchase_id    BIGINT REFERENCES purchases(id) ON DELETE SET NULL,
  supplier_id    INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  gross_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
  reason         TEXT,
  status         txn_status NOT NULL DEFAULT 'posted',
  cancelled_at   TIMESTAMPTZ,
  cancel_reason  TEXT,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id                  BIGSERIAL PRIMARY KEY,
  purchase_return_id  BIGINT NOT NULL REFERENCES purchase_returns(id) ON DELETE RESTRICT,
  purchase_item_id    BIGINT REFERENCES purchase_items(id) ON DELETE SET NULL,
  product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity            NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost           NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total          NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


/* ============================================================================
   SECTION 10 — STOCK ADJUSTMENTS  (Section 8, 27)
   Quantity overwrite ka JAYAZ rasta — magar movement ke through.
   ============================================================================ */

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id            BIGSERIAL PRIMARY KEY,
  adjustment_no TEXT UNIQUE NOT NULL,
  adjustment_date DATE NOT NULL,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_delta NUMERIC(14,3) NOT NULL,     -- + ya -
  unit_cost     NUMERIC(14,4) NOT NULL DEFAULT 0,
  reason        TEXT NOT NULL,               -- LAZMI — Section 26 audit
  reference     TEXT,
  status        txn_status NOT NULL DEFAULT 'posted',
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


/* ============================================================================
   SECTION 11 — LEDGERS  (Section 12, 13)
   Sign convention: DEBIT = party par waajib (barhta), CREDIT = adjust (ghatta)
   balance = opening + SUM(debit) - SUM(credit)
   ============================================================================ */

CREATE TABLE IF NOT EXISTS customer_ledger (
  id            BIGSERIAL PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  occurred_at   DATE NOT NULL,
  entry_type    TEXT NOT NULL,      -- credit_sale | payment | sales_return | adjustment | opening
  debit         NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit        NUMERIC(14,2) NOT NULL DEFAULT 0,
  reference     TEXT,
  description   TEXT,
  sale_id       BIGINT REFERENCES sales(id) ON DELETE SET NULL,
  payment_id    BIGINT,
  sales_return_id BIGINT REFERENCES sales_returns(id) ON DELETE SET NULL,

  source_file   TEXT,
  source_sheet  TEXT,
  source_row    INTEGER,
  migration_batch TEXT,

  status        txn_status NOT NULL DEFAULT 'posted',
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_cust_ledger_one_sided CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);
CREATE INDEX IF NOT EXISTS idx_cust_ledger_party ON customer_ledger (customer_id, occurred_at);

CREATE TABLE IF NOT EXISTS supplier_ledger (
  id            BIGSERIAL PRIMARY KEY,
  supplier_id   INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  occurred_at   DATE NOT NULL,
  entry_type    TEXT NOT NULL,      -- credit_purchase | payment | purchase_return | adjustment | opening
  debit         NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit        NUMERIC(14,2) NOT NULL DEFAULT 0,
  reference     TEXT,
  description   TEXT,
  purchase_id   BIGINT REFERENCES purchases(id) ON DELETE SET NULL,
  payment_id    BIGINT,
  purchase_return_id BIGINT REFERENCES purchase_returns(id) ON DELETE SET NULL,

  source_file   TEXT,
  source_sheet  TEXT,
  source_row    INTEGER,
  migration_batch TEXT,

  status        txn_status NOT NULL DEFAULT 'posted',
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_supp_ledger_one_sided CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);
CREATE INDEX IF NOT EXISTS idx_supp_ledger_party ON supplier_ledger (supplier_id, occurred_at);

/* Running balance views — Section 42: totals DERIVED, stored nahi */
CREATE OR REPLACE VIEW v_customer_balances AS
SELECT
  c.id AS customer_id,
  c.code,
  c.name,
  c.opening_balance,
  c.opening_balance
    + COALESCE(SUM(l.debit)  FILTER (WHERE l.status = 'posted'), 0)
    - COALESCE(SUM(l.credit) FILTER (WHERE l.status = 'posted'), 0) AS balance
FROM customers c
LEFT JOIN customer_ledger l ON l.customer_id = c.id
GROUP BY c.id, c.code, c.name, c.opening_balance;

CREATE OR REPLACE VIEW v_supplier_balances AS
SELECT
  s.id AS supplier_id,
  s.code,
  s.name,
  s.opening_balance,
  s.opening_balance
    + COALESCE(SUM(l.credit) FILTER (WHERE l.status = 'posted'), 0)
    - COALESCE(SUM(l.debit)  FILTER (WHERE l.status = 'posted'), 0) AS balance
FROM suppliers s
LEFT JOIN supplier_ledger l ON l.supplier_id = s.id
GROUP BY s.id, s.code, s.name, s.opening_balance;


/* ============================================================================
   SECTION 12 — PAYMENTS  (Section 23)
   ============================================================================ */

CREATE TABLE IF NOT EXISTS payments (
  id             BIGSERIAL PRIMARY KEY,
  voucher_no     TEXT UNIQUE NOT NULL,
  occurred_at    DATE NOT NULL,
  direction      payment_direction NOT NULL,   -- in = received, out = paid
  party_type     TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier', 'other')),
  customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id    INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method         payment_method NOT NULL DEFAULT 'cash',
  account_id     INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  reference      TEXT,                          -- cheque no / txn id
  notes          TEXT,
  sale_id        BIGINT REFERENCES sales(id) ON DELETE SET NULL,
  purchase_id    BIGINT REFERENCES purchases(id) ON DELETE SET NULL,
  status         txn_status NOT NULL DEFAULT 'posted',
  cancelled_at   TIMESTAMPTZ,
  cancel_reason  TEXT,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_date     ON payments (occurred_at);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments (supplier_id);

/* ⚠️  circular FK: customer_ledger.payment_id -> payments.id */
ALTER TABLE customer_ledger
  DROP CONSTRAINT IF EXISTS fk_cust_ledger_payment;
ALTER TABLE customer_ledger
  ADD CONSTRAINT fk_cust_ledger_payment
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

ALTER TABLE supplier_ledger
  DROP CONSTRAINT IF EXISTS fk_supp_ledger_payment;
ALTER TABLE supplier_ledger
  ADD CONSTRAINT fk_supp_ledger_payment
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

/* Sales/purchase -> movement links */
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS fk_movement_sale;
ALTER TABLE stock_movements
  ADD CONSTRAINT fk_movement_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL;

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS fk_movement_purchase;
ALTER TABLE stock_movements
  ADD CONSTRAINT fk_movement_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL;

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS fk_movement_sales_return;
ALTER TABLE stock_movements
  ADD CONSTRAINT fk_movement_sales_return FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id) ON DELETE SET NULL;

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS fk_movement_purchase_return;
ALTER TABLE stock_movements
  ADD CONSTRAINT fk_movement_purchase_return FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE SET NULL;

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS fk_movement_adjustment;
ALTER TABLE stock_movements
  ADD CONSTRAINT fk_movement_adjustment FOREIGN KEY (adjustment_id) REFERENCES stock_adjustments(id) ON DELETE SET NULL;


/* ============================================================================
   SECTION 13 — EXPENSES  (Section 22)
   ============================================================================ */

CREATE TABLE IF NOT EXISTS expenses (
  id            BIGSERIAL PRIMARY KEY,
  voucher_no    TEXT UNIQUE NOT NULL,
  occurred_at   DATE NOT NULL,
  category      TEXT NOT NULL,
  description   TEXT,
  amount        NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method        payment_method NOT NULL DEFAULT 'cash',
  account_id    INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  reference     TEXT,
  notes         TEXT,
  status        txn_status NOT NULL DEFAULT 'posted',
  cancelled_at  TIMESTAMPTZ,
  cancel_reason TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses (occurred_at);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);


/* ============================================================================
   SECTION 14 — MIGRATION STAGING  (Section 5, 29)
   ⚠️  YEH TABLES SOURCE DATA KA ASLI AKS HAIN.
       raw_json mein values BILKUL waisi hain jaisi source mein thi.
       Kuch bhi modify/overwrite NAHI hota (Section 37).
   ============================================================================ */

CREATE TABLE IF NOT EXISTS migration_batches (
  id            TEXT PRIMARY KEY,             -- BATCH-2026-09-18-A1B2
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  files         JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{name, sheets:[]}]
  status        TEXT NOT NULL DEFAULT 'staging',       -- staging|reviewed|committed|aborted
  counts        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,        -- Section 28
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS migration_rows (
  id               BIGSERIAL PRIMARY KEY,
  migration_batch  TEXT NOT NULL REFERENCES migration_batches(id) ON DELETE RESTRICT,
  entity_type      TEXT NOT NULL,   -- product|customer|supplier|movement|ledger|payment|sale|purchase
  source_file      TEXT NOT NULL,   -- Section 5: traceability LAZMI
  source_sheet     TEXT NOT NULL,
  source_row       INTEGER NOT NULL,
  source_reference TEXT,

  raw_json         JSONB NOT NULL,             -- ASLI values, bina tabdeeli
  normalized       JSONB,                      -- normalizeKey() ka output
  source_hash      TEXT,                       -- duplicate import se bachne ke liye

  review_status    review_status NOT NULL DEFAULT 'staged',
  matched_to_id    INTEGER,
  match_confidence NUMERIC(5,4),
  review_reason    TEXT,                       -- Section 37: uncertainty HIDE na karein
  reviewed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,

  /* Section 37: "If source data conflicts: PRESERVE BOTH SOURCE VALUES" */
  conflict_flag    BOOLEAN NOT NULL DEFAULT FALSE,
  conflict_detail  JSONB,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (migration_batch, source_file, source_sheet, source_row, entity_type)
);
CREATE INDEX IF NOT EXISTS idx_mig_rows_batch   ON migration_rows (migration_batch);
CREATE INDEX IF NOT EXISTS idx_mig_rows_status  ON migration_rows (review_status);
CREATE INDEX IF NOT EXISTS idx_mig_rows_entity  ON migration_rows (entity_type);
CREATE INDEX IF NOT EXISTS idx_mig_rows_hash    ON migration_rows (source_hash);


/* ============================================================================
   SECTION 15 — RECONCILIATION  (Section 28)
   ⚠️  source_value AUR erp_value DONO mehfooz — ek bhi overwrite nahi.
   ============================================================================ */

CREATE TABLE IF NOT EXISTS reconciliation (
  id              BIGSERIAL PRIMARY KEY,
  run_id          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,

  entity_type     TEXT NOT NULL,   -- stock | customer-ledger | supplier-ledger | inventory-value | ...
  entity_label    TEXT,
  entity_ref_id   INTEGER,

  source_value    NUMERIC(16,4),   -- source ka value (as-is)
  erp_value       NUMERIC(16,4),   -- ERP ka derived value
  difference      NUMERIC(16,4),   -- erp - source
  tolerance       NUMERIC(16,4) NOT NULL DEFAULT 0.5,

  status          TEXT NOT NULL,   -- matched | differs | missing-source | missing-erp | not-comparable
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  note            TEXT,

  /* Section 5: reconciliation bhi traceable */
  source_file     TEXT,
  source_sheet    TEXT,
  source_row      INTEGER,
  migration_batch TEXT
);
CREATE INDEX IF NOT EXISTS idx_recon_run    ON reconciliation (run_id);
CREATE INDEX IF NOT EXISTS idx_recon_status ON reconciliation (status);

/* Reconciliation ka summary view — migration dashboard use karega (Section 29) */
CREATE OR REPLACE VIEW v_reconciliation_summary AS
SELECT
  entity_type,
  COUNT(*)                                            AS total_rows,
  COUNT(*) FILTER (WHERE status = 'matched')          AS matched,
  COUNT(*) FILTER (WHERE status <> 'matched')         AS requires_review,
  ROUND(SUM(ABS(difference)), 2)                      AS total_abs_difference
FROM reconciliation
GROUP BY entity_type;


/* ============================================================================
   SECTION 16 — AUDIT LOG  (Section 26)
   ============================================================================ */

CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email   TEXT,
  action       TEXT NOT NULL,       -- login|logout|create|update|cancel|adjust|migrate|...
  entity_type  TEXT,                -- product|sale|purchase|payment|customer|...
  entity_id    TEXT,
  old_value    JSONB,               -- Section 26
  new_value    JSONB,
  reason       TEXT,
  reference    TEXT,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_date   ON audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log (action);


/* ============================================================================
   SECTION 17 — SETTINGS, ATTACHMENTS, BACKUPS  (Section 30, 32)
   ============================================================================ */

CREATE TABLE IF NOT EXISTS settings (
  id          SERIAL PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  value       JSONB,
  description TEXT,
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attachments (
  id           BIGSERIAL PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  storage_path TEXT NOT NULL,       -- Supabase Storage path
  mime_type    TEXT,
  size_bytes   BIGINT,
  uploaded_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backup_log (
  id           BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  backup_type  TEXT NOT NULL,       -- manual|scheduled|pre_migration|pre_restore
  storage_path TEXT,
  row_counts   JSONB,
  checksum     TEXT,
  notes        TEXT
);


/* ============================================================================
   SECTION 18 — BANK / CASH ACCOUNTS  (Section 14, 23)
   ============================================================================ */

/* accounts table (Section 5) mein cash/bank flags hain.
   Yeh view unke balances journal se derive karta hai. */
CREATE OR REPLACE VIEW v_account_balances AS
SELECT
  a.id AS account_id,
  a.code,
  a.name,
  a.account_type,
  a.is_cash,
  a.is_bank,
  a.opening_balance
    + COALESCE(SUM(l.debit)  FILTER (WHERE j.status = 'posted'), 0)
    - COALESCE(SUM(l.credit) FILTER (WHERE j.status = 'posted'), 0) AS balance
FROM accounts a
LEFT JOIN journal_lines   l ON l.account_id = a.id
LEFT JOIN journal_entries j ON j.id = l.journal_entry_id
GROUP BY a.id, a.code, a.name, a.account_type, a.is_cash, a.is_bank, a.opening_balance;


/* ============================================================================
   SECTION 19 — DERIVED REPORT VIEWS  (Section 15, 24, 42)
   ⚠️  Yeh saare totals TRANSACTIONS se aate hain — hardcoded NAHI.
   ============================================================================ */

/* Profit & Loss (Section 15) */
CREATE OR REPLACE VIEW v_profit_loss AS
SELECT
  COALESCE((SELECT SUM(total) FROM sales WHERE status = 'posted'), 0)                       AS gross_sales,
  COALESCE((SELECT SUM(gross_amount) FROM sales_returns WHERE status = 'posted'), 0)        AS sales_returns,
  COALESCE((SELECT SUM(total) FROM sales WHERE status = 'posted'), 0)
    - COALESCE((SELECT SUM(gross_amount) FROM sales_returns WHERE status = 'posted'), 0)    AS net_sales,
  COALESCE((SELECT SUM(cogs) FROM sales WHERE status = 'posted'), 0)
    - COALESCE((SELECT SUM(cogs_reversed) FROM sales_returns WHERE status = 'posted'), 0)   AS cogs,
  COALESCE((SELECT SUM(total) FROM sales WHERE status = 'posted'), 0)
    - COALESCE((SELECT SUM(gross_amount) FROM sales_returns WHERE status = 'posted'), 0)
    - COALESCE((SELECT SUM(cogs) FROM sales WHERE status = 'posted'), 0)
    + COALESCE((SELECT SUM(cogs_reversed) FROM sales_returns WHERE status = 'posted'), 0)   AS gross_profit,
  COALESCE((SELECT SUM(amount) FROM expenses WHERE status = 'posted'), 0)                   AS total_expenses;

/* Dashboard KPIs (Section 16) — sab derived */
CREATE OR REPLACE VIEW v_dashboard_kpi AS
SELECT
  COALESCE((SELECT SUM(total) FROM sales WHERE status='posted' AND sale_date = CURRENT_DATE), 0)          AS today_sales,
  COALESCE((SELECT SUM(total) FROM purchases WHERE status='posted' AND purchase_date = CURRENT_DATE), 0)  AS today_purchases,
  COALESCE((SELECT SUM(amount) FROM payments WHERE status='posted' AND occurred_at = CURRENT_DATE), 0)    AS today_payments,
  COALESCE((SELECT SUM(balance) FROM v_customer_balances WHERE balance > 0), 0)                           AS receivables,
  COALESCE((SELECT SUM(balance) FROM v_supplier_balances WHERE balance > 0), 0)                           AS payables,
  COALESCE((SELECT SUM(quantity * avg_cost) FROM v_product_stock), 0)                                     AS inventory_value,
  COALESCE((SELECT COUNT(*) FROM v_low_stock), 0)                                                         AS low_stock_items,
  COALESCE((SELECT COUNT(*) FROM products WHERE status='active'), 0)                                       AS active_products;

/* Stock movement report (Section 24) */
CREATE OR REPLACE VIEW v_stock_movement_report AS
SELECT
  m.id,
  m.occurred_at,
  p.sku,
  p.name AS product_name,
  m.movement_type,
  m.quantity,
  m.unit_cost,
  m.total_cost,
  m.reference,
  m.source_file,
  m.source_sheet,
  m.source_row,
  m.status
FROM stock_movements m
JOIN products p ON p.id = m.product_id
ORDER BY m.occurred_at DESC, m.id DESC;


/* ============================================================================
   SECTION 20 — TRIGGERS
   ============================================================================ */

DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated ON customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_updated ON suppliers;
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_updated ON sales;
CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_purchases_updated ON purchases;
CREATE TRIGGER trg_purchases_updated BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated ON accounts;
CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


/* ============================================================================
   SECTION 21 — SEED: CHART OF ACCOUNTS  (Section 14)
   ⚠️  Yeh sirf ACCOUNT STRUCTURE hai — koi business/financial DATA nahi.
       Opening balances 0 hain. Koi fabricated amount nahi (Section 37).
   ============================================================================ */

INSERT INTO accounts (code, name, account_type, is_cash, is_bank) VALUES
  ('1000', 'Cash',                       'asset',     TRUE,  FALSE),
  ('1010', 'Bank',                       'asset',     FALSE, TRUE),
  ('1100', 'Accounts Receivable',        'asset',     FALSE, FALSE),
  ('1200', 'Inventory',                  'asset',     FALSE, FALSE),
  ('1300', 'Fixed Assets',               'asset',     FALSE, FALSE),
  ('2000', 'Accounts Payable',           'liability', FALSE, FALSE),
  ('2100', 'Tax Payable',                'liability', FALSE, FALSE),
  ('3000', 'Owner Capital',              'equity',    FALSE, FALSE),
  ('3100', 'Owner Drawings',             'equity',    FALSE, FALSE),
  ('3200', 'Retained Earnings',          'equity',    FALSE, FALSE),
  ('4000', 'Sales',                      'revenue',   FALSE, FALSE),
  ('4100', 'Sales Returns',              'revenue',   FALSE, FALSE),
  ('4200', 'Other Income',               'revenue',   FALSE, FALSE),
  ('5000', 'Cost of Goods Sold',         'expense',   FALSE, FALSE),
  ('5100', 'Purchases',                  'expense',   FALSE, FALSE),
  ('5200', 'Purchase Returns',           'expense',   FALSE, FALSE),
  ('6000', 'Salaries & Wages',           'expense',   FALSE, FALSE),
  ('6100', 'Rent',                       'expense',   FALSE, FALSE),
  ('6200', 'Utilities',                  'expense',   FALSE, FALSE),
  ('6300', 'Transport & Freight',        'expense',   FALSE, FALSE),
  ('6400', 'Office Expenses',            'expense',   FALSE, FALSE),
  ('6500', 'Marketing',                  'expense',   FALSE, FALSE),
  ('6900', 'Miscellaneous Expenses',     'expense',   FALSE, FALSE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO warehouses (name, location, is_default) VALUES
  ('Main Warehouse', NULL, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO settings (key, value, description) VALUES
  ('business.name',       '"Arham Electronics"', 'Business display name'),
  ('business.currency',   '"PKR"',               'Currency code'),
  ('business.invoice_prefix', '"INV"',           'Sales invoice prefix'),
  ('business.bill_prefix',    '"PUR"',           'Purchase bill prefix'),
  ('inventory.costing',   '"weighted_average"',  'Costing method (Section 8)'),
  ('security.signup_open','false',               'Public signup band hona chahiye (Section 25)'),
  ('migration.complete',  'false',               'Reconciliation ke bina true NAHI (Section 28)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role, permission, allowed) VALUES
  ('admin','dashboard',TRUE),('admin','products',TRUE),('admin','stock',TRUE),
  ('admin','sales',TRUE),('admin','purchases',TRUE),('admin','parties',TRUE),
  ('admin','ledger',TRUE),('admin','payments',TRUE),('admin','expenses',TRUE),
  ('admin','reports',TRUE),('admin','invoices',TRUE),('admin','search',TRUE),
  ('admin','settings',TRUE),('admin','users',TRUE),('admin','migration',TRUE),
  ('admin','backup',TRUE),('admin','audit',TRUE),('admin','financial_controls',TRUE),

  ('manager','dashboard',TRUE),('manager','products',TRUE),('manager','stock',TRUE),
  ('manager','sales',TRUE),('manager','purchases',TRUE),('manager','parties',TRUE),
  ('manager','ledger',TRUE),('manager','payments',TRUE),('manager','expenses',TRUE),
  ('manager','reports',TRUE),('manager','invoices',TRUE),('manager','search',TRUE),
  ('manager','settings',TRUE),('manager','users',FALSE),('manager','migration',FALSE),
  ('manager','backup',TRUE),('manager','audit',TRUE),('manager','financial_controls',FALSE),

  ('staff','dashboard',TRUE),('staff','products',TRUE),('staff','stock',TRUE),
  ('staff','sales',TRUE),('staff','purchases',TRUE),('staff','parties',TRUE),
  ('staff','ledger',FALSE),('staff','payments',FALSE),('staff','expenses',FALSE),
  ('staff','reports',FALSE),('staff','invoices',TRUE),('staff','search',TRUE),
  ('staff','settings',FALSE),('staff','users',FALSE),('staff','migration',FALSE),
  ('staff','backup',FALSE),('staff','audit',FALSE),('staff','financial_controls',FALSE)
ON CONFLICT (role, permission) DO NOTHING;

/* New user par automatically profile banane ka trigger */
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'staff',      -- Section 25: naya user STAFF banta hai, admin nahi
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


/* ============================================================================
   SECTION 22 — ROW LEVEL SECURITY  (Section 25)
   ⚠️  Enable karna LAZMI hai. Service_role key ke baghair data leak nahi hoga.
   ============================================================================ */

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales               ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger     ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_ledger     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_rows      ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_batches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation      ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings            ENABLE ROW LEVEL SECURITY;

/* Helper: current user ka role */
CREATE OR REPLACE FUNCTION current_role_name()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_permission(perm TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT allowed FROM role_permissions
      WHERE role = current_role_name() AND permission = perm),
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

/* ---- profiles ---- */
DROP POLICY IF EXISTS p_profiles_read ON profiles;
CREATE POLICY p_profiles_read ON profiles FOR SELECT
  USING (auth.uid() = id OR current_role_name() IN ('admin','manager'));

DROP POLICY IF EXISTS p_profiles_admin_write ON profiles;
CREATE POLICY p_profiles_admin_write ON profiles FOR ALL
  USING (current_role_name() = 'admin')
  WITH CHECK (current_role_name() = 'admin');

/* ---- master data (staff bhi sales/purchases ke liye read kar sakta hai) ---- */
DROP POLICY IF EXISTS p_products_read ON products;
CREATE POLICY p_products_read ON products FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS p_products_write ON products;
CREATE POLICY p_products_write ON products FOR ALL
  USING (has_permission('products')) WITH CHECK (has_permission('products'));

DROP POLICY IF EXISTS p_customers_read ON customers;
CREATE POLICY p_customers_read ON customers FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS p_customers_write ON customers;
CREATE POLICY p_customers_write ON customers FOR ALL
  USING (has_permission('parties')) WITH CHECK (has_permission('parties'));

DROP POLICY IF EXISTS p_suppliers_read ON suppliers;
CREATE POLICY p_suppliers_read ON suppliers FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS p_suppliers_write ON suppliers;
CREATE POLICY p_suppliers_write ON suppliers FOR ALL
  USING (has_permission('parties')) WITH CHECK (has_permission('parties'));

/* ---- financial tables ---- */
DROP POLICY IF EXISTS p_sales_read ON sales;
CREATE POLICY p_sales_read ON sales FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS p_sales_write ON sales;
CREATE POLICY p_sales_write ON sales FOR ALL
  USING (has_permission('sales')) WITH CHECK (has_permission('sales'));

DROP POLICY IF EXISTS p_purchases_read ON purchases;
CREATE POLICY p_purchases_read ON purchases FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS p_purchases_write ON purchases;
CREATE POLICY p_purchases_write ON purchases FOR ALL
  USING (has_permission('purchases')) WITH CHECK (has_permission('purchases'));

DROP POLICY IF EXISTS p_movements_read ON stock_movements;
CREATE POLICY p_movements_read ON stock_movements FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS p_movements_write ON stock_movements;
CREATE POLICY p_movements_write ON stock_movements FOR ALL
  USING (has_permission('stock')) WITH CHECK (has_permission('stock'));

DROP POLICY IF EXISTS p_cust_ledger_read ON customer_ledger;
CREATE POLICY p_cust_ledger_read ON customer_ledger FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS p_cust_ledger_write ON customer_ledger;
CREATE POLICY p_cust_ledger_write ON customer_ledger FOR ALL
  USING (has_permission('ledger')) WITH CHECK (has_permission('ledger'));

DROP POLICY IF EXISTS p_supp_ledger_read ON supplier_ledger;
CREATE POLICY p_supp_ledger_read ON supplier_ledger FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS p_supp_ledger_write ON supplier_ledger;
CREATE POLICY p_supp_ledger_write ON supplier_ledger FOR ALL
  USING (has_permission('ledger')) WITH CHECK (has_permission('ledger'));

DROP POLICY IF EXISTS p_payments_read ON payments;
CREATE POLICY p_payments_read ON payments FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS p_payments_write ON payments;
CREATE POLICY p_payments_write ON payments FOR ALL
  USING (has_permission('payments')) WITH CHECK (has_permission('payments'));

DROP POLICY IF EXISTS p_expenses_read ON expenses;
CREATE POLICY p_expenses_read ON expenses FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS p_expenses_write ON expenses;
CREATE POLICY p_expenses_write ON expenses FOR ALL
  USING (has_permission('expenses')) WITH CHECK (has_permission('expenses'));

/* ---- admin-only tables (Section 25) ---- */
DROP POLICY IF EXISTS p_audit_admin ON audit_log;
CREATE POLICY p_audit_admin ON audit_log FOR ALL
  USING (has_permission('audit')) WITH CHECK (has_permission('audit'));

DROP POLICY IF EXISTS p_migration_admin ON migration_rows;
CREATE POLICY p_migration_admin ON migration_rows FOR ALL
  USING (has_permission('migration')) WITH CHECK (has_permission('migration'));

DROP POLICY IF EXISTS p_batches_admin ON migration_batches;
CREATE POLICY p_batches_admin ON migration_batches FOR ALL
  USING (has_permission('migration')) WITH CHECK (has_permission('migration'));

DROP POLICY IF EXISTS p_recon_admin ON reconciliation;
CREATE POLICY p_recon_admin ON reconciliation FOR ALL
  USING (has_permission('migration')) WITH CHECK (has_permission('migration'));

DROP POLICY IF EXISTS p_settings_read ON settings;
CREATE POLICY p_settings_read ON settings FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS p_settings_admin ON settings;
CREATE POLICY p_settings_admin ON settings FOR ALL
  USING (has_permission('settings')) WITH CHECK (has_permission('settings'));


/* ============================================================================
   SECTION 23 — AUDIT TRIGGER  (Section 26)
   Financial tables par automatic audit — code bhool jaye to bhi log banega.
   ============================================================================ */

CREATE OR REPLACE FUNCTION audit_financial_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
BEGIN
  v_action := lower(TG_OP);
  INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_sales ON sales;
CREATE TRIGGER trg_audit_sales AFTER INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();

DROP TRIGGER IF EXISTS trg_audit_purchases ON purchases;
CREATE TRIGGER trg_audit_purchases AFTER INSERT OR UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();

DROP TRIGGER IF EXISTS trg_audit_payments ON payments;
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();

DROP TRIGGER IF EXISTS trg_audit_expenses ON expenses;
CREATE TRIGGER trg_audit_expenses AFTER INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();

DROP TRIGGER IF EXISTS trg_audit_movements ON stock_movements;
CREATE TRIGGER trg_audit_movements AFTER INSERT OR UPDATE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();

DROP TRIGGER IF EXISTS trg_audit_products ON products;
CREATE TRIGGER trg_audit_products AFTER INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_financial_change();


/* ============================================================================
   SECTION 24 — PREVENT HARD DELETE  (Section 27)
   Financial transactions ko physically delete karne par ROK.
   Cancel/reverse karna hoga — original auditable rehta hai.
   ============================================================================ */

CREATE OR REPLACE FUNCTION prevent_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'HARD DELETE BLOCKED: %. Section 27 ke mutabiq financial record ko delete nahi kiya ja sakta. status = ''cancelled'' ya ''reversed'' use karein.',
    TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nodelete_sales ON sales;
CREATE TRIGGER trg_nodelete_sales BEFORE DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_nodelete_purchases ON purchases;
CREATE TRIGGER trg_nodelete_purchases BEFORE DELETE ON purchases
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_nodelete_payments ON payments;
CREATE TRIGGER trg_nodelete_payments BEFORE DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_nodelete_expenses ON expenses;
CREATE TRIGGER trg_nodelete_expenses BEFORE DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_nodelete_movements ON stock_movements;
CREATE TRIGGER trg_nodelete_movements BEFORE DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_nodelete_sales_returns ON sales_returns;
CREATE TRIGGER trg_nodelete_sales_returns BEFORE DELETE ON sales_returns
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_nodelete_purchase_returns ON purchase_returns;
CREATE TRIGGER trg_nodelete_purchase_returns BEFORE DELETE ON purchase_returns
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_nodelete_cust_ledger ON customer_ledger;
CREATE TRIGGER trg_nodelete_cust_ledger BEFORE DELETE ON customer_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_nodelete_supp_ledger ON supplier_ledger;
CREATE TRIGGER trg_nodelete_supp_ledger BEFORE DELETE ON supplier_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();


/* ============================================================================
   SECTION 25 — POST-SALE STOCK UPDATE GUARD
   ⚠️  products.cached_quantity ko sirf movement ke through badalna —
       direct UPDATE par warning. Source of truth movement hi hai.
   ============================================================================ */

CREATE OR REPLACE FUNCTION sync_product_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
     SET cached_quantity = COALESCE((
           SELECT SUM(quantity) FROM stock_movements
            WHERE product_id = NEW.product_id AND status = 'posted'
         ), 0),
         cached_value = COALESCE((
           SELECT SUM(quantity * unit_cost) FROM stock_movements
            WHERE product_id = NEW.product_id AND status = 'posted' AND quantity > 0
         ), 0)
   WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_product_cache ON stock_movements;
CREATE TRIGGER trg_sync_product_cache AFTER INSERT OR UPDATE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION sync_product_cache();


/* ============================================================================
   SECTION 26 — VERIFICATION QUERIES
   Supabase SQL Editor mein yeh chala kar confirm karein ke sab bana.
   ============================================================================ */

-- Table count (expected: 30+)
-- SELECT COUNT(*) AS tables FROM information_schema.tables
--  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- View count (expected: 10+)
-- SELECT table_name FROM information_schema.views WHERE table_schema = 'public' ORDER BY 1;

-- Chart of accounts verify (expected: 23)
-- SELECT COUNT(*) FROM accounts;

-- Balanced journal check (Section 14) — expected: 0 rows
-- SELECT * FROM journal_entries WHERE total_debit <> total_credit;

-- Unbalanced ledger check — expected: 0 rows
-- SELECT * FROM customer_ledger WHERE debit > 0 AND credit > 0;

-- Stock vs movement reconciliation — expected: 0 rows
-- SELECT p.id, p.name, p.cached_quantity,
--        COALESCE(SUM(m.quantity),0) AS movement_qty
--   FROM products p
--   LEFT JOIN stock_movements m ON m.product_id = p.id AND m.status = 'posted'
--  GROUP BY p.id, p.name, p.cached_quantity
-- HAVING p.cached_quantity IS DISTINCT FROM COALESCE(SUM(m.quantity),0);

-- Low stock (Section 16)
-- SELECT * FROM v_low_stock;

-- Dashboard KPIs (Section 16)
-- SELECT * FROM v_dashboard_kpi;

-- Profit & Loss (Section 15)
-- SELECT * FROM v_profit_loss;

/* ============================================================================
   END OF SCHEMA v2
   ============================================================================
   AGLA QADAM:
   1. Supabase par run karein (SQL Editor -> paste -> Run)
   2. Settings -> Authentication -> "Enable email signups" OFF karein
   3. Pehla admin banayein:
        - Authentication -> Users -> Invite user
        - SQL Editor mein:  UPDATE profiles SET role='admin' WHERE email='...';
   4. js/config/supabase.js mein url + anon key bharein
   5. Reconciliation se pehle koi source data import NA karein (Section 28)
   ============================================================================ */
