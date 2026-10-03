/**
 * ============================================================
 * ARHAM ELECTRONICS ERP
 * COMPLETE GOOGLE APPS SCRIPT BACKEND  (final, fixed version)
 * ============================================================
 *
 * Database: Google Sheets + Google Apps Script
 * Supports: existing historical sheets, operational ERP sheets,
 * GitHub Pages frontend, JSONP cross-origin API, google.script.run,
 * GET API, POST API.
 *
 * Fixed in this version (on top of what you already had):
 *  1. Posting a sale/purchase/payment now ALSO updates the
 *     Customers/Suppliers sheet's ClosingBalance, TotalDebit,
 *     TotalCredit columns. Before, only LedgerEntries got a new
 *     row and the balance shown on the Customers/Suppliers page
 *     never changed after the very first import.
 *  2. Sales / Purchases / Payments / Ledger now come back with
 *     the customer/supplier NAME already attached (CustomerName /
 *     SupplierName / PartyName) so the frontend never has to show
 *     a raw ID like "C0001".
 *  3. Dashboard now returns receivables, payables, today's/monthly
 *     sales, a low-stock list, and recent activity — enough for
 *     a real dashboard instead of 9 plain number boxes.
 * Everything else (JSONP, case-insensitive routing, header-row
 * auto-detection by known ID columns, historical data routes) is
 * unchanged from what you already had, because it was correct.
 * ============================================================
 */

const CFG = {
  sheets: {
    products: 'Products',
    settings: 'Settings',
    stock: 'StockMovements',
    customers: 'Customers',
    suppliers: 'Suppliers',
    ledger: 'LedgerEntries',
    aliases: 'AccountAliases',
    recon: 'ReconciliationLog',
    batches: 'ImportBatches',
    users: 'Users',
    salesPersons: 'SalesPersons',

    sales: 'Sales',
    saleItems: 'SaleItems',
    purchases: 'Purchases',
    purchaseItems: 'PurchaseItems',
    payments: 'Payments',
    expenses: 'Expenses',
    audit: 'AuditLog'
  },

  headers: {
    SalesPersons: ['SalesPersonID','Name','IncentivePercent','Active','CreatedAt'],
    Sales: ['SaleID','Date','CustomerID','InvoiceNo','Subtotal','Discount','NetTotal','Paid','Balance','Status','Notes','CreatedAt','SalesPersonID','SalesPerson','IncentivePercent','Profit','IncentiveAmount','IncentiveStatus'],
    SaleItems: ['SaleItemID','SaleID','ProductID','Description','Qty','UnitPrice','Discount','LineTotal','UnitCost','COGS'],
    Purchases: ['PurchaseID','Date','SupplierID','ReferenceNo','Subtotal','Discount','NetTotal','Paid','Balance','Status','Notes','CreatedAt'],
    PurchaseItems: ['PurchaseItemID','PurchaseID','ProductID','Description','Qty','UnitCost','Discount','LineTotal'],
    Payments: ['PaymentID','Date','PartyType','PartyID','Direction','Amount','Method','Reference','Notes','CreatedAt'],
    Expenses: ['ExpenseID','Date','Category','Description','Amount','PaymentMethod','Notes','CreatedAt'],
    AuditLog: ['AuditID','Timestamp','Action','EntityType','EntityID','User','Details']
  }
};


/* ============================================================ WEB API (GET) ============================================================ */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = String(p.action || 'health');
    let input = {};

    if (p.payload) {
      try { input = JSON.parse(p.payload); }
      catch (err) { throw new Error('Invalid payload JSON'); }
    } else {
      input = Object.assign({}, p);
    }
    input.action = action;

    const data = route_(action, input);
    const response = { ok: true, action: action, data: data };

    const callback = sanitizeCallback_(p.callback);
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(response, replacer_) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return json_(response);

  } catch (err) {
    const response = { ok: false, error: String(err && err.message || err) };
    const callback = sanitizeCallback_(e && e.parameter && e.parameter.callback);
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(response) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return json_(response);
  }
}

/* ============================================================ WEB API (POST) ============================================================ */
function doPost(e) {
  try {
    const body = (e && e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : {};
    const action = String(body.action || '');
    if (!action) throw new Error('Missing action');
    const data = route_(action, body);
    return json_({ ok: true, action: action, data: data });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err), stack: String(err && err.stack || '') });
  }
}


