/* ============================================================
   ARHAM ELECTRONICS ERP
   app.js — Updated UI + Direct Google Apps Script backend
   ============================================================ */

// ← Seedha Apps Script URL — backend-fix.js ki zaroorat nahi
const API_URL = "https://script.google.com/macros/s/AKfycbyi8CaMtMxV7Prf5Dexoy03ao8v2XApxbw2rLK2hTlvYS_j9vV3Y7JbW-GrAS3XYUvAtA/exec";

/* ============================================================
   GLOBAL STATE
   ============================================================ */

const state = {
  page: "dashboard",
  dashboard: null,
  products: [],
  customers: [],
  suppliers: [],
  stock: [],
  ledger: [],
  sales: [],
  purchases: [],
  payments: [],
  expenses: [],
  loading: false
};

const API_ACTIONS = {
  apiDashboard: "dashboard",
  apiProducts:  "products",
  apiCustomers: "customers",
  apiSuppliers: "suppliers",
  apiStock:     "stock",
  apiLedger:    "ledger",
  apiSale:      "sale",
  apiPurchase:  "purchase",
  apiPayment:   "payment",
  apiExpense:   "expense"
};

/* ============================================================
   DOM
   ============================================================ */

function $(id) { return document.getElementById(id); }
function contentElement() { return $("content"); }

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  bindNavigation();
  bindRefresh();
  updateClock();
  setInterval(updateClock, 60000);
  showPage("dashboard");
});

function updateClock() {
  const el = $("clock");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString("en-PK", { day:"2-digit", month:"short", year:"numeric" })
    + " · " + now.toLocaleTimeString("en-PK", { hour:"2-digit", minute:"2-digit" });
}

/* ============================================================
   NAVIGATION
   ============================================================ */

function bindNavigation() {
  document.querySelectorAll(".nav[data-page]").forEach(function (btn) {
    btn.addEventListener("click", function () { showPage(btn.dataset.page); });
  });
}

function bindRefresh() {
  const btn = $("refreshBtn");
  if (btn) btn.addEventListener("click", function () { loadPage(state.page, true); });
}

function showPage(page) {
  state.page = page;
  updateNavigation(page);
  updatePageTitle(page);
  renderLoading();
  loadPage(page);
}

function updateNavigation(page) {
  document.querySelectorAll(".nav[data-page]").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.page === page);
  });
}

function updatePageTitle(page) {
  const titles = {
    dashboard:"Dashboard", products:"Products", stock:"Stock",
    customers:"Customers", suppliers:"Suppliers", ledger:"Ledger",
    sales:"Sales", purchases:"Purchases", payments:"Payments", expenses:"Expenses"
  };
  const title = titles[page] || "Dashboard";
  if ($("pageTitle")) $("pageTitle").textContent = title;
  if ($("crumb"))     $("crumb").textContent = title;
}

/* ============================================================
   PAGE LOADER
   ============================================================ */

async function loadPage(page) {
  try {
    state.loading = true;
    switch (page) {
      case "dashboard":  await loadDashboard();  break;
      case "products":   await loadProducts();   break;
      case "stock":      await loadStock();      break;
      case "customers":  await loadCustomers();  break;
      case "suppliers":  await loadSuppliers();  break;
      case "ledger":     await loadLedger();     break;
      case "sales":      await loadSales();      break;
      case "purchases":  await loadPurchases();  break;
      case "payments":   await loadPayments();   break;
      case "expenses":   await loadExpenses();   break;
      default:           await loadDashboard();  break;
    }
  } catch (err) {
    console.error(err);
    showError(err.message || "Could not load ERP data.");
  } finally {
    state.loading = false;
  }
}

/* ============================================================
   API CALL
   ============================================================ */

