/* ============================================================
   ARHAM ELECTRONICS ERP
   COMPLETE FRONTEND APP.JS
   GitHub Pages + Google Apps Script Backend
   ============================================================ */

// This must be YOUR Apps Script Web App URL (Deploy -> Manage deployments -> Web app URL).
// If you redeploy using "New version" on the existing deployment, this URL stays the same.
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

  salespersons: [],

  loading: false

};


/* ============================================================
   API ACTION MAP
   ============================================================ */

const API_ACTIONS = {

  apiDashboard: "dashboard",

  apiProducts: "products",

  apiCustomers: "customers",

  apiSuppliers: "suppliers",

  apiStock: "stock",

  apiLedger: "ledger",

  apiSale: "sale",

  apiPurchase: "purchase",

  apiPayment: "payment",

  apiExpense: "expense"

};


/* ============================================================
   DOM HELPERS
   ============================================================ */

function $(id) {

  return document.getElementById(id);

}


function contentElement() {

  return $("content");

}


/* ============================================================
   INITIALIZE
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    bindNavigation();

    bindRefresh();

    bindMobileMenu();

    showPage(
      "dashboard"
    );

  }
);


/* ============================================================
   NAVIGATION
   ============================================================ */

function bindNavigation() {

  document
    .querySelectorAll(
      ".nav[data-page]"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            const page =
              button.dataset.page;

            showPage(
              page
            );

          }
        );

      }
    );

}


function bindMobileMenu() {
  const button = document.querySelector(".mobile-menu");
  const sidebar = document.querySelector(".sidebar");
  if (!button || !sidebar) return;

  button.addEventListener("click", function () {
    sidebar.classList.toggle("mobile-open");
  });

  sidebar.querySelectorAll(".nav[data-page]").forEach(function (item) {
    item.addEventListener("click", function () {
      sidebar.classList.remove("mobile-open");
    });
  });
}


function bindRefresh() {

  const button =
    $("refreshBtn");

  if (!button) {

    return;

  }

  button.addEventListener(
    "click",
    function () {

      loadPage(
        state.page,
        true
      );

    }
  );

}


function showPage(
  page
) {

  state.page =
    page;


  updateNavigation(
    page
  );


  updatePageTitle(
    page
  );


  renderLoading();


  loadPage(
    page
  );

}


/* ============================================================
   NAVIGATION UI
   ============================================================ */

function updateNavigation(
  page
) {

  document
    .querySelectorAll(
      ".nav[data-page]"
    )
    .forEach(
      function (button) {

        button.classList.toggle(
          "active",
          button.dataset.page === page
        );

      }
    );

}


function updatePageTitle(
  page
) {

  const titles = {

    dashboard:
      "Dashboard",

    products:
      "Products",

    stock:
      "Stock",

    customers:
      "Customers",

    suppliers:
      "Suppliers",

    ledger:
      "Ledger",

    sales:
      "Sales",

    purchases:
      "Purchases",

    payments:
      "Payments",

    expenses:
      "Expenses",

    incentives:
      "Incentive Report"

  };


  const title =
    titles[page] ||
    "Dashboard";


  if ($("pageTitle")) {

    $("pageTitle").textContent =
      title;

  }


  if ($("crumb")) {

    $("crumb").textContent =
      title;

  }

}


/* ============================================================
   PAGE LOADER
   ============================================================ */

async function loadPage(
  page,
  forceRefresh
) {

  try {

    state.loading =
      true;


    switch (page) {

      case "dashboard":

        await loadDashboard();

        break;


      case "products":

        await loadProducts();

        break;


      case "stock":

        await loadStock();

        break;


      case "customers":

        await loadCustomers();

        break;


      case "suppliers":

        await loadSuppliers();

        break;


      case "ledger":

        await loadLedger();

        break;


      case "sales":

        await loadSales();

        break;


      case "purchases":

        await loadPurchases();

        break;


      case "payments":

        await loadPayments();

        break;


      case "expenses":

        await loadExpenses();

        break;


      case "incentives":

        await loadIncentiveReport();

        break;


      default:

        await loadDashboard();

        break;

    }

  } catch (error) {

    console.error(
      error
    );

    showError(
      error.message ||
      "Could not load ERP data."
    );

  } finally {

    state.loading =
      false;

  }

}


/* ============================================================
   API CALL
   ============================================================ */

function call(
  name,
  ...args
) {

  const action =
    API_ACTIONS[name] ||
    name;

  let payload = {};

  if (action === "stock") {
    payload = { productId: args[0] || "" };
  } else if (action === "ledger") {
    payload = {
      partyType: args[0] || "",
      partyId: args[1] || ""
    };
  } else if (
    args.length === 1 &&
    args[0] &&
    typeof args[0] === "object"
  ) {
    payload = args[0];
  } else if (args.length > 0) {
    payload = { args: args };
  }

  const params = new URLSearchParams();
  params.set("action", action);
  params.set("_ts", String(Date.now()));

  if (payload && Object.keys(payload).length > 0) {
    params.set("payload", JSON.stringify(payload));
  }

  return fetch(API_URL + "?" + params.toString(), {
    method: "GET",
    cache: "no-store",
    headers: { "Accept": "application/json" }
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Action '" + action + "' failed with HTTP " + response.status + ".");
      }
      return response.text().then(function (text) {
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (parseError) {
          console.error("ERP API returned non-JSON response for action:", action, text.slice(0, 500));
          throw new Error("Backend action '" + action + "' returned invalid JSON. Check the Apps Script deployment.");
        }
        return parsed;
      });
    })
    .then(function (response) {
      if (response == null) {
        throw new Error("Backend action '" + action + "' returned an empty response.");
      }
      if (response.ok === false) {
        console.error("ERP API backend error:", { action: action, response: response });
        throw new Error("Backend action '" + action + "' failed: " + (response.error || "Unknown backend error"));
      }

      // Expected Apps Script shape: { ok: true, action: "...", data: ... }.
      // Also accept a direct JSON payload so a deployment returning raw data
      // does not silently turn valid customer/product arrays into undefined.
      if (Object.prototype.hasOwnProperty.call(response, "data")) {
        return response.data;
      }
      if (Array.isArray(response) || typeof response !== "object") {
        return response;
      }

      console.error("Unexpected ERP API response shape:", { action: action, response: response });
      throw new Error("Backend action '" + action + "' returned an unexpected response format.");
    })
    .catch(function (error) {
      console.error("ERP API error:", { action: action, url: API_URL, error: error });
      throw new Error(error && error.message ? error.message : "Could not connect to ERP backend.");
    });
}

/* ============================================================
   DASHBOARD
   ============================================================ */

async function loadDashboard() {

  const data =
    await call(
      "apiDashboard"
    );


  state.dashboard =
    data;


  renderDashboard(
    data
  );

}


/* ============================================================
   PRODUCTS
   ============================================================ */

async function loadProducts() {

  const data =
    await call(
      "apiProducts"
    );


  state.products =
    Array.isArray(
      data
    )
      ? data
      : [];


  renderProducts(
    state.products
  );

}


/* ============================================================
   STOCK
   ============================================================ */

