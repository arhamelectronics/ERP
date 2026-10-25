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
      "Incentive Report",

    reports:
      "Reports",

    settings:
      "Settings"

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

      case "reports":

        await loadReports();

        break;

      case "settings":

        await loadSettingsPage();

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
    if (args.length === 1 && args[0] && typeof args[0] === "object") {
      payload = args[0];
    } else {
      payload = { partyType: args[0] || "", partyId: args[1] || "" };
    }
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
   PARTY LEDGER ACTION
   ============================================================ */

async function openPartyLedger(partyType, partyId) {
  if (!partyId) {
    showError("Please select a valid account.");
    return;
  }

  window._ledgerPartyType = partyType;
  window._ledgerSelectedPartyId = String(partyId);
  window._ledgerSelectedCustomerId = partyType === "customer" ? String(partyId) : "";

  try {
    showToast("Loading " + (partyType === "supplier" ? "supplier" : "customer") + " ledger...");
    const payload = { partyType: partyType, partyId: partyId };
    if (window._ledgerFrom) payload.fromDate = window._ledgerFrom;
    if (window._ledgerTo) payload.toDate = window._ledgerTo;
    const data = await call("ledger", payload);
    // Filter in the browser too, in case an older backend ignores the dates.
    state.ledger = filterLedgerByDate(Array.isArray(data) ? data : [], window._ledgerFrom, window._ledgerTo);
    if (partyType === "customer") {
      renderLedger(state.ledger);
    } else {
      renderSupplierLedger(state.ledger, partyId);
    }
  } catch (error) {
    showError(error.message || "Could not load ledger.");
  }
}

function filterLedgerByDate(rows, from, to) {
  if (!from && !to) return rows;
  return rows.filter(function (row) {
    if (!row.Date) return false;
    const d = new Date(row.Date);
    if (isNaN(d.getTime())) return false;
    const day = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
}

function renderSupplierLedger(rows, supplierId) {
  const supplier = state.suppliers.find(function(s) {
    return String(s.SupplierID) === String(supplierId);
  });
  const name = supplier ? (supplier.Name || supplier.SupplierID) : supplierId;
  const totalDebit = rows.reduce(function(sum, row) { return sum + (Number(row.Debit) || 0); }, 0);
  const totalCredit = rows.reduce(function(sum, row) { return sum + (Number(row.Credit) || 0); }, 0);
  const balance = rows.length ? (Number(rows[rows.length - 1].Balance) || 0) : 0;

  contentElement().innerHTML = `
    <div class="content ledger-page">
      <div class="toolbar ledger-toolbar">
        <div><h2>Supplier Ledger</h2><p>Complete supplier account statement.</p></div>
        <div class="ledger-actions">
          <button class="btn secondary" type="button" onclick="showPage('suppliers')">Suppliers</button>
          <button class="btn secondary" type="button" onclick="whatsappStatement('supplier')">WhatsApp</button>
          <button class="btn primary" type="button" onclick="printPartyLedger('supplier')">Print A4</button>
        </div>
      </div>
      <div class="panel ledger-selector-panel">
        <div class="ledger-filter-grid">
          <label>Supplier
            <select id="supplierLedgerSelect" class="ledger-customer-select">
              ${state.suppliers.map(function(s) {
                const id = s.SupplierID || "";
                return '<option value="' + escapeHtml(String(id)) + '"' + (String(id) === String(supplierId) ? ' selected' : '') + '>' + escapeHtml(String(s.Name || id)) + '</option>';
              }).join("")}
            </select>
          </label>
          <label>From Date<input id="partyLedgerFrom" type="date" value="${escapeHtml(window._ledgerFrom || "")}"></label>
          <label>To Date<input id="partyLedgerTo" type="date" value="${escapeHtml(window._ledgerTo || "")}"></label>
          <div class="ledger-filter-button"><button class="btn primary" type="button" onclick="loadPartyLedger('supplier')">View Ledger</button></div>
        </div>
        <div class="ledger-period-note">Leave dates empty for complete supplier history.</div>
      </div>
      <div class="ledger-summary-grid">
        <div class="ledger-summary-card"><span>Supplier</span><strong>${escapeHtml(String(name))}</strong><small>${escapeHtml(String(supplierId))}</small></div>
        <div class="ledger-summary-card"><span>Period</span><strong>${escapeHtml(window._ledgerFrom || "Start")} → ${escapeHtml(window._ledgerTo || "Today")}</strong></div>
        <div class="ledger-summary-card"><span>Purchases (Credit) / Paid (Debit)</span><strong>${money(totalCredit)}</strong><small>Paid: ${money(totalDebit)}</small></div>
        <div class="ledger-summary-card outstanding"><span>Payable Balance</span><strong>${money(balance)}</strong></div>
      </div>
      <div class="panel ledger-table-panel"><div id="ledgerTable"></div></div>
    </div>`;
  renderSearchableTable(rows, ["Date","PartyName","PartyType","Particular","Ref","Debit","Credit","Balance","Type"], "", "ledgerTable");
}

async function loadPartyLedger(partyType) {
  const select = document.getElementById(partyType === "supplier" ? "supplierLedgerSelect" : "ledgerCustomerSelect");
  if (!select || !select.value) { showError("Please select an account first."); return; }
  const from = (document.getElementById("partyLedgerFrom") || document.getElementById("ledgerFromDate"))?.value || "";
  const to = (document.getElementById("partyLedgerTo") || document.getElementById("ledgerToDate"))?.value || "";
  if (from && to && from > to) { showError("From Date cannot be after To Date."); return; }
  window._ledgerFrom = from;
  window._ledgerTo = to;
  await openPartyLedger(partyType, select.value);
}

function printPartyLedger(partyType) {
  const id = window._ledgerSelectedPartyId || "";
  const source = partyType === "supplier" ? state.suppliers : state.customers;
  const idField = partyType === "supplier" ? "SupplierID" : "CustomerID";
  const party = source.find(function(row) { return String(row[idField]) === String(id); });
  if (!party) { showError("Account information is not available."); return; }
  const rows = Array.isArray(state.ledger) ? state.ledger : [];
  const name = party.Name || id;
  const from = window._ledgerFrom || "", to = window._ledgerTo || "";
  const body = rows.length ? rows.map(function(row) {
    return '<tr><td>' + escapeHtml(formatDate(row.Date)) + '</td><td>' + escapeHtml(row.Particular || "") + '</td><td>' + escapeHtml(row.Ref || "") + '</td><td class="num">' + money(row.Debit) + '</td><td class="num">' + money(row.Credit) + '</td><td class="num">' + money(row.Balance) + '</td></tr>';
  }).join("") : '<tr><td colspan="6" class="empty">No transactions found for this period.</td></tr>';
  const w = window.open("", "_blank", "width=1000,height=800");
  if (!w) { showError("Please allow pop-ups in your browser to print the ledger."); return; }
  w.document.write('<!doctype html><html><head><title>' + escapeHtml(name) + ' Ledger</title><style>@page{size:A4 portrait;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;font-size:11px}h1{font-size:20px;margin:0}h2{font-size:16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:7px}th{background:#eef2f7;text-align:left}.num{text-align:right}.empty{text-align:center;padding:20px}</style></head><body><h1>ARHAM ELECTRONICS</h1><h2>' + escapeHtml(partyType === "supplier" ? "Supplier" : "Customer") + ' Ledger</h2><p><b>' + escapeHtml(String(name)) + '</b> &nbsp; | &nbsp; Period: ' + escapeHtml(from || "Start") + ' to ' + escapeHtml(to || "Today") + '</p><table><thead><tr><th>Date</th><th>Particular</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>' + body + '</tbody></table></body></html>');
  w.document.close(); w.focus(); setTimeout(function(){ w.print(); }, 300);
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
  const percent = prompt("Incentive % (optional, e.g. 2):", "") || "";

  try {
    const result = await call("salesperson", { name: name.trim(), incentivePercent: percent.trim() });
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
    state.salespersons.filter(spIsActive).map(function (sp) {
      return '<option value="' + escapeHtml(sp.SalespersonID) + '">' + escapeHtml(sp.Name) + '</option>';
    }).join("");

  select.value = newId;

}


/* ============================================================
   INCENTIVE REPORT
   ============================================================ */

async function loadIncentiveReport(dateFrom, dateTo) {

  // First open: default to the current month.
  if (dateFrom === undefined && dateTo === undefined) {
    dateFrom = window._incentiveFrom !== undefined ? window._incentiveFrom : monthStartInput();
    dateTo = window._incentiveTo !== undefined ? window._incentiveTo : todayInput();
    window._incentiveFrom = dateFrom;
    window._incentiveTo = dateTo;
  }

  const payload = {};
  if (dateFrom) payload.dateFrom = dateFrom;
  if (dateTo) payload.dateTo = dateTo;

  const results = await Promise.all([loadSalespersons(), call("incentivereport", payload)]);
  renderIncentiveReport(results[1]);

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
      <div class="toolbar">
        <div>
          <h2>Products</h2>
          <p>${rows.length} items</p>
        </div>
        <button class="btn primary" type="button" onclick="openProductForm()">+ New Product</button>
      </div>
      ${searchBox("productSearch", "Search product...")}
      <div id="productTable"></div>
    </div>
  `;

  renderSearchableTable(rows, columns, "productSearch", "productTable", null, null, "product");

}


/* ============================================================
   STOCK RENDER
   ============================================================ */

function renderStock(
  rows
) {

  const columns = [
    "Date",
    "ProductName",
    "Type",
    "Qty",
    "Note",
    "BalanceAfter",
    "ProductID",
    "MovementID"
  ];
  contentElement().innerHTML = `
    <div class="content">
      <div class="toolbar">
        <div>
          <h2>Stock Movements</h2>
          <p>Every stock change: purchases, sales, returns and adjustments.</p>
        </div>
        <button class="btn primary" type="button" onclick="openStockAdjustForm()">+ Stock Adjustment</button>
      </div>
      ${searchBox("stockSearch", "Search product, type or note...")}

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

function renderCustomers(
  rows
) {

  const columns = [
    "CustomerID",
    "Name",
    "Phone",
    "WhatsApp",
    "Email",
    "Address",
    "CreditLimit",
    "OpeningBalance",
    "ClosingBalance",
    "TotalDebit",
    "TotalCredit"
  ];

  const safeRows = Array.isArray(rows) ? rows : [];

  contentElement().innerHTML = `
    <div class="content">
      <div class="party-page-head">
        <div>
          <div class="eyebrow">CUSTOMER MANAGEMENT</div>
          <h2>Customers</h2>
          <p>Select a customer from the dropdown or search the full list.</p>
        </div>
        <button class="btn primary" type="button" onclick="addParty('customer')">＋ Add Customer</button>
      </div>

      <div class="party-tools">
        <div class="party-select-wrap">
          <label for="customerSelect">Customer Selection</label>
          <select id="customerSelect">
            <option value="">All Customers</option>
            ${safeRows.map(function(row){
              const id = row.CustomerID || row.ID || row.Id || "";
              return '<option value="' + escapeHtml(String(id)) + '">' +
                escapeHtml(String(row.Name || id)) + '</option>';
            }).join("")}
          </select>
        </div>
        ${searchBox("customerSearch","Search customer...")}
      </div>

      <div id="customerTable"></div>
    </div>
  `;

  renderSearchableTable(
    safeRows,
    columns,
    "customerSearch",
    "customerTable",
    "customerSelect",
    "CustomerID",
    "customer"
  );

}


/* ============================================================
   SUPPLIERS RENDER
   ============================================================ */

function renderSuppliers(
  rows
) {

  const columns = [
    "SupplierID",
    "Name",
    "Phone",
    "Email",
    "Address",
    "OpeningBalance",
    "ClosingBalance",
    "TotalDebit",
    "TotalCredit"
  ];

  const safeRows = Array.isArray(rows) ? rows : [];

  contentElement().innerHTML = `
    <div class="content">
      <div class="party-page-head">
        <div>
          <div class="eyebrow">SUPPLIER MANAGEMENT</div>
          <h2>Suppliers</h2>
          <p>Select a supplier from the dropdown or search the full list.</p>
        </div>
        <button class="btn primary" type="button" onclick="addParty('supplier')">＋ Add Supplier</button>
      </div>

      <div class="party-tools">
        <div class="party-select-wrap">
          <label for="supplierSelect">Supplier Selection</label>
          <select id="supplierSelect">
            <option value="">All Suppliers</option>
            ${safeRows.map(function(row){
              const id = row.SupplierID || row.ID || row.Id || "";
              return '<option value="' + escapeHtml(String(id)) + '">' +
                escapeHtml(String(row.Name || id)) + '</option>';
            }).join("")}
          </select>
        </div>
        ${searchBox("supplierSearch","Search supplier...")}
      </div>

      <div id="supplierTable"></div>
    </div>
  `;

  renderSearchableTable(
    safeRows,
    columns,
    "supplierSearch",
    "supplierTable",
    "supplierSelect",
    "SupplierID",
    "supplier"
  );

}


/* ============================================================
   LEDGER RENDER
   ============================================================ */

function renderLedger(rows) {
  const selectedCustomerId = window._ledgerSelectedCustomerId || "";
  const selectedCustomer = state.customers.find(function(c){ return String(c.CustomerID) === String(selectedCustomerId); });
  const customerOptions = state.customers.map(function(c){
    const id=c.CustomerID||"", name=c.Name||id;
    return '<option value="'+escapeHtml(id)+'"'+(String(id)===String(selectedCustomerId)?' selected':'')+'>'+escapeHtml(name)+'</option>';
  }).join("");
  const columns=["Date","PartyName","PartyType","Particular","Ref","Debit","Credit","Balance","Type"];
  const customerName=selectedCustomer?(selectedCustomer.Name||selectedCustomer.CustomerID):"";
  const totalDebit=rows.reduce((s,r)=>s+(Number(r.Debit)||0),0);
  const totalCredit=rows.reduce((s,r)=>s+(Number(r.Credit)||0),0);
  const lastBalance=rows.length?(Number(rows[rows.length-1].Balance)||0):0;
  const from=window._ledgerFrom||"";
  const to=window._ledgerTo||"";

  contentElement().innerHTML=`
    <div class="content ledger-page">
      <div class="toolbar ledger-toolbar">
        <div><h2>Customer Ledger</h2><p>Select customer and date range for the account statement.</p></div>
        <div class="ledger-actions">
          <button class="btn secondary" type="button" onclick="showPage('customers')">Customers</button>
          <button class="btn secondary" type="button" onclick="whatsappStatement('customer')">WhatsApp</button>
          <button class="btn primary" type="button" onclick="printCustomerLedger()">Print A4</button>
        </div>
      </div>

      <div class="panel ledger-selector-panel">
        <div class="ledger-selector-head"><div><span class="panel-kicker">ACCOUNT STATEMENT</span><h3>Customer & Duration</h3></div><span class="ledger-selection-hint">Choose exactly what you want to print</span></div>
        <div class="ledger-filter-grid">
          <label>Customer
            <select id="ledgerCustomerSelect" class="ledger-customer-select">
              <option value="">Select customer...</option>${customerOptions}
            </select>
          </label>
          <label>From Date
            <input id="ledgerFromDate" type="date" value="${escapeHtml(from)}">
          </label>
          <label>To Date
            <input id="ledgerToDate" type="date" value="${escapeHtml(to)}">
          </label>
          <div class="ledger-filter-button"><button class="btn primary" type="button" onclick="loadSelectedCustomerLedger()">View Ledger</button></div>
        </div>
        <div class="ledger-period-note">Leave both dates empty for the complete customer history.</div>
      </div>

      ${selectedCustomer ? `
        <div class="ledger-summary-grid">
          <div class="ledger-summary-card"><span>Customer</span><strong>${escapeHtml(customerName)}</strong><small>${escapeHtml(selectedCustomer.CustomerID||"")}</small></div>
          <div class="ledger-summary-card"><span>Period</span><strong>${escapeHtml(from||"Start")} → ${escapeHtml(to||"Today")}</strong><small>Statement duration</small></div>
          <div class="ledger-summary-card"><span>Total Debit</span><strong>${money(totalDebit)}</strong><small>Charges / sales</small></div>
          <div class="ledger-summary-card outstanding"><span>Current Balance</span><strong>${money(lastBalance)}</strong><small>Latest balance in selected period</small></div>
        </div>
        <div class="panel ledger-table-panel" id="customerLedgerPrintArea">
          <div class="print-ledger-header"><div><div class="print-company">ARHAM ELECTRONICS</div><h2>Customer Ledger</h2><p>${escapeHtml(customerName)} • ${escapeHtml(from||"Start")} to ${escapeHtml(to||"Today")}</p></div><div class="print-date">Printed: ${escapeHtml(formatDate(new Date()))}</div></div>
          <div id="ledgerTable"></div>
        </div>
      ` : `
        <div class="panel ledger-empty-state"><div class="ledger-empty-icon">▤</div><h3>Select a customer</h3><p>Choose a customer, set the duration, then click <b>View Ledger</b>.</p></div>
      `}
    </div>`;
  if(selectedCustomer) renderSearchableTable(rows,columns,"","ledgerTable");
}

async function loadSelectedCustomerLedger(){
  const select=document.getElementById("ledgerCustomerSelect");
  if(!select||!select.value){ showError("Please select a customer first."); return; }
  const fromInput=document.getElementById("ledgerFromDate");
  const toInput=document.getElementById("ledgerToDate");
  const from=fromInput?fromInput.value:"";
  const to=toInput?toInput.value:"";
  if(from&&to&&from>to){ showError("From Date cannot be after To Date."); return; }
  window._ledgerSelectedCustomerId=select.value;
  window._ledgerFrom=from;
  window._ledgerTo=to;
  try{
    showToast("Loading customer ledger...");
    const payload={
      partyType:"customer",
      partyId:select.value
    };
    if(from) payload.fromDate=from;
    if(to) payload.toDate=to;

    const allRows=await call("ledger", payload);

    // Apply the selected duration in the browser as well. This keeps
    // the statement correct even if an older Apps Script deployment
    // does not yet understand fromDate/toDate.
    const rows=(Array.isArray(allRows)?allRows:[]).filter(function(row){
      if(!from && !to) return true;
      const raw=row.Date;
      if(!raw) return false;
      const d=new Date(raw);
      if(isNaN(d.getTime())) return false;
      const day=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      if(from && day<from) return false;
      if(to && day>to) return false;
      return true;
    });

    state.ledger=rows;
    renderLedger(state.ledger);
    if(!state.ledger.length) showToast("No ledger transactions found for this period.");
  }catch(error){ showError(error.message||"Could not load customer ledger."); }
}

function printCustomerLedger(){
  const customerId=window._ledgerSelectedCustomerId||"";
  if(!customerId){ showError("Please select a customer and load the ledger first."); return; }
  const customer=state.customers.find(c=>String(c.CustomerID)===String(customerId));
  if(!customer){ showError("Customer information is not available."); return; }
  const rows=Array.isArray(state.ledger)?state.ledger:[];
  const customerName=customer.Name||customer.CustomerID||"Customer";
  const from=window._ledgerFrom||"", to=window._ledgerTo||"";
  const totalDebit=rows.reduce((s,r)=>s+(Number(r.Debit)||0),0);
  const totalCredit=rows.reduce((s,r)=>s+(Number(r.Credit)||0),0);
  const currentBalance=rows.length?(Number(rows[rows.length-1].Balance)||0):0;
  const bodyRows=rows.length?rows.map(function(row){return `<tr><td>${escapeHtml(formatDate(row.Date))}</td><td>${escapeHtml(row.Particular||"")}</td><td>${escapeHtml(row.Ref||"")}</td><td class="num">${money(row.Debit)}</td><td class="num">${money(row.Credit)}</td><td class="num balance">${money(row.Balance)}</td></tr>`;}).join(""):'<tr><td colspan="6" class="empty">No transactions found for this period.</td></tr>';
  const printWindow=window.open("","_blank","width=1000,height=800");
  if(!printWindow){showError("Please allow pop-ups in your browser to print the ledger.");return;}
  printWindow.document.write(`<!DOCTYPE html><html><head><title>Customer Ledger - ${escapeHtml(customerName)}</title><style>
  @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#172033;font-size:11px}.header{display:flex;justify-content:space-between;border-bottom:2px solid #172033;padding-bottom:10px;margin-bottom:12px}.company{font-size:20px;font-weight:800;letter-spacing:1px}.title{font-size:16px;font-weight:700;margin-top:3px}.meta{text-align:right;color:#64748b;font-size:10px;line-height:1.6}.customer-box{display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-bottom:12px}.box{border:1px solid #d9e0e8;border-radius:5px;padding:8px}.label{color:#64748b;font-size:8px;text-transform:uppercase;font-weight:700}.value{margin-top:3px;font-weight:700;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#eef2f7;border:1px solid #d9e0e8;padding:7px 6px;text-align:left;font-size:8px;text-transform:uppercase}td{border:1px solid #e1e6ed;padding:6px;font-size:9.5px}.num{text-align:right;white-space:nowrap}.balance{font-weight:700}tfoot td{background:#f7f9fc;font-weight:700}.footer{margin-top:14px;display:flex;justify-content:space-between;border-top:1px solid #d9e0e8;padding-top:8px;font-size:9px;color:#64748b}.empty{text-align:center;padding:20px}tr{page-break-inside:avoid}</style></head><body>
  <div class="header"><div><div class="company">ARHAM ELECTRONICS</div><div class="title">Customer Ledger</div></div><div class="meta">Customer ID: ${escapeHtml(customer.CustomerID||"")}<br>Period: ${escapeHtml(from||"Start")} to ${escapeHtml(to||"Today")}<br>Printed: ${escapeHtml(formatDate(new Date()))}</div></div>
  <div class="customer-box"><div class="box"><div class="label">Customer</div><div class="value">${escapeHtml(customerName)}</div></div><div class="box"><div class="label">Total Debit</div><div class="value">${money(totalDebit)}</div></div><div class="box"><div class="label">Total Credit</div><div class="value">${money(totalCredit)}</div></div></div>
  <table><thead><tr><th>Date</th><th>Particular</th><th>Reference</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead><tbody>${bodyRows}</tbody><tfoot><tr><td colspan="3">CURRENT BALANCE</td><td class="num">${money(totalDebit)}</td><td class="num">${money(totalCredit)}</td><td class="num">${money(currentBalance)}</td></tr></tfoot></table>
  <div class="footer"><span>Arham Electronics ERP</span><span>Customer account statement</span></div></body></html>`);
  printWindow.document.close();printWindow.focus();setTimeout(()=>printWindow.print(),350);
}

/* ============================================================
   SALES RENDER
   ============================================================ */

function renderSales(
  rows
) {

  const columns = [

    "InvoiceNo",
    "Date",
    "CustomerName",
    "SalespersonName",
    "Subtotal",
    "Discount",
    "NetTotal",
    "Paid",
    "Balance",
    "ReturnedAmount",
    "Status"

  ];


  contentElement().innerHTML = `

    <div class="content">

      <div class="toolbar">

        <div>

          <h2>Sales</h2>

          <p>
            Sales invoices and customer transactions
          </p>

        </div>

        <button
          class="btn primary"
          onclick="openSaleForm()"
        >
          + New Sale
        </button>

      </div>


      ${searchBox(
        "salesSearch",
        "Search invoice..."
      )}


      <div id="salesTable"></div>

    </div>

  `;


  renderSearchableTable(rows, columns, "salesSearch", "salesTable", null, null, "sale");

}


/* ============================================================
   PURCHASES RENDER
   ============================================================ */

function renderPurchases(
  rows
) {

  const columns = [

    "ReferenceNo",
    "Date",
    "SupplierName",
    "Subtotal",
    "Discount",
    "NetTotal",
    "Paid",
    "Balance",
    "ReturnedAmount",
    "Status"

  ];


  contentElement().innerHTML = `

    <div class="content">

      <div class="toolbar">

        <div>

          <h2>Purchases</h2>

          <p>
            Supplier purchases and stock receiving
          </p>

        </div>

        <button
          class="btn primary"
          onclick="openPurchaseForm()"
        >
          + New Purchase
        </button>

      </div>


      ${searchBox(
        "purchaseSearch",
        "Search purchase..."
      )}


      <div id="purchaseTable"></div>

    </div>

  `;


  renderSearchableTable(rows, columns, "purchaseSearch", "purchaseTable", null, null, "purchase");

}


/* ============================================================
   PAYMENTS RENDER
   ============================================================ */

function renderPayments(
  rows
) {

  const columns = [

    "Date",
    "PartyName",
    "PartyType",
    "Direction",
    "Amount",
    "Method",
    "Reference"

  ];


  contentElement().innerHTML = `

    <div class="content">

      <div class="toolbar">

        <div>

          <h2>Payments</h2>

          <p>
            Customer receipts and supplier payments
          </p>

        </div>

        <button
          class="btn primary"
          onclick="openPaymentForm()"
        >
          + New Payment
        </button>

      </div>


      ${searchBox(
        "paymentSearch",
        "Search payment..."
      )}


      <div id="paymentTable"></div>

    </div>

  `;


  renderSearchableTable(
    rows,
    columns,
    "paymentSearch",
    "paymentTable"
  );

}


/* ============================================================
   EXPENSES RENDER
   ============================================================ */

function renderExpenses(
  rows
) {

  const columns = [

    "ExpenseID",
    "Date",
    "Category",
    "Description",
    "Amount",
    "PaymentMethod",
    "Notes"

  ];


  contentElement().innerHTML = `

    <div class="content">

      <div class="toolbar">

        <div>

          <h2>Expenses</h2>

          <p>
            Business expenses
          </p>

        </div>

        <button
          class="btn primary"
          onclick="openExpenseForm()"
        >
          + New Expense
        </button>

      </div>


      ${searchBox(
        "expenseSearch",
        "Search expense..."
      )}


      <div id="expenseTable"></div>

    </div>

  `;


  renderSearchableTable(
    rows,
    columns,
    "expenseSearch",
    "expenseTable"
  );

}


/* ============================================================
   INCENTIVE REPORT + SALESPERSON SETUP
   ============================================================ */

function spIsActive(sp) {
  const t = String(sp && sp.Active != null ? sp.Active : "").trim().toLowerCase();
  return !(sp && sp.Active === false) && t !== "false" && t !== "no" && t !== "0" && t !== "inactive";
}

function spPercentText(v) {
  return v === null || v === undefined || String(v).trim() === "" ? "—" : formatNumber(Number(v)) + "%";
}

function monthStartInput() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01";
}

function renderIncentiveReport(data) {

  const d = data || { rows: [] };
  const rows = d.rows || [];
  const totalSales = rows.reduce(function (a, r) { return a + Number(r.totalSales || 0); }, 0);
  const totalIncentive = rows.reduce(function (a, r) { return a + Number(r.incentive || 0); }, 0);
  const people = (state.salespersons || []).slice().sort(function (a, b) {
    return (spIsActive(b) - spIsActive(a)) || String(a.Name || "").localeCompare(String(b.Name || ""));
  });
  const activeCount = people.filter(spIsActive).length;

  const rateCell = function (r) {
    if (r.salespersonId === "unassigned") return "—";
    const used = r.ratesUsed || [];
    if (used.length > 1) return used.map(function (x) { return formatNumber(x) + "%"; }).join(" / ");
    if (used.length === 1) return formatNumber(used[0]) + "%";
    return spPercentText(r.currentPercent);
  };

  contentElement().innerHTML = `
    <div class="content">

      <div class="toolbar">
        <div>
          <h2>Incentive Report</h2>
          <p>Sales and incentive per salesperson, using each person's incentive rate.</p>
        </div>
        <button class="btn secondary" type="button" onclick="printIncentiveReport()">Print A4</button>
      </div>

      <div class="panel" style="margin-bottom:16px;">
        <form id="incentiveFilterForm" class="form-grid erp-form" onsubmit="applyIncentiveFilter(); return false;">
          <label>From
            <input type="date" name="dateFrom" value="${escapeHtml(d.dateFrom || "")}">
          </label>
          <label>To
            <input type="date" name="dateTo" value="${escapeHtml(d.dateTo || "")}">
          </label>
          <label style="justify-content:flex-end;display:flex;align-items:flex-end;">
            <button type="submit" class="btn primary">Apply</button>
          </label>
        </form>
      </div>

      <div class="stat-grid">
        ${statCard("Total Sales (period)", money(totalSales), (d.dateFrom || "Start") + " to " + (d.dateTo || "Today"), "green")}
        ${statCard("Total Incentive", money(totalIncentive), activeCount + " active salesperson(s)", "blue")}
      </div>

      <div class="panel" style="margin-bottom:16px;">
        <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Salesperson</th><th class="num">Rate</th><th class="num"># Sales</th><th class="num">Total Sales</th><th class="num">Incentive</th></tr></thead>
          <tbody>
            ${rows.length === 0 ? '<tr><td colspan="5" class="empty">No salespersons or sales in this period.</td></tr>' : rows.map(function (r) {
              return '<tr><td>' + escapeHtml(r.name) + (r.active === false && r.salespersonId !== "unassigned" ? ' <span class="badge">Inactive</span>' : '') + '</td>' +
                '<td class="num">' + rateCell(r) + '</td>' +
                '<td class="num">' + formatNumber(r.salesCount) + '</td>' +
                '<td class="num">' + money(r.totalSales) + '</td>' +
                '<td class="num">' + (r.salespersonId === "unassigned" ? "—" : money(r.incentive)) + '</td></tr>';
            }).join("")}
          </tbody>
        </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div><h2>Salespersons</h2><p style="margin:4px 0 0;">Set each person's incentive rate. A new rate applies to sales made after the change.</p></div>
          <button class="btn primary" type="button" onclick="openSalespersonForm()">+ Add Salesperson</button>
        </div>
        <div id="salespersonFormArea"></div>
        <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Edit</th><th>Name</th><th>Phone</th><th class="num">Incentive %</th><th>Status</th></tr></thead>
          <tbody>
            ${people.length === 0 ? '<tr><td colspan="5" class="empty">No salespersons yet. Click "+ Add Salesperson".</td></tr>' : people.map(function (sp) {
              const active = spIsActive(sp);
              return '<tr>' +
                '<td class="party-action-cell"><button class="btn secondary ledger-action-btn" type="button" onclick="openSalespersonForm(' + escapeHtml(JSON.stringify(String(sp.SalespersonID))) + ')">Edit</button></td>' +
                '<td>' + escapeHtml(sp.Name || "") + '</td>' +
                '<td>' + escapeHtml(sp.Phone || "") + '</td>' +
                '<td class="num">' + spPercentText(sp.IncentivePercent) + '</td>' +
                '<td><span class="badge ' + (active ? "success" : "") + '">' + (active ? "Active" : "Inactive") + '</span></td>' +
              '</tr>';
            }).join("")}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  `;

  state.incentiveReport = d;
}

function applyIncentiveFilter() {
  const form = document.getElementById("incentiveFilterForm");
  const fd = new FormData(form);
  const from = fd.get("dateFrom") || "", to = fd.get("dateTo") || "";
  if (from && to && from > to) { showError("From date cannot be after To date."); return; }
  window._incentiveFrom = from;
  window._incentiveTo = to;
  loadIncentiveReport(from, to).catch(function (error) { showError(error.message); });
}

function openSalespersonForm(salespersonId) {
  const area = document.getElementById("salespersonFormArea");
  if (!area) return;
  const editing = salespersonId != null && salespersonId !== "";
  const sp = editing
    ? (state.salespersons || []).find(function (x) { return String(x.SalespersonID) === String(salespersonId); })
    : {};
  if (editing && !sp) { showError("Salesperson not found. Please refresh."); return; }
  const v = function (f) { return escapeHtml(String(sp[f] == null ? "" : sp[f])); };

  area.innerHTML = `
    <form id="salespersonForm" class="erp-form" style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin:12px 0;">
      <input type="hidden" name="salespersonId" value="${editing ? v("SalespersonID") : ""}">
      <h3 style="margin:0 0 10px;">${editing ? "Edit Salesperson" : "New Salesperson"}</h3>
      <div class="form-grid">
        <label>Name<input name="name" value="${v("Name")}" required autocomplete="off"></label>
        <label>Phone<input name="phone" value="${v("Phone")}" autocomplete="off"></label>
        <label>Incentive %<input type="number" name="incentivePercent" min="0" max="100" step="0.01" value="${v("IncentivePercent")}" placeholder="e.g. 2"></label>
        ${editing ? `<label>Status<select name="active"><option value="true"${spIsActive(sp) ? " selected" : ""}>Active</option><option value="false"${spIsActive(sp) ? "" : " selected"}>Inactive</option></select></label>` : ""}
      </div>
      <div class="form-actions">
        <button type="button" class="btn secondary" onclick="document.getElementById('salespersonFormArea').innerHTML=''">Cancel</button>
        <button type="submit" class="btn primary">${editing ? "Save Changes" : "Save Salesperson"}</button>
      </div>
    </form>
  `;
  const form = document.getElementById("salespersonForm");
  form.addEventListener("submit", submitSalesperson);
  form.name.focus();
  area.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function submitSalesperson(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const id = form.salespersonId.value;
  const payload = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    incentivePercent: form.incentivePercent.value.trim()
  };
  if (!payload.name) { showError("Name is required."); return; }
  if (payload.incentivePercent !== "") {
    const n = Number(payload.incentivePercent);
    if (isNaN(n) || n < 0 || n > 100) { showError("Incentive % must be between 0 and 100."); return; }
  }
  try {
    if (button) button.disabled = true;
    showToast("Saving salesperson...");
    if (id) {
      payload.salespersonId = id;
      payload.active = form.active.value;
      const result = await call("updatesalesperson", payload);
      showToast(result && result.changed && result.changed.length ? "Salesperson updated." : "No changes to save.");
    } else {
      const result = await call("salesperson", payload);
      showToast("Salesperson added: " + (result && result.name ? result.name : ""));
    }
    await loadSalespersons();
    await loadIncentiveReport(window._incentiveFrom, window._incentiveTo);
  } catch (error) {
    if (button) button.disabled = false;
    showError(error.message || "Could not save salesperson.");
  }
}

function printIncentiveReport() {
  const d = state.incentiveReport || { rows: [] };
  const rows = d.rows || [];
  const totalSales = rows.reduce(function (a, r) { return a + Number(r.totalSales || 0); }, 0);
  const totalIncentive = rows.reduce(function (a, r) { return a + Number(r.incentive || 0); }, 0);
  const body = rows.length ? rows.map(function (r) {
    const unassigned = r.salespersonId === "unassigned";
    const rate = unassigned ? "—" : ((r.ratesUsed || []).length ? r.ratesUsed.map(function (x) { return x + "%"; }).join(" / ") : spPercentText(r.currentPercent));
    return "<tr><td>" + escapeHtml(r.name) + "</td><td class='num'>" + rate + "</td><td class='num'>" + formatNumber(r.salesCount) +
      "</td><td class='num'>" + money(r.totalSales) + "</td><td class='num'>" + (unassigned ? "—" : money(r.incentive)) + "</td></tr>";
  }).join("") : "<tr><td colspan='5' style='text-align:center;padding:20px'>No data.</td></tr>";
  const w = window.open("", "_blank", "width=1000,height=800");
  if (!w) { showError("Please allow pop-ups in your browser to print the report."); return; }
  w.document.write("<!doctype html><html><head><title>Incentive Report</title><style>@page{size:A4 portrait;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;font-size:11px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:4px 0 10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:7px}th{background:#eef2f7;text-align:left}.num{text-align:right}tfoot td{font-weight:700;background:#f7f9fc}</style></head><body>" +
    "<h1>ARHAM ELECTRONICS</h1><h2>Salesperson Incentive Report</h2><p>Period: " + escapeHtml(d.dateFrom || "Start") + " to " + escapeHtml(d.dateTo || "Today") + " &nbsp;|&nbsp; Printed: " + escapeHtml(formatDate(new Date())) + "</p>" +
    "<table><thead><tr><th>Salesperson</th><th class='num'>Rate</th><th class='num'># Sales</th><th class='num'>Total Sales</th><th class='num'>Incentive</th></tr></thead><tbody>" + body +
    "</tbody><tfoot><tr><td colspan='3'>TOTAL</td><td class='num'>" + money(totalSales) + "</td><td class='num'>" + money(totalIncentive) + "</td></tr></tfoot></table></body></html>");
  w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300);
}


/* ============================================================
   CUSTOMER / SUPPLIER ADD
   ============================================================ */

async function addParty(type) {
  const label = type === "customer" ? "Customer" : "Supplier";

  const name = prompt("Enter " + label + " name:");
  if (!name || !name.trim()) return;

  const phone = prompt("Phone number (optional):") || "";
  const address = prompt("Address (optional):") || "";
  const openingBalanceText = prompt("Opening balance (optional):", "0") || "0";
  const openingBalance = Number(openingBalanceText) || 0;

  const payload = {
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
    openingBalance: openingBalance
  };

  try {
    showToast("Saving " + label.toLowerCase() + "...");
    const result = await call(type, payload);
    showToast(label + " added successfully" + (result && result.id ? ": " + result.id : "."));
    if (type === "customer") {
      await loadCustomers();
    } else {
      await loadSuppliers();
    }
  } catch (error) {
    showError(error.message || "Could not add " + label.toLowerCase() + ".");
  }
}


/* ============================================================
   TABLE ROW ACTIONS
   ============================================================ */

// Builds a button whose onclick calls fnName(...args) safely
// (arguments are JSON-encoded and HTML-escaped).
function actionButton(label, fnName, args, tone) {
  const argText = (args || []).map(function (a) { return JSON.stringify(a); }).join(",");
  return '<button class="btn ' + (tone || "secondary") + ' ledger-action-btn" type="button" onclick="' +
    escapeHtml(fnName + "(" + argText + ")") + '">' + escapeHtml(label) + "</button>";
}

function isCancelled(row) {
  return String(row && row.Status || "").toLowerCase() === "cancelled";
}

function tableActionHeader(kind) {
  if (kind === "customer" || kind === "supplier") return "Ledger";
  return "Actions";
}

function tableActions(kind, row) {
  if (kind === "customer" || kind === "supplier") {
    const id = kind === "customer" ? row.CustomerID : row.SupplierID;
    return actionButton("View Ledger", "openPartyLedger", [kind, String(id == null ? "" : id)]);
  }
  if (kind === "product") {
    const id = String(row.ProductID == null ? "" : row.ProductID);
    return actionButton("Edit", "openProductForm", [id]) + actionButton("Adjust", "openStockAdjustForm", [id]);
  }
  if (kind === "sale") {
    const id = String(row.SaleID || "");
    let html = actionButton("A4", "printInvoice", [id, "a4"]) + actionButton("Slip", "printInvoice", [id, "slip"]) + actionButton("WhatsApp", "whatsappInvoice", [id]);
    if (!isCancelled(row)) html += actionButton("Return", "openReturnForm", ["sale", id]) + actionButton("Cancel", "openCancelForm", ["sale", id], "danger");
    return html;
  }
  if (kind === "purchase") {
    const id = String(row.PurchaseID || "");
    if (isCancelled(row)) return "";
    return actionButton("Return", "openReturnForm", ["purchase", id]) + actionButton("Cancel", "openCancelForm", ["purchase", id], "danger");
  }
  return "";
}


/* ============================================================
   RETURNS AND CANCELLATION
   ============================================================ */

function findDoc(kind, id) {
  const list = kind === "sale" ? (state.sales || []) : (state.purchases || []);
  const idField = kind === "sale" ? "SaleID" : "PurchaseID";
  return list.find(function (r) { return String(r[idField]) === String(id); }) || null;
}

function docLabel(kind, doc) {
  return kind === "sale"
    ? (doc.InvoiceNo || doc.SaleID) + " — " + (doc.CustomerName || doc.CustomerID || "")
    : (doc.ReferenceNo || doc.PurchaseID) + " — " + (doc.SupplierName || doc.SupplierID || "");
}

function refundHelp(kind) {
  return kind === "sale"
    ? "Cash given back to the customer now. Leave 0 to keep the amount as a credit on the customer's account."
    : "Cash received back from the supplier now. Leave 0 to keep the amount as a credit with the supplier.";
}

function refundMethodSelect() {
  return '<select name="refundMethod"><option value="cash">Cash</option><option value="bank">Bank</option><option value="online">Online</option><option value="other">Other</option></select>';
}

async function openReturnForm(kind, id) {
  const doc = findDoc(kind, id);
  if (!doc) { showError("Record not found. Please refresh."); return; }
  const back = kind === "sale" ? "sales" : "purchases";
  try {
    showToast("Loading items...");
    const data = await call(kind === "sale" ? "salereturnable" : "purchasereturnable", kind === "sale" ? { saleId: id } : { purchaseId: id });
    const items = (data && data.items) || [];
    const open = items.filter(function (it) { return Number(it.remainingQty) > 0; });

    contentElement().innerHTML = `
      <div class="content">
        <div class="panel">
          <div class="panel-header">
            <h2>${kind === "sale" ? "Sale Return" : "Purchase Return"}</h2>
            <button class="btn secondary" type="button" onclick="showPage('${back}')">Back</button>
          </div>
          <p style="margin:0 0 12px;"><b>${escapeHtml(docLabel(kind, doc))}</b> &nbsp;·&nbsp; ${escapeHtml(formatDate(doc.Date))} &nbsp;·&nbsp; Net total ${money(doc.NetTotal)}</p>
          ${open.length === 0 ? '<div class="empty">All items on this ' + kind + ' have already been returned.</div>' : `
          <form id="returnForm" class="erp-form">
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Product</th><th class="num">${kind === "sale" ? "Sold" : "Bought"}</th><th class="num">Returned</th><th class="num">Unit Value</th><th class="num" style="width:110px;">Return Qty</th><th class="num">Amount</th></tr></thead>
                <tbody>
                  ${items.map(function (it, i) {
                    const left = Number(it.remainingQty) || 0;
                    return '<tr><td>' + escapeHtml(it.description || it.productId) + '</td><td class="num">' + formatNumber(it.qty) + '</td><td class="num">' + formatNumber(it.returnedQty) +
                      '</td><td class="num">' + money(it.unitValue) + '</td><td class="num"><input type="number" class="return-qty" data-i="' + i + '" min="0" max="' + left + '" step="1" value="0"' + (left > 0 ? '' : ' disabled') + ' style="width:90px;text-align:right;"></td>' +
                      '<td class="num" id="retAmt' + i + '">' + money(0) + '</td></tr>';
                  }).join("")}
                </tbody>
                <tfoot><tr><td colspan="5" class="num"><b>Return value</b></td><td class="num"><b id="retTotal">${money(0)}</b></td></tr></tfoot>
              </table>
            </div>
            <div class="form-grid" style="margin-top:12px;">
              <label>Date<input type="date" name="date" value="${todayInput()}" required></label>
              <label>Refund Amount<input type="number" name="refund" min="0" step="0.01" value="0"><small>${escapeHtml(refundHelp(kind))}</small></label>
              <label>Refund Method${refundMethodSelect()}</label>
            </div>
            <label>Reason<input name="reason" placeholder="e.g. Defective, customer changed mind" autocomplete="off"></label>
            <div class="form-actions"><button type="submit" class="btn primary">Save Return</button></div>
          </form>`}
        </div>
      </div>`;

    const form = $("returnForm");
    if (!form) return;
    const recalc = function () {
      let total = 0;
      form.querySelectorAll(".return-qty").forEach(function (input) {
        const it = items[Number(input.dataset.i)];
        const q = Math.min(Number(input.value) || 0, Number(it.remainingQty) || 0);
        const amt = Math.round(q * Number(it.unitValue) * 100) / 100;
        total += amt;
        const cell = document.getElementById("retAmt" + input.dataset.i);
        if (cell) cell.textContent = money(amt);
      });
      const t = document.getElementById("retTotal");
      if (t) t.textContent = money(total);
      return total;
    };
    form.addEventListener("input", recalc);
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const lines = [];
      let bad = "";
      form.querySelectorAll(".return-qty").forEach(function (input) {
        const it = items[Number(input.dataset.i)];
        const q = Number(input.value) || 0;
        if (q > Number(it.remainingQty)) bad = "Only " + it.remainingQty + " of " + (it.description || it.productId) + " can be returned.";
        if (q > 0) lines.push({ productId: it.productId, qty: q });
      });
      if (bad) { showError(bad); return; }
      if (!lines.length) { showError("Enter a return quantity for at least one item."); return; }
      const total = recalc();
      const refund = Number(form.refund.value) || 0;
      if (refund > total + 0.001) { showError("Refund cannot be more than the return value."); return; }
      const payload = { items: lines, refund: refund, refundMethod: form.refundMethod.value, reason: form.reason.value.trim(), date: form.date.value };
      payload[kind === "sale" ? "saleId" : "purchaseId"] = id;
      const button = form.querySelector('button[type="submit"]');
      try {
        if (button) button.disabled = true;
        showToast("Saving return...");
        const result = await call(kind === "sale" ? "salereturn" : "purchasereturn", payload);
        showToast("Return saved: " + result.returnNo + " (" + money(result.amount) + ")");
        showPage(back);
      } catch (error) {
        if (button) button.disabled = false;
        showError(error.message || "Could not save return.");
      }
    });
  } catch (error) {
    showError(error.message || "Could not load items.");
  }
}

