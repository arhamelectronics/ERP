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

    authBoot();

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

  if (!canOpen(page)) page = homePage();

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
      "Settings",

    import:
      "Import Old Ledgers",
    quicksale:
      "New Sale",
    quickpurchase:
      "New Purchase",
    home:
      "Home",
    bills:
      isAdminUser() ? "Bills" : "My Bills",
    inward:
      "Send to shop",
    mystock:
      "My Stock"

  };


  const title =
    t(titles[page] ||
    "Dashboard");


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

        await loadStockPage();

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

      case "import":

        loadImportPage();

        break;

      case "quicksale":

        await loadQuick("sale");

        break;

      case "quickpurchase":

        await loadQuick("purchase");

        break;

      case "home":

        renderHome();

        break;

      case "bills":

        await loadBills();

        break;

      case "inward":

        await loadQuick("inward");

        break;

      case "mystock":

        await loadMyStock();

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

  const token = sessionToken();
  if (token) payload = Object.assign({}, payload, { _token: token });

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
      if (response.ok === false && /^AUTH:/.test(String(response.error || ""))) {
        onAuthExpired();
        throw new Error(String(response.error).replace(/^AUTH:\s*/, ""));
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

  // Show the last dashboard at once, then the fresh one.
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem("erpDashboard") || "null"); } catch (e) { cached = null; }
  if (cached && state.page === "dashboard") renderDashboard(cached);

  const data =
    await call(
      "apiDashboard"
    );

  try { localStorage.setItem("erpDashboard", JSON.stringify(data)); } catch (e) { /* private mode */ }

  state.dashboard =
    data;

  if (state.page !== "dashboard") return;

  renderDashboard(
    data
  );

  qsPrefetch();

}


/* ============================================================
   PRODUCTS
   ============================================================ */

async function loadProducts() {

  const both = await Promise.all([call("apiProducts"), loadWarehouses(true).catch(function () { return []; })]);
  const data = both[0];


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

  const results = await Promise.all([loadSalespersons(), call("incentivereport", payload),
    call("userpick", {}).catch(function () { return state.pickUsers || []; })]);
  state.pickUsers = results[2] || [];
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
          <h2>${escapeHtml(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</h2>
          <p>Today's sales, money to collect and pay, and stock in every warehouse.</p>
        </div>
      </div>
      ${bigActionsHtml()}

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
            <button class="mini-link" onclick="showPage('sales')">View all</button>
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
            <button class="mini-link" onclick="showPage('ledger')">Ledger</button>
          </div>
          <div class="outstanding-visual">
            <div class="outstanding-ring" style="--p:${(receivable + payable) > 0 ? Math.round(receivable / (receivable + payable) * 100) : 50}%">
              <div><strong>${(receivable + payable) > 0 ? Math.round(receivable / (receivable + payable) * 100) : 0}%</strong><span>to collect</span></div>
            </div>
            <div class="outstanding-list">
              <div><span><i class="dot orange"></i>Customer receivable</span><b>${money(receivable)}</b></div>
              <div><span><i class="dot red"></i>Supplier payable</span><b>${money(payable)}</b></div>
              <div><span><i class="dot blue"></i>Today's sales</span><b>${money(collection)}</b></div>
            </div>
          </div>
        </div>
      </div>

      <div class="dashboard-bottom-grid">
        <div class="panel">
          <div class="panel-header dashboard-panel-head">
            <div><span class="panel-kicker">INVENTORY</span><h3>Low stock alerts</h3></div>
            <button class="mini-link" onclick="showPage('stock')">Stock</button>
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
            <button class="mini-link" onclick="showPage('sales')">Sales</button>
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
        <div><span>Stock value</span><b>${money(d.stockValue)}</b></div>
        <div><span>Purchases</span><b>${money(d.monthlyPurchases)}</b></div>
        <div><span>Low stock</span><b>${formatNumber(d.lowStockCount)}</b></div>
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

  const whs = (state.warehouses || []).filter(function (w) { return w.Active !== false || Number(w.Units); });
  rows.forEach(function (r) {
    whs.forEach(function (w) { r["WH:" + w.WarehouseID] = Number((r.Locations || {})[w.WarehouseID]) || 0; });
  });
  // View: "all" = every product with stock per shop and the total; or one shop's stock only.
  let view = state.productView || "all";
  if (view !== "all" && !whs.some(function (w) { return String(w.WarehouseID) === view; })) view = state.productView = "all";
  const totalUnits = rows.reduce(function (a, r) { return a + (Number(r.CurrentStock) || 0); }, 0);
  const tabs = whs.length > 1 ? '<div class="stock-tabs" role="tablist">' +
    '<button type="button" role="tab" class="' + (view === "all" ? "on" : "") + '" onclick="setProductView(\'all\')"><b>All (total)</b><small>' +
      formatNumber(totalUnits) + " units</small></button>" +
    whs.map(function (w) {
      const id = String(w.WarehouseID);
      const units = rows.reduce(function (a, r) { return a + (Number(r["WH:" + id]) || 0); }, 0);
      return '<button type="button" role="tab" class="' + (view === id ? "on" : "") + '" onclick="setProductView(\'' + escapeHtml(id) + '\')"><b>' +
        escapeHtml(w.Name) + "</b><small>" + formatNumber(units) + " units</small></button>";
    }).join("") + "</div>" : "";

  let shown = rows, columns;
  if (view === "all") {
    columns = ["Description", "Code", "Brand", "Category", "Unit"]
      .concat(whs.length > 1 ? whs.map(function (w) { return "WH:" + w.WarehouseID; }) : [])
      .concat(["CurrentStock", "PurchasePrice", "SalePrice", "MinStock"]);
  } else {
    shown = rows.filter(function (r) { return Number(r["WH:" + view]) !== 0; });
    columns = ["Description", "Code", "Brand", "Category", "Unit", "WH:" + view, "PurchasePrice", "SalePrice"];
  }
  const shopName = view === "all" ? "" : ((whs.find(function (w) { return String(w.WarehouseID) === view; }) || {}).Name || "");

  contentElement().innerHTML = `
    <div class="content">
      <div class="toolbar">
        <div>
          <h2>Products</h2>
          <p>${view === "all" ? rows.length + " items" : shown.length + " items in stock at " + escapeHtml(shopName)}</p>
        </div>
        <div class="toolbar-actions">
          ${view !== "all" ? '<button class="btn secondary" type="button" onclick="downloadShopStock()">Download list</button><button class="btn secondary" type="button" onclick="openStockUpload()">Upload stock list</button>' : ""}
          <button class="btn primary" type="button" onclick="openProductForm()">+ New Product</button>
        </div>
      </div>
      ${tabs}
      <div id="stockUploadArea"></div>
      ${searchBox("productSearch", "Search product...")}
      <div id="productTable"></div>
    </div>
  `;

  renderSearchableTable(shown, columns, "productSearch", "productTable", null, null, "product");

}


function setProductView(view) {
  state.productView = view;
  renderProducts(state.products || []);
}

/* ============================================================
   STOCK RENDER
   ============================================================ */

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
    "WarehouseName",
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
    "WarehouseName",
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
          <div><h2>Salespersons</h2><p style="margin:4px 0 0;">Choose a user and set the incentive rate. Every sale that user makes counts for them. A new rate applies to sales made after the change.</p></div>
          <button class="btn primary" type="button" onclick="openSalespersonForm()">+ Add Salesperson</button>
        </div>
        <div id="salespersonFormArea"></div>
        <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Edit</th><th>Name</th><th>User</th><th>Phone</th><th class="num">Incentive %</th><th>Status</th></tr></thead>
          <tbody>
            ${people.length === 0 ? '<tr><td colspan="6" class="empty">No salespersons yet. Click "+ Add Salesperson" and choose a user.</td></tr>' : people.map(function (sp) {
              const active = spIsActive(sp);
              return '<tr>' +
                '<td class="party-action-cell"><button class="btn secondary ledger-action-btn" type="button" onclick="openSalespersonForm(' + escapeHtml(JSON.stringify(String(sp.SalespersonID))) + ')">Edit</button></td>' +
                '<td>' + escapeHtml(sp.Name || "") + '</td>' +
                '<td>' + (sp.UserID ? escapeHtml(spUserLabel(sp.UserID)) : '<span class="badge warning">Not linked</span>') + '</td>' +
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

function spUserPicked(sel) {
  const opt = sel.options[sel.selectedIndex];
  const form = sel.form;
  if (opt && opt.dataset.name && form && form.name) form.name.value = opt.dataset.name;
}

function spUserLabel(userId) {
  const u = (state.pickUsers || []).find(function (x) { return x.userId === String(userId); });
  return u ? u.name + " (" + u.username + ")" : "User " + userId;
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

async function openSalespersonForm(salespersonId) {
  const area = document.getElementById("salespersonFormArea");
  if (!area) return;
  try { state.pickUsers = await call("userpick", {}); } catch (e) { state.pickUsers = state.pickUsers || []; }
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
        <label>User (from Settings &gt; Users)<select name="userId" onchange="spUserPicked(this)">
          <option value="">${editing ? "Not linked to a user" : "Choose a user..."}</option>
          ${(state.pickUsers || []).map(function (u) {
            const taken = (state.salespersons || []).some(function (x) { return String(x.UserID || "") === u.userId && String(x.SalespersonID) !== String(sp.SalespersonID || ""); });
            return '<option value="' + escapeHtml(u.userId) + '" data-name="' + escapeHtml(u.name) + '"' + (String(sp.UserID || "") === u.userId ? " selected" : "") + (taken ? " disabled" : "") + ">" +
              escapeHtml(u.name) + " (" + escapeHtml(u.username) + ")" + (taken ? " - already added" : "") + "</option>";
          }).join("")}
        </select></label>
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
  form.userId.focus();
  area.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function submitSalesperson(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const id = form.salespersonId.value;
  const payload = {
    userId: form.userId.value,
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    incentivePercent: form.incentivePercent.value.trim()
  };
  if (!id && !payload.userId) { showError("Choose the user. Their own sales give the incentive."); return; }
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
  if (kind === "customer" || kind === "supplier") return "Actions";
  return "Actions";
}

function tableActions(kind, row) {
  if (kind === "customer" || kind === "supplier") {
    const id = kind === "customer" ? row.CustomerID : row.SupplierID;
    return actionButton("View Ledger", "openPartyLedger", [kind, String(id == null ? "" : id)]) +
      actionButton("WhatsApp", "whatsappParty", [kind, String(id == null ? "" : id)]);
  }
  if (kind === "product") {
    const id = String(row.ProductID == null ? "" : row.ProductID);
    const shopView = state.page === "products" && state.productView && state.productView !== "all";
    return actionButton("Edit", "openProductForm", [id]) + (shopView ? actionButton("Set stock", "openSetStock", [id]) : "") + actionButton("Adjust", "openStockAdjustForm", [id]) +
      ((state.warehouses || []).filter(function (w) { return w.Active !== false; }).length > 1 ? actionButton("Transfer", "openTransferForm", [id]) : "");
  }
  if (kind === "sale") {
    const id = String(row.SaleID || "");
    let html = actionButton("Bill PDF", "openBillPdf", [id]) + actionButton("A4", "printInvoice", [id, "a4"]) + actionButton("Slip", "printInvoice", [id, "slip"]) + actionButton("WhatsApp", "whatsappInvoice", [id]);
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
    (c.balance == null ? "" : line("Customer account balance", money(c.balance))) + "</table>" +
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

/* ============================================================
   BILL PDF (A5, half of an A4 sheet)
   ============================================================ */
const A5_W = 419.53, A5_H = 595.28;

function pdfWrap(str, width, bold, size) {
  const words = String(str == null ? "" : str).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach(function (w) {
    const next = line ? line + " " + w : w;
    if (pdfTextWidth(next, bold, size) <= width) { line = next; return; }
    if (line) lines.push(line);
    line = pdfTextWidth(w, bold, size) <= width ? w : pdfFit(w, width, bold, size);
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function billNumber(v) {
  return (Number(v) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// data = result of the "saleinvoice" action. Returns { bytes, filename }.
function buildInvoicePdf(data) {
  const sale = data.sale || {}, c = data.customer || {}, co = data.company || {};
  const tt = invoiceTotals(data);
  const doc = createPdf(A5_W, A5_H);
  const M = 26, R = A5_W - M, INK = "#172026", MUTED = "#5F6B66", LINE = "#DCE2DE", BAND = "#1E2A2F", AMBER = "#F2A900";
  // Columns: # | Item | Qty | Rate | Amount
  // x positions; Qty, Rate and Amount are right-aligned at these points.
  const cNo = M + 4, cItem = M + 20, cQty = M + 214, cRate = M + 288, cAmt = R - 4;
  const itemW = cQty - cItem - 26;
  const rowSize = 8.5, lineH = 11;
  let y = 0, page = 0;

  const header = function () {
    doc.addPage();
    page += 1;
    doc.rect(0, 0, A5_W, 64, { fill: BAND });
    doc.rect(0, 64, A5_W, 3, { fill: AMBER });
    doc.text(M, 28, pdfFit((co.name || "ARHAM ELECTRONICS").toUpperCase(), 230, true, 15), { size: 15, bold: true, color: "#FFFFFF" });
    const sub = [co.address, co.phone ? "Ph: " + co.phone : ""].filter(Boolean).join("   ");
    if (sub) doc.text(M, 44, pdfFit(sub, 240, false, 7.5), { size: 7.5, color: "#C7D2CE" });
    doc.text(R, 26, tt.cancelled ? "CANCELLED BILL" : "SALE INVOICE", { size: 10, bold: true, color: AMBER, align: "right" });
    doc.text(R, 41, "No. " + (sale.InvoiceNo || ""), { size: 9, bold: true, color: "#FFFFFF", align: "right" });
    doc.text(R, 54, formatDate(sale.Date), { size: 8, color: "#C7D2CE", align: "right" });
    y = 84;
    if (page === 1) {
      doc.text(M, y, "Bill to", { size: 7.5, color: MUTED });
      doc.text(M, y + 13, pdfFit(c.name || "", 230, true, 11), { size: 11, bold: true, color: INK });
      const info = [c.phone, c.address].filter(Boolean).join("   ");
      if (info) doc.text(M, y + 25, pdfFit(info, 230, false, 8), { size: 8, color: MUTED });
      const extra = [];
      if (sale.WarehouseName) extra.push("From: " + sale.WarehouseName);
      if (sale.SalespersonName && sale.SalespersonName !== "—") extra.push("Salesperson: " + sale.SalespersonName);
      extra.forEach(function (t2, i) { doc.text(R, y + 13 + i * 11, pdfFit(t2, 130, false, 8), { size: 8, color: MUTED, align: "right" }); });
      y += 40;
    } else {
      doc.text(M, y, "Continued from page " + (page - 1), { size: 8, color: MUTED });
      y += 12;
    }
    doc.rect(M, y, R - M, 18, { fill: "#EEF1EF" });
    doc.text(cNo, y + 12, "#", { size: 7.5, bold: true, color: MUTED });
    doc.text(cItem, y + 12, "Item", { size: 7.5, bold: true, color: MUTED });
    doc.text(cQty, y + 12, "Qty", { size: 7.5, bold: true, color: MUTED, align: "right" });
    doc.text(cRate, y + 12, "Rate", { size: 7.5, bold: true, color: MUTED, align: "right" });
    doc.text(cAmt, y + 12, "Amount", { size: 7.5, bold: true, color: MUTED, align: "right" });
    y += 18;
  };

  const footerSpace = 150;   // room for totals and signature on the last page
  header();
  (data.items || []).forEach(function (it, i) {
    const lines = pdfWrap(it.description || it.productId || "", itemW, false, rowSize);
    const h = Math.max(1, lines.length) * lineH + 7 + (it.discount ? lineH : 0);
    if (y + h > A5_H - 40) {
      doc.text(R, A5_H - 22, "Continued on next page", { size: 7.5, color: MUTED, align: "right" });
      header();
    }
    const top = y + 12;
    doc.text(cNo, top, String(i + 1), { size: rowSize, color: MUTED });
    lines.forEach(function (ln, k) { doc.text(cItem, top + k * lineH, ln, { size: rowSize, color: INK }); });
    doc.text(cQty, top, billNumber(it.qty), { size: rowSize, color: INK, align: "right" });
    doc.text(cRate, top, billNumber(it.unitPrice), { size: rowSize, color: INK, align: "right" });
    doc.text(cAmt, top, billNumber(it.lineTotal), { size: rowSize, bold: true, color: INK, align: "right" });
    if (it.discount) doc.text(cItem, top + lines.length * lineH, "Discount " + billNumber(it.discount), { size: 7.5, color: MUTED });
    y += h;
    doc.line(M, y, R, y, { color: LINE, width: 0.5 });
  });

  if (y + footerSpace > A5_H - 20) header();
  y += 12;
  const tx = R - 170;
  const row = function (label, value, opts) {
    opts = opts || {};
    doc.text(tx, y, label, { size: opts.size || 8.5, bold: !!opts.bold, color: opts.color || MUTED });
    doc.text(R, y, value, { size: opts.size || 8.5, bold: !!opts.bold, color: opts.color || INK, align: "right" });
    y += opts.gap || 14;
  };
  const units = (data.items || []).reduce(function (a, it) { return a + (Number(it.qty) || 0); }, 0);
  doc.text(M, y, (data.items || []).length + " item(s), " + billNumber(units) + " unit(s)", { size: 8, color: MUTED });
  row("Subtotal", "Rs. " + billNumber(tt.itemsTotal));
  if (tt.discount) row("Discount", "- Rs. " + billNumber(tt.discount));
  y += 2;
  doc.rect(tx - 8, y - 12, R - tx + 12, 22, { fill: "#FFF4D6" });
  row("TOTAL", "Rs. " + billNumber(tt.net), { size: 11, bold: true, color: INK, gap: 20 });
  row("Paid", "Rs. " + billNumber(tt.paid));
  row("Balance on this bill", "Rs. " + billNumber(tt.balance), { bold: tt.balance > 0 });
  if (tt.returned) row("Returned", "- Rs. " + billNumber(tt.returned));
  if (c.balance != null && c.name && String(c.name).toUpperCase() !== "CASH CUSTOMER") {
    doc.line(tx - 8, y - 6, R, y - 6, { color: LINE, width: 0.5 });
    y += 4;
    row("Total account balance", "Rs. " + billNumber(c.balance), { bold: true, color: Number(c.balance) > 0 ? "#B42318" : INK });
  }
  if (sale.Notes) {
    y += 2;
    pdfWrap("Note: " + sale.Notes, R - M, false, 8).slice(0, 3).forEach(function (ln) { doc.text(M, y, ln, { size: 8, color: MUTED }); y += 10; });
  }
  // signature and footer at the bottom of the last page
  const sy = A5_H - 50;
  doc.line(M, sy, M + 120, sy, { color: "#94A3B8", width: 0.6 });
  doc.text(M + 60, sy + 11, "Customer signature", { size: 7.5, color: MUTED, align: "center" });
  doc.line(R - 120, sy, R, sy, { color: "#94A3B8", width: 0.6 });
  doc.text(R - 60, sy + 11, "For " + (co.name || "Arham Electronics"), { size: 7.5, color: MUTED, align: "center" });
  doc.text(A5_W / 2, A5_H - 18, pdfFit(co.footer || "Thank you for your business.", A5_W - 2 * M, false, 7.5), { size: 7.5, color: MUTED, align: "center" });
  const n = doc.pageCount();
  if (n > 1) for (let i = 0; i < n; i++) { doc.onPage(i); doc.text(R, A5_H - 8, "Page " + (i + 1) + " of " + n, { size: 6.5, color: MUTED, align: "right" }); }
  return { bytes: doc.output(), filename: "Bill-" + String(sale.InvoiceNo || "invoice").replace(/[^A-Za-z0-9-]/g, "") + ".pdf" };
}

// Opens the bill PDF (the phone or browser shows it, with Print and Share).
async function openBillPdf(saleId) {
  const w = window.open("", "_blank");
  if (w) w.document.write("<p style='font-family:Arial;padding:20px'>Making the bill...</p>");
  try {
    const data = await getInvoiceData(saleId);
    const pdf = buildInvoicePdf(data);
    const url = URL.createObjectURL(new Blob([pdf.bytes], { type: "application/pdf" }));
    if (w) w.location.href = url;
    else {
      const a = document.createElement("a");
      a.href = url; a.download = pdf.filename;
      document.body.appendChild(a); a.click(); a.remove();
    }
  } catch (error) {
    if (w) w.close();
    showError(error.message || "Could not make the bill PDF.");
  }
}

const INVOICE_CACHE = {};
async function getInvoiceData(saleId) {
  if (!INVOICE_CACHE[saleId]) INVOICE_CACHE[saleId] = await call("saleinvoice", { saleId: saleId });
  return INVOICE_CACHE[saleId];
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
          ${actionButton("Bill PDF", "openBillPdf", [String(result.saleId)], "primary")}
          ${actionButton("Print A4 Invoice", "printInvoice", [String(result.saleId), "a4"])}
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
    const both = await Promise.all([call("apiProducts"), loadWarehouses(true).catch(function () { return []; })]);
    state.products = Array.isArray(both[0]) ? both[0] : [];
  } catch (error) { showError(error.message); return; }
  const hasWh = activeWarehouses().length > 0;

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
            ${hasWh ? '<label>Warehouse<select name="warehouseId">' + warehouseOptions(defaultWarehouseFor("adjust")) + "</select></label>" : ""}
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
    const cur = form.warehouseId ? productStockAt(p, form.warehouseId.value) : (Number(p.CurrentStock) || 0);
    const q = Number(form.qty.value) || 0;
    const after = form.direction.value === "add" ? cur + q : cur - q;
    el.innerHTML = (form.warehouseId ? "In " + escapeHtml(warehouseLabel(form.warehouseId.value)) + ": " : "Current stock: ") + "<b>" + formatNumber(cur) + "</b> &nbsp;→&nbsp; after adjustment: <b>" + formatNumber(after) + "</b>" +
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
    if (form.warehouseId) { payload.warehouseId = form.warehouseId.value; rememberWarehouse("adjust", form.warehouseId.value); }
    const button = form.querySelector('button[type="submit"]');
    try {
      if (button) button.disabled = true;
      showToast("Saving adjustment...");
      const result = await call("stockadjust", payload);
      showToast("Stock updated" + (result.warehouseId ? " in " + warehouseLabel(result.warehouseId) + ": now " + result.inWarehouse : ": " + result.before + " → " + result.after) + ".");
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
      let v = c[2] === "wa" ? actionButton("WhatsApp", "whatsappReminder", [String(r.customerId)]) : fmtCell(r[c[0]], c[2]);
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
   PDF (built in, no external library)
   A small A4 PDF writer using the standard Helvetica fonts.
   ============================================================ */

const PDF_WIDTHS = { R: [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761, 556, 0, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500], B: [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 761, 556, 0, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556] };
const PDF_CP1252 = { 8364: 128, 8218: 130, 402: 131, 8222: 132, 8230: 133, 8224: 134, 8225: 135, 710: 136, 8240: 137, 352: 138, 8249: 139, 338: 140, 381: 142,
  8216: 145, 8217: 146, 8220: 147, 8221: 148, 8226: 149, 8211: 150, 8212: 151, 732: 152, 8482: 153, 353: 154, 8250: 155, 339: 156, 382: 158, 376: 159 };

function pdfCode(ch) {
  const c = ch.charCodeAt(0);
  if (c >= 32 && c <= 126) return c;
  if (c >= 160 && c <= 255) return c;
  if (PDF_CP1252[c]) return PDF_CP1252[c];
  if (c === 10 || c === 13 || c === 9) return 32;
  return 63; // "?"
}

function pdfTextWidth(str, bold, size) {
  const table = bold ? PDF_WIDTHS.B : PDF_WIDTHS.R;
  let w = 0;
  for (const ch of String(str)) { const c = pdfCode(ch); w += table[c - 32] || 556; }
  return w / 1000 * size;
}

function pdfFit(str, width, bold, size) {
  str = String(str == null ? "" : str);
  if (pdfTextWidth(str, bold, size) <= width) return str;
  let s = str;
  while (s.length && pdfTextWidth(s + "...", bold, size) > width) s = s.slice(0, -1);
  return s + "...";
}

function createPdf(pageW, pageH) {
  const W = pageW || 595.28, H = pageH || 841.89;
  const pages = [];
  let cur = null;
  const enc = function (str) {
    let out = "";
    for (const ch of String(str)) {
      const s = String.fromCharCode(pdfCode(ch));
      out += (s === "(" || s === ")" || s === "\\") ? "\\" + s : s;
    }
    return out;
  };
  const n = function (v) { return (Math.round(v * 100) / 100).toString(); };
  const rgb = function (hex) {
    const h = String(hex || "#000000").replace("#", "");
    return [0, 2, 4].map(function (i) { return n(parseInt(h.substr(i, 2), 16) / 255); }).join(" ");
  };
  const doc = {
    width: W, height: H,
    addPage: function () { cur = []; pages.push(cur); return doc; },
    pageCount: function () { return pages.length; },
    onPage: function (i) { cur = pages[i]; return doc; },
    // y is measured from the TOP of the page, like a web page.
    text: function (x, y, str, o) {
      o = o || {};
      const size = o.size || 10, bold = !!o.bold;
      let tx = x;
      if (o.align === "right") tx = x - pdfTextWidth(str, bold, size);
      else if (o.align === "center") tx = x - pdfTextWidth(str, bold, size) / 2;
      cur.push("BT /" + (bold ? "F2" : "F1") + " " + n(size) + " Tf " + rgb(o.color) + " rg " + n(tx) + " " + n(H - y) + " Td (" + enc(str) + ") Tj ET");
      return doc;
    },
    rect: function (x, y, w, h, o) {
      o = o || {};
      if (o.fill) cur.push(rgb(o.fill) + " rg " + n(x) + " " + n(H - y - h) + " " + n(w) + " " + n(h) + " re f");
      if (o.stroke) cur.push(rgb(o.stroke) + " RG " + n(o.lineWidth || 0.6) + " w " + n(x) + " " + n(H - y - h) + " " + n(w) + " " + n(h) + " re S");
      return doc;
    },
    line: function (x1, y1, x2, y2, o) {
      o = o || {};
      cur.push(rgb(o.color || "#cbd5e1") + " RG " + n(o.width || 0.6) + " w " + n(x1) + " " + n(H - y1) + " m " + n(x2) + " " + n(H - y2) + " l S");
      return doc;
    },
    output: function () {
      const objs = [];
      objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
      objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
      objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
      const kids = [];
      pages.forEach(function (ops, i) {
        const pageId = 5 + i * 2, contentId = 6 + i * 2;
        const stream = ops.join("\n");
        objs[pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + n(W) + " " + n(H) + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + contentId + " 0 R >>";
        objs[contentId] = "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream";
        kids.push(pageId + " 0 R");
      });
      objs[2] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + pages.length + " >>";
      let out = "%PDF-1.4\n%âãÏÓ\n";
      const offsets = [];
      for (let i = 1; i < objs.length; i++) {
        offsets[i] = out.length;
        out += i + " 0 obj\n" + objs[i] + "\nendobj\n";
      }
      const xref = out.length;
      out += "xref\n0 " + objs.length + "\n0000000000 65535 f \n";
      for (let i = 1; i < objs.length; i++) out += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
      out += "trailer\n<< /Size " + objs.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
      const bytes = new Uint8Array(out.length);
      for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
      return bytes;
    }
  };
  return doc;
}

function pdfAmount(v) {
  const x = Number(v) || 0;
  return x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Builds an account statement PDF. o = { partyType, party, rows (oldest first), company, from, to }
function buildStatementPdf(o) {
  const isCust = o.partyType !== "supplier";
  const co = o.company || {};
  const party = o.party || {};
  const rows = o.rows || [];
  const doc = createPdf();
  const M = 36, H = doc.height, right = doc.width - M;
  const cols = [
    { key: "date", label: "Date", w: 62 },
    { key: "particular", label: "Particular", w: 178 },
    { key: "ref", label: "Reference", w: 70 },
    { key: "debit", label: "Debit", w: 70, num: true },
    { key: "credit", label: "Credit", w: 70, num: true },
    { key: "balance", label: "Balance", w: right - M - 450, num: true }
  ];
  const first = rows[0];
  const opening = first
    ? (isCust ? (Number(first.Balance) || 0) - (Number(first.Debit) || 0) + (Number(first.Credit) || 0)
              : (Number(first.Balance) || 0) - (Number(first.Credit) || 0) + (Number(first.Debit) || 0))
    : (Number(party.ClosingBalance) || 0);
  const totalDebit = rows.reduce(function (a, r) { return a + (Number(r.Debit) || 0); }, 0);
  const totalCredit = rows.reduce(function (a, r) { return a + (Number(r.Credit) || 0); }, 0);
  const closing = rows.length ? Number(rows[rows.length - 1].Balance) || 0 : opening;
  const period = (o.from ? formatDate(o.from) : "Start") + " to " + (o.to ? formatDate(o.to) : formatDate(new Date()));
  const partyName = party.Name || party.CustomerID || party.SupplierID || "";

  let y = 0;
  const header = function (firstPage) {
    doc.addPage();
    y = M;
    doc.text(M, y + 14, pdfFit(co.name || "ARHAM ELECTRONICS", 300, true, 16), { size: 16, bold: true, color: "#0f172a" });
    doc.text(right, y + 12, isCust ? "CUSTOMER STATEMENT" : "SUPPLIER STATEMENT", { size: 12, bold: true, align: "right", color: "#0f172a" });
    const sub = [co.address, co.phone ? "Phone: " + co.phone : ""].filter(Boolean).join("   |   ");
    if (sub) doc.text(M, y + 28, pdfFit(sub, 330, false, 8.5), { size: 8.5, color: "#64748b" });
    doc.text(right, y + 26, "Printed: " + formatDate(new Date()), { size: 8.5, align: "right", color: "#64748b" });
    y += 38;
    doc.line(M, y, right, y, { color: "#0f172a", width: 1.2 });
    y += 12;
    if (firstPage) {
      doc.rect(M, y, right - M, 52, { fill: "#f8fafc", stroke: "#e2e8f0" });
      doc.text(M + 10, y + 15, isCust ? "CUSTOMER" : "SUPPLIER", { size: 7.5, bold: true, color: "#64748b" });
      doc.text(M + 10, y + 31, pdfFit(partyName, 260, true, 12), { size: 12, bold: true, color: "#0f172a" });
      const idText = [isCust ? party.CustomerID : party.SupplierID, phoneOf(party)].filter(Boolean).join("   |   ");
      if (idText) doc.text(M + 10, y + 44, idText, { size: 8.5, color: "#64748b" });
      doc.text(right - 10, y + 15, "PERIOD", { size: 7.5, bold: true, color: "#64748b", align: "right" });
      doc.text(right - 10, y + 31, period, { size: 10, bold: true, align: "right", color: "#0f172a" });
      y += 64;
      const boxes = [["Opening Balance", opening],
        [isCust ? "Total Charges (Debit)" : "Total Paid (Debit)", totalDebit],
        [isCust ? "Total Received (Credit)" : "Total Purchases (Credit)", totalCredit],
        [isCust ? "Balance Due" : "Balance Payable", closing]];
      const bw = (right - M - 18) / 4;
      boxes.forEach(function (b, i) {
        const bx = M + i * (bw + 6);
        doc.rect(bx, y, bw, 40, { stroke: i === 3 ? "#0f172a" : "#e2e8f0", fill: i === 3 ? "#f1f5f9" : null });
        doc.text(bx + 8, y + 14, b[0].toUpperCase(), { size: 6.8, bold: true, color: "#64748b" });
        doc.text(bx + 8, y + 31, pdfFit("Rs. " + pdfAmount(b[1]), bw - 14, true, 11), { size: 11, bold: true, color: "#0f172a" });
      });
      y += 54;
    }
    doc.rect(M, y, right - M, 18, { fill: "#e2e8f0" });
    let x = M;
    cols.forEach(function (c) {
      doc.text(c.num ? x + c.w - 5 : x + 5, y + 12.5, c.label.toUpperCase(), { size: 7.5, bold: true, color: "#334155", align: c.num ? "right" : "left" });
      x += c.w;
    });
    y += 18;
  };
  const row = function (cells, o2) {
    o2 = o2 || {};
    if (y + 16 > H - 46) header(false);
    if (o2.fill) doc.rect(M, y, right - M, 16, { fill: o2.fill });
    let x = M;
    cols.forEach(function (c) {
      const v = cells[c.key] == null ? "" : String(cells[c.key]);
      doc.text(c.num ? x + c.w - 5 : x + 5, y + 11, pdfFit(v, c.w - 10, !!o2.bold, 8.5),
        { size: 8.5, bold: !!o2.bold, color: o2.color || "#1e293b", align: c.num ? "right" : "left" });
      x += c.w;
    });
    y += 16;
    doc.line(M, y, right, y, { color: "#e2e8f0", width: 0.5 });
  };

  header(true);
  row({ date: o.from ? formatDate(o.from) : "", particular: "Opening balance", balance: pdfAmount(opening) }, { bold: true, fill: "#f8fafc" });
  rows.forEach(function (r, i) {
    row({
      date: formatDate(r.Date), particular: r.Particular || "", ref: r.Ref || "",
      debit: Number(r.Debit) ? pdfAmount(r.Debit) : "", credit: Number(r.Credit) ? pdfAmount(r.Credit) : "",
      balance: pdfAmount(r.Balance)
    }, { fill: i % 2 ? "#fbfcfe" : null });
  });
  if (!rows.length) row({ particular: "No transactions in this period." }, { color: "#64748b" });
  row({ particular: "Closing balance", debit: pdfAmount(totalDebit), credit: pdfAmount(totalCredit), balance: pdfAmount(closing) }, { bold: true, fill: "#f1f5f9" });
  if (y + 30 < H - 46) {
    doc.text(M, y + 18, isCust
      ? "A positive balance is the amount due from the customer. A negative balance is an advance held by us."
      : "A positive balance is the amount payable to the supplier. A negative balance is an advance paid to the supplier.",
      { size: 7.5, color: "#64748b" });
  }

  const total = doc.pageCount();
  for (let i = 0; i < total; i++) {
    doc.onPage(i);
    doc.line(M, H - 34, right, H - 34, { color: "#e2e8f0", width: 0.5 });
    doc.text(M, H - 22, pdfFit((co.name || "ARHAM ELECTRONICS") + " - " + partyName, 380, false, 7.5), { size: 7.5, color: "#94a3b8" });
    doc.text(right, H - 22, "Page " + (i + 1) + " of " + total, { size: 7.5, color: "#94a3b8", align: "right" });
  }
  const safeName = String(partyName || "account").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "account";
  return { bytes: doc.output(), filename: "Statement-" + safeName + "-" + ymd(new Date()) + ".pdf" };
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
  if (d.indexOf("00") === 0) d = d.slice(2);            // 0092... -> 92...
  else if (d.charAt(0) === "0") d = "92" + d.slice(1);  // 0300... / 042... -> 92...
  else if (d.length === 10 && d.charAt(0) === "3") d = "92" + d; // 300... -> 92300...
  return d.length >= 11 && d.length <= 15 ? d : "";
}

// Shows the message inside the portal with an editable number and a real
// "Open WhatsApp" link. A link the user clicks is never blocked by the
// browser, and no hidden prompt or blank tab is involved.
// options: { modes: [{ label, text }], startMode, pdf: { make(): {bytes, filename}, text } }
function showWhatsAppPanel(title, name, phone, textOrOptions) {
  const opts = typeof textOrOptions === "string" ? { modes: [{ label: "Message", text: textOrOptions }] } : (textOrOptions || {});
  const modes = opts.modes || [];
  let modeIndex = Math.max(0, Math.min(modes.length - 1, opts.startMode || 0));

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
      (modes.length > 1 ? '<div class="wa-modes">' + modes.map(function (m, i) {
        return '<button type="button" class="btn ' + (i === modeIndex ? "primary" : "secondary") + '" data-mode="' + i + '">' + escapeHtml(m.label) + "</button>";
      }).join("") + "</div>" : "") +
      '<label>Message<textarea id="waText" rows="10"></textarea></label>' +
      '<div class="wa-actions">' +
        '<button type="button" class="btn secondary" id="waCopy">Copy Message</button>' +
        '<a id="waLink" class="btn primary" target="_blank" rel="noopener">Send Message</a>' +
      '</div>' +
      (opts.pdf ? '<div class="wa-pdf"><div><b>' + escapeHtml(opts.pdf.label || "PDF statement") + '</b><small>On a phone, pick WhatsApp in the share menu. On a computer, the PDF is downloaded and the chat opens so you can attach it.</small></div>' +
        '<div class="wa-actions"><button type="button" class="btn secondary" id="waPdfDownload">Download PDF</button><button type="button" class="btn primary" id="waPdfSend">Send PDF</button></div></div>' : "") +
    '</div>';
  document.body.appendChild(overlay);

  const numberInput = overlay.querySelector("#waNumber");
  const textInput = overlay.querySelector("#waText");
  const link = overlay.querySelector("#waLink");
  const hint = overlay.querySelector("#waHint");
  textInput.value = modes[modeIndex] ? modes[modeIndex].text : "";

  const waUrl = function (text) {
    return "https://wa.me/" + waNumber(numberInput.value) + "?text=" + encodeURIComponent(text);
  };
  const update = function () {
    const num = waNumber(numberInput.value);
    link.href = waUrl(textInput.value);
    link.classList.toggle("disabled", !num);
    link.setAttribute("aria-disabled", num ? "false" : "true");
    hint.textContent = num ? "Will open a chat with +" + num : "Enter a valid mobile number to send on WhatsApp.";
  };
  numberInput.addEventListener("input", update);
  textInput.addEventListener("input", update);
  overlay.querySelectorAll("[data-mode]").forEach(function (b) {
    b.addEventListener("click", function () {
      modeIndex = Number(b.getAttribute("data-mode"));
      textInput.value = modes[modeIndex].text;
      overlay.querySelectorAll("[data-mode]").forEach(function (x) {
        x.classList.toggle("primary", x === b);
        x.classList.toggle("secondary", x !== b);
      });
      update();
    });
  });
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

  if (opts.pdf) {
    let made = null;
    const makePdf = function () {
      if (!made) made = opts.pdf.make();
      return made;
    };
    const download = function (pdf) {
      const blob = new Blob([pdf.bytes], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = pdf.filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    };
    overlay.querySelector("#waPdfDownload").addEventListener("click", function () {
      download(makePdf());
      showToast("PDF downloaded.");
    });
    overlay.querySelector("#waPdfSend").addEventListener("click", function () {
      const pdf = makePdf();
      let file = null;
      try { file = new File([pdf.bytes], pdf.filename, { type: "application/pdf" }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: pdf.filename, text: opts.pdf.text || "" }).catch(function () { /* cancelled */ });
        return;
      }
      download(pdf);
      if (waNumber(numberInput.value)) {
        window.open(waUrl((opts.pdf.text || "") + "\n(" + (opts.pdf.label || "PDF statement") + " attached)"), "_blank", "noopener");
        showToast("PDF downloaded. Attach it in the WhatsApp chat.");
      } else {
        showToast("PDF downloaded. Enter a number above to open the chat.");
        numberInput.focus();
      }
    });
  }

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
  if (c.balance != null) lines.push("Your account balance: " + money(c.balance));
  if (co.footer) { lines.push(""); lines.push(co.footer); }
  return lines.join("\n");
}

async function whatsappInvoice(saleId) {
  try {
    showToast("Preparing message...");
    const data = await getInvoiceData(saleId);
    const c = data.customer || {};
    const msg = invoiceMessage(data);
    showWhatsAppPanel("Send Invoice " + ((data.sale || {}).InvoiceNo || ""), c.name, c.phone, {
      modes: [{ label: "Bill details", text: msg }],
      pdf: { label: "Bill PDF", text: "Bill " + ((data.sale || {}).InvoiceNo || "") + " from " + ((data.company || {}).name || "Arham Electronics"),
        make: function () { return buildInvoicePdf(data); } }
    });
  } catch (error) {
    showError(error.message || "Could not prepare the invoice message.");
  }
}

// Message texts for a customer or supplier account.
function balanceMessage(partyType, party, balance, co) {
  const name = party.Name || "Sir";
  const coName = co.name || "ARHAM ELECTRONICS";
  const today = formatDate(new Date());
  const call2 = co.phone ? "\nFor any query, call " + co.phone + "." : "";
  if (partyType === "supplier") {
    if (balance > 0) return "Dear " + name + ",\nAs per our records, the balance payable to you by " + coName + " as of " + today + " is *" + money(balance) + "*.\nPlease confirm, or share your statement if your records differ." + call2 + "\nThank you.";
    if (balance < 0) return "Dear " + name + ",\nAs per our records, " + coName + " has an advance of *" + money(-balance) + "* with you as of " + today + ".\nPlease confirm, or share your statement if your records differ." + call2 + "\nThank you.";
    return "Dear " + name + ",\nAs per our records, our account with you is fully settled as of " + today + ".\nThank you.";
  }
  if (balance > 0) return "Dear " + name + ",\nThis is a friendly reminder from " + coName + " that your outstanding balance as of " + today + " is *" + money(balance) + "*.\nPlease arrange the payment at your earliest convenience." + call2 + "\nThank you.";
  if (balance < 0) return "Dear " + name + ",\nYou have an advance of *" + money(-balance) + "* with " + coName + " as of " + today + "." + call2 + "\nThank you.";
  return "Dear " + name + ",\nYour account with " + coName + " is fully settled as of " + today + ". Thank you for your business.";
}

function statementMessage(partyType, party, rows, from, to, co) {
  const isCust = partyType !== "supplier";
  const debit = rows.reduce(function (a, r) { return a + (Number(r.Debit) || 0); }, 0);
  const credit = rows.reduce(function (a, r) { return a + (Number(r.Credit) || 0); }, 0);
  const balance = rows.length ? Number(rows[rows.length - 1].Balance) || 0 : Number(party.ClosingBalance) || 0;
  const lines = ["*" + (co.name || "ARHAM ELECTRONICS") + "*", "Account statement: " + (party.Name || ""),
    "Period: " + (from ? formatDate(from) : "Start") + " to " + (to ? formatDate(to) : formatDate(new Date())), ""];
  const recent = rows.slice(-10);
  if (rows.length > recent.length) lines.push("Last " + recent.length + " of " + rows.length + " entries:");
  recent.forEach(function (r) {
    lines.push(formatDate(r.Date) + " | " + (r.Particular || r.Ref || "") + " | " + (Number(r.Debit) ? "Dr " + money(r.Debit) : "Cr " + money(r.Credit)));
  });
  if (!rows.length) lines.push("No transactions in this period.");
  lines.push("");
  lines.push((isCust ? "Total charges: " : "Total paid: ") + money(debit));
  lines.push((isCust ? "Total received: " : "Total purchases: ") + money(credit));
  lines.push("*" + (isCust ? "Balance due: " : "Balance payable: ") + money(balance) + "*");
  return lines.join("\n");
}

async function findParty(partyType, id) {
  const isCust = partyType !== "supplier";
  let list = isCust ? state.customers : state.suppliers;
  if (!list || !list.length) {
    const data = await call(isCust ? "apiCustomers" : "apiSuppliers");
    list = Array.isArray(data) ? data : [];
    if (isCust) state.customers = list; else state.suppliers = list;
  }
  return list.find(function (x) { return String(isCust ? x.CustomerID : x.SupplierID) === String(id); }) || null;
}

// Opens the WhatsApp panel for an account with three choices:
// balance only, statement summary, and a PDF statement.
// rows/from/to are optional: without them the full history is loaded.
async function whatsappParty(partyType, id, startMode, rows, from, to) {
  try {
    const party = await findParty(partyType, id);
    if (!party) { showError("Account not found. Please refresh."); return; }
    if (!rows) {
      showToast("Loading account...");
      const data = await call("ledger", { partyType: partyType, partyId: id });
      rows = Array.isArray(data) ? data : [];
      from = ""; to = "";
    }
    const co = await getCompany();
    const balance = from || to
      ? (rows.length ? Number(rows[rows.length - 1].Balance) || 0 : Number(party.ClosingBalance) || 0)
      : Number(party.ClosingBalance) || (rows.length ? Number(rows[rows.length - 1].Balance) || 0 : 0);
    const isCust = partyType !== "supplier";
    showWhatsAppPanel((isCust ? "Customer" : "Supplier") + " on WhatsApp", party.Name, phoneOf(party), {
      modes: [
        { label: isCust ? "Outstanding only" : "Balance only", text: balanceMessage(partyType, party, balance, co) },
        { label: "Statement summary", text: statementMessage(partyType, party, rows, from, to, co) }
      ],
      startMode: startMode === "statement" ? 1 : 0,
      pdf: {
        text: "Account statement from " + (co.name || "ARHAM ELECTRONICS") + " for " + (party.Name || ""),
        make: function () { return buildStatementPdf({ partyType: partyType, party: party, rows: rows, company: co, from: from, to: to }); }
      }
    });
  } catch (error) {
    showError(error.message || "Could not prepare the message.");
  }
}

// From an open ledger page: uses the period and rows already on screen.
function whatsappStatement(partyType) {
  const isCust = partyType !== "supplier";
  const id = isCust ? window._ledgerSelectedCustomerId : window._ledgerSelectedPartyId;
  if (!id) { showError("Please select an account and load the ledger first."); return; }
  whatsappParty(partyType, id, "statement", Array.isArray(state.ledger) ? state.ledger : [], window._ledgerFrom || "", window._ledgerTo || "");
}

function whatsappReminder(customerId) {
  whatsappParty("customer", customerId, "balance");
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
  const both = await Promise.all([call("settings"), loadWarehouses(true).catch(function () { return []; })]);
  state.settings = both[0];
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
      <div class="toolbar"><div><h2>Settings</h2><p>Users, company details, warehouses and data backup.</p></div></div>
      <div id="usersPanel" class="panel" style="margin-bottom:16px;"></div>
      <div id="shopConvertPanel" class="panel" style="margin-bottom:16px;"></div>
      ${warehousePanelHtml()}

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
   IMPORT OLD LEDGERS
   ============================================================ */

const IMPORT_BATCH = 25;

// The backend can be busy for a while (another import, a backup, or a script
// running in the editor). Import calls are safe to repeat, so wait and retry.
async function importCall(name, payload, onWait) {
  const waits = [5, 10, 15, 20, 30, 45];
  for (let attempt = 0; ; attempt++) {
    try {
      return await call(name, payload);
    } catch (error) {
      const msg = String(error && error.message || "");
      const temporary = /lock|timeout|timed out|busy|too many|network|failed to fetch|load failed|HTTP 5\d\d|service|exceeded|try again/i.test(msg);
      if (!temporary || attempt >= waits.length) throw error;
      if (onWait) onWait(attempt + 1, waits[attempt]);
      await new Promise(function (r) { setTimeout(r, waits[attempt] * 1000); });
    }
  }
}

function loadImportPage() {
  state.importFile = state.importFile || null;
  renderImportPage();
}

function renderImportPage() {
  const f = state.importFile;
  const accounts = f ? f.accounts : [];
  const stock = f && Array.isArray(f.stock) ? f.stock : [];
  const totalRows = accounts.reduce(function (a, x) { return a + x.rows.length; }, 0);
  contentElement().innerHTML = `
    <div class="content">
      <div class="toolbar">
        <div><h2>Import Old Ledgers</h2><p>Upload an import file prepared from your old Excel ledgers.</p></div>
      </div>
      <div class="panel" style="margin-bottom:16px;">
        <form class="erp-form" onsubmit="return false;">
          <label>Import file (.json)<input type="file" id="importFileInput" accept=".json,application/json"></label>
        </form>
        <p style="margin:8px 0 0;"><small>Each account is created with its full history. If an account already exists, only the missing entries are added, so it is safe to run the same file again.</small></p>
      </div>
      ${f ? `
      <div class="panel">
        <div class="panel-header">
          <div><h3>${escapeHtml(f.fileName || "Import file")}</h3><p style="margin:4px 0 0;">${accounts.length ? accounts.length + " account(s), " + formatNumber(totalRows) + " entries" : ""}${accounts.length && stock.length ? " · " : ""}${stock.length ? stock.length + " warehouse(s), " + formatNumber(stock.reduce(function (a, w) { return a + w.items.length; }, 0)) + " stock items" : ""}</p></div>
          <button class="btn primary" type="button" id="importRunBtn" onclick="runImport()">Import All</button>
        </div>
        <div id="importProgress"></div>
        ${stock.length ? `
        <div class="table-wrap" style="margin-bottom:14px;">
          <table class="table">
            <thead><tr><th>Warehouse</th><th class="num">Items</th><th class="num">Items in stock</th><th class="num">Units</th><th>Stock date</th><th>Status</th></tr></thead>
            <tbody>
              ${stock.map(function (w, i) {
                const inStock = w.items.filter(function (it) { return Number(it[3]); }).length;
                const units = w.items.reduce(function (a, it) { return a + (Number(it[3]) || 0); }, 0);
                return "<tr><td>" + escapeHtml(w.name) + (w.source ? "<br><small>" + escapeHtml(w.source) + "</small>" : "") + "</td>" +
                  '<td class="num">' + formatNumber(w.items.length) + '</td><td class="num">' + formatNumber(inStock) + '</td><td class="num">' + formatNumber(units) + "</td>" +
                  "<td>" + escapeHtml(formatDate(w.date)) + '</td><td id="stockSt' + i + '"><span class="badge">Ready</span></td></tr>';
              }).join("")}
            </tbody>
          </table>
        </div>` : ""}
        ${accounts.length ? `<div class="table-wrap">
          <table class="table">
            <thead><tr><th>Account</th><th>Type</th><th class="num">Entries</th><th class="num">Opening</th><th class="num">Expected Balance</th><th class="num">ERP Balance</th><th>Status</th></tr></thead>
            <tbody>
              ${accounts.map(function (a, i) {
                const st = a._status || "Ready";
                const tone = /Done/.test(st) ? "success" : (/Error|differs/.test(st) ? "danger" : "");
                return "<tr><td>" + escapeHtml(a.name) + "<br><small>" + escapeHtml(a.source || "") + "</small></td>" +
                  "<td>" + escapeHtml(a.partyType === "supplier" ? "Supplier" : "Customer") + "</td>" +
                  '<td class="num">' + formatNumber(a.rows.length) + "</td>" +
                  '<td class="num">' + money(a.opening || 0) + "</td>" +
                  '<td class="num">' + money(a.expectedBalance) + "</td>" +
                  '<td class="num" id="impBal' + i + '">' + (a._balance == null ? "" : money(a._balance)) + "</td>" +
                  '<td id="impSt' + i + '"><span class="badge ' + tone + '">' + escapeHtml(st) + "</span></td></tr>";
              }).join("")}
            </tbody>
          </table>
        </div>` : ""}
      </div>` : ""}
    </div>`;

  const input = $("importFileInput");
  if (input) input.addEventListener("change", function () {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.format !== "arham-erp-import" || (!Array.isArray(data.accounts) && !Array.isArray(data.stock))) throw new Error("This is not an Arham ERP import file.");
        data.accounts = Array.isArray(data.accounts) ? data.accounts : [];
        (data.stock || []).forEach(function (w) {
          if (!w.name || !Array.isArray(w.items)) throw new Error("The file has a warehouse without a name or items.");
        });
        data.accounts.forEach(function (a) {
          if (!a.name || !Array.isArray(a.rows)) throw new Error("The file has an account without a name or entries.");
          if (a.partyType !== "supplier" && a.partyType !== "customer") throw new Error(a.name + ": type must be supplier or customer.");
        });
        data.fileName = file.name;
        state.importFile = data;
        renderImportPage();
      } catch (error) {
        showError(error.message || "Could not read the file.");
      }
    };
    reader.readAsText(file);
  });
}

function setImportStatus(i, text, balance) {
  const a = state.importFile.accounts[i];
  a._status = text;
  if (balance != null) a._balance = balance;
  const st = document.getElementById("impSt" + i);
  if (st) {
    const tone = /Done/.test(text) ? "success" : (/Error|differs/.test(text) ? "danger" : "");
    st.innerHTML = '<span class="badge ' + tone + '">' + escapeHtml(text) + "</span>";
  }
  const b = document.getElementById("impBal" + i);
  if (b && balance != null) b.textContent = money(balance);
}

async function runImport() {
  const f = state.importFile;
  if (!f || state.importRunning) return;
  const stockN = Array.isArray(f.stock) ? f.stock.length : 0;
  if (!confirm("Import " + (f.accounts.length ? f.accounts.length + " account(s)" : "") + (f.accounts.length && stockN ? " and " : "") +
    (stockN ? "stock for " + stockN + " warehouse(s)" : "") + " into the ERP now?")) return;
  state.importRunning = true;
  const btn = $("importRunBtn");
  if (btn) btn.disabled = true;
  const progress = $("importProgress");
  const total = f.accounts.reduce(function (a, x) { return a + x.rows.length; }, 0) +
    (f.stock || []).reduce(function (a, w) { return a + w.items.length; }, 0);
  let done = 0, ok = 0, failed = 0;
  const showProgress = function (label) {
    if (!progress) return;
    const pct = total ? Math.round(done / total * 100) : 100;
    progress.innerHTML = '<div style="margin:6px 0 12px;"><div style="height:8px;background:#e2e8f0;border-radius:6px;overflow:hidden;">' +
      '<div style="height:8px;width:' + pct + '%;background:#2563eb;"></div></div><small>' + escapeHtml(label) + " — " + pct + "%</small></div>";
  };
  for (let i = 0; i < f.accounts.length; i++) {
    const a = f.accounts[i];
    try {
      setImportStatus(i, "Starting...");
      showProgress(a.name);
      const waitMsg = function (n, sec) { setImportStatus(i, "Server busy, retry " + n + " in " + sec + "s..."); };
      const start = await importCall("importaccount", { partyType: a.partyType, name: a.name, opening: a.opening || 0 }, waitMsg);
      let count = Number(start.count) || 0;
      let balance = start.balance;
      done += Math.min(count, a.rows.length);
      if (count > a.rows.length) throw new Error("ERP already has more entries (" + count + ") than the file");
      while (count < a.rows.length) {
        const rows = a.rows.slice(count, count + IMPORT_BATCH);
        const res = await importCall("importentries", { partyType: a.partyType, partyId: start.id, start: count, rows: rows }, waitMsg);
        const before = count;
        count = Number(res.count) || 0;
        balance = res.balance;
        if (count <= before) throw new Error("No progress at entry " + (before + 1));
        done += count - before;
        setImportStatus(i, "Importing " + count + " / " + a.rows.length, balance);
        showProgress(a.name);
      }
      const diff = Math.abs(Number(balance) - Number(a.expectedBalance));
      if (diff <= 1) { setImportStatus(i, start.existing && start.count === a.rows.length ? "Done (already imported)" : "Done", balance); ok++; }
      else { setImportStatus(i, "Balance differs by " + money(diff), balance); failed++; }
    } catch (error) {
      setImportStatus(i, "Error: " + (error.message || "failed"));
      failed++;
    }
  }
  if (Array.isArray(f.stock) && f.stock.length) {
    try {
      let lastStart = {};
      await runStockImport(f, function (name) {
        done = Math.min(total, done + 40);
        showProgress("Stock: " + name);
      });
      ok += f.stock.length;
    } catch (error) {
      failed += 1;
    }
  }
  showProgress("Finished: " + ok + " done" + (failed ? ", " + failed + " need attention" : ""));
  state.importRunning = false;
  state.customers = []; state.suppliers = [];
  if (btn) btn.disabled = false;
  showToast(failed ? "Import finished with " + failed + " problem(s)." : "All accounts imported.");
}


/* ============================================================
   WAREHOUSES
   ============================================================ */

async function loadWarehouses(force) {
  if (!force && Array.isArray(state.warehouses) && state.warehouses.length) return state.warehouses;
  const data = await call("warehouses");
  state.warehouses = Array.isArray(data) ? data : [];
  return state.warehouses;
}

function activeWarehouses() {
  return (state.warehouses || []).filter(function (w) { return w.Active !== false; });
}

function warehouseLabel(id) {
  const w = (state.warehouses || []).find(function (x) { return String(x.WarehouseID) === String(id); });
  return w ? String(w.Name) : (id ? String(id) : "Unassigned");
}

function defaultWarehouseFor(key) {
  let saved = "";
  try { saved = localStorage.getItem("erp.warehouse." + key) || ""; } catch (e) { saved = ""; }
  const active = activeWarehouses();
  if (saved && active.some(function (w) { return String(w.WarehouseID) === saved; })) return saved;
  const def = active.find(function (w) { return w.IsDefault; }) || active[0];
  return def ? String(def.WarehouseID) : "";
}

function rememberWarehouse(key, id) {
  try { localStorage.setItem("erp.warehouse." + key, String(id || "")); } catch (e) { /* storage not available */ }
}

function warehouseOptions(selected) {
  return activeWarehouses().map(function (w) {
    return '<option value="' + escapeHtml(String(w.WarehouseID)) + '"' + (String(w.WarehouseID) === String(selected) ? " selected" : "") + ">" +
      escapeHtml(String(w.Name)) + "</option>";
  }).join("");
}

function productStockAt(product, warehouseId) {
  const loc = (product && product.Locations) || {};
  return Number(loc[String(warehouseId)]) || 0;
}

// Adds a "Warehouse" dropdown to the first row of a form (sale / purchase).
async function addWarehouseField(form, key, labelText) {
  if (!form || form.warehouseId) return;
  try { await loadWarehouses(); } catch (e) { return; }
  const grid = form.querySelector(".form-grid");
  if (!grid || !activeWarehouses().length) return;
  const label = document.createElement("label");
  label.innerHTML = escapeHtml(labelText) + '<select name="warehouseId">' + warehouseOptions(defaultWarehouseFor(key)) + "</select>";
  grid.insertBefore(label, grid.children[1] || null);
  form.warehouseId.addEventListener("change", function () { rememberWarehouse(key, form.warehouseId.value); });
}

function warehouseCardsHtml() {
  const list = state.warehouses || [];
  if (!list.length) return "";
  return '<div class="stat-grid" style="margin-bottom:14px;">' + list.map(function (w) {
    return statCard(w.Name + (w.IsDefault ? " (default)" : "") + (w.Active === false ? " (inactive)" : ""),
      formatNumber(w.Units || 0) + " units", formatNumber(w.Items || 0) + " item(s) in stock", w.IsDefault ? "blue" : "");
  }).join("") + "</div>";
}


/* ---------- Stock page ---------- */

async function loadStockPage() {
  const results = await Promise.all([call("apiStock"), loadWarehouses(true)]);
  state.stock = Array.isArray(results[0]) ? results[0] : [];
  renderStock(state.stock);
}

function renderStock(rows) {
  const columns = ["Date", "ProductName", "WarehouseName", "Type", "Qty", "Note", "BalanceAfter", "MovementID"];
  const whFilter = (state.warehouses || []).length > 1
    ? '<select id="stockWarehouseFilter" class="search" style="max-width:240px;"><option value="">All warehouses</option>' +
      (state.warehouses || []).map(function (w) { return '<option value="' + escapeHtml(String(w.WarehouseID)) + '">' + escapeHtml(String(w.Name)) + "</option>"; }).join("") +
      "</select>"
    : "";
  contentElement().innerHTML = `
    <div class="content">
      <div class="toolbar">
        <div>
          <h2>Stock Movements</h2>
          <p>Every stock change in every warehouse: purchases, sales, returns, transfers and adjustments.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn secondary" type="button" onclick="openTransferForm()">Transfer Stock</button>
          <button class="btn primary" type="button" onclick="openStockAdjustForm()">+ Stock Adjustment</button>
        </div>
      </div>
      ${warehouseCardsHtml()}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${whFilter}
        <div style="flex:1;min-width:220px;">${searchBox("stockSearch", "Search product, type or note...")}</div>
      </div>
      <div id="stockTable"></div>
    </div>`;
  renderSearchableTable(rows, columns, "stockSearch", "stockTable", whFilter ? "stockWarehouseFilter" : null, "WarehouseID");
}


/* ---------- Transfer ---------- */

async function openTransferForm(productId) {
  try {
    await Promise.all([loadWarehouses(true), call("apiProducts").then(function (d) { state.products = Array.isArray(d) ? d : []; })]);
  } catch (error) { showError(error.message); return; }
  const active = activeWarehouses();
  if (active.length < 2) { showError("Add a second warehouse in Settings before transferring stock."); return; }
  const products = state.products.slice().sort(function (a, b) { return String(a.Description || "").localeCompare(String(b.Description || "")); });
  const from0 = defaultWarehouseFor("transfer-from");
  const to0 = (active.find(function (w) { return String(w.WarehouseID) !== from0; }) || active[0]).WarehouseID;

  contentElement().innerHTML = `
    <div class="content">
      <div class="panel">
        <div class="panel-header">
          <h2>Transfer Stock</h2>
          <button class="btn secondary" type="button" onclick="showPage('stock')">Back</button>
        </div>
        <p style="margin:0 0 12px;">Move items from one warehouse to another. Total stock does not change.</p>
        <form id="transferForm" class="erp-form">
          <label>Product<select name="productId" required><option value="">Select product...</option>
            ${products.map(function (p) {
              const id = String(p.ProductID == null ? "" : p.ProductID);
              return '<option value="' + escapeHtml(id) + '"' + (id === String(productId || "") ? " selected" : "") + ">" + escapeHtml(p.Description || id) + "</option>";
            }).join("")}
          </select></label>
          <div class="form-grid">
            <label>From<select name="fromId">${warehouseOptions(from0)}</select></label>
            <label>To<select name="toId">${warehouseOptions(to0)}</select></label>
            <label>Quantity<input type="number" name="qty" min="1" step="1" required></label>
            <label>Date<input type="date" name="date" value="${todayInput()}" required></label>
          </div>
          <label>Note<input name="note" autocomplete="off" placeholder="Optional"></label>
          <p id="transferPreview" style="margin:8px 0 0;"></p>
          <div class="form-actions"><button type="submit" class="btn primary">Transfer</button></div>
        </form>
      </div>
    </div>`;

  const form = $("transferForm");
  const preview = function () {
    const p = state.products.find(function (x) { return String(x.ProductID) === form.productId.value; });
    const el = document.getElementById("transferPreview");
    if (!p) { el.textContent = ""; return; }
    const q = Number(form.qty.value) || 0;
    const a = productStockAt(p, form.fromId.value), b = productStockAt(p, form.toId.value);
    el.innerHTML = escapeHtml(warehouseLabel(form.fromId.value)) + ": <b>" + formatNumber(a) + "</b> → <b>" + formatNumber(a - q) + "</b> &nbsp;|&nbsp; " +
      escapeHtml(warehouseLabel(form.toId.value)) + ": <b>" + formatNumber(b) + "</b> → <b>" + formatNumber(b + q) + "</b>" +
      (q > a ? ' <span class="badge danger">Not enough stock</span>' : "") +
      (form.fromId.value === form.toId.value ? ' <span class="badge danger">Choose two different warehouses</span>' : "");
  };
  form.addEventListener("input", preview);
  form.addEventListener("change", preview);
  preview();
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!form.productId.value) { showError("Please select a product."); return; }
    if (form.fromId.value === form.toId.value) { showError("Choose two different warehouses."); return; }
    const button = form.querySelector('button[type="submit"]');
    try {
      if (button) button.disabled = true;
      showToast("Transferring...");
      const r = await call("stocktransfer", { productId: form.productId.value, fromId: form.fromId.value, toId: form.toId.value,
        qty: Number(form.qty.value) || 0, date: form.date.value, note: form.note.value.trim() });
      rememberWarehouse("transfer-from", form.fromId.value);
      showToast("Transferred " + r.qty + ". " + warehouseLabel(r.from) + " now " + r.fromLeft + ", " + warehouseLabel(r.to) + " now " + r.toNow + ".");
      state.products = [];
      showPage("stock");
    } catch (error) {
      if (button) button.disabled = false;
      showError(error.message || "Could not transfer.");
    }
  });
}


/* ---------- Warehouses in Settings ---------- */

function warehousePanelHtml() {
  const list = state.warehouses || [];
  return `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-header">
        <div><h3>Warehouses</h3><p style="margin:4px 0 0;">Stock is kept per warehouse. The default warehouse is pre-selected on new sales and purchases.</p></div>
        <button class="btn primary" type="button" onclick="addWarehousePrompt()">+ Add Warehouse</button>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Actions</th><th>Name</th><th class="num">Units</th><th class="num">Items</th><th>Status</th></tr></thead>
          <tbody>
            ${list.length ? list.map(function (w) {
              const id = String(w.WarehouseID);
              return "<tr><td class=\"party-action-cell\"><div class=\"row-actions\" style=\"display:flex;gap:4px;flex-wrap:wrap;\">" +
                actionButton("Rename", "renameWarehousePrompt", [id]) +
                (w.IsDefault ? "" : actionButton("Make Default", "updateWarehouseAction", [id, "default"])) +
                actionButton(w.Active === false ? "Activate" : "Deactivate", "updateWarehouseAction", [id, w.Active === false ? "on" : "off"]) +
                "</div></td><td>" + escapeHtml(String(w.Name)) + "</td><td class=\"num\">" + formatNumber(w.Units || 0) + "</td><td class=\"num\">" +
                formatNumber(w.Items || 0) + "</td><td>" + (w.IsDefault ? '<span class="badge success">Default</span> ' : "") +
                (w.Active === false ? '<span class="badge">Inactive</span>' : '<span class="badge success">Active</span>') + "</td></tr>";
            }).join("") : '<tr><td colspan="5" class="empty">No warehouses yet. Add one, or import stock from the Import page.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function addWarehousePrompt() {
  const name = prompt("New warehouse name:");
  if (!name || !name.trim()) return;
  try {
    await call("warehouse", { name: name.trim() });
    showToast("Warehouse added.");
    await loadWarehouses(true);
    renderSettingsPage();
  } catch (error) { showError(error.message); }
}

async function renameWarehousePrompt(id) {
  const name = prompt("New name for " + warehouseLabel(id) + ":", warehouseLabel(id));
  if (!name || !name.trim()) return;
  try {
    await call("updatewarehouse", { warehouseId: id, name: name.trim() });
    await loadWarehouses(true);
    renderSettingsPage();
    showToast("Warehouse renamed.");
  } catch (error) { showError(error.message); }
}

async function updateWarehouseAction(id, what) {
  const payload = { warehouseId: id };
  if (what === "default") payload.makeDefault = true;
  if (what === "on") payload.active = true;
  if (what === "off") payload.active = false;
  try {
    await call("updatewarehouse", payload);
    await loadWarehouses(true);
    renderSettingsPage();
    showToast("Warehouse updated.");
  } catch (error) { showError(error.message); }
}


/* ---------- Stock import (Import page) ---------- */

async function runStockImport(f, progress) {
  const stock = Array.isArray(f.stock) ? f.stock : [];
  for (let wi = 0; wi < stock.length; wi++) {
    const w = stock[wi];
    const statusId = "stockSt" + wi;
    const set = function (t) { const el = document.getElementById(statusId); if (el) el.innerHTML = '<span class="badge ' + (/Done/.test(t) ? "success" : (/Error/.test(t) ? "danger" : "")) + '">' + escapeHtml(t) + "</span>"; };
    try {
      let created = 0, moves = 0;
      for (let start = 0; start < w.items.length; start += 40) {
        const res = await importCall("importstock", { warehouseName: w.name, date: w.date, start: start, items: w.items.slice(start, start + 40) },
          function (n, sec) { set("Server busy, retry " + n + " in " + sec + "s..."); });
        created += res.created || 0; moves += res.movements || 0;
        set("Importing " + Math.min(start + 40, w.items.length) + " / " + w.items.length);
        if (progress) progress(w.name);
      }
      set("Done");
    } catch (error) {
      set("Error: " + (error.message || "failed"));
      throw error;
    }
  }
  state.products = [];
  state.warehouses = [];
}

/* ============================================================
   PRODUCT ADD / EDIT
   ============================================================ */

async function openProductForm(productId) {
  try { await loadWarehouses(); } catch (e) { /* warehouses are optional here */ }
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
              : `<label>Opening Stock<input type="number" name="openingStock" min="0" step="1" value="0"></label>` +
                (activeWarehouses().length ? '<label>Opening Stock Warehouse<select name="warehouseId">' + warehouseOptions(defaultWarehouseFor("product")) + "</select></label>" : "")}
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
      if (form.warehouseId) payload.warehouseId = form.warehouseId.value;
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
  if (Array.isArray(rows) && rows.length) {
    const used = columns.filter(function (c) {
      return rows.some(function (r) { const v = r[c]; return v !== null && v !== undefined && String(v).trim() !== ""; });
    });
    if (used.length) columns = used;
  }

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
  if (String(value).indexOf("WH:") === 0) return warehouseLabel(String(value).slice(3));
  if (value === "WarehouseName") return "Warehouse";
  if (value === "CurrentStock") return (state.warehouses || []).length > 1 ? "Total Stock" : "Current Stock";
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
  if (String(column).indexOf("WH:") === 0) return Number(value) ? escapeHtml(formatNumber(value)) : '<span style="color:#cbd5e1">0</span>';
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
  addWarehouseField($("saleForm"), "sale", "Warehouse (stock goes out from)");

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
    if (form.warehouseId) payload.warehouseId = form.warehouseId.value;
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
  addWarehouseField($("purchaseForm"), "purchase", "Warehouse (stock comes into)");

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
    if (form.warehouseId) payload.warehouseId = form.warehouseId.value;


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


/* ============================================================
   LANGUAGE (English / Urdu)
   The choice is kept on this device. Urdu covers the menu, page titles,
   sign-in, home and the Sale / Purchase screens.
   ============================================================ */
const UR = {
  "Workspace": "ورک اسپیس", "Transactions": "لین دین", "Reports": "رپورٹس", "System": "سسٹم",
  "Dashboard": "ڈیش بورڈ", "Products": "پروڈکٹس", "Stock": "اسٹاک", "Customers": "گاہک", "Suppliers": "سپلائرز",
  "Sales": "سیلز", "Purchases": "خریداری", "Payments": "ادائیگیاں", "Expenses": "اخراجات",
  "Incentive Report": "انسینٹو رپورٹ", "Settings": "سیٹنگز", "Import": "امپورٹ", "Import Old Ledgers": "پرانے کھاتے امپورٹ",
  "Ledger": "کھاتہ", "Refresh": "ریفریش", "Live": "لائیو", "Home": "ہوم",
  "New Sale": "نئی سیل", "New Purchase": "نئی خریداری", "Sale": "سیل", "Purchase": "خریداری",
  "Sell to a customer": "گاہک کو مال بیچیں", "Buy from a supplier": "سپلائر سے مال خریدیں",
  "Search name or mobile number": "نام یا موبائل نمبر تلاش کریں", "Search supplier": "سپلائر تلاش کریں",
  "Cash customer (walk-in)": "نقد گاہک (واک اِن)", "Frequent customers": "اکثر آنے والے گاہک", "Frequent suppliers": "اکثر والے سپلائر",
  "Due": "بقایا", "Advance": "ایڈوانس", "Settled": "صاف", "To pay": "دینا ہے",
  "Customer name or mobile number": "گاہک کا نام یا موبائل نمبر", "Example: Ali or 0300 1234567": "مثال: علی یا 0300 1234567",
  "Continue": "آگے", "Continue without name": "نام کے بغیر آگے", "No customer found": "کوئی گاہک نہیں ملا", "No supplier found": "کوئی سپلائر نہیں ملا",
  "New supplier": "نیا سپلائر",
  "Change": "تبدیل کریں", "Search item": "آئٹم تلاش کریں", "none left": "ختم", "Add": "شامل کریں",
  "In this sale": "اس سیل میں", "In this purchase": "اس خریداری میں",
  "Last rate for this customer": "اس گاہک کا پچھلا ریٹ", "Last rate from this supplier": "اس سپلائر کا پچھلا ریٹ", "Rate": "ریٹ", "each": "فی عدد",
  "Enter rate": "ریٹ لکھیں", "Remove": "ہٹائیں", "No item found": "کوئی آئٹم نہیں ملا",
  "Search an item above and tap Add.": "اوپر آئٹم تلاش کریں اور شامل کریں دبائیں۔",
  "items": "آئٹم", "units": "عدد", "Next": "آگے", "Total for": "کل رقم:",
  "How much did the customer pay?": "گاہک نے کتنی رقم دی؟", "How much did you pay?": "آپ نے کتنی رقم دی؟", "Full paid": "پوری رقم ادا",
  "Credit (nothing paid now)": "ادھار (ابھی کچھ نہیں دیا)", "Part paid": "کچھ رقم ادا", "Amount received": "وصول شدہ رقم", "Amount paid": "ادا شدہ رقم",
  "Cash": "نقد", "Online": "آن لائن", "Cheque": "چیک", "Discount or note": "رعایت یا نوٹ", "Discount": "رعایت", "Note": "نوٹ",
  "Salesperson": "سیلز مین", "None": "کوئی نہیں", "Added to account": "کھاتے میں جائے گا", "Save Sale": "سیل محفوظ کریں", "Save Purchase": "خریداری محفوظ کریں",
  "Saving...": "محفوظ ہو رہی ہے...", "Sale saved": "سیل محفوظ ہو گئی", "Purchase saved": "خریداری محفوظ ہو گئی", "saved": "محفوظ ہو گئی",
  "Stock and the customer's account are already updated.": "اسٹاک اور گاہک کا کھاتہ اپڈیٹ ہو گئے ہیں۔",
  "Stock and the supplier's account are already updated.": "اسٹاک اور سپلائر کا کھاتہ اپڈیٹ ہو گئے ہیں۔",
  "Total": "کل رقم", "Received": "وصول", "Paid": "ادا کیا", "New balance": "نیا بقایا", "Send invoice on WhatsApp": "واٹس ایپ پر بل بھیجیں",
  "Print": "پرنٹ", "Bill PDF": "بل PDF", "from": "گودام:", "Goes to": "مال کہاں جائے گا", "Loading...": "لوڈ ہو رہا ہے...", "Cash customer": "نقد گاہک",
  "Credit needs a name or mobile number.": "ادھار کے لیے نام یا موبائل نمبر ضروری ہے۔",
  "No single warehouse has all these items. Transfer the stock first, or make two sales.": "کسی ایک گودام میں یہ سب آئٹم موجود نہیں۔ پہلے اسٹاک منتقل کریں یا دو الگ سیلز بنائیں۔",
  "Only this much is in stock": "اسٹاک میں اتنا ہی ہے", "Enter the rate for every item.": "ہر آئٹم کا ریٹ لکھیں۔",
  "Enter the amount received.": "وصول شدہ رقم لکھیں۔", "Enter the amount paid.": "ادا شدہ رقم لکھیں۔", "Full form": "مکمل فارم",
  "Could not load the data.": "ڈیٹا لوڈ نہیں ہو سکا۔",
  "Try again": "دوبارہ کوشش کریں", "Back": "واپس", "Language": "زبان",
  "New item": "نیا آئٹم", "Not in the list?": "لسٹ میں نہیں ہے؟",
  "Search another item": "اگلا آئٹم تلاش کریں", "+ Add another item": "+ ایک اور آئٹم",
  "Sign in": "سائن اِن", "Username": "یوزر نیم", "PIN": "پِن", "Signing in...": "سائن اِن ہو رہا ہے...",
  "Sign out": "سائن آؤٹ", "Signed in as": "سائن اِن:", "Hello": "السلام علیکم", "More": "مزید",
  "Install app": "ایپ انسٹال کریں", "Send to shop": "دکان کو مال بھیجیں", "Sending to": "مال جا رہا ہے:", "Main godam": "مین گودام",
  "Goods from main shop to Hamza / GM": "مین دکان سے حمزہ / جی ایم کو مال", "Choose the shop": "دکان منتخب کریں", "Sent": "بھیج دیا",
  "Challan": "چالان", "Received": "وصول شدہ", "Sent to shops": "دکانوں کو بھیجا", "Save and send": "محفوظ کریں اور بھیجیں",
  "Goods sent": "مال بھیج دیا گیا", "Goods to send": "بھیجنے والا مال", "The goods are now in the shop's stock.": "مال اب دکان کے اسٹاک میں ہے۔", "New": "نیا", "My Stock": "میرا اسٹاک", "Purchase from owner": "مالک سے خریداری",
  "Search item in my stock": "اسٹاک میں آئٹم تلاش کریں", "View only": "صرف دیکھنے کے لیے", "Sale price": "سیل ریٹ", "Nothing in stock.": "اسٹاک میں کچھ نہیں۔", "Inward": "مال وصولی", "Goods received from owner": "مالک سے آیا مال درج کریں",
  "Goods received at": "مال وصول ہوا:", "Goods received": "وصول شدہ مال", "In shop": "دکان میں", "Owner godam": "مالک کا گودام",
  "Save Inward": "وصولی محفوظ کریں", "Inward saved": "وصولی محفوظ ہو گئی", "New Inward": "نئی وصولی", "Units": "عدد",
  "The goods are now in the shop's stock.": "مال اب دکان کے اسٹاک میں ہے۔",
  "unit(s) were not in the owner's godam on record. The owner will check them.": "عدد مالک کے گودام کے ریکارڈ میں نہیں تھے۔ مالک انہیں چیک کرے گا۔",
  "Example: sent with Rashid": "مثال: راشد کے ہاتھ آیا", "Inwards": "وصولیاں", "Shop": "دکان", "My Bills": "میرے بل", "Bills": "بل", "Made by": "بنانے والا",
  "No bills yet.": "ابھی کوئی بل نہیں۔", "Last 60 days": "پچھلے 60 دن", "Cancelled": "منسوخ", "Today": "آج", "What do you want to do?": "آپ کیا کرنا چاہتے ہیں؟"
};

function getLang() {
  try { return localStorage.getItem("erpLang") === "ur" ? "ur" : "en"; } catch (e) { return "en"; }
}

function t(text) {
  return getLang() === "ur" && UR[text] ? UR[text] : text;
}

function setLang(lang) {
  try { localStorage.setItem("erpLang", lang); } catch (e) { /* private mode */ }
  applyLanguage();
  if (state.page === "quicksale" || state.page === "quickpurchase") renderQuick();
  else if (state.page === "home") renderHome();
  else updatePageTitle(state.page);
  if ($("loginScreen")) renderLogin();
}

function ensureUrduFont() {
  if (document.getElementById("urduFont")) return;
  const link = document.createElement("link");
  link.id = "urduFont";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap";
  document.head.appendChild(link);
}

// Translates the menu and top bar. Each element keeps its English text in data-en.
function applyLanguage() {
  const ur = getLang() === "ur";
  if (ur) ensureUrduFont();
  document.body.classList.toggle("lang-ur", ur);
  document.querySelectorAll(".nav-caption, .nav[data-page] span:not(.nav-icon):not(.nav-dot), #refreshBtn span, .system-status, [data-i18n]")
    .forEach(function (el) {
      if (el.dataset.en == null) el.dataset.en = el.textContent.trim();
      const en = el.dataset.en;
      if (el.classList.contains("system-status")) {
        el.innerHTML = '<span class="online-dot"></span> ' + escapeHtml(t(en));
      } else {
        el.textContent = t(en);
      }
      el.classList.toggle("ur-text", ur && !!UR[en]);
    });
  document.querySelectorAll(".lang-switch button").forEach(function (b) {
    b.classList.toggle("on", b.dataset.lang === getLang());
  });
}

function langSwitchHtml() {
  return '<div class="lang-switch" role="group" aria-label="Language"><button type="button" data-lang="en" onclick="setLang(\'en\')"' +
    (getLang() === "en" ? ' class="on"' : "") + '>EN</button><button type="button" data-lang="ur" onclick="setLang(\'ur\')" class="ur-text' +
    (getLang() === "ur" ? " on" : "") + '">اردو</button></div>';
}

function addLanguageSwitch() {
  const bar = document.querySelector(".topbar-actions");
  if (!bar || bar.querySelector(".lang-switch")) return;
  const box = document.createElement("div");
  box.innerHTML = langSwitchHtml();
  bar.insertBefore(box.firstChild, bar.firstChild);
}


/* ============================================================
   SIGN-IN AND ACCESS
   Until the owner account exists the portal works as before (open).
   After that every request carries the user's token, and the menu
   shows only the parts the owner has given that user.
   ============================================================ */
const MODULE_LABELS = [
  ["quicksale", "Sale"], ["quickpurchase", "Purchase"], ["inward", "Send goods to shops (main shop staff)"], ["mystock", "My shop stock (view only)"], ["dashboard", "Dashboard"], ["products", "Products and stock"],
  ["customers", "Customers"], ["suppliers", "Suppliers"], ["sales", "Sales list, returns, full sale form"],
  ["purchases", "Purchases list, returns, full purchase form"], ["payments", "Payments"], ["expenses", "Expenses"],
  ["incentives", "Incentive report"], ["reports", "Reports"]
];

// Which module opens each page. A page opens if the user has any of them.
const PAGE_MODULES = {
  home: [], dashboard: ["dashboard"], quicksale: ["quicksale", "sales"], quickpurchase: ["quickpurchase", "purchases"],
  bills: ["quicksale", "quickpurchase", "inward", "mystock", "sales", "purchases"], inward: ["inward"], mystock: ["mystock"],
  products: ["products"], stock: ["products"], customers: ["customers"], suppliers: ["suppliers"],
  ledger: ["customers", "suppliers", "payments"], sales: ["sales"], purchases: ["purchases"], payments: ["payments"],
  expenses: ["expenses"], incentives: ["incentives"], reports: ["reports"], settings: ["admin"], import: ["admin"]
};

function getSession() {
  try { return JSON.parse(localStorage.getItem("erpSession") || "null"); } catch (e) { return null; }
}

function setSession(s) {
  try {
    if (s) localStorage.setItem("erpSession", JSON.stringify(s));
    else localStorage.removeItem("erpSession");
  } catch (e) { /* private mode */ }
}

function sessionToken() {
  const s = getSession();
  return s && s.token ? s.token : "";
}

function isAdminUser() {
  return !state.user || !!state.user.admin;
}

function isShopUser() {
  return !!(state.user && !state.user.admin && state.user.shopId);
}

// Shop staff see their stock but never add or change it; goods come only from the owner (Inward).
const SHOP_BLOCKED_PAGES = ["quickpurchase", "products", "stock", "purchases", "suppliers", "inward"];

function canOpen(page) {
  if (!state.user) return true;                 // open mode (no owner account yet)
  if (state.user.admin) return true;
  if (isShopUser() && SHOP_BLOCKED_PAGES.indexOf(page) !== -1) return false;
  const need = PAGE_MODULES[page];
  if (!need) return false;
  if (!need.length) return true;
  return need.some(function (m) { return state.user.modules.indexOf(m) !== -1; });
}

function homePage() {
  return canOpen("dashboard") ? "dashboard" : "home";
}

function applyPermissions() {
  // For shop staff, Inward is their purchase (from the owner only).
  const inNav = document.querySelector('.nav[data-page="inward"] span:not(.nav-icon)');
  if (inNav) { inNav.dataset.en = "Send to shop"; inNav.textContent = t(inNav.dataset.en); }
  document.querySelectorAll(".nav[data-page]").forEach(function (b) {
    let show = canOpen(b.dataset.page);
    if (b.dataset.page === "home") show = !canOpen("dashboard");
    b.style.display = show ? "" : "none";
  });
  // Hide a section caption when nothing under it is visible.
  document.querySelectorAll(".nav-caption").forEach(function (cap) {
    let el = cap.nextElementSibling, any = false;
    while (el && !el.classList.contains("nav-caption")) {
      if (el.matches && el.matches(".nav[data-page]") && el.style.display !== "none") any = true;
      if (el.tagName === "NAV") {
        el.querySelectorAll(".nav[data-page]").forEach(function (b) { if (b.style.display !== "none") any = true; });
      }
      el = el.nextElementSibling;
    }
    cap.style.display = any ? "" : "none";
  });
  renderUserBox();
}

function renderUserBox() {
  const box = document.querySelector(".side-note");
  if (!box) return;
  if (!state.user) {
    box.innerHTML = '<span class="online-dot"></span><div><b>System Online</b><small>Google Sheets Database</small></div>';
    return;
  }
  box.innerHTML = '<div class="user-box"><small data-i18n>Signed in as</small><b>' + escapeHtml(state.user.name) + "</b></div>" +
    '<button type="button" class="btn secondary signout-btn" onclick="signOut()" data-i18n>Sign out</button>';
  applyLanguage();
}

function clearSavedData() {
  try {
    Object.keys(localStorage).forEach(function (k) {
      if (k === "erpDashboard" || k.indexOf("erpQuick_") === 0) localStorage.removeItem(k);
    });
  } catch (e) { /* private mode */ }
}

function signOut() {
  clearSavedData();
  setSession(null);
  state.user = null;
  qs.data = null;
  showLogin();
}

function onAuthExpired() {
  if ($("loginScreen")) return;
  setSession(null);
  state.user = null;
  showLogin();
}

function showLogin(message) {
  state.loginMessage = message || "";
  let el = $("loginScreen");
  if (!el) {
    el = document.createElement("div");
    el.id = "loginScreen";
    el.className = "login-screen";
    document.body.appendChild(el);
  }
  document.body.classList.add("locked");
  renderLogin();
}

function renderLogin() {
  const el = $("loginScreen");
  if (!el) return;
  const ur = getLang() === "ur";
  el.innerHTML = '<div class="login-card"' + (ur ? ' dir="rtl"' : "") + '>' +
    '<div class="login-top"><div class="brand-mark">AE</div>' + langSwitchHtml() + "</div>" +
    "<h1>" + escapeHtml(state.company || "Arham Electronics") + "</h1>" +
    '<form id="loginForm" autocomplete="on">' +
    "<label>" + escapeHtml(t("Username")) + '<input name="username" dir="ltr" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>' +
    "<label>" + escapeHtml(t("PIN")) + '<input name="pin" dir="ltr" type="password" inputmode="numeric" autocomplete="current-password" required></label>' +
    (state.loginMessage ? '<p class="login-error">' + escapeHtml(state.loginMessage) + "</p>" : "") +
    '<button type="submit" class="qs-btn qs-primary">' + escapeHtml(t("Sign in")) + "</button>" +
    "</form>" +
    (state.installPrompt ? '<button type="button" class="qs-btn login-install" onclick="installApp()">' + escapeHtml(t("Install app")) + "</button>" : "") +
    "</div>";
  const form = $("loginForm");
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = t("Signing in...");
    try {
      const res = await call("login", { username: form.username.value, pin: form.pin.value });
      setSession({ token: res.token, user: res.user });
      state.user = res.user;
      el.remove();
      document.body.classList.remove("locked");
      applyPermissions();
      showPage(homePage());
    } catch (error) {
      state.loginMessage = String(error.message || "Could not sign in.").replace(/^Backend action 'login' failed: /, "");
      renderLogin();
    }
  });
  const first = form.username;
  if (first) first.focus();
}

// Runs once when the portal opens.
async function authBoot() {
  addLanguageSwitch();
  applyLanguage();
  // Signed in on this phone before: open straight away and check the sign-in in the background.
  const saved = getSession();
  if (saved && saved.token && saved.user) {
    state.authEnabled = true;
    state.user = saved.user;
    applyPermissions();
    showPage(startPageFromUrl());
    call("me", {}).then(function (me) {
      if (me && me.userId) {
        state.user = me;
        setSession({ token: saved.token, user: me });
        applyPermissions();
      }
      else if (me && me.open) {           // users were reset: the portal is open again
        setSession(null);
        state.user = null;
        state.authEnabled = false;
        applyPermissions();
      }
    }).catch(function () { /* an expired sign-in shows the sign-in screen by itself */ });
    return;
  }
  let status = null;
  try { status = await call("authstatus", {}); } catch (e) { status = null; }
  state.authEnabled = !!(status && status.enabled);
  try { localStorage.setItem("erpAuthOn", state.authEnabled ? "1" : "0"); } catch (e) { /* private mode */ }
  state.company = status && status.company ? status.company : "Arham Electronics";
  if (state.authEnabled) {
    const s = getSession();
    if (!s || !s.token) { applyPermissions(); showLogin(); return; }
    try {
      const me = await call("me", {});
      state.user = me && me.userId ? me : null;
      if (!state.user) throw new Error("AUTH");
      setSession({ token: s.token, user: me });
    } catch (e) {
      setSession(null);
      applyPermissions();
      showLogin();
      return;
    }
  } else {
    state.user = null;
  }
  applyPermissions();
  showPage(startPageFromUrl());
}

function startPageFromUrl() {
  try {
    const want = new URLSearchParams(location.search).get("page");
    if (want && canOpen(want)) return want;
  } catch (e) { /* old browser */ }
  return homePage();
}


/* ============================================================
   HOME: two big buttons, Sale and Purchase
   ============================================================ */
function bigActionsHtml() {
  const out = [];
  if (canOpen("quicksale")) {
    out.push('<button type="button" class="big-btn big-sale" onclick="showPage(\'quicksale\')"><i aria-hidden="true">↗</i><span><b>' +
      escapeHtml(t("Sale")) + "</b><small>" + escapeHtml(t("Sell to a customer")) + "</small></span></button>");
  }
  if (canOpen("quickpurchase")) {
    out.push('<button type="button" class="big-btn big-purchase" onclick="showPage(\'quickpurchase\')"><i aria-hidden="true">↙</i><span><b>' +
      escapeHtml(t("Purchase")) + "</b><small>" + escapeHtml(t("Buy from a supplier")) + "</small></span></button>");
  }
  if (canOpen("inward") && !isShopUser()) {
    out.push('<button type="button" class="big-btn big-inward" onclick="showPage(\'inward\')"><i aria-hidden="true">⇨</i><span><b>' +
      escapeHtml(t("Send to shop")) + "</b><small>" + escapeHtml(t("Goods from main shop to Hamza / GM")) + "</small></span></button>");
  }
  return out.length ? '<div class="big-actions' + (getLang() === "ur" ? " ur" : "") + '"' + (getLang() === "ur" ? ' dir="rtl"' : "") + ">" + out.join("") + "</div>" : "";
}

function renderHome() {
  const more = [["mystock", "My Stock"], ["bills", isAdminUser() ? "Bills" : "My Bills"], ["customers", "Customers"], ["suppliers", "Suppliers"], ["products", "Products"], ["stock", "Stock"],
    ["sales", "Sales"], ["purchases", "Purchases"], ["payments", "Payments"], ["expenses", "Expenses"], ["reports", "Reports"]]
    .filter(function (x) { return canOpen(x[0]); });
  const ur = getLang() === "ur";
  contentElement().innerHTML = '<div class="content home-page"' + (ur ? ' dir="rtl"' : "") + ">" +
    '<p class="home-hello">' + escapeHtml(t("Hello")) + (state.user ? ", " + escapeHtml(state.user.name) : "") + "</p>" +
    "<h2>" + escapeHtml(t("What do you want to do?")) + "</h2>" +
    bigActionsHtml() +
    (more.length ? "<h4>" + escapeHtml(t("More")) + '</h4><div class="home-more">' + more.map(function (x) {
      return '<button type="button" class="btn secondary" onclick="showPage(\'' + x[0] + '\')">' + escapeHtml(t(x[1])) + "</button>";
    }).join("") + "</div>" : "") +
    "</div>";
  updatePageTitle("home");
  qsPrefetch();
}


/* ============================================================
   QUICK SALE / QUICK PURCHASE (mobile)
   Step 1 party, step 2 items, step 3 payment, step 4 done.
   ============================================================ */
const qs = { mode: "sale", data: null, step: 1, customer: null, walkInOpen: false, items: [], custQuery: "", itemQuery: "",
  pay: "full", paid: "", method: "cash", discount: "", note: "", more: false, salespersonId: "", whId: "", saving: false, result: null };

function isBuy() { return qs.mode === "purchase"; }
function isInward() { return qs.mode === "inward"; }
function qsPage(mode) { return mode === "purchase" ? "quickpurchase" : (mode === "inward" ? "inward" : "quicksale"); }
function qsDataAction(mode) { return mode === "purchase" ? "quickpurchasedata" : (mode === "inward" ? "inwarddata" : "quicksaledata"); }

function qsReset() {
  qs.step = 1; qs.customer = null; qs.walkInOpen = false; qs.items = []; qs.custQuery = ""; qs.itemQuery = "";
  qs.pay = "full"; qs.paid = ""; qs.method = "cash"; qs.discount = ""; qs.note = ""; qs.more = false;
  qs.saving = false; qs.result = null; qs.whId = "";
  try { qs.salespersonId = localStorage.getItem("qsSalesperson") || ""; } catch (e) { qs.salespersonId = ""; }
}

function loadQuickSale(force) { return loadQuick("sale", force); }
function loadQuickPurchase(force) { return loadQuick("purchase", force); }

async function loadQuick(mode, force) {
  if (qs.mode !== mode) { qs.mode = mode; qs.data = null; qs.ready = false; }
  if (!qs.ready || qs.step === 4) { qsReset(); qs.ready = true; }
  if ((qs.step === 1 || isInward()) && !qs.items.length) force = true;   // fresh stock and balances for every new entry
  if (!qs.data) qs.data = qsCached(mode);
  if (qs.data && force) {
    // Show the saved copy at once; fresh stock and balances replace it in a moment.
    qsRefreshInBackground(mode);
    if (state.page !== qsPage(qs.mode)) return;
    renderQuick();
    return;
  }
  if (!qs.data || force) {
    contentElement().innerHTML = '<div class="content"><div class="qs"><div class="qs-loading">' + escapeHtml(t("Loading...")) + "</div></div></div>";
    try {
      qs.data = await call(qsDataAction(qs.mode), {});
      qsSaveCache(mode, qs.data);
    } catch (error) {
      contentElement().innerHTML = '<div class="content"><div class="qs"><div class="qs-loading"><p>' + escapeHtml(t("Could not load the data.")) +
        "</p><p><small>" + escapeHtml(error.message || "") + '</small></p><button class="qs-btn qs-primary" type="button" onclick="loadQuick(qs.mode, true)">' +
        escapeHtml(t("Try again")) + "</button></div></div></div>";
      return;
    }
  }
  if (state.page !== qsPage(qs.mode)) return;
  renderQuick();
}

function qsCacheKey(mode) {
  const u = state.user ? state.user.userId : "open";
  return "erpQuick_" + mode + "_" + u;
}

function qsCached(mode) {
  try { return JSON.parse(localStorage.getItem(qsCacheKey(mode)) || "null"); } catch (e) { return null; }
}

function qsSaveCache(mode, data) {
  try { localStorage.setItem(qsCacheKey(mode), JSON.stringify(data)); } catch (e) { /* storage full or private mode */ }
}

let qsRefreshing = {};
function qsRefreshInBackground(mode) {
  if (qsRefreshing[mode]) return qsRefreshing[mode];
  qsRefreshing[mode] = call(qsDataAction(mode), {}).then(function (data) {
    qsSaveCache(mode, data);
    if (qs.mode === mode) {
      qs.data = data;
      const page = qsPage(mode);
      // Redraw only the first screen with nothing typed, so nothing the user is doing jumps.
      if (state.page === page && qs.step === 1 && !qs.custQuery && !qs.walkInOpen) renderQuick();
      if (state.page === page && mode === "inward" && qs.step === 1) renderQuick();
    }
    return data;
  }).catch(function () { return null; }).then(function (d) { qsRefreshing[mode] = null; return d; });
  return qsRefreshing[mode];
}

// Fetch Sale / Purchase data early (from Home and Dashboard) so the screens open instantly.
function qsPrefetch() {
  setTimeout(function () {
    if (canOpen("quicksale")) qsRefreshInBackground("sale");
    if (canOpen("quickpurchase")) qsRefreshInBackground("purchase");
    if (canOpen("inward")) qsRefreshInBackground("inward");
  }, 1500);
}

function qsNum(v) {
  const n = Number(String(v == null ? "" : v).replace(/,/g, ""));
  return isFinite(n) ? n : 0;
}

function qsMoney(v) {
  return "Rs. " + Math.round(qsNum(v)).toLocaleString("en-US");
}

function qsProduct(id) {
  return (qs.data.products || []).find(function (p) { return p.id === id; });
}

function qsParties() {
  return (isBuy() ? qs.data.suppliers : qs.data.customers) || [];
}

function qsSubtotal() {
  return qs.items.reduce(function (a, it) { return a + it.qty * qsNum(it.rate); }, 0);
}

function qsTotal() {
  return Math.max(0, qsSubtotal() - qsNum(qs.discount));
}

function qsPaidAmount() {
  if (qs.pay === "full") return qsTotal();
  if (qs.pay === "credit") return 0;
  return Math.min(qsNum(qs.paid), qsTotal());
}

function qsIsAnonymous() {
  const c = qs.customer;
  return !isBuy() && !!c && !c.id && !c.name && !c.phone;
}

function qsWarehousesSorted() {
  return (qs.data.warehouses || []).slice().sort(function (a, b) { return (b.IsDefault ? 1 : 0) - (a.IsDefault ? 1 : 0); });
}

// Sale: default warehouse first, then the first one that has everything (same rule as the backend).
// Purchase: the warehouse chosen on the payment screen (default warehouse to start with).
function qsWarehouse() {
  const whs = qsWarehousesSorted();
  if (isInward()) {
    return whs.find(function (w) { return String(w.WarehouseID) === String(qs.whId); }) || null;
  }
  if (isBuy()) {
    return whs.find(function (w) { return String(w.WarehouseID) === String(qs.whId); }) || whs[0] || { WarehouseID: "", Name: "" };
  }
  const need = {};
  qs.items.forEach(function (it) { if (!it.isNew) need[it.id] = (need[it.id] || 0) + it.qty; });
  return whs.find(function (w) {
    return Object.keys(need).every(function (pid) {
      const p = qsProduct(pid);
      return p && qsNum((p.locations || {})[String(w.WarehouseID)]) >= need[pid];
    });
  }) || null;
}

function qsCustomerName() {
  const c = qs.customer;
  if (!c) return "";
  if (c.id) return c.name;
  return c.name || c.phone || t("Cash customer");
}

function qsBalanceLabel(bal) {
  if (isBuy()) {
    if (bal > 0.5) return { text: t("To pay") + " " + qsMoney(bal), cls: "due" };
    if (bal < -0.5) return { text: t("Advance") + " " + qsMoney(-bal), cls: "adv" };
    return { text: t("Settled"), cls: "" };
  }
  if (bal > 0.5) return { text: t("Due") + " " + qsMoney(bal), cls: "due" };
  if (bal < -0.5) return { text: t("Advance") + " " + qsMoney(-bal), cls: "adv" };
  return { text: t("Settled"), cls: "" };
}

function qsSteps(n) {
  return '<div class="qs-steps">' + [1, 2, 3].map(function (i) { return "<i" + (i <= n ? ' class="on"' : "") + "></i>"; }).join("") + "</div>";
}

function qsTitle() { return isInward() ? "Send to shop" : (isBuy() ? "New Purchase" : "New Sale"); }

function qsHead(backAction) {
  const full = !isInward() && canOpen(isBuy() ? "purchases" : "sales")
    ? '<button class="qs-full" type="button" onclick="openFullForm()">' + escapeHtml(t("Full form")) + "</button>" : "";
  return '<div class="qs-head">' +
    (backAction ? '<button class="qs-back" type="button" aria-label="' + escapeHtml(t("Back")) + '" onclick="' + backAction + '">‹</button>' : "") +
    "<b>" + escapeHtml(t(qsTitle())) + "</b>" + full + "</div>";
}

function openFullForm() {
  const buy = isBuy();
  showPage(buy ? "purchases" : "sales");
  setTimeout(function () {
    if (buy && typeof openPurchaseForm === "function") openPurchaseForm();
    if (!buy && typeof openSaleForm === "function") openSaleForm();
  }, 400);
}

function renderQuick() {
  if (!qs.data) { loadQuick(qs.mode); return; }
  const ur = getLang() === "ur";
  let html = "";
  if (qs.step === 1) html = qsStep1();
  else if (qs.step === 2) html = qsStep2();
  else if (qs.step === 3) html = qsStep3();
  else html = qsStep4();
  contentElement().innerHTML = '<div class="content"><div class="qs' + (isBuy() || isInward() ? " qs-buy" : "") + (ur ? " qs-ur" : "") + '"' + (ur ? ' dir="rtl"' : "") + ">" + html + "</div></div>";
  updatePageTitle(qsPage(qs.mode));
}
// Kept for older calls.
function renderQuickSale() { renderQuick(); }

/* ---------- step 1: customer or supplier ---------- */
function qsStep1() {
  if (isInward()) return qsSendPickShop();
  const q = qs.custQuery.trim().toLowerCase();
  const qd = q.replace(/\D/g, "");
  const all = qsParties().filter(function (c) { return c.name.trim().toUpperCase() !== "CASH CUSTOMER"; });
  let list;
  if (q) {
    list = all.filter(function (c) {
      return c.name.toLowerCase().indexOf(q) !== -1 || (qd.length >= 3 && String(c.phone || "").replace(/\D/g, "").indexOf(qd) !== -1);
    }).slice(0, 12);
  } else {
    list = all.slice(0, 8);
  }
  const cards = list.map(function (c) {
    const b = c.balance == null ? null : qsBalanceLabel(qsNum(c.balance));
    return '<button type="button" class="qs-cust" onclick="qsPickCustomer(\'' + escapeHtml(c.id) + '\')"><span dir="ltr">' + escapeHtml(c.name) +
      "</span>" + (b ? '<small class="' + b.cls + '" dir="' + (getLang() === "ur" ? "rtl" : "ltr") + '">' + escapeHtml(b.text) + "</small>" : "") + "</button>";
  }).join("");

  let extra;
  if (isBuy()) {
    const exact = all.some(function (c) { return c.name.trim().toLowerCase() === q; });
    extra = q.length >= 2 && !exact
      ? '<button type="button" class="qs-newrow qs-newparty" onclick="qsNewSupplier()"><span><small>' + escapeHtml(t("Not in the list?")) + '</small><b dir="ltr">' +
        escapeHtml(qs.custQuery.trim().toUpperCase()) + '</b></span><span class="qs-add">+ ' + escapeHtml(t("New supplier")) + "</span></button>"
      : "";
  } else {
    extra = qs.walkInOpen
      ? '<div class="qs-walk"><label for="qsWalk">' + escapeHtml(t("Customer name or mobile number")) + "</label>" +
        '<input id="qsWalk" dir="ltr" autocomplete="off" placeholder="' + escapeHtml(t("Example: Ali or 0300 1234567")) + '">' +
        '<div class="qs-row2"><button class="qs-btn" type="button" onclick="qsWalkIn(true)">' + escapeHtml(t("Continue without name")) + "</button>" +
        '<button class="qs-btn qs-primary" type="button" onclick="qsWalkIn(false)">' + escapeHtml(t("Continue")) + "</button></div></div>"
      : '<button type="button" class="qs-cash" onclick="qsOpenWalkIn()">' + escapeHtml(t("Cash customer (walk-in)")) + "</button>";
  }

  return qsHead("") + qsSteps(1) + '<div class="qs-body">' +
    '<input class="qs-search" id="qsCustSearch" type="search" dir="ltr" autocomplete="off" placeholder="' +
    escapeHtml(t(isBuy() ? "Search supplier" : "Search name or mobile number")) +
    '" value="' + escapeHtml(qs.custQuery) + '" oninput="qsCustSearch(this.value)">' +
    extra +
    (q ? "" : "<h4>" + escapeHtml(t(isBuy() ? "Frequent suppliers" : "Frequent customers")) + "</h4>") +
    '<div class="qs-grid" id="qsCustList">' + (cards || '<p class="qs-empty">' + escapeHtml(t(isBuy() ? "No supplier found" : "No customer found")) + "</p>") + "</div>" +
    "</div>";
}

function qsCustSearch(value) {
  qs.custQuery = value;
  const pos = value.length;
  renderQuick();
  const el = $("qsCustSearch");
  if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) { /* type=search */ } }
}

function qsOpenWalkIn() {
  qs.walkInOpen = true;
  renderQuick();
  const el = $("qsWalk");
  if (el) el.focus();
}

function qsPickCustomer(id) {
  const c = qsParties().find(function (x) { return x.id === id; });
  if (!c) return;
  qs.customer = { id: c.id, name: c.name, phone: c.phone, balance: qsNum(c.balance) };
  qsApplyLastRates();
  qs.step = 2;
  renderQuick();
}

function qsNewSupplier() {
  const name = qs.custQuery.trim().replace(/\s+/g, " ").toUpperCase();
  if (name.length < 2) return;
  qs.customer = { id: "", name: name, phone: "", isNew: true };
  qs.step = 2;
  renderQuick();
}

// One box: digits become the mobile number, anything else is the name.
function qsWalkIn(skip) {
  const raw = skip ? "" : String(($("qsWalk") || {}).value || "").trim();
  const digits = raw.replace(/[\s\-+()]/g, "");
  const isPhone = /^\d{10,13}$/.test(digits);
  qs.customer = { id: "", name: isPhone ? "" : raw, phone: isPhone ? raw : "" };
  qs.step = 2;
  renderQuick();
}

function qsLastRate(pid) {
  const c = qs.customer;
  if (!c || !c.id) return 0;
  return qsNum(((qs.data.lastRates || {})[c.id] || {})[pid]);
}

// When the party changes, items that still have the list rate take this party's last rate.
function qsApplyLastRates() {
  qs.items.forEach(function (it) {
    const last = qsLastRate(it.id);
    if (last > 0 && !it.edited) { it.rate = last; it.fromLast = true; }
  });
}

/* ---------- step 2: items ---------- */
function qsStep2() {
  const q = qs.itemQuery.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const inward = isInward();
  const buy = isBuy() || inward;
  let results = "";
  if (words.length) {
    const found = (qs.data.products || []).filter(function (p) {
      const hay = (p.name + " " + p.brand).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    }).sort(function (a, b) { return buy ? 0 : (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0); }).slice(0, 8);
    const exact = (qs.data.products || []).some(function (p) { return p.name.trim().toLowerCase() === q; });
    results = '<div class="qs-res">' + (found.length ? found.map(function (p) {
      const inCart = qs.items.find(function (it) { return it.id === p.id; });
      const stock = inward ? qsOwnerStock(p) : qsNum(p.stock);
      const canAdd = inward ? stock > 0 : (buy || stock > 0);
      return "<div><span><span dir=\"ltr\">" + escapeHtml(p.name) + "</span><small>" + escapeHtml(t(inward ? "Main godam" : "Stock")) + ": " +
        (stock > 0 ? '<em>' + escapeHtml(String(stock)) + "</em>" : '<em class="no">0' + (buy ? "" : " (" + escapeHtml(t("none left")) + ")") + "</em>") +
        (inward ? " · " + escapeHtml(t("In shop")) + ": " + escapeHtml(String(qsShopStock(p))) : "") + "</small></span>" +
        (canAdd && !inCart ? '<button type="button" class="qs-add" onclick="qsAddItem(\'' + escapeHtml(p.id) + '\')">+ ' + escapeHtml(t("Add")) + "</button>" :
          (inCart ? '<span class="qs-incart">✓</span>' : "<span></span>")) + "</div>";
    }).join("") : '<p class="qs-empty">' + escapeHtml(t("No item found")) + "</p>") +
      (q.length >= 2 && !exact && !inward ? '<button type="button" class="qs-newrow" onclick="qsAddNewItem()"><span><small>' + escapeHtml(t("Not in the list?")) + '</small><b dir="ltr">' +
        escapeHtml(qs.itemQuery.trim().toUpperCase()) + '</b></span><span class="qs-add">+ ' + escapeHtml(t("New item")) + "</span></button>" : "") + "</div>";
  }

  const cart = qs.items.map(function (it, i) {
    const rate = qsNum(it.rate);
    const hint = rate <= 0 ? t("Enter rate") : (it.fromLast ? t(buy ? "Last rate from this supplier" : "Last rate for this customer") : t("Rate"));
    return '<div class="qs-item"><div class="qs-item-top"><div class="n"><span dir="ltr">' + escapeHtml(it.name) + "</span>" +
      (it.isNew ? ' <span class="qs-badge">' + escapeHtml(t("New item")) + "</span>" : "") + "</div>" +
      '<button type="button" class="qs-x" aria-label="' + escapeHtml(t("Remove")) + '" onclick="qsRemove(' + i + ')">✕</button></div>' +
      '<div class="m"><div class="qs-qty" dir="ltr"><button type="button" aria-label="-1" onclick="qsQty(' + i + ',-1)">−</button>' +
      '<input class="qs-qty-in" type="text" inputmode="numeric" aria-label="Quantity" value="' + it.qty + '" onchange="qsQtySet(' + i + ',this.value)">' +
      '<button type="button" aria-label="+1" onclick="qsQty(' + i + ',1)"' + (it.qty >= it.max ? " disabled" : "") + ">+</button></div>" +
      (inward ? "" : '<label class="qs-rate' + (rate <= 0 ? " need" : "") + '"><small>' + escapeHtml(hint) + "</small>" +
      '<span dir="ltr">Rs. <input type="text" inputmode="decimal" value="' + (rate > 0 ? escapeHtml(String(rate)) : "") +
      '" placeholder="0" onchange="qsRate(' + i + ',this.value,this)" oninput="qsRateLive(' + i + ',this.value)"></span></label>') + "</div></div>";
  }).join("");

  const units = qs.items.reduce(function (a, it) { return a + it.qty; }, 0);
  const shopChip = inward ? '<div class="qs-chip"><b>' + escapeHtml(t("Sending to")) + ' <span dir="ltr">' + escapeHtml(qsShopName()) +
    '</span></b><button type="button" onclick="qsGo(1)">' + escapeHtml(t("Change")) + "</button></div>" : "";
  return qsHead("qsGo(1)") + qsSteps(2) + '<div class="qs-body">' +
    (inward ? shopChip : '<div class="qs-chip"><b dir="ltr">' + escapeHtml(qsCustomerName()) + (qs.customer && qs.customer.isNew ? ' <span class="qs-badge">' + escapeHtml(t("New supplier")) + "</span>" : "") +
    '</b><button type="button" onclick="qsGo(1)">' + escapeHtml(t("Change")) + "</button></div>") +
    '<input class="qs-search' + (q ? " typed" : "") + '" id="qsItemSearch" type="search" dir="ltr" autocomplete="off" placeholder="' + escapeHtml(t(qs.items.length ? "Search another item" : "Search item")) +
    '" value="' + escapeHtml(qs.itemQuery) + '" oninput="qsItemSearch(this.value)">' + results +
    (qs.items.length ? "<h4>" + escapeHtml(t(inward ? "Goods to send" : (buy ? "In this purchase" : "In this sale"))) + "</h4>" + cart +
      '<button type="button" class="qs-another" onclick="qsFocusSearch()">' + escapeHtml(t("+ Add another item")) + "</button>" : (q ? "" : '<p class="qs-empty">' + escapeHtml(t("Search an item above and tap Add.")) + "</p>")) +
    "</div>" +
    '<div class="qs-bar"><div class="t"><small>' + qs.items.length + " " + escapeHtml(t("items")) + " · " + units + " " + escapeHtml(t("units")) +
    '</small><b id="qsBarTotal" dir="ltr">' + (inward ? units + " " + escapeHtml(t("units")) : qsMoney(qsSubtotal())) + "</b></div>" +
    '<button type="button" class="qs-btn qs-primary" onclick="qsToPayment()"' + (qs.items.length ? "" : " disabled") + ">" + escapeHtml(t("Next")) + "</button></div>";
}

function qsItemSearch(value) {
  qs.itemQuery = value;
  const pos = value.length;
  renderQuick();
  const el = $("qsItemSearch");
  if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) { /* type=search */ } }
}

function qsAddItem(pid) {
  const p = qsProduct(pid);
  if (!p) return;
  const last = qsLastRate(pid);
  qs.items.push({ id: p.id, name: p.name, qty: 1, max: isInward() ? Math.max(1, qsOwnerStock(p)) : (isBuy() ? 99999 : Math.max(1, qsNum(p.stock))),
    rate: last > 0 ? last : qsNum(p.price), fromLast: last > 0, edited: false });
  qs.itemQuery = "";
  renderQuick();
  qsFocusRate(qs.items.length - 1);
}

// Typed text that matches no product becomes a new item; the backend adds it to the product list.
function qsAddNewItem() {
  const name = qs.itemQuery.trim().replace(/\s+/g, " ").toUpperCase();
  if (name.length < 2) return;
  const same = qs.items.find(function (it) { return it.name.toUpperCase() === name; });
  if (same) { qs.itemQuery = ""; renderQuick(); return; }
  qs.items.push({ id: "new:" + name, name: name, qty: 1, max: 99999, rate: 0, fromLast: false, edited: false, isNew: true });
  qs.itemQuery = "";
  renderQuick();
  qsFocusRate(qs.items.length - 1);
}

function qsFocusRate(i) {
  const it = qs.items[i];
  if (!it || qsNum(it.rate) > 0) return;
  const inputs = document.querySelectorAll(".qs-rate input");
  if (inputs[i]) inputs[i].focus();
}

function qsFocusSearch() {
  const el = $("qsItemSearch");
  if (el) { el.scrollIntoView({ block: "center" }); el.focus(); }
}

function qsQty(i, d) {
  const it = qs.items[i];
  if (!it) return;
  if (d > 0 && it.qty >= it.max) { showToast(t("Only this much is in stock") + ": " + it.max); return; }
  it.qty = Math.max(1, it.qty + d);
  renderQuick();
}

// Typing a quantity (useful for big purchases).
function qsQtySet(i, v) {
  const it = qs.items[i];
  if (!it) return;
  let n = Math.max(1, Math.floor(qsNum(v)) || 1);
  if (n > it.max) { showToast(t("Only this much is in stock") + ": " + it.max); n = it.max; }
  it.qty = n;
  // Update in place: a full redraw on blur would swallow the tap that caused it.
  const inputs = document.querySelectorAll(".qs-qty-in");
  if (inputs[i]) inputs[i].value = String(n);
  const units = qs.items.reduce(function (a, x) { return a + x.qty; }, 0);
  const bar = $("qsBarTotal");
  if (bar) bar.textContent = isInward() ? units + " " + t("units") : qsMoney(qsSubtotal());
  const small = document.querySelector(".qs-bar .t small");
  if (small) small.textContent = qs.items.length + " " + t("items") + " · " + units + " " + t("units");
}

function qsRemove(i) {
  qs.items.splice(i, 1);
  renderQuick();
}

function qsRateLive(i, v) {
  const it = qs.items[i];
  if (!it) return;
  it.rate = qsNum(v); it.edited = true; it.fromLast = false;
  const bar = $("qsBarTotal");
  if (bar) bar.textContent = qsMoney(qsSubtotal());
}

function qsRate(i, v, el) {
  qsRateLive(i, v);
  // Update in place: a full redraw here would swallow the tap that caused the blur.
  const label = el && el.closest ? el.closest(".qs-rate") : null;
  if (label) {
    const ok = qsNum(v) > 0;
    label.classList.toggle("need", !ok);
    const hint = label.querySelector("small");
    if (hint) hint.textContent = ok ? t("Rate") : t("Enter rate");
  }
}

function qsGo(step) {
  qs.step = step;
  renderQuick();
  window.scrollTo(0, 0);
}

function qsToPayment() {
  if (!qs.items.length) return;
  if (isInward()) { qsGo(3); return; }
  if (!qs.items.every(function (it) { return qsNum(it.rate) > 0; })) { showError(t("Enter the rate for every item.")); renderQuick(); return; }
  if (qsIsAnonymous()) qs.pay = "full";
  if (isBuy() && !qs.whId) { const w = qsWarehousesSorted()[0]; qs.whId = w ? String(w.WarehouseID) : ""; }
  qsGo(3);
}

/* ---------- step 3: payment ---------- */
function qsStep3() {
  if (isInward()) return qsInwardStep3();
  const buy = isBuy();
  const wh = qsWarehouse();
  const anon = qsIsAnonymous();
  const units = qs.items.reduce(function (a, it) { return a + it.qty; }, 0);
  const total = qsTotal();
  const toAccount = Math.max(0, total - qsPaidAmount());
  const opt = function (key, label) {
    const disabled = anon && key !== "full";
    return '<button type="button" class="qs-pbtn' + (qs.pay === key ? " sel" : "") + '" onclick="qsSetPay(\'' + key + '\')"' + (disabled ? " disabled" : "") +
      "><span>" + escapeHtml(t(label)) + '</span><i class="qs-radio"></i></button>';
  };
  const seg = ["cash", "online", "cheque"].map(function (m) {
    return '<button type="button" class="' + (qs.method === m ? "sel" : "") + '" onclick="qsSetMethod(\'' + m + '\')">' +
      escapeHtml(t(m.charAt(0).toUpperCase() + m.slice(1))) + "</button>";
  }).join("");
  const meLinked = !!(state.user && (qs.data.salespersons || []).some(function (x) { return x.userId && x.userId === state.user.userId; }));
  const sps = buy || meLinked ? [] : (qs.data.salespersons || []).filter(function (x) { return !x.userId; });
  const more = qs.more
    ? '<div class="qs-more-box"><label>' + escapeHtml(t("Discount")) + '<span dir="ltr">Rs. <input type="text" inputmode="decimal" value="' + escapeHtml(qs.discount) +
      '" oninput="qsDiscountLive(this.value)"></span></label>' +
      "<label>" + escapeHtml(t("Note")) + '<input type="text" value="' + escapeHtml(qs.note) + '" oninput="qsSetField(\'note\',this.value,false)"></label></div>'
    : '<button type="button" class="qs-more" onclick="qs.more=true;renderQuick()">+ ' + escapeHtml(t("Discount or note")) + "</button>";
  const spSelect = sps.length
    ? '<label class="qs-sp">' + escapeHtml(t("Salesperson")) + '<select onchange="qsSetSalesperson(this.value)"><option value="">' + escapeHtml(t("None")) + "</option>" +
      sps.map(function (s) { return '<option value="' + escapeHtml(s.id) + '"' + (s.id === qs.salespersonId ? " selected" : "") + ">" + escapeHtml(s.name) + "</option>"; }).join("") +
      "</select></label>"
    : "";
  const whs = qsWarehousesSorted();
  const whPick = buy && whs.length > 1
    ? "<h4>" + escapeHtml(t("Goes to")) + '</h4><div class="qs-seg qs-wh">' + whs.map(function (w) {
        return '<button type="button" dir="ltr" class="' + (String(w.WarehouseID) === String(qs.whId) ? "sel" : "") + '" onclick="qsSetWarehouse(\'' +
          escapeHtml(String(w.WarehouseID)) + '\')">' + escapeHtml(w.Name) + "</button>";
      }).join("") + "</div>"
    : "";

  return qsHead("qsGo(2)") + qsSteps(3) + '<div class="qs-body">' +
    '<div class="qs-total"><small>' + escapeHtml(t("Total for")) + ' </small><span dir="ltr">' + escapeHtml(qsCustomerName()) + '</span><b id="qsTotalAmt" dir="ltr">' + qsMoney(total) + "</b>" +
    "<small>" + units + " " + escapeHtml(t("units")) + (wh && !buy ? " · " + escapeHtml(t("from")) + ' <span dir="ltr">' + escapeHtml(wh.Name) + "</span>" : "") + "</small></div>" +
    (wh ? "" : '<p class="qs-warn">' + escapeHtml(t("No single warehouse has all these items. Transfer the stock first, or make two sales.")) + "</p>") +
    whPick +
    "<h4>" + escapeHtml(t(buy ? "How much did you pay?" : "How much did the customer pay?")) + "</h4>" +
    '<div class="qs-pay">' + opt("full", "Full paid") + opt("credit", "Credit (nothing paid now)") + opt("part", "Part paid") + "</div>" +
    (anon ? '<p class="qs-hint">' + escapeHtml(t("Credit needs a name or mobile number.")) + "</p>" : "") +
    (qs.pay === "part" ? '<label class="qs-amt"><small>' + escapeHtml(t(buy ? "Amount paid" : "Amount received")) + '</small><span dir="ltr">Rs. <input id="qsPaid" type="text" inputmode="decimal" value="' +
      escapeHtml(qs.paid) + '" oninput="qsPaidLive(this.value)"></span></label>' : "") +
    (qs.pay !== "credit" ? '<div class="qs-seg">' + seg + "</div>" : "") +
    spSelect + more +
    "</div>" +
    '<div class="qs-bar"><div class="t"><small>' + escapeHtml(t("Added to account")) + '</small><b id="qsToAccount" dir="ltr" class="' + (toAccount > 0 ? "out" : "") + '">' +
    qsMoney(toAccount) + "</b></div>" +
    '<button type="button" class="qs-btn qs-primary" id="qsSaveBtn" onclick="qsSave()"' + (wh && !qs.saving ? "" : " disabled") + ">" +
    escapeHtml(qs.saving ? t("Saving...") : t(buy ? "Save Purchase" : "Save Sale")) + "</button></div>";
}

function qsSetWarehouse(id) { qs.whId = id; renderQuick(); }

function qsSetPay(key) {
  if (qsIsAnonymous() && key !== "full") return;
  qs.pay = key;
  renderQuick();
  if (key === "part") { const el = $("qsPaid"); if (el) el.focus(); }
}

function qsSetMethod(m) { qs.method = m; renderQuick(); }

function qsSetField(key, value, rerender) {
  qs[key] = value;
  if (rerender) renderQuick();
}

function qsSetSalesperson(id) {
  qs.salespersonId = id;
  try { localStorage.setItem("qsSalesperson", id); } catch (e) { /* private mode */ }
}

function qsDiscountLive(v) {
  qs.discount = v;
  const el = $("qsTotalAmt");
  if (el) el.textContent = qsMoney(qsTotal());
  qsPaidLive(qs.paid);
}

function qsPaidLive(v) {
  qs.paid = v;
  const el = $("qsToAccount");
  const rest = Math.max(0, qsTotal() - qsPaidAmount());
  if (el) { el.textContent = qsMoney(rest); el.className = rest > 0 ? "out" : ""; }
}

async function qsSave() {
  if (qs.saving) return;
  if (isInward()) return qsSaveInward();
  const buy = isBuy();
  if (qs.pay === "part" && qsNum(qs.paid) <= 0) { showError(t(buy ? "Enter the amount paid." : "Enter the amount received.")); return; }
  const wh = qsWarehouse();
  if (!wh) return;
  const c = qs.customer;
  const today = new Date();
  const iso = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const rateKey = buy ? "unitCost" : "unitPrice";
  const payload = {
    date: iso,
    items: qs.items.map(function (it) {
      const row = { qty: it.qty };
      row[rateKey] = qsNum(it.rate);
      if (it.isNew) row.newItem = it.name; else row.productId = it.id;
      return row;
    }),
    paid: qsPaidAmount(),
    paymentMethod: qs.method,
    discount: qsNum(qs.discount),
    notes: qs.note,
    warehouseId: String(wh.WarehouseID || "")
  };
  if (buy) {
    if (c.id) payload.supplierId = c.id;
    else payload.newSupplier = { name: c.name };
  } else {
    payload.salespersonId = qs.salespersonId;
    if (c.id) payload.customerId = c.id;
    else payload.walkIn = { name: c.name, phone: c.phone };
  }
  qs.saving = true;
  renderQuick();
  try {
    qs.result = await call(buy ? "quickpurchase" : "quicksale", payload);
    qs.step = 4;
    // Get the bill ready in the background so "Bill PDF" and WhatsApp open at once.
    if (!buy && qs.result && qs.result.saleId) getInvoiceData(qs.result.saleId).catch(function () {});
    // Other pages read fresh data next time.
    state.dashboard = null; state.products = []; state.customers = []; state.suppliers = []; state.sales = [];
    state.purchases = []; state.stock = []; state.payments = [];
  } catch (error) {
    showError(error.message || "Could not save.");
  } finally {
    qs.saving = false;
    renderQuick();
  }
}

/* ---------- step 4: done ---------- */
function qsStep4() {
  if (isInward()) return qsInwardStep4();
  const buy = isBuy();
  const r = qs.result || {};
  const method = t(String(r.paymentMethod || "cash").charAt(0).toUpperCase() + String(r.paymentMethod || "cash").slice(1));
  const name = buy ? r.supplierName : r.customerName;
  const bal = qsNum(buy ? r.supplierBalance : r.customerBalance);
  const showBal = (buy ? r.supplierBalance : r.customerBalance) != null && name && String(name).toUpperCase() !== "CASH CUSTOMER";
  return '<div class="qs-head"><b>' + escapeHtml(t(buy ? "Purchase saved" : "Sale saved")) + "</b></div>" +
    '<div class="qs-done"><div class="qs-tick">✓</div><h3><span dir="ltr">' + escapeHtml(buy ? (r.referenceNo || "") : (r.invoiceNo || "")) + "</span> " + escapeHtml(t("saved")) + "</h3>" +
    "<p>" + escapeHtml(t(buy ? "Stock and the supplier's account are already updated." : "Stock and the customer's account are already updated.")) + "</p>" +
    '<div class="qs-sum"><div><span>' + escapeHtml(t("Total")) + '</span><b dir="ltr">' + qsMoney(r.netTotal) + "</b></div>" +
    "<div><span>" + escapeHtml(t(buy ? "Paid" : "Received")) + " (" + escapeHtml(method) + ')</span><b dir="ltr">' + qsMoney(r.paid) + "</b></div>" +
    (showBal ? "<div><span>" + escapeHtml(t("New balance")) + '</span><b dir="ltr" class="' + (bal > 0.5 ? "out" : "") + '">' + qsMoney(bal) + "</b></div>" : "") +
    "</div>" +
    (buy ? "" : '<button type="button" class="qs-btn qs-wa" onclick="whatsappInvoice(\'' + escapeHtml(r.saleId || "") + '\')">' + escapeHtml(t("Send invoice on WhatsApp")) + "</button>") +
    '<div class="qs-row2">' +
    (buy ? '<button type="button" class="qs-btn" onclick="showPage(homePage())">' + escapeHtml(t("Home")) + "</button>"
      : '<button type="button" class="qs-btn" onclick="openBillPdf(\'' + escapeHtml(r.saleId || "") + '\')">' + escapeHtml(t("Bill PDF")) + "</button>") +
    '<button type="button" class="qs-btn qs-primary" onclick="qsNewSale()">' + escapeHtml(t(buy ? "New Purchase" : "New Sale")) + "</button></div></div>";
}

function qsNewSale() {
  qsReset();
  loadQuick(qs.mode, true);
  window.scrollTo(0, 0);
}


/* ============================================================
   USERS (Settings page, owner only)
   ============================================================ */
const USER_PRESETS = [
  ["Shop staff (sale + my stock)", ["quicksale", "mystock"]],
  ["Main shop staff (sale + send to shop)", ["quicksale", "inward"]],
  ["Sale only", ["quicksale"]],
  ["Purchase only", ["quickpurchase"]],
  ["Sale and purchase", ["quicksale", "quickpurchase"]]
];

async function loadUsersPanel() {
  const box = $("usersPanel");
  if (!box) return;
  if (!state.authEnabled) {
    box.innerHTML = '<div class="panel-header"><h3>Users and access</h3></div>' +
      '<p style="margin:0 0 10px;">Right now anyone with the portal link can use everything. Create the owner account first; after that everyone signs in with a username and PIN, and you decide what each person can use.</p>' +
      '<form id="ownerForm" class="erp-form"><div class="form-grid">' +
      '<label>Your name<input name="name" required autocomplete="off"></label>' +
      '<label>Username<input name="username" required autocomplete="off" autocapitalize="off" placeholder="e.g. farrukh"></label>' +
      '<label>PIN (4 to 8 digits)<input name="pin" type="password" inputmode="numeric" required autocomplete="new-password"></label>' +
      '<label>PIN again<input name="pin2" type="password" inputmode="numeric" required autocomplete="new-password"></label>' +
      '</div><div class="form-actions"><button type="submit" class="btn primary">Create owner account</button></div></form>';
    $("ownerForm").addEventListener("submit", async function (event) {
      event.preventDefault();
      const f = event.currentTarget;
      if (f.pin.value !== f.pin2.value) { showError("The two PINs are different."); return; }
      try {
        const res = await call("setupowner", { name: f.name.value.trim(), username: f.username.value.trim(), pin: f.pin.value });
        setSession({ token: res.token, user: res.user });
        state.user = res.user;
        state.authEnabled = true;
        applyPermissions();
        showToast("Owner account created. Remember your username and PIN.");
        loadUsersPanel();
      } catch (error) {
        showError(error.message || "Could not create the account.");
      }
    });
    return;
  }
  if (!isAdminUser()) { box.style.display = "none"; return; }
  box.innerHTML = '<div class="loading">Loading users...</div>';
  try {
    state.users = await call("users", {});
  } catch (error) {
    box.innerHTML = '<p class="empty">' + escapeHtml(error.message || "Could not load users.") + "</p>";
    return;
  }
  renderUsersPanel();
}

function moduleLabel(m) {
  if (m === "admin") return "Owner (everything)";
  const f = MODULE_LABELS.find(function (x) { return x[0] === m; });
  return f ? f[1] : m;
}

function renderUsersPanel(editId) {
  const box = $("usersPanel");
  if (!box) return;
  const users = state.users || [];
  const editing = editId === "new" ? { userId: "", name: "", username: "", modules: ["quicksale"], active: true }
    : users.find(function (u) { return u.userId === editId; });
  box.innerHTML = '<div class="panel-header"><div><h3>Users and access</h3><p style="margin:4px 0 0;">Each person signs in with a username and PIN and sees only what you tick.</p></div>' +
    '<button class="btn primary" type="button" onclick="renderUsersPanel(\'new\')">+ Add User</button></div>' +
    (editing ? userFormHtml(editing) : "") +
    '<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Username</th><th>Shop</th><th>Can use</th><th>Status</th><th>Last sign in</th><th></th></tr></thead><tbody>' +
    (users || []).map(function (u) {
      return "<tr><td>" + escapeHtml(u.name) + "</td><td>" + escapeHtml(u.username) + "</td><td>" + escapeHtml(u.shopName || (u.admin ? "" : "Any")) + "</td><td>" +
        escapeHtml((u.modules || []).map(moduleLabel).join(", ")) + "</td><td>" +
        (u.active ? '<span class="badge success">Active</span>' : '<span class="badge">Off</span>') + "</td><td>" +
        escapeHtml(u.lastLogin ? formatDate(u.lastLogin) : "Never") + '</td><td><button class="btn secondary ledger-action-btn" type="button" onclick="renderUsersPanel(\'' +
        escapeHtml(u.userId) + '\')">Edit</button></td></tr>';
    }).join("") + "</tbody></table></div>";
  const form = $("userForm");
  if (form) form.addEventListener("submit", saveUserForm);
}

function userFormHtml(u) {
  const mods = u.modules || [];
  const isOwner = mods.indexOf("admin") !== -1;
  return '<form id="userForm" class="erp-form user-form" data-id="' + escapeHtml(u.userId || "") + '">' +
    "<h4>" + (u.userId ? "Edit " + escapeHtml(u.name) : "New user") + "</h4>" +
    '<div class="form-grid">' +
    '<label>Name<input name="name" value="' + escapeHtml(u.name || "") + '" required autocomplete="off"></label>' +
    '<label>Username<input name="username" value="' + escapeHtml(u.username || "") + '" required autocomplete="off" autocapitalize="off"></label>' +
    "<label>" + (u.userId ? "New PIN (leave empty to keep)" : "PIN (4 to 8 digits)") + '<input name="pin" type="password" inputmode="numeric" autocomplete="new-password"' + (u.userId ? "" : " required") + "></label>" +
    '<label>Shop (for shop staff)<select name="shopId"><option value="">Any (not tied to one shop)</option>' +
      (state.warehouses || []).filter(function (w) { return w.Active !== false; }).map(function (w) {
        return '<option value="' + escapeHtml(String(w.WarehouseID)) + '"' + (String(u.shopId || "") === String(w.WarehouseID) ? " selected" : "") + ">" + escapeHtml(w.Name) + "</option>";
      }).join("") + "</select></label>" +
    '<label class="check-line"><input type="checkbox" name="active"' + (u.active !== false ? " checked" : "") + "> Can sign in</label>" +
    "</div>" +
    '<div class="preset-row"><span>Quick choice:</span>' + USER_PRESETS.map(function (p, i) {
      return '<button type="button" class="btn secondary ledger-action-btn" onclick="applyUserPreset(' + i + ')">' + escapeHtml(p[0]) + "</button>";
    }).join("") + "</div>" +
    '<div class="module-grid">' +
    '<label class="check-line owner-line"><input type="checkbox" name="mod" value="admin"' + (isOwner ? " checked" : "") + "> Owner (everything, including Settings and users)</label>" +
    MODULE_LABELS.map(function (m) {
      return '<label class="check-line"><input type="checkbox" name="mod" value="' + m[0] + '"' + (mods.indexOf(m[0]) !== -1 ? " checked" : "") + "> " + escapeHtml(m[1]) + "</label>";
    }).join("") + "</div>" +
    '<div class="form-actions"><button type="button" class="btn secondary" onclick="renderUsersPanel()">Cancel</button><button type="submit" class="btn primary">Save User</button></div></form>';
}

function applyUserPreset(i) {
  const keep = USER_PRESETS[i][1];
  document.querySelectorAll('#userForm input[name="mod"]').forEach(function (cb) { cb.checked = keep.indexOf(cb.value) !== -1; });
}

async function saveUserForm(event) {
  event.preventDefault();
  const f = event.currentTarget;
  const modules = Array.prototype.slice.call(f.querySelectorAll('input[name="mod"]:checked')).map(function (x) { return x.value; });
  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await call("saveuser", { userId: f.dataset.id || "", name: f.name.value.trim(), username: f.username.value.trim(),
      pin: f.pin.value.trim(), modules: modules, active: f.active.checked, shopId: f.shopId ? f.shopId.value : "" });
    showToast("User saved.");
    await loadUsersPanel();
  } catch (error) {
    btn.disabled = false;
    showError(error.message || "Could not save the user.");
  }
}


/* ============================================================
   INSTALLABLE APP
   ============================================================ */
window.addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault();
  state.installPrompt = event;
  const btn = $("installBtn");
  if (btn) btn.style.display = "";
  if ($("loginScreen")) renderLogin();
});

async function installApp() {
  const p = state.installPrompt;
  if (!p) return;
  p.prompt();
  try { await p.userChoice; } catch (e) { /* closed */ }
  state.installPrompt = null;
  const btn = $("installBtn");
  if (btn) btn.style.display = "none";
  if ($("loginScreen")) renderLogin();
}

if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () { /* the portal still works without it */ });
  });
}


// Settings page: fill the users panel after the page is drawn.
(function () {
  const draw = renderSettingsPage;
  renderSettingsPage = function () {
    draw.apply(this, arguments);
    loadUsersPanel();
    renderShopConvertPanel();
  };
})();



/* ============================================================
   BILLS: each user sees the bills they made (owners see all)
   ============================================================ */
async function loadBills() {
  state.billsTab = state.billsTab || (canOpen("quicksale") || canOpen("sales") ? "sales" : "purchases");
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(billsCacheKey()) || "null"); } catch (e) { cached = null; }
  if (cached) { state.bills = cached; renderBills(); }
  const data = await call("mybills", { days: 60 });
  try { localStorage.setItem(billsCacheKey(), JSON.stringify(data)); } catch (e) { /* private mode */ }
  state.bills = data;
  if (state.page === "bills") renderBills();
}

function billsCacheKey() {
  return "erpQuick_bills_" + (state.user ? state.user.userId : "open");
}

function renderBills() {
  const d = state.bills || { sales: [], purchases: [] };
  const canSale = canOpen("quicksale") || canOpen("sales");
  const canBuy = canOpen("quickpurchase") || canOpen("purchases");
  const canIn = canOpen("inward");
  const canSeeSent = canIn || canOpen("mystock");
  const tabsOn = [["sales", "Sales", canSale], ["purchases", "Purchases", canBuy], ["inwards", isShopUser() ? "Received" : "Sent to shops", canSeeSent]].filter(function (x) { return x[2]; });
  if (!tabsOn.some(function (x) { return x[0] === state.billsTab; })) state.billsTab = tabsOn.length ? tabsOn[0][0] : "sales";
  const tab = state.billsTab;
  const list = (tab === "sales" ? d.sales : (tab === "inwards" ? d.inwards : d.purchases)) || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayTotal = tab === "inwards" ? 0 : list.filter(function (b) { return String(b.date || "").slice(0, 10) === today && !/cancel/i.test(b.status); })
    .reduce(function (a, b) { return a + (Number(b.total) || 0); }, 0);
  const ur = getLang() === "ur";
  const tabs = tabsOn.length > 1 ? '<div class="bills-tabs">' + tabsOn.map(function (x) {
    return '<button type="button" class="' + (tab === x[0] ? "on" : "") + '" onclick="state.billsTab=\'' + x[0] + '\';renderBills()">' + escapeHtml(t(x[1])) + "</button>";
  }).join("") + "</div>" : "";
  const rows = list.map(function (b) {
    const cancelled = /cancel/i.test(b.status);
    const actions = tab === "inwards"
      ? '<button type="button" class="btn secondary ledger-action-btn" onclick="openChallanPdf(\'' + escapeHtml(b.id) + '\')">' + escapeHtml(t("Challan")) + "</button>" +
        '<button type="button" class="btn secondary ledger-action-btn wa-mini" onclick="whatsappChallan(\'' + escapeHtml(b.id) + '\')">WhatsApp</button>'
      : tab === "sales"
      ? '<button type="button" class="btn secondary ledger-action-btn" onclick="openBillPdf(\'' + escapeHtml(b.id) + '\')">' + escapeHtml(t("Bill PDF")) + "</button>" +
        '<button type="button" class="btn secondary ledger-action-btn wa-mini" onclick="whatsappInvoice(\'' + escapeHtml(b.id) + '\')">WhatsApp</button>'
      : "";
    return '<div class="bill-row' + (cancelled ? " cancelled" : "") + '">' +
      '<div class="bill-main"><b dir="ltr">' + escapeHtml(b.no) + "</b>" + (cancelled ? ' <span class="badge danger">' + escapeHtml(t("Cancelled")) + "</span>" : "") +
      '<span dir="ltr">' + escapeHtml(b.party) + "</span>" +
      "<small>" + escapeHtml(formatDate(b.date)) + (d.all && b.by ? " · " + escapeHtml(t("Made by")) + " " + escapeHtml(b.by) : "") + "</small></div>" +
      (tab === "inwards" && b.items ? '<small class="bill-items" dir="ltr">' + escapeHtml(b.items) + "</small>" : "") +
      '<div class="bill-amt"><b dir="ltr">' + (tab === "inwards" ? escapeHtml(String(b.total)) + " " + escapeHtml(t("units")) : qsMoney(b.total)) +

      '</b><div class="bill-actions">' + actions + "</div></div></div>";
  }).join("");
  contentElement().innerHTML = '<div class="content bills-page"' + (ur ? ' dir="rtl"' : "") + ">" +
    '<div class="toolbar"><div><h2>' + escapeHtml(t(d.all ? "Bills" : "My Bills")) + "</h2><p>" + escapeHtml(t("Last 60 days")) +
    " · " + escapeHtml(t("Today")) + ': <b dir="ltr">' + qsMoney(todayTotal) + "</b></p></div></div>" +
    tabs + '<div class="bills-list">' + (rows || '<p class="empty">' + escapeHtml(t("No bills yet.")) + "</p>") + "</div></div>";
  updatePageTitle("bills");
}



/* ============================================================
   INWARD: goods a shop receives from the owner
   ============================================================ */
function loadInward(force) { return loadQuick("inward", force); }

function qsShopName() {
  const w = qsWarehouse();
  return w ? w.Name : "";
}

function qsShopStock(p) {
  const shop = qs.data.shopId || qs.whId;
  return shop ? qsNum((p.locations || {})[String(shop)]) : 0;
}

function qsOwnerStock(p) {
  const shop = String(qs.data.shopId || qs.whId || "");
  const shops = qs.data.shopIds || [];
  return Object.keys(p.locations || {}).reduce(function (a, k) { return k === shop || shops.indexOf(k) !== -1 ? a : a + qsNum(p.locations[k]); }, 0);
}

// Step 1: which shop gets the goods.
function qsSendShops() {
  const ids = qs.data.shopIds || [];
  const whs = qsWarehousesSorted();
  const shops = whs.filter(function (w) { return ids.indexOf(String(w.WarehouseID)) !== -1; });
  return shops.length ? shops : whs.filter(function (w) { return !w.IsDefault; });
}

function qsSendPickShop() {
  const shops = qsSendShops();
  return qsHead("") + qsSteps(1) + '<div class="qs-body"><h4>' + escapeHtml(t("Choose the shop")) + '</h4><div class="qs-shops">' +
    shops.map(function (w) {
      return '<button type="button" class="qs-shop" onclick="qsPickShop(\'' + escapeHtml(String(w.WarehouseID)) + '\')"><b dir="ltr">' + escapeHtml(w.Name) +
        '</b><small dir="ltr">' + formatNumber(w.Units || 0) + " " + escapeHtml(t("units")) + "</small></button>";
    }).join("") + "</div></div>";
}

function qsPickShop(id) {
  qs.whId = String(id);
  qs.items.forEach(function (it) { const p = qsProduct(it.id); if (p) it.max = Math.max(1, qsOwnerStock(p)); });
  qs.step = 2;
  renderQuick();
}

function qsInwardStep3() {
  const units = qs.items.reduce(function (a, it) { return a + it.qty; }, 0);
  const list = qs.items.map(function (it) {
    return '<div><span dir="ltr">' + escapeHtml(it.name) + '</span><b dir="ltr">' + it.qty + "</b></div>";
  }).join("");
  return qsHead("qsGo(2)") + qsSteps(3) + '<div class="qs-body">' +
    '<div class="qs-total"><small>' + escapeHtml(t("Sending to")) + ' </small><span dir="ltr">' + escapeHtml(qsShopName()) + '</span><b dir="ltr">' +
    units + " " + escapeHtml(t("units")) + "</b><small>" + qs.items.length + " " + escapeHtml(t("items")) + "</small></div>" +
    '<div class="qs-sum">' + list + "</div>" +
    '<label class="qs-amt qs-note"><small>' + escapeHtml(t("Note")) + '</small><input type="text" value="' + escapeHtml(qs.note) +
    '" oninput="qsSetField(\'note\',this.value,false)" placeholder="' + escapeHtml(t("Example: sent with Rashid")) + '"></label>' +
    "</div>" +
    '<div class="qs-bar"><div class="t"><small>' + escapeHtml(t("Send to shop")) + '</small><b dir="ltr">' + units + " " + escapeHtml(t("units")) + "</b></div>" +
    '<button type="button" class="qs-btn qs-primary" id="qsSaveBtn" onclick="qsSave()"' + (qsWarehouse() && !qs.saving ? "" : " disabled") + ">" +
    escapeHtml(qs.saving ? t("Saving...") : t("Save and send")) + "</button></div>";
}

async function qsSaveInward() {
  const wh = qsWarehouse();
  if (!wh) return;
  const today = new Date();
  const iso = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const payload = { date: iso, note: qs.note, toWarehouseId: String(wh.WarehouseID),
    items: qs.items.map(function (it) { return { productId: it.id, qty: it.qty }; }) };
  qs.saving = true;
  renderQuick();
  try {
    qs.result = await call("inward", payload);
    CHALLAN_CACHE[qs.result.inwardId] = qs.result;
    qs.step = 4;
    state.dashboard = null; state.products = []; state.stock = [];
  } catch (error) {
    showError(error.message || "Could not save.");
  } finally {
    qs.saving = false;
    renderQuick();
  }
}

function qsInwardStep4() {
  const r = qs.result || {};
  return '<div class="qs-head"><b>' + escapeHtml(t("Goods sent")) + "</b></div>" +
    '<div class="qs-done"><div class="qs-tick">✓</div><h3><span dir="ltr">' + escapeHtml(r.inwardId || "") + "</span> " + escapeHtml(t("saved")) + "</h3>" +
    "<p>" + escapeHtml(t("The goods are now in the shop's stock.")) + "</p>" +
    '<div class="qs-sum"><div><span>' + escapeHtml(t("Sending to")) + '</span><b dir="ltr">' + escapeHtml(r.toName || "") + "</b></div>" +
    "<div><span>" + escapeHtml(t("Units")) + '</span><b dir="ltr">' + escapeHtml(String(r.units || 0)) + "</b></div></div>" +
    '<button type="button" class="qs-btn qs-wa" onclick="whatsappChallan(\'' + escapeHtml(r.inwardId || "") + '\')">WhatsApp ' + escapeHtml(t("Challan")) + "</button>" +
    '<div class="qs-row2"><button type="button" class="qs-btn" onclick="openChallanPdf(\'' + escapeHtml(r.inwardId || "") + '\')">' + escapeHtml(t("Challan")) + " PDF</button>" +
    '<button type="button" class="qs-btn qs-primary" onclick="qsNewSale()">' + escapeHtml(t("Send to shop")) + "</button></div></div>";
}

/* ---------- challan (delivery note) PDF ---------- */
const CHALLAN_CACHE = {};
async function getChallan(id) {
  if (!CHALLAN_CACHE[id]) CHALLAN_CACHE[id] = await call("challan", { inwardId: id });
  return CHALLAN_CACHE[id];
}

function buildChallanPdf(c) {
  const co = c.company || {};
  const doc = createPdf(A5_W, A5_H);
  const M = 26, R = A5_W - M, INK = "#172026", MUTED = "#5F6B66", LINE = "#DCE2DE";
  let y = 0, page = 0;
  const header = function () {
    doc.addPage(); page += 1;
    doc.rect(0, 0, A5_W, 64, { fill: "#1E2A2F" });
    doc.rect(0, 64, A5_W, 3, { fill: "#F2A900" });
    doc.text(M, 28, pdfFit((co.name || "ARHAM ELECTRONICS").toUpperCase(), 230, true, 15), { size: 15, bold: true, color: "#FFFFFF" });
    const sub = [co.address, co.phone ? "Ph: " + co.phone : ""].filter(Boolean).join("   ");
    if (sub) doc.text(M, 44, pdfFit(sub, 240, false, 7.5), { size: 7.5, color: "#C7D2CE" });
    doc.text(R, 26, "DELIVERY CHALLAN", { size: 10, bold: true, color: "#F2A900", align: "right" });
    doc.text(R, 41, "No. " + (c.inwardId || ""), { size: 9, bold: true, color: "#FFFFFF", align: "right" });
    doc.text(R, 54, formatDate(c.date), { size: 8, color: "#C7D2CE", align: "right" });
    y = 84;
    if (page === 1) {
      doc.text(M, y, "Goods sent to", { size: 7.5, color: MUTED });
      doc.text(M, y + 13, pdfFit(c.toName || "", 250, true, 11), { size: 11, bold: true, color: INK });
      if (c.by) doc.text(R, y + 13, pdfFit("Sent by: " + c.by, 140, false, 8), { size: 8, color: MUTED, align: "right" });
      y += 30;
    }
    doc.rect(M, y, R - M, 18, { fill: "#EEF1EF" });
    doc.text(M + 4, y + 12, "#", { size: 7.5, bold: true, color: MUTED });
    doc.text(M + 20, y + 12, "Item", { size: 7.5, bold: true, color: MUTED });
    doc.text(R - 4, y + 12, "Qty", { size: 7.5, bold: true, color: MUTED, align: "right" });
    y += 18;
  };
  header();
  (c.items || []).forEach(function (it, i) {
    const lines = pdfWrap(it.name || "", R - M - 80, false, 8.5);
    const h = lines.length * 11 + 7;
    if (y + h > A5_H - 90) header();
    doc.text(M + 4, y + 12, String(i + 1), { size: 8.5, color: MUTED });
    lines.forEach(function (ln, k) { doc.text(M + 20, y + 12 + k * 11, ln, { size: 8.5, color: INK }); });
    doc.text(R - 4, y + 12, billNumber(it.qty), { size: 8.5, bold: true, color: INK, align: "right" });
    y += h;
    doc.line(M, y, R, y, { color: LINE, width: 0.5 });
  });
  y += 16;
  doc.rect(R - 150, y - 12, 150, 22, { fill: "#FFF4D6" });
  doc.text(R - 142, y + 2, "TOTAL UNITS", { size: 9, bold: true, color: INK });
  doc.text(R - 4, y + 2, billNumber(c.units), { size: 11, bold: true, color: INK, align: "right" });
  if (c.note) { y += 26; pdfWrap("Note: " + c.note, R - M, false, 8).slice(0, 3).forEach(function (ln) { doc.text(M, y, ln, { size: 8, color: MUTED }); y += 10; }); }
  const sy = A5_H - 50;
  doc.line(M, sy, M + 120, sy, { color: "#94A3B8", width: 0.6 });
  doc.text(M + 60, sy + 11, "Sent by", { size: 7.5, color: MUTED, align: "center" });
  doc.line(R - 120, sy, R, sy, { color: "#94A3B8", width: 0.6 });
  doc.text(R - 60, sy + 11, "Received by (" + (c.toName || "shop") + ")", { size: 7.5, color: MUTED, align: "center" });
  const n = doc.pageCount();
  if (n > 1) for (let i = 0; i < n; i++) { doc.onPage(i); doc.text(R, A5_H - 8, "Page " + (i + 1) + " of " + n, { size: 6.5, color: MUTED, align: "right" }); }
  return { bytes: doc.output(), filename: "Challan-" + String(c.inwardId || "").replace(/[^A-Za-z0-9-]/g, "") + ".pdf" };
}

async function openChallanPdf(id) {
  const w = window.open("", "_blank");
  if (w) w.document.write("<p style='font-family:Arial;padding:20px'>Making the challan...</p>");
  try {
    const pdf = buildChallanPdf(await getChallan(id));
    const url = URL.createObjectURL(new Blob([pdf.bytes], { type: "application/pdf" }));
    if (w) w.location.href = url;
    else { const a = document.createElement("a"); a.href = url; a.download = pdf.filename; document.body.appendChild(a); a.click(); a.remove(); }
  } catch (error) {
    if (w) w.close();
    showError(error.message || "Could not make the challan.");
  }
}

function challanMessage(c) {
  const lines = ["*" + ((c.company || {}).name || "ARHAM ELECTRONICS") + "*", "Delivery challan " + c.inwardId + " - " + formatDate(c.date), "To: " + c.toName, ""];
  (c.items || []).forEach(function (it) { lines.push(billNumber(it.qty) + " x " + it.name); });
  lines.push("", "*Total units: " + billNumber(c.units) + "*");
  if (c.note) lines.push("Note: " + c.note);
  return lines.join("\n");
}

async function whatsappChallan(id) {
  try {
    const c = await getChallan(id);
    showWhatsAppPanel("Send Challan " + c.inwardId, c.toName, "", {
      modes: [{ label: "Challan details", text: challanMessage(c) }],
      pdf: { label: "Challan PDF", text: "Challan " + c.inwardId + " for " + c.toName, make: function () { return buildChallanPdf(c); } }
    });
  } catch (error) {
    showError(error.message || "Could not prepare the challan.");
  }
}



/* ============================================================
   SETTINGS: a customer account that is really one of our shops
   ============================================================ */
async function renderShopConvertPanel() {
  const box = $("shopConvertPanel");
  if (!box) return;
  if (!isAdminUser()) { box.style.display = "none"; return; }
  let customers = [];
  try { customers = await call("customers", {}); } catch (e) { customers = []; }
  const active = (customers || []).filter(function (c) {
    const v = String(c.Active == null ? "" : c.Active).toLowerCase();
    return !(v === "no" || v === "false" || v === "0");
  }).sort(function (a, b) { return String(a.Name).localeCompare(String(b.Name)); });
  box.innerHTML = '<div class="panel-header"><div><h3>Our own shops</h3><p style="margin:4px 0 0;">If a customer account is really one of your own shops (like GM Electronics), turn it into a shop. ' +
    "Its account is closed with one entry, so its balance stops counting as money to collect, and a shop (godam) with the same name is made for its stock.</p></div></div>" +
    '<form id="shopConvertForm" class="erp-form"><div class="form-grid">' +
    '<label>Customer account<select name="customerId" required><option value="">Choose...</option>' + active.map(function (c) {
      return '<option value="' + escapeHtml(c.CustomerID) + '">' + escapeHtml(c.Name) + " (" + escapeHtml(money(c.ClosingBalance)) + ")</option>";
    }).join("") + "</select></label>" +
    '<label>Shop name<input name="shopName" placeholder="Same as the customer name" autocomplete="off"></label>' +
    '</div><div class="form-actions"><button type="submit" class="btn primary">Turn into shop</button></div></form>';
  $("shopConvertForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    const f = event.currentTarget;
    const c = active.find(function (x) { return String(x.CustomerID) === f.customerId.value; });
    if (!c) return;
    if (!confirm("Turn " + c.Name + " into a shop? Its balance of " + money(c.ClosingBalance) + " will be closed with one entry.")) return;
    try {
      const res = await call("customertoshop", { customerId: c.CustomerID, shopName: f.shopName.value.trim() });
      showToast(res.shopName + " is now a shop. Closed balance: " + money(res.closedBalance) + ".");
      state.customers = []; state.dashboard = null;
      await loadWarehouses(true);
      renderSettingsPage();
    } catch (error) {
      showError(error.message || "Could not do this.");
    }
  });
}



/* ============================================================
   SHOP STOCK: edit one product, download / upload a stock list
   ============================================================ */
function shopViewWarehouse() {
  const id = state.productView;
  return (state.warehouses || []).find(function (w) { return String(w.WarehouseID) === String(id); }) || null;
}

function shopQty(product, whId) {
  return Number(((product || {}).Locations || {})[whId]) || 0;
}

function openSetStock(productId) {
  const w = shopViewWarehouse();
  const prod = (state.products || []).find(function (x) { return String(x.ProductID) === String(productId); });
  if (!w || !prod) return;
  const area = $("stockUploadArea");
  const now = shopQty(prod, String(w.WarehouseID));
  area.innerHTML = '<form id="setStockForm" class="panel erp-form set-stock">' +
    "<h3>Set stock: " + escapeHtml(prod.Description) + "</h3>" +
    "<p>In " + escapeHtml(w.Name) + " now: <b>" + formatNumber(now) + "</b>. Write the quantity that is really there; the difference is saved as a stock adjustment.</p>" +
    '<div class="form-grid"><label>Quantity in ' + escapeHtml(w.Name) + '<input name="qty" type="number" inputmode="numeric" min="0" step="1" value="' + escapeHtml(String(now)) + '" required></label>' +
    '<label>Reason<input name="reason" value="Stock count" autocomplete="off"></label></div>' +
    '<div class="form-actions"><button type="button" class="btn secondary" onclick="$(\'stockUploadArea\').innerHTML=\'\'">Cancel</button>' +
    '<button type="submit" class="btn primary">Save</button></div></form>';
  area.scrollIntoView({ block: "nearest" });
  const f = $("setStockForm");
  f.qty.focus(); f.qty.select();
  f.addEventListener("submit", async function (event) {
    event.preventDefault();
    const btn = f.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const res = await call("setshopstock", { warehouseId: String(w.WarehouseID), reason: f.reason.value.trim() || "Stock count",
        items: [{ productId: String(prod.ProductID), qty: Number(f.qty.value) || 0 }] });
      showToast(res.changed ? "Stock saved." : "No change.");
      await loadProducts();
    } catch (error) {
      btn.disabled = false;
      showError(error.message || "Could not save.");
    }
  });
}

function loadSheetJs() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise(function (resolve, reject) {
    const sc = document.createElement("script");
    sc.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    sc.onload = function () { resolve(window.XLSX); };
    sc.onerror = function () { reject(new Error("Could not load the Excel reader. Check the internet and try again.")); };
    document.head.appendChild(sc);
  });
}

async function downloadShopStock() {
  const w = shopViewWarehouse();
  if (!w) return;
  try {
    const X = await loadSheetJs();
    const rows = [["Description", "Brand", "Qty", "Cost"]].concat((state.products || [])
      .filter(function (p) { return shopQty(p, String(w.WarehouseID)) !== 0; })
      .map(function (p) { return [p.Description || "", p.Brand || "", shopQty(p, String(w.WarehouseID)), Number(p.PurchasePrice) || ""]; }));
    const ws = X.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 48 }, { wch: 16 }, { wch: 8 }, { wch: 12 }];
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, "Stock");
    X.writeFile(wb, "Stock - " + w.Name + ".xlsx");
  } catch (error) {
    showError(error.message || "Could not make the file.");
  }
}

function openStockUpload() {
  const w = shopViewWarehouse();
  if (!w) return;
  const area = $("stockUploadArea");
  area.innerHTML = '<div class="panel erp-form set-stock"><h3>Upload stock list for ' + escapeHtml(w.Name) + "</h3>" +
    "<p>Choose an Excel or CSV file with an item name column and a quantity column (for example the list from <b>Download list</b>, or a filled count sheet). " +
    "You will see every line before anything is saved.</p>" +
    '<label>Stock list file<input type="file" id="stockFile" accept=".xlsx,.xls,.csv"></label>' +
    '<div id="stockPreview"></div>' +
    '<div class="form-actions"><button type="button" class="btn secondary" onclick="$(\'stockUploadArea\').innerHTML=\'\'">Close</button></div></div>';
  $("stockFile").addEventListener("change", function () { readStockFile(this.files && this.files[0]); });
}

function normName(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/watts?/g, "w").replace(/[^a-z0-9]+/g, "");
}

function nameBigrams(s) {
  const t = normName(s), out = {};
  for (let i = 0; i < t.length - 1; i++) { const g = t.substr(i, 2); out[g] = (out[g] || 0) + 1; }
  return out;
}

function nameSimilarity(a, b) {
  const A = nameBigrams(a), B = nameBigrams(b);
  let inter = 0, na = 0, nb = 0;
  Object.keys(A).forEach(function (g) { na += A[g]; if (B[g]) inter += Math.min(A[g], B[g]); });
  Object.keys(B).forEach(function (g) { nb += B[g]; });
  return na + nb ? 2 * inter / (na + nb) : 0;
}

async function readStockFile(file) {
  const box = $("stockPreview");
  if (!file) return;
  box.innerHTML = '<p class="loading">Reading the file...</p>';
  try {
    const X = await loadSheetJs();
    const buf = await file.arrayBuffer();
    const wb = X.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = X.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    // Find the header row: a name column and a quantity column ("Count" is preferred over "Qty"/"Stock").
    let hr = -1, nameCol = -1, qtyCol = -1, costCol = -1;
    for (let r = 0; r < Math.min(rows.length, 20) && hr === -1; r++) {
      // Header cells are short labels; a long note row is not a header.
      const cells = rows[r].map(function (c) { const x = String(c == null ? "" : c).toLowerCase().trim(); return x.length <= 40 ? x : ""; });
      const n = cells.findIndex(function (c) { return /item|description|product|name/.test(c); });
      let q = cells.findIndex(function (c, i) { return i !== n && /count/.test(c) && !/value/.test(c); });
      if (q === -1) q = cells.findIndex(function (c, i) { return i !== n && /^(qty|quantity|stock|units|current stock|stock now|total stock)\b/.test(c); });
      if (n !== -1 && q !== -1) { hr = r; nameCol = n; qtyCol = q; costCol = cells.findIndex(function (c, i) { return i !== n && i !== q && /cost|purchase price/.test(c); }); }
    }
    if (hr === -1) throw new Error("Could not find an item name column and a quantity (Qty / Count) column in the first sheet.");
    const products = state.products || [];
    const byNorm = {};
    products.forEach(function (p) { byNorm[normName(p.Description)] = p; });
    const lines = [];
    for (let r = hr + 1; r < rows.length; r++) {
      const name = String(rows[r][nameCol] == null ? "" : rows[r][nameCol]).trim();
      const raw = rows[r][qtyCol];
      if (!name || raw === "" || raw == null) continue;
      const qty = Number(String(raw).replace(/,/g, ""));
      if (!isFinite(qty) || qty < 0) continue;
      const exact = byNorm[normName(name)];
      const sugg = exact ? [exact] : products.map(function (p) { return { p: p, s: nameSimilarity(name, p.Description) }; })
        .sort(function (a, b) { return b.s - a.s; }).slice(0, 8).map(function (x) { x.p._s = x.s; return x.p; });
      const pick = exact ? String(exact.ProductID) : (sugg[0] && sugg[0]._s >= 0.85 ? String(sugg[0].ProductID) : "new");
      const cost = costCol === -1 ? 0 : Number(String(rows[r][costCol] == null ? "" : rows[r][costCol]).replace(/,/g, "")) || 0;
      lines.push({ name: name, qty: qty, cost: cost > 0 ? cost : 0, sugg: sugg, pick: pick, exact: !!exact });
    }
    if (!lines.length) throw new Error("No lines with a quantity were found.");
    state.stockUpload = { lines: lines, file: file.name, hasCost: costCol !== -1 };
    renderStockPreview();
  } catch (error) {
    box.innerHTML = '<p class="qs-warn">' + escapeHtml(error.message || "Could not read the file.") + "</p>";
  }
}

function renderStockPreview() {
  const u = state.stockUpload;
  const w = shopViewWarehouse();
  if (!u || !w) return;
  const wid = String(w.WarehouseID);
  const matched = u.lines.filter(function (l) { return l.pick !== "new" && l.pick !== "skip"; }).length;
  const created = u.lines.filter(function (l) { return l.pick === "new"; }).length;
  $("stockPreview").innerHTML =
    '<p class="upload-sum"><b>' + u.lines.length + "</b> lines in " + escapeHtml(u.file) + ": " + matched + " matched to products, " + created + " will be new products. " +
    "Check the lines marked <span class=\"badge warning\">check</span>.</p>" +
    (u.hasCost ? "<p class=\"upload-sum\">The file has a cost column: each product's purchase price will be set to it.</p>" : "") +
    '<div class="table-wrap"><table class="table upload-table"><thead><tr><th>Item in file</th><th class="num">Qty</th>' + (u.hasCost ? '<th class="num">Cost</th>' : "") + '<th>Product in ERP</th><th class="num">Now in ' +
    escapeHtml(w.Name) + "</th></tr></thead><tbody>" +
    u.lines.map(function (l, i) {
      const cur = l.pick !== "new" && l.pick !== "skip"
        ? shopQty((state.products || []).find(function (p) { return String(p.ProductID) === l.pick; }), wid) : "";
      const opts = l.sugg.map(function (p) {
        return '<option value="' + escapeHtml(String(p.ProductID)) + '"' + (l.pick === String(p.ProductID) ? " selected" : "") + ">" + escapeHtml(p.Description) + "</option>";
      }).join("") + '<option value="new"' + (l.pick === "new" ? " selected" : "") + ">New product: " + escapeHtml(l.name.toUpperCase()) + "</option>" +
        '<option value="skip"' + (l.pick === "skip" ? " selected" : "") + ">Skip this line</option>";
      return "<tr><td>" + escapeHtml(l.name) + (l.exact ? "" : ' <span class="badge warning">check</span>') + '</td><td class="num">' + formatNumber(l.qty) +
        (u.hasCost ? '</td><td class="num">' + (l.cost ? formatNumber(l.cost) : "") : "") +
        '</td><td><select onchange="state.stockUpload.lines[' + i + '].pick=this.value;renderStockPreview()">' + opts + '</select></td><td class="num">' +
        (cur === "" ? "" : formatNumber(cur)) + "</td></tr>";
    }).join("") + "</tbody></table></div>" +
    '<label class="check-line"><input type="checkbox" id="zeroOthers"> Items in ' + escapeHtml(w.Name) + " that are not in this list become 0</label>" +
    '<div id="uploadProgress"></div>' +
    '<div class="form-actions"><button type="button" class="btn primary" id="applyStockBtn" onclick="applyStockUpload()">Save stock for ' + escapeHtml(w.Name) + "</button></div>";
}

async function applyStockUpload() {
  const u = state.stockUpload;
  const w = shopViewWarehouse();
  if (!u || !w) return;
  const wid = String(w.WarehouseID);
  const items = [];
  u.lines.forEach(function (l) {
    if (l.pick === "skip") return;
    const it = l.pick === "new" ? { newItem: l.name.toUpperCase(), qty: l.qty } : { productId: l.pick, qty: l.qty };
    if (l.cost > 0) it.cost = l.cost;
    items.push(it);
  });
  if ($("zeroOthers") && $("zeroOthers").checked) {
    const listed = {};
    items.forEach(function (it) { if (it.productId) listed[it.productId] = true; });
    (state.products || []).forEach(function (p) {
      if (!listed[String(p.ProductID)] && shopQty(p, wid) !== 0) items.push({ productId: String(p.ProductID), qty: 0 });
    });
  }
  if (!items.length) return;
  if (!confirm("Save the stock of " + items.length + " item(s) in " + w.Name + "?")) return;
  const btn = $("applyStockBtn");
  if (btn) btn.disabled = true;
  const prog = $("uploadProgress");
  let done = 0, changed = 0, costs = 0;
  try {
    for (let i = 0; i < items.length; i += 40) {
      const part = items.slice(i, i + 40);
      const res = await call("setshopstock", { warehouseId: wid, reason: "Stock list " + u.file, items: part });
      changed += res.changed || 0;
      costs += res.costs || 0;
      done += part.length;
      if (prog) prog.innerHTML = "<p>Saved " + done + " of " + items.length + "...</p>";
    }
    showToast("Stock saved for " + w.Name + ": " + changed + " item(s) changed" + (costs ? ", " + costs + " cost(s) updated" : "") + ".");
    state.stockUpload = null;
    await loadProducts();
  } catch (error) {
    if (btn) btn.disabled = false;
    showError((error.message || "Could not save.") + " Saved so far: " + done + " of " + items.length + ". You can upload the same file again safely.");
  }
}



/* ============================================================
   MY STOCK: a shop sees its own stock (view only)
   ============================================================ */
async function loadMyStock() {
  const key = "erpQuick_mystock_" + (state.user ? state.user.userId : "open");
  try { const c = JSON.parse(localStorage.getItem(key) || "null"); if (c) { state.myStock = c; renderMyStock(); } } catch (e) { /* none */ }
  const data = await call("shopstock", {});
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* private mode */ }
  state.myStock = data;
  if (state.page === "mystock") renderMyStock();
}

function renderMyStock(query) {
  const d = state.myStock || { items: [], units: 0, shopName: "" };
  const q = String(query == null ? (state.myStockQuery || "") : query).trim().toLowerCase();
  state.myStockQuery = q;
  const words = q.split(/\s+/).filter(Boolean);
  const list = (d.items || []).filter(function (x) {
    const hay = (x.name + " " + x.brand).toLowerCase();
    return words.every(function (w) { return hay.indexOf(w) !== -1; });
  });
  const ur = getLang() === "ur";
  const rows = list.map(function (x) {
    return '<div class="mystock-row"><div><b dir="ltr">' + escapeHtml(x.name) + "</b>" + (x.brand ? '<small dir="ltr">' + escapeHtml(x.brand) + "</small>" : "") + "</div>" +
      '<div class="mystock-qty"><b dir="ltr">' + formatNumber(x.qty) + "</b>" + (x.salePrice ? '<small dir="ltr">' + escapeHtml(t("Sale price")) + " " + qsMoney(x.salePrice) + "</small>" : "") + "</div></div>";
  }).join("");
  if (!$("myStockList")) {
    contentElement().innerHTML = '<div class="content mystock-page"' + (ur ? ' dir="rtl"' : "") + ">" +
      '<div class="toolbar"><div><h2>' + escapeHtml(t("My Stock")) + ' <span dir="ltr">' + escapeHtml(d.shopName || "") + '</span></h2><p id="myStockSum"></p></div></div>' +
      '<input class="qs-search" id="myStockSearch" type="search" dir="ltr" autocomplete="off" placeholder="' + escapeHtml(t("Search item in my stock")) + '" value="' + escapeHtml(q) + '" oninput="renderMyStock(this.value)">' +
      '<div id="myStockList" class="mystock-list"></div></div>';
  }
  $("myStockSum").textContent = list.length + " " + t("items") + " · " + formatNumber(d.units || 0) + " " + t("units") + " · " + t("View only");
  $("myStockList").innerHTML = rows || '<p class="empty">' + escapeHtml(t("Nothing in stock.")) + "</p>";
  updatePageTitle("mystock");
}
