/* ============================================================
   FILE 2 of 9  ->  js/core/inventory.js
   ARHAM ELECTRONICS ERP
   Maqsad: Inventory KO KABHI overwrite nahi karna.
           Quantity aur cost SIRF stock movements se derive hongi.
   Reference: Section 8 (Inventory Accounting)
   Costing:   Weighted Average Cost
   ============================================================ */

export const MOVEMENT = {
  OPENING_STOCK:   "opening_stock",
  PURCHASE:        "purchase",
  SALE:            "sale",
  PURCHASE_RETURN: "purchase_return",
  SALES_RETURN:    "sales_return",
  ADJUSTMENT:      "adjustment",
};

/** Har movement type ka sign — Section 8 ka exact table */
export function movementSign(type) {
  switch (type) {
    case MOVEMENT.OPENING_STOCK:
    case MOVEMENT.PURCHASE:
    case MOVEMENT.SALES_RETURN:
      return +1;
    case MOVEMENT.SALE:
    case MOVEMENT.PURCHASE_RETURN:
      return -1;
    case MOVEMENT.ADJUSTMENT:
      return 0; // sign quantity ke andar aayega (+/-)
    default:
      throw new Error(`Unknown movement type: ${type}`);
  }
}

/**
 * createMovement(...)
 * -----------------------------------------------------------
 * Inventory change ka SINGLE entry point.
 * Section 5 ke mutabiq source traceability lazmi save hoti hai.
 */
export function createMovement({
  productId,
  type,
  quantity,
  unitCost = 0,
  occurredAt,
  reference = null,
  saleId = null,
  purchaseId = null,
  sourceFile = null,
  sourceSheet = null,
  sourceRow = null,
  migrationBatch = null,
  notes = "",
}) {
  if (!productId) throw new Error("createMovement: productId required");
  if (!Object.values(MOVEMENT).includes(type)) throw new Error(`createMovement: invalid type "${type}"`);
  if (!occurredAt) throw new Error("createMovement: occurredAt required");
  if (!quantity || Number(quantity) === 0) throw new Error("createMovement: quantity cannot be 0");

  const sign = movementSign(type);
  const signedQty = sign === 0 ? Number(quantity) : Math.abs(Number(quantity)) * sign;

  return {
    id: null,
    product_id: productId,
    occurred_at: occurredAt,
    type,
    quantity: signedQty,
    unit_cost: Number(unitCost) || 0,
    reference,
    sale_id: saleId,
    purchase_id: purchaseId,
    source_file: sourceFile,
    source_sheet: sourceSheet,
    source_row: sourceRow,
    migration_batch: migrationBatch,
    notes,
    created_at: new Date().toISOString(),
  };
}

/**
 * quantityFromMovements(movements, productId)
 * -----------------------------------------------------------
 * YEH FUNCTION hi sach hai. product.qty field par bharosa NA karein.
 */
export function quantityFromMovements(movements, productId) {
  return round2(
    movements
      .filter((m) => m.product_id === productId)
      .reduce((sum, m) => sum + Number(m.quantity || 0), 0)
  );
}

/**
 * weightedAverageCost(movements, productId)
 * -----------------------------------------------------------
 * Weighted Average Cost engine.
 * Inbound  (opening / purchase / sales_return) -> average banate hain
 * Outbound (sale / purchase_return)            -> average use karte hain
 */
export function weightedAverageCost(movements, productId) {
  const list = sortByDate(movements.filter((m) => m.product_id === productId));

  let qty = 0;
  let value = 0;

  for (const m of list) {
    const q = Number(m.quantity || 0);
    const c = Number(m.unit_cost || 0);
    const avg = qty > 0 ? value / qty : 0;

    if (q > 0) {
      value += q * (c || avg);
      qty += q;
    } else {
      const outQty = Math.abs(q);
      value -= outQty * (c || avg);
      qty -= outQty;
      if (qty <= 0) { qty = Math.max(qty, 0); value = 0; }
    }
  }

  return {
    quantity: round2(qty),
    value: round2(value),
    avgCost: round4(qty > 0 ? value / qty : 0),
  };
}

/**
 * costAtDate(movements, productId, date)
 * -----------------------------------------------------------
 * Kisi purani date par average cost — COGS nikalne ke liye.
 */
export function costAtDate(movements, productId, date) {
  const upTo = sortByDate(
    movements.filter((m) => m.product_id === productId && String(m.occurred_at) <= String(date))
  );

  let qty = 0, value = 0;
  for (const m of upTo) {
    const q = Number(m.quantity || 0);
    const c = Number(m.unit_cost || 0);
    const avg = qty > 0 ? value / qty : 0;
    if (q > 0) { value += q * (c || avg); qty += q; }
    else { const out = Math.abs(q); value -= out * (c || avg); qty -= out; }
  }
  return round4(qty > 0 ? value / qty : 0);
}

/**
 * validateStockAvailability(...)
 * -----------------------------------------------------------
 * Sale / purchase-return se pehle negative stock rokna.
 * Section 41: "insufficient stock" test case.
 */
export function validateStockAvailability(movements, productId, requiredQty) {
  const available = quantityFromMovements(movements, productId);
  const needed = Math.abs(Number(requiredQty) || 0);
  if (needed > available) {
    return {
      ok: false,
      available,
      required: needed,
      shortfall: round2(needed - available),
      message: `Insufficient stock: available ${available}, required ${needed}`,
    };
  }
  return { ok: true, available, required: needed, shortfall: 0, message: "" };
}

/** Inventory valuation — poori list ke liye (Reports ke liye) */
export function inventoryValuation(movements, products) {
  const rows = products.map((p) => {
    const { quantity, value, avgCost } = weightedAverageCost(movements, p.id ?? p.sku);
    return {
      product_id: p.id ?? p.sku,
      sku: p.sku,
      name: p.name,
      quantity,
      avg_cost: avgCost,
      value,
      below_minimum: p.minimum_stock != null ? quantity < Number(p.minimum_stock) : false,
    };
  });
  return {
    rows,
    totals: {
      quantity: round2(rows.reduce((a, r) => a + r.quantity, 0)),
      value: round2(rows.reduce((a, r) => a + r.value, 0)),
      low_stock_count: rows.filter((r) => r.below_minimum).length,
    },
  };
}

/** Stock history ek product ke liye (Product ledger / drill-down) */
export function stockHistory(movements, productId) {
  const list = sortByDate(movements.filter((m) => m.product_id === productId));
  let running = 0;
  return list.map((m) => {
    running = round2(running + Number(m.quantity || 0));
    return {
      occurred_at: m.occurred_at,
      type: m.type,
      in_qty: Number(m.quantity) > 0 ? Number(m.quantity) : 0,
      out_qty: Number(m.quantity) < 0 ? Math.abs(Number(m.quantity)) : 0,
      unit_cost: Number(m.unit_cost || 0),
      running_qty: running,
      reference: m.reference || "",
      notes: m.notes || "",
      source_file: m.source_file ?? null,
      source_sheet: m.source_sheet ?? null,
      source_row: m.source_row ?? null,
    };
  });
}

/* ---------- helpers ---------- */
function sortByDate(arr) {
  return [...arr].sort((a, b) => {
    const d = String(a.occurred_at).localeCompare(String(b.occurred_at));
    return d !== 0 ? d : (a.id ?? 0) - (b.id ?? 0);
  });
}
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function round4(n) { return Math.round((Number(n) || 0) * 10000) / 10000; }