function openCancelForm(kind, id) {
  const doc = findDoc(kind, id);
  if (!doc) { showError("Record not found. Please refresh."); return; }
  const back = kind === "sale" ? "sales" : "purchases";
  const remaining = Math.round(Math.max(0, Number(doc.NetTotal || 0) - Number(doc.ReturnedAmount || 0)) * 100) / 100;
  const suggestedRefund = Math.min(Number(doc.Paid || 0), remaining);

  contentElement().innerHTML = `
    <div class="content">
      <div class="panel">
        <div class="panel-header">
          <h2>${kind === "sale" ? "Cancel Sale" : "Cancel Purchase"}</h2>
          <button class="btn secondary" type="button" onclick="showPage('${back}')">Back</button>
        </div>
        <div class="stat-grid" style="margin-bottom:12px;">
          ${statCard(kind === "sale" ? "Invoice" : "Reference", docLabel(kind, doc), formatDate(doc.Date), "")}
          ${statCard("Net Total", money(doc.NetTotal), Number(doc.ReturnedAmount) ? "Already returned " + money(doc.ReturnedAmount) : "", "")}
          ${statCard("Paid at the time", money(doc.Paid), "", "")}
        </div>
        <p style="margin:0 0 12px;">Cancelling ${kind === "sale" ? "puts all remaining items back into stock and removes the charge from the customer's account" : "removes all remaining items from stock and removes the amount from the supplier's account"}. This cannot be undone.</p>
        <form id="cancelForm" class="erp-form">
          <label>Reason for cancelling<input name="reason" required autocomplete="off" placeholder="e.g. Wrong customer selected, duplicate entry"></label>
          <div class="form-grid">
            <label>Refund Amount<input type="number" name="refund" min="0" max="${remaining}" step="0.01" value="${suggestedRefund}"><small>${escapeHtml(refundHelp(kind))}</small></label>
            <label>Refund Method${refundMethodSelect()}</label>
          </div>
          <div class="form-actions"><button type="submit" class="btn danger">Cancel ${kind === "sale" ? "Sale" : "Purchase"}</button></div>
        </form>
      </div>
    </div>`;

  $("cancelForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const reason = form.reason.value.trim();
    const refund = Number(form.refund.value) || 0;
    if (!reason) { showError("Please give a reason for cancelling."); return; }
    if (refund > remaining + 0.001) { showError("Refund cannot be more than " + money(remaining) + "."); return; }
    if (!confirm("Cancel " + docLabel(kind, doc) + "? This cannot be undone.")) return;
    const payload = { reason: reason, refund: refund, refundMethod: form.refundMethod.value };
    payload[kind === "sale" ? "saleId" : "purchaseId"] = id;
    const button = form.querySelector('button[type="submit"]');
    try {
      if (button) button.disabled = true;
      showToast("Cancelling...");
      await call(kind === "sale" ? "cancelsale" : "cancelpurchase", payload);
      showToast((kind === "sale" ? "Sale " : "Purchase ") + (kind === "sale" ? doc.InvoiceNo : doc.ReferenceNo) + " cancelled.");
      showPage(back);
    } catch (error) {
      if (button) button.disabled = false;
      showError(error.message || "Could not cancel.");
    }
  });
}


/* ============================================================
   INVOICE PRINT (A4 and 80mm slip)
   ============================================================ */

async function printInvoice(saleId, size) {
  // Open the window right away (inside the click) so pop-up blockers allow it.
  const w = window.open("", "_blank", size === "slip" ? "width=420,height=800" : "width=1000,height=900");
  if (!w) { showError("Please allow pop-ups in your browser to print the invoice."); return; }
  w.document.write("<p style='font-family:Arial;padding:20px'>Loading invoice...</p>");
  try {
    const data = await call("saleinvoice", { saleId: saleId });
    w.document.open();
    w.document.write(size === "slip" ? invoiceSlipHtml(data) : invoiceA4Html(data));
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); }, 350);
  } catch (error) {
    w.close();
    showError(error.message || "Could not load invoice.");
  }
}

function invoiceTotals(data) {
  const sale = data.sale || {};
  const itemsTotal = (data.items || []).reduce(function (a, it) { return a + Number(it.lineTotal || 0); }, 0);
  return {
    itemsTotal: itemsTotal,
    discount: Number(sale.Discount || 0),
    net: Number(sale.NetTotal || 0),
    paid: Number(sale.Paid || 0),
    balance: Number(sale.Balance || 0),
    returned: Number(sale.ReturnedAmount || 0),
    cancelled: isCancelled(sale)
  };
}

function invoiceA4Html(data) {
  const sale = data.sale || {}, c = data.customer || {}, co = data.company || {};
  const t = invoiceTotals(data);
  const rows = (data.items || []).map(function (it, i) {
    return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(it.description || it.productId) + "</td><td class='num'>" + formatNumber(it.qty) +
      "</td><td class='num'>" + money(it.unitPrice) + "</td><td class='num'>" + (it.discount ? money(it.discount) : "") + "</td><td class='num'>" + money(it.lineTotal) + "</td></tr>";
  }).join("");
  const line = function (label, value, strong) {
    return "<tr" + (strong ? " class='strong'" : "") + "><td>" + label + "</td><td class='num'>" + value + "</td></tr>";
  };
  return "<!doctype html><html><head><meta charset='utf-8'><title>Invoice " + escapeHtml(sale.InvoiceNo || "") + "</title><style>" +
    "@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172033;font-size:12px;margin:0;position:relative}" +
    ".head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #172033;padding-bottom:10px;margin-bottom:14px}" +
    ".co{font-size:22px;font-weight:800;letter-spacing:1px}.muted{color:#64748b;font-size:11px;line-height:1.5}.title{font-size:18px;font-weight:700;text-align:right}" +
    ".boxes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}.box{border:1px solid #d9e0e8;border-radius:6px;padding:9px}.label{color:#64748b;font-size:9px;text-transform:uppercase;font-weight:700;margin-bottom:3px}" +
    "table.items{width:100%;border-collapse:collapse}table.items th{background:#eef2f7;border:1px solid #d9e0e8;padding:7px;text-align:left;font-size:10px;text-transform:uppercase}table.items td{border:1px solid #e1e6ed;padding:7px}" +
    ".num{text-align:right;white-space:nowrap}.totals{width:45%;margin-left:auto;margin-top:10px;border-collapse:collapse}.totals td{padding:5px 7px;border-bottom:1px solid #eef2f7}.totals .strong td{font-weight:800;font-size:14px;border-top:2px solid #172033}" +
    ".sign{display:flex;justify-content:space-between;margin-top:60px}.sign div{border-top:1px solid #94a3b8;width:200px;text-align:center;padding-top:5px;color:#64748b;font-size:11px}" +
    ".foot{margin-top:24px;text-align:center;color:#64748b;font-size:11px}.stamp{position:fixed;top:40%;left:15%;font-size:90px;color:rgba(190,18,60,.18);transform:rotate(-25deg);font-weight:900}" +
    "</style></head><body>" +
    (t.cancelled ? "<div class='stamp'>CANCELLED</div>" : "") +
    "<div class='head'><div><div class='co'>" + escapeHtml(co.name || "") + "</div><div class='muted'>" + escapeHtml(co.address || "") + (co.phone ? "<br>Phone: " + escapeHtml(co.phone) : "") + "</div></div>" +
    "<div><div class='title'>SALE INVOICE</div><div class='muted' style='text-align:right'>Invoice No: <b>" + escapeHtml(sale.InvoiceNo || "") + "</b><br>Date: " + escapeHtml(formatDate(sale.Date)) + "</div></div></div>" +
    "<div class='boxes'><div class='box'><div class='label'>Bill To</div><b>" + escapeHtml(c.name || "") + "</b><div class='muted'>" + escapeHtml(c.phone || "") + (c.address ? "<br>" + escapeHtml(c.address) : "") + "</div></div>" +
    "<div class='box'><div class='label'>Details</div><div class='muted'>Customer ID: " + escapeHtml(c.id || "") + (sale.SalespersonName && sale.SalespersonName !== "—" ? "<br>Salesperson: " + escapeHtml(sale.SalespersonName) : "") + (sale.Notes ? "<br>Notes: " + escapeHtml(sale.Notes) : "") + "</div></div></div>" +
    "<table class='items'><thead><tr><th>#</th><th>Description</th><th class='num'>Qty</th><th class='num'>Rate</th><th class='num'>Discount</th><th class='num'>Amount</th></tr></thead><tbody>" + rows + "</tbody></table>" +
    "<table class='totals'>" + line("Subtotal", money(t.itemsTotal)) + (t.discount ? line("Invoice Discount", "- " + money(t.discount)) : "") + line("Net Total", money(t.net), true) +
    line("Paid", money(t.paid)) + line("Balance on this invoice", money(t.balance)) + (t.returned ? line("Returned", "- " + money(t.returned)) : "") +
    line("Customer account balance", money(c.balance)) + "</table>" +
    "<div class='sign'><div>Customer Signature</div><div>Authorised Signature</div></div>" +
    "<div class='foot'>" + escapeHtml(co.footer || "") + "</div></body></html>";
}

function invoiceSlipHtml(data) {
  const sale = data.sale || {}, c = data.customer || {}, co = data.company || {};
  const t = invoiceTotals(data);
  const rows = (data.items || []).map(function (it) {
    return "<tr><td colspan='3'>" + escapeHtml(it.description || it.productId) + "</td></tr><tr class='sub'><td>" + formatNumber(it.qty) + " x " + money(it.unitPrice) +
      (it.discount ? " - " + money(it.discount) : "") + "</td><td></td><td class='num'>" + money(it.lineTotal) + "</td></tr>";
  }).join("");
  const line = function (label, value, strong) {
    return "<tr" + (strong ? " class='strong'" : "") + "><td colspan='2'>" + label + "</td><td class='num'>" + value + "</td></tr>";
  };
  return "<!doctype html><html><head><meta charset='utf-8'><title>Slip " + escapeHtml(sale.InvoiceNo || "") + "</title><style>" +
    "@page{size:80mm auto;margin:3mm}body{width:72mm;margin:0 auto;font-family:'Courier New',monospace;font-size:11px;color:#000}" +
    ".c{text-align:center}.co{font-size:15px;font-weight:700}hr{border:0;border-top:1px dashed #000;margin:5px 0}table{width:100%;border-collapse:collapse}td{padding:1px 0;vertical-align:top}" +
    ".num{text-align:right;white-space:nowrap}.sub td{padding-bottom:4px}.strong td{font-weight:700;font-size:13px}" +
    "</style></head><body>" +
    "<div class='c'><div class='co'>" + escapeHtml(co.name || "") + "</div>" + (co.address ? escapeHtml(co.address) + "<br>" : "") + (co.phone ? escapeHtml(co.phone) : "") + "</div><hr>" +
    (t.cancelled ? "<div class='c'><b>*** CANCELLED ***</b></div><hr>" : "") +
    "Invoice: <b>" + escapeHtml(sale.InvoiceNo || "") + "</b><br>Date: " + escapeHtml(formatDate(sale.Date)) + "<br>Customer: " + escapeHtml(c.name || "") + "<hr>" +
    "<table>" + rows + "</table><hr><table>" + line("Subtotal", money(t.itemsTotal)) + (t.discount ? line("Discount", "-" + money(t.discount)) : "") +
    line("TOTAL", money(t.net), true) + line("Paid", money(t.paid)) + line("Balance", money(t.balance)) + (t.returned ? line("Returned", "-" + money(t.returned)) : "") + "</table><hr>" +
    "<div class='c'>" + escapeHtml(co.footer || "") + "</div></body></html>";
}

function renderSaleSaved(result) {
  contentElement().innerHTML = `
    <div class="content">
      <div class="panel" style="max-width:620px;margin:0 auto;text-align:center;">
        <h2 style="margin-top:0;">Sale saved</h2>
        <p style="font-size:16px;margin:4px 0 14px;">Invoice <b>${escapeHtml(result.invoiceNo || "")}</b></p>
        <div class="stat-grid" style="margin-bottom:16px;">
          ${statCard("Net Total", money(result.netTotal), "", "green")}
          ${statCard("Paid", money(result.paid), "", "")}
          ${statCard("Balance", money(result.balance), "", "blue")}
        </div>
        <div class="form-actions" style="justify-content:center;flex-wrap:wrap;gap:8px;">
          ${actionButton("Print A4 Invoice", "printInvoice", [String(result.saleId), "a4"], "primary")}
          ${actionButton("Print Slip (80mm)", "printInvoice", [String(result.saleId), "slip"])}
          ${actionButton("Send on WhatsApp", "whatsappInvoice", [String(result.saleId)])}
          <button class="btn secondary" type="button" onclick="openSaleForm()">+ New Sale</button>
          <button class="btn secondary" type="button" onclick="showPage('sales')">View Sales</button>
        </div>
      </div>
    </div>`;
}


/* ============================================================
   STOCK ADJUSTMENT
   ============================================================ */

async function openStockAdjustForm(productId) {
  try {
    if (!state.products || !state.products.length) {
      const data = await call("apiProducts");
      state.products = Array.isArray(data) ? data : [];
    }
  } catch (error) { showError(error.message); return; }

  const products = state.products.slice().sort(function (a, b) { return String(a.Description || "").localeCompare(String(b.Description || "")); });
  const options = products.map(function (p) {
    const id = String(p.ProductID == null ? "" : p.ProductID);
    return '<option value="' + escapeHtml(id) + '"' + (id === String(productId || "") ? " selected" : "") + ">" +
      escapeHtml((p.Description || id) + "  (stock " + (Number(p.CurrentStock) || 0) + ")") + "</option>";
  }).join("");

  contentElement().innerHTML = `
    <div class="content">
      <div class="panel">
        <div class="panel-header">
          <h2>Stock Adjustment</h2>
          <button class="btn secondary" type="button" onclick="showPage('stock')">Back</button>
        </div>
        <p style="margin:0 0 12px;">Use this only for stock changes that are not a purchase, sale or return, such as damaged, lost or miscounted items.</p>
        <form id="adjustForm" class="erp-form">
          <label>Product<select name="productId" required><option value="">Select product...</option>${options}</select></label>
          <div class="form-grid">
            <label>Adjustment<select name="direction"><option value="remove">Remove from stock</option><option value="add">Add to stock</option></select></label>
            <label>Quantity<input type="number" name="qty" min="1" step="1" required></label>
            <label>Reason<select name="reason">
              <option>Damaged</option><option>Lost / missing</option><option>Stock count correction</option>
              <option>Found during stock count</option><option>Used in shop / display</option><option>Other</option>
            </select></label>
            <label>Date<input type="date" name="date" value="${todayInput()}" required></label>
          </div>
          <label>Notes<input name="notes" autocomplete="off" placeholder="Details (optional)"></label>
          <p id="adjustPreview" style="margin:8px 0 0;"></p>
          <div class="form-actions"><button type="submit" class="btn primary">Save Adjustment</button></div>
        </form>
      </div>
    </div>`;

  const form = $("adjustForm");
  const preview = function () {
    const p = state.products.find(function (x) { return String(x.ProductID) === form.productId.value; });
    const el = document.getElementById("adjustPreview");
    if (!el) return;
    if (!p) { el.textContent = ""; return; }
    const cur = Number(p.CurrentStock) || 0;
    const q = Number(form.qty.value) || 0;
    const after = form.direction.value === "add" ? cur + q : cur - q;
    el.innerHTML = "Current stock: <b>" + formatNumber(cur) + "</b> &nbsp;→&nbsp; after adjustment: <b>" + formatNumber(after) + "</b>" +
      (after < 0 ? " <span class='badge danger'>Not enough stock</span>" : "");
  };
  form.addEventListener("input", preview);
  form.addEventListener("change", preview);
  preview();
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const q = Number(form.qty.value) || 0;
    if (!form.productId.value) { showError("Please select a product."); return; }
    if (q <= 0) { showError("Enter a quantity greater than zero."); return; }
    const notes = form.notes.value.trim();
    const payload = {
      productId: form.productId.value,
      qty: form.direction.value === "add" ? q : -q,
      reason: form.reason.value + (notes ? " - " + notes : ""),
      date: form.date.value
    };
    const button = form.querySelector('button[type="submit"]');
    try {
      if (button) button.disabled = true;
      showToast("Saving adjustment...");
      const result = await call("stockadjust", payload);
      showToast("Stock updated: " + result.before + " → " + result.after);
      state.products = [];
      showPage("stock");
    } catch (error) {
      if (button) button.disabled = false;
      showError(error.message || "Could not save adjustment.");
    }
  });
}


/* ============================================================
   REPORTS
   ============================================================ */

const REPORT_TABS = [
  { id: "pl", label: "Profit & Loss" },
  { id: "items", label: "Item Profit" },
  { id: "aging", label: "Receivable Aging" },
  { id: "dead", label: "Dead Stock" },
  { id: "cash", label: "Cash Book" }
];

function ymd(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function reportPreset(name) {
  const now = new Date();
  if (name === "today") return [ymd(now), ymd(now)];
  if (name === "month") return [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), ymd(now)];
  if (name === "lastmonth") return [ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), ymd(new Date(now.getFullYear(), now.getMonth(), 0))];
  if (name === "year") return [ymd(new Date(now.getFullYear(), 0, 1)), ymd(now)];
  return ["", ""];
}

function reportState() {
  if (!state.report) {
    const m = reportPreset("month"), t = reportPreset("today");
    state.report = { tab: "pl", from: m[0], to: m[1], cashFrom: t[0], cashTo: t[1], days: 90, openingCash: "", data: null };
  }
  return state.report;
}

async function loadReports(tab) {
  const rs = reportState();
  if (tab) rs.tab = tab;
  renderLoading();
  let data;
  if (rs.tab === "pl") data = await call("profitloss", { dateFrom: rs.from, dateTo: rs.to });
  else if (rs.tab === "items") data = await call("itemprofit", { dateFrom: rs.from, dateTo: rs.to });
  else if (rs.tab === "aging") data = await call("aging", {});
  else if (rs.tab === "dead") data = await call("deadstock", { days: rs.days });
  else data = await call("cashbook", { dateFrom: rs.cashFrom, dateTo: rs.cashTo });
  rs.data = data || {};
  renderReports();
}

function switchReportTab(tab) {
  loadReports(tab).catch(function (e) { showError(e.message); });
}

function applyReportFilter(preset) {
  const rs = reportState();
  const form = document.getElementById("reportFilterForm");
  if (rs.tab === "dead") {
    rs.days = Number(form.days.value) || 90;
  } else if (rs.tab === "cash") {
    if (preset) { const r = reportPreset(preset); rs.cashFrom = r[0]; rs.cashTo = r[1]; }
    else { rs.cashFrom = form.dateFrom.value; rs.cashTo = form.dateTo.value; }
    if (form.openingCash) rs.openingCash = form.openingCash.value;
  } else {
    if (preset) { const r = reportPreset(preset); rs.from = r[0]; rs.to = r[1]; }
    else { rs.from = form.dateFrom.value; rs.to = form.dateTo.value; }
  }
  const f = rs.tab === "cash" ? rs.cashFrom : rs.from, t = rs.tab === "cash" ? rs.cashTo : rs.to;
  if (f && t && f > t) { showError("From date cannot be after To date."); return; }
  loadReports().catch(function (e) { showError(e.message); });
}

function fmtCell(value, type) {
  if (value === null || value === undefined || value === "") return type === "money" || type === "num" ? "" : "—";
  if (type === "money") return money(value);
  if (type === "num") return formatNumber(value);
  if (type === "pct") return formatNumber(value) + "%";
  if (type === "date") return formatDate(value);
  return escapeHtml(String(value));
}

function plainCell(value, type) {
  if (value === null || value === undefined) return "";
  if (type === "date") return value ? formatDate(value) : "";
  return String(value);
}

function monthLabel(ym) {
  const parts = String(ym || "").split("-");
  if (parts.length < 2) return ym;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, 1).toLocaleDateString("en-PK", { month: "short", year: "numeric" });
}

// Turns the loaded data into { cards, tables[{title, columns, rows, totals}], notes, period }
function reportSpec() {
  const rs = reportState();
  const d = rs.data || {};
  const period = (d.dateFrom || "Start") + " to " + (d.dateTo || "Today");

  if (rs.tab === "pl") {
    const t = d.totals || {};
    const notes = [];
    if (d.missingCostItems) notes.push(d.missingCostItems + " sold item line(s) have no purchase cost, so profit is shown higher than it really is. Set the purchase price on those products.");
    notes.push("Stock adjustments are valued at each product's current purchase price.");
    return {
      title: "Profit & Loss", period: period, notes: notes,
      cards: [
        ["Net Sales", money(t.netSales || 0), (t.invoices || 0) + " invoice(s), returns " + money(t.returns || 0), "green"],
        ["Gross Profit", money(t.grossProfit || 0), formatNumber(t.grossMargin || 0) + "% of sales", "blue"],
        ["Expenses", money(t.expenses || 0), "Stock adjustments " + money(t.adjustments || 0), ""],
        ["Net Profit", money(t.netProfit || 0), formatNumber(t.netMargin || 0) + "% of sales", (t.netProfit || 0) < 0 ? "red" : "green"]
      ],
      tables: [
        { title: "Month by month", columns: [["month", "Month", "text"], ["sales", "Sales", "money"], ["returns", "Returns", "money"], ["netSales", "Net Sales", "money"], ["cogs", "Cost of Goods", "money"], ["grossProfit", "Gross Profit", "money"], ["expenses", "Expenses", "money"], ["adjustments", "Stock Adj.", "money"], ["netProfit", "Net Profit", "money"]],
          rows: (d.months || []).map(function (m) { return Object.assign({}, m, { month: monthLabel(m.month) }); }),
          totals: Object.assign({ month: "TOTAL" }, t) },
        { title: "Expenses by category", columns: [["category", "Category", "text"], ["amount", "Amount", "money"]],
          rows: d.expensesByCategory || [], totals: { category: "TOTAL", amount: t.expenses || 0 } }
      ]
    };
  }

  if (rs.tab === "items") {
    const rows = d.rows || [];
    const sum = function (f) { return rows.reduce(function (a, r) { return a + Number(r[f] || 0); }, 0); };
    const rev = sum("revenue"), profit = sum("profit");
    const missing = rows.filter(function (r) { return r.missingCost; }).length;
    return {
      title: "Item Profit", period: period,
      notes: missing ? [missing + " product(s) were sold without a purchase cost; their profit is overstated (marked *)."] : [],
      cards: [
        ["Products Sold", formatNumber(rows.length), formatNumber(sum("qty")) + " units", ""],
        ["Revenue", money(rev), "After returns and invoice discounts", "green"],
        ["Profit", money(profit), (rev ? formatNumber(Math.round(profit / rev * 10000) / 100) : 0) + "% margin", "blue"]
      ],
      tables: [{ title: "Most profitable first", columns: [["description", "Product", "text"], ["brand", "Brand", "text"], ["category", "Category", "text"], ["qty", "Qty Sold", "num"], ["revenue", "Revenue", "money"], ["cost", "Cost", "money"], ["profit", "Profit", "money"], ["margin", "Margin", "pct"]],
        rows: rows.map(function (r) { return Object.assign({}, r, { description: r.description + (r.missingCost ? " *" : "") }); }),
        totals: { description: "TOTAL", qty: sum("qty"), revenue: rev, cost: sum("cost"), profit: profit } }]
    };
  }

  if (rs.tab === "aging") {
    const t = d.totals || {};
    return {
      title: "Receivable Aging", period: "As of " + formatDate(d.asOf),
      notes: ["Each customer's balance is matched to their most recent sales first; older sales are assumed paid first.", "Balances brought forward without a dated sale are counted as over 90 days."],
      cards: [
        ["Total Receivable", money(t.balance || 0), (d.rows || []).length + " customer(s)", "blue"],
        ["0–30 days", money(t.d0_30 || 0), "", "green"],
        ["31–90 days", money((t.d31_60 || 0) + (t.d61_90 || 0)), "", ""],
        ["Over 90 days", money(t.d90 || 0), (t.overLimitCount || 0) + " over credit limit", "red"]
      ],
      tables: [{ title: "Customers (oldest dues first)", columns: [["name", "Customer", "text"], ["phone", "Phone", "text"], ["balance", "Balance", "money"], ["d0_30", "0–30", "money"], ["d31_60", "31–60", "money"], ["d61_90", "61–90", "money"], ["d90", "90+", "money"], ["lastPayment", "Last Payment", "date"], ["creditLimit", "Credit Limit", "money"], ["limitStatus", "Limit", "text"], ["remind", "Remind", "wa"]],
        rows: (d.rows || []).map(function (r) { return Object.assign({}, r, { creditLimit: r.creditLimit || "", limitStatus: r.overLimit ? "Over limit" : (r.creditLimit ? "OK" : "") }); }),
        totals: Object.assign({ name: "TOTAL" }, t) }]
    };
  }

  if (rs.tab === "dead") {
    const t = d.totals || {};
    return {
      title: "Dead Stock", period: "No sale in the last " + (d.days || rs.days) + " days, as of " + formatDate(d.asOf),
      notes: ["Value is at current purchase price. Consider discounts or returning these items to the supplier."],
      cards: [
        ["Items", formatNumber(t.items || 0), formatNumber(t.qty || 0) + " units in stock", ""],
        ["Money Stuck", money(t.value || 0), "At purchase price", "red"]
      ],
      tables: [{ title: "Highest value first", columns: [["description", "Product", "text"], ["brand", "Brand", "text"], ["category", "Category", "text"], ["stock", "In Stock", "num"], ["cost", "Unit Cost", "money"], ["value", "Value", "money"], ["lastSale", "Last Sold", "date"], ["daysSinceSale", "Days", "num"], ["lastReceived", "Last Received", "date"]],
        rows: (d.rows || []).map(function (r) { return Object.assign({}, r, { lastSale: r.lastSale || "Never" }); }),
        totals: { description: "TOTAL", stock: t.qty, value: t.value } }]
    };
  }

  // cash
  const t = d.totals || {};
  const cash = (d.methods || []).find(function (m) { return m.method === "cash"; }) || { moneyIn: 0, moneyOut: 0, net: 0 };
  const opening = rs.openingCash === "" ? null : Number(rs.openingCash) || 0;
  return {
    title: "Cash Book", period: period,
    notes: ["Includes customer receipts, refunds, supplier payments and expenses recorded in the ERP."],
    cards: [
      ["Money In", money(t.moneyIn || 0), "All methods", "green"],
      ["Money Out", money(t.moneyOut || 0), "All methods", "red"],
      ["Cash Net", money(cash.net), "Cash in " + money(cash.moneyIn) + ", out " + money(cash.moneyOut), "blue"],
      ["Expected Cash in Hand", opening === null ? "—" : money(opening + cash.net), opening === null ? "Enter opening cash above" : "Opening " + money(opening) + " + cash net", ""]
    ],
    tables: [
      { title: "By payment method", columns: [["method", "Method", "text"], ["moneyIn", "In", "money"], ["moneyOut", "Out", "money"], ["net", "Net", "money"]],
        rows: (d.methods || []).map(function (m) { return Object.assign({}, m, { method: m.method.charAt(0).toUpperCase() + m.method.slice(1) }); }),
        totals: { method: "TOTAL", moneyIn: t.moneyIn, moneyOut: t.moneyOut, net: (t.moneyIn || 0) - (t.moneyOut || 0) } },
      { title: "Transactions", columns: [["date", "Date", "date"], ["type", "Type", "text"], ["party", "Party", "text"], ["reference", "Reference", "text"], ["method", "Method", "text"], ["moneyIn", "In", "money"], ["moneyOut", "Out", "money"], ["notes", "Notes", "text"]],
        rows: d.rows || [], totals: { date: "TOTAL", moneyIn: t.moneyIn, moneyOut: t.moneyOut } }
    ]
  };
}

function exportTable(tb) {
  return Object.assign({}, tb, { columns: tb.columns.filter(function (c) { return c[2] !== "wa"; }) });
}

function reportTableHtml(tb) {
  const isNum = function (type) { return type === "money" || type === "num" || type === "pct"; };
  const head = tb.columns.map(function (c) { return "<th" + (isNum(c[2]) ? ' class="num"' : "") + ">" + escapeHtml(c[1]) + "</th>"; }).join("");
  const body = tb.rows.length ? tb.rows.map(function (r) {
    return "<tr>" + tb.columns.map(function (c) {
      let v = c[2] === "wa" ? actionButton("WhatsApp", "whatsappReminder", [String(r.customerId), Number(r.balance) || 0]) : fmtCell(r[c[0]], c[2]);
      if (c[0] === "limitStatus" && r.overLimit) v = '<span class="badge danger">Over limit</span>';
      if (c[2] === "money" && Number(r[c[0]]) < 0) v = '<span style="color:#be123c">' + v + "</span>";
      return "<td" + (isNum(c[2]) ? ' class="num"' : "") + ">" + v + "</td>";
    }).join("") + "</tr>";
  }).join("") : '<tr><td colspan="' + tb.columns.length + '" class="empty">No records for this period.</td></tr>';
  const foot = tb.totals && tb.rows.length ? "<tfoot><tr>" + tb.columns.map(function (c, i) {
    const v = tb.totals[c[0]];
    return "<td" + (isNum(c[2]) ? ' class="num"' : "") + "><b>" + (v === undefined || (i > 0 && !isNum(c[2])) ? "" : (i === 0 ? escapeHtml(String(v)) : fmtCell(v, c[2]))) + "</b></td>";
  }).join("") + "</tr></tfoot>" : "";
  return '<table class="table"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody>" + foot + "</table>";
}

function renderReports() {
  const rs = reportState();
  const spec = reportSpec();
  const dateFilter = function (from, to) {
    return `
      <label>From<input type="date" name="dateFrom" value="${escapeHtml(from || "")}"></label>
      <label>To<input type="date" name="dateTo" value="${escapeHtml(to || "")}"></label>`;
  };
  const presets = function (list) {
    return '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;">' + list.map(function (p) {
      return actionButton(p[1], "applyReportFilter", [p[0]]);
    }).join("") + "</div>";
  };
  let filter = "";
  if (rs.tab === "pl" || rs.tab === "items") {
    filter = dateFilter(rs.from, rs.to) + '<label style="display:flex;align-items:flex-end;"><button type="submit" class="btn primary">Apply</button></label>' +
      presets([["month", "This Month"], ["lastmonth", "Last Month"], ["year", "This Year"], ["all", "All Time"]]);
  } else if (rs.tab === "dead") {
    filter = '<label>No sale in the last<select name="days">' + [30, 60, 90, 180, 365].map(function (n) {
      return '<option value="' + n + '"' + (Number(rs.days) === n ? " selected" : "") + ">" + n + " days</option>";
    }).join("") + '</select></label><label style="display:flex;align-items:flex-end;"><button type="submit" class="btn primary">Apply</button></label>';
  } else if (rs.tab === "cash") {
    filter = dateFilter(rs.cashFrom, rs.cashTo) +
      '<label>Opening Cash<input type="number" name="openingCash" step="0.01" placeholder="Cash in drawer at start" value="' + escapeHtml(String(rs.openingCash)) + '"></label>' +
      '<label style="display:flex;align-items:flex-end;"><button type="submit" class="btn primary">Apply</button></label>' +
      presets([["today", "Today"], ["month", "This Month"]]);
  }

  contentElement().innerHTML = `
    <div class="content">
      <div class="toolbar">
        <div><h2>Reports</h2><p>${escapeHtml(spec.title)} · ${escapeHtml(spec.period)}</p></div>
        <div style="display:flex;gap:8px;">
          <button class="btn secondary" type="button" onclick="downloadReportCsv()">Download CSV</button>
          <button class="btn primary" type="button" onclick="printReport()">Print A4</button>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
        ${REPORT_TABS.map(function (t) {
          return actionButton(t.label, "switchReportTab", [t.id], t.id === rs.tab ? "primary" : "secondary");
        }).join("")}
      </div>
      ${filter ? '<div class="panel" style="margin-bottom:16px;"><form id="reportFilterForm" class="form-grid erp-form" onsubmit="applyReportFilter(); return false;">' + filter + "</form></div>" : ""}
      <div class="stat-grid">${spec.cards.map(function (c) { return statCard(c[0], c[1], c[2], c[3]); }).join("")}</div>
      ${spec.tables.map(function (tb) {
        return '<div class="panel" style="margin-bottom:16px;"><div class="panel-header"><h3>' + escapeHtml(tb.title) + '</h3></div><div class="table-wrap">' + reportTableHtml(tb) + "</div></div>";
      }).join("")}
      ${spec.notes.length ? '<div class="panel"><small>' + spec.notes.map(escapeHtml).join("<br>") + "</small></div>" : ""}
    </div>`;
}

function downloadReportCsv() {
  const spec = reportSpec();
  const esc = function (v) { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [esc(spec.title + " - " + spec.period), ""];
  spec.tables.map(exportTable).forEach(function (tb) {
    lines.push(esc(tb.title));
    lines.push(tb.columns.map(function (c) { return esc(c[1]); }).join(","));
    tb.rows.forEach(function (r) { lines.push(tb.columns.map(function (c) { return esc(plainCell(r[c[0]], c[2])); }).join(",")); });
    if (tb.totals && tb.rows.length) lines.push(tb.columns.map(function (c) { const v = tb.totals[c[0]]; return esc(v == null ? "" : plainCell(v, c[2])); }).join(","));
    lines.push("");
  });
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = spec.title.replace(/[^A-Za-z0-9]+/g, "-") + "-" + ymd(new Date()) + ".csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function printReport() {
  const spec = reportSpec();
  const w = window.open("", "_blank", "width=1100,height=850");
  if (!w) { showError("Please allow pop-ups in your browser to print the report."); return; }
  const wide = spec.tables.some(function (tb) { return tb.columns.length > 7; });
  w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>" + escapeHtml(spec.title) + "</title><style>@page{size:A4 " + (wide ? "landscape" : "portrait") + ";margin:10mm}" +
    "body{font-family:Arial,sans-serif;color:#172033;font-size:10.5px}h1{font-size:19px;margin:0}h2{font-size:15px;margin:2px 0}h3{font-size:12px;margin:14px 0 6px}" +
    ".cards{display:flex;gap:8px;margin:10px 0}.card{flex:1;border:1px solid #d9e0e8;border-radius:5px;padding:7px}.card span{display:block;color:#64748b;font-size:8.5px;text-transform:uppercase;font-weight:700}.card b{font-size:13px}" +
    "table{width:100%;border-collapse:collapse}th,td{border:1px solid #dde3ea;padding:5px}th{background:#eef2f7;text-align:left;font-size:9px;text-transform:uppercase}.num{text-align:right;white-space:nowrap}tfoot td{background:#f7f9fc}.badge{color:#be123c;font-weight:700}.notes{margin-top:12px;color:#64748b}tr{page-break-inside:avoid}</style></head><body>" +
    "<h1>ARHAM ELECTRONICS</h1><h2>" + escapeHtml(spec.title) + "</h2><div>" + escapeHtml(spec.period) + " &nbsp;|&nbsp; Printed: " + escapeHtml(formatDate(new Date())) + "</div>" +
    "<div class='cards'>" + spec.cards.map(function (c) { return "<div class='card'><span>" + escapeHtml(c[0]) + "</span><b>" + escapeHtml(c[1]) + "</b></div>"; }).join("") + "</div>" +
    spec.tables.map(exportTable).map(function (tb) { return "<h3>" + escapeHtml(tb.title) + "</h3>" + reportTableHtml(tb); }).join("") +
    (spec.notes.length ? "<div class='notes'>" + spec.notes.map(escapeHtml).join("<br>") + "</div>" : "") + "</body></html>");
  w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 350);
}


/* ============================================================
   COMPANY SETTINGS (cached)
   ============================================================ */

async function getCompany() {
  if (!state.settings) {
    try { state.settings = await call("settings"); }
    catch (error) { return { name: "ARHAM ELECTRONICS", address: "", phone: "", footer: "" }; }
  }
  return (state.settings && state.settings.company) || { name: "ARHAM ELECTRONICS" };
}


/* ============================================================
   WHATSAPP
   ============================================================ */

function phoneOf(party) {
  if (!party) return "";
  return String(party.Phone || party.Mobile || party.Contact || party.PhoneNo || party.Cell || party.phone || "");
}