/* ============================================================ ROUTER ============================================================ */
function route_(action, p) {
  const a = String(action || '').toLowerCase();
  switch (a) {

    /* ---------------- SYSTEM ---------------- */
    case 'health': return health_();
    case 'bootstrap': return bootstrap_();

    /* ---------------- DASHBOARD ---------------- */
    case 'dashboard':
    case 'apidashboard':
      return dashboard_();

    /* ---------------- MASTER DATA ---------------- */
    case 'products':
    case 'apiproducts':
      return listSheet_(CFG.sheets.products);

    case 'customers':
    case 'apicustomers':
      return listSheet_(CFG.sheets.customers);

    case 'suppliers':
    case 'apisuppliers':
      return listSheet_(CFG.sheets.suppliers);

    /* ---------------- STOCK ---------------- */
    case 'stock':
    case 'apistock':
      return stock_(p.productId);

    /* ---------------- LEDGER (names attached) ---------------- */
    case 'ledger':
    case 'apiledger':
      return ledger_(p.partyType, p.partyId);

    /* ---------------- SALES / PURCHASES / PAYMENTS / EXPENSES READ (names attached) ---------------- */
    case 'sales':
    case 'apisales':
      return listSalesWithNames_();

    case 'purchases':
    case 'apipurchases':
      return listPurchasesWithNames_();

    case 'payments':
    case 'apipayments':
      return listPaymentsWithNames_();

    case 'expenses':
    case 'apiexpenses':
      return listSheet_(CFG.sheets.expenses);

    /* ---------------- OTHER HISTORICAL DATA ---------------- */
    case 'aliases': return listSheet_(CFG.sheets.aliases);
    case 'reconciliation': return listSheet_(CFG.sheets.recon);
    case 'importbatches': return listSheet_(CFG.sheets.batches);
    case 'users': return listSheet_(CFG.sheets.users);
    case 'salespersons':
    case 'apisalespersons': return listSheet_(CFG.sheets.salesPersons);

    /* ---------------- TRANSACTIONS (write) ---------------- */
    case 'sale':
    case 'apisale':
      return createSale_(p);

    case 'purchase':
    case 'apipurchase':
      return createPurchase_(p);

    case 'payment':
    case 'apipayment':
      return createPayment_(p);

    case 'expense':
    case 'apiexpense':
      return createExpense_(p);

    case 'salesperson':
    case 'apisalesperson':
      return saveSalesPerson_(p);

    case 'product':
    case 'apiproduct':
      return createProduct_(p);

    case 'incentives':
    case 'apiincentives':
      return incentiveReport_(p);

    default:
      throw new Error('Unknown action: ' + action);
  }
}


/* ============================================================ HEALTH ============================================================ */
function health_() {
  const ss = SpreadsheetApp.getActive();
  return {
    ok: true, name: ss.getName(), spreadsheetId: ss.getId(), time: new Date().toISOString(),
    sheets: ss.getSheets().map(function (sheet) { return sheet.getName(); })
  };
}


/* ============================================================ BOOTSTRAP ============================================================ */
function bootstrap_() {
  Object.keys(CFG.headers).forEach(function (key) {
    const sheetNameMap = {
      SalesPersons: CFG.sheets.salesPersons, Sales: CFG.sheets.sales, SaleItems: CFG.sheets.saleItems,
      Purchases: CFG.sheets.purchases, PurchaseItems: CFG.sheets.purchaseItems,
      Payments: CFG.sheets.payments, Expenses: CFG.sheets.expenses, AuditLog: CFG.sheets.audit
    };
    const sheetName = sheetNameMap[key] || key;
    ensureSheet_(sheetName, CFG.headers[key]);
  });
  audit_('bootstrap', 'system', '', 'System', 'Created/verified ERP operational sheets');
  return health_();
}


