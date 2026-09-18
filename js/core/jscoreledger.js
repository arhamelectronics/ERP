/* ============================================================
   FILE 3 of 9  ->  js/core/ledger.js
   ARHAM ELECTRONICS ERP
   Maqsad: Customer / Supplier RUNNING LEDGER.
           Balance SIRF transactions se reconstruct ho.
           Manually edited totals par kabhi bharosa na karein.
   Reference: Section 12 (Customer Ledger), Section 13 (Supplier Ledger)
   ============================================================ */

/**
 * SIGN CONVENTION (documented, migration doc se match karta hai)
 * -----------------------------------------------------------
 *   DEBIT  = party par waajib      -> receivable / payable BARHTA hai
 *   CREDIT = party ko diya/adjust  -> receivable / payable GHATTA hai
 *
 *   balance = opening + sum(debits) - sum(credits)
 *
 * Customer ledger:
 *   + Credit Sale        -> DEBIT
 *   + Other debit entry  -> DEBIT
 *   - Payment received   -> CREDIT
 *   - Sales return       -> CREDIT
 *   + Adjustment         -> DEBIT ya CREDIT (reason ke sath)
 *
 * Supplier ledger:
 *   + Credit Purchase    -> CREDIT (payable barhta hai)
 *   - Payment made       -> DEBIT  (payable ghatta hai)
 *   - Purchase return    -> DEBIT
 * ============================================================ */

export function buildLedger({ partyId, openingBalance = 0, openingDate = null, entries = [] }) {
  const sorted = [...entries]
    .filter((e) => String(e.party_id) === String(partyId))
    .sort((a, b) => {
      const d = String(a.occurred_at).localeCompare(String(b.occurred_at));
      return d !== 0 ? d : (Number(a.id) || 0) - (Number(b.id) || 0);
    });

  const rows = [];
  let running = Number(openingBalance) || 0;

  if (openingBalance !== 0 || openingDate !== null) {
    rows.push({
      is_opening: true,
      occurred_at: openingDate,
      reference: "OPENING",
      description: "Opening balance (source verified)",
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      balance: round2(running),
    });
  }

  for (const e of sorted) {
    const debit = Number(e.debit || 0);
    const credit = Number(e.credit || 0);
    running = running + debit - credit;
    rows.push({
      is_opening: false,
      id: e.id,
      occurred_at: e.occurred_at,
      reference: e.reference || "",
      description: e.description || "",
      debit: round2(debit),
      credit: round2(credit),
      balance: round2(running),
      source_file: e.source_file ?? null,
      source_sheet: e.source_sheet ?? null,
      source_row: e.source_row ?? null,
    });
  }

  return {
    rows,
    openingBalance: round2(Number(openingBalance) || 0),
    totalDebit: round2(rows.reduce((a, r) => a + r.debit, 0)),
    totalCredit: round2(rows.reduce((a, r) => a + r.credit, 0)),
    closingBalance: round2(running),
  };
}

/** Sirf closing balance — dashboard/reports ke liye (derived) */
export function partyBalance({ partyId, openingBalance = 0, entries = [] }) {
  const mine = entries.filter((e) => String(e.party_id) === String(partyId));
  const dr = mine.reduce((a, e) => a + Number(e.debit || 0), 0);
  const cr = mine.reduce((a, e) => a + Number(e.credit || 0), 0);
  return round2(Number(openingBalance || 0) + dr - cr);
}

/** Sab parties ka balance ek sath (Receivables / Payables report) */
export function allBalances(parties, entries, balanceField = "opening_balance") {
  return parties.map((p) => ({
    id: p.id ?? p.code,
    code: p.code,
    name: p.name,
    opening_balance: Number(p[balanceField] || 0),
    balance: partyBalance({
      partyId: p.id ?? p.code,
      openingBalance: Number(p[balanceField] || 0),
      entries,
    }),
  }));
}

/**
 * POSTING HELPERS
 * -----------------------------------------------------------
 * Yeh helpers sale/purchase/payment flows use karenge taake
 * debit/credit galat na ho (duplicate financial postings se bachne ke liye).
 */
export const posting = {
  // ---- Customer (receivable) ----
  creditSale: (amount, ref) => ({
    debit: Number(amount) || 0, credit: 0,
    reference: ref, description: "Credit sale",
  }),
  otherDebit: (amount, ref, reason = "") => ({
    debit: Number(amount) || 0, credit: 0,
    reference: ref, description: `Debit entry ${reason}`.trim(),
  }),
  paymentReceived: (amount, ref, method = "cash") => ({
    debit: 0, credit: Number(amount) || 0,
    reference: ref, description: `Payment received (${method})`,
  }),
  salesReturnCredit: (amount, ref) => ({
    debit: 0, credit: Number(amount) || 0,
    reference: ref, description: "Sales return",
  }),
  customerAdjustment: (amount, ref, reason = "") => ({
    debit: Number(amount) || 0, credit: 0,
    reference: ref, description: `Adjustment ${reason}`.trim(),
  }),

  // ---- Supplier (payable) ----
  creditPurchase: (amount, ref) => ({
    debit: 0, credit: Number(amount) || 0,
    reference: ref, description: "Credit purchase",
  }),
  paymentMade: (amount, ref, method = "cash") => ({
    debit: Number(amount) || 0, credit: 0,
    reference: ref, description: `Payment made (${method})`,
  }),
  purchaseReturnDebit: (amount, ref) => ({
    debit: Number(amount) || 0, credit: 0,
    reference: ref, description: "Purchase return",
  }),
  supplierAdjustment: (amount, ref, reason = "") => ({
    debit: Number(amount) || 0, credit: 0,
    reference: ref, description: `Adjustment ${reason}`.trim(),
  }),
};

/**
 * reconcileLedgerTotal(...)
 * -----------------------------------------------------------
 * Section 28: source balance vs ERP balance compare karna.
 * Migration ke baad yeh chalana LAZMI hai.
 */
export function reconcileLedgerTotal({
  label,
  sourceBalance,
  openingBalance = 0,
  entries = [],
  partyId,
  tolerance = 0.5,
}) {
  const erpBalance = partyBalance({ partyId, openingBalance, entries });
  const difference = round2(erpBalance - Number(sourceBalance || 0));
  const matched = Math.abs(difference) <= tolerance;
  return {
    label,
    party_id: partyId,
    source_balance: round2(Number(sourceBalance) || 0),
    erp_balance: erpBalance,
    difference,
    status: matched ? "matched" : "requires-review",
  };
}

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }