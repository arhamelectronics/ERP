/* ============================================================
   ARHAM ELECTRONICS ERP
   COMPLETE FRONTEND APP.JS
   GitHub Pages + Google Apps Script Backend
   ============================================================ */

// This must be YOUR Apps Script Web App URL (Deploy -> Manage deployments -> Web app URL).
// If you redeploy using "New version" on the existing deployment, this URL stays the same.
// It can be overridden by config.js (window.ERP_CONFIG.API_URL) without editing this file.
const API_URL = (typeof window !== "undefined" && window.ERP_CONFIG && window.ERP_CONFIG.API_URL)
  ? window.ERP_CONFIG.API_URL
  : "https://script.google.com/macros/s/AKfycbyi8CaMtMxV7Prf5Dexoy03ao8v2XApxbw2rLK2hTlvYS_j9vV3Y7JbW-GrAS3XYUvAtA/exec";


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

  incentives: [],
  incentiveRaw: [],
  incentiveFilter: { from: "", to: "", personName: "", status: "all" },
  salesPersons: [],

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

  apiExpense: "expense",

  apiIncentives: "incentives",
  apiSalesPersons: "salespersons",
  apiSaveSalesPerson: "salesperson",
  apiIncentiveStatus: "incentivestatus",
  apiProduct: "product"

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

    // Restore the page from the URL hash so F5 / refresh keeps you on the same screen.
    const initialPage =
      normalizePage(
        String(window.location.hash || "")
          .replace(/^#/, "")
      ) || "dashboard";

    showPage(
      initialPage
    );

    // Keep the back/forward buttons working.
    window.addEventListener(
      "hashchange",
      function () {

        const hashPage =
          normalizePage(
            String(window.location.hash || "")
              .replace(/^#/, "")
          ) || "dashboard";

        if (hashPage !== state.page) {

          showPage(hashPage);

        }

      }
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

  page =
    normalizePage(page);

  state.page =
    page;

  // Reflect the page in the URL hash (without triggering an infinite loop).
  try {

    if (
      String(window.location.hash || "")
        .replace(/^#/, "") !== page
    ) {

      window.location.hash = page;

    }

  } catch (e) {

    /* hash update is a nice-to-have; ignore failures */

  }


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
   PAGE ALIASES
   Different deployments have used different data-page values
   ("incentives", "sales-incentive", "salespersons", ...).
   Normalise every spelling to one canonical page id so the
   sidebar can never fall through to the Dashboard again.
   ============================================================ */

function normalizePage(
  page
) {

  const raw =
    String(page || "")
      .trim()
      .toLowerCase();

  const aliases = {

    "sales-incentive": "incentives",
    "salesincentive": "incentives",
    "sales_incentive": "incentives",
    "incentive": "incentives",
    "incentives": "incentives",
    "incentive-report": "incentives",
    "incentivereport": "incentives",

    "sales-persons": "salespersons",
    "sales_persons": "salespersons",
    "salesperson": "salespersons",
    "salespersons": "salespersons"

  };

  return aliases[raw] || raw;

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
          normalizePage(button.dataset.page) === normalizePage(page)
        );

      }
    );

}


function updatePageTitle(
  page
) {

  page =
    normalizePage(page);

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
      "Sales Incentive",
    salespersons:
      "Sales Persons"

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

  page =
    normalizePage(page);

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
        await loadIncentives();
        break;
      case "salespersons":
        await loadSalesPersons();
        break;


      default:

        // Never silently fall back to the Dashboard — surface the problem instead.
        throw new Error(
          "Unknown page: " + page
        );

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
        throw new Error("ERP backend returned HTTP " + response.status + ".");
      }
      return response.json();
    })
    .then(function (response) {
      if (!response) {
        throw new Error("Empty response from ERP backend.");
      }
      if (response.ok === false) {
        throw new Error(response.error || "ERP backend returned an error.");
      }
      return response.data;
    })
    .catch(function (error) {
      console.error("ERP API error:", error);
      throw new Error(
        error && error.message
          ? error.message
          : "Could not connect to ERP backend."
      );
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

  const data =
    await call(
      "apiLedger"
    );


  state.ledger =
    Array.isArray(
      data
    )
      ? data
      : [];


  renderLedger(
    state.ledger
  );

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
   SALES INCENTIVE  (profit-based report + filters + mark paid)
   ============================================================ */

async function loadIncentives() {

  const data =
    await call("apiIncentives");

  state.incentiveRaw =
    Array.isArray(data) ? data : [];

  renderIncentives();

}


/* Read a number no matter how the sheet stored it ("1,200" etc.). */
function numv_(value) {

  if (value === null || value === undefined || value === "") {

    return 0;

  }

  const n =
    Number(String(value).replace(/,/g, "").trim());

  return isNaN(n) ? 0 : n;

}


/* Normalise one backend row into the shape the report needs. */
function incentiveRow_(r) {

  const net = numv_(r.NetTotal);
  const profit = numv_(r.Profit);

  let cogs = numv_(r.COGS);

  // Fallback: if the backend did not send COGS, derive it from Profit = Net - COGS.
  if (!cogs && (net || profit)) {

    cogs = net - profit;

  }

  const pct = numv_(r.IncentivePercent);

  let amount = numv_(r.IncentiveAmount);

  if (!amount && profit > 0 && pct) {

    amount = profit * pct / 100;

  }

  const rawStatus = String(r.IncentiveStatus || "Unpaid");

  return {

    saleId: String(r.SaleID || ""),
    invoice: String(r.InvoiceNo || r.SaleID || ""),
    date: r.Date,
    customer: r.CustomerName || r.CustomerID || "",
    net: net,
    cogs: cogs,
    profit: profit,
    person: r.SalesPerson || "",
    personId: String(r.SalesPersonID || ""),
    pct: pct,
    amount: amount,
    status: rawStatus.toLowerCase() === "paid" ? "Paid" : "Unpaid"

  };

}


/* Apply the current filters (client-side, so it also works with the old backend). */
function filteredIncentives_() {

  const f = state.incentiveFilter || { from: "", to: "", personName: "", status: "all" };

  return (state.incentiveRaw || [])
    .map(incentiveRow_)
    .filter(function (r) {

      const d = String(r.date || "").slice(0, 10);

      if (f.from && d && d < f.from) return false;
      if (f.to && d && d > f.to) return false;
      if (f.personName && r.person !== f.personName) return false;
      if (f.status === "paid" && r.status !== "Paid") return false;
      if (f.status === "unpaid" && r.status !== "Unpaid") return false;

      return true;

    });

}


/* Distinct sales-person names across the loaded data and the master list. */
function incentivePersonNames_() {

  const seen = {};

  (state.incentiveRaw || []).forEach(function (r) {

    const n = String(r.SalesPerson || "").trim();

    if (n) seen[n] = true;

  });

  (state.salesPersons || []).forEach(function (p) {

    const n = String(p.Name || "").trim();

    if (n) seen[n] = true;

  });

  return Object.keys(seen).sort();

}


function renderIncentives() {

  const f = state.incentiveFilter;

  const rows = filteredIncentives_();

  const totals = {

    count: rows.length,
    sales: 0,
    cogs: 0,
    profit: 0,
    incentive: 0,
    unpaid: 0

  };

  rows.forEach(function (r) {

    totals.sales += r.net;
    totals.cogs += r.cogs;
    totals.profit += r.profit;
    totals.incentive += r.amount;

    if (r.status !== "Paid") totals.unpaid += r.amount;

  });

  const personOptions =
    ['<option value="">All sales persons</option>']
      .concat(
        incentivePersonNames_().map(function (name) {

          const sel = (f.personName === name) ? " selected" : "";

          return '<option value="' + escapeHtml(name) + '"' + sel + '>' + escapeHtml(name) + "</option>";

        })
      )
      .join("");

  const statusOptions = [
    ["all", "All"],
    ["unpaid", "Unpaid"],
    ["paid", "Paid"]
  ].map(function (pair) {

    const sel = (f.status === pair[0]) ? " selected" : "";

    return '<option value="' + pair[0] + '"' + sel + '>' + pair[1] + "</option>";

  }).join("");

  contentElement().innerHTML = `
    <div class="content">

      <div class="toolbar">
        <div>
          <h2>Sales Incentive</h2>
          <p>Profit-based incentive report</p>
        </div>
        <button class="btn secondary" onclick="showPage('salespersons')">Sales Persons</button>
        <button class="btn secondary" onclick="refreshIncentives()">↻ Refresh</button>
      </div>

      <div class="panel">
        <div class="panel-header"><h3>Filters</h3></div>
        <div class="form-grid">
          <label>Date From
            <input type="date" id="incFrom" value="${escapeHtml(f.from)}">
          </label>
          <label>Date To
            <input type="date" id="incTo" value="${escapeHtml(f.to)}">
          </label>
          <label>Sales Person
            <select id="incPerson">${personOptions}</select>
          </label>
          <label>Status
            <select id="incStatus">${statusOptions}</select>
          </label>
        </div>
        <div class="toolbar">
          <button class="btn secondary" onclick="incentiveQuick('today')">Daily (Today)</button>
          <button class="btn secondary" onclick="incentiveQuick('month')">Monthly (This Month)</button>
          <button class="btn secondary" onclick="incentiveQuick('all')">All Time</button>
          <button class="btn primary" onclick="applyIncentiveFilters()">Apply</button>
          <button class="btn secondary" onclick="resetIncentiveFilters()">Reset</button>
        </div>
      </div>

      <div class="stat-grid">
        ${statCard("Records", formatNumber(totals.count), null, "neutral")}
        ${statCard("Total Sales", money(totals.sales), null, "blue")}
        ${statCard("Total COGS", money(totals.cogs), null, "neutral")}
        ${statCard("Total Profit", money(totals.profit), null, "green")}
        ${statCard("Total Incentive", money(totals.incentive), null, "amber")}
        ${statCard("Unpaid Incentive", money(totals.unpaid), null, "red")}
      </div>

      <div class="panel">
        <div class="panel-header"><h3>Incentive Report</h3><span class="badge">${rows.length} record(s)</span></div>
        ${rows.length === 0
          ? '<div class="empty">No incentive records found for the selected filters.</div>'
          : `<div class="table-wrap"><table class="table"><thead><tr>
              <th>Invoice</th><th>Date</th><th>Customer</th><th class="num">Net Sale</th><th class="num">COGS</th>
              <th class="num">Profit</th><th>Sales Person</th><th class="num">%</th><th class="num">Incentive</th>
              <th>Status</th><th>Action</th>
            </tr></thead><tbody>
              ${rows.map(function (r) {

                const badge = r.status === "Paid"
                  ? '<span class="badge success">Paid</span>'
                  : '<span class="badge warning">Unpaid</span>';

                const action = r.status === "Paid"
                  ? '<button class="btn secondary" onclick="setIncentiveStatus(\'' + escapeHtml(r.saleId) + '\',\'Unpaid\')">Mark Unpaid</button>'
                  : '<button class="btn primary" onclick="setIncentiveStatus(\'' + escapeHtml(r.saleId) + '\',\'Paid\')">Mark Paid</button>';

                return '<tr>' +
                  '<td>' + escapeHtml(r.invoice) + '</td>' +
                  '<td>' + escapeHtml(formatDate(r.date)) + '</td>' +
                  '<td>' + escapeHtml(r.customer) + '</td>' +
                  '<td class="num">' + escapeHtml(money(r.net)) + '</td>' +
                  '<td class="num">' + escapeHtml(money(r.cogs)) + '</td>' +
                  '<td class="num">' + escapeHtml(money(r.profit)) + '</td>' +
                  '<td>' + escapeHtml(r.person || "—") + '</td>' +
                  '<td class="num">' + escapeHtml(r.pct) + '%</td>' +
                  '<td class="num">' + escapeHtml(money(r.amount)) + '</td>' +
                  '<td>' + badge + '</td>' +
                  '<td>' + action + '</td>' +
                  '</tr>';

              }).join("")}
            </tbody></table></div>`}
      </div>

    </div>
  `;

}


function applyIncentiveFilters() {

  state.incentiveFilter = {

    from: ($("incFrom") ? $("incFrom").value : "") || "",
    to: ($("incTo") ? $("incTo").value : "") || "",
    personName: ($("incPerson") ? $("incPerson").value : "") || "",
    status: ($("incStatus") ? $("incStatus").value : "all") || "all"

  };

  renderIncentives();

}


function resetIncentiveFilters() {

  state.incentiveFilter = { from: "", to: "", personName: "", status: "all" };

  renderIncentives();

}


function incentiveQuick(mode) {

  const today = todayInput();

  if (mode === "today") {

    state.incentiveFilter = { from: today, to: today, personName: "", status: "all" };

  } else if (mode === "month") {

    state.incentiveFilter = { from: today.slice(0, 7) + "-01", to: today, personName: "", status: "all" };

  } else {

    state.incentiveFilter = { from: "", to: "", personName: "", status: "all" };

  }

  renderIncentives();

}


function refreshIncentives() {

  loadIncentives()
    .catch(function (error) {

      showError(
        "Could not load Incentive Report. " + (error.message || "Please check the backend.")
      );

    });

}


async function setIncentiveStatus(saleId, status) {

  try {

    showToast("Updating incentive status...");

    await call("apiIncentiveStatus", { saleId: saleId, status: status });

    (state.incentiveRaw || []).forEach(function (r) {

      if (String(r.SaleID || "") === String(saleId)) {

        r.IncentiveStatus = status;

      }

    });

    renderIncentives();

    showToast("Incentive marked " + status);

  } catch (error) {

    console.error("Incentive status update failed:", error);

    showError(
      "Could not update incentive status. " +
      (error.message || "Please deploy the updated Apps Script backend.")
    );

  }

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

  contentElement().innerHTML = `
    <div class="content">

      <div class="toolbar">
        <div>
          <h2>Dashboard</h2>
          <p>${escapeHtml(formatDate(new Date().toISOString()))}</p>
        </div>
        <button class="btn primary" onclick="showPage('sales')">+ New Sale</button>
      </div>

      <div class="stat-grid">
        ${statCard("Total Products", formatNumber(d.productCount), null, "neutral")}
        ${statCard("Stock Value", money(d.stockValue), d.missingCost ? d.missingCost + " products missing cost price" : null, "blue")}
        ${statCard("Today's Sales", money(d.todaysSales), null, "green")}
        ${statCard("Monthly Sales", money(d.monthlySales), null, "green")}
        ${statCard("Monthly Purchases", money(d.monthlyPurchases), null, "neutral")}
        ${statCard("Customer Receivables", money(d.receivable), null, "red")}
        ${statCard("Supplier Payables", money(d.payable), null, "red")}
        ${statCard("Low Stock Items", formatNumber(d.lowStockCount), null, d.lowStockCount ? "amber" : "neutral")}
      </div>

      <div class="dash-two-col">
        <div class="panel">
          <div class="panel-header"><h3>Low stock</h3></div>
          ${lowStock.length === 0
            ? '<div class="empty">Nothing below reorder level.</div>'
            : `<table class="table"><thead><tr><th>Product</th><th class="num">Stock</th><th class="num">Min</th></tr></thead><tbody>
                ${lowStock.map(function (p) {
                  return '<tr><td>' + escapeHtml(p.description) + '</td><td class="num">' + formatNumber(p.stock) + '</td><td class="num">' + formatNumber(p.min) + '</td></tr>';
                }).join('')}
              </tbody></table>`}
        </div>

        <div class="panel">
          <div class="panel-header"><h3>Recent sales</h3></div>
          ${recentSales.length === 0
            ? '<div class="empty">No sales recorded yet.</div>'
            : `<table class="table"><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th class="num">Total</th></tr></thead><tbody>
                ${recentSales.map(function (s) {
                  return '<tr><td>' + escapeHtml(s.no) + '</td><td>' + escapeHtml(formatDate(s.date)) + '</td><td>' + escapeHtml(s.customer) + '</td><td class="num">' + money(s.total) + '</td></tr>';
                }).join('')}
              </tbody></table>`}
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><h3>Recent purchases</h3></div>
        ${recentPurchases.length === 0
          ? '<div class="empty">No purchases recorded yet.</div>'
          : `<table class="table"><thead><tr><th>Ref</th><th>Date</th><th>Supplier</th><th class="num">Total</th></tr></thead><tbody>
              ${recentPurchases.map(function (p) {
                return '<tr><td>' + escapeHtml(p.ref) + '</td><td>' + escapeHtml(formatDate(p.date)) + '</td><td>' + escapeHtml(p.supplier) + '</td><td class="num">' + money(p.total) + '</td></tr>';
              }).join('')}
            </tbody></table>`}
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

      <div class="toolbar"><div><h2>Products</h2><p>Products, prices and stock</p></div><button class="btn primary" onclick="openProductForm()">+ Add Product</button>${searchBox("productSearch","Search product...")}</div>

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


  contentElement().innerHTML = `

    <div class="content">

      ${toolbar(
        "Customers",
        "customerSearch",
        "Search customer..."
      )}

      <div id="customerTable"></div>

    </div>

  `;


  renderSearchableTable(
    rows,
    columns,
    "customerSearch",
    "customerTable"
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


  contentElement().innerHTML = `

    <div class="content">

      ${toolbar(
        "Suppliers",
        "supplierSearch",
        "Search supplier..."
      )}

      <div id="supplierTable"></div>

    </div>

  `;


  renderSearchableTable(
    rows,
    columns,
    "supplierSearch",
    "supplierTable"
  );

}


/* ============================================================
   LEDGER RENDER
   ============================================================ */

function renderLedger(
  rows
) {

  const columns = [

    "Date",
    "PartyName",
    "PartyType",
    "Particular",
    "Ref",
    "Debit",
    "Credit",
    "Balance",
    "Type"

  ];


  contentElement().innerHTML = `

    <div class="content">

      ${toolbar(
        "Ledger",
        "ledgerSearch",
        "Search ledger..."
      )}

      <div id="ledgerTable"></div>

    </div>

  `;


  renderSearchableTable(
    rows,
    columns,
    "ledgerSearch",
    "ledgerTable"
  );

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
    "Subtotal",
    "Discount",
    "NetTotal",
    "Paid",
    "Balance",
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


  renderSearchableTable(
    rows,
    columns,
    "salesSearch",
    "salesTable"
  );

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


  renderSearchableTable(
    rows,
    columns,
    "purchaseSearch",
    "purchaseTable"
  );

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
  tableId
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


      const filtered =
        !query
          ? rows
          : rows.filter(
              function (row) {

                return columns.some(
                  function (column) {

                    return String(
                      row[column] ??
                      ""
                    )
                      .toLowerCase()
                      .includes(
                        query
                      );

                  }
                );

              }
            );


      const target =
        $(tableId);


      if (!target) {

        return;

      }


      target.innerHTML =
        table(
          filtered,
          columns
        );

    };


  const input =
    $(searchId);


  if (input) {

    input.addEventListener(
      "input",
      render
    );

  }


  render();

}


/* ============================================================
   TABLE
   ============================================================ */

function table(
  rows,
  columns
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

function prettyLabel(
  value
) {

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

function openSaleForm() {

  if (
    !state.customers.length
  ) {

    showToast(
      "Loading customers..."
    );

    loadCustomers()
      .then(
        function () {

          openSaleForm();

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

    showToast(
      "Loading products..."
    );

    loadProducts()
      .then(
        function () {

          openSaleForm();

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
    !state.salesPersons.length
  ) {

    showToast(
      "Loading sales persons..."
    );

    loadSalesPersons()
      .then(
        function () {

          openSaleForm();

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


  const salesPersonOptions=state.salesPersons.filter(function(p){return p.Active!==false&&String(p.Active).toLowerCase()!=='false';}).map(function(p){return '<option value="'+escapeHtml(p.SalesPersonID||'')+'">'+escapeHtml(p.Name||p.SalesPersonID||'')+' ('+escapeHtml(p.IncentivePercent||0)+'%)</option>';}).join('');

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
                product.Code ||
                product.Description ||
                product.ProductID
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

              Sales Person

              <select name="salesPersonId">
                <option value="">Select sales person</option>
                ${salesPersonOptions}
              </select>

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
                product.Code ||
                product.Description ||
                product.ProductID
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

      salesPersonId:
        form.salesPersonId.value,

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
                product.Code ||
                product.Description ||
                product.ProductID
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
                product.Code ||
                product.Description ||
                product.ProductID
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
   SALES PERSONS MODULE
   ============================================================ */

async function loadSalesPersons() {

  const data =
    await call("apiSalesPersons");

  state.salesPersons =
    Array.isArray(data) ? data : [];

  renderSalesPersons(state.salesPersons);

}


function isActive_(value) {

  return !(value === false || String(value).toLowerCase() === "false" || String(value) === "0");

}


function renderSalesPersons(rows) {

  const data = Array.isArray(rows) ? rows : [];

  const body = data.length === 0
    ? '<div class="empty">No sales persons yet. Click “+ Add Sales Person”.</div>'
    : `<div class="table-wrap"><table class="table"><thead><tr>
          <th>Sales Person ID</th><th>Name</th><th class="num">Incentive %</th><th>Status</th><th>Created</th><th>Action</th>
        </tr></thead><tbody>
          ${data.map(function (p) {

            const id = p.SalesPersonID || "";
            const active = isActive_(p.Active);

            const badge = active
              ? '<span class="badge success">Active</span>'
              : '<span class="badge danger">Inactive</span>';

            const toggleLabel = active ? "Deactivate" : "Activate";

            return '<tr>' +
              '<td>' + escapeHtml(id) + '</td>' +
              '<td>' + escapeHtml(p.Name || "") + '</td>' +
              '<td class="num">' + escapeHtml(p.IncentivePercent || 0) + '%</td>' +
              '<td>' + badge + '</td>' +
              '<td>' + escapeHtml(formatDate(p.CreatedAt)) + '</td>' +
              '<td>' +
                '<button class="btn secondary" onclick="openSalesPersonForm(\'' + escapeHtml(id) + '\')">Edit</button> ' +
                '<button class="btn secondary" onclick="toggleSalesPerson(\'' + escapeHtml(id) + '\',' + (!active) + ')">' + toggleLabel + '</button>' +
              '</td>' +
              '</tr>';

          }).join("")}
        </tbody></table></div>`;

  contentElement().innerHTML = `
    <div class="content">
      <div class="toolbar">
        <div>
          <h2>Sales Persons</h2>
          <p>Each sales person has their own profit-based incentive percentage</p>
        </div>
        <button class="btn primary" onclick="openSalesPersonForm()">+ Add Sales Person</button>
        <button class="btn secondary" onclick="showPage('incentives')">Incentive Report</button>
      </div>

      <div class="panel">
        <div class="panel-header"><h3>Sales Persons</h3><span class="badge">${data.length} record(s)</span></div>
        ${body}
      </div>
    </div>
  `;

}


function openSalesPersonForm(id) {

  const existing = id
    ? (state.salesPersons || []).find(function (p) { return String(p.SalesPersonID || "") === String(id); })
    : null;

  const name = existing ? (existing.Name || "") : "";
  const pct = existing ? (existing.IncentivePercent || 0) : "";
  const active = existing ? isActive_(existing.Active) : true;

  contentElement().innerHTML = `
    <div class="content">
      <div class="panel">
        <div class="panel-header">
          <h2>${existing ? "Edit" : "Add"} Sales Person</h2>
          <button class="btn secondary" onclick="showPage('salespersons')">Cancel</button>
        </div>

        <form id="salesPersonForm" class="erp-form">
          <input type="hidden" name="salesPersonId" value="${escapeHtml(existing ? existing.SalesPersonID : "")}">

          <div class="form-grid">
            <label>Name
              <input name="name" required value="${escapeHtml(name)}" placeholder="e.g. Ali">
            </label>

            <label>Incentive %
              <input type="number" name="incentivePercent" min="0" max="100" step="0.01" required value="${escapeHtml(pct)}" placeholder="e.g. 5">
            </label>

            <label>Status
              <select name="active">
                <option value="true"${active ? " selected" : ""}>Active</option>
                <option value="false"${active ? "" : " selected"}>Inactive</option>
              </select>
            </label>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn primary">Save Sales Person</button>
          </div>
        </form>
      </div>
    </div>
  `;

  $("salesPersonForm")
    .addEventListener(
      "submit",
      submitSalesPerson
    );

}


async function submitSalesPerson(event) {

  event.preventDefault();

  const form = event.currentTarget;

  try {

    showToast("Saving sales person...");

    const payload = {

      name: form.name.value.trim(),
      incentivePercent: Number(form.incentivePercent.value),
      active: form.active.value === "true"

    };

    if (form.salesPersonId.value) {

      payload.salesPersonId = form.salesPersonId.value;

    }

    await call("apiSaveSalesPerson", payload);

    showToast("Sales person saved.");

    await loadSalesPersons();

  } catch (error) {

    console.error("Save sales person failed:", error);

    showError(error.message);

  }

}


async function toggleSalesPerson(id, active) {

  const existing = (state.salesPersons || []).find(function (p) {

    return String(p.SalesPersonID || "") === String(id);

  });

  if (!existing) return;

  try {

    showToast("Updating sales person...");

    await call("apiSaveSalesPerson", {

      salesPersonId: existing.SalesPersonID,
      name: existing.Name,
      incentivePercent: Number(existing.IncentivePercent) || 0,
      active: active

    });

    await loadSalesPersons();

    showToast(active ? "Sales person activated." : "Sales person deactivated.");

  } catch (error) {

    console.error("Toggle sales person failed:", error);

    showError(error.message);

  }

}


/* ============================================================
   ADD PRODUCT
   ============================================================ */

function openProductForm() {

  contentElement().innerHTML = `
    <div class="content">
      <div class="panel">
        <div class="panel-header">
          <h2>Add Product</h2>
          <button class="btn secondary" onclick="showPage('products')">Cancel</button>
        </div>

        <form id="productForm" class="erp-form">
          <div class="form-grid">
            <label>Product ID
              <input name="productId" placeholder="Auto (e.g. P-0001)">
            </label>

            <label>Product Code
              <input name="code" placeholder="e.g. RES-1000">
            </label>

            <label>Description
              <input name="description" required placeholder="Product description">
            </label>

            <label>Brand
              <input name="brand" placeholder="Brand">
            </label>

            <label>Category
              <input name="category" placeholder="Category">
            </label>

            <label>Unit
              <input name="unit" placeholder="pcs">
            </label>

            <label>Location
              <input name="location" placeholder="Shelf / store">
            </label>

            <label>Purchase Price
              <input type="number" name="purchasePrice" min="0" step="0.01" value="0">
            </label>

            <label>Sale Price
              <input type="number" name="salePrice" min="0" step="0.01" value="0">
            </label>

            <label>Opening Stock
              <input type="number" name="currentStock" min="0" step="0.01" value="0">
            </label>

            <label>Minimum Stock
              <input type="number" name="minStock" min="0" step="0.01" value="0">
            </label>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn primary">Save Product</button>
          </div>
        </form>
      </div>
    </div>
  `;

  $("productForm")
    .addEventListener(
      "submit",
      submitProduct
    );

}


async function submitProduct(event) {

  event.preventDefault();

  const form = event.currentTarget;

  try {

    showToast("Saving product...");

    const payload = {

      productId: form.productId.value.trim(),
      code: form.code.value.trim(),
      description: form.description.value.trim(),
      brand: form.brand.value.trim(),
      category: form.category.value.trim(),
      unit: form.unit.value.trim(),
      location: form.location.value.trim(),
      purchasePrice: Number(form.purchasePrice.value) || 0,
      salePrice: Number(form.salePrice.value) || 0,
      currentStock: Number(form.currentStock.value) || 0,
      minStock: Number(form.minStock.value) || 0

    };

    if (!payload.productId) delete payload.productId;

    const result = await call("apiProduct", payload);

    showToast("Product saved: " + (result.productId || payload.description));

    state.products = []; // force a fresh reload so the new product appears

    showPage("products");

  } catch (error) {

    console.error("Save product failed:", error);

    showError(error.message);

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
      loadExpenses,

    loadIncentives:
      loadIncentives,

    loadSalesPersons:
      loadSalesPersons,

    openProductForm:
      openProductForm,

    openSalesPersonForm:
      openSalesPersonForm,

    normalizePage:
      normalizePage

  };