async function loadStock() {

  const data =
    await call(
      "apiStock"
    );


  state.stock =
    Array.isArray(
      data
    )
      ? data
      : [];


  renderStock(
    state.stock
  );

}


/* ============================================================
   CUSTOMERS
   ============================================================ */

async function loadCustomers() {

  const data =
    await call(
      "apiCustomers"
    );


  state.customers =
    Array.isArray(
      data
    )
      ? data
      : [];


  renderCustomers(
    state.customers
  );

}


/* ============================================================
   SUPPLIERS
   ============================================================ */

async function loadSuppliers() {

  const data =
    await call(
      "apiSuppliers"
    );


  state.suppliers =
    Array.isArray(
      data
    )
      ? data
      : [];


  renderSuppliers(
    state.suppliers
  );

}


/* ============================================================
   LEDGER
   ============================================================ */

async function loadLedger() {

  // Load independent data in parallel so the Ledger page opens faster.
  const requests = [];
  if (!state.customers.length) requests.push(loadCustomers());
  requests.push(call("apiLedger"));

  const results = await Promise.all(requests);
  const data = results[results.length - 1];

  state.ledger =
    Array.isArray(data)
      ? data
      : [];

  renderLedger(state.ledger);
}


/* ============================================================
   SALES
   ============================================================ */

async function loadSales() {

  /*
   * Sales sheet is read directly through
   * the generic backend route.
   */

  const data =
    await call(
      "sales"
    );


  state.sales =
    Array.isArray(
      data
    )
      ? data
      : [];


  renderSales(
    state.sales
  );

}


/* ============================================================
   SALESPERSONS
   ============================================================ */

async function loadSalespersons() {

  const data = await call("salespersons");
  state.salespersons = Array.isArray(data) ? data : [];
  return state.salespersons;

}

async function quickAddSalesperson() {

  const name = prompt("New salesperson's name:");
  if (!name || !name.trim()) return null;

  try {
    const result = await call("salesperson", { name: name.trim() });
    await loadSalespersons();
    showToast("Salesperson added: " + name);
    return result.salespersonId;
  } catch (error) {
    showError(error.message);
    return null;
  }

}

// Adds a salesperson via prompt, then updates the open Sale form's
// dropdown in place (without losing any line items already entered).
async function handleQuickAddSalesperson() {

  const newId = await quickAddSalesperson();
  if (!newId) return;

  const select = document.getElementById("salespersonSelect");
  if (!select) return;

  select.innerHTML = '<option value="">Unassigned</option>' +
    state.salespersons.map(function (sp) {
      return '<option value="' + sp.SalespersonID + '">' + escapeHtml(sp.Name) + '</option>';
    }).join("");

  select.value = newId;

}


/* ============================================================
   INCENTIVE REPORT
   ============================================================ */

async function loadIncentiveReport(dateFrom, dateTo, ratePercent) {

  if (!state.salespersons.length) await loadSalespersons();

  const payload = {};
  if (dateFrom) payload.dateFrom = dateFrom;
  if (dateTo) payload.dateTo = dateTo;
  if (ratePercent !== undefined && ratePercent !== "") payload.ratePercent = ratePercent;

  const data = await call("incentivereport", payload);
  renderIncentiveReport(data);

}


/* ============================================================
   PURCHASES
   ============================================================ */

async function loadPurchases() {

  const data =
    await call(
      "purchases"
    );


  state.purchases =
    Array.isArray(
      data
    )
      ? data
      : [];


  renderPurchases(
    state.purchases
  );

}


/* ============================================================
   PAYMENTS
   ============================================================ */

async function loadPayments() {

  const data =
    await call(
      "payments"
    );


  state.payments =
    Array.isArray(
      data
    )
      ? data
      : [];


  renderPayments(
    state.payments
  );

}


/* ============================================================
   EXPENSES
   ============================================================ */

async function loadExpenses() {

  const data =
    await call(
      "expenses"
    );


  state.expenses =
    Array.isArray(
      data
    )
      ? data
      : [];


  renderExpenses(
    state.expenses
  );

}


/* ============================================================
   DASHBOARD RENDER
   ============================================================ */

function renderDashboard(
  data
) {
  const d = data || {};
  const lowStock = Array.isArray(d.lowStock) ? d.lowStock : [];
  const recentSales = Array.isArray(d.recentSales) ? d.recentSales : [];
  const recentPurchases = Array.isArray(d.recentPurchases) ? d.recentPurchases : [];

  const saleValues = recentSales.map(s => Number(s.total) || 0);
  const maxSale = Math.max(...saleValues, 1);
  const salesTotal = saleValues.reduce((a,b) => a + b, 0);
  const avgSale = recentSales.length ? salesTotal / recentSales.length : 0;
  const collection = Number(d.todaysSales) || 0;
  const receivable = Number(d.receivable) || 0;
  const payable = Number(d.payable) || 0;

  contentElement().innerHTML = `
    <div class="content dashboard-page">

      <div class="dashboard-hero">
        <div>
          <div class="eyebrow">ARHAM ELECTRONICS • BUSINESS OVERVIEW</div>
          <h2>Good business starts with a clear view.</h2>
          <p>Monitor sales, cash flow, outstanding balances and stock from one place.</p>
        </div>
        <div class="hero-actions">
          <button class="btn secondary" onclick="showPage('customers')">Customers</button>
          <button class="btn primary" onclick="openSaleForm()">＋ New Sale</button>
        </div>
      </div>

      <div class="dashboard-metrics">
        <div class="metric-card metric-sales">
          <div class="metric-icon">↗</div>
          <div><span>Today's Sales</span><strong>${money(d.todaysSales)}</strong><small>Live sales total</small></div>
        </div>
        <div class="metric-card">
          <div class="metric-icon blue">▣</div>
          <div><span>Monthly Sales</span><strong>${money(d.monthlySales)}</strong><small>Current month</small></div>
        </div>
        <div class="metric-card metric-receivable">
          <div class="metric-icon orange">₨</div>
          <div><span>Customer Outstanding</span><strong>${money(d.receivable)}</strong><small>Amount to collect</small></div>
        </div>
        <div class="metric-card metric-payable">
          <div class="metric-icon red">−</div>
          <div><span>Supplier Payable</span><strong>${money(d.payable)}</strong><small>Amount to pay</small></div>
        </div>
      </div>

      <div class="dashboard-main-grid">
        <div class="panel sales-panel">
          <div class="panel-header dashboard-panel-head">
            <div><span class="panel-kicker">SALES ACTIVITY</span><h3>Recent sales performance</h3></div>
            <button class="mini-link" onclick="showPage('sales')">View all →</button>
          </div>
          <div class="sales-summary">
            <div><span>Recent sales</span><b>${formatNumber(recentSales.length)}</b></div>
            <div><span>Average invoice</span><b>${money(avgSale)}</b></div>
            <div><span>Today's volume</span><b>${money(collection)}</b></div>
          </div>
          <div class="sale-bars">
            ${recentSales.slice(0,8).map(function(s, i) {
              const value = Number(s.total) || 0;
              const height = Math.max(12, Math.round((value / maxSale) * 100));
              return `<div class="sale-bar-item" title="${escapeHtml(s.no || 'Sale')} — ${money(value)}">
                <div class="sale-bar-value">${money(value)}</div>
                <div class="sale-bar-track"><i style="height:${height}%"></i></div>
                <small>${escapeHtml((s.no || 'Sale').toString().slice(-8))}</small>
              </div>`;
            }).join('')}
            ${recentSales.length === 0 ? '<div class="empty">No sales available for the activity view.</div>' : ''}
          </div>
        </div>

        <div class="panel outstanding-panel">
          <div class="panel-header dashboard-panel-head">
            <div><span class="panel-kicker">CASH FLOW</span><h3>Outstanding overview</h3></div>
            <button class="mini-link" onclick="showPage('ledger')">Ledger →</button>
          </div>
          <div class="outstanding-visual">
            <div class="outstanding-ring">
              <div><strong>${money(receivable)}</strong><span>receivable</span></div>
            </div>
            <div class="outstanding-list">
              <div><span><i class="dot orange"></i>Customer receivable</span><b>${money(receivable)}</b></div>
              <div><span><i class="dot red"></i>Supplier payable</span><b>${money(payable)}</b></div>
              <div><span><i class="dot blue"></i>Today's sales</span><b>${money(collection)}</b></div>
            </div>
          </div>
          <div class="outstanding-note">Focus on collections to keep your cash flow healthy.</div>
        </div>
      </div>

      <div class="dashboard-bottom-grid">
        <div class="panel">
          <div class="panel-header dashboard-panel-head">
            <div><span class="panel-kicker">INVENTORY</span><h3>Low stock alerts</h3></div>
            <button class="mini-link" onclick="showPage('stock')">Stock →</button>
          </div>
          ${lowStock.length === 0
            ? '<div class="success-empty">✓ All products are above reorder level.</div>'
            : `<div class="alert-list">${lowStock.slice(0,6).map(function(p){
                const stock = Number(p.stock)||0, min = Number(p.min)||0;
                const pct = min ? Math.min(100, Math.round(stock/min*100)) : 100;
                return `<div class="alert-row"><div><b>${escapeHtml(p.description)}</b><small>${formatNumber(stock)} units left • minimum ${formatNumber(min)}</small></div><div class="stock-meter"><i style="width:${pct}%"></i></div></div>`;
              }).join('')}</div>`}
        </div>

        <div class="panel">
          <div class="panel-header dashboard-panel-head">
            <div><span class="panel-kicker">LATEST TRANSACTIONS</span><h3>Recent sales</h3></div>
            <button class="mini-link" onclick="showPage('sales')">Sales →</button>
          </div>
          ${recentSales.length === 0
            ? '<div class="empty">No sales recorded yet.</div>'
            : `<div class="transaction-list">${recentSales.slice(0,5).map(function(s){
                return `<div class="transaction-row"><div class="invoice-icon">↗</div><div class="transaction-info"><b>${escapeHtml(s.no)}</b><span>${escapeHtml(s.customer)} • ${escapeHtml(formatDate(s.date))}</span></div><strong>${money(s.total)}</strong></div>`;
              }).join('')}</div>`}
        </div>
      </div>

      <div class="dashboard-strip">
        <div><span>Products</span><b>${formatNumber(d.productCount)}</b></div>
        <div><span>Stock Value</span><b>${money(d.stockValue)}</b></div>
        <div><span>Purchases</span><b>${money(d.monthlyPurchases)}</b></div>
        <div><span>Low Stock</span><b>${formatNumber(d.lowStockCount)}</b></div>
      </div>
    </div>
  `;
}


/* ============================================================
   STAT CARD (dashboard)
   ============================================================ */
function statCard(label, value, sub, tone) {
  const toneClass = tone ? " stat-" + tone : "";
  return `
    <div class="stat-card${toneClass}">
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-value">${escapeHtml(value)}</div>
      ${sub ? '<div class="stat-sub">' + escapeHtml(sub) + '</div>' : ''}
    </div>
  `;
}


/* ============================================================
   CARD
   ============================================================ */

function card(
  title,
  value
) {

  return `

    <div class="card">

      <div class="card-title">
        ${escapeHtml(title)}
      </div>

      <div class="card-value">
        ${escapeHtml(value)}
      </div>

    </div>

  `;

}


/* ============================================================
   PRODUCTS RENDER
   ============================================================ */

function renderProducts(
  rows
) {

  const columns = [

    "Description",
    "Code",
    "Brand",
    "Category",
    "Unit",
    "CurrentStock",
    "PurchasePrice",
    "SalePrice",
    "MinStock",
    "Location"

  ];


  contentElement().innerHTML = `

    <div class="content">

      ${toolbar(
        "Products",
        "productSearch",
        "Search product..."
      )}

      <div id="productTable"></div>

    </div>

  `;


  renderSearchableTable(
    rows,
    columns,
    "productSearch",
    "productTable"
  );

}


/* ============================================================
   STOCK RENDER
   ============================================================ */

function renderStock(
  rows
) {

  const columns = [

    "MovementID",
    "ProductID",
    "Date",
    "Type",
    "Qty",
    "Note",
    "BalanceAfter",
    "SourceSheet"

  ];


  contentElement().innerHTML = `

    <div class="content">

      ${toolbar(
        "Stock Movements",
        "stockSearch",
        "Search stock..."
      )}

      <div id="stockTable"></div>

    </div>

  `;


  renderSearchableTable(
    rows,
    columns,
    "stockSearch",
    "stockTable"
  );

}


/* ============================================================
   CUSTOMERS RENDER
   ============================================================ */

function partyLedgerSelector(partyType, rows) {
  const isCustomer = partyType === "customer";
  const idField = isCustomer ? "CustomerID" : "SupplierID";
  const label = isCustomer ? "Customer" : "Supplier";
  const selectId = isCustomer ? "customerLedgerSelect" : "supplierLedgerSelect";
  const safeRows = Array.isArray(rows) ? rows : [];
  const options = safeRows.map(function(row) {
    const id = row[idField] ?? row.ID ?? row.Id ?? "";
    const name = row.Name || id;
    return '<option value="' + escapeHtml(String(id)) + '">' + escapeHtml(String(name)) + '</option>';
  }).join("");
  return '<div class="party-ledger-tools">' +
    '<div class="party-ledger-picker"><label for="' + selectId + '">' + label + ' Ledger</label>' +
    '<select id="' + selectId + '"><option value="">Select ' + label.toLowerCase() + '...</option>' + options + '</select></div>' +
    '<button class="btn secondary" type="button" onclick="openSelectedPartyLedger(\\'' + partyType + '\\')">View Ledger</button>' +
    '</div>';
}

function openSelectedPartyLedger(partyType) {
  const id = partyType === "customer" ? $("customerLedgerSelect")?.value : $("supplierLedgerSelect")?.value;
  if (!id) {
    showError("Please select a " + (partyType === "customer" ? "customer" : "supplier") + " first.");
    return;
  }
  openPartyLedger(partyType, id);
}

async function openPartyLedger(partyType, partyId) {
  window._ledgerPartyType = partyType;
  window._ledgerSelectedPartyId = String(partyId || "");
  window._ledgerSelectedCustomerId = partyType === "customer" ? String(partyId || "") : "";
  window._ledgerFrom = "";
  window._ledgerTo = "";
  try {
    showToast("Loading account ledger...");
    const data = await call("ledger", { partyType: partyType, partyId: partyId });
    state.ledger = Array.isArray(data) ? data : [];
    renderLedger(state.ledger);
  } catch (error) {
    showError(error.message || "Could not load account ledger.");
  }
}

function renderCustomers(rows) {
  const columns = ["CustomerID","Name","Phone","WhatsApp","Email","Address","CreditLimit","OpeningBalance","ClosingBalance","TotalDebit","TotalCredit"];
  contentElement().innerHTML =
    '<div class="content">' +
    toolbar("Customers","customerSearch","Search customer...") +
    partyLedgerSelector("customer", rows) +
    '<div id="customerTable"></div>' +
    '</div>';
  renderSearchableTable(rows, columns, "customerSearch", "customerTable", "customer");
}

function renderSuppliers(rows) {
  const columns = ["SupplierID","Name","Phone","Email","Address","OpeningBalance","ClosingBalance","TotalDebit","TotalCredit"];
  contentElement().innerHTML =
    '<div class="content">' +
    toolbar("Suppliers","supplierSearch","Search supplier...") +
    partyLedgerSelector("supplier", rows) +
    '<div id="supplierTable"></div>' +
    '</div>';
  renderSearchableTable(rows, columns, "supplierSearch", "supplierTable", "supplier");
}

function renderLedger(rows) {
  const partyType = window._ledgerPartyType || "customer";
  const isSupplier = partyType === "supplier";
  const idField = isSupplier ? "SupplierID" : "CustomerID";
  const partyList = isSupplier ? state.suppliers : state.customers;
  const selectedId = String(window._ledgerSelectedPartyId || "");
  const selectedParty = partyList.find(function(p) {
    return String(p[idField] ?? p.ID ?? p.Id ?? "") === selectedId;
  });
  const partyName = selectedParty ? (selectedParty.Name || selectedParty[idField] || selectedId) : "";
  const label = isSupplier ? "Supplier" : "Customer";
  const selectId = isSupplier ? "ledgerSupplierSelect" : "ledgerCustomerSelect";
  const columns = ["Date","PartyName","PartyType","Particular","Ref","Debit","Credit","Balance","Type"];
  const totalDebit = rows.reduce(function(s,r){ return s + (Number(r.Debit)||0); },0);
  const totalCredit = rows.reduce(function(s,r){ return s + (Number(r.Credit)||0); },0);
  const lastBalance = rows.length ? (Number(rows[rows.length-1].Balance)||0) : 0;
  const from = window._ledgerFrom || "";
  const to = window._ledgerTo || "";
  const options = partyList.map(function(p) {
    const id = p[idField] ?? p.ID ?? p.Id ?? "";
    return '<option value="' + escapeHtml(String(id)) + '"' + (String(id)===selectedId ? ' selected' : '') + '>' +
      escapeHtml(String(p.Name || id)) + '</option>';
  }).join("");

  contentElement().innerHTML =
    '<div class="content ledger-page">' +
      '<div class="toolbar ledger-toolbar"><div><h2>' + label + ' Ledger</h2><p>Select ' + label.toLowerCase() + ' and the duration for the account statement.</p></div>' +
      '<div class="ledger-actions"><button class="btn secondary" type="button" onclick="showPage(\'' + (isSupplier ? "suppliers" : "customers") + '\')">Back</button>' +
      '<button class="btn primary" type="button" onclick="printPartyLedger()">Print A4</button></div></div>' +
      '<div class="panel ledger-selector-panel"><div class="ledger-selector-head"><div><span class="panel-kicker">ACCOUNT STATEMENT</span><h3>' + label + ' & Duration</h3></div><span class="ledger-selection-hint">Choose account and print period</span></div>' +
      '<div class="ledger-filter-grid"><label>' + label + '<select id="' + selectId + '"><option value="">Select ' + label.toLowerCase() + '...</option>' + options + '</select></label>' +
      '<label>From Date<input id="ledgerFromDate" type="date" value="' + escapeHtml(from) + '"></label>' +
      '<label>To Date<input id="ledgerToDate" type="date" value="' + escapeHtml(to) + '"></label>' +
      '<div class="ledger-filter-button"><button class="btn primary" type="button" onclick="loadSelectedPartyLedger()">View Ledger</button></div></div>' +
      '<div class="ledger-period-note">Leave both dates empty for the complete ' + label.toLowerCase() + ' history.</div></div>' +
      (selectedParty ? '<div class="ledger-summary-grid"><div class="ledger-summary-card"><span>' + label + '</span><strong>' + escapeHtml(partyName) + '</strong><small>' + escapeHtml(selectedId) + '</small></div>' +
        '<div class="ledger-summary-card"><span>Period</span><strong>' + escapeHtml(from||"Start") + ' → ' + escapeHtml(to||"Today") + '</strong><small>Statement duration</small></div>' +
        '<div class="ledger-summary-card"><span>Total Debit</span><strong>' + money(totalDebit) + '</strong><small>Charges / purchases</small></div>' +
        '<div class="ledger-summary-card outstanding"><span>Current Balance</span><strong>' + money(lastBalance) + '</strong><small>Latest balance</small></div></div>' +
        '<div class="panel ledger-table-panel" id="partyLedgerPrintArea"><div class="print-ledger-header"><div><div class="print-company">ARHAM ELECTRONICS</div><h2>' + label + ' Ledger</h2><p>' + escapeHtml(partyName) + ' • ' + escapeHtml(from||"Start") + ' to ' + escapeHtml(to||"Today") + '</p></div><div class="print-date">Printed: ' + escapeHtml(formatDate(new Date())) + '</div></div><div id="ledgerTable"></div></div>' :
        '<div class="panel ledger-empty-state"><div class="ledger-empty-icon">▤</div><h3>Select a ' + label.toLowerCase() + '</h3><p>Choose the account, set the duration, then click <b>View Ledger</b>.</p></div>') +
    '</div>';
  if (selectedParty) renderSearchableTable(rows, columns, "", "ledgerTable");
}

async function loadSelectedPartyLedger() {
  const partyType = window._ledgerPartyType || "customer";
  const select = document.getElementById(partyType === "supplier" ? "ledgerSupplierSelect" : "ledgerCustomerSelect");
  if (!select || !select.value) { showError("Please select a " + (partyType === "supplier" ? "supplier" : "customer") + " first."); return; }
  const from = document.getElementById("ledgerFromDate")?.value || "";
  const to = document.getElementById("ledgerToDate")?.value || "";
  if (from && to && from > to) { showError("From Date cannot be after To Date."); return; }
  window._ledgerSelectedPartyId = select.value;
  window._ledgerSelectedCustomerId = partyType === "customer" ? select.value : "";
  window._ledgerFrom = from;
  window._ledgerTo = to;
  try {
    showToast("Loading " + partyType + " ledger...");
    const payload = { partyType: partyType, partyId: select.value };
    if (from) payload.fromDate = from;
    if (to) payload.toDate = to;
    const allRows = await call("ledger", payload);
    const rows = (Array.isArray(allRows) ? allRows : []).filter(function(row) {
      if (!from && !to) return true;
      const raw = row.Date;
      if (!raw) return false;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      const day = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      return (!from || day >= from) && (!to || day <= to);
    });
    state.ledger = rows;
    renderLedger(rows);
    if (!rows.length) showToast("No ledger transactions found for this period.");
  } catch (error) { showError(error.message || "Could not load account ledger."); }
}

function printPartyLedger() {
  const partyType = window._ledgerPartyType || "customer";
  const isSupplier = partyType === "supplier";
  const idField = isSupplier ? "SupplierID" : "CustomerID";
  const partyList = isSupplier ? state.suppliers : state.customers;
  const partyId = String(window._ledgerSelectedPartyId || "");
  const party = partyList.find(function(p){ return String(p[idField] ?? p.ID ?? p.Id ?? "") === partyId; });
  if (!party) { showError("Please select and load the account ledger first."); return; }
  const rows = Array.isArray(state.ledger) ? state.ledger : [];
  const label = isSupplier ? "Supplier" : "Customer";
  const name = party.Name || party[idField] || label;
  const from = window._ledgerFrom || "", to = window._ledgerTo || "";
  const totalDebit = rows.reduce(function(s,r){return s+(Number(r.Debit)||0);},0);
  const totalCredit = rows.reduce(function(s,r){return s+(Number(r.Credit)||0);},0);
  const balance = rows.length ? (Number(rows[rows.length-1].Balance)||0) : 0;
  const body = rows.length ? rows.map(function(r){return '<tr><td>'+escapeHtml(formatDate(r.Date))+'</td><td>'+escapeHtml(r.Particular||"")+'</td><td>'+escapeHtml(r.Ref||"")+'</td><td class="num">'+money(r.Debit)+'</td><td class="num">'+money(r.Credit)+'</td><td class="num">'+money(r.Balance)+'</td></tr>';}).join("") : '<tr><td colspan="6" class="empty">No transactions found for this period.</td></tr>';
  const w = window.open("","_blank","width=1000,height=800");
  if (!w) { showError("Please allow pop-ups in your browser to print the ledger."); return; }
  w.document.write('<!DOCTYPE html><html><head><title>'+escapeHtml(label+' Ledger - '+name)+'</title><style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#172033;font-size:11px}.header{display:flex;justify-content:space-between;border-bottom:2px solid #172033;padding-bottom:10px;margin-bottom:12px}.company{font-size:20px;font-weight:800;letter-spacing:1px}.title{font-size:16px;font-weight:700;margin-top:3px}.meta{text-align:right;color:#64748b;font-size:10px;line-height:1.6}.boxrow{display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-bottom:12px}.box{border:1px solid #d9e0e8;border-radius:5px;padding:8px}.label{color:#64748b;font-size:8px;text-transform:uppercase;font-weight:700}.value{margin-top:3px;font-weight:700;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#eef2f7;border:1px solid #d9e0e8;padding:7px 6px;text-align:left;font-size:8px;text-transform:uppercase}td{border:1px solid #e1e6ed;padding:6px;font-size:9.5px}.num{text-align:right;white-space:nowrap}tfoot td{background:#f7f9fc;font-weight:700}.footer{margin-top:14px;display:flex;justify-content:space-between;border-top:1px solid #d9e0e8;padding-top:8px;font-size:9px;color:#64748b}tr{page-break-inside:avoid}</style></head><body><div class="header"><div><div class="company">ARHAM ELECTRONICS</div><div class="title">'+label+' Ledger</div></div><div class="meta">'+label+' ID: '+escapeHtml(partyId)+'<br>Period: '+escapeHtml(from||"Start")+' to '+escapeHtml(to||"Today")+'<br>Printed: '+escapeHtml(formatDate(new Date()))+'</div></div><div class="boxrow"><div class="box"><div class="label">'+label+'</div><div class="value">'+escapeHtml(name)+'</div></div><div class="box"><div class="label">Total Debit</div><div class="value">'+money(totalDebit)+'</div></div><div class="box"><div class="label">Total Credit</div><div class="value">'+money(totalCredit)+'</div></div></div><table><thead><tr><th>Date</th><th>Particular</th><th>Reference</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead><tbody>'+body+'</tbody><tfoot><tr><td colspan="3">CURRENT BALANCE</td><td class="num">'+money(totalDebit)+'</td><td class="num">'+money(totalCredit)+'</td><td class="num">'+money(balance)+'</td></tr></tfoot></table><div class="footer"><span>Arham Electronics ERP</span><span>'+label+' account statement</span></div></body></html>');
  w.document.close(); w.focus(); setTimeout(function(){w.print();},350);
}

/* ============================================================
   NEW SALE FORM
   ============================================================ */

async function openSaleForm() {

  // Load required data once. Do NOT recursively call openSaleForm().
  // An empty salesperson list is valid because salesperson is optional.
  try {

    // These three datasets are independent, so fetch them together.
    // This removes the previous sequential wait from the New Sale screen.
    const requests = [];

    if (!state.customers.length) requests.push(loadCustomers());
    if (!state.products.length) requests.push(loadProducts());

    if (!state.salespersons.length) {
      requests.push(
        loadSalespersons().catch(function (error) {
          console.warn("Salespersons could not be loaded:", error);
          state.salespersons = [];
          return [];
        })
      );
    }

    if (requests.length) {
      showToast("Loading sale data...");
      await Promise.all(requests);
    }

  } catch (error) {
    showError(error.message || "Could not load sale data.");
    return;
  }

  // A sale cannot be created without these required master records.
  if (!state.customers.length) {
    showError("No customers found. Please add a customer first.");
    return;
  }

  if (!state.products.length) {
    showError("No products found. Please add a product first.");
    return;
  }

  const customerOptions =
    state.customers
      .map(
        function (customer) {

          return `

            <option value="${escapeHtml(
              customer.CustomerID
            )}">

              ${escapeHtml(
                customer.Name ||
                customer.CustomerID
              )}

            </option>

          `;

        }
      )
      .join("");


  const productOptions =
    state.products
      .map(
        function (product) {

          return `

            <option
              value="${escapeHtml(
                product.ProductID
              )}"
            >

              ${escapeHtml(
                (product.Description || product.ProductID) +
                (product.Code ? ' (' + product.Code + ')' : '')
              )}

            </option>

          `;

        }
      )
      .join("");


  const salespersonOptions =
    state.salespersons
      .map(function (sp) {
        return `<option value="${escapeHtml(sp.SalespersonID)}">${escapeHtml(sp.Name)}</option>`;
      })
      .join("");


  contentElement().innerHTML = `

    <div class="content">

      <div class="panel">

        <div class="panel-header">

          <h2>New Sale</h2>

          <button
            class="btn secondary"
            onclick="showPage('sales')"
          >
            Cancel
          </button>

        </div>


        <form
          id="saleForm"
          class="erp-form"
        >

          <div class="form-grid">

            <label>

              Customer

              <select
                name="customerId"
                required
              >

                <option value="">
                  Select customer
                </option>

                ${customerOptions}

              </select>

            </label>


            <label>

              Salesperson

              <div style="display:flex;gap:6px;">
                <select name="salespersonId" id="salespersonSelect" style="flex:1;">
                  <option value="">Unassigned</option>
                  ${salespersonOptions}
                </select>
                <button type="button" class="btn secondary" onclick="handleQuickAddSalesperson()" title="Add new salesperson">+</button>
              </div>

            </label>


            <label>

              Invoice No

              <input
                name="invoiceNo"
                placeholder="Auto"
              >

            </label>


            <label>

              Date

              <input
                type="date"
                name="date"
                value="${todayInput()}"
                required
              >

            </label>


            <label>

              Discount

              <input
                type="number"
                name="discount"
                min="0"
                step="0.01"
                value="0"
              >

            </label>


            <label>

              Paid

              <input
                type="number"
                name="paid"
                min="0"
                step="0.01"
                value="0"
              >

            </label>


            <label>

              Payment Method

              <select
                name="paymentMethod"
              >

                <option value="cash">
                  Cash
                </option>

                <option value="bank">
                  Bank
                </option>

                <option value="online">
                  Online
                </option>

                <option value="other">
                  Other
                </option>

              </select>

            </label>

          </div>


          <h3>Items</h3>


          <div
            id="saleItems"
            class="items-box"
          >

            ${saleItemRow(
              productOptions
            )}

          </div>


          <button
            type="button"
            class="btn secondary"
            onclick="addSaleItemRow()"
          >
            + Add Item
          </button>


          <label>

            Notes

            <textarea
              name="notes"
              rows="3"
            ></textarea>

          </label>


          <div class="form-actions">

            <button
              type="submit"
              class="btn primary"
            >
              Save Sale
            </button>

          </div>

        </form>

      </div>

    </div>

  `;


  $("saleForm")
    .addEventListener(
      "submit",
      submitSale
    );

}


/* ============================================================
   SALE ITEM ROW
   ============================================================ */

function saleItemRow(
  productOptions
) {

  return `

    <div class="item-row">

      <select
        name="productId"
        required
      >

        <option value="">
          Product
        </option>

        ${productOptions}

      </select>


      <input
        type="number"
        name="qty"
        min="0.01"
        step="0.01"
        placeholder="Qty"
        required
      >


      <input
        type="number"
        name="unitPrice"
        min="0"
        step="0.01"
        placeholder="Price"
      >


      <input
        type="number"
        name="discount"
        min="0"
        step="0.01"
        placeholder="Discount"
        value="0"
      >


      <button
        type="button"
        class="btn danger"
        onclick="this.parentElement.remove()"
      >
        Remove
      </button>

    </div>

  `;

}


/* ============================================================
   ADD SALE ITEM
   ============================================================ */

function addSaleItemRow() {

  const products =
    state.products;


  const options =
    products
      .map(
        function (product) {

          return `

            <option
              value="${escapeHtml(
                product.ProductID
              )}"
            >

              ${escapeHtml(
                (product.Description || product.ProductID) +
                (product.Code ? ' (' + product.Code + ')' : '')
              )}

            </option>

          `;

        }
      )
      .join("");


  const box =
    $("saleItems");


  if (!box) {

    return;

  }


  box.insertAdjacentHTML(
    "beforeend",
    saleItemRow(
      options
    )
  );

}


/* ============================================================
   SUBMIT SALE
   ============================================================ */

async function submitSale(
  event
) {

  event.preventDefault();


  const form =
    event.currentTarget;


  try {

    showToast(
      "Saving sale..."
    );


    const customerId =
      form.customerId.value;


    const items =
      Array.from(
        form.querySelectorAll(
          ".item-row"
        )
      )
      .map(
        function (row) {

          return {

            productId:
              row.querySelector(
                '[name="productId"]'
              ).value,

            qty:
              Number(
                row.querySelector(
                  '[name="qty"]'
                ).value
              ),

            unitPrice:
              Number(
                row.querySelector(
                  '[name="unitPrice"]'
                ).value
              ) || undefined,

            discount:
              Number(
                row.querySelector(
                  '[name="discount"]'
                ).value
              ) || 0

          };

        }
      );


    const payload = {

      customerId:
        customerId,

      salespersonId:
        form.salespersonId.value || '',

      invoiceNo:
        form.invoiceNo.value.trim(),

      date:
        form.date.value,

      discount:
        Number(
          form.discount.value
        ) || 0,

      paid:
        Number(
          form.paid.value
        ) || 0,

      paymentMethod:
        form.paymentMethod.value,

      notes:
        form.notes.value.trim(),

      items:
        items

    };


    const result =
      await call(
        "apiSale",
        payload
      );


    showToast(
      "Sale saved: " +
      result.invoiceNo
    );


    showPage(
      "sales"
    );

  } catch (error) {

    showError(
      error.message
    );

  }

}


/* ============================================================
   NEW PURCHASE FORM
   ============================================================ */

function openPurchaseForm() {

  if (
    !state.suppliers.length
  ) {

    loadSuppliers()
      .then(
        function () {

          openPurchaseForm();

        }
      )
      .catch(
        function (error) {

          showError(
            error.message
          );

        }
      );

    return;

  }


  if (
    !state.products.length
  ) {

    loadProducts()
      .then(
        function () {

          openPurchaseForm();

        }
      )
      .catch(
        function (error) {

          showError(
            error.message
          );

        }
      );

    return;

  }


  const supplierOptions =
    state.suppliers
      .map(
        function (supplier) {

          return `

            <option value="${escapeHtml(
              supplier.SupplierID
            )}">

              ${escapeHtml(
                supplier.Name ||
                supplier.SupplierID
              )}

            </option>

          `;

        }
      )
      .join("");


  const productOptions =
    state.products
      .map(
        function (product) {

          return `

            <option
              value="${escapeHtml(
                product.ProductID
              )}"
            >

              ${escapeHtml(
                (product.Description || product.ProductID) +
                (product.Code ? ' (' + product.Code + ')' : '')
              )}

            </option>

          `;

        }
      )
      .join("");


  contentElement().innerHTML = `

    <div class="content">

      <div class="panel">

        <div class="panel-header">

          <h2>New Purchase</h2>

          <button
            class="btn secondary"
            onclick="showPage('purchases')"
          >
            Cancel
          </button>

        </div>


        <form
          id="purchaseForm"
          class="erp-form"
        >

          <div class="form-grid">

            <label>

              Supplier

              <select
                name="supplierId"
                required
              >

                <option value="">
                  Select supplier
                </option>

                ${supplierOptions}

              </select>

            </label>


            <label>

              Reference No

              <input
                name="referenceNo"
                placeholder="Reference"
              >

            </label>


            <label>

              Date

              <input
                type="date"
                name="date"
                value="${todayInput()}"
                required
              >

            </label>


            <label>

              Discount

              <input
                type="number"
                name="discount"
                min="0"
                step="0.01"
                value="0"
              >

            </label>


            <label>

              Paid

              <input
                type="number"
                name="paid"
                min="0"
                step="0.01"
                value="0"
              >

            </label>


            <label>

              Payment Method

              <select
                name="paymentMethod"
              >

                <option value="cash">
                  Cash
                </option>

                <option value="bank">
                  Bank
                </option>

                <option value="online">
                  Online
                </option>

                <option value="other">
                  Other
                </option>

              </select>

            </label>

          </div>


          <h3>Items</h3>


          <div
            id="purchaseItems"
            class="items-box"
          >

            ${purchaseItemRow(
              productOptions
            )}

          </div>


          <button
            type="button"
            class="btn secondary"
            onclick="addPurchaseItemRow()"
          >
            + Add Item
          </button>


          <label>

            Notes

            <textarea
              name="notes"
              rows="3"
            ></textarea>

          </label>


          <div class="form-actions">

            <button
              type="submit"
              class="btn primary"
            >
              Save Purchase
            </button>

          </div>

        </form>

      </div>

    </div>

  `;


  $("purchaseForm")
    .addEventListener(
      "submit",
      submitPurchase
    );

}


/* ============================================================
   PURCHASE ITEM ROW
   ============================================================ */

function purchaseItemRow(
  productOptions
) {

  return `

    <div class="item-row">

      <select
        name="productId"
        required
      >

        <option value="">
          Product
        </option>

        ${productOptions}

      </select>


      <input
        type="number"
        name="qty"
        min="0.01"
        step="0.01"
        placeholder="Qty"
        required
      >


      <input
        type="number"
        name="unitCost"
        min="0"
        step="0.01"
        placeholder="Unit Cost"
        required
      >


      <input
        type="number"
        name="discount"
        min="0"
        step="0.01"
        placeholder="Discount"
        value="0"
      >


      <button
        type="button"
        class="btn danger"
        onclick="this.parentElement.remove()"
      >
        Remove
      </button>

    </div>

  `;

}


/* ============================================================
   ADD PURCHASE ITEM
   ============================================================ */

function addPurchaseItemRow() {

  const options =
    state.products
      .map(
        function (product) {

          return `

            <option
              value="${escapeHtml(
                product.ProductID
              )}"
            >

              ${escapeHtml(
                (product.Description || product.ProductID) +
                (product.Code ? ' (' + product.Code + ')' : '')
              )}

            </option>

          `;

        }
      )
      .join("");


  const box =
    $("purchaseItems");


  if (!box) {

    return;

  }


  box.insertAdjacentHTML(
    "beforeend",
    purchaseItemRow(
      options
    )
  );

}


/* ============================================================
   SUBMIT PURCHASE
   ============================================================ */

async function submitPurchase(
  event
) {

  event.preventDefault();


  const form =
    event.currentTarget;


  try {

    showToast(
      "Saving purchase..."
    );


    const items =
      Array.from(
        form.querySelectorAll(
          ".item-row"
        )
      )
      .map(
        function (row) {

          return {

            productId:
              row.querySelector(
                '[name="productId"]'
              ).value,

            qty:
              Number(
                row.querySelector(
                  '[name="qty"]'
                ).value
              ),

            unitCost:
              Number(
                row.querySelector(
                  '[name="unitCost"]'
                ).value
              ),

            discount:
              Number(
                row.querySelector(
                  '[name="discount"]'
                ).value
              ) || 0

          };

        }
      );


    const payload = {

      supplierId:
        form.supplierId.value,

      referenceNo:
        form.referenceNo.value.trim(),

      date:
        form.date.value,

      discount:
        Number(
          form.discount.value
        ) || 0,

      paid:
        Number(
          form.paid.value
        ) || 0,

      paymentMethod:
        form.paymentMethod.value,

      notes:
        form.notes.value.trim(),

      items:
        items

    };


    const result =
      await call(
        "apiPurchase",
        payload
      );


    showToast(
      "Purchase saved: " +
      result.referenceNo
    );


    showPage(
      "purchases"
    );

  } catch (error) {

    showError(
      error.message
    );

  }

}


/* ============================================================
   PAYMENT FORM
   ============================================================ */

function openPaymentForm() {

  if (
    !state.customers.length
  ) {

    loadCustomers()
      .catch(
        function (error) {

          showError(
            error.message
          );

        }
      );

  }


  contentElement().innerHTML = `

    <div class="content">

      <div class="panel">

        <div class="panel-header">

          <h2>New Payment</h2>

          <button
            class="btn secondary"
            onclick="showPage('payments')"
          >
            Cancel
          </button>

        </div>


        <form
          id="paymentForm"
          class="erp-form"
        >

          <div class="form-grid">

            <label>

              Party Type

              <select
                name="partyType"
                id="paymentPartyType"
              >

                <option value="customer">
                  Customer
                </option>

                <option value="supplier">
                  Supplier
                </option>

              </select>

            </label>


            <label>

              Party

              <select
                name="partyId"
                id="paymentPartyId"
                required
              >

              </select>

            </label>


            <label>

              Date

              <input
                type="date"
                name="date"
                value="${todayInput()}"
                required
              >

            </label>


            <label>

              Amount

              <input
                type="number"
                name="amount"
                min="0.01"
                step="0.01"
                required
              >

            </label>


            <label>

              Method

              <select
                name="method"
              >

                <option value="cash">
                  Cash
                </option>

                <option value="bank">
                  Bank
                </option>

                <option value="online">
                  Online
                </option>

                <option value="other">
                  Other
                </option>

              </select>

            </label>


            <label>

              Reference

              <input
                name="reference"
              >

            </label>

          </div>


          <label>

            Notes

            <textarea
              name="notes"
              rows="3"
            ></textarea>

          </label>


          <div class="form-actions">

            <button
              type="submit"
              class="btn primary"
            >
              Save Payment
            </button>

          </div>

        </form>

      </div>

    </div>

  `;


  populatePaymentParties();


  $("paymentPartyType")
    .addEventListener(
      "change",
      populatePaymentParties
    );


  $("paymentForm")
    .addEventListener(
      "submit",
      submitPayment
    );

}


/* ============================================================
   PAYMENT PARTY LIST
   ============================================================ */

function populatePaymentParties() {

  const type =
    $("paymentPartyType")
      ? $("paymentPartyType").value
      : "customer";


  const select =
    $("paymentPartyId");


  if (!select) {

    return;

  }


  const rows =
    type === "customer"
      ? state.customers
      : state.suppliers;


  select.innerHTML =
    `<option value="">
      Select party
    </option>` +
    rows
      .map(
        function (row) {

          const id =
            type === "customer"
              ? row.CustomerID
              : row.SupplierID;


          return `

            <option
              value="${escapeHtml(
                id
              )}"
            >

              ${escapeHtml(
                row.Name ||
                id
              )}

            </option>

          `;

        }
      )
      .join("");

}


/* ============================================================
   SUBMIT PAYMENT
   ============================================================ */

async function submitPayment(
  event
) {

  event.preventDefault();


  const form =
    event.currentTarget;


  try {

    showToast(
      "Saving payment..."
    );


    const partyType =
      form.partyType.value;


    const payload = {

      partyType:
        partyType,

      partyId:
        form.partyId.value,

      date:
        form.date.value,

      amount:
        Number(
          form.amount.value
        ),

      method:
        form.method.value,

      reference:
        form.reference.value.trim(),

      notes:
        form.notes.value.trim(),

      direction:
        partyType === "customer"
          ? "in"
          : "out"

    };


    const result =
      await call(
        "apiPayment",
        payload
      );


    showToast(
      "Payment saved: " +
      result.paymentId
    );


    showPage(
      "payments"
    );

  } catch (error) {

    showError(
      error.message
    );

  }

}


/* ============================================================
   EXPENSE FORM
   ============================================================ */

function openExpenseForm() {

  contentElement().innerHTML = `

    <div class="content">

      <div class="panel">

        <div class="panel-header">

          <h2>New Expense</h2>

          <button
            class="btn secondary"
            onclick="showPage('expenses')"
          >
            Cancel
          </button>

        </div>


        <form
          id="expenseForm"
          class="erp-form"
        >

          <div class="form-grid">

            <label>

              Date

              <input
                type="date"
                name="date"
                value="${todayInput()}"
                required
              >

            </label>


            <label>

              Category

              <input
                name="category"
                placeholder="General"
              >

            </label>


            <label>

              Amount

              <input
                type="number"
                name="amount"
                min="0.01"
                step="0.01"
                required
              >

            </label>


            <label>

              Payment Method

              <select
                name="paymentMethod"
              >

                <option value="cash">
                  Cash
                </option>

                <option value="bank">
                  Bank
                </option>

                <option value="online">
                  Online
                </option>

                <option value="other">
                  Other
                </option>

              </select>

            </label>

          </div>


          <label>

            Description

            <textarea
              name="description"
              rows="3"
              required
            ></textarea>

          </label>


          <label>

            Notes

            <textarea
              name="notes"
              rows="3"
            ></textarea>

          </label>


          <div class="form-actions">

            <button
              type="submit"
              class="btn primary"
            >
              Save Expense
            </button>

          </div>

        </form>

      </div>

    </div>

  `;


  $("expenseForm")
    .addEventListener(
      "submit",
      submitExpense
    );

}


/* ============================================================
   SUBMIT EXPENSE
   ============================================================ */

async function submitExpense(
  event
) {

  event.preventDefault();


  const form =
    event.currentTarget;


  try {

    showToast(
      "Saving expense..."
    );


    const payload = {

      date:
        form.date.value,

      category:
        form.category.value.trim(),

      description:
        form.description.value.trim(),

      amount:
        Number(
          form.amount.value
        ),

      paymentMethod:
        form.paymentMethod.value,

      notes:
        form.notes.value.trim()

    };


    const result =
      await call(
        "apiExpense",
        payload
      );


    showToast(
      "Expense saved: " +
      result.expenseId
    );


    showPage(
      "expenses"
    );

  } catch (error) {

    showError(
      error.message
    );

  }

}


/* ============================================================
   LOADING
   ============================================================ */

function renderLoading() {

  if (!contentElement()) {

    return;

  }


  contentElement().innerHTML = `

    <div class="content">

      <div class="panel">

        <div class="loading">

          Loading ERP data...

        </div>

      </div>

    </div>

  `;

}


/* ============================================================
   ERROR
   ============================================================ */

function showError(
  message
) {

  console.error(
    message
  );


  const element =
    $("toast");


  if (!element) {

    alert(
      message
    );

    return;

  }


  element.className =
    "toast";


  element.textContent =
    message;


  setTimeout(
    function () {

      element.classList.add(
        "hidden"
      );

    },
    6000
  );

}


/* ============================================================
   TOAST
   ============================================================ */

function showToast(
  message
) {

  const element =
    $("toast");


  if (!element) {

    return;

  }


  element.className =
    "toast";


  element.textContent =
    message;


  setTimeout(
    function () {

      element.classList.add(
        "hidden"
      );

    },
    3500
  );

}


/* ============================================================
   MONEY
   ============================================================ */

function money(
  value
) {

  const number =
    Number(
      value || 0
    );


  return (
    "Rs. " +
    number.toLocaleString(
      "en-PK",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )
  );

}


/* ============================================================
   NUMBER
   ============================================================ */

function formatNumber(
  value
) {

  return Number(
    value || 0
  ).toLocaleString(
    "en-PK",
    {
      maximumFractionDigits: 2
    }
  );

}


/* ============================================================
   DATE
   ============================================================ */

function formatDate(
  value
) {

  if (!value) {

    return "";

  }


  const date =
    new Date(
      value
    );


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return String(
      value
    );

  }


  return date.toLocaleDateString(
    "en-PK",
    {
      year: "numeric",
      month: "short",
      day: "2-digit"
    }
  );

}


/* ============================================================
   TODAY INPUT
   ============================================================ */

function todayInput() {

  const date =
    new Date();


  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    year +
    "-" +
    month +
    "-" +
    day
  );

}


/* ============================================================
   HTML ESCAPE
   ============================================================ */

function escapeHtml(
  value
) {

  return String(
    value === null ||
    value === undefined
      ? ""
      : value
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* ============================================================
   GLOBAL ACCESS
   ============================================================ */

window.ERP =
  {

    state:
      state,

    call:
      call,

    showPage:
      showPage,

    loadDashboard:
      loadDashboard,

    loadProducts:
      loadProducts,

    loadStock:
      loadStock,

    loadCustomers:
      loadCustomers,

    loadSuppliers:
      loadSuppliers,

    loadLedger:
      loadLedger,

    loadSales:
      loadSales,

    loadPurchases:
      loadPurchases,

    loadPayments:
      loadPayments,

    loadExpenses:
      loadExpenses

  };function renderSearchableTable(rows, columns, searchId, tableId, partyType) {
  function render() {
    const input = $(searchId);
    const query = input ? input.value.trim().toLowerCase() : "";
    const filtered = !query ? rows : rows.filter(function(row) {
      return columns.some(function(column) {
        return String(row[column] ?? "").toLowerCase().includes(query);
      });
    });
    const target = $(tableId);
    if (!target) return;
    target.innerHTML = table(filtered, columns, partyType);
  }
  const input = $(searchId);
  if (input) input.addEventListener("input", render);
  render();
}

function table(rows, columns, partyType) {
  if (!rows || rows.length === 0) {
    return '<div class="panel"><div class="empty">No records found.</div></div>';
  }
  const headers = columns.map(function(column) {
    return '<th>' + escapeHtml(prettyLabel(column)) + '</th>';
  }).join("");
  const actionHeader = partyType ? '<th>Ledger</th>' : "";
  const body = rows.map(function(row) {
    const cells = columns.map(function(column) {
      return '<td>' + formatCell(row[column], column) + '</td>';
    }).join("");
    let action = "";
    if (partyType) {
      const idField = partyType === "customer" ? "CustomerID" : "SupplierID";
      const id = row[idField] ?? row.ID ?? row.Id ?? "";
      action = '<td class="party-action-cell"><button class="btn secondary ledger-action-btn" type="button" onclick="openPartyLedger(\\'' +
        partyType + '\\',\\'' + String(id).replace(/'/g,"\\\\'") + '\\')">View Ledger</button></td>';
    }
    return '<tr>' + cells + action + '</tr>';
  }).join("");
  return '<div class="panel table-wrap"><table class="table"><thead><tr>' + headers + actionHeader +
    '</tr></thead><tbody>' + body + '</tbody></table></div>';
}