// Pakistani numbers: 0300-1234567 / 300 1234567 / +92 300 1234567 -> 923001234567
function waNumber(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.indexOf("00") === 0) d = d.slice(2);
  if (d.length === 11 && d.charAt(0) === "0") d = "92" + d.slice(1);
  else if (d.length === 10 && d.charAt(0) === "3") d = "92" + d;
  return d.length >= 10 ? d : "";
}

// Shows the message inside the portal with an editable number and a real
// "Open WhatsApp" link. A link the user clicks is never blocked by the
// browser, and no hidden prompt or blank tab is involved.
function showWhatsAppPanel(title, name, phone, text) {
  const old = document.getElementById("waOverlay");
  if (old) old.remove();
  const overlay = document.createElement("div");
  overlay.id = "waOverlay";
  overlay.className = "wa-overlay";
  overlay.innerHTML =
    '<div class="wa-modal" role="dialog" aria-modal="true">' +
      '<div class="wa-head"><h3>' + escapeHtml(title) + '</h3><button type="button" class="btn secondary" data-close>Close</button></div>' +
      '<label>WhatsApp number' + (name ? ' for <b>' + escapeHtml(name) + '</b>' : '') +
        '<input id="waNumber" type="tel" inputmode="tel" placeholder="e.g. 0300 1234567" value="' + escapeHtml(phone || "") + '"></label>' +
      '<small id="waHint"></small>' +
      '<label>Message<textarea id="waText" rows="10">' + escapeHtml(text) + '</textarea></label>' +
      '<div class="wa-actions">' +
        '<button type="button" class="btn secondary" id="waCopy">Copy Message</button>' +
        '<a id="waLink" class="btn primary" target="_blank" rel="noopener">Open WhatsApp</a>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const numberInput = overlay.querySelector("#waNumber");
  const textInput = overlay.querySelector("#waText");
  const link = overlay.querySelector("#waLink");
  const hint = overlay.querySelector("#waHint");
  const update = function () {
    const num = waNumber(numberInput.value);
    link.href = "https://wa.me/" + num + "?text=" + encodeURIComponent(textInput.value);
    link.classList.toggle("disabled", !num);
    link.setAttribute("aria-disabled", num ? "false" : "true");
    hint.textContent = num ? "Will open a chat with +" + num : "Enter a valid mobile number to continue.";
  };
  numberInput.addEventListener("input", update);
  textInput.addEventListener("input", update);
  link.addEventListener("click", function (event) {
    if (!waNumber(numberInput.value)) { event.preventDefault(); numberInput.focus(); return; }
    setTimeout(function () { overlay.remove(); }, 300);
  });
  overlay.querySelector("#waCopy").addEventListener("click", function () {
    const fallback = function () { textInput.select(); document.execCommand("copy"); showToast("Message copied."); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textInput.value).then(function () { showToast("Message copied."); }, fallback);
    } else { fallback(); }
  });
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay || event.target.hasAttribute("data-close")) overlay.remove();
  });
  update();
  if (!waNumber(numberInput.value)) numberInput.focus();
}

function invoiceMessage(data) {
  const sale = data.sale || {}, c = data.customer || {}, co = data.company || {};
  const t = invoiceTotals(data);
  const lines = [];
  lines.push("*" + (co.name || "ARHAM ELECTRONICS") + "*");
  lines.push("Invoice " + (sale.InvoiceNo || "") + " | " + formatDate(sale.Date));
  if (t.cancelled) lines.push("*CANCELLED*");
  lines.push("Customer: " + (c.name || ""));
  lines.push("");
  (data.items || []).forEach(function (it) {
    lines.push((it.description || it.productId) + "\n  " + formatNumber(it.qty) + " x " + money(it.unitPrice) +
      (it.discount ? " - " + money(it.discount) : "") + " = " + money(it.lineTotal));
  });
  lines.push("");
  if (t.discount) { lines.push("Subtotal: " + money(t.itemsTotal)); lines.push("Discount: " + money(t.discount)); }
  lines.push("*Total: " + money(t.net) + "*");
  lines.push("Paid: " + money(t.paid));
  lines.push("Balance on this invoice: " + money(t.balance));
  if (t.returned) lines.push("Returned: " + money(t.returned));
  lines.push("Your account balance: " + money(c.balance));
  if (co.footer) { lines.push(""); lines.push(co.footer); }
  return lines.join("\n");
}

async function whatsappInvoice(saleId) {
  try {
    showToast("Preparing message...");
    const data = await call("saleinvoice", { saleId: saleId });
    const c = data.customer || {};
    showWhatsAppPanel("Send Invoice " + ((data.sale || {}).InvoiceNo || ""), c.name, c.phone, invoiceMessage(data));
  } catch (error) {
    showError(error.message || "Could not prepare the invoice message.");
  }
}

async function whatsappStatement(partyType) {
  const isCust = partyType !== "supplier";
  const id = isCust ? window._ledgerSelectedCustomerId : window._ledgerSelectedPartyId;
  const list = isCust ? state.customers : state.suppliers;
  const party = (list || []).find(function (x) { return String(isCust ? x.CustomerID : x.SupplierID) === String(id); });
  if (!party) { showError("Please select an account and load the ledger first."); return; }
  const co = await getCompany();
  const rows = Array.isArray(state.ledger) ? state.ledger : [];
  const debit = rows.reduce(function (a, r) { return a + (Number(r.Debit) || 0); }, 0);
  const credit = rows.reduce(function (a, r) { return a + (Number(r.Credit) || 0); }, 0);
  const balance = rows.length ? Number(rows[rows.length - 1].Balance) || 0 : Number(party.ClosingBalance) || 0;
  const lines = ["*" + (co.name || "ARHAM ELECTRONICS") + "*", "Account statement: " + (party.Name || id),
    "Period: " + (window._ledgerFrom || "Start") + " to " + (window._ledgerTo || "Today"), ""];
  const recent = rows.slice(-10);
  if (rows.length > recent.length) lines.push("Last " + recent.length + " of " + rows.length + " entries:");
  recent.forEach(function (r) {
    lines.push(formatDate(r.Date) + " | " + (r.Particular || r.Ref || "") + " | " + (Number(r.Debit) ? "Dr " + money(r.Debit) : "Cr " + money(r.Credit)));
  });
  lines.push("");
  lines.push((isCust ? "Total charges: " : "Total paid: ") + money(debit));
  lines.push((isCust ? "Total received: " : "Total purchases: ") + money(credit));
  lines.push("*" + (isCust ? "Balance due: " : "Balance payable: ") + money(balance) + "*");
  showWhatsAppPanel("Send Account Statement", party.Name, phoneOf(party), lines.join("\n"));
}

async function whatsappReminder(customerId, amount) {
  const c = (state.customers || []).find(function (x) { return String(x.CustomerID) === String(customerId); }) ||
    ((reportState().data || {}).rows || []).map(function (r) { return { CustomerID: r.customerId, Name: r.name, Phone: r.phone, ClosingBalance: r.balance }; })
      .find(function (x) { return String(x.CustomerID) === String(customerId); });
  if (!c) { showError("Customer not found."); return; }
  const co = await getCompany();
  const due = amount != null ? amount : Number(c.ClosingBalance) || 0;
  showWhatsAppPanel("Send Payment Reminder", c.Name, phoneOf(c), "Dear " + (c.Name || "Customer") + ",\nThis is a friendly reminder from " + (co.name || "ARHAM ELECTRONICS") +
    " that your outstanding balance is *" + money(due) + "*.\nPlease arrange the payment at your earliest convenience." +
    (co.phone ? "\nFor any query, call " + co.phone + "." : "") + "\nThank you.");
}


/* ============================================================
   LIVE TOTALS ON SALE / PURCHASE FORMS
   ============================================================ */

function attachLiveTotals(form, priceName, defaultPriceField) {
  if (!form || form._liveTotals) return;
  form._liveTotals = true;
  const box = document.createElement("div");
  box.className = "live-totals";
  const actions = form.querySelector(".form-actions");
  if (actions) form.insertBefore(box, actions); else form.appendChild(box);

  const productOf = function (id) {
    return (state.products || []).find(function (p) { return String(p.ProductID) === String(id); });
  };
  const recalc = function () {
    let subtotal = 0, count = 0;
    form.querySelectorAll(".item-row").forEach(function (row) {
      const sel = row.querySelector('[name="productId"]');
      const priceInput = row.querySelector('[name="' + priceName + '"]');
      const p = sel ? productOf(sel.value) : null;
      if (priceInput) priceInput.placeholder = p && defaultPriceField && Number(p[defaultPriceField])
        ? "Price " + money(p[defaultPriceField]) : (priceName === "unitCost" ? "Unit Cost" : "Price");
      const qty = Number((row.querySelector('[name="qty"]') || {}).value) || 0;
      let price = priceInput && priceInput.value !== "" ? Number(priceInput.value) : (p && defaultPriceField ? Number(p[defaultPriceField]) || 0 : 0);
      const disc = Number((row.querySelector('[name="discount"]') || {}).value) || 0;
      if (sel && sel.value && qty > 0) count++;
      subtotal += Math.max(0, qty * price - disc);
    });
    const discount = form.discount ? Number(form.discount.value) || 0 : 0;
    const net = Math.max(0, subtotal - discount);
    const paid = form.paid ? Number(form.paid.value) || 0 : 0;
    box.innerHTML =
      "<div><span>Items</span><b>" + count + "</b></div>" +
      "<div><span>Subtotal</span><b>" + money(subtotal) + "</b></div>" +
      "<div><span>Net Total</span><b>" + money(net) + "</b></div>" +
      "<div><span>Balance</span><b>" + money(net - paid) + "</b></div>";
  };
  form.addEventListener("input", recalc);
  form.addEventListener("change", recalc);
  form.addEventListener("click", function () { setTimeout(recalc, 0); });
  recalc();
}


/* ============================================================
   SETTINGS PAGE
   ============================================================ */

async function loadSettingsPage() {
  state.settings = await call("settings");
  renderSettingsPage();
}

function renderSettingsPage() {
  const s = state.settings || {};
  const co = s.company || {};
  const b = s.backup || {};
  const status = b.enabled === true ? '<span class="badge success">On — every night around 2 AM</span>'
    : (b.enabled === false ? '<span class="badge danger">Off</span>' : '<span class="badge warning">Not set up yet</span>');

  contentElement().innerHTML = `
    <div class="content">
      <div class="toolbar"><div><h2>Settings</h2><p>Company details for invoices, and data backup.</p></div></div>

      <div class="panel" style="margin-bottom:16px;">
        <div class="panel-header"><h3>Company Details</h3></div>
        <form id="companyForm" class="erp-form">
          <div class="form-grid">
            <label>Company Name<input name="companyName" value="${escapeHtml(co.name || "")}" required autocomplete="off"></label>
            <label>Phone<input name="companyPhone" value="${escapeHtml(co.phone || "")}" autocomplete="off"></label>
          </div>
          <label>Address<input name="companyAddress" value="${escapeHtml(co.address || "")}" autocomplete="off"></label>
          <label>Invoice Footer<input name="invoiceFooter" value="${escapeHtml(co.footer || "")}" autocomplete="off" placeholder="e.g. Thank you for your business."></label>
          <div class="form-actions"><button type="submit" class="btn primary">Save Details</button></div>
        </form>
      </div>

      <div class="panel">
        <div class="panel-header"><h3>Backup</h3></div>
        <p style="margin:0 0 8px;">Daily backup: ${status}</p>
        <p style="margin:0 0 8px;">Last backup: <b>${b.lastAt ? escapeHtml(formatDate(b.lastAt)) + " " + escapeHtml(String(b.lastAt).slice(11, 16)) : "Never"}</b>
          ${b.lastUrl ? ' &nbsp;<a href="' + escapeHtml(b.lastUrl) + '" target="_blank" rel="noopener">Open</a>' : ""}
          ${b.folderUrl ? ' &nbsp;·&nbsp; <a href="' + escapeHtml(b.folderUrl) + '" target="_blank" rel="noopener">All backups</a>' : ""}</p>
        <p style="margin:0 0 12px;"><small>A full copy of the Google Sheet is saved in your Google Drive folder "Arham ERP Backups". The newest ${escapeHtml(String(b.keep || 30))} copies are kept.</small></p>
        ${b.enabled !== true ? '<p style="margin:0 0 12px;"><small>To turn on the daily backup, open the Apps Script editor, choose <b>setupDailyBackup</b> from the function list, press <b>Run</b> and allow access. This is needed only once.</small></p>' : ""}
        <button class="btn secondary" type="button" onclick="backupNow()">Back Up Now</button>
      </div>
    </div>`;

  $("companyForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    try {
      if (button) button.disabled = true;
      showToast("Saving...");
      state.settings = await call("savesettings", {
        companyName: form.companyName.value.trim(), companyPhone: form.companyPhone.value.trim(),
        companyAddress: form.companyAddress.value.trim(), invoiceFooter: form.invoiceFooter.value.trim()
      });
      showToast("Company details saved.");
      renderSettingsPage();
    } catch (error) {
      if (button) button.disabled = false;
      showError(error.message || "Could not save.");
    }
  });
}

async function backupNow() {
  try {
    showToast("Backing up... this can take up to a minute.");
    const result = await call("backupnow", {});
    showToast("Backup saved: " + result.name);
    await loadSettingsPage();
  } catch (error) {
    const msg = String(error.message || "");
    showError(/authori[sz]|permission|DriveApp/i.test(msg)
      ? "Backup needs one-time permission. In the Apps Script editor, run setupDailyBackup and allow access, then try again."
      : (msg || "Backup failed."));
  }
}


/* ============================================================
   PRODUCT ADD / EDIT
   ============================================================ */