/* ============================================================ DASHBOARD (enriched) ============================================================ */
function dashboard_() {
  const products = safeList_(CFG.sheets.products);
  const customers = safeList_(CFG.sheets.customers);
  const suppliers = safeList_(CFG.sheets.suppliers);
  const sales = safeList_(CFG.sheets.sales).filter(function (s) { return s.Status !== 'cancelled'; });
  const purchases = safeList_(CFG.sheets.purchases).filter(function (s) { return s.Status !== 'cancelled'; });
  const expenses = safeList_(CFG.sheets.expenses);

  const today = today_();
  const monthStart = today.slice(0, 7) + '-01';

  let stockQty = 0, stockValue = 0, missingCost = 0;
  const lowStock = [];
  products.forEach(function (p) {
    const qty = num_(p.CurrentStock), cost = num_(p.PurchasePrice), minimum = num_(p.MinStock);
    stockQty += qty;
    if (cost) stockValue += qty * cost; else missingCost++;
    if (minimum > 0 && qty <= minimum) lowStock.push({ description: p.Description, stock: qty, min: minimum });
  });

  const custById = indexBy_(customers, 'CustomerID');
  const supById = indexBy_(suppliers, 'SupplierID');

  const todaysSales = sum_(sales.filter(function (s) { return String(s.Date).slice(0, 10) === today; }), 'NetTotal');
  const monthlySales = sum_(sales.filter(function (s) { return String(s.Date).slice(0, 10) >= monthStart; }), 'NetTotal');
  const monthlyPurchases = sum_(purchases.filter(function (s) { return String(s.Date).slice(0, 10) >= monthStart; }), 'NetTotal');

  const receivable = sum_(customers, 'ClosingBalance');
  const payable = sum_(suppliers, 'ClosingBalance');

  const recentSales = sales.slice(-8).reverse().map(function (s) {
    const c = custById[String(s.CustomerID)];
    return { no: s.InvoiceNo, date: s.Date, customer: c ? c.Name : s.CustomerID, total: s.NetTotal, balance: s.Balance };
  });
  const recentPurchases = purchases.slice(-8).reverse().map(function (p) {
    const s = supById[String(p.SupplierID)];
    return { ref: p.ReferenceNo, date: p.Date, supplier: s ? s.Name : p.SupplierID, total: p.NetTotal, balance: p.Balance };
  });

  return {
    productCount: products.length, customerCount: customers.length, supplierCount: suppliers.length,
    stockQty: stockQty, stockValue: stockValue, missingCost: missingCost,
    lowStockCount: lowStock.length, lowStock: lowStock.slice(0, 10),
    todaysSales: todaysSales, monthlySales: monthlySales, monthlyPurchases: monthlyPurchases,
    salesCount: sales.length, purchaseCount: purchases.length, expenseCount: expenses.length,
    salesTotal: sum_(sales, 'NetTotal'), purchasesTotal: sum_(purchases, 'NetTotal'), expensesTotal: sum_(expenses, 'Amount'),
    receivable: receivable, payable: payable,
    recentSales: recentSales, recentPurchases: recentPurchases
  };
}


/* ============================================================ GENERIC SHEET READ ============================================================ */
function listSheet_(name) {
  const sheet = getSheet_(name);
  if (!sheet) return [];
  return rows_(sheet);
}
function safeList_(name) {
  try { return listSheet_(name); }
  catch (err) { return []; }
}


/* ============================================================ STOCK ============================================================ */
function stock_(productId) {
  const rows = safeList_(CFG.sheets.stock);
  if (!productId) return rows;
  return rows.filter(function (row) { return String(row.ProductID || '') === String(productId); });
}


/* ============================================================ LEDGER (with resolved party name) ============================================================ */
function ledger_(partyType, partyId) {
  const rows = safeList_(CFG.sheets.ledger);
  const custById = indexBy_(safeList_(CFG.sheets.customers), 'CustomerID');
  const supById = indexBy_(safeList_(CFG.sheets.suppliers), 'SupplierID');
  const filtered = rows.filter(function (row) {
    const typeOK = !partyType || String(row.PartyType || '').toLowerCase() === String(partyType).toLowerCase();
    const idOK = !partyId || String(row.PartyID || '') === String(partyId);
    return typeOK && idOK;
  });
  return filtered.map(function (row) {
    const isCust = String(row.PartyType || '').toLowerCase() === 'customer';
    const party = isCust ? custById[String(row.PartyID)] : supById[String(row.PartyID)];
    row.PartyName = party ? party.Name : row.PartyID;
    return row;
  });
}

/* ---- Sales / Purchases / Payments lists with the party name attached ---- */
function listSalesWithNames_() {
  const rows = safeList_(CFG.sheets.sales).sort(byDateDesc_);
  const custById = indexBy_(safeList_(CFG.sheets.customers), 'CustomerID');
  return rows.map(function (r) { const c = custById[String(r.CustomerID)]; r.CustomerName = c ? c.Name : r.CustomerID; return r; });
}
function listPurchasesWithNames_() {
  const rows = safeList_(CFG.sheets.purchases).sort(byDateDesc_);
  const supById = indexBy_(safeList_(CFG.sheets.suppliers), 'SupplierID');
  return rows.map(function (r) { const s = supById[String(r.SupplierID)]; r.SupplierName = s ? s.Name : r.SupplierID; return r; });
}
function listPaymentsWithNames_() {
  const rows = safeList_(CFG.sheets.payments).sort(byDateDesc_);
  const custById = indexBy_(safeList_(CFG.sheets.customers), 'CustomerID');
  const supById = indexBy_(safeList_(CFG.sheets.suppliers), 'SupplierID');
  return rows.map(function (r) {
    const isCust = String(r.PartyType || '').toLowerCase() === 'customer';
    const party = isCust ? custById[String(r.PartyID)] : supById[String(r.PartyID)];
    r.PartyName = party ? party.Name : r.PartyID;
    return r;
  });
}
function byDateDesc_(a, b) { return String(b.Date || '').localeCompare(String(a.Date || '')); }