function call(name, ...args) {
  const action = API_ACTIONS[name] || name;
  let payload = {};

  if (action === "stock")        { payload = { productId: args[0] || "" }; }
  else if (action === "ledger")  { payload = { partyType: args[0] || "", partyId: args[1] || "" }; }
  else if (args.length === 1 && args[0] && typeof args[0] === "object") { payload = args[0]; }
  else if (args.length > 0)      { payload = { args }; }

  const params = new URLSearchParams();
  params.set("action", action);
  params.set("_ts", String(Date.now()));
  if (payload && Object.keys(payload).length > 0) params.set("payload", JSON.stringify(payload));

  return fetch(API_URL + "?" + params.toString(), {
    method: "GET", cache: "no-store", headers: { Accept: "application/json" }
  })
    .then(r => { if (!r.ok) throw new Error("Backend HTTP " + r.status); return r.json(); })
    .then(r => {
      if (!r) throw new Error("Empty response from backend.");
      if (r.ok === false) throw new Error(r.error || "Backend error.");
      return r.data;
    })
    .catch(err => {
      console.error("ERP API error:", err);
      throw new Error(err?.message || "Could not connect to backend.");
    });
}

/* ============================================================
   LOADERS
   ============================================================ */

async function loadDashboard()  { const d = await call("apiDashboard"); state.dashboard = d; renderDashboard(d); }
async function loadProducts()   { const d = await call("apiProducts");  state.products  = Array.isArray(d) ? d : []; renderProducts(state.products); }
async function loadStock()      { const d = await call("apiStock");     state.stock     = Array.isArray(d) ? d : []; renderStock(state.stock); }
async function loadCustomers()  { const d = await call("apiCustomers"); state.customers = Array.isArray(d) ? d : []; renderCustomers(state.customers); }
async function loadSuppliers()  { const d = await call("apiSuppliers"); state.suppliers = Array.isArray(d) ? d : []; renderSuppliers(state.suppliers); }
async function loadLedger()     { const d = await call("apiLedger");    state.ledger    = Array.isArray(d) ? d : []; renderLedger(state.ledger); }
async function loadSales()      { const d = await call("sales");        state.sales     = Array.isArray(d) ? d : []; renderSales(state.sales); }
async function loadPurchases()  { const d = await call("purchases");    state.purchases = Array.isArray(d) ? d : []; renderPurchases(state.purchases); }
async function loadPayments()   { const d = await call("payments");     state.payments  = Array.isArray(d) ? d : []; renderPayments(state.payments); }
async function loadExpenses()   { const d = await call("expenses");     state.expenses  = Array.isArray(d) ? d : []; renderExpenses(state.expenses); }

/* ============================================================
   DASHBOARD RENDER
   ============================================================ */

function renderDashboard(data) {
  const d = data || {};
  contentElement().innerHTML = `
    <div class="content">
      <div class="cards">
        ${kpi("Products",    formatNumber(d.productCount),  "Total catalog items")}
        ${kpi("Customers",   formatNumber(d.customerCount), "Registered accounts")}
        ${kpi("Stock Value", money(d.stockValue),           formatNumber(d.stockQty) + " units")}
        ${kpi("Sales Total", money(d.salesTotal),           "This period")}
        ${kpi("Purchases",   money(d.purchasesTotal),       "Stock cost")}
        ${kpi("Expenses",    money(d.expensesTotal),        "Operational")}
        ${kpi("Suppliers",   formatNumber(d.supplierCount), "Active vendors")}
        ${kpi("Low Stock",   formatNumber(d.lowStockCount), "Need reorder", true)}
      </div>

      <div class="panel">
        <div class="panel-header">
          <h2>Quick Actions</h2>
          <button class="btn primary" onclick="showPage('sales')">+ New Sale</button>
        </div>
        <div class="quick-grid">
          <button class="quick-btn" onclick="showPage('products')">▦ Products</button>
          <button class="quick-btn" onclick="showPage('stock')">▥ Stock</button>
          <button class="quick-btn" onclick="showPage('customers')">♟ Customers</button>
          <button class="quick-btn" onclick="showPage('suppliers')">◎ Suppliers</button>
          <button class="quick-btn" onclick="showPage('ledger')">▣ Ledger</button>
          <button class="quick-btn" onclick="showPage('purchases')">↙ Purchases</button>
        </div>
      </div>
    </div>
  `;
}

/* ── KPI card helper ── */
function kpi(title, value, sub, warn) {
  return `
    <div class="card">
      <div class="card-title">${escapeHtml(title)}</div>
      <div class="card-value" style="${warn ? 'color:#FBBF24' : ''}">${escapeHtml(value)}</div>
      ${sub ? `<div style="margin-top:6px;font-size:11px;color:var(--muted)">${escapeHtml(sub)}</div>` : ""}
    </div>`;
}

