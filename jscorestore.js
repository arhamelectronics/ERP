/* ============================================================
   FILE 4 of 9  ->  js/core/store.js
   ARHAM ELECTRONICS ERP
   Maqsad: Ek storage abstraction.
           Abhi localStorage. Jab Supabase/backend aayega,
           SIRF yeh file badlegi — UI ka code change nahi hoga.
   Reference: Section 31 (Backend/Database), Section 32 (Backup)
   ============================================================ */

const KEY = "arham_erp_v3";
const BACKUP_PREFIX = "arham_erp_backup_";

/**
 * Production-shaped EMPTY state.
 * Koi fake/demo data NAHI (Section 37).
 */
export function emptyState() {
  return {
    meta: {
      schema_version: 3,
      created_at: new Date().toISOString(),
      data_mode: "prototype-local",   // baad mein "production-db"
      is_seed_data: false,            // seed/demo ko authoritative NA samjho
      migration_batch: null,
      migration_complete: false,      // reconciliation ke bina true NAHI
    },

    // master
    users: [],
    products: [],
    product_aliases: [],
    customers: [],
    customer_aliases: [],
    suppliers: [],
    supplier_aliases: [],
    categories: [],
    brands: [],
    warehouses: [],

    // inventory
    stock_movements: [],

    // sales side
    sales: [],
    sale_items: [],
    sales_returns: [],
    sales_return_items: [],
    customer_ledger: [],

    // purchase side
    purchases: [],
    purchase_items: [],
    purchase_returns: [],
    purchase_return_items: [],
    supplier_ledger: [],

    // finance
    payments: [],
    expenses: [],
    accounts: [],
    journal_entries: [],
    journal_lines: [],

    // system
    audit_log: [],
    migration_rows: [],
    migration_batches: [],
    reconciliation: [],
    invoice_sequences: [],
    settings: {},
  };
}

let _state = null;
const _listeners = new Set();

export function getState() {
  if (_state) return _state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      _state = { ...emptyState(), ...JSON.parse(raw) };
      return _state;
    }
  } catch (e) {
    // Corrupted state -> naya state, purana backup le lein (overwrite na karein)
    console.warn("[store] state read failed:", e);
    try {
      localStorage.setItem(`${BACKUP_PREFIX}${Date.now()}`, localStorage.getItem(KEY) || "");
    } catch (_) { /* ignore */ }
  }
  _state = emptyState();
  persist();
  return _state;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(_state)); }
  catch (e) { console.warn("[store] persist failed:", e); }
}

export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
function emit() { for (const fn of _listeners) fn(_state); }

/**
 * commit(mutator, {audit})
 * -----------------------------------------------------------
 * Har change isi raste se ho — taake audit log khud ban jaye (Section 26).
 */
export function commit(mutator, { audit: auditEntry = null } = {}) {
  const state = getState();
  mutator(state);
  if (auditEntry) {
    state.audit_log.push({
      id: nextId("AUD"),
      occurred_at: nowIso(),
      user_id: auditEntry.user_id ?? null,
      action: auditEntry.action,
      entity_type: auditEntry.entity_type,
      entity_id: auditEntry.entity_id ?? null,
      details: auditEntry.details ?? "",
      reason: auditEntry.reason ?? null,
    });
  }
  persist();
  emit();
  return state;
}

export function resetToEmpty() {
  _state = emptyState();
  persist();
  emit();
  return _state;
}

/* ---------- ID sequence helpers ---------- */

export function nextId(prefix) {
  const state = getState();
  const n = (state[seqKey(prefix)] || []).length + 1;
  return `${prefix}-${String(n).padStart(5, "0")}`;
}

function seqKey(prefix) {
  return {
    INV: "sales",
    SR: "sales_returns",
    PUR: "purchases",
    PR: "purchase_returns",
    PAY: "payments",
    EXP: "expenses",
    MOV: "stock_movements",
    PROD: "products",
    CUS: "customers",
    SUP: "suppliers",
    AUD: "audit_log",
  }[prefix] || "audit_log";
}

/**
 * nextInvoiceNo(prefix, date)
 * -----------------------------------------------------------
 * Unique invoice numbering (Section 18: "Invoice numbering must be unique").
 * Format: INV-2026-00042   /   PUR-2026-00017
 */
export function nextInvoiceNo(prefix = "INV", date = new Date()) {
  const state = getState();
  const year = new Date(date).getFullYear();
  const key = `${prefix}-${year}`;
  const seq = state.invoice_sequences.find((s) => s.key === key);
  if (seq) seq.value += 1;
  else state.invoice_sequences.push({ key, prefix, year, value: 1 });
  const value = state.invoice_sequences.find((s) => s.key === key).value;
  return `${prefix}-${year}-${String(value).padStart(5, "0")}`;
}

/* ---------- audit + backup ---------- */

export function audit(action, entityType, entityId, details = "", reason = null, userId = null) {
  return commit(() => {}, {
    audit: { user_id: userId, action, entity_type: entityType, entity_id: entityId, details, reason },
  });
}

export function exportBackup() {
  return JSON.stringify(
    { meta: { exported_at: nowIso(), key: KEY, schema_version: 3 }, data: getState() },
    null,
    2
  );
}

/**
 * importBackup(json)
 * -----------------------------------------------------------
 * Section 32: "Never allow a restore operation to silently destroy current data."
 * Is liye restore se PEHLE purana data automatically backup ho jata hai.
 */
export function importBackup(json, { confirmReplace = false } = {}) {
  const parsed = typeof json === "string" ? JSON.parse(json) : json;
  if (!parsed || !parsed.data) throw new Error("Invalid backup file");

  // Purani state ka safety backup — bina permission kuch destroy nahi
  if (!confirmReplace) {
    try { localStorage.setItem(`${BACKUP_PREFIX}pre_restore_${Date.now()}`, localStorage.getItem(KEY) || ""); }
    catch (_) { /* ignore */ }
  }

  _state = { ...emptyState(), ...parsed.data };
  persist();
  emit();
  return { ok: true, safety_backup: !confirmReplace, meta: parsed.meta ?? null };
}

export function listBackups() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(BACKUP_PREFIX)) out.push(k);
  }
  return out.sort().reverse();
}

function nowIso() { return new Date().toISOString(); }