/* ============================================================ CREATE SALE ============================================================ */
function createSale_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const customerId = String(p.customerId || '');
    if (!customerId) throw new Error('customerId is required');
    const items = Array.isArray(p.items) ? p.items : [];
    if (!items.length) throw new Error('At least one sale item is required');

    const date = p.date ? new Date(p.date) : new Date();
    const saleId = nextId_(CFG.sheets.sales, 'SaleID', 'S');
    const invoiceNo = String(p.invoiceNo || nextInvoiceNo_());

    let subtotal = 0, cogs = 0;
    const productMap = indexBy_(safeList_(CFG.sheets.products), 'ProductID');
    const itemRows = [], movementRows = [];

    items.forEach(function (it, idx) {
      const productId = String(it.productId || '');
      const qty = num_(it.qty);
      if (!productId || qty <= 0) throw new Error('Invalid sale item at index ' + idx);
      const product = productMap[productId];
      if (!product) throw new Error('Product not found: ' + productId);
      const currentStock = num_(product.CurrentStock);
      if (currentStock < qty) throw new Error('Insufficient stock for ' + productId + '. Current ' + currentStock + ', requested ' + qty);

      const unitPrice = num_(it.unitPrice || product.SalePrice);
      const discount = num_(it.discount);
      const lineTotal = Math.max(0, qty * unitPrice - discount);
      const unitCost = num_(it.unitCost || product.PurchasePrice);
      const lineCogs = qty * unitCost;
      subtotal += qty * unitPrice; cogs += lineCogs;

      itemRows.push([nextId_(CFG.sheets.saleItems, 'SaleItemID', 'SI'), saleId, productId,
        String(it.description || product.Description || ''), qty, unitPrice, discount, lineTotal, unitCost, lineCogs]);

      const balanceAfter = currentStock - qty;
      movementRows.push([nextId_(CFG.sheets.stock, 'MovementID', 'MV'), productId, date, 'sale', -qty,
        'Sale ' + invoiceNo, balanceAfter, 'ERP', 'Sales', saleId]);
      product.CurrentStock = balanceAfter;
    });

    const discount = num_(p.discount);
    const net = Math.max(0, subtotal - discount);
    const paid = Math.max(0, num_(p.paid));
    const balance = net - paid;

    ensureSheet_(CFG.sheets.sales, CFG.headers.Sales);
    ensureColumns_(CFG.sheets.sales, CFG.headers.Sales.slice(12));
    ensureSheet_(CFG.sheets.saleItems, CFG.headers.SaleItems);

    const salespersonId = String(p.salesPersonId || '');
    const salespersons = safeList_(CFG.sheets.salesPersons);
    const salesperson = salespersons.find(function (x) { return String(x.SalesPersonID || '') === salespersonId; });
    const salespersonName = salesperson ? String(salesperson.Name || '') : '';
    const incentivePercent = salesperson ? num_(salesperson.IncentivePercent) : num_(p.incentivePercent);
    const profit = net - cogs;
    const incentiveAmount = Math.max(0, profit) * incentivePercent / 100;

    appendObject_(CFG.sheets.sales, {
      SaleID:saleId, Date:date, CustomerID:customerId, InvoiceNo:invoiceNo, Subtotal:subtotal,
      Discount:discount, NetTotal:net, Paid:paid, Balance:balance, Status:'posted', Notes:String(p.notes || ''), CreatedAt:new Date(),
      SalesPersonID:salespersonId, SalesPerson:salespersonName, IncentivePercent:incentivePercent,
      Profit:profit, IncentiveAmount:incentiveAmount, IncentiveStatus:'Unpaid'
    });
    itemRows.forEach(function (row) { append_(CFG.sheets.saleItems, row); });
    movementRows.forEach(function (row) { append_(CFG.sheets.stock, row); });
    updateProductStocks_(productMap);

    appendLedgerAndUpdateParty_('customer', customerId, date, 'Sale ' + invoiceNo, invoiceNo, net, 0, 'sale');

    if (paid > 0) {
      appendPaymentInternal_({ date: date, partyType: 'customer', partyId: customerId, direction: 'in', amount: paid,
        method: String(p.paymentMethod || 'cash'), reference: invoiceNo, notes: 'Sale payment' });
    }

    audit_('create', 'sale', saleId, String(p.user || 'ERP'), 'Created sale ' + invoiceNo);
    return { saleId: saleId, invoiceNo: invoiceNo, no: invoiceNo, subtotal: subtotal, discount: discount,
      netTotal: net, total: net, paid: paid, balance: balance, cogs: cogs, profit: profit, salesPerson: salespersonName, incentivePercent: incentivePercent, incentiveAmount: incentiveAmount };
  } finally { lock.releaseLock(); }
}


/* ============================================================ SALES PERSONS / INCENTIVE ============================================================ */
function saveSalesPerson_(p) {
  const name = String(p.name || '').trim();
  if (!name) throw new Error('Sales person name is required');
  const percent = num_(p.incentivePercent);
  if (percent < 0 || percent > 100) throw new Error('Incentive percent must be between 0 and 100');
  ensureSheet_(CFG.sheets.salesPersons, CFG.headers.SalesPersons);
  const id = String(p.salesPersonId || nextId_(CFG.sheets.salesPersons, 'SalesPersonID', 'SP'));
  const existing = safeList_(CFG.sheets.salesPersons).find(function (x) { return String(x.SalesPersonID || '') === id; });
  if (existing) {
    updateRowWhere_(CFG.sheets.salesPersons, 'SalesPersonID', id, {Name:name, IncentivePercent:percent, Active:p.active === false ? false : true});
  } else {
    appendObject_(CFG.sheets.salesPersons, {SalesPersonID:id, Name:name, IncentivePercent:percent, Active:p.active === false ? false : true, CreatedAt:new Date()});
  }
  audit_('save','salesperson',id,String(p.user || 'ERP'),'Saved sales person '+name);
  return {salesPersonId:id,name:name,incentivePercent:percent,active:p.active === false ? false : true};
}

function incentiveReport_(p) {
  const from = String(p.from || '');
  const to = String(p.to || '');
  const personId = String(p.salesPersonId || '');
  const sales = safeList_(CFG.sheets.sales).filter(function (s) {
    if (String(s.Status || '').toLowerCase() === 'cancelled') return false;
    const d = String(s.Date || '').slice(0,10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (personId && String(s.SalesPersonID || '') !== personId) return false;
    return true;
  }).sort(byDateDesc_);
  const customers = indexBy_(safeList_(CFG.sheets.customers), 'CustomerID');
  return sales.map(function (s) {
    const profit = num_(s.Profit);
    const pct = num_(s.IncentivePercent);
    return {
      SaleID:s.SaleID, InvoiceNo:s.InvoiceNo, Date:s.Date,
      CustomerName:(customers[String(s.CustomerID)] || {}).Name || s.CustomerID,
      NetTotal:num_(s.NetTotal), COGS:num_(s.COGS), Profit:profit,
      SalesPersonID:s.SalesPersonID || '', SalesPerson:s.SalesPerson || '',
      IncentivePercent:pct, IncentiveAmount:num_(s.IncentiveAmount) || Math.max(0,profit)*pct/100,
      IncentiveStatus:s.IncentiveStatus || 'Unpaid'
    };
  });
}

function createProduct_(p) {
  const description = String(p.description || '').trim();
  if (!description) throw new Error('Product description is required');
  ensureSheet_(CFG.sheets.products, ['ProductID','Description','Code','Brand','Category','Unit','CurrentStock','PurchasePrice','SalePrice','MinStock','Location']);
  const id = String(p.productId || nextId_(CFG.sheets.products, 'ProductID', 'P'));
  if (safeList_(CFG.sheets.products).some(function (x) { return String(x.ProductID || '') === id; })) throw new Error('Product ID already exists: '+id);
  appendObject_(CFG.sheets.products, {
    ProductID: id,
    Description: description,
    Code: String(p.code || ''),
    Brand: String(p.brand || ''),
    Category: String(p.category || ''),
    Unit: String(p.unit || 'pcs'),
    CurrentStock: num_(p.currentStock),
    PurchasePrice: num_(p.purchasePrice),
    SalePrice: num_(p.salePrice),
    MinStock: num_(p.minStock),
    Location: String(p.location || '')
  });
  audit_('create','product',id,String(p.user || 'ERP'),'Created product '+description);
  return {productId:id,description:description};
}


/* ============================================================ CREATE PURCHASE ============================================================ */
function createPurchase_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const supplierId = String(p.supplierId || '');
    if (!supplierId) throw new Error('supplierId is required');
    const items = Array.isArray(p.items) ? p.items : [];
    if (!items.length) throw new Error('At least one purchase item is required');

    const date = p.date ? new Date(p.date) : new Date();
    const purchaseId = nextId_(CFG.sheets.purchases, 'PurchaseID', 'PU');
    const referenceNo = String(p.referenceNo || purchaseId);

    let subtotal = 0;
    const productMap = indexBy_(safeList_(CFG.sheets.products), 'ProductID');
    const movementRows = [], itemRows = [];

    items.forEach(function (it, idx) {
      const productId = String(it.productId || '');
      const qty = num_(it.qty);
      const unitCost = num_(it.unitCost);
      if (!productId || qty <= 0 || unitCost < 0) throw new Error('Invalid purchase item at index ' + idx);
      const product = productMap[productId];
      if (!product) throw new Error('Product not found: ' + productId);

      const oldQty = num_(product.CurrentStock), oldCost = num_(product.PurchasePrice);
      const newQty = oldQty + qty;
      const averageCost = newQty > 0 ? ((oldQty * oldCost) + (qty * unitCost)) / newQty : unitCost;
      const line = qty * unitCost;
      const discount = num_(it.discount);
      subtotal += line;
      product.CurrentStock = newQty; product.PurchasePrice = averageCost;

      itemRows.push([nextId_(CFG.sheets.purchaseItems, 'PurchaseItemID', 'PI'), purchaseId, productId,
        String(it.description || product.Description || ''), qty, unitCost, discount, Math.max(0, line - discount)]);
      movementRows.push([nextId_(CFG.sheets.stock, 'MovementID', 'MV'), productId, date, 'purchase', qty,
        'Purchase ' + referenceNo, newQty, 'ERP', 'Purchases', purchaseId]);
    });

    const discount = num_(p.discount);
    const net = Math.max(0, subtotal - discount);
    const paid = Math.max(0, num_(p.paid));
    const balance = net - paid;

    ensureSheet_(CFG.sheets.purchases, CFG.headers.Purchases);
    ensureSheet_(CFG.sheets.purchaseItems, CFG.headers.PurchaseItems);
    append_(CFG.sheets.purchases, [purchaseId, date, supplierId, referenceNo, subtotal, discount, net, paid, balance, 'posted', String(p.notes || ''), new Date()]);
    itemRows.forEach(function (row) { append_(CFG.sheets.purchaseItems, row); });
    movementRows.forEach(function (row) { append_(CFG.sheets.stock, row); });
    updateProductStocks_(productMap);

    appendLedgerAndUpdateParty_('supplier', supplierId, date, 'Purchase ' + referenceNo, referenceNo, net, 0, 'purchase');

    if (paid > 0) {
      appendPaymentInternal_({ date: date, partyType: 'supplier', partyId: supplierId, direction: 'out', amount: paid,
        method: String(p.paymentMethod || 'cash'), reference: referenceNo, notes: 'Purchase payment' });
    }

    audit_('create', 'purchase', purchaseId, String(p.user || 'ERP'), 'Created purchase');
    return { purchaseId: purchaseId, referenceNo: referenceNo, no: referenceNo, subtotal: subtotal,
      discount: discount, netTotal: net, total: net, paid: paid, balance: balance };
  } finally { lock.releaseLock(); }
}


/* ============================================================ CREATE PAYMENT ============================================================ */
function createPayment_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return appendPaymentInternal_(p); }
  finally { lock.releaseLock(); }
}

function appendPaymentInternal_(p) {
  const partyType = String(p.partyType || '').toLowerCase();
  const partyId = String(p.partyId || '');
  const amount = num_(p.amount);

  if (['customer', 'supplier'].indexOf(partyType) === -1 || !partyId || amount <= 0) {
    throw new Error('Invalid payment');
  }

  const date = p.date ? new Date(p.date) : new Date();
  ensureSheet_(CFG.sheets.payments, CFG.headers.Payments);
  const id = nextId_(CFG.sheets.payments, 'PaymentID', 'PAY');

  append_(CFG.sheets.payments, [id, date, partyType, partyId,
    String(p.direction || (partyType === 'customer' ? 'in' : 'out')), amount,
    String(p.method || 'cash'), String(p.reference || ''), String(p.notes || ''), new Date()]);

  if (partyType === 'customer') {
    appendLedgerAndUpdateParty_('customer', partyId, date, 'Payment ' + id, String(p.reference || id), 0, amount, 'payment');
  } else {
    appendLedgerAndUpdateParty_('supplier', partyId, date, 'Payment ' + id, String(p.reference || id), amount, 0, 'payment');
  }

  audit_('create', 'payment', id, String(p.user || 'ERP'), 'Created payment');
  return { paymentId: id, amount: amount };
}