/* ============================================================
   PRODUCTS RENDER
   ============================================================ */

function renderProducts(rows) {
  const columns = ["Description","Code","Brand","Category","Unit","CurrentStock","PurchasePrice","SalePrice","MinStock","Location"];
  contentElement().innerHTML = `
    <div class="content">
      ${toolbar("Products", "productSearch", "Search product...")}
      <div id="productTable"></div>
    </div>`;
  renderSearchableTable(rows, columns, "productSearch", "productTable");
}

/* ============================================================
   STOCK RENDER
   ============================================================ */

function renderStock(rows) {
  const columns = ["MovementID","ProductID","Date","Type","Qty","Note","BalanceAfter","SourceSheet"];
  contentElement().innerHTML = `
    <div class="content">
      ${toolbar("Stock Movements", "stockSearch", "Search stock...")}
      <div id="stockTable"></div>
    </div>`;
  renderSearchableTable(rows, columns, "stockSearch", "stockTable");
}

/* ============================================================
   CUSTOMERS RENDER
   ============================================================ */

function renderCustomers(rows) {
  const columns = ["CustomerID","Name","Phone","WhatsApp","Email","Address","CreditLimit","OpeningBalance","ClosingBalance","TotalDebit","TotalCredit"];
  contentElement().innerHTML = `
    <div class="content">
      ${toolbar("Customers", "customerSearch", "Search customer...")}
      <div id="customerTable"></div>
    </div>`;
  renderSearchableTable(rows, columns, "customerSearch", "customerTable");
}

/* ============================================================
   SUPPLIERS RENDER
   ============================================================ */

function renderSuppliers(rows) {
  const columns = ["SupplierID","Name","Phone","Email","Address","OpeningBalance","ClosingBalance","TotalDebit","TotalCredit"];
  contentElement().innerHTML = `
    <div class="content">
      ${toolbar("Suppliers", "supplierSearch", "Search supplier...")}
      <div id="supplierTable"></div>
    </div>`;
  renderSearchableTable(rows, columns, "supplierSearch", "supplierTable");
}

/* ============================================================
   LEDGER RENDER
   ============================================================ */

function renderLedger(rows) {
  const columns = ["EntryID","PartyType","PartyID","Date","Particular","Ref","Debit","Credit","Balance","Type","ReviewFlag"];
  contentElement().innerHTML = `
    <div class="content">
      ${toolbar("Ledger", "ledgerSearch", "Search ledger...")}
      <div id="ledgerTable"></div>
    </div>`;
  renderSearchableTable(rows, columns, "ledgerSearch", "ledgerTable");
}

/* ============================================================
   SALES RENDER
   ============================================================ */

function renderSales(rows) {
  const columns = ["SaleID","Date","CustomerID","InvoiceNo","Subtotal","Discount","NetTotal","Paid","Balance","Status","Notes"];
  contentElement().innerHTML = `
    <div class="content">
      <div class="toolbar">
        <div><h2>Sales</h2><p>Sales invoices and customer transactions</p></div>
        <button class="btn primary" onclick="openSaleForm()">+ New Sale</button>
      </div>
      ${searchBox("salesSearch", "Search invoice...")}
      <div id="salesTable"></div>
    </div>`;
  renderSearchableTable(rows, columns, "salesSearch", "salesTable");
}

/* ============================================================
   PURCHASES RENDER
   ============================================================ */

function renderPurchases(rows) {
  const columns = ["PurchaseID","Date","SupplierID","ReferenceNo","Subtotal","Discount","NetTotal","Paid","Balance","Status","Notes"];
  contentElement().innerHTML = `
    <div class="content">
      <div class="toolbar">
        <div><h2>Purchases</h2><p>Supplier purchases and stock receiving</p></div>
        <button class="btn primary" onclick="openPurchaseForm()">+ New Purchase</button>
      </div>
      ${searchBox("purchaseSearch", "Search purchase...")}
      <div id="purchaseTable"></div>
    </div>`;
  renderSearchableTable(rows, columns, "purchaseSearch", "purchaseTable");
}

/* ============================================================
   PAYMENTS RENDER
   ============================================================ */