function openProductForm(productId) {
  const editing = productId != null && productId !== "";
  const p = editing
    ? (state.products.find(function (x) { return String(x.ProductID) === String(productId); }) || null)
    : {};
  if (editing && !p) { showError("Product not found. Please refresh."); return; }

  const v = function (field) { return escapeHtml(String(p[field] ?? "")); };
  const datalist = function (id, field) {
    const seen = {};
    state.products.forEach(function (x) { const t = String(x[field] ?? "").trim(); if (t) seen[t] = true; });
    return '<datalist id="' + id + '">' + Object.keys(seen).sort().map(function (t) {
      return '<option value="' + escapeHtml(t) + '">';
    }).join("") + "</datalist>";
  };

  contentElement().innerHTML = `
    <div class="content">
      <div class="panel">
        <div class="panel-header">
          <h2>${editing ? "Edit Product" : "New Product"}</h2>
          <button class="btn secondary" type="button" onclick="showPage('products')">Cancel</button>
        </div>
        <form id="productForm" class="erp-form">
          <input type="hidden" name="productId" value="${editing ? v("ProductID") : ""}">
          <label>
            Description
            <input name="description" value="${v("Description")}" required autocomplete="off" placeholder="e.g. Haier 1.5 Ton Inverter AC">
          </label>
          <div class="form-grid">
            <label>Code<input name="code" value="${v("Code")}" autocomplete="off"></label>
            <label>Brand<input name="brand" value="${v("Brand")}" list="brandList" autocomplete="off">${datalist("brandList", "Brand")}</label>
            <label>Category<input name="category" value="${v("Category")}" list="categoryList" autocomplete="off">${datalist("categoryList", "Category")}</label>
            <label>Unit<input name="unit" value="${v("Unit")}" list="unitList" placeholder="Pcs" autocomplete="off">${datalist("unitList", "Unit")}</label>
            <label>Purchase Price<input type="number" name="purchasePrice" min="0" step="0.01" value="${v("PurchasePrice")}"></label>
            <label>Sale Price<input type="number" name="salePrice" min="0" step="0.01" value="${v("SalePrice")}"></label>
            <label>Min Stock (alert)<input type="number" name="minStock" min="0" step="1" value="${v("MinStock")}"></label>
            <label>Location<input name="location" value="${v("Location")}" autocomplete="off"></label>
            ${editing
              ? `<label>Current Stock<input value="${v("CurrentStock")}" disabled><small>Stock changes only through purchases and sales.</small></label>`
              : `<label>Opening Stock<input type="number" name="openingStock" min="0" step="1" value="0"></label>`}
          </div>
          <div class="form-actions">
            <button type="submit" class="btn primary">${editing ? "Save Changes" : "Save Product"}</button>
          </div>
        </form>
      </div>
    </div>
  `;
  $("productForm").addEventListener("submit", submitProduct);
  const first = $("productForm").description;
  if (first) first.focus();
}

async function submitProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const productId = form.productId.value;
  const numOrBlank = function (input) { return input.value === "" ? "" : Number(input.value); };

  const payload = {
    description: form.description.value.trim(),
    code: form.code.value.trim(),
    brand: form.brand.value.trim(),
    category: form.category.value.trim(),
    unit: form.unit.value.trim(),
    purchasePrice: numOrBlank(form.purchasePrice),
    salePrice: numOrBlank(form.salePrice),
    minStock: numOrBlank(form.minStock),
    location: form.location.value.trim()
  };
  if (!payload.description) { showError("Description is required."); return; }
  if (payload.salePrice !== "" && payload.purchasePrice !== "" && payload.salePrice < payload.purchasePrice) {
    if (!confirm("Sale price is lower than purchase price. Save anyway?")) return;
  }

  try {
    if (button) button.disabled = true;
    showToast("Saving product...");
    let result;
    if (productId) {
      payload.productId = productId;
      result = await call("updateproduct", payload);
      showToast(result && result.changed && result.changed.length ? "Product updated." : "No changes to save.");
    } else {
      payload.openingStock = Number(form.openingStock.value) || 0;
      result = await call("product", payload);
      showToast("Product added: " + (result && result.id ? result.id : ""));
    }
    await loadProducts();
  } catch (error) {
    if (button) button.disabled = false;
    showError(error.message || "Could not save product.");
  }
}


/* ============================================================
   TOOLBAR
   ============================================================ */

function toolbar(
  title,
  searchId,
  placeholder
) {

  return `

    <div class="toolbar">

      <div>

        <h2>
          ${escapeHtml(title)}
        </h2>

      </div>

      ${searchBox(
        searchId,
        placeholder
      )}

    </div>

  `;

}


/* ============================================================
   SEARCH BOX
   ============================================================ */

function searchBox(
  id,
  placeholder
) {

  return `

    <input
      id="${escapeHtml(id)}"
      class="search"
      type="search"
      placeholder="${escapeHtml(
        placeholder
      )}"
      autocomplete="off"
    >

  `;

}


/* ============================================================
   SEARCHABLE TABLE
   ============================================================ */

function renderSearchableTable(
  rows,
  columns,
  searchId,
  tableId,
  selectId,
  selectColumn,
  partyType
) {

  const render =
    function () {

      const input =
        $(searchId);


      const query =
        input
          ? input.value
              .trim()
              .toLowerCase()
          : "";


      const select = selectId ? $(selectId) : null;
      const selectedId = select ? String(select.value || "") : "";

      const filtered = (Array.isArray(rows) ? rows : []).filter(function(row) {
        const matchesSelect = !selectedId || String(row[selectColumn] ?? "") === selectedId;
        if (!matchesSelect) return false;

        if (!query) return true;

        return columns.some(function(column) {
          return String(row[column] ?? "")
            .toLowerCase()
            .includes(query);
        });
      });


      const target =
        $(tableId);


      if (!target) {

        return;

      }


      target.innerHTML =
        table(
          filtered,
          columns,
          partyType
        );

    };


  const input =
    $(searchId);

  if (input) {
    input.addEventListener("input", render);
  }

  const select = selectId ? $(selectId) : null;
  if (select) {
    select.addEventListener("change", render);
  }

  render();

}


/* ============================================================
   TABLE
   ============================================================ */

function table(
  rows,
  columns,
  partyType
) {

  if (
    !rows ||
    rows.length === 0
  ) {

    return `

      <div class="panel">

        <div class="empty">

          No records found.

        </div>

      </div>

    `;

  }


  return `

    <div class="panel table-wrap">

      <table class="table">

        <thead>

          <tr>

            ${partyType ? "<th>" + escapeHtml(tableActionHeader(partyType)) + "</th>" : ""}
            ${columns
              .map(
                function (column) {

                  return `
                    <th>
                      ${escapeHtml(
                        prettyLabel(
                          column
                        )
                      )}
                    </th>
                  `;

                }
              )
              .join("")}

          </tr>

        </thead>


        <tbody>

          ${rows
            .map(
              function (row) {

                return `

                  <tr>

                    ${partyType ? '<td class="party-action-cell"><div class="row-actions" style="display:flex;gap:4px;flex-wrap:nowrap;">' + tableActions(partyType, row) + '</div></td>' : ""}

                    ${columns
                      .map(
                        function (
                          column
                        ) {

                          return `

                            <td>
                              ${formatCell(
                                row[column],
                                column
                              )}
                            </td>

                          `;

                        }
                      )
                      .join("")}

                  </tr>

                `;

              }
            )
            .join("")}

        </tbody>

      </table>

    </div>

  `;

}


/* ============================================================
   PRETTY LABEL
   ============================================================ */

function statusBadge(value) {
  const v = String(value || "").toLowerCase();
  const tone = v === "cancelled" ? "danger" : (v === "posted" ? "success" : "");
  return '<span class="badge ' + tone + '">' + escapeHtml(v === "posted" ? "Posted" : (v === "cancelled" ? "Cancelled" : String(value || ""))) + "</span>";
}

function prettyLabel(
  value
) {
  if (value === "ReturnedAmount") return "Returned";
  if (value === "ProductName") return "Product";

  return String(
    value || ""
  )
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
    )
    .replace(
      /_/g,
      " "
    );

}


/* ============================================================
   FORMAT CELL
   ============================================================ */

function formatCell(
  value,
  column
) {
  if (String(column) === "Status" && value) return statusBadge(value);
  if (String(column) === "BalanceAfter") return escapeHtml(formatNumber(value));
  if (String(column) === "ReturnedAmount" && !Number(value)) return "";

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "";

  }


  const lower =
    String(
      column ||
      ""
    ).toLowerCase();


  if (
    lower.includes(
      "price"
    ) ||
    lower.includes(
      "amount"
    ) ||
    lower.includes(
      "total"
    ) ||
    lower.includes(
      "balance"
    ) ||
    lower.includes(
      "debit"
    ) ||
    lower.includes(
      "credit"
    ) ||
    lower.includes(
      "cost"
    ) ||
    lower.includes(
      "paid"
    ) ||
    lower.includes(
      "discount"
    ) ||
    lower.includes(
      "cogs"
    )
  ) {

    return escapeHtml(
      money(
        value
      )
    );

  }


  if (
    lower === "date" ||
    lower.endsWith(
      "at"
    )
  ) {

    return escapeHtml(
      formatDate(
        value
      )
    );

  }


  return escapeHtml(
    value
  );

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
      .filter(spIsActive)
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
              <small id="customerCreditInfo"></small>

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

  attachLiveTotals($("saleForm"), "unitPrice", "SalePrice");

  const customerSelect = $("saleForm").customerId;
  if (customerSelect) {
    customerSelect.addEventListener("change", updateCustomerCreditInfo);
    updateCustomerCreditInfo();
  }

}


/* ============================================================
   CREDIT LIMIT
   ============================================================ */

function customerById(id) {
  return (state.customers || []).find(function (c) { return String(c.CustomerID) === String(id); }) || null;
}

function updateCustomerCreditInfo() {
  const form = $("saleForm");
  const info = document.getElementById("customerCreditInfo");
  if (!form || !info) return;
  const c = customerById(form.customerId.value);
  if (!c) { info.innerHTML = ""; return; }
  const balance = Number(c.ClosingBalance) || 0;
  const limit = Number(c.CreditLimit) || 0;
  info.innerHTML = "Balance: <b>" + money(balance) + "</b>" +
    (limit > 0 ? " &nbsp;·&nbsp; Credit limit: " + money(limit) + (balance > limit ? ' <span class="badge danger">Over limit</span>' : "") : "");
}

// Asks for confirmation when this sale would take the customer above their credit limit.
function creditLimitOk(payload) {
  const c = customerById(payload.customerId);
  const limit = c ? Number(c.CreditLimit) || 0 : 0;
  if (!c || limit <= 0) return true;
  const gross = (payload.items || []).reduce(function (a, it) {
    const p = (state.products || []).find(function (x) { return String(x.ProductID) === String(it.productId); });
    const price = it.unitPrice !== undefined ? Number(it.unitPrice) : Number(p && p.SalePrice) || 0;
    return a + Math.max(0, (Number(it.qty) || 0) * price - (Number(it.discount) || 0));
  }, 0);
  const net = Math.max(0, gross - (Number(payload.discount) || 0));
  const added = net - (Number(payload.paid) || 0);
  const newBalance = (Number(c.ClosingBalance) || 0) + added;
  if (added <= 0 || newBalance <= limit) return true; // fully paid sales never need a warning
  return confirm((c.Name || c.CustomerID) + " will owe " + money(newBalance) + " after this sale, which is above the credit limit of " + money(limit) + ". Save anyway?");
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


      <label class="item-field"><span>Qty</span><input
        type="number"
        name="qty"
        min="0.01"
        step="0.01"
        placeholder="Qty"
        required
      ></label>


      <label class="item-field"><span>Price</span><input
        type="number"
        name="unitPrice"
        min="0"
        step="0.01"
        placeholder="Price"
      ></label>


      <label class="item-field"><span>Discount</span><input
        type="number"
        name="discount"
        min="0"
        step="0.01"
        placeholder="Discount"
      ></label>


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
    if (!creditLimitOk(payload)) {
      showToast("Sale not saved.");
      return;
    }


    const result =
      await call(
        "apiSale",
        payload
      );


    showToast("Sale saved: " + result.invoiceNo);
    renderSaleSaved(result);

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

  attachLiveTotals($("purchaseForm"), "unitCost", null);

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


      <label class="item-field"><span>Qty</span><input
        type="number"
        name="qty"
        min="0.01"
        step="0.01"
        placeholder="Qty"
        required
      ></label>


      <label class="item-field"><span>Unit Cost</span><input
        type="number"
        name="unitCost"
        min="0"
        step="0.01"
        placeholder="Unit Cost"
        required
      ></label>


      <label class="item-field"><span>Discount</span><input
        type="number"
        name="discount"
        min="0"
        step="0.01"
        placeholder="Discount"
      ></label>


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

  };


/* ============================================================
   MOBILE: label table cells so tables can show as cards
   ============================================================ */

(function () {
  function labelTables(root) {
    root.querySelectorAll("table.table").forEach(function (t) {
      const heads = Array.prototype.map.call(t.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); });
      t.querySelectorAll("tbody tr, tfoot tr").forEach(function (tr) {
        let i = 0;
        Array.prototype.forEach.call(tr.children, function (td) {
          const span = Number(td.getAttribute("colspan")) || 1;
          if (!td.hasAttribute("data-label")) td.setAttribute("data-label", span > 1 ? "" : (heads[i] || ""));
          if (!td.textContent.trim() && !td.querySelector("input,button,select,a")) td.classList.add("cell-empty");
          i += span;
        });
      });
    });
  }
  function start() {
    const content = document.getElementById("content");
    if (!content || typeof MutationObserver === "undefined") return;
    let pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; labelTables(content); });
    }).observe(content, { childList: true, subtree: true });
    labelTables(content);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