/* ============================================================ CREATE EXPENSE ============================================================ */
function createExpense_(p) {
  const amount = num_(p.amount);
  if (amount <= 0) throw new Error('Expense amount must be greater than zero');
  ensureSheet_(CFG.sheets.expenses, CFG.headers.Expenses);
  const id = nextId_(CFG.sheets.expenses, 'ExpenseID', 'EXP');
  append_(CFG.sheets.expenses, [id, p.date ? new Date(p.date) : new Date(), String(p.category || 'General'),
    String(p.description || ''), amount, String(p.paymentMethod || 'cash'), String(p.notes || ''), new Date()]);
  audit_('create', 'expense', id, String(p.user || 'ERP'), 'Created expense');
  return { expenseId: id, amount: amount };
}


/* ============================================================ LEDGER APPEND — now also updates Customers/Suppliers ============================================================ */
function appendLedgerAndUpdateParty_(partyType, partyId, date, particular, ref, debit, credit, type) {
  const sheetName = partyType === 'customer' ? CFG.sheets.customers : CFG.sheets.suppliers;
  const idField = partyType === 'customer' ? 'CustomerID' : 'SupplierID';
  const parties = safeList_(sheetName);
  const party = parties.find(function (x) { return String(x[idField]) === String(partyId); });
  const previousBalance = party ? num_(party.ClosingBalance) : 0;
  const balance = previousBalance + num_(debit) - num_(credit);

  const id = nextId_(CFG.sheets.ledger, 'EntryID', 'LE');
  append_(CFG.sheets.ledger, [id, partyType, partyId, date, particular, ref, num_(debit), num_(credit),
    balance, '', balance, type, false, 'ERP', 'ERP', id]);

  if (party) {
    updateRowWhere_(sheetName, idField, partyId, {
      ClosingBalance: balance,
      TotalDebit: num_(party.TotalDebit) + num_(debit),
      TotalCredit: num_(party.TotalCredit) + num_(credit)
    });
  }
  return balance;
}

function appendLedger_(partyType, partyId, date, particular, ref, debit, credit, type) {
  return appendLedgerAndUpdateParty_(partyType, partyId, date, particular, ref, debit, credit, type);
}

function updateRowWhere_(sheetName, idField, idValue, patch) {
  const sheet = getSheet_(sheetName);
  if (!sheet) return false;
  const values = sheet.getDataRange().getValues();
  if (!values.length) return false;
  const headerRowIdx = findHeaderRowIndex_(values);
  const headers = values[headerRowIdx].map(function (v) { return String(v || '').trim(); });
  const idCol = headers.indexOf(idField);
  if (idCol === -1) return false;

  for (let r = headerRowIdx + 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(idValue)) {
      const rowNum = r + 1;
      Object.keys(patch).forEach(function (field) {
        const col = headers.indexOf(field);
        if (col !== -1) sheet.getRange(rowNum, col + 1).setValue(patch[field]);
      });
      return true;
    }
  }
  return false;
}


/* ============================================================ UPDATE PRODUCTS ============================================================ */
function updateProductStocks_(productMap) {
  const sheet = getSheet_(CFG.sheets.products);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return;

  const headerRowIndex = findHeaderRowIndex_(values);
  const headers = values[headerRowIndex] || [];
  const index = {};
  headers.forEach(function (header, i) { index[String(header || '').trim()] = i; });
  if (index.ProductID === undefined) return;

  for (let r = headerRowIndex + 1; r < values.length; r++) {
    const productId = String(values[r][index.ProductID] || '');
    if (productMap[productId]) {
      if (index.CurrentStock !== undefined) values[r][index.CurrentStock] = productMap[productId].CurrentStock;
      if (index.PurchasePrice !== undefined) values[r][index.PurchasePrice] = productMap[productId].PurchasePrice;
    }
  }
  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
}


function ensureColumns_(sheetName, columns) {
  if (!columns || !columns.length) return;
  const sheet = getSheet_(sheetName);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  if (!values.length) return;
  const headerRow = findHeaderRowIndex_(values);
  const headers = values[headerRow].map(function (v) { return String(v || '').trim(); });
  columns.forEach(function (col) {
    if (headers.indexOf(col) === -1) {
      const newCol = headers.length + 1;
      sheet.getRange(headerRow + 1, newCol).setValue(col);
      headers.push(col);
    }
  });
}