function renderPayments(rows) {
  const columns = ["PaymentID","Date","PartyType","PartyID","Direction","Amount","Method","Reference","Notes"];
  contentElement().innerHTML = `
    <div class="content">
      <div class="toolbar">
        <div><h2>Payments</h2><p>Customer receipts and supplier payments</p></div>
        <button class="btn primary" onclick="openPaymentForm()">+ New Payment</button>
      </div>
      ${searchBox("paymentSearch", "Search payment...")}
      <div id="paymentTable"></div>
    </div>`;
  renderSearchableTable(rows, columns, "paymentSearch", "paymentTable");
}

/* ============================================================
   EXPENSES RENDER
   ============================================================ */

function renderExpenses(rows) {
  const columns = ["ExpenseID","Date","Category","Description","Amount","PaymentMethod","Notes"];
  contentElement().innerHTML = `
    <div class="content">
      <div class="toolbar">
        <div><h2>Expenses</h2><p>Business expenses and overheads</p></div>
        <button class="btn primary" onclick="openExpenseForm()">+ New Expense</button>
      </div>
      ${searchBox("expenseSearch", "Search expense...")}
      <div id="expenseTable"></div>
    </div>`;
  renderSearchableTable(rows, columns, "expenseSearch", "expenseTable");
}

/* ============================================================
   TOOLBAR / SEARCH HELPERS
   ============================================================ */

function toolbar(title, searchId, placeholder) {
  return `
    <div class="toolbar">
      <div><h2>${escapeHtml(title)}</h2></div>
      ${searchBox(searchId, placeholder)}
    </div>`;
}

function searchBox(id, placeholder) {
  return `<input id="${escapeHtml(id)}" class="search" type="search" placeholder="${escapeHtml(placeholder)}" autocomplete="off">`;
}

/* ============================================================
   SEARCHABLE TABLE
   ============================================================ */

function renderSearchableTable(rows, columns, searchId, tableId) {
  const render = function () {
    const input = $(searchId);
    const query = input ? input.value.trim().toLowerCase() : "";
    const filtered = !query ? rows : rows.filter(function (row) {
      return columns.some(function (col) {
        return String(row[col] ?? "").toLowerCase().includes(query);
      });
    });
    const target = $(tableId);
    if (target) target.innerHTML = table(filtered, columns);
  };
  const input = $(searchId);
  if (input) input.addEventListener("input", render);
  render();
}

/* ============================================================
   TABLE
   ============================================================ */

function table(rows, columns) {
  if (!rows || rows.length === 0) {
    return `<div class="panel"><div class="empty">No records found.</div></div>`;
  }
  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>${columns.map(col => `<th>${escapeHtml(prettyLabel(col))}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>${columns.map(col => `<td>${formatCell(row[col], col)}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}

function prettyLabel(v) {
  return String(v || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
}

function formatCell(value, column) {
  if (value === null || value === undefined || value === "") return "";
  const lower = String(column || "").toLowerCase();
  if (lower.includes("price") || lower.includes("amount") || lower.includes("total") ||
      lower.includes("balance") || lower.includes("debit") || lower.includes("credit") ||
      lower.includes("cost") || lower.includes("paid") || lower.includes("discount")) {
    return escapeHtml(money(value));
  }
  if (lower === "date" || lower.endsWith("at")) return escapeHtml(formatDate(value));
  return escapeHtml(value);
}

/* ============================================================
   FORMS — SALE
   ============================================================ */

function openSaleForm() {
  if (!state.customers.length) {
    showToast("Loading customers...");
    loadCustomers().then(() => openSaleForm()).catch(e => showError(e.message));
    return;
  }
  if (!state.products.length) {
    showToast("Loading products...");
    loadProducts().then(() => openSaleForm()).catch(e => showError(e.message));
    return;
  }

  const custOpts = state.customers.map(c => `<option value="${escapeHtml(c.CustomerID)}">${escapeHtml(c.Name || c.CustomerID)}</option>`).join("");
  const prodOpts = state.products.map(p => `<option value="${escapeHtml(p.ProductID)}">${escapeHtml(p.Code || p.Description || p.ProductID)}</option>`).join("");

  contentElement().innerHTML = `
    <div class="content">
      <div class="panel">
        <div class="panel-header">
          <h2>New Sale</h2>
          <button class="btn secondary" onclick="showPage('sales')">Cancel</button>
        </div>
        <form id="saleForm" class="erp-form">
          <div class="form-grid">
            <label>Customer<select name="customerId" required><option value="">Select customer</option>${custOpts}</select></label>
            <label>Invoice No<input name="invoiceNo" placeholder="Auto-generated"></label>
            <label>Date<input type="date" name="date" value="${todayInput()}" required></label>
            <label>Discount<input type="number" name="discount" min="0" step="0.01" value="0"></label>
            <label>Paid<input type="number" name="paid" min="0" step="0.01" value="0"></label>
            <label>Payment Method
              <select name="paymentMethod">
                <option value="cash">Cash</option><option value="bank">Bank Transfer</option>
                <option value="online">Online</option><option value="other">Other</option>
              </select>
            </label>
          </div>
          <h3>Items</h3>
          <div id="saleItems" class="items-box">${saleItemRow(prodOpts)}</div>
          <button type="button" class="btn secondary" onclick="addSaleItemRow()">+ Add Item</button>
          <label style="margin-top:14px">Notes<textarea name="notes" rows="3"></textarea></label>
          <div class="form-actions">
            <button type="submit" class="btn primary">Save Sale</button>
          </div>
        </form>
      </div>
    </div>`;

  $("saleForm").addEventListener("submit", submitSale);
}

function saleItemRow(prodOpts) {
  return `
    <div class="item-row">
      <select name="productId" required><option value="">Select product</option>${prodOpts}</select>
      <input type="number" name="qty" min="0.01" step="0.01" placeholder="Qty" required>
      <input type="number" name="unitPrice" min="0" step="0.01" placeholder="Unit Price">
      <input type="number" name="discount" min="0" step="0.01" placeholder="Discount" value="0">
      <button type="button" class="btn danger" onclick="this.parentElement.remove()">✕</button>
    </div>`;
}

function addSaleItemRow() {
  const opts = state.products.map(p => `<option value="${escapeHtml(p.ProductID)}">${escapeHtml(p.Code || p.Description || p.ProductID)}</option>`).join("");
  const box = $("saleItems");
  if (box) box.insertAdjacentHTML("beforeend", saleItemRow(opts));
}

async function submitSale(e) {
  e.preventDefault();
  const form = e.currentTarget;
  try {
    showToast("Saving sale...");
    const items = Array.from(form.querySelectorAll(".item-row")).map(row => ({
      productId: row.querySelector('[name="productId"]').value,
      qty:       Number(row.querySelector('[name="qty"]').value),
      unitPrice: Number(row.querySelector('[name="unitPrice"]').value) || undefined,
      discount:  Number(row.querySelector('[name="discount"]').value) || 0
    }));
    const result = await call("apiSale", {
      customerId: form.customerId.value, invoiceNo: form.invoiceNo.value.trim(),
      date: form.date.value, discount: Number(form.discount.value) || 0,
      paid: Number(form.paid.value) || 0, paymentMethod: form.paymentMethod.value,
      notes: form.notes.value.trim(), items
    });
    showToast("Sale saved: " + result.invoiceNo);
    showPage("sales");
  } catch (err) { showError(err.message); }
}

/* ============================================================
   FORMS — PURCHASE
   ============================================================ */

function openPurchaseForm() {
  if (!state.suppliers.length) { loadSuppliers().then(() => openPurchaseForm()).catch(e => showError(e.message)); return; }
  if (!state.products.length)  { loadProducts().then(() => openPurchaseForm()).catch(e => showError(e.message)); return; }

  const suppOpts = state.suppliers.map(s => `<option value="${escapeHtml(s.SupplierID)}">${escapeHtml(s.Name || s.SupplierID)}</option>`).join("");
  const prodOpts = state.products.map(p => `<option value="${escapeHtml(p.ProductID)}">${escapeHtml(p.Code || p.Description || p.ProductID)}</option>`).join("");

  contentElement().innerHTML = `
    <div class="content">
      <div class="panel">
        <div class="panel-header">
          <h2>New Purchase</h2>
          <button class="btn secondary" onclick="showPage('purchases')">Cancel</button>
        </div>
        <form id="purchaseForm" class="erp-form">
          <div class="form-grid">
            <label>Supplier<select name="supplierId" required><option value="">Select supplier</option>${suppOpts}</select></label>
            <label>Reference No<input name="referenceNo" placeholder="Reference"></label>
            <label>Date<input type="date" name="date" value="${todayInput()}" required></label>
            <label>Discount<input type="number" name="discount" min="0" step="0.01" value="0"></label>
            <label>Paid<input type="number" name="paid" min="0" step="0.01" value="0"></label>
            <label>Payment Method
              <select name="paymentMethod">
                <option value="cash">Cash</option><option value="bank">Bank Transfer</option>
                <option value="online">Online</option><option value="other">Other</option>
              </select>
            </label>
          </div>
          <h3>Items</h3>
          <div id="purchaseItems" class="items-box">${purchaseItemRow(prodOpts)}</div>
          <button type="button" class="btn secondary" onclick="addPurchaseItemRow()">+ Add Item</button>
          <label style="margin-top:14px">Notes<textarea name="notes" rows="3"></textarea></label>
          <div class="form-actions"><button type="submit" class="btn primary">Save Purchase</button></div>
        </form>
      </div>
    </div>`;

  $("purchaseForm").addEventListener("submit", submitPurchase);
}

function purchaseItemRow(prodOpts) {
  return `
    <div class="item-row">
      <select name="productId" required><option value="">Select product</option>${prodOpts}</select>
      <input type="number" name="qty" min="0.01" step="0.01" placeholder="Qty" required>
      <input type="number" name="unitCost" min="0" step="0.01" placeholder="Unit Cost" required>
      <input type="number" name="discount" min="0" step="0.01" placeholder="Discount" value="0">
      <button type="button" class="btn danger" onclick="this.parentElement.remove()">✕</button>
    </div>`;
}

function addPurchaseItemRow() {
  const opts = state.products.map(p => `<option value="${escapeHtml(p.ProductID)}">${escapeHtml(p.Code || p.Description || p.ProductID)}</option>`).join("");
  const box = $("purchaseItems");
  if (box) box.insertAdjacentHTML("beforeend", purchaseItemRow(opts));
}

async function submitPurchase(e) {
  e.preventDefault();
  const form = e.currentTarget;
  try {
    showToast("Saving purchase...");
    const items = Array.from(form.querySelectorAll(".item-row")).map(row => ({
      productId: row.querySelector('[name="productId"]').value,
      qty:       Number(row.querySelector('[name="qty"]').value),
      unitCost:  Number(row.querySelector('[name="unitCost"]').value),
      discount:  Number(row.querySelector('[name="discount"]').value) || 0
    }));
    const result = await call("apiPurchase", {
      supplierId: form.supplierId.value, referenceNo: form.referenceNo.value.trim(),
      date: form.date.value, discount: Number(form.discount.value) || 0,
      paid: Number(form.paid.value) || 0, paymentMethod: form.paymentMethod.value,
      notes: form.notes.value.trim(), items
    });
    showToast("Purchase saved: " + result.referenceNo);
    showPage("purchases");
  } catch (err) { showError(err.message); }
}

/* ============================================================
   FORMS — PAYMENT
   ============================================================ */

function openPaymentForm() {
  if (!state.customers.length) loadCustomers().catch(e => showError(e.message));

  contentElement().innerHTML = `
    <div class="content">
      <div class="panel">
        <div class="panel-header">
          <h2>New Payment</h2>
          <button class="btn secondary" onclick="showPage('payments')">Cancel</button>
        </div>
        <form id="paymentForm" class="erp-form">
          <div class="form-grid">
            <label>Party Type
              <select name="partyType" id="paymentPartyType">
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
              </select>
            </label>
            <label>Party<select name="partyId" id="paymentPartyId" required></select></label>
            <label>Date<input type="date" name="date" value="${todayInput()}" required></label>
            <label>Amount<input type="number" name="amount" min="0.01" step="0.01" required></label>
            <label>Method
              <select name="method">
                <option value="cash">Cash</option><option value="bank">Bank Transfer</option>
                <option value="online">Online</option><option value="other">Other</option>
              </select>
            </label>
            <label>Reference<input name="reference"></label>
          </div>
          <label>Notes<textarea name="notes" rows="3"></textarea></label>
          <div class="form-actions"><button type="submit" class="btn primary">Save Payment</button></div>
        </form>
      </div>
    </div>`;

  populatePaymentParties();
  $("paymentPartyType").addEventListener("change", populatePaymentParties);
  $("paymentForm").addEventListener("submit", submitPayment);
}

function populatePaymentParties() {
  const type   = $("paymentPartyType")?.value || "customer";
  const select = $("paymentPartyId");
  if (!select) return;
  const rows = type === "customer" ? state.customers : state.suppliers;
  select.innerHTML = `<option value="">Select party</option>` +
    rows.map(r => { const id = type === "customer" ? r.CustomerID : r.SupplierID; return `<option value="${escapeHtml(id)}">${escapeHtml(r.Name || id)}</option>`; }).join("");
}

async function submitPayment(e) {
  e.preventDefault();
  const form = e.currentTarget;
  try {
    showToast("Saving payment...");
    const partyType = form.partyType.value;
    const result = await call("apiPayment", {
      partyType, partyId: form.partyId.value, date: form.date.value,
      amount: Number(form.amount.value), method: form.method.value,
      reference: form.reference.value.trim(), notes: form.notes.value.trim(),
      direction: partyType === "customer" ? "in" : "out"
    });
    showToast("Payment saved: " + result.paymentId);
    showPage("payments");
  } catch (err) { showError(err.message); }
}

/* ============================================================
   FORMS — EXPENSE
   ============================================================ */

function openExpenseForm() {
  contentElement().innerHTML = `
    <div class="content">
      <div class="panel">
        <div class="panel-header">
          <h2>New Expense</h2>
          <button class="btn secondary" onclick="showPage('expenses')">Cancel</button>
        </div>
        <form id="expenseForm" class="erp-form">
          <div class="form-grid">
            <label>Date<input type="date" name="date" value="${todayInput()}" required></label>
            <label>Category<input name="category" placeholder="e.g. Salaries, Rent, Utilities"></label>
            <label>Amount<input type="number" name="amount" min="0.01" step="0.01" required></label>
            <label>Payment Method
              <select name="paymentMethod">
                <option value="cash">Cash</option><option value="bank">Bank Transfer</option>
                <option value="online">Online</option><option value="other">Other</option>
              </select>
            </label>
          </div>
          <label>Description<textarea name="description" rows="3" required></textarea></label>
          <label>Notes<textarea name="notes" rows="2"></textarea></label>
          <div class="form-actions"><button type="submit" class="btn primary">Save Expense</button></div>
        </form>
      </div>
    </div>`;

  $("expenseForm").addEventListener("submit", submitExpense);
}

async function submitExpense(e) {
  e.preventDefault();
  const form = e.currentTarget;
  try {
    showToast("Saving expense...");
    const result = await call("apiExpense", {
      date: form.date.value, category: form.category.value.trim(),
      description: form.description.value.trim(), amount: Number(form.amount.value),
      paymentMethod: form.paymentMethod.value, notes: form.notes.value.trim()
    });
    showToast("Expense saved: " + result.expenseId);
    showPage("expenses");
  } catch (err) { showError(err.message); }
}

/* ============================================================
   UI HELPERS
   ============================================================ */

function renderLoading() {
  if (!contentElement()) return;
  contentElement().innerHTML = `
    <div class="content">
      <div class="panel"><div class="loading">Loading ERP data...</div></div>
    </div>`;
}

function showError(message) {
  console.error(message);
  const el = $("toast");
  if (!el) { alert(message); return; }
  el.className = "toast";
  el.style.borderColor = "rgba(248,113,113,.3)";
  el.style.color = "#F87171";
  el.textContent = "⚠ " + message;
  setTimeout(() => { el.classList.add("hidden"); el.style.color = ""; el.style.borderColor = ""; }, 6000);
}

function showToast(message) {
  const el = $("toast");
  if (!el) return;
  el.className = "toast";
  el.style.color = "";
  el.style.borderColor = "";
  el.textContent = message;
  setTimeout(() => el.classList.add("hidden"), 3500);
}

/* ============================================================
   FORMATTERS
   ============================================================ */

function money(value) {
  return "Rs. " + Number(value || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-PK", { year:"numeric", month:"short", day:"2-digit" });
}

function todayInput() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

/* ============================================================
   GLOBAL ACCESS
   ============================================================ */

window.ERP = {
  state, call, showPage,
  loadDashboard, loadProducts, loadStock, loadCustomers,
  loadSuppliers, loadLedger, loadSales, loadPurchases, loadPayments, loadExpenses
};