function appendObject_(sheetName, object) {
  const sheet = getSheet_(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  const values = sheet.getDataRange().getValues();
  if (!values.length) throw new Error('Sheet has no header: ' + sheetName);
  const headerRow = findHeaderRowIndex_(values);
  const headers = values[headerRow].map(function (v) { return String(v || '').trim(); });
  const row = headers.map(function (h) { return Object.prototype.hasOwnProperty.call(object, h) ? object[h] : ''; });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
}


/* ============================================================ SHEET MANAGEMENT ============================================================ */
function ensureSheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0 && headers && headers.length) sheet.appendRow(headers);
  return sheet;
}
function getSheet_(name) { return SpreadsheetApp.getActive().getSheetByName(name); }


/* ============================================================ ROW CONVERTER ============================================================ */
const KNOWN_ANCHOR_HEADERS_ = [
  'ProductID','CustomerID','SupplierID','EntryID','MovementID','SaleID','SaleItemID',
  'PurchaseID','PurchaseItemID','PaymentID','ExpenseID','AuditID','CompanyName',
  'GroupLabel','EntityType','BatchID','UserID','Key'
];

function findHeaderRowIndex_(values) {
  for (let r = 0; r < Math.min(10, values.length); r++) {
    const row = values[r] || [];
    const found = row.some(function (cell) {
      return KNOWN_ANCHOR_HEADERS_.indexOf(String(cell || '').trim()) !== -1;
    });
    if (found) return r;
  }
  let bestRow = 0, bestCount = -1;
  for (let r = 0; r < Math.min(3, values.length); r++) {
    const count = (values[r] || []).filter(function (v) { return String(v).trim() !== ''; }).length;
    if (count > bestCount) { bestCount = count; bestRow = r; }
  }
  return bestRow;
}

function rows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 1) return [];

  const headerRow = findHeaderRowIndex_(values);
  const headers = values[headerRow].map(function (v) { return String(v || '').trim(); });
  const output = [];

  for (let r = headerRow + 1; r < values.length; r++) {
    const row = values[r];
    const empty = row.every(function (v) { return v === '' || v === null || v === undefined; });
    if (empty) continue;

    const object = {};
    headers.forEach(function (header, i) {
      if (!header) return;
      const value = row[i];
      object[header] = value instanceof Date ? value.toISOString() : value;
    });
    output.push(object);
  }
  return output;
}


/* ============================================================ APPEND ============================================================ */
function append_(sheetName, row) {
  const sheet = getSheet_(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  sheet.appendRow(row);
}


/* ============================================================ INDEX / SUM / NUMBER ============================================================ */
function indexBy_(rows, key) {
  const output = {};
  rows.forEach(function (row) { if (row[key] !== undefined) output[String(row[key])] = row; });
  return output;
}
function sum_(rows, key) {
  return rows.reduce(function (total, row) { return total + num_(row[key]); }, 0);
}
function num_(value) {
  if (value === null || value === undefined || value === '') return 0;
  const number = Number(String(value).replace(/,/g, '').trim());
  return isNaN(number) ? 0 : number;
}
function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }


/* ============================================================ NEXT ID / NEXT INVOICE ============================================================ */
function nextId_(sheetName, column, prefix) {
  const sheet = getSheet_(sheetName);
  if (!sheet) return prefix + '000001';
  const rows = safeList_(sheetName);
  let max = 0;
  rows.forEach(function (row) {
    const value = String(row[column] || '');
    const match = value.match(/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return prefix + String(max + 1).padStart(6, '0');
}

function nextInvoiceNo_() {
  const sheet = getSheet_(CFG.sheets.settings);
  if (!sheet) return 'INV-1';
  const values = sheet.getDataRange().getValues();
  for (let r = 0; r < values.length; r++) {
    if (String(values[r][0] || '') === 'NextSaleNo') {
      const current = num_(values[r][1]) || 1;
      sheet.getRange(r + 1, 2).setValue(current + 1);
      return 'INV-' + current;
    }
  }
  sheet.appendRow(['NextSaleNo', 2]);
  return 'INV-1';
}


/* ============================================================ AUDIT ============================================================ */
function audit_(action, entityType, entityId, user, details) {
  ensureSheet_(CFG.sheets.audit, CFG.headers.AuditLog);
  append_(CFG.sheets.audit, [nextId_(CFG.sheets.audit, 'AuditID', 'AUD'), new Date(), action, entityType, entityId, user, details]);
}


/* ============================================================ JSON RESPONSE / DATE REPLACER ============================================================ */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj, replacer_)).setMimeType(ContentService.MimeType.JSON);
}
function replacer_(key, value) { return value instanceof Date ? value.toISOString() : value; }


/* ============================================================ JSONP CALLBACK SECURITY ============================================================ */
function sanitizeCallback_(callback) {
  callback = String(callback || '').trim();
  if (/^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback)) return callback;
  return '';
}

/* ============================================================ END ============================================================ */
