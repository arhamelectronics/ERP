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


/* Leaving a page with work not saved asks first: Save / Discard / Cancel */
function unsavedWork() {
  const p = state.page;
  if (["quicksale", "quickpurchase", "inward", "quote"].indexOf(p) !== -1 && qs.items && qs.items.length && qs.step !== 4 && !qs.saving) {
    return {
      what: t(p === "quicksale" ? "This sale" : (p === "quote" ? "This quotation" : "This entry")),
      save: async function () {
        const b = document.getElementById("qsSaveBtn");
        if (!b || b.disabled) { if (qs.step < 3 && !isInward() && !isQuote()) { qs.step = 3; renderQuick(); } return false; }
        await qsSave(); return qs.step === 4 && !!qs.result;
      },
      discard: function () { qsReset(); qs.ready = true; }
    };
  }
  if (p === "stockin" && sin.items && sin.items.length && !sin.result && !sin.saving) {
    return { what: t("This stock entry"), save: async function () { await sinSave(); return !!sin.result; }, discard: function () { sin.items = []; } };
  }
  if (p === "receive" && rp.customer && qsNum(rp.amount) > 0 && !rp.result && !rp.saving) {
    return { what: t("This payment"), save: async function () { await rpSave(); return !!rp.result; }, discard: function () { rp.customer = null; rp.amount = ""; } };
  }
  return null;
}

function askUnsaved(work, go) {
  if (document.getElementById("unsavedAsk")) return;
  const box = document.createElement("div");
  box.className = "cost-modal"; box.id = "unsavedAsk";
  box.innerHTML = '<div class="cost-card bp-card" role="alertdialog" aria-modal="true"><h3>' + escapeHtml(t("Not saved yet")) + "</h3><p>" +
    escapeHtml(work.what + " " + t("is not saved. What do you want to do?")) + '</p><div class="unsaved-btns">' +
    '<button type="button" class="btn primary" data-a="save">' + escapeHtml(t("Save")) + "</button>" +
    '<button type="button" class="btn danger" data-a="discard">' + escapeHtml(t("Discard")) + "</button>" +
    '<button type="button" class="btn secondary" data-a="cancel">' + escapeHtml(t("Cancel")) + "</button></div></div>";
  document.body.appendChild(box);
  box.querySelector('[data-a="cancel"]').focus();
  box.addEventListener("click", async function (e) {
    const a = e.target.dataset && e.target.dataset.a;
    if (e.target === box || a === "cancel") { box.remove(); return; }
    if (a === "discard") { box.remove(); work.discard(); go(); return; }
    if (a === "save") {
      box.remove();
      if (await work.save()) go();
    }
  });
}

let NAV_FROM_HISTORY = false;
function showPage(page) {
  if (!canOpen(page)) page = homePage();
  const work = page !== state.page ? unsavedWork() : null;
  if (work) { askUnsaved(work, function () { showPageNow(page); }); return; }
  showPageNow(page);
}

function showPageNow(
  page
) {

  if (!canOpen(page)) page = homePage();
  try {
    if (!NAV_FROM_HISTORY && page !== (history.state && history.state.page)) history.pushState({ page: page }, "");
  } catch (e) { /* history not available */ }

  state.page =
    page;


  updateNavigation(
    page
  );


  updatePageTitle(
    page
  );


  // Pages kept in memory open at once; the "Loading" box shows only if it takes longer.
  // (no "Loading" box while a kept copy is coming: the "Updating" bar shows instead)
  const slow = setTimeout(function () { if (state.page === page && !MEMO_WAIT_KEPT) renderLoading(); }, 150);
  Promise.resolve(loadPage(page)).finally(function () { clearTimeout(slow); });

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
      "Products & Stock",

    stock:
      "Stock History",

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
    monthexp:
      "Monthly Expenses",
    updates:
      "Updates",
    stockin:
      "Goods In",
    goodsin:
      "Goods In",

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
      "My Stock",
    quote:
      "Quotation",
    receive:
      "Receive Payment",
    cash:
      "Cash",
    daily:
      "Daily Report",
    warranty:
      "Warranty",
    jobs:
      "Installations"

  };


  if (page === "incentives" && state.user && !isAdminUser()) titles.incentives = "My Incentive";
  if (page === "cash" && canSeeMoneyIn()) titles.cash = "Cash & Payments";
  if (page === "partyledger") titles.partyledger = "Ledger";
  titles.accounts = "Accounts"; titles.reportshub = "Reports"; titles.health = "Health check"; titles.help = "Help";
  if (page === "inward" && typeof qs !== "undefined" && (qs.back || (state.user && !canSendToShop()))) titles.inward = "Bring back from shop";
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

      case "monthexp":

        await loadMonthExp();

        break;

      case "updates":

        await loadUpdates();

        break;

      case "stockin":

        await loadStockIn();

        break;

      case "goodsin":

        loadGoodsIn();

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

      case "quote":

        await loadQuick("quote");

        break;

      case "receive":

        await loadReceive();

        break;

      case "health":

        await loadHealth();

        break;

      case "help":

        renderHelp();

        break;

      case "accounts":

        await loadAccounts();

        break;

      case "reportshub":

        renderReportsHub();

        break;

      case "partyledger":

        if (window._ledgerSelectedPartyId) await openPartyLedger(window._ledgerPartyType || "customer", window._ledgerSelectedPartyId);
        else await loadLedger();

        break;

      case "cash":

        if (canSeeMoneyIn() && state.cashTab !== "hand") await loadMoneyIn(); else await loadCash();

        break;

      case "daily":

        await loadDaily();

        break;

      case "warranty":

        loadWarrantyPage();

        break;

      case "jobs":

        await loadJobs();

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

/* ---------- Speed: pages open at once from the data seen last time ----------
   Every screen that only READS data keeps its last answer in the phone's memory. Opening the page again shows
   that at once, and the newest data is fetched in the background; if anything changed, the page redraws itself
   (a thin "Updating" bar shows meanwhile). After any save, all kept answers are marked old, so the next
   page shows them at once and refreshes straight away. */
const READ_ACTIONS = ["dashboard", "accounts", "apidashboard", "mybills", "apiproducts", "products", "apicustomers", "customers", "apisuppliers", "suppliers", "ledger", "apiledger", "techs", "packages", "profitloss", "cashbook", "wasettings", "apistock", "stock",
  "warehouses", "cashstatus", "cashpeople", "cashall", "moneyin", "incentivereport", "apiincentivereport", "salespersons",
  "apisalespersons", "dailyreport", "profitbyshop", "shopstock", "receivedata", "openbills", "users", "userpick", "monthlyexpenses",
  "apisales", "sales", "apipurchases", "purchases", "apipayments", "payments", "apiexpenses", "expenses", "activity", "paymentchecks",
  "quotations", "jobs", "deletedproducts", "settings", "stockindata", "inwarddata", "aging", "deadstock", "itemprofit"];
const MEMO = {};
let MEMO_INFLIGHT = {};
function memoKey(action, args) {
  const a = String(action).toLowerCase();
  const u = state.user ? state.user.userId : "open";
  return a + "|" + u + "|" + JSON.stringify(args && args.length ? args : []);
}
function memoClearAll() { Object.keys(MEMO).forEach(function (k) { delete MEMO[k]; }); MEMO_INFLIGHT = {}; memoDiskClear(); }

/* ---------- The kept answers also stay on the phone (IndexedDB), so after the app is closed and opened again
   every page still opens at once from the last copy, and the newest data comes in the background. ---------- */
let MEMO_DB = null, MEMO_DISK_LOADED = false, MEMO_DISK_TIMER = null, MEMO_DISK_DIRTY = {};
const MEMO_DISK_READY = new Promise(function (done) {
  const finish = function () { MEMO_DISK_LOADED = true; done(); };
  try {
    if (!window.indexedDB) { finish(); return; }
    const req = indexedDB.open("arhamErpMemo", 1);
    req.onupgradeneeded = function () { req.result.createObjectStore("memo"); };
    req.onerror = finish;
    req.onsuccess = function () {
      MEMO_DB = req.result;
      try {
        const tx = MEMO_DB.transaction("memo", "readonly"), st = tx.objectStore("memo");
        const all = st.getAll(), keys = st.getAllKeys();
        tx.oncomplete = function () {
          (keys.result || []).forEach(function (k, i) {
            const v = (all.result || [])[i];
            // from disk: shown at once, then refreshed (at = 1 means "old")
            if (v && !MEMO[k] && Date.now() - (v.saved || 0) < 7 * 86400000) MEMO[k] = { data: v.data, at: 1 };
          });
          finish();
        };
        tx.onerror = finish;
      } catch (e) { finish(); }
    };
  } catch (e) { finish(); }
  setTimeout(finish, 700);   // never wait long for the phone's storage
});
function memoDiskPut(key) {
  if (!MEMO_DB) return;
  MEMO_DISK_DIRTY[key] = 1;
  clearTimeout(MEMO_DISK_TIMER);
  MEMO_DISK_TIMER = setTimeout(function () {
    const keys = Object.keys(MEMO_DISK_DIRTY); MEMO_DISK_DIRTY = {};
    try {
      const st = MEMO_DB.transaction("memo", "readwrite").objectStore("memo");
      keys.forEach(function (k) { if (MEMO[k]) st.put({ data: MEMO[k].data, saved: Date.now() }, k); });
    } catch (e) { /* storage full or closed: only slower */ }
  }, 400);
}
function memoDiskClear() {
  try { if (MEMO_DB) MEMO_DB.transaction("memo", "readwrite").objectStore("memo").clear(); } catch (e) { /* nothing kept */ }
}
let MEMO_LAST_SAVE = 0, MEMO_WAIT_KEPT = 0;
function memoStaleAll() { Object.keys(MEMO).forEach(function (k) { MEMO[k].at = 0; }); MEMO_LAST_SAVE = Date.now(); }
function updatingBar(on) {
  let el = document.getElementById("updBar");
  if (!el) { el = document.createElement("div"); el.id = "updBar"; el.className = "upd-bar"; el.innerHTML = "<i></i><span></span>"; document.body.appendChild(el); }
  el.querySelector("span").textContent = t("Updating...");
  el.classList.toggle("on", !!on);
}

function call(name, ...args) {
  const action = String(API_ACTIONS[name] || name);
  const lower = action.toLowerCase();
  // Checks that change nothing (the bell, sign-in, version): straight to the server, nothing kept or marked old.
  if (["cashpending", "ownerbell", "login", "logout", "version", "health", "whoami", "saleinvoice", "challan", "quote", "billcosts", "me", "authstatus", "warrantycheck",
    "quicksaledata", "quickpurchasedata", "salereturnable", "purchasereturnable", "salereturns"].indexOf(lower) !== -1) return callNet(name, ...args);
  if (READ_ACTIONS.indexOf(lower) === -1) {
    // A save: when it works, everything kept is old now.
    return callNet(name, ...args).then(function (data) { memoStaleAll(); return data; });
  }
  // The copy kept on the phone is read once when the app opens (a fraction of a second).
  if (!MEMO_DISK_LOADED) return MEMO_DISK_READY.then(function () { return call(name, ...args); });
  const key = memoKey(lower, args);
  const hit = MEMO[key];
  let shown = true;   // false while the page is still waiting for this answer (then no redraw is needed)
  const fetchFresh = function () {
    if (MEMO_INFLIGHT[key]) return MEMO_INFLIGHT[key];
    const pageAtStart = state.page;
    const pr = callNet(name, ...args).then(function (data) {
      const old = MEMO[key];
      const changed = !old || JSON.stringify(old.data) !== JSON.stringify(data);
      MEMO[key] = { data: data, at: Date.now() };
      delete MEMO_INFLIGHT[key];
      if (changed) memoDiskPut(key);
      // The page was drawn from the kept copy and the data changed: draw it again (it now reads the new copy).
      if (old && changed && shown && state.page === pageAtStart && memoCanRedraw()) loadPage(state.page);
      return data;
    }, function (error) { delete MEMO_INFLIGHT[key]; throw error; });
    MEMO_INFLIGHT[key] = pr;
    return pr;
  };
  // After a save, a kept copy is old: the page waits for the fresh data, so the change is always in it
  // (before, after 4 seconds the old copy was shown first, e.g. an old ledger and balance after "Update ledger").
  // After a save: wait a moment for the fresh data (so the change is in it); if the server is slow, show the
  // kept copy at once and the page redraws itself when the fresh data comes (no long "Loading").
  if (hit && hit.at === 0) {
    updatingBar(true);
    shown = false;
    MEMO_WAIT_KEPT++;
    const fresh = fetchFresh();
    fresh.catch(function () { /* the kept copy stays */ }).finally(function () { if (!Object.keys(MEMO_INFLIGHT).length) updatingBar(false); });
    return Promise.race([
      fresh.then(function (data) { return JSON.parse(JSON.stringify(data)); }, function () { return JSON.parse(JSON.stringify(hit.data)); }),
      new Promise(function (done) { setTimeout(function () { shown = true; done(JSON.parse(JSON.stringify(hit.data))); }, 1200); })
    ]).finally(function () { MEMO_WAIT_KEPT = Math.max(0, MEMO_WAIT_KEPT - 1); });
  }
  if (hit) {
    if (Date.now() - hit.at > 4000) {
      updatingBar(true);
      fetchFresh().catch(function () { /* the kept copy stays */ }).finally(function () { if (!Object.keys(MEMO_INFLIGHT).length) updatingBar(false); });
    }
    return Promise.resolve(JSON.parse(JSON.stringify(hit.data)));
  }
  return fetchFresh().then(function (data) { return JSON.parse(JSON.stringify(data)); });
}

// Redraw only when it will not disturb: no box open and the person is not typing.
function memoCanRedraw() {
  if (document.querySelector(".cost-modal, .pdfv, .wa-overlay, dialog[open]")) return false;
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== "search") return false;
  if (state.billOpen) return false;
  return !["quicksale", "quickpurchase", "inward", "stockin", "receive", "goodsin", "settings", "monthexp"].includes(state.page);
}

function callNet(
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

  // Big requests (a payment slip picture) go in the body; normal ones stay in the address.
  const json = JSON.stringify(payload || {});
  const big = json.length > 6000;
  const startedAt = Date.now();
  return fetch(big ? API_URL : API_URL + "?" + params.toString(), big ? {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ action: action }, payload))
  } : {
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
        // Speed check: how long the server worked, and how long it took in all (internet + Google)
        try { SPEED_LOG.unshift({ action: action, total: Date.now() - startedAt, server: parsed && parsed.ms != null ? parsed.ms : null, at: Date.now() }); SPEED_LOG.length = Math.min(SPEED_LOG.length, 40); } catch (e) { /* only the log */ }
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
  // The ledger of one account is its own page, so a background refresh redraws this ledger, not the page before.
  state.page = "partyledger";
  try { updatePageTitle("partyledger"); } catch (e) { /* title only */ }
  try {
    // always: the balance on top of the ledger comes from this list, and it must be the latest
    if (partyType === "customer") { const cs = await call("apiCustomers"); if (Array.isArray(cs)) state.customers = cs; }
    if (partyType === "supplier") { const ss = await call("apiSuppliers"); if (Array.isArray(ss)) state.suppliers = ss; }
  } catch (e) { /* the ledger still opens */ }
  window._ledgerSelectedCustomerId = partyType === "customer" ? String(partyId) : "";

  try {
    // (no "Loading" message: the ledger opens at once from the kept copy)
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
      ${supplier ? partyMoveBar("supplier", supplier.SupplierID, String(name), supplier.Phone || "", Number(supplier.ClosingBalance) || 0) : ""}
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
        <div class="ledger-summary-card outstanding${balance < -0.5 ? " they-pay" : ""}"><span>Balance</span><strong>${money(Math.abs(balance))}</strong><small>${balance < -0.5 ? "They have to pay us" : (balance > 0.5 ? "We have to pay them" : "Nothing to pay")}</small></div>
      </div>
      <div class="panel ledger-table-panel"><div id="ledgerTable"></div></div>
    </div>`;
  renderSearchableTable(ledgerEditRows(rows), ledgerEditCols(["Date","PartyName","PartyType","Particular","Ref","Debit","Credit","Balance","Type","Slip"], "supplier"), "", "ledgerTable");
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
  if (isAdminUser() && !(state.warehouses || []).length) { try { state.warehouses = await call("warehouses", {}); } catch (e) { /* names only */ } }
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

  const owner = isAdminUser();
  const results = await Promise.all([owner ? loadSalespersons() : Promise.resolve(), call("incentivereport", payload),
    owner ? call("userpick", {}).catch(function () { return state.pickUsers || []; }) : Promise.resolve([])]);
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

function renderDashboard(data) {
  const d = data || {};
  const sm = d.simple || {};
  const today = sm.today || { sales: d.todaysSales || 0, bills: 0, cash: 0, credit: 0, received: 0 };
  const att = sm.attention || {};
  const shops = sm.shops || [];
  const owing = sm.topOwing || [];
  const ur = getLang() === "ur";
  const go = function (page, extra) { return "showPage('" + page + "')" + (extra ? ";" + extra : ""); };

  const todo = [];
  if (att.toCheck > 0) todo.push(["₨", att.toCheck + " " + t(att.toCheck === 1 ? "new payment to check" : "new payments to check") + " · " + qsMoney(att.toCheckTotal), "openAttention('pay')", "blink"]);
  if (att.cashForMe > 0) todo.push(["◍", qsMoney(att.cashForMe) + " " + t("cash handed to you. Confirm it."), "openAttention('cash')"]);
  if ((att.stockShort || []).length) {
    const ss = att.stockShort;
    todo.push(["!", ss.length + " " + t(ss.length === 1 ? "item sold without ERP stock. Check the stock" : "items sold without ERP stock. Check the stock") + ": " +
      ss.slice(0, 3).map(function (x) { return x.qty + " " + x.name + " (" + x.place + ")"; }).join(", ") + (ss.length > 3 ? "…" : ""), "openAttention('short')"]);
  }
  if (att.stockInBills > 0) todo.push(["⇩", att.stockInBills + " " + t("Goods In waiting for a purchase bill"), "openAttention('goodsin')"]);
  if (d.lowStockCount > 0) todo.push(["▦", d.lowStockCount + " " + t(d.lowStockCount === 1 ? "item low in stock" : "items low in stock"), "openAttention('low')"]);

  contentElement().innerHTML = '<div class="content db"' + (ur ? ' dir="rtl"' : "") + ">" +
    '<p class="db-date">' + escapeHtml(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })) + "</p>" +
    bigActionsHtml() +

    // 1. Today
    '<section class="db-today">' +
      '<button type="button" class="db-hero" onclick="' + go("daily") + '"><small>' + escapeHtml(t("Sold today")) + '</small><b dir="ltr">' + qsMoney(today.sales) + "</b>" +
        '<span>' + formatNumber(today.bills || 0) + " " + escapeHtml(t("bills")) + "</span></button>" +
      '<div class="db-today-split">' +
        '<div><small>' + escapeHtml(t("Cash")) + '</small><b dir="ltr">' + qsMoney(today.cashNet != null ? today.cashNet : today.cash) + "</b>" +
          (today.commissionCash ? '<small class="db-sub">' + escapeHtml(t("after")) + " " + qsMoney(today.commissionCash) + " " + escapeHtml(t("commission")) + "</small>" : "") + "</div>" +
        '<div><small>' + escapeHtml(t("Credit given")) + '</small><b dir="ltr">' + qsMoney(today.credit) + "</b></div>" +
        '<div><small>' + escapeHtml(t("Old credit received")) + '</small><b dir="ltr">' + qsMoney(today.received) + "</b></div>" +
        (sm.cashInHand != null ? '<button type="button" onclick="' + go("cash") + '"><small>' + escapeHtml(t("Cash in hand, all shops")) + '</small><b dir="ltr">' + qsMoney(sm.cashInHand) + "</b></button>" : "") +
      "</div></section>" +

    // 2. What needs you
    '<section class="db-block"><h3>' + escapeHtml(t("Needs your attention")) + "</h3>" +
      (todo.length ? '<div class="db-todo">' + todo.map(function (x) {
        return '<button type="button" class="' + (x[3] || "") + '" onclick="' + x[2] + '"><i aria-hidden="true">' + x[0] + "</i><span>" + escapeHtml(x[1]) + '</span><em aria-hidden="true">›</em></button>';
      }).join("") + "</div>" : '<p class="db-clear">✓ ' + escapeHtml(t("All clear. Nothing is waiting for you.")) + "</p>") + "</section>" +

    // 2b. Latest work by the users
    ((sm.recent || []).length ? '<section class="db-block"><h3>' + escapeHtml(t("Today's updates")) + '</h3><div class="upd-list">' +
      sm.recent.map(updRowHtml).join("") + '</div><button type="button" class="db-more" onclick="state.updTab=\'act\';' + go("updates") + '">' + escapeHtml(t("See all updates")) + " ›</button></section>" : "") +

    // 3. Shops today
    (shops.length ? '<section class="db-block"><h3>' + escapeHtml(t("Shops today")) + "</h3>" +
      '<div class="db-shops"><div class="db-shop db-shop-head"><span></span><span>' + escapeHtml(t("Sales")) + "</span><span>" + escapeHtml(t("Bills")) + "</span><span>" + escapeHtml(t("Cash in hand")) + "</span></div>" +
      shops.map(function (x) {
        return '<div class="db-shop"><b dir="ltr">' + escapeHtml(x.name) + '</b><span dir="ltr">' + qsMoney(x.sales) + "</span><span>" + formatNumber(x.bills) + '</span><span dir="ltr">' + qsMoney(x.inHand) + "</span></div>";
      }).join("") + "</div></section>" : "") +

    // 4. Money
    '<section class="db-block"><h3>' + escapeHtml(t("Money")) + "</h3>" +
      '<div class="db-money"><button type="button" onclick="' + go("customers") + '"><small>' + escapeHtml(t("Customers owe you")) + '</small><b dir="ltr">' + qsMoney(d.receivable) + "</b></button>" +
      '<button type="button" onclick="' + go("suppliers") + '"><small>' + escapeHtml(t("You owe suppliers")) + '</small><b dir="ltr">' + qsMoney(d.payable) + "</b></button></div>" +
      (owing.length ? '<div class="db-owing"><small>' + escapeHtml(t("Biggest balances")) + "</small>" + owing.map(function (c) {
        return '<button type="button"' + (canOpen("accounts") ? cardAttr("customer", c.id) : ' onclick="openPartyLedger(\'customer\',\'' + escapeHtml(c.id) + '\')"') + '><span dir="ltr">' + escapeHtml(c.name) + '</span><b dir="ltr">' + qsMoney(c.balance) + "</b></button>";
      }).join("") + "</div>" : "") + "</section>" +

    // 5. This month
    '<section class="db-month"><div><small>' + escapeHtml(t("Sales this month")) + '</small><b dir="ltr">' + qsMoney(d.monthlySales) + "</b></div>" +
      '<div><small>' + escapeHtml(t("Purchases this month")) + '</small><b dir="ltr">' + qsMoney(d.monthlyPurchases) + "</b></div>" +
      '<button type="button" onclick="' + go("monthexp") + '"><small>' + escapeHtml(t("Expenses this month")) + '</small><b dir="ltr">' + qsMoney(sm.monthExpenses || 0) + "</b></button></section>" +
    "</div>";
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
          <h2>Products &amp; Stock</h2>
          <p>${view === "all" ? rows.length + " items. Tap a shop below to see and set only that shop's stock." : shown.length + " items in stock at " + escapeHtml(shopName)}</p>
        </div>
        <div class="toolbar-actions">
          ${view !== "all" ? '<button class="btn secondary" type="button" onclick="downloadShopStock()">Download list</button><button class="btn secondary" type="button" onclick="openStockUpload()">Upload stock list</button>'
            : '<button class="btn secondary" type="button" onclick="downloadAllStock()">Download all locations</button><button class="btn secondary" type="button" onclick="openAllStockUpload()">Upload all locations</button>'}
          <button class="btn secondary" type="button" onclick="showPage('stock')">Stock history</button>
          ${isAdminUser() ? '<button class="btn secondary" type="button" onclick="openDeletedProducts()">Deleted items</button>' : ""}
          <button class="btn primary" type="button" onclick="openProductForm()">+ New Product</button>
        </div>
      </div>
      ${tabs}
      <div id="stockUploadArea"></div>
      ${newProductsHtml(rows)}
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
  const columns=["Date","PartyName","PartyType","Particular","Ref","Debit","Credit","Balance","Type","Slip"];
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

      ${selectedCustomer ? partyMoveBar("customer", selectedCustomer.CustomerID, customerName, selectedCustomer.Phone || "", Number(selectedCustomer.ClosingBalance) || 0) : ""}
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
          <div class="ledger-summary-card outstanding${lastBalance < -0.5 ? " we-pay" : ""}"><span>Current Balance</span><strong>${money(Math.abs(lastBalance))}</strong><small>${lastBalance < -0.5 ? "We have to pay them" : (lastBalance > 0.5 ? "They have to pay us" : "Nothing to pay")}</small></div>
        </div>
        <div class="panel ledger-table-panel" id="customerLedgerPrintArea">
          <div class="print-ledger-header"><div><div class="print-company">ARHAM ELECTRONICS</div><h2>Customer Ledger</h2><p>${escapeHtml(customerName)} • ${escapeHtml(from||"Start")} to ${escapeHtml(to||"Today")}</p></div><div class="print-date">Printed: ${escapeHtml(formatDate(new Date()))}</div></div>
          <div id="ledgerTable"></div>
        </div>
      ` : `
        <div class="panel ledger-empty-state"><div class="ledger-empty-icon">▤</div><h3>Select a customer</h3><p>Choose a customer, set the duration, then click <b>View Ledger</b>.</p></div>
      `}
    </div>`;
  if(selectedCustomer) renderSearchableTable(ledgerEditRows(rows),ledgerEditCols(columns,"customer"),"","ledgerTable");
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
  const totalSales = rows.reduce(function (a, r) { return a + Number(r.totalSales || 0) - Number(r.teamSales || 0); }, 0);   // shop sales counted for a manager are already in the seller's row
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
          <h2>${d.mine ? "My Incentive" : "Incentive Report"}</h2>
          ${d.mine ? "" : "<p>Incentive = rate % of the profit: sold for − cost price − commission − discount. Labour, rent and installation do not count.</p>"}
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
        ${statCard(d.mine ? "My Incentive" : "Total Incentive", money(totalIncentive), d.mine ? "" : activeCount + " active salesperson(s)", "blue")}
      </div>
      ${d.mine && !d.linked ? '<p class="qs-warn">You are not set up as a salesperson yet. Ask the owner to add you on the Incentive page.</p>' : ""}

      <div class="panel" style="margin-bottom:16px;">
        <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Salesperson</th><th class="num">Rate</th><th class="num"># Sales</th><th class="num">Total Sales</th><th class="num">${rows.some(function (r) { return r.aboveTotal != null; }) ? "Profit" : ""}</th><th class="num">Incentive</th></tr></thead>
          <tbody>
            ${rows.length === 0 ? '<tr><td colspan="6" class="empty">No salespersons or sales in this period.</td></tr>' : rows.map(function (r) {
              return '<tr><td>' + escapeHtml(r.name) + (r.active === false && r.salespersonId !== "unassigned" ? ' <span class="badge">Inactive</span>' : '') +
                (r.shopScope ? '<br><small>Manager of ' + escapeHtml(r.shopScopeName || "") + (r.teamCount ? " (" + formatNumber(r.teamCount) + " by shop staff, " + money(r.teamSales || 0) + ")" : "") + "</small>" : "") + '</td>' +
                '<td class="num">' + rateCell(r) + '</td>' +
                '<td class="num">' + formatNumber(r.salesCount) + '</td>' +
                '<td class="num">' + money(r.totalSales) + '</td>' +
                '<td class="num">' + (r.salespersonId === "unassigned" || r.aboveTotal == null ? "" : money(r.aboveTotal || 0)) + '</td>' +
                '<td class="num">' + (r.salespersonId === "unassigned" ? "—" : money(r.incentive)) + '</td></tr>';
            }).join("")}
          </tbody>
        </table>
        </div>
      </div>
      ${incentiveDetailsHtml(rows, d.mine)}

      ${d.mine ? "" : `<div class="panel">
        <div class="panel-header">
          <div><h2>Salespersons</h2><p style="margin:4px 0 0;">Choose a user and set the incentive rate. The rate is taken on the profit of each bill (sold for − cost price − commission). A new rate applies to sales made after the change.</p></div>
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
                '<td>' + escapeHtml(sp.Name || "") + (sp.ShopScope ? '<br><small>Manager of ' + escapeHtml(((state.warehouses || []).find(function (w) { return String(w.WarehouseID) === String(sp.ShopScope); }) || {}).Name || sp.ShopScope) + "</small>" : "") + '</td>' +
                '<td>' + (sp.UserID ? escapeHtml(spUserLabel(sp.UserID)) : '<span class="badge warning">Not linked</span>') + '</td>' +
                '<td>' + escapeHtml(sp.Phone || "") + '</td>' +
                '<td class="num">' + spPercentText(sp.IncentivePercent) + '</td>' +
                '<td><span class="badge ' + (active ? "success" : "") + '">' + (active ? "Active" : "Inactive") + '</span></td>' +
              '</tr>';
            }).join("")}
          </tbody>
        </table>
        </div>
      </div>`}
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
  try { if (!(state.warehouses || []).length) state.warehouses = await call("warehouses", {}); } catch (e) { /* keep old */ }
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
        <label>Role<select name="shopScope">
          <option value="">Salesman (own sales only)</option>
          ${(state.warehouses || []).filter(function (w) { return w.Active !== false; }).map(function (w) {
            return '<option value="' + escapeHtml(String(w.WarehouseID)) + '"' + (String(sp && sp.ShopScope || "") === String(w.WarehouseID) ? " selected" : "") + ">Manager of " + escapeHtml(w.Name) + " (own sales + all its staff)</option>";
          }).join("")}
        </select></label>
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
    incentivePercent: form.incentivePercent.value.trim(),
    shopScope: form.shopScope ? form.shopScope.value : ""
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
  const totalSales = rows.reduce(function (a, r) { return a + Number(r.totalSales || 0) - Number(r.teamSales || 0); }, 0);   // shop sales counted for a manager are already in the seller's row
  const totalIncentive = rows.reduce(function (a, r) { return a + Number(r.incentive || 0); }, 0);
  const body = rows.length ? rows.map(function (r) {
    const unassigned = r.salespersonId === "unassigned";
    const rate = unassigned ? "—" : ((r.ratesUsed || []).length ? r.ratesUsed.map(function (x) { return x + "%"; }).join(" / ") : spPercentText(r.currentPercent));
    return "<tr><td>" + escapeHtml(r.name) + "</td><td class='num'>" + rate + "</td><td class='num'>" + formatNumber(r.salesCount) +
      "</td><td class='num'>" + money(r.totalSales) + "</td><td class='num'>" + (unassigned ? "—" : money(r.aboveTotal || 0)) + "</td><td class='num'>" + (unassigned ? "—" : money(r.incentive)) + "</td></tr>";
  }).join("") : "<tr><td colspan='6' style='text-align:center;padding:20px'>No data.</td></tr>";
  const w = window.open("", "_blank", "width=1000,height=800");
  if (!w) { showError("Please allow pop-ups in your browser to print the report."); return; }
  w.document.write("<!doctype html><html><head><title>Incentive Report</title><style>@page{size:A4 portrait;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;font-size:11px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:4px 0 10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:7px}th{background:#eef2f7;text-align:left}.num{text-align:right}tfoot td{font-weight:700;background:#f7f9fc}</style></head><body>" +
    "<h1>ARHAM ELECTRONICS</h1><h2>Salesperson Incentive Report</h2><p>Period: " + escapeHtml(d.dateFrom || "Start") + " to " + escapeHtml(d.dateTo || "Today") + " &nbsp;|&nbsp; Printed: " + escapeHtml(formatDate(new Date())) + "</p>" +
    "<table><thead><tr><th>Salesperson</th><th class='num'>Rate</th><th class='num'># Sales</th><th class='num'>Total Sales</th><th class='num'>Above sale price</th><th class='num'>Incentive</th></tr></thead><tbody>" + body +
    "</tbody><tfoot><tr><td colspan='3'>TOTAL</td><td class='num'>" + money(totalSales) + "</td><td class='num'>" + money(rows.reduce(function (a, r) { return a + Number(r.aboveTotal || 0); }, 0)) + "</td><td class='num'>" + money(totalIncentive) + "</td></tr></tfoot></table>" +
    "<p>Incentive = rate % of the amount sold above each item's sale price.</p></body></html>");
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
      ((state.warehouses || []).filter(function (w) { return w.Active !== false; }).length > 1 ? actionButton("Transfer", "openTransferForm", [id]) : "") +
      (isAdminUser() ? actionButton("Delete", "openDeleteProduct", [id], "danger") : "");
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
  let charges = [];
  try { charges = JSON.parse(String(sale.Charges || "[]")) || []; } catch (e) { charges = []; }
  return {
    itemsTotal: itemsTotal,
    charges: charges,
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
    "<table class='totals'>" + line("Subtotal", money(t.itemsTotal)) + t.charges.map(function (x) { return line(x.name, money(x.amount)); }).join("") + (t.discount ? line("Invoice Discount", "- " + money(t.discount)) : "") + line("Net Total", money(t.net), true) +
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
    "<table>" + rows + "</table><hr><table>" + line("Subtotal", money(t.itemsTotal)) + t.charges.map(function (x) { return line(x.name, money(x.amount)); }).join("") + (t.discount ? line("Discount", "-" + money(t.discount)) : "") +
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
// Shop details printed on every bill (same as the printed invoice book).
const BILL_ADDRESS = "Shop No.4, Saifee Building, Shahrah-e-Liaquat, Regal, Saddar, Karachi.";
const BILL_CELL = "0321-3433253";
const BILL_TAGLINE = "DEALS IN ALL KINDS OF UPS AND SOLAR SYSTEM";
const BILL_DEALERS = ["HOMAGE", "TRION", "INVEREX", "LONGi", "Fronus", "NS", "CROWN", "JinKO"];
const BILL_URDU_NOTE = "خریدا ہوا مال واپس یا تبدیل نہیں ہوگا۔";

// Urdu cannot be written with the PDF's built-in fonts, so the line is drawn on a canvas
// with the phone's own Urdu font and put in the PDF as a picture.
let billUrduImg;
function billUrduImage(color) {
  if (billUrduImg !== undefined) return billUrduImg;
  billUrduImg = null;
  try {
    const scale = 4, wPt = 190, hPt = 14;
    const cv = document.createElement("canvas");
    cv.width = wPt * scale; cv.height = hPt * scale;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = color;
    ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.font = (10.5 * scale) + "px 'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Noto Naskh Arabic','Geeza Pro','Segoe UI',Tahoma,sans-serif";
    ctx.fillText(BILL_URDU_NOTE, cv.width - 2 * scale, cv.height / 2 + scale);
    const b64 = cv.toDataURL("image/jpeg", 0.92).split(",")[1];
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    billUrduImg = { bytes: bytes, pw: cv.width, ph: cv.height, wPt: wPt, hPt: hPt, canvas: cv };
  } catch (e) { billUrduImg = null; }
  return billUrduImg;
}

function billDesign(data) {
  let d = ((data && data.company) || {}).billDesign || (state.settings && state.settings.company && state.settings.company.billDesign) || "";
  try { if (d) localStorage.setItem("arhamBillDesign", d); else d = localStorage.getItem("arhamBillDesign") || ""; } catch (e) { /* private mode */ }
  return d === "classic" ? "classic" : "grid";
}

function buildInvoicePdf(data) {
  if (billDesign(data) === "grid") return buildInvoicePdfGrid(data);
  return buildInvoicePdfClassic(data);
}

function buildInvoicePdfClassic(data) {
  const sale = data.sale || {}, c = data.customer || {}, co = data.company || {};
  const tt = invoiceTotals(data);
  const doc = createPdf(A5_W, A5_H);
  const BLUE = "#1F3A93", RED = "#E2412E", INK = "#1B2559", MUTED = "#5B6690", BOX = "#3B4FA8";
  const M = 20, R = A5_W - M;
  // Columns (each cell is its own rounded box, like the printed book)
  const gap = 3, wQty = 44, wRate = 62, wAmt = 74;
  const xQty = M, xPart = xQty + wQty + gap, xAmt = R - wAmt, xRate = xAmt - gap - wRate;
  const wPart = xRate - gap - xPart;
  const rowR = 5;
  const totalY = A5_H - 150;            // where the TOTAL row sits on the last page
  // Row size shrinks (down to ~70%) when a bill has many lines, so it stays on one page in the same design.
  let k = 1, rowH = 19, LH = 10.5, vg = 3;
  let y = 0, page = 0;

  const cells = function (top, h) {
    [[xQty, wQty], [xPart, wPart], [xRate, wRate], [xAmt, wAmt]].forEach(function (cl) {
      doc.round(cl[0], top, cl[1], h, rowR, { stroke: BOX, lineWidth: 0.7 });
    });
  };

  const header = function () {
    doc.addPage(); page += 1;
    pdfLogo(doc, M, 14, 52);
    doc.text(M + 62, 44, pdfFit(String(co.name || "ARHAM ELECTRONICS").toUpperCase(), R - M - 64, true, 25), { size: 25, serif: true, color: BLUE });
    doc.rect(M + 62, 52, R - M - 62, 14, { fill: RED });
    doc.text((M + 62 + R) / 2, 62.5, BILL_TAGLINE, { size: 8.2, bold: true, color: "#FFFFFF", align: "center" });
    const pill = tt.cancelled ? "CANCELLED" : "INVOICE";
    doc.round(A5_W / 2 - 52, 74, 104, 20, 10, { stroke: RED, lineWidth: 1 });
    doc.text(A5_W / 2, 88.5, pill, { size: 12, serif: true, color: tt.cancelled ? RED : BLUE, align: "center" });
    // S. No. and Date
    doc.text(M, 116, "S. No.", { size: 9, bold: true, color: INK });
    doc.text(M + 46, 113, String(sale.InvoiceNo || ""), { size: 13, bold: true, color: INK });
    doc.line(M + 34, 118, M + 150, 118, { color: INK, width: 0.6 });
    doc.text(R - 128, 116, "Date", { size: 9, bold: true, color: INK });
    doc.text(R - 92, 113, formatDate(sale.Date), { size: 12, bold: true, color: BLUE });
    doc.line(R - 104, 118, R, 118, { color: INK, width: 0.6 });
    // M/s.
    doc.text(M, 140, "M/s.", { size: 9, bold: true, color: INK });
    const who = String(c.name || "") + (c.phone ? "   " + c.phone : "");
    doc.text(M + 34, 137, pdfFit(who, R - M - 40, true, 12), { size: 12, bold: true, color: BLUE });
    doc.line(M + 28, 142, R, 142, { color: INK, width: 0.6 });
    y = 152;
    // column titles
    [[xQty, wQty, "QTY."], [xPart, wPart, "PARTICULARS"], [xRate, wRate, "RATE"], [xAmt, wAmt, "AMOUNT"]].forEach(function (cl) {
      doc.round(cl[0], y, cl[1], 22, rowR, { stroke: BOX, lineWidth: 0.9 });
      doc.text(cl[0] + cl[1] / 2, y + 14.5, cl[2], { size: 9, bold: true, color: INK, align: "center" });
    });
    y += 22 + vg;
    if (page > 1) {
      cells(y, rowH);
      doc.text(xPart + 6, y + rowH * 0.66, "Continued from page " + (page - 1), { size: 8 * k, color: MUTED });
      y += rowH + vg;
    }
  };

  const rowHeight = function (lines) { return Math.max(rowH, lines.length * LH + 8.5 * k); };
  let rest = 0;                          // height of the rows still to place (to know which page is the last)
  const lineRow = function (qty, lines, rate, amount, opts) {
    opts = opts || {};
    const h = rowHeight(lines);
    // On the last page the rows must stop above the TOTAL; on earlier pages they can use the whole page
    // (keeping room for the "continued" line).
    const last = y + rest <= totalY - vg;
    const limit = last ? totalY - vg : A5_H - 46 - rowH - vg;
    if (y + h > limit) {
      cells(y, rowH);
      doc.text(xPart + 6, y + rowH * 0.66, "Continued on next page", { size: 8 * k, color: MUTED });
      header();
    }
    cells(y, h);
    const top = y + Math.min(12.5, 12.5 * k + 1);
    if (qty !== "") doc.text(xQty + wQty / 2, top, qty, { size: 10 * k, bold: true, color: BLUE, align: "center" });
    lines.forEach(function (ln, i) { doc.text(xPart + 6, top + i * LH, ln.text, { size: (ln.size || 9.5) * k, bold: !!ln.bold, color: ln.color || BLUE }); });
    if (rate !== "") doc.text(xRate + wRate - 5, top, rate, { size: 9 * k, color: BLUE, align: "right" });
    if (amount !== "") doc.text(xAmt + wAmt - 5, top, amount, { size: 9.5 * k, bold: true, color: opts.amountColor || BLUE, align: "right" });
    y += h + vg;
    rest -= h + vg;
  };

  const rows = (data.items || []).map(function (it) {
    const lines = pdfWrap(it.description || it.productId || "", wPart - 12, false, 9.5).map(function (t) { return { text: t }; });
    const sn = (Array.isArray(it.serials) ? it.serials.join(", ") : String(it.serials || "")).replace(/\s*[\n,]+\s*/g, ", ").replace(/^[,\s]+|[,\s]+$/g, "");
    if (sn) pdfWrap("S/N: " + sn, wPart - 12, false, 7.5).forEach(function (t) { lines.push({ text: t, size: 7.5, color: MUTED }); });
    if (it.discount) lines.push({ text: "Discount " + billNumber(it.discount), size: 7.5, color: MUTED });
    return [billNumber(it.qty), lines, billNumber(it.unitPrice), billNumber(it.lineTotal), {}];
  });
  tt.charges.forEach(function (x) {
    if (x.kind === "structure" && x.qty) {
      const lines = pdfWrap(String(x.name || "Structure").toUpperCase(), wPart - 12, false, 9.5).map(function (t) { return { text: t }; });
      lines.push({ text: x.unit === "W" ? "Per watt" : "Per panel", size: 7.5, color: MUTED });
      rows.push([billNumber(x.qty) + (x.unit === "W" ? " W" : ""), lines, billNumber(x.rate), billNumber(x.amount), {}]);
    } else rows.push(["", [{ text: x.name }], "", billNumber(x.amount), {}]);
  });
  if (tt.discount) rows.push(["", [{ text: "Less: Discount", color: MUTED }], "", "- " + billNumber(tt.discount), { amountColor: RED }]);
  // fit: first row starts at 177; shrink rows step by step until all of them fit above the TOTAL
  const room = totalY - 177;
  const need = function () { return rows.reduce(function (a, r) { return a + rowHeight(r[1]) + vg; }, 0); };
  while (need() > room && k > 0.7) { k = Math.round((k - 0.03) * 100) / 100; rowH = 19 * k; LH = 10.5 * k; vg = Math.max(1.5, 3 * k); }
  rest = need();
  header();
  rows.forEach(function (r) { lineRow(r[0], r[1], r[2], r[3], r[4]); });
  // a long bill: the TOTAL never covers a row; it moves to a new page when the rows reach it
  if (y > totalY - vg) {
    cells(y, rowH);
    doc.text(xPart + 6, y + rowH * 0.66, "Continued on next page", { size: 8 * k, color: MUTED });
    header();
  }
  // empty boxes down to the total, as on the paper bill
  while (y + rowH <= totalY - vg) { cells(y, rowH); y += rowH + vg; }
  y = totalY;
  // TOTAL row: Urdu note in the wide box, TOTAL and amount on the right
  const wide = xRate - gap - xQty;
  doc.round(xQty, y, wide, 22, rowR, { stroke: BOX, lineWidth: 0.9 });
  doc.round(xRate, y, wRate, 22, rowR, { stroke: BOX, lineWidth: 0.9 });
  doc.round(xAmt, y, wAmt, 22, rowR, { stroke: BOX, lineWidth: 0.9 });
  const ur = billUrduImage(INK);
  if (ur) doc.image(xQty + wide - ur.wPt - 6, y + 4, ur.wPt, ur.hPt, ur);
  doc.text(xRate + wRate / 2, y + 15, "TOTAL", { size: 10, bold: true, color: INK, align: "center" });
  doc.text(xAmt + wAmt - 5, y + 15, billNumber(tt.net), { size: 11, bold: true, color: BLUE, align: "right" });
  y += 22 + 12;
  // paid / balance under the total (owner's copy also shows the account balance)
  const small = function (label, value, color) {
    doc.text(xRate - 4, y, label, { size: 8.5, color: MUTED, align: "right" });
    doc.text(R - 5, y, value, { size: 9, bold: true, color: color || BLUE, align: "right" });
    y += 11.5;
  };
  small("Paid", billNumber(tt.paid));
  if (tt.balance > 0.5) small("Balance on this bill", billNumber(tt.balance), RED);
  if (tt.returned) small("Returned", "- " + billNumber(tt.returned));
  if (c.balance != null && c.name && String(c.name).toUpperCase() !== "CASH CUSTOMER") small("Total account balance", billNumber(c.balance), Number(c.balance) > 0 ? RED : BLUE);
  if (sale.Notes) pdfWrap("Note: " + sale.Notes, xRate - M - 12, false, 8).slice(0, 2).forEach(function (ln, k) { doc.text(M, totalY + 34 + k * 10, ln, { size: 8, color: MUTED }); });
  // footer: address, cell, authorised dealer, sign
  const fy = A5_H - 66;
  doc.text(M, fy, BILL_ADDRESS, { size: 8.2, bold: true, color: INK });
  doc.text(M, fy + 11, "Cell: " + BILL_CELL, { size: 8.2, bold: true, color: INK });
  doc.text(M, fy + 28, "AUTHORIZED DEALER", { size: 9, bold: true, color: INK });
  let bx = M;
  BILL_DEALERS.forEach(function (b, i) {
    const size = 8.5, w = pdfTextWidth(b, true, size);
    doc.text(bx, fy + 42, b, { size: size, bold: true, color: i % 2 ? "#2F3A4F" : BLUE });
    bx += w + 9;
  });
  doc.text(R - 120, fy + 28, "Sign", { size: 9, bold: true, color: INK });
  doc.line(R - 98, fy + 29, R, fy + 29, { color: INK, width: 0.6 });
  const n = doc.pageCount();
  if (n > 1) for (let i = 0; i < n; i++) { doc.onPage(i); doc.text(R, A5_H - 8, "Page " + (i + 1) + " of " + n, { size: 6.5, color: MUTED, align: "right" }); }
  return { bytes: doc.output(), filename: "Bill-" + String(sale.InvoiceNo || "invoice").replace(/[^A-Za-z0-9-]/g, "") + ".pdf" };
}

// Opens the bill PDF (the phone or browser shows it, with Print and Share).
async function openBillPdf(saleId) {
  const v = pdfViewerOpen(t("Making the bill..."));
  try {
    const data = await getInvoiceData(saleId);
    const pdf = buildInvoicePdf(data);
    const sale = data.sale || {}, c = data.customer || {};
    pdfViewerShow(v, pdf, PDF_LAST_DOC, { title: t("Bill") + " " + (sale.InvoiceNo || ""), text: (typeof invoiceMessage === "function" ? invoiceMessage(data) : ""), phone: c.phone || "" });
  } catch (error) {
    v.remove();
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

let PDF_LAST_DOC = null;      // the drawing of the last PDF made, for the in-app viewer
function createPdf(pageW, pageH) {
  const W = pageW || 595.28, H = pageH || 841.89;
  const pages = [];
  const images = [];
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
  const recs = [];
  let rcur = null;
  const doc = {
    width: W, height: H, recs: recs,
    addPage: function () { cur = []; pages.push(cur); rcur = []; recs.push(rcur); return doc; },
    pageCount: function () { return pages.length; },
    onPage: function (i) { cur = pages[i]; rcur = recs[i]; return doc; },
    // y is measured from the TOP of the page, like a web page.
    text: function (x, y, str, o) {
      o = o || {};
      rcur.push(["text", x, y, String(str), o]);
      const size = o.size || 10, bold = !!o.bold;
      let tx = x;
      if (o.align === "right") tx = x - pdfTextWidth(str, bold, size);
      else if (o.align === "center") tx = x - pdfTextWidth(str, bold, size) / 2;
      cur.push("BT /" + (o.serif ? "F3" : (bold ? "F2" : "F1")) + " " + n(size) + " Tf " + rgb(o.color) + " rg " + n(tx) + " " + n(H - y) + " Td (" + enc(str) + ") Tj ET");
      return doc;
    },
    // Rounded box (y from the top). o: { stroke, fill, lineWidth }
    round: function (x, y, w, h, r, o) {
      o = o || {};
      rcur.push(["round", x, y, w, h, r, o]);
      r = Math.min(r, w / 2, h / 2);
      const k = r * 0.5523, X = x, Y = H - y - h;
      const path = n(X + r) + " " + n(Y) + " m " + n(X + w - r) + " " + n(Y) + " l " +
        n(X + w - r + k) + " " + n(Y) + " " + n(X + w) + " " + n(Y + r - k) + " " + n(X + w) + " " + n(Y + r) + " c " +
        n(X + w) + " " + n(Y + h - r) + " l " + n(X + w) + " " + n(Y + h - r + k) + " " + n(X + w - r + k) + " " + n(Y + h) + " " + n(X + w - r) + " " + n(Y + h) + " c " +
        n(X + r) + " " + n(Y + h) + " l " + n(X + r - k) + " " + n(Y + h) + " " + n(X) + " " + n(Y + h - r + k) + " " + n(X) + " " + n(Y + h - r) + " c " +
        n(X) + " " + n(Y + r) + " l " + n(X) + " " + n(Y + r - k) + " " + n(X + r - k) + " " + n(Y) + " " + n(X + r) + " " + n(Y) + " c h";
      if (o.fill) cur.push(rgb(o.fill) + " rg " + path + " f");
      if (o.stroke) cur.push(rgb(o.stroke) + " RG " + n(o.lineWidth || 0.8) + " w " + path + " S");
      return doc;
    },
    // A JPEG picture: img = { bytes: Uint8Array (JPEG), pw, ph } (pixel size). y from the top.
    image: function (x, y, w, h, img) {
      if (!img || !img.bytes) return doc;
      rcur.push(["image", x, y, w, h, img]);
      let i = images.indexOf(img);
      if (i === -1) { images.push(img); i = images.length - 1; }
      cur.push("q " + n(w) + " 0 0 " + n(h) + " " + n(x) + " " + n(H - y - h) + " cm /Im" + (i + 1) + " Do Q");
      return doc;
    },
    rect: function (x, y, w, h, o) {
      o = o || {};
      rcur.push(["rect", x, y, w, h, o]);
      if (o.fill) cur.push(rgb(o.fill) + " rg " + n(x) + " " + n(H - y - h) + " " + n(w) + " " + n(h) + " re f");
      if (o.stroke) cur.push(rgb(o.stroke) + " RG " + n(o.lineWidth || 0.6) + " w " + n(x) + " " + n(H - y - h) + " " + n(w) + " " + n(h) + " re S");
      return doc;
    },
    // Filled shape through the given [x, y] points (y from the top).
    poly: function (pts, o) {
      o = o || {};
      rcur.push(["poly", pts, o]);
      cur.push(rgb(o.fill || "#000000") + " rg " + pts.map(function (pt, i) { return n(pt[0]) + " " + n(H - pt[1]) + (i ? " l" : " m"); }).join(" ") + " h f");
      return doc;
    },
    line: function (x1, y1, x2, y2, o) {
      o = o || {};
      rcur.push(["line", x1, y1, x2, y2, o]);
      cur.push(rgb(o.color || "#cbd5e1") + " RG " + n(o.width || 0.6) + " w " + n(x1) + " " + n(H - y1) + " m " + n(x2) + " " + n(H - y2) + " l S");
      return doc;
    },
    output: function () {
      const objs = [];
      objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
      objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
      objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
      const kids = [];
      const f3 = 5 + pages.length * 2;
      objs[f3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>";
      const xo = images.map(function (img, i) {
        let bin = "";
        for (let b = 0; b < img.bytes.length; b += 8192) bin += String.fromCharCode.apply(null, img.bytes.subarray(b, b + 8192));
        objs[f3 + 1 + i] = "<< /Type /XObject /Subtype /Image /Width " + img.pw + " /Height " + img.ph +
          " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + img.bytes.length + " >>\nstream\n" + bin + "\nendstream";
        return "/Im" + (i + 1) + " " + (f3 + 1 + i) + " 0 R";
      }).join(" ");
      pages.forEach(function (ops, i) {
        const pageId = 5 + i * 2, contentId = 6 + i * 2;
        const stream = ops.join("\n");
        objs[pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + n(W) + " " + n(H) + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 " + f3 + " 0 R >>" +
          (xo ? " /XObject << " + xo + " >>" : "") + " >> /Contents " + contentId + " 0 R >>";
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
  PDF_LAST_DOC = doc;
  return doc;
}

// The Arham mark (sun, roof with a solar-panel window, green swoosh) drawn with shapes,
// on a white rounded tile of size s at (x, y).
function pdfLogo(doc, x, y, s) {
  doc.rect(x, y, s, s, { fill: "#FFFFFF" });
  const p = s * 0.08, W = s - 2 * p;
  const X = function (f) { return x + p + W * f; }, Y = function (f) { return y + p + W * f; };
  const sx = X(0.63), sy = Y(0.30), sr = W * 0.15;
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * 2 * i / 14 - Math.PI / 2;
    doc.poly([[sx + Math.cos(a - 0.1) * sr * 1.18, sy + Math.sin(a - 0.1) * sr * 1.18], [sx + Math.cos(a) * sr * 1.72, sy + Math.sin(a) * sr * 1.72],
      [sx + Math.cos(a + 0.1) * sr * 1.18, sy + Math.sin(a + 0.1) * sr * 1.18]], { fill: "#FFB000" });
  }
  const circle = [];
  for (let i = 0; i < 28; i++) { const a = Math.PI * 2 * i / 28; circle.push([sx + Math.cos(a) * sr, sy + Math.sin(a) * sr]); }
  doc.poly(circle, { fill: "#FFC21A" });
  const t = W * 0.12;
  doc.poly([[X(0.40), Y(0.24)], [X(0.78), Y(0.60)], [X(0.78) - t * 0.75, Y(0.60)], [X(0.40), Y(0.24) + t * 1.3], [X(0.02) + t * 0.75, Y(0.60)], [X(0.02), Y(0.60)]], { fill: "#103070" });
  doc.poly([[X(0.16), Y(0.56)], [X(0.40), Y(0.36)], [X(0.64), Y(0.56)], [X(0.64), Y(0.80)], [X(0.16), Y(0.80)]], { fill: "#103070" });
  doc.rect(X(0.31), Y(0.56), W * 0.18, W * 0.13, { fill: "#FFFFFF" });
  const top = [], bot = [];
  for (let i = 0; i <= 30; i++) {
    const u = i / 30, xx = X(-0.02 + u * 1.04), base = Y(0.98 - 0.30 * u + 0.10 * u * u), th = W * 0.075 * Math.sin(Math.PI * u);
    top.push([xx, base - th]); bot.unshift([xx, base + th * 0.2]);
  }
  doc.poly(top.concat(bot), { fill: "#28A53C" });
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
  t.charges.forEach(function (x) { lines.push(x.name + ": " + money(x.amount)); });
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
      <div id="cashAdjPanel" class="panel" style="margin-bottom:16px;"></div>
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
          <label>Bill design<select name="billDesign">
            <option value="grid"${co.billDesign !== "classic" ? " selected" : ""}>New: grid, logo colours (services in their own box)</option>
            <option value="classic"${co.billDesign === "classic" ? " selected" : ""}>Old: rounded boxes, like the bill book</option>
          </select></label>
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
        companyAddress: form.companyAddress.value.trim(), invoiceFooter: form.invoiceFooter.value.trim(), billDesign: form.billDesign.value
      });
      try { localStorage.setItem("arhamBillDesign", (state.settings.company || {}).billDesign || "grid"); } catch (e) { /* private mode */ }
      Object.keys(INVOICE_CACHE).forEach(function (k) { delete INVOICE_CACHE[k]; });
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
          <h2>Stock History</h2>
          <p>Every stock change in every warehouse: purchases, sales, returns, transfers and adjustments. To see or set how much a shop has now, use Products &amp; Stock.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn secondary" type="button" onclick="showPage('products')">‹ Products &amp; Stock</button>
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
            <label>Short names (staff can search these)<input name="aliases" value="${v("Aliases")}" autocomplete="off" placeholder="e.g. 6.6 nitrox, nitrox 6"></label>
            <label>Minimum sale rate (staff cannot sell below)<input type="number" name="minPrice" min="0" step="1" value="${v("MinPrice")}"></label>
            <label>Warranty (months)<input type="number" name="warrantyMonths" min="0" step="1" value="${v("WarrantyMonths")}" placeholder="0 = no serial number asked"></label>
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
    aliases: form.aliases ? form.aliases.value.trim() : undefined,
    minPrice: form.minPrice ? numOrBlank(form.minPrice) : undefined,
    warrantyMonths: form.warrantyMonths ? numOrBlank(form.warrantyMonths) : undefined,
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

                          return "<td>" + cellCardWrap(row, column, formatCell(row[column], column), partyType) + "</td>";

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
  if (String(column) === "Edit") return value ? '<button type="button" class="lg-edit-btn" title="' + escapeHtml(t("Change this line")) + '" onclick="ledgerLineAsk(\'' + escapeHtml(String(value)) + '\')">✎</button>' : "";
  if (String(column) === "Slip") return /^https:\/\//.test(String(value || "")) ? '<a href="' + escapeHtml(value) + '" target="_blank" rel="noopener">View slip</a>' : "";

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
  "Who has this cash?": "یہ کیش کس کے پاس ہے؟", "Payment handed over to": "پیمنٹ دی گئی", "They get a message. The cash moves to them only when they press Received.": "انہیں پیغام جائے گا۔ کیش ان کے نام تب ہوگا جب وہ 'مل گیا' دبائیں گے۔",
  "to confirm": "تصدیق باقی", "Waiting for": "انتظار:", "to press Received": "کے 'مل گیا' دبانے کا", "New cash handed to you": "آپ کو نیا کیش دیا گیا",
  "Nothing ticked: the cash stays with you.": "کچھ نہیں چُنا: کیش آپ کے پاس رہے گا۔", "My cash": "میرا کیش", "Cash with me": "میرے پاس کیش", "Cash with": "کیش", "Give to": "کس کو دیا",
  "Cash handed to you. Did you get it?": "آپ کو کیش دیا گیا ہے۔ کیا مل گیا؟", "Received": "مل گیا", "Not received": "نہیں ملا", "Handed over, not confirmed yet": "دے دیا، ابھی تصدیق باقی",
  "waiting for them to confirm": "ان کی تصدیق کا انتظار", "Cash received.": "کیش مل گیا۔", "Choose": "چنیں",
  "Handed over. It shows with them when they press Received.": "دے دیا۔ جب وہ 'مل گیا' دبائیں گے تو ان کے نام ہو جائے گا۔",
  "Cash from sales and payments, and cash handed from one person to another.": "سیل اور وصولی کا کیش، اور ایک سے دوسرے کو دیا گیا کیش۔",
  "cash handed to you. Tap to confirm.": "کیش آپ کو دیا گیا ہے۔ تصدیق کے لیے دبائیں۔",
  "Bring back from shop": "دکان سے مال واپس", "Goods come back from the shop to the main godam.": "مال دکان سے مین گودام میں واپس آئے گا۔", "Bring back from which shop?": "کس دکان سے واپس؟",
  "Back from": "واپس از", "Save, goods are back": "محفوظ کریں، مال واپس", "Goods back": "مال واپس آگیا", "The goods are now in the main godam's stock.": "مال اب مین گودام کے اسٹاک میں ہے۔", "Bring back more": "مزید واپس لائیں",
  "My Incentive": "میرا انسینٹو",
  "Extra charges on this bill": "بل پر اضافی چارجز", "Labour": "مزدوری", "Rent": "کرایہ", "Installation": "انسٹالیشن",
  "For credit, write the customer's name or mobile number": "ادھار کے لیے گاہک کا نام یا موبائل لکھیں", "Name or 03xx mobile": "نام یا 03xx موبائل",
  "Choose old customer": "پرانا گاہک چنیں", "OK": "ٹھیک ہے", "Write a name or mobile number.": "نام یا موبائل نمبر لکھیں۔",
  "Monthly Expenses": "ماہانہ اخراجات",
  "Received in (account)": "کس اکاؤنٹ میں آیا", "e.g. Meezan Bank, JazzCash, Easypaisa": "مثلاً میزان بینک، جاز کیش، ایزی پیسہ", "Transaction / cheque no.": "ٹرانزیکشن / چیک نمبر",
  "Slip attached": "سلپ لگ گئی", "Attach slip / screenshot": "سلپ / اسکرین شاٹ لگائیں", "Choose a picture (screenshot or photo).": "تصویر چنیں (اسکرین شاٹ یا فوٹو)۔",
  "Supplier name or place": "سپلائر کا نام یا جگہ", "Example: bilty no. 4412": "مثلاً بلٹی نمبر 4412", "Goods from our own shops come with Send to shop, not here.": "اپنی دکانوں کا مال سینڈ ٹو شاپ سے آتا ہے، یہاں نہیں۔",
  "Write where the goods came from.": "لکھیں مال کہاں سے آیا۔", "Stock In": "اسٹاک ان", "Received from": "کہاں سے آیا", "Keep in": "کہاں رکھا", "Search item": "آئٹم تلاش کریں", "Add new item": "نیا آئٹم شامل کریں",
  "Save Stock In": "اسٹاک ان محفوظ کریں", "Goods saved": "مال محفوظ ہو گیا", "New Stock In": "نیا اسٹاک ان",
  "Make purchase bill": "پرچیز بل بنائیں", "Bill pending": "بل باقی", "Goods in / out": "مال آیا / گیا", "Bill": "بل",
  "Sold today": "آج کی سیل", "bills": "بل", "Credit given": "ادھار دیا", "Old credit received": "پرانا ادھار وصول", "Cash in hand, all shops": "تمام دکانوں میں کیش",
  "Needs your attention": "آپ کی توجہ چاہیے", "cash handed to you. Confirm it.": "کیش آپ کو دیا گیا، تصدیق کریں۔", "Goods In waiting for a purchase bill": "مال آیا، پرچیز بل باقی",
  "items low in stock": "آئٹم کم اسٹاک میں", "item low in stock": "آئٹم کم اسٹاک میں", "installations pending": "انسٹالیشن باقی", "warranty claims open": "وارنٹی کلیم کھلے", "All clear. Nothing is waiting for you.": "سب ٹھیک ہے۔ کچھ باقی نہیں۔",
  "Shops today": "آج دکانیں", "Money": "پیسے", "Customers owe you": "گاہکوں سے لینا ہے", "You owe suppliers": "سپلائرز کو دینا ہے", "Biggest balances": "سب سے زیادہ بقایا",
  "Sales this month": "اس ماہ سیل", "Purchases this month": "اس ماہ خریداری", "Expenses this month": "اس ماہ اخراجات",
  "Updates": "اپڈیٹس", "Today's updates": "آج کی اپڈیٹس", "See all updates": "تمام اپڈیٹس", "new payment to check": "نئی پیمنٹ چیک کرنی ہے", "new payments to check": "نئی پیمنٹس چیک کرنی ہیں",
  "Payments to check": "چیک کرنے والی پیمنٹس", "Activity": "سرگرمی", "View slip": "سلپ دیکھیں", "Problem": "مسئلہ", "to check": "چیک کرنی ہیں",
  "Our shops": "ہماری دکانیں", "Our shop": "ہماری دکان", "New supplier": "نیا سپلائر", "Suppliers": "سپلائرز", "Recent suppliers": "حالیہ سپلائرز", "Change": "بدلیں",
  "Search supplier or shop, or write a new name": "سپلائر یا دکان تلاش کریں، یا نیا نام لکھیں",
  "From our own shop: the goods leave that shop's stock and come here. Nothing is counted twice.": "اپنی دکان سے: مال اس دکان کے اسٹاک سے نکل کر یہاں آئے گا، دو بار نہیں گنا جائے گا۔",
  "The goods cannot come from the same place they go to.": "مال اسی جگہ سے نہیں آ سکتا جہاں جا رہا ہے۔",
  "Goods In": "مال آیا", "From a supplier or our shop": "سپلائر یا اپنی دکان سے", "Where did the goods come from?": "مال کہاں سے آیا؟",
  "From a supplier": "سپلائر سے", "From a supplier, with rates": "سپلائر سے، ریٹ کے ساتھ", "From our shop": "اپنی دکان سے",
  "Count the goods now, add the rates later": "ابھی مال گنیں، ریٹ بعد میں", "Count the goods. The owner adds the rates later.": "مال گنیں۔ ریٹ مالک بعد میں ڈالے گا۔",
  "Rates and payment now (purchase bill)": "ریٹ اور ادائیگی ابھی (پرچیز بل)", "Hamza / GM goods back to here": "حمزہ / جی ایم سے مال واپس یہاں",
  "Search our shop": "اپنی دکان تلاش کریں", "Search supplier, or write a new name": "سپلائر تلاش کریں یا نیا نام لکھیں",
  "Goods are taken from": "مال یہاں سے نکلے گا",
  "Commission (not on the bill)": "کمیشن (بل پر نہیں)", "Commission": "کمیشن", "Given to": "کس کو دیا", "Name (optional)": "نام (اختیاری)",
  "Given to the buyer's man. The customer never sees it. It lowers the profit and the incentive.": "خریدار کے بندے کو دیا گیا۔ گاہک کو نظر نہیں آئے گا۔ منافع اور انسینٹو اس کے بعد بنیں گے۔",
  "Paid from this bill's cash (my cash in hand goes down)": "اسی بل کے کیش سے دیا (میرا کیش کم ہوگا)", "Remove commission": "کمیشن ہٹائیں",
  "Commission cannot be more than the bill.": "کمیشن بل سے زیادہ نہیں ہو سکتا۔", "Deleted": "ڈیلیٹ", "Delete": "ڈیلیٹ",
  "Why delete bill": "بل کیوں ڈیلیٹ کر رہے ہیں", "Example: wrong item, wrong rate, made twice": "مثال: غلط آئٹم، غلط ریٹ، دو بار بن گیا",
  "Write why the bill is deleted.": "بل ڈیلیٹ کرنے کی وجہ لکھیں۔", "Delete bill": "بل ڈیلیٹ کریں",
  "All its items go back to stock, and money paid on it is given back to the customer. This cannot be undone.": "اس کا سارا مال اسٹاک میں واپس آئے گا اور اس پر دی گئی رقم گاہک کو واپس ہوگی۔ یہ واپس نہیں ہو سکتا۔",
  "deleted. Items are back in stock.": "ڈیلیٹ ہو گیا۔ مال اسٹاک میں واپس آ گیا۔", "given back.": "واپس کر دیے۔",
  "Our shop: use Send to shop": "اپنی دکان: سینڈ ٹو شاپ استعمال کریں", "is our own shop. Goods for it go with Send to shop, not with a sale bill.": "ہماری اپنی دکان ہے۔ اس کا مال سینڈ ٹو شاپ سے جاتا ہے، سیل بل سے نہیں۔",
  "Open Send to shop for": "سینڈ ٹو شاپ کھولیں:", "is our own shop. Goods for it go with Send to shop, not with a sale bill. Ask the main shop.": "ہماری اپنی دکان ہے۔ اس کا مال سینڈ ٹو شاپ سے جاتا ہے۔ مین شاپ سے کہیں۔",
  "Main shop": "مین شاپ", "In this shop": "اس دکان میں", "not in ERP stock": "ای آر پی اسٹاک میں نہیں", "ERP stock here is only": "یہاں ای آر پی اسٹاک صرف",
  "The rest comes from the main godam, or the owner is told to check the stock.": "باقی مین گودام سے آئے گا، یا مالک کو اسٹاک چیک کرنے کا بتایا جائے گا۔",
  "The owner will be told to check the stock.": "مالک کو اسٹاک چیک کرنے کا بتایا جائے گا۔",
  "Payment 1": "ادائیگی 1", "Payment": "ادائیگی", "Add another payment (another slip or account)": "ایک اور ادائیگی (دوسری سلپ یا اکاؤنٹ)",
  "Enter the amount of every payment.": "ہر ادائیگی کی رقم لکھیں۔", "The other payments are more than the amount paid. Check the amounts.": "دوسری ادائیگیاں کل رقم سے زیادہ ہیں۔ رقمیں چیک کریں۔",
  "item sold without ERP stock. Check the stock": "آئٹم ای آر پی اسٹاک کے بغیر بکا۔ اسٹاک چیک کریں", "items sold without ERP stock. Check the stock": "آئٹمز ای آر پی اسٹاک کے بغیر بکے۔ اسٹاک چیک کریں",
  "Commission paid from cash": "کیش سے دیا گیا کمیشن", "Cash after commission": "کمیشن کے بعد کیش", "Labour / rent / installation": "مزدوری / کرایہ / انسٹالیشن",
  "after": "بعد از", "commission": "کمیشن",
  "ERP stock was short:": "ای آر پی اسٹاک کم تھا:", "taken from": "یہاں سے لیا", "owner will check": "مالک چیک کرے گا",
  "Set cost": "کاسٹ لگائیں", "Cost on bill": "بل پر کاسٹ", "Profit and incentive change at once. The bill and the customer's account stay the same.": "منافع اور انسینٹو فوراً بدل جائیں گے۔ بل اور گاہک کا کھاتہ ویسے ہی رہیں گے۔",
  "Sold for": "کتنے میں بکا", "Cost per unit": "فی یونٹ کاسٹ", "Not on the bill. Product cost filled in.": "بل پر نہیں تھی۔ پروڈکٹ کی کاسٹ ڈال دی۔", "No cost yet": "ابھی کاسٹ نہیں",
  "Commission on this bill": "اس بل کا کمیشن", "Also save as the product's cost price (for next bills)": "پروڈکٹ کی کاسٹ بھی یہی رکھیں (اگلے بلوں کے لیے)",
  "Cost saved on bill": "بل پر کاسٹ محفوظ", "Profit and incentive are updated.": "منافع اور انسینٹو اپڈیٹ ہو گئے۔",
  "Cash & Payments": "کیش اور ادائیگیاں", "All payments": "تمام ادائیگیاں", "Bills and ledger": "بل اور کھاتہ", "Cash in hand": "ہاتھ میں کیش", "With each person": "ہر بندے کے پاس",
  "Every payment from customers: paid with the bill, and received later on the account.": "گاہکوں کی ہر ادائیگی: بل کے ساتھ، اور بعد میں کھاتے میں۔",
  "Total received": "کل وصول", "payments": "ادائیگیاں", "Paid with the bill": "بل کے ساتھ ادا", "Received later (ledger)": "بعد میں وصول (کھاتہ)", "Money back": "رقم واپس",
  "With the bill": "بل کے ساتھ", "Ledger": "کھاتہ", "Search customer, bill, person": "گاہک، بل، بندہ تلاش کریں", "No payments in these dates.": "ان تاریخوں میں کوئی ادائیگی نہیں۔",
  "When": "کب", "For": "کس لیے", "How": "کیسے", "By": "کس نے", "Checked": "چیک ہو گیا", "Problem": "مسئلہ",
  "Payment for bill": "بل کی ادائیگی", "Still to pay": "باقی", "Payment saved for bill": "بل کی ادائیگی محفوظ", "Paid": "ادا",
  "Loading bills...": "بل آ رہے ہیں...", "Unpaid bills": "باقی بل", "For bills": "ان بلوں کے لیے",
  "new item in the last 7 days": "نیا آئٹم (پچھلے 7 دن)", "new items in the last 7 days": "نئے آئٹمز (پچھلے 7 دن)", "set cost / sale price": "کاسٹ / سیل پرائس لگائیں",
  "Search bill no. or customer": "بل نمبر یا گاہک تلاش کریں", "Everyone": "سب", "Unpaid": "باقی", "No cost": "کاسٹ نہیں", "Yesterday": "کل",
  "bill": "بل", "bills": "بل", "No bills match.": "کوئی بل نہیں ملا۔",
  "Hand over cash": "کیش حوالے کریں", "Hand over cash of bill": "بل کا کیش حوالے کریں", "waiting": "انتظار",
  "Who gets the cash? It moves to them when they press Received.": "کیش کس کو دے رہے ہیں؟ جب وہ Received دبائیں گے تب منتقل ہوگا۔",
  "Hand over to": "حوالے کریں:", "of bill": "بل", "handed to": "دیا گیا", "It moves when they press Received.": "Received دبانے پر منتقل ہوگا۔",
  "Hand over": "حوالے کریں", "Hand over cash to": "کیش حوالے کریں:", "Hand over a different amount": "مختلف رقم حوالے کریں", "List": "فہرست", "Cards": "کارڈ",
  "Cash with you from": "آپ کے پاس کیش", "Hand all to": "سب دیں:", "Hand over the cash of": "کیش حوالے کریں:", "to": "کو", "of": "کا",
  "Making the bill...": "بل بن رہا ہے...", "Making the challan...": "چالان بن رہا ہے...", "Making the quotation...": "کوٹیشن بن رہی ہے...",
  "Tap to zoom": "بڑا کرنے کے لیے ٹیپ کریں", "Share": "شیئر", "Download": "ڈاؤن لوڈ", "Print": "پرنٹ", "PDF downloaded. Attach it in WhatsApp.": "پی ڈی ایف ڈاؤن لوڈ ہو گئی۔ واٹس ایپ میں لگا دیں۔",
  "Preview not available. Use Download or Share.": "یہاں نہیں دکھ سکتا۔ ڈاؤن لوڈ یا شیئر کریں۔", "Quotation": "کوٹیشن", "Challan": "چالان",
  "Updating...": "اپڈیٹ ہو رہا ہے...",
  "Goods out": "مال گیا", "Goods in": "مال آیا", "Payment in": "پیمنٹ آئی", "Payment out": "پیمنٹ دی",
  "Goods we gave (bill)": "ہم نے مال دیا (بل)", "Goods we got from them": "ان سے مال آیا", "Money they gave us": "انہوں نے پیسے دیے", "Money we gave them": "ہم نے پیسے دیے",
  "Money they gave us.": "انہوں نے ہمیں پیسے دیے۔", "Money we gave them.": "ہم نے انہیں پیسے دیے۔", "Paid from (account)": "کس اکاؤنٹ سے دیا",
  "Goods out on the account of": "مال گیا، کھاتہ:", "Goods in on the account of": "مال آیا، کھاتہ:", "Enter the amount.": "رقم لکھیں۔",
  "Payment in saved": "پیمنٹ آئی محفوظ", "Payment out saved": "پیمنٹ دی محفوظ",
  "Accounts": "کھاتے", "Customer": "گاہک", "Supplier": "سپلائر", "Both": "دونوں", "All": "سب",
  "They have to pay us": "انہوں نے دینے ہیں", "We have to pay them": "ہم نے دینے ہیں", "Nothing to pay": "کچھ نہیں",
  "Search name or mobile": "نام یا موبائل تلاش کریں", "New account": "نیا کھاتہ", "names are in both lists (customer and supplier)": "نام دونوں فہرستوں میں ہیں (گاہک اور سپلائر)",
  "Make one account": "ایک کھاتہ بنائیں", "Ledger": "کھاتہ", "Goods come from them too (Both)": "ان سے مال بھی آتا ہے (دونوں)",
  "Also a customer: make one account": "یہ گاہک بھی ہے: ایک کھاتہ بنائیں", "Old supplier account": "پرانا سپلائر کھاتہ",
  "Daily Report": "روزانہ رپورٹ", "Profit and sales by item": "منافع اور آئٹم وار سیل", "Incentive Report": "انسینٹو رپورٹ", "Monthly Expenses": "ماہانہ اخراجات",
  "Today's sales, cash and credit, by shop": "آج کی سیل، کیش اور ادھار، دکان وار", "Salary and other monthly costs": "تنخواہ اور دوسرے ماہانہ خرچ", "Each salesman's incentive": "ہر سیلزمین کا انسینٹو",
  "Not saved yet": "ابھی محفوظ نہیں ہوا", "is not saved. What do you want to do?": "محفوظ نہیں ہوا۔ کیا کرنا ہے؟", "Discard": "ختم کریں",
  "This sale": "یہ سیل", "This quotation": "یہ کوٹیشن", "This entry": "یہ اندراج", "This stock entry": "یہ اسٹاک اندراج", "This payment": "یہ ادائیگی",
  "Details": "تفصیل", "Stock card": "اسٹاک کارڈ", "History": "ہسٹری", "In stock": "اسٹاک میں", "Total": "کل",
  "Bought": "خریدا", "Sold": "بیچا", "Moved": "منتقل", "Goods in": "مال آیا", "Stock corrected": "اسٹاک درست کیا", "Opening stock": "ابتدائی اسٹاک",
  "Returned by customer": "گاہک نے واپس کیا", "Returned to supplier": "سپلائر کو واپس", "Bill deleted, back in stock": "بل ختم، اسٹاک واپس", "Purchase cancelled": "خریداری منسوخ",
  "Purchase bill (goods came earlier)": "خریداری بل (مال پہلے آیا)", "Last came": "آخری بار آیا", "Last sold": "آخری بار بکا", "Sale price": "فروخت قیمت", "Cost": "لاگت",
  "In": "آیا", "Out": "گیا", "Moves": "منتقلی", "Bill": "بل", "Purchase": "خریداری", "Salesman": "سیلزمین", "Place": "جگہ", "Due now": "باقی",
  "Rate": "ریٹ", "Qty": "تعداد", "Amount": "رقم", "Nothing yet.": "ابھی کچھ نہیں۔", "Not found in the records.": "ریکارڈ میں نہیں ملا۔",
  "Edit bill": "بل میں تبدیلی", "Edited": "تبدیل کیا", "This bill cannot be edited.": "یہ بل تبدیل نہیں ہو سکتا۔", "Editing bill": "بل میں تبدیلی", "Bill preview": "بل کا نمونہ", "Save changes": "تبدیلی محفوظ کریں",
  "Was": "پہلے", "Now": "اب", "Difference": "فرق", "Why the change? (optional)": "تبدیلی کی وجہ (اختیاری)", "Bill updated": "بل تبدیل ہو گیا",
  "Payments already received stay on this bill.": "جو رقم پہلے مل چکی ہے وہ اسی بل پر رہے گی۔", "Only the difference goes to the account and the stock.": "صرف فرق کھاتے اور اسٹاک میں جائے گا۔",
  "Health check": "صحت چیک", "Mistakes in stock, bills and balances": "اسٹاک، بلوں اور بیلنس کی غلطیاں", "Help": "مدد", "Check again": "دوبارہ چیک کریں", "Fix": "ٹھیک کریں", "fixed": "ٹھیک ہو گئے", "All right": "سب ٹھیک",
  "problem(s) to fix": "مسئلے ٹھیک کرنے ہیں", "No big problems": "کوئی بڑا مسئلہ نہیں", "Everything looks right": "سب کچھ ٹھیک ہے", "Checked at": "چیک کا وقت",
  "Finds mistakes in stock, bills and balances. Tap a line to open it.": "اسٹاک، بلوں اور بیلنس کی غلطیاں دکھاتا ہے۔ کھولنے کے لیے لائن پر ٹیپ کریں۔",
  "Fix these now?": "ابھی ٹھیک کریں؟", "Stock counts and money do not change. Only the records are made to agree.": "اسٹاک اور رقم نہیں بدلتی۔ صرف ریکارڈ آپس میں ملائے جاتے ہیں۔",
  "Stock below zero": "اسٹاک صفر سے کم", "Stock without history": "بغیر ہسٹری کا اسٹاک", "Bill total does not match its items": "بل کا ٹوٹل آئٹمز سے نہیں ملتا",
  "Bills without items": "بغیر آئٹم کے بل", "Bills with items that have no cost (last 90 days)": "بل جن کے آئٹمز کی لاگت نہیں (پچھلے 90 دن)", "Paid more than the bill": "بل سے زیادہ ادائیگی",
  "Credit older than 60 days": "60 دن سے پرانا ادھار", "Account balance differs from its ledger": "کھاتے کا بیلنس لیجر سے مختلف", "Same product name twice": "ایک ہی پروڈکٹ دو بار",
  "Same customer name twice": "ایک ہی گاہک دو بار", "Names in both customer and supplier lists": "نام گاہک اور سپلائر دونوں میں", "Cash handed over, not confirmed for more than a day": "کیش دیا، ایک دن سے تصدیق نہیں ہوئی",
  "How to use each page, in short.": "ہر صفحہ کیسے استعمال کریں، مختصر۔", "Good to know": "یاد رکھیں", "Receive payment": "وصولی", "Send to shop": "دکان کو بھیجیں",
  "Products & stock card": "پروڈکٹس اور اسٹاک کارڈ", "Quotation": "کوٹیشن", "Warranty": "وارنٹی", "Installations": "انسٹالیشن", "New Sale": "نئی سیل", "Bills": "بل", "Cash": "کیش",
  "Choose the customer (or Cash customer), search the item, set quantity and rate, press Next.": "گاہک چنیں (یا کیش گاہک)، آئٹم تلاش کریں، تعداد اور ریٹ لکھیں، Next دبائیں۔",
  "Choose Full paid, Credit or Part paid, then Save Sale.": "پوری ادائیگی، ادھار یا کچھ ادائیگی چنیں، پھر Save Sale دبائیں۔",
  "Press Bill preview to see the bill exactly as it prints, before saving.": "محفوظ کرنے سے پہلے Bill preview دبا کر بل بالکل پرنٹ جیسا دیکھیں۔",
  "Labour, rent or installation: tick it on the payment screen and write the amount.": "لیبر، کرایہ یا انسٹالیشن: ادائیگی والی اسکرین پر ٹک کریں اور رقم لکھیں۔",
  "Every bill you made, newest first. Tap a bill number to open its card.": "آپ کے سب بل، نیا سب سے اوپر۔ بل نمبر پر ٹیپ کریں تو اس کا کارڈ کھلے گا۔",
  "Edit bill: change items, quantity or rate. The bill number and payments stay; only the difference goes to stock and the account.": "بل میں تبدیلی: آئٹم، تعداد یا ریٹ بدلیں۔ بل نمبر اور ادائیگیاں وہی رہتی ہیں؛ صرف فرق اسٹاک اور کھاتے میں جاتا ہے۔",
  "A salesman can edit or delete his own bill only on the same day.": "سیلزمین اپنا بل صرف اسی دن بدل یا ختم کر سکتا ہے۔",
  "Hand over: send the cash of a bill to Anwar or Ahsan with one tap.": "ہینڈ اوور: ایک ٹیپ سے بل کا کیش انور یا احسن کو دیں۔",
  "Cash page → Receive Payment. Choose the customer, tick the bills being paid, write the amount, Save.": "کیش صفحہ ← وصولی۔ گاہک چنیں، جن بلوں کی ادائیگی ہے ان پر ٹک کریں، رقم لکھیں، Save۔",
  "Online payment: choose the bank and attach the slip photo.": "آن لائن ادائیگی: بینک چنیں اور سلپ کی تصویر لگائیں۔",
  "Shows the cash with you now. Hand it to the cash keeper; he presses Received to confirm.": "ابھی آپ کے پاس کتنا کیش ہے۔ کیش کیپر کو دیں؛ وہ Received دبا کر تصدیق کرے گا۔",
  "Cash handed to you shows on top: press Received or Not received.": "جو کیش آپ کو دیا گیا وہ اوپر نظر آئے گا: Received یا Not received دبائیں۔",
  "Goods coming in: from a supplier, from our own shop (Hamza / GM), or a new item.": "آنے والا مال: سپلائر سے، اپنی دکان (حمزہ / جی ایم) سے، یا نیا آئٹم۔",
  "From our own shop it is a move: it leaves that shop and comes here, nothing is counted twice.": "اپنی دکان سے آئے تو یہ منتقلی ہے: وہاں سے کم، یہاں زیادہ، کچھ دو بار نہیں گنا جاتا۔",
  "Choose the shop, add the items and quantities, Save. A challan is made for the shop.": "دکان چنیں، آئٹم اور تعداد لکھیں، Save۔ دکان کے لیے چالان بن جاتا ہے۔",
  "Customers and suppliers in one list. Green: they have to pay us. Red: we have to pay them.": "گاہک اور سپلائر ایک فہرست میں۔ ہرا: انہوں نے دینے ہیں۔ لال: ہم نے دینے ہیں۔",
  "Tap a name: Goods out, Goods in, Payment in, Payment out, and the Ledger.": "نام پر ٹیپ کریں: مال گیا، مال آیا، رقم آئی، رقم گئی، اور کھاتہ۔",
  "Someone we buy from and sell to: make it one account (Both), so there is one ledger.": "جس سے خریدتے بھی ہیں اور بیچتے بھی: ایک کھاتہ (دونوں) بنائیں تاکہ ایک ہی لیجر ہو۔",
  "Tap any product name for its stock card: stock at every place and the full history.": "کسی بھی پروڈکٹ کے نام پر ٹیپ کریں: ہر جگہ کا اسٹاک اور پوری ہسٹری۔",
  "History shows when it came, from whom, when it went, to whom, with the bill or challan number.": "ہسٹری میں: کب آیا، کس سے، کب گیا، کس کو، بل یا چالان نمبر کے ساتھ۔",
  "Make a price offer for a customer. It does not change stock or accounts. Later it can become a sale.": "گاہک کے لیے قیمت کی پیشکش۔ اسٹاک یا کھاتہ نہیں بدلتا۔ بعد میں سیل بن سکتی ہے۔",
  "Search by serial number or mobile to see the warranty and add a claim.": "سیریل نمبر یا موبائل سے تلاش کریں، وارنٹی دیکھیں اور کلیم درج کریں۔",
  "Installation jobs: who, where, which technician, and the status.": "انسٹالیشن کے کام: کس کا، کہاں، کون سا ٹیکنیشن، اور کیا حال ہے۔",
  "Daily Report, profit by item, incentive and monthly expenses, all on one page.": "روزانہ رپورٹ، آئٹم وار منافع، انسینٹو اور ماہانہ اخراجات، سب ایک صفحے پر۔",
  "Run it once a week. It shows stock below zero, bills that do not add up, balances that differ from the ledger, and cash not confirmed.": "ہفتے میں ایک بار چلائیں۔ یہ صفر سے کم اسٹاک، غلط ٹوٹل والے بل، لیجر سے مختلف بیلنس اور بغیر تصدیق کیش دکھاتا ہے۔",
  "Tap a line to open it. Fix only makes records agree; it never changes stock or money.": "لائن پر ٹیپ کر کے کھولیں۔ Fix صرف ریکارڈ ملاتا ہے؛ اسٹاک یا رقم کبھی نہیں بدلتا۔",
  "Tap any bill number, product or name to open its card.": "کسی بھی بل نمبر، پروڈکٹ یا نام پر ٹیپ کریں تو اس کا کارڈ کھلے گا۔",
  "Pressed Back by mistake? The app asks: Save, Discard or Cancel.": "غلطی سے Back دب گیا؟ ایپ پوچھے گی: Save، Discard یا Cancel۔",
  "EN / اردو at the top changes the language.": "اوپر EN / اردو سے زبان بدلیں۔",
  "Structure": "اسٹرکچر", "Structure (panel stand)": "اسٹرکچر (پینل اسٹینڈ)", "Type": "قسم", "Walkway": "واک وے", "Height": "اونچائی", "Price by": "قیمت",
  "Per panel": "فی پینل", "Per watt": "فی واٹ", "Panels": "پینل", "Watts": "واٹ", "Custom": "کسٹم", "Describe the structure": "اسٹرکچر کی تفصیل لکھیں",
  "From the rate table. You can change it.": "ریٹ ٹیبل سے۔ آپ بدل سکتے ہیں۔", "In this bill": "اس بل میں", "Structure rates": "اسٹرکچر ریٹ",
  "Fabricator cost for this structure": "اس اسٹرکچر کی فیبریکیٹر لاگت", "Rate per panel": "ریٹ فی پینل", "Rate per watt": "ریٹ فی واٹ",
  "Cost per panel": "لاگت فی پینل", "Cost per watt": "لاگت فی واٹ", "Add row": "لائن شامل کریں",
  "Structure: tick Structure and write the total sale amount. The owner adds the fabricator cost later (Bills → Set cost).": "اسٹرکچر: اسٹرکچر پر ٹک کریں اور کل سیل رقم لکھیں۔ فیبریکیٹر کی لاگت مالک بعد میں ڈالے گا (بل ← Set cost)۔",
  "Structure cost due": "اسٹرکچر لاگت باقی", "Fabricator cost not entered yet. Profit and incentive of this structure will count after it is entered.": "فیبریکیٹر لاگت ابھی نہیں ڈالی۔ اس اسٹرکچر کا منافع اور انسینٹو لاگت ڈالنے کے بعد گنا جائے گا۔",
  "Given by": "دینے والا", "Paid on bill": "بل پر ادائیگی", "Opening cash": "ابتدائی کیش", "Write the amount.": "رقم لکھیں۔",
  "My cash": "میرا کیش", "Received": "مل گیا", "Not received": "نہیں ملا", "All OK": "سب ٹھیک", "OK": "ٹھیک", "Checked": "چیک کر لیا", "Seen": "دیکھ لیا",
  "No bill needed": "بل کی ضرورت نہیں", "View slip": "سلپ دیکھیں", "What was the problem?": "کیا مسئلہ تھا؟", "Done. Nothing left here.": "ہو گیا۔ یہاں کچھ باقی نہیں۔",
  "Payments to check": "چیک کرنے والی پیمنٹس", "Cash handed to you": "آپ کو دیا گیا کیش", "Sold without ERP stock": "ای آر پی اسٹاک کے بغیر بکا",
  "Goods In waiting for a bill": "مال آیا، بل باقی", "Low stock": "کم اسٹاک", "Stock now": "اب اسٹاک", "Minimum": "کم از کم",
  "Correct the stock in Products & Stock if the count is wrong, then press Checked.": "اگر گنتی غلط ہے تو Products & Stock میں اسٹاک ٹھیک کریں، پھر Checked دبائیں۔",
  "Seen hides it until the stock changes.": "Seen دبانے سے یہ تب تک چھپا رہے گا جب تک اسٹاک نہ بدلے۔",
  "Cash in hand (opening / correction)": "ہاتھ میں کیش (ابتدائی / درستی)", "Add the cash already kept at a shop, so the cash count matches.": "جو کیش پہلے سے دکان پر رکھا ہے وہ شامل کریں، تاکہ کیش کی گنتی ملے۔",
  "Person": "بندہ", "Add cash": "کیش شامل کریں", "Take out": "کیش نکالیں", "Cash now": "ابھی کیش", "Recent": "حالیہ",
  "Save anyway?": "پھر بھی محفوظ کریں؟", "Write the invoice number.": "انوائس نمبر لکھیں۔", "Write the invoice total.": "انوائس کا ٹوٹل لکھیں۔",
  "The PDF reader files are missing on GitHub: pdf.min.mjs and pdf.worker.min.mjs. Upload them next to app.js.": "GitHub پر PDF پڑھنے والی فائلیں نہیں ہیں: pdf.min.mjs اور pdf.worker.min.mjs۔ انہیں app.js کے ساتھ اپ لوڈ کریں۔",
  "Old date: the payment goes in its place in the ledger.": "پرانی تاریخ: ادائیگی لیجر میں اپنی تاریخ پر آئے گی۔", "The date cannot be in the future.": "تاریخ آگے کی نہیں ہو سکتی۔",
  "Download ledger": "لیجر ڈاؤن لوڈ", "Update ledger": "لیجر اپڈیٹ کریں", "Reading the file...": "فائل پڑھی جا رہی ہے...",
  "Lines": "لائنیں", "Total debit": "کل ڈیبٹ", "Total credit": "کل کریڈٹ", "Balance after upload": "اپ لوڈ کے بعد بیلنس", "Balance in the file": "فائل میں بیلنس",
  "Balance in the ERP now": "ای آر پی میں ابھی بیلنس", "Debit and Credit are the other way round in this file": "اس فائل میں ڈیبٹ اور کریڈٹ الٹے ہیں", "Sheet": "شیٹ",
  "This replaces the whole ledger of this account in the ERP. Stock, bills and payments do not change. The old lines are kept as a backup.": "یہ اس کھاتے کا پورا لیجر ای آر پی میں بدل دے گا۔ اسٹاک، بل اور ادائیگیاں نہیں بدلیں گی۔ پرانی لائنیں بیک اپ میں رہیں گی۔",
  "Replace ledger": "لیجر بدلیں", "Ledger updated": "لیجر اپڈیٹ ہو گیا", "No Date / Debit / Credit columns found in this sheet.": "اس شیٹ میں Date / Debit / Credit کالم نہیں ملے۔",
  "matches": "ملتا ہے", "does not match": "نہیں ملتا", "Opening balance": "ابتدائی بیلنس",
  "Merge with another account": "دوسرے کھاتے کے ساتھ ملائیں", "Merge accounts": "کھاتے ملائیں", "Choose the other account": "دوسرا کھاتہ چنیں",
  "Keep this name": "یہ نام رکھیں", "Balance after merge": "ملانے کے بعد بیلنس", "Merge": "ملائیں", "Merged": "مل گئے",
  "Bills, payments and ledger lines of the other account move to the one you keep. The other account is closed. Stock does not change.": "دوسرے کھاتے کے بل، ادائیگیاں اور لیجر لائنیں رکھے گئے کھاتے میں چلی جائیں گی۔ دوسرا کھاتہ بند ہو جائے گا۔ اسٹاک نہیں بدلے گا۔",
  "Select all": "سب چنیں", "OK selected": "چنی ہوئی ٹھیک", "Tick the payments first.": "پہلے پیمنٹس پر ٹک لگائیں۔", "payments checked.": "پیمنٹس چیک ہو گئیں۔",
  "Upload invoice": "انوائس اپ لوڈ کریں", "Supplier's PDF invoice": "سپلائر کی PDF انوائس", "Supplier invoice": "سپلائر انوائس", "Reading the invoice...": "انوائس پڑھی جا رہی ہے...",
  "Invoice no.": "انوائس نمبر", "Invoice date": "انوائس کی تاریخ", "Invoice total": "انوائس کا ٹوٹل", "Ledger only": "صرف کھاتہ", "Stock + Ledger": "اسٹاک + کھاتہ",
  "Old invoice: only the account is updated. Stock does not change.": "پرانی انوائس: صرف کھاتہ اپڈیٹ ہوگا۔ اسٹاک نہیں بدلے گا۔",
  "Goods come into stock and the account is updated (a purchase bill is made).": "مال اسٹاک میں آئے گا اور کھاتہ اپڈیٹ ہوگا (خریداری بل بنے گا)۔",
  "Items add up to": "آئٹمز کا ٹوٹل", "does not match the invoice total": "انوائس کے ٹوٹل سے نہیں ملتا", "New product": "نیا پروڈکٹ", "Add item": "آئٹم شامل کریں",
  "This invoice format is not known yet. Write the number, date and total yourself.": "یہ انوائس فارمیٹ ابھی معلوم نہیں۔ نمبر، تاریخ اور ٹوٹل خود لکھیں۔",
  "Only PDF invoices can be read.": "صرف PDF انوائس پڑھی جا سکتی ہے۔", "Invoice saved": "انوائس محفوظ", "Balance now": "اب بیلنس", "Already entered": "پہلے سے درج",
  "Receive Payment": "وصولی", "Select customer": "گاہک منتخب کریں", "Or search name or mobile number": "یا نام / موبائل سے تلاش کریں", "Cash": "کیش", "Quotation": "کوٹیشن", "Warranty": "وارنٹی", "Installations": "انسٹالیشن", "Daily Report": "روزانہ رپورٹ",
  "Lowest rate": "کم از کم ریٹ", "Serial number": "سیریل نمبر", "one per line or comma": "ہر ایک الگ لائن یا کاما سے", "months warranty": "ماہ وارنٹی",
  "Packages": "پیکج", "Save these items as a package": "یہ آئٹمز پیکج بنا کر محفوظ کریں", "Not in stock": "اسٹاک میں نہیں",
  "Rate is below the minimum for": "ریٹ کم از کم سے کم ہے", "waiting": "انتظار میں", "problem": "مسئلہ", "Saved on this phone": "فون میں محفوظ",
  "No internet": "انٹرنیٹ نہیں ہے", "This entry is saved on the phone and will be sent by itself when the internet is back. Do not enter it again.": "یہ اندراج فون میں محفوظ ہے، انٹرنیٹ آتے ہی خود چلا جائے گا۔ دوبارہ نہ کریں۔",
  "Send now": "ابھی بھیجیں", "Nothing waiting.": "کچھ باقی نہیں۔", "saved entries were sent.": "محفوظ اندراج بھیج دیے گئے۔",
  "Search name or mobile number": "نام یا موبائل نمبر تلاش کریں", "Due": "باقی", "No customer found": "کوئی گاہک نہیں ملا", "Search the customer above.": "اوپر گاہک تلاش کریں۔",
  "Payment from": "وصولی از", "Amount received": "وصول رقم", "Note": "نوٹ", "Save": "محفوظ کریں", "Saving...": "محفوظ ہو رہا ہے...",
  "Enter the amount received.": "وصول رقم لکھیں۔", "Payment saved": "وصولی محفوظ", "Received from": "وصول از", "New balance": "نیا بیلنس",
  "Send receipt on WhatsApp": "واٹس ایپ پر رسید بھیجیں", "New payment": "نئی وصولی", "Online": "آن لائن", "Cheque": "چیک",
  "Ledger entry (any date)": "لیجر انٹری (کوئی بھی تاریخ)", "Edit name / mobile": "نام / موبائل تبدیل کریں", "Change this line": "یہ لائن تبدیل کریں",
  "Change ledger line": "لیجر لائن تبدیل کریں", "New ledger entry": "نئی لیجر انٹری", "Only the ledger changes. Stock and cash stay the same.": "صرف لیجر بدلے گا۔ اسٹاک اور کیش ویسے ہی رہیں گے۔",
  "This line came from a bill or payment. Changing it here changes the ledger only, not the bill or payment.": "یہ لائن بل یا پیمنٹ سے آئی ہے۔ یہاں تبدیلی سے صرف لیجر بدلے گا، بل یا پیمنٹ نہیں۔",
  "Particular": "تفصیل", "Ref / Bill no.": "حوالہ / بل نمبر", "e.g. Old balance, Bill 125, Cash received": "مثلاً پرانا بیلنس، بل 125، کیش وصول",
  "They owe us more (bill, old balance)": "ان کے ذمے بڑھے (بل، پرانا بیلنس)", "They owe us less (payment, return)": "ان کے ذمے کم ہو (پیمنٹ، واپسی)",
  "We owe them less (payment, return)": "ہمارے ذمے کم ہو (پیمنٹ، واپسی)", "We owe them more (bill, old balance)": "ہمارے ذمے بڑھے (بل، پرانا بیلنس)",
  "Remove line": "لائن ہٹائیں", "Remove this line from the ledger?": "یہ لائن لیجر سے ہٹا دیں؟", "Ledger entry saved": "لیجر انٹری محفوظ", "Line removed": "لائن ہٹا دی", "Line changed": "لائن تبدیل ہو گئی",
  "Ledger line not found.": "لیجر لائن نہیں ملی۔", "Choose the date.": "تاریخ منتخب کریں۔", "Write the name.": "نام لکھیں۔", "Mobile": "موبائل",
  "Old bills and the ledger stay on this account; they show the new name.": "پرانے بل اور لیجر اسی اکاؤنٹ پر رہیں گے، نیا نام نظر آئے گا۔",
  "Cash of my bills": "میرے بلوں کا کیش", "Hand over all bills": "تمام بلوں کا کیش جمع کرائیں", "Or hand over an amount": "یا کوئی رقم جمع کرائیں", "Hand over an amount": "رقم جمع کرائیں",
  "Hand over all": "سارا جمع کرائیں", "Part amount": "کچھ رقم", "Hand over part": "کچھ رقم جمع کرائیں",
  "Cash in hand": "ہاتھ میں کیش", "Received today": "آج وصول", "Handed over today": "آج جمع کرایا", "Hand over cash": "کیش جمع کرائیں", "Hand over": "جمع کرائیں",
  "Amount": "رقم", "Recent": "حالیہ", "No cash yet.": "ابھی کوئی کیش نہیں۔", "Handover saved.": "جمع کرانا محفوظ ہو گیا۔",
  "Cash from sales and payments received at this shop.": "اس دکان پر سیل اور وصولی کا کیش۔", "Example: given to owner": "مثلاً: مالک کو دیا",
  "Search by serial number, mobile number or bill number.": "سیریل، موبائل یا بل نمبر سے تلاش کریں۔", "Search": "تلاش", "In warranty": "وارنٹی میں",
  "days left": "دن باقی", "Expired": "ختم", "No warranty": "وارنٹی نہیں", "New claim": "نیا کلیم", "Warranty card": "وارنٹی کارڈ", "Nothing found.": "کچھ نہیں ملا۔",
  "What is the problem?": "کیا مسئلہ ہے؟", "Claim saved.": "کلیم محفوظ ہو گیا۔", "Saved.": "محفوظ ہو گیا۔",
  "Quotation for": "کوٹیشن برائے", "Valid for (days)": "کتنے دن کے لیے", "Save Quotation": "کوٹیشن محفوظ کریں", "Quotation saved": "کوٹیشن محفوظ",
  "Make sale": "سیل بنائیں", "New Quotation": "نئی کوٹیشن", "In this quotation": "اس کوٹیشن میں", "New customer (name or mobile)": "نیا گاہک (نام یا موبائل)",
  "Who goes where, and is the work done?": "کون کہاں جائے گا، اور کام ہوا یا نہیں؟", "New job": "نیا کام", "Mobile": "موبائل", "Address": "پتہ", "Work": "کام",
  "Technician": "ٹیکنیشن", "Status": "اسٹیٹس", "Pending": "باقی", "On the way": "راستے میں", "Done": "ہو گیا", "Cancelled": "منسوخ", "Edit": "ترمیم",
  "No jobs yet.": "ابھی کوئی کام نہیں۔", "My Bills": "میرے بل", "Bills": "بل", "Customer": "گاہک", "Total": "کل",
  "Workspace": "ورک اسپیس", "Transactions": "لین دین", "Reports": "رپورٹس", "System": "سسٹم",
  "Dashboard": "ڈیش بورڈ", "Products": "پروڈکٹس", "Products & Stock": "پروڈکٹس اور اسٹاک", "Stock History": "اسٹاک ہسٹری", "Stock": "اسٹاک", "Customers": "گاہک", "Suppliers": "سپلائرز",
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
  "Install app": "ایپ انسٹال کریں", "A new version of the app is ready.": "ایپ کا نیا ورژن تیار ہے۔", "Update": "اپڈیٹ کریں", "Updating...": "اپڈیٹ ہو رہی ہے...", "Search the customer above. Customers you sell to often will show here.": "اوپر گاہک تلاش کریں۔ جن گاہکوں کو آپ زیادہ بیچتے ہیں وہ یہاں نظر آئیں گے۔",
  "Search the supplier above. Suppliers you buy from often will show here.": "اوپر سپلائر تلاش کریں۔ جن سپلائرز سے آپ زیادہ خریدتے ہیں وہ یہاں نظر آئیں گے۔", "Send to shop": "دکان کو مال بھیجیں", "Sending to": "مال جا رہا ہے:", "Main godam": "مین گودام",
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
  else if (state.page === "help") renderHelp();
  else if (state.page === "reportshub") renderReportsHub();
  else if (state.page === "accounts" && acc.data) renderAccounts();
  else if (state.page === "health" && state.health) renderHealth();
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
  ["quicksale", "Sale"], ["billdelete", "Delete any bill (others can delete only their own bill, the same day)"], ["stockin", "Goods In: receive goods (no rates, owner/manager add rates later)"], ["quickpurchase", "Goods In with rates and payment (owner / manager only)"], ["inward", "Send goods to shops (main shop staff)"], ["mystock", "My shop stock (view only)"], ["receivepay", "Receive payment from customers"], ["cash", "Cash in hand and handover"], ["cashkeep", "Cash keeper (others can hand cash to this person)"],
  ["quotes", "Quotations"], ["dashboard", "Dashboard"], ["products", "Products and stock"],
  ["customers", "Customers"], ["suppliers", "Suppliers"], ["sales", "Sales list, returns, full sale form"],
  ["purchases", "Purchases list, returns, full purchase form"], ["payments", "Payments"], ["expenses", "Expenses"],
  ["incentives", "Incentive report"], ["reports", "Reports"]
];

// Which module opens each page. A page opens if the user has any of them.
const PAGE_MODULES = {
  accounts: ["customers", "suppliers"], help: [], reportshub: ["daily", "reports", "monthexp"],
  home: [], dashboard: ["dashboard"], quicksale: ["quicksale", "sales"], quickpurchase: ["quickpurchase", "purchases"],
  bills: ["quicksale", "quickpurchase", "inward", "shopreturn", "stockin", "mystock", "sales", "purchases", "quotes"], inward: ["inward"], mystock: ["mystock"], goodsin: ["stockin", "quickpurchase", "shopreturn"],
  quote: ["quotes"], receive: ["receivepay"], cash: ["cash", "cashkeep", "quickpurchase"], daily: ["reports"], warranty: ["warranty"], jobs: ["jobs"],
  products: ["products"], stock: ["products"], customers: ["customers"], suppliers: ["suppliers"],
  ledger: ["customers", "suppliers", "payments"], partyledger: ["customers", "suppliers", "payments"], sales: ["sales"], purchases: ["purchases"], payments: ["payments"],
  expenses: ["expenses"], monthexp: ["admin"], updates: ["admin"], stockin: ["stockin", "shopreturn"], incentives: ["incentives"], reports: ["reports"], settings: ["admin"], import: ["admin"]
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

// Switched off to keep the ERP simple (their data stays in the sheets).
const REMOVED_PAGES = ["warranty", "jobs", "health"];

function canOpen(page) {
  if (REMOVED_PAGES.indexOf(page) !== -1) return false;
  if (!state.user) return true;                 // open mode (no owner account yet)
  if (state.user.admin) return true;
  if (isShopUser() && SHOP_BLOCKED_PAGES.indexOf(page) !== -1) return false;
  if (page === "mystock" && !isShopUser()) return false;          // My Stock: the shop's own users (and the owner)
  const need = PAGE_MODULES[page];
  if (!need) return false;
  if (!need.length) return true;
  return need.some(function (m) { return state.user.modules.indexOf(m) !== -1; });
}

function homePage() {
  return canOpen("dashboard") ? "dashboard" : "home";
}

// After sign-in, the main pages' data is fetched quietly, one by one, so they open at once later.
let MEMO_WARMED = "";
function memoWarm() {
  const u = state.user ? state.user.userId : "";
  if (!u || MEMO_WARMED === u) return;
  MEMO_WARMED = u;
  const jobs = [];
  if (canOpen("dashboard")) jobs.push(["apiDashboard"]);
  if (canOpen("bills")) jobs.push(["mybills", { days: 60 }]);
  if (canOpen("cash")) jobs.push(canSeeMoneyIn() ? ["moneyin", { from: localDay(), to: localDay() }] : ["cashstatus", {}]);
  if (canOpen("products")) { jobs.push(["warehouses"]); jobs.push(["apiProducts"]); }
  let i = 0;
  const next = function () {
    if (i >= jobs.length || !state.user || state.user.userId !== u) return;
    const j = jobs[i++];
    if (MEMO[memoKey(String(API_ACTIONS[j[0]] || j[0]).toLowerCase(), j.slice(1))]) { next(); return; }
    call.apply(null, j).catch(function () { /* later */ }).finally(function () { setTimeout(next, 800); });
  };
  setTimeout(next, 2500);
}

function applyPermissions() {
  setTimeout(memoWarm, 0);
  // For shop staff, Inward is their purchase (from the owner only).
  const inNav = document.querySelector('.nav[data-page="inward"] span:not(.nav-icon)');
  const incNav = document.querySelector('.nav[data-page="incentives"] span:not(.nav-icon)');
  if (incNav) { incNav.dataset.en = state.user && !isAdminUser() ? "My Incentive" : "Incentive Report"; incNav.textContent = t(incNav.dataset.en); }
  const homeNav = document.querySelector('.nav[data-page="dashboard"] span:not(.nav-icon)');
  if (homeNav) { homeNav.dataset.en = "Home"; homeNav.textContent = t("Home"); }
  const cashNav = document.querySelector('.nav[data-page="cash"] span:not(.nav-icon)');
  if (cashNav) { cashNav.dataset.en = canSeeMoneyIn() ? "Cash & Payments" : "Cash"; cashNav.textContent = t(cashNav.dataset.en); }
  if (inNav) { inNav.dataset.en = canSendToShop() || !canBringBack() ? "Send to shop" : "Bring back from shop"; inNav.textContent = t(inNav.dataset.en); }
  // A short menu: each person sees only the few things they use. Everything else is a button inside a page
  // (Receive Payment in Cash / Bills / Accounts; Daily Report, Incentive, Monthly Expenses in Reports; Updates in the bell).
  const INSIDE = ["stock", "stockin", "quickpurchase", "receive", "updates", "daily", "reports", "monthexp"];
  const MORE = ["sales", "purchases", "payments", "expenses", "customers", "suppliers", "import"];
  let moreAny = false;
  document.querySelectorAll(".nav[data-page]").forEach(function (b) {
    const pg = b.dataset.page;
    let show = canOpen(pg);
    if (pg === "home") show = !canOpen("dashboard");
    if (INSIDE.indexOf(pg) !== -1) show = false;
    if (pg === "incentives") show = show && !isAdminUser();                 // the owner finds it in Reports
    if (pg === "reportshub") show = canOpen("daily") || canOpen("reports") || canOpen("monthexp") || (isAdminUser() && canOpen("incentives"));
    if (MORE.indexOf(pg) !== -1) { show = show && isAdminUser(); if (show) moreAny = true; }
    b.style.display = show ? "" : "none";
  });
  const moreT = document.getElementById("navMoreToggle");
  if (moreT) {
    moreT.style.display = moreAny ? "" : "none";
    if (!moreT.dataset.wired) {
      moreT.dataset.wired = "1";
      moreT.addEventListener("click", function () { const m = document.getElementById("navMore"); m.hidden = !m.hidden; moreT.classList.toggle("open", !m.hidden); });
    }
  }
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
  memoClearAll();
  try { Object.keys(PC_CACHE).forEach(function (k) { delete PC_CACHE[k]; }); Object.keys(INVOICE_CACHE).forEach(function (k) { delete INVOICE_CACHE[k]; }); qsReset(); qs.ready = false; sin.items = []; rp.customer = null; rp.amount = ""; acc.data = null; } catch (e) { /* nothing open */ }
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
    '<div class="login-hero"><img src="login-banner.jpg" alt=""></div>' +
    '<div class="login-top"><div class="brand-mark"><img src="brand-mark.png" alt="Arham Electronics"></div>' + langSwitchHtml() + "</div>" +
    "<h1>" + escapeHtml(state.company || "Arham Electronics") + "</h1>" +
    '<p class="login-tag">Powering a Brighter Tomorrow</p>' +
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
      showPage(startPageFromUrl());
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
        const before = JSON.stringify([saved.user.modules, saved.user.shopId, saved.user.admin]);
        state.user = me;
        setSession({ token: saved.token, user: me });
        applyPermissions();
        // The owner changed this user's access since the last sign-in: redraw with the new access.
        if (before !== JSON.stringify([me.modules, me.shopId, me.admin])) showPage(canOpen(state.page) ? state.page : homePage());
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

// Links from phone shortcuts: ?page=cash opens a page, &open=pay|cash|short|goodsin|low opens that card on top.
function startPageFromUrl() {
  try {
    const q = new URLSearchParams(location.search);
    const want = q.get("page"), open = q.get("open");
    if (open && ["pay", "cash", "short", "goodsin", "low"].indexOf(open) !== -1) {
      setTimeout(function () { if (state.user) openAttention(open); }, 1200);
    }
    if (want || open) {
      try { history.replaceState({ page: "" }, "", location.pathname); } catch (e) { /* keep the link */ }   // a refresh opens normally
    }
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
  if (canOpen("goodsin")) {
    out.push('<button type="button" class="big-btn big-purchase" onclick="showPage(\'goodsin\')"><i aria-hidden="true">⇩</i><span><b>' +
      escapeHtml(t("Goods In")) + "</b><small>" + escapeHtml(t("From a supplier or our shop")) + "</small></span></button>");
  }
  if (canOpen("inward") && !isShopUser()) {
    out.push('<button type="button" class="big-btn big-inward" onclick="showPage(\'inward\')"><i aria-hidden="true">⇨</i><span><b>' +
      escapeHtml(t("Send to shop")) + "</b><small>" + escapeHtml(t("Goods from main shop to Hamza / GM")) + "</small></span></button>");
  }
  return out.length ? '<div class="big-actions' + (getLang() === "ur" ? " ur" : "") + '"' + (getLang() === "ur" ? ' dir="rtl"' : "") + ">" + out.join("") + "</div>" : "";
}

function renderHome() {
  // Style 3 (app launcher): one big Sale button, then round buttons for everything else the user may open.
  const ur = getLang() === "ur";
  const keys = [
    ["goodsin", "⇩", "Goods In", "nv", "big-purchase"], ["inward", "⇨", "Send to shop", "gr", "big-inward"],
    ["receive", "₨", "Receive Payment", "", ""], ["cash", "◍", "Cash", "", ""], ["mystock", "▦", "My Stock", "", ""],
    ["quote", "✎", "Quotation", "", ""], ["warranty", "✓", "Warranty", "", ""], ["jobs", "⚒", "Installations", "", ""],
    ["bills", "▤", isAdminUser() ? "Bills" : "My Bills", "", ""], ["accounts", "♙", "Accounts", "", ""], ["products", "▦", "Products", "", ""],
    ["reportshub", "◷", "Reports", "", ""]
  ].filter(function (x) { return canOpen(x[0]) && !(x[0] === "inward" && isShopUser()); });
  const hero = canOpen("quicksale")
    ? '<button type="button" class="hm-hero big-sale" onclick="showPage(\'quicksale\')"><span class="hm-ic" aria-hidden="true">↗</span><span><b>' + escapeHtml(t("Sale")) +
      "</b><small>" + escapeHtml(t("Sell to a customer")) + "</small></span></button>"
    : "";
  contentElement().innerHTML = '<div class="content home-page hm"' + (ur ? ' dir="rtl"' : "") + ">" +
    '<p class="home-hello">' + escapeHtml(t("Hello")) + (state.user ? ", " + escapeHtml(state.user.name) : "") + "</p>" +
    "<h2>" + escapeHtml(t("What do you want to do?")) + "</h2>" + hero +
    (keys.length ? '<div class="hm-pad">' + keys.map(function (x) {
      return '<button type="button" class="hm-k ' + x[4] + '" onclick="showPage(\'' + x[0] + '\')"><span class="hm-ic ' + x[3] + '" aria-hidden="true">' + x[1] + "</span><span>" + escapeHtml(t(x[2])) + "</span></button>";
    }).join("") + "</div>" : "") +
    "</div>";
  updatePageTitle("home");
  qsPrefetch();
  homeCashAlert();
}

// On the home screen: "Rs. 25,000 from Anwar is waiting for you to confirm".
async function homeCashAlert() {
  if (!canOpen("cash")) return;
  try {
    const c = await cashBell();
    const list = (c && c.list) || [];
    const home = document.querySelector(".home-page");
    if (!list.length || !home || state.page !== "home") return;
    const total = list.reduce(function (a, e) { return a + e.amount; }, 0);
    const div = document.createElement("button");
    div.type = "button"; div.className = "home-cash-alert";
    div.innerHTML = "<b dir=\"ltr\">" + qsMoney(total) + "</b> " + escapeHtml(t("cash handed to you. Tap to confirm.")) + " <small>" + escapeHtml(list.map(function (e) { return e.fromName; }).join(", ")) + "</small>";
    div.addEventListener("click", function () { showPage("cash"); });
    home.insertBefore(div, home.querySelector("h2"));
  } catch (e) { /* offline */ }
}


/* ============================================================
   QUICK SALE / QUICK PURCHASE (mobile)
   Step 1 party, step 2 items, step 3 payment, step 4 done.
   ============================================================ */
const qs = { mode: "sale", data: null, step: 1, customer: null, walkInOpen: false, items: [], custQuery: "", itemQuery: "",
  pay: "full", paid: "", method: "cash", discount: "", note: "", more: false, salespersonId: "", whId: "", saving: false, result: null };

function isBuy() { return qs.mode === "purchase"; }
function isInward() { return qs.mode === "inward"; }
function isQuote() { return qs.mode === "quote"; }
function qsPage(mode) { return mode === "purchase" ? "quickpurchase" : (mode === "inward" ? "inward" : (mode === "quote" ? "quote" : "quicksale")); }
function qsDataAction(mode) { return mode === "purchase" ? "quickpurchasedata" : (mode === "inward" ? "inwarddata" : "quicksaledata"); }

function qsReset() {
  qs.clientRef = ""; qs.quoteId = ""; qs.stockInId = ""; qs.cashTo = ""; qs.charges = {}; qs.payAccount = ""; qs.payRef = ""; qs.slip = null;
  qs.step = 1; qs.customer = null; qs.walkInOpen = false; qs.items = []; qs.custQuery = ""; qs.itemQuery = "";
  qs.pay = "full"; qs.paid = ""; qs.method = "cash"; qs.discount = ""; qs.note = ""; qs.more = false;
  qs.comm = false; qs.commission = ""; qs.commissionTo = ""; qs.commissionCash = true; qs.morePays = [];
  qs.structure = null;
  qs.saving = false; qs.result = null; qs.whId = ""; qs.editId = ""; qs.edit = null; qs.editReason = "";
  try { qs.salespersonId = localStorage.getItem("qsSalesperson") || ""; } catch (e) { qs.salespersonId = ""; }
}

function loadQuickSale(force) { return loadQuick("sale", force); }
function loadQuickPurchase(force) { return loadQuick("purchase", force); }

async function loadQuick(mode, force) {
  if (qs.mode !== mode) { qs.mode = mode; qs.data = null; qs.ready = false; }
  if (!qs.ready || qs.step === 4) { qsReset(); qs.ready = true; }
  if (mode !== "purchase" && Date.now() - (state.packagesAt || 0) > 300000) {
    state.packagesAt = Date.now();
    loadPackages().then(function () { if (state.page === qsPage(qs.mode) && qs.step === 2) renderQuick(); });
  }
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
  return Math.max(0, qsSubtotal() + qsChargesTotal() + qsStructAmount() - qsNum(qs.discount));
}

/* ---------- Extra charges on a sale: labour, rent, installation (tick = on the bill) ---------- */
const QS_CHARGES = [["labour", "Labour"], ["rent", "Rent"], ["installation", "Installation"]];
function qsChargeList() {
  if (isBuy() || isInward() || isQuote()) return [];
  const c = qs.charges || {};
  return QS_CHARGES.filter(function (x) { return c[x[0]] && c[x[0]].on && qsNum(c[x[0]].amount) > 0; })
    .map(function (x) { return { name: x[1], amount: qsNum(c[x[0]].amount) }; });
}
function qsChargesTotal() { return qsChargeList().reduce(function (a, x) { return a + x.amount; }, 0); }

function qsChargesHtml() {
  if (isBuy() || isInward() || isQuote()) return "";
  return qsChargesOnlyHtml();
}
function qsChargesOnlyHtml() {
  const c = qs.charges || {};
  return '<div class="qs-charges"><small>' + escapeHtml(t("Extra charges on this bill")) + "</small>" + QS_CHARGES.map(function (x) {
    const on = !!(c[x[0]] && c[x[0]].on);
    return '<div class="qs-charge' + (on ? " on" : "") + '"><label><input type="checkbox"' + (on ? " checked" : "") + ' onchange="qsChargeOn(\'' + x[0] + '\',this.checked)"><span>' + escapeHtml(t(x[1])) + "</span></label>" +
      (on ? '<span class="qs-charge-amt" dir="ltr">Rs. <input type="text" inputmode="decimal" id="qsCharge_' + x[0] + '" value="' + escapeHtml(c[x[0]].amount || "") + '" placeholder="0" oninput="qsChargeAmount(\'' + x[0] + '\',this.value)"></span>' : "") + "</div>";
  }).join("") + qsStructRow() + "</div>";
}

function qsChargeOn(key, on) {
  qs.charges = qs.charges || {};
  qs.charges[key] = qs.charges[key] || { on: false, amount: "" };
  qs.charges[key].on = on;
  renderQuick();
  if (on) { const el = $("qsCharge_" + key); if (el) el.focus(); }
}

function qsChargeAmount(key, v) {
  qs.charges[key].amount = v;
  const el = $("qsTotalAmt");
  if (el) el.textContent = qsMoney(qsTotal());
  qsPaidLive(qs.paid);
  qsEditLive();
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

// Sale: the main godam (a shop user: their shop).
// Purchase: the warehouse chosen on the payment screen (default warehouse to start with).
function qsWarehouse() {
  const whs = qsWarehousesSorted();
  if (isInward()) {
    return whs.find(function (w) { return String(w.WarehouseID) === String(qs.whId); }) || null;
  }
  if (isBuy()) {
    return whs.find(function (w) { return String(w.WarehouseID) === String(qs.whId); }) || whs[0] || { WarehouseID: "", Name: "" };
  }
  // Sale / quotation: a shop user sells from their shop (the only place they get); everyone else from the
  // main godam - never from Hamza / GM, even when the ERP shows the item there.
  if (isShopUser()) return whs[0] || null;
  const main = (qs.data.mainIds || [])[0];
  return whs.find(function (w) { return String(w.WarehouseID) === String(main); }) || whs.find(function (w) { return w.IsDefault; }) || null;
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

function qsTitle() { if (qs.editId) return "Edit bill"; return isInward() ? (qs.back ? "Bring back from shop" : "Send to shop") : (isQuote() ? "New Quotation" : (isBuy() ? "New Purchase" : "New Sale")); }

function qsHead(backAction) {
  const full = !qs.editId && !isInward() && !isQuote() && canOpen(isBuy() ? "purchases" : "sales")
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
    // Only parties this user has actually sold to / bought from show here.
    list = all.filter(function (c) { return (c.score || 0) > 0; }).slice(0, 8);
  }
  const cards = list.map(function (c) {
    const b = c.balance == null ? null : qsBalanceLabel(qsNum(c.balance));
    return '<button type="button" class="qs-cust' + (c.ownShop && !isBuy() ? " own" : "") + '" onclick="qsPickCustomer(\'' + escapeHtml(c.id) + '\')"><span dir="ltr">' + escapeHtml(c.name) +
      "</span>" + (c.ownShop && !isBuy() ? '<small class="qs-own">' + escapeHtml(t("Our shop: use Send to shop")) + "</small>" : "") + (b && !(c.ownShop && !isBuy()) ? '<small class="' + b.cls + '" dir="' + (getLang() === "ur" ? "rtl" : "ltr") + '">' + escapeHtml(b.text) + "</small>" : "") + "</button>";
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
        '<div class="qs-row2">' + (isQuote() ? "<span></span>" : '<button class="qs-btn" type="button" onclick="qsWalkIn(true)">' + escapeHtml(t("Continue without name")) + "</button>") +
        '<button class="qs-btn qs-primary" type="button" onclick="qsWalkIn(false)">' + escapeHtml(t("Continue")) + "</button></div></div>"
      : '<button type="button" class="qs-cash" onclick="qsOpenWalkIn()">' + escapeHtml(t(isQuote() ? "New customer (name or mobile)" : "Cash customer (walk-in)")) + "</button>";
  }

  return qsHead("") + qsSteps(1) + '<div class="qs-body">' +
    '<input class="qs-search" id="qsCustSearch" type="search" dir="ltr" autocomplete="off" placeholder="' +
    escapeHtml(t(isBuy() ? "Search supplier" : "Search name or mobile number")) +
    '" value="' + escapeHtml(qs.custQuery) + '" oninput="qsCustSearch(this.value)">' +
    extra +
    (q || !list.length ? "" : "<h4>" + escapeHtml(t(isBuy() ? "Frequent suppliers" : "Frequent customers")) + "</h4>") +
    '<div class="qs-grid" id="qsCustList">' + (cards || '<p class="qs-empty">' + escapeHtml(t(q ? (isBuy() ? "No supplier found" : "No customer found")
      : (isBuy() ? "Search the supplier above. Suppliers you buy from often will show here." : "Search the customer above. Customers you sell to often will show here."))) + "</p>") + "</div>" +
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
  if (c.ownShop && !isBuy() && !isQuote()) { qsOwnShopChosen(c.ownShop); return; }
  qs.customer = { id: c.id, name: c.name, phone: c.phone, balance: qsNum(c.balance), partyType: c.partyType || "" };
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
  const buy = isBuy() || inward || isQuote();
  let results = "";
  if (words.length) {
    const found = (qs.data.products || []).filter(function (p) {
      const hay = (p.name + " " + p.brand + " " + (p.aliases || "")).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    }).sort(function (a, b) { return buy ? 0 : (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0); }).slice(0, 8);
    const exact = (qs.data.products || []).some(function (p) { return p.name.trim().toLowerCase() === q; });
    results = '<div class="qs-res">' + (found.length ? found.map(function (p) {
      const inCart = qs.items.find(function (it) { return it.id === p.id; });
      const stock = inward ? qsOwnerStock(p) : qsNum(p.stock);
      const canAdd = inward ? stock > 0 : true;      // a sale is never stopped by the ERP stock; the owner is told instead
      const shopUser = isShopUser();
      const others = !buy && !shopUser ? Object.keys(p.atShops || {}).map(function (n) { return n + ": " + p.atShops[n]; }).join(" · ") : "";
      return "<div><span><span dir=\"ltr\">" + escapeHtml(p.name) + "</span><small>" + escapeHtml(t(inward ? "Main godam" : (buy ? "Stock" : (shopUser ? "In this shop" : "Main shop")))) + ": " +
        (stock > 0 ? '<em>' + escapeHtml(String(stock)) + "</em>" : '<em class="no">0' + (buy ? "" : " (" + escapeHtml(t("not in ERP stock")) + ")") + "</em>") +
        (inward ? " · " + escapeHtml(t("In shop")) + ": " + escapeHtml(String(qsShopStock(p))) : "") +
        (others ? ' · <span class="qs-at">' + escapeHtml(others) + "</span>" : "") + "</small></span>" +
        (canAdd && !inCart ? '<button type="button" class="qs-add" onclick="qsAddItem(\'' + escapeHtml(p.id) + '\')">+ ' + escapeHtml(t("Add")) + "</button>" :
          (inCart ? '<span class="qs-incart">✓</span>' : "<span></span>")) + "</div>";
    }).join("") : '<p class="qs-empty">' + escapeHtml(t("No item found")) + "</p>") +
      (q.length >= 2 && !exact && !inward ? '<button type="button" class="qs-newrow" onclick="qsAddNewItem()"><span><small>' + escapeHtml(t("Not in the list?")) + '</small><b dir="ltr">' +
        escapeHtml(qs.itemQuery.trim().toUpperCase()) + '</b></span><span class="qs-add">+ ' + escapeHtml(t("New item")) + "</span></button>" : "") + "</div>";
  }

  const cart = qs.items.map(function (it, i) {
    const rate = qsNum(it.rate);
    const hint = rate <= 0 ? t("Enter rate") : (it.fromLast ? t(buy ? "Last rate from this supplier" : "Last rate for this customer") : t("Rate"));
    return '<div class="qs-item"><div class="qs-item-top"><div class="n"><span dir="ltr">' + (it.isNew || String(it.id).indexOf("new:") === 0 ? escapeHtml(it.name) : cardLink("product", it.id, it.name)) + "</span>" +
      (it.isNew ? ' <span class="qs-badge">' + escapeHtml(t("New item")) + "</span>" : "") + "</div>" +
      '<button type="button" class="qs-x" aria-label="' + escapeHtml(t("Remove")) + '" onclick="qsRemove(' + i + ')">✕</button></div>' +
      '<div class="m"><div class="qs-qty" dir="ltr"><button type="button" aria-label="-1" onclick="qsQty(' + i + ',-1)">−</button>' +
      '<input class="qs-qty-in" type="text" inputmode="numeric" aria-label="Quantity" value="' + it.qty + '" onchange="qsQtySet(' + i + ',this.value)">' +
      '<button type="button" aria-label="+1" onclick="qsQty(' + i + ',1)"' + (it.qty >= it.max ? " disabled" : "") + ">+</button></div>" +
      (inward ? "" : '<label class="qs-rate' + (rate <= 0 ? " need" : "") + '"><small>' + escapeHtml(hint) + "</small>" +
      '<span dir="ltr">Rs. <input type="text" inputmode="decimal" value="' + (rate > 0 ? escapeHtml(String(rate)) : "") +
      '" placeholder="0" onchange="qsRate(' + i + ',this.value,this)" oninput="qsRateLive(' + i + ',this.value)"></span></label>') + "</div>" +
      qsItemExtras(it, i) + "</div>";
  }).join("");

  const units = qs.items.reduce(function (a, it) { return a + it.qty; }, 0);
  const shopChip = inward ? '<div class="qs-chip"><b>' + escapeHtml(t("Sending to")) + ' <span dir="ltr">' + escapeHtml(qsShopName()) +
    '</span></b><button type="button" onclick="qsGo(1)">' + escapeHtml(t("Change")) + "</button></div>" +
    (!qs.back ? '<p class="qs-hint">' + escapeHtml(t("Goods are taken from")) + ': <b dir="ltr">' + escapeHtml(qsSourceNames() || "-") + "</b></p>" : "") : "";
  return qsHead(qs.editId ? "showPage('bills')" : "qsGo(1)") + qsSteps(2) + '<div class="qs-body">' +
    (qs.editId ? '<div class="qs-chip qs-editchip"><b>' + escapeHtml(t("Editing bill")) + ' <span dir="ltr">' + escapeHtml(qs.edit.no) + '</span> · <span dir="ltr">' + escapeHtml(qsCustomerName()) + "</span></b></div>" :
    inward ? shopChip : '<div class="qs-chip"><b dir="ltr">' + escapeHtml(qsCustomerName()) + (qs.customer && qs.customer.isNew ? ' <span class="qs-badge">' + escapeHtml(t("New supplier")) + "</span>" : "") +
    '</b><button type="button" onclick="qsGo(1)">' + escapeHtml(t("Change")) + "</button></div>") +
    '<input class="qs-search' + (q ? " typed" : "") + '" id="qsItemSearch" type="search" dir="ltr" autocomplete="off" placeholder="' + escapeHtml(t(qs.items.length ? "Search another item" : "Search item")) +
    '" value="' + escapeHtml(qs.itemQuery) + '" oninput="qsItemSearch(this.value)">' + results +
    (qs.items.length ? "<h4>" + escapeHtml(t(inward ? "Goods to send" : (isQuote() ? "In this quotation" : (buy ? "In this purchase" : "In this sale")))) + "</h4>" + cart +
      '<button type="button" class="qs-another" onclick="qsFocusSearch()">' + escapeHtml(t("+ Add another item")) + "</button>" + qsPackageButtons() + (buy ? "" : qsPreviewBtn()) : (q ? "" : '<p class="qs-empty">' + escapeHtml(t("Search an item above and tap Add.")) + "</p>" + qsPackageButtons())) +
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
  qs.items.push({ id: p.id, name: p.name, qty: 1, max: isInward() ? Math.max(1, qsOwnerStock(p)) : 99999, stock: qsNum(p.stock),
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
  const low = qsBelowMin();
  if (low) { showError(t("Rate is below the minimum for") + " " + low.name + " (Rs. " + low.min + ")."); renderQuick(); return; }
  if (isInward()) { qsGo(3); return; }
  if (!qs.items.every(function (it) { return qsNum(it.rate) > 0; })) { showError(t("Enter the rate for every item.")); renderQuick(); return; }
  if (qsIsAnonymous()) qs.pay = "full";
  if (isBuy() && !qs.whId) { const w = qsWarehousesSorted()[0]; qs.whId = w ? String(w.WarehouseID) : ""; }
  qsGo(3);
}

/* ---------- step 3: payment ---------- */
function qsStep3() {
  if (qs.editId) return qsEditStep3();
  if (isInward()) return qsInwardStep3();
  if (isQuote()) return qsQuoteStep3();
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
  const comm = buy ? "" : qsCommissionHtml();
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
    (!buy && qs.pay !== "credit" && qs.method !== "cash" ? payDetailsHtml("qs", qs.data.accounts) : "") +
    // Cash bill: tick who gets this cash (Ahsan / Anwar ...) right here, so the salesman hands it over with the bill.
    (!buy && qs.pay !== "credit" && qs.method === "cash" ? cashToHtml((qs.data.cashKeepers || []).filter(function (k) { return !state.user || k.userId !== state.user.userId; }), qs.cashTo, "qsSetCashTo") : "") +
    (!buy && qs.pay !== "credit" ? qsMorePaysHtml() : "") +
    qsChargesHtml() +
    spSelect + more + comm +
    (buy ? "" : qsPreviewBtn()) +
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
  if (qs.editId) return qsSaveEdit();
  if (isInward()) return qsSaveInward();
  if (isQuote()) return qsSaveQuote();
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
  // From a ledger: goods out to a SUPPLIER's account, or goods in on a CUSTOMER's account (one account both ways).
  if (c.partyType && c.id && (buy ? c.partyType === "customer" : c.partyType === "supplier")) payload.partyType = c.partyType;
  payload.clientRef = qs.clientRef || (qs.clientRef = newClientRef());
  if (!buy) { const ch = qsChargeList(); if (ch.length) payload.charges = ch; const st = qsStructPayload(); if (st) payload.structure = st; }
  if (!buy && qs.comm && qsNum(qs.commission) > 0) {
    if (qsNum(qs.commission) > qsTotal()) { showError(t("Commission cannot be more than the bill.")); return; }
    payload.commission = qsNum(qs.commission);
    payload.commissionTo = String(qs.commissionTo || "").trim();
    payload.commissionCash = qs.commissionCash !== false;
  }
  if (!buy && qs.method === "cash" && qs.pay !== "credit" && qs.cashTo) payload.cashTo = qs.cashTo;
  if (!buy && qs.method !== "cash" && qs.pay !== "credit") {
    if (qs.payAccount) payload.payAccount = qs.payAccount;
    if (qs.payRef) payload.payRef = qs.payRef;
    if (qs.slip) payload.slip = { data: qs.slip.data, type: qs.slip.type };
  }
  // Several payments (e.g. two slips of different amounts): the first line gets what is left.
  if (!buy && qs.pay !== "credit" && (qs.morePays || []).length) {
    const extra = qs.morePays.reduce(function (a, x) { return a + qsNum(x.amount); }, 0);
    const first = Math.round((qsPaidAmount() - extra) * 100) / 100;
    if (qs.morePays.some(function (x) { return !(qsNum(x.amount) > 0); })) { showError(t("Enter the amount of every payment.")); return; }
    if (first <= 0) { showError(t("The other payments are more than the amount paid. Check the amounts.")); return; }
    payload.payments = [{ method: qs.method, amount: first, account: qs.method !== "cash" ? qs.payAccount : "", ref: qs.method !== "cash" ? qs.payRef : "",
      slip: qs.method !== "cash" && qs.slip ? { data: qs.slip.data, type: qs.slip.type } : null }]
      .concat(qs.morePays.map(function (x) {
        return { method: x.method, amount: qsNum(x.amount), account: x.method !== "cash" ? x.payAccount : "", ref: x.method !== "cash" ? x.payRef : "",
          slip: x.method !== "cash" && x.slip ? { data: x.slip.data, type: x.slip.type } : null };
      }));
  }
  if (!buy && qs.quoteId) payload.quoteId = qs.quoteId;
  if (buy && qs.stockInId) payload.stockInId = qs.stockInId;
  if (!buy) payload.items.forEach(function (row, k) { const it = qs.items[k]; if (it && it.serials) row.serials = it.serials; });
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
    if (isNetworkError(error)) {
      outboxAdd(buy ? "quickpurchase" : "quicksale", payload, (buy ? "Purchase" : "Sale") + " " + qsCustomerName() + " " + qsMoney(qsTotal()));
      qs.result = { offline: true, netTotal: qsTotal(), paid: qsPaidAmount(), paymentMethod: qs.method, customerName: qsCustomerName(), customerBalance: null, supplierBalance: null };
      qs.step = 4;
    } else {
      showError(error.message || "Could not save.");
    }
  } finally {
    qs.saving = false;
    renderQuick();
  }
}

/* ---------- step 4: done ---------- */
function qsStep4() {
  if (qs.editId) return qsEditDone();
  if (isInward()) return qsInwardStep4();
  if (isQuote()) return qsQuoteDone();
  if (qs.result && qs.result.offline) return qsOfflineDone();
  const buy = isBuy();
  const r = qs.result || {};
  const method = t(String(r.paymentMethod || "cash").charAt(0).toUpperCase() + String(r.paymentMethod || "cash").slice(1));
  const name = buy ? r.supplierName : r.customerName;
  const bal = qsNum(buy ? r.supplierBalance : r.customerBalance);
  const showBal = (buy ? r.supplierBalance : r.customerBalance) != null && name && String(name).toUpperCase() !== "CASH CUSTOMER";
  return '<div class="qs-head"><b>' + escapeHtml(t(buy ? "Purchase saved" : "Sale saved")) + "</b></div>" +
    '<div class="qs-done"><div class="qs-tick">✓</div><h3><span dir="ltr">' + escapeHtml(buy ? (r.referenceNo || "") : (r.invoiceNo || "")) + "</span> " + escapeHtml(t("saved")) + "</h3>" +
    "<p>" + escapeHtml(t(buy ? "Stock and the supplier's account are already updated." : "Stock and the customer's account are already updated.")) + "</p>" +
    (!buy && (r.stockShort || []).length ? '<p class="qs-warn">' + escapeHtml(t("ERP stock was short:")) + " " + escapeHtml(r.stockShort.map(function (x) {
      return x.qty + " " + x.name + (x.from ? " (" + t("taken from") + " " + x.from + ")" : " (" + t("owner will check") + ")");
    }).join(", ")) + "</p>" : "") +
    '<div class="qs-sum"><div><span>' + escapeHtml(t("Total")) + '</span><b dir="ltr">' + qsMoney(r.netTotal) + "</b></div>" +
      (!buy && r.commission > 0 ? '<div class="qs-comm-line"><span>' + escapeHtml(t("Commission (not on the bill)")) + '</span><b dir="ltr">' + qsMoney(r.commission) + "</b></div>" : "") +
    "<div><span>" + escapeHtml(t(buy ? "Paid" : "Received")) + " (" + escapeHtml(method) + ')</span><b dir="ltr">' + qsMoney(r.paid) + "</b></div>" +
    (!buy && qs.cashTo && r.paid > 0 ? (function () { const k = (qs.data.cashKeepers || []).find(function (x) { return x.userId === qs.cashTo; });
      return k ? "<div><span>" + escapeHtml(t("Cash")) + "</span><b>" + escapeHtml(t("Waiting for") + " " + k.name + " " + t("to press Received")) + "</b></div>" : ""; })() : "") +
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
// Roles. The owner can still tick or untick any single right after choosing a role.
const USER_PRESETS = [
  ["Salesman (main shop)", ["quicksale", "stockin", "receivepay", "cash"]],
  ["Shop salesman (Hamza / GM)", ["quicksale", "mystock", "stockin", "receivepay", "cash"]],
  ["Manager", ["quicksale", "billdelete", "quickpurchase", "inward", "stockin", "receivepay", "cash", "cashkeep", "customers", "suppliers", "incentives"]]
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
  if (form) {
    form.addEventListener("submit", saveUserForm);
    if (form.shopId) form.shopId.addEventListener("change", userShopRules);
    userShopRules();
  }
}

// A user tied to a shop (Hamza, GM) only sells and sees their stock: purchase, send to shop
// and products cannot be given to them. The form shows this instead of saving access that would not work.
function userShopRules() {
  const f = $("userForm");
  if (!f || !f.shopId) return;
  const shop = !!f.shopId.value;
  const blocked = ["quickpurchase", "inward", "shopreturn", "products", "suppliers", "purchases"];
  f.querySelectorAll('input[name="mod"]').forEach(function (cb) {
    const off = (shop && blocked.indexOf(cb.value) !== -1) || (!shop && cb.value === "mystock");
    if (off) cb.checked = false;
    cb.disabled = off;
    const line = cb.closest("label");
    if (line) line.classList.toggle("mod-off", off);
  });
  let note = $("userShopNote");
  if (!note) {
    note = document.createElement("p");
    note.id = "userShopNote";
    note.className = "user-shop-note";
    f.querySelector(".module-grid").insertAdjacentElement("beforebegin", note);
  }
  note.textContent = shop
    ? "This user works in " + f.shopId.options[f.shopId.selectedIndex].text + ". A shop user can sell and see only this shop's stock (My Stock), but cannot purchase, send goods or change products. For main shop staff choose Shop: Any."
    : "My Stock is only for users of a shop (Hamza, GM...). Choose the user's shop above to give it.";
  note.style.display = "";
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
    '<div class="preset-row"><span>Role:</span>' + USER_PRESETS.map(function (p, i) {
      return '<button type="button" class="btn secondary ledger-action-btn" onclick="applyUserPreset(' + i + ')">' + escapeHtml(p[0]) + "</button>";
    }).join("") + '<small class="preset-note">Quotation, Warranty and Installations are not in any role: tick them below for the users who need them.</small></div>' +
    '<div class="module-grid">' +
    '<label class="check-line owner-line"><input type="checkbox" name="mod" value="admin"' + (isOwner ? " checked" : "") + "> Owner (everything, including Settings and users)</label>" +
    MODULE_LABELS.map(function (m) {
      return '<label class="check-line"><input type="checkbox" name="mod" value="' + m[0] + '"' + (mods.indexOf(m[0]) !== -1 ? " checked" : "") + "> " + escapeHtml(m[1]) + "</label>";
    }).join("") + "</div>" +
    '<div class="form-actions"><button type="button" class="btn secondary" onclick="renderUsersPanel()">Cancel</button><button type="submit" class="btn primary">Save User</button></div></form>';
}

function applyUserPreset(i) {
  const keep = USER_PRESETS[i][1];
  const f = $("userForm");
  // "Main shop staff" is not tied to a shop.
  if (f && f.shopId && keep.indexOf("inward") !== -1) f.shopId.value = "";
  document.querySelectorAll('#userForm input[name="mod"]').forEach(function (cb) { cb.checked = keep.indexOf(cb.value) !== -1; });
  userShopRules();
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


/* ============================================================
   APP UPDATES
   Each upload has a version number (version.json on GitHub). The app checks it
   when it opens, every 10 minutes and whenever it comes back to the screen.
   When a newer version is online, an "Update" bar appears; one tap loads it.
   ============================================================ */
const APP_VERSION = "20261113-hand1";

async function checkForUpdate() {
  if (!/^https?:/.test(location.protocol) || state.updateShown) return;
  try {
    const res = await fetch("version.json?ts=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return;
    const v = await res.json();
    if (v && v.version && v.version !== APP_VERSION) showUpdateBar();
  } catch (e) { /* offline: try again later */ }
}

function showUpdateBar() {
  if (document.getElementById("updateBar")) return;
  state.updateShown = true;
  const bar = document.createElement("div");
  bar.id = "updateBar";
  bar.className = "update-bar";
  bar.innerHTML = '<span>' + escapeHtml(t("A new version of the app is ready.")) + '</span><button type="button" onclick="applyUpdate()">' + escapeHtml(t("Update")) + "</button>";
  document.body.appendChild(bar);
}

async function applyUpdate() {
  const btn = document.querySelector("#updateBar button");
  if (btn) { btn.disabled = true; btn.textContent = t("Updating..."); }
  try {
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function (r) { return r.update().catch(function () {}); }));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }
  } catch (e) { /* reload anyway */ }
  const u = new URL(location.href);
  u.searchParams.set("v", String(Date.now()));
  location.replace(u.toString());
}

window.addEventListener("load", function () {
  setTimeout(checkForUpdate, 4000);
  setInterval(checkForUpdate, 10 * 60 * 1000);
});
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible") checkForUpdate();
});


// Settings page: fill the users panel after the page is drawn.
(function () {
  const draw = renderSettingsPage;
  renderSettingsPage = function () {
    draw.apply(this, arguments);
    loadUsersPanel();
    renderShopConvertPanel();
    loadCashAdjPanel();
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
  const canSeeSent = canIn || canOpen("mystock") || canOpen("stockin") || canOpen("shopreturn");
  const tabsOn = [["sales", "Sales", canSale], ["purchases", "Purchases", canBuy], ["inwards", isShopUser() ? "Received" : "Goods in / out", canSeeSent]].filter(function (x) { return x[2]; });
  if (!tabsOn.some(function (x) { return x[0] === state.billsTab; })) state.billsTab = tabsOn.length ? tabsOn[0][0] : "sales";
  const tab = state.billsTab;
  const bf = state.billsFilter = state.billsFilter || { q: "", show: "all", by: "" };
  const ur = getLang() === "ur";
  const dead = function (b) { return /cancel/i.test(b.status); };
  // Newest first: by day, then by bill number (the app sorts too, so the order is right whatever the server sends)
  const num = function (no) { const m = String(no || "").match(/(\d+)\D*$/); return m ? Number(m[1]) : 0; };
  const all = (((tab === "sales" ? d.sales : (tab === "inwards" ? d.inwards : d.purchases)) || []).slice())
    .sort(function (x, y) { return String(y.date || "").slice(0, 10).localeCompare(String(x.date || "").slice(0, 10)) || num(y.no) - num(x.no); });
  const q = bf.q.trim().toLowerCase();
  const count = { unpaid: 0, cost: 0, deleted: 0 };
  all.forEach(function (b) { if (dead(b)) count.deleted++; else { if (b.due > 0.5) count.unpaid++; if (b.noCost) count.cost++; } });
  const people = d.all ? Array.from(new Set(all.map(function (b) { return b.by; }).filter(Boolean))).sort() : [];
  const list = all.filter(function (b) {
    if (bf.show === "deleted" ? !dead(b) : dead(b)) return false;
    if (bf.show === "unpaid" && !(b.due > 0.5)) return false;
    if (bf.show === "cost" && !b.noCost) return false;
    if (bf.by && b.by !== bf.by) return false;
    return !q || (String(b.no) + " " + b.party + " " + (b.by || "") + " " + (b.items || "")).toLowerCase().indexOf(q) !== -1;
  });
  const today = localDay();
  const yest = (function () { const x = new Date(Date.now() - 86400000); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); })();
  const groups = [];
  list.forEach(function (b) {
    const day = String(b.date || "").slice(0, 10);
    let g = groups[groups.length - 1];
    if (!g || g.day !== day) { g = { day: day, items: [], total: 0 }; groups.push(g); }
    g.items.push(b);
    if (!dead(b)) g.total += Number(b.total) || 0;
  });
  const open = state.billOpen;
  const keepers = d.keepers || [];
  const listView = (state.billsView || "list") === "list";
  // The cash of a bill goes to Anwar / Ahsan with one tap, right on the line (only bills whose cash is with me).
  const handBtns = function (b) {
    return "";   // handing over cash is on the Cash page only
    if (!(tab === "sales" && b.canHand && canOpen("cash"))) return "";
    if (keepers.length > 3) return '<button type="button" class="bl-hand-btn" onclick="event.stopPropagation();billHandAsk(\'' + escapeHtml(b.id) + '\')">' + escapeHtml(t("Hand over")) + "</button>";
    return keepers.map(function (k) {
      return '<button type="button" class="bl-hand-btn" title="' + escapeHtml(t("Hand over cash to") + " " + k.name) + '" onclick="event.stopPropagation();billHandOne(\'' + escapeHtml(b.id) + '\',\'' + escapeHtml(k.userId) + '\')">→ ' + escapeHtml(k.name) + "</button>";
    }).join("");
  };
  const blCard = function (b) { return ' data-card="' + (tab === "inwards" ? "challan" : (tab === "sales" ? "sale" : "purchase")) + ":" + escapeHtml(b.id) + '"'; };
  const blParty = function (b) {
    return tab !== "inwards" && b.customerId && canOpen("accounts") ? '<span class="card-link" data-card="' + (b.partyType || (tab === "sales" ? "customer" : "supplier")) + ":" + escapeHtml(b.customerId) + '">' + escapeHtml(b.party) + "</span>" : escapeHtml(b.party);
  };
  const rowHtml = function (b) {
    const cancelled = dead(b);
    const isOpen = open === b.id;
    const payBtn = tab === "sales" && !cancelled && b.due > 0.5 && canOpen("receive")
      ? '<button type="button" class="btn primary bl-pay" onclick="event.stopPropagation();billPayAsk(\'' + escapeHtml(b.id) + '\')">' + escapeHtml(t("Payment")) + "</button>" : "";
    const actions = tab === "inwards"
      ? (b.stockIn && !b.billed && isAdminUser() ? '<button type="button" class="btn primary ledger-action-btn" onclick="stockInToPurchase(\'' + escapeHtml(b.id) + '\')">' + escapeHtml(t("Make purchase bill")) + "</button>" : "") +
        '<button type="button" class="btn secondary ledger-action-btn" onclick="openChallanPdf(\'' + escapeHtml(b.id) + '\')">' + escapeHtml(t("Challan")) + "</button>" +
        '<button type="button" class="btn secondary ledger-action-btn wa-mini" onclick="whatsappChallan(\'' + escapeHtml(b.id) + '\')">WhatsApp</button>'
      : tab === "sales"
      ? '<button type="button" class="btn primary ledger-action-btn" data-card="sale:' + escapeHtml(b.id) + '">' + escapeHtml(t("Details")) + "</button>" +
        '<button type="button" class="btn secondary ledger-action-btn" onclick="openBillPdf(\'' + escapeHtml(b.id) + '\')">' + escapeHtml(t("Bill PDF")) + "</button>" +
        (cancelled ? "" : '<button type="button" class="btn secondary ledger-action-btn wa-mini" onclick="whatsappInvoice(\'' + escapeHtml(b.id) + '\')">WhatsApp</button>') +
        (b.canHand && canOpen("cash") ? '<button type="button" class="btn secondary ledger-action-btn bl-hand" onclick="billHandAsk(\'' + escapeHtml(b.id) + '\')">' + escapeHtml(t("Hand over a different amount")) + "</button>" : "") +
        (b.canCost ? '<button type="button" class="btn ' + (b.noCost ? "primary" : "secondary") + ' ledger-action-btn" onclick="openBillCost(\'' + escapeHtml(b.id) + '\')">' + escapeHtml(t("Set cost")) + (b.noCost ? " (" + b.noCost + ")" : "") + "</button>" : "") +
        (b.canEdit ? '<button type="button" class="btn secondary ledger-action-btn" onclick="billEditStart(\'' + escapeHtml(b.id) + '\')">' + escapeHtml(t("Edit bill")) + "</button>" : "") +
        (b.canDelete ? '<button type="button" class="btn danger ledger-action-btn" data-no="' + escapeHtml(b.no) + '" onclick="deleteBillAsk(\'' + escapeHtml(b.id) + '\', this.dataset.no)">' + escapeHtml(t("Delete")) + "</button>" : "")
      : '<button type="button" class="btn primary ledger-action-btn" data-card="purchase:' + escapeHtml(b.id) + '">' + escapeHtml(t("Details")) + "</button>";
    const slip = (b.pays || []).some(function (x) { return x.slip; });
    const status = tab !== "sales" || cancelled ? "" : (b.due > 0.5 ? '<span class="bl-chip due" dir="ltr">' + escapeHtml(t("Due")) + " " + qsMoney(b.due) + "</span>"
      : (b.due != null ? '<span class="bl-chip paid">' + escapeHtml(t("Paid")) + "</span>" : ""));
    const sub = [d.all && b.by ? b.by : "", b.commission > 0 && !cancelled ? t("Commission") + " " + qsMoney(b.commission) : "", cancelled && b.reason ? b.reason : "",
      b.handed && !cancelled ? t("Cash") + " → " + b.handed.to + (b.handed.status === "Pending" ? " (" + t("waiting") + ")" : " ✓") : "",
      tab === "inwards" && b.items ? b.items : ""].filter(Boolean);
    if (listView) {
      // List view: one thin line per bill; the details open on tap.
      const st = tab !== "sales" || cancelled ? (cancelled ? '<span class="bl-chip del">' + escapeHtml(t("Deleted")) + "</span>" : "")
        : (b.due > 0.5 ? '<span class="bl-chip due" dir="ltr">' + qsMoney(b.due) + "</span>" : '<span class="bl-chip paid">' + escapeHtml(t("Paid")) + "</span>");
      const hand = b.handed && !cancelled ? '<span class="bl-chip hand">→ ' + escapeHtml(b.handed.to) + (b.handed.status === "Pending" ? " …" : " ✓") + "</span>" : handBtns(b);
      return '<div class="bl-li' + (cancelled ? " cancelled" : "") + (isOpen ? " open" : "") + '" onclick="billToggle(\'' + escapeHtml(b.id) + '\')">' +
        '<b class="bl-no" dir="ltr"' + blCard(b) + ">" + escapeHtml(b.no) + "</b>" +
        '<span class="bl-party" dir="ltr">' + blParty(b) + (d.all && b.by ? "<small>" + escapeHtml(b.by) + "</small>" : "") + "</span>" +
        '<b class="bl-amt" dir="ltr">' + (tab === "inwards" ? escapeHtml(String(b.total)) + " " + escapeHtml(t("units")) : qsMoney(b.total)) + "</b>" +
        '<span class="bl-end">' + st + (b.noCost && !cancelled ? '<span class="bl-chip cost" title="' + escapeHtml(t("No cost")) + '">₨?</span>' : "") + (b.structPending && !cancelled && !b.noCost ? '<span class="bl-chip cost" title="' + escapeHtml(t("Structure cost due")) + '">⌂?</span>' : "") + (slip ? '<span class="bl-clip">📎</span>' : "") + hand + payBtn + "</span>" +
        (isOpen ? '<div class="bl-more" onclick="event.stopPropagation()">' + (sub.length ? "<small>" + escapeHtml(sub.join(" · ")) + "</small>" : "") +
          (tab === "sales" && !cancelled ? billPaysHtml(b) : "") + '<div class="bill-actions">' + actions + "</div></div>" : "") +
        "</div>";
    }
    return '<div class="bl-row' + (cancelled ? " cancelled" : "") + (isOpen ? " open" : "") + '" onclick="billToggle(\'' + escapeHtml(b.id) + '\')">' +
      '<div class="bl-line"><b class="bl-no" dir="ltr"' + blCard(b) + ">" + escapeHtml(b.no) + '</b><span class="bl-party" dir="ltr">' + blParty(b) + "</span>" +
        '<b class="bl-amt" dir="ltr">' + (tab === "inwards" ? escapeHtml(String(b.total)) + " " + escapeHtml(t("units")) : qsMoney(b.total)) + "</b></div>" +
      '<div class="bl-sub"><small>' + (slip ? "📎 " : "") + escapeHtml(sub.join(" · ")) + "</small>" + (b.noCost && !cancelled ? '<span class="bl-chip cost">' + escapeHtml(t("No cost")) + "</span>" : "") + (b.structPending && !cancelled ? '<span class="bl-chip cost">' + escapeHtml(t("Structure cost due")) + "</span>" : "") + status + handBtns(b) + payBtn + "</div>" +
      (isOpen ? '<div class="bl-more" onclick="event.stopPropagation()">' + (tab === "sales" && !cancelled ? billPaysHtml(b) : "") + '<div class="bill-actions">' + actions + "</div></div>" : "") +
      "</div>";
  };
  const dayName = function (day) { return day === today ? t("Today") + " · " + formatDate(day) : (day === yest ? t("Yesterday") + " · " + formatDate(day) : formatDate(day)); };
  const chip = function (key, label, n) {
    return '<button type="button" class="' + (bf.show === key ? "sel" : "") + '" onclick="state.billsFilter.show=\'' + key + '\';renderBills()">' + escapeHtml(t(label)) + (n ? " <em>" + n + "</em>" : "") + "</button>";
  };
  const tabs = tabsOn.length > 1 ? '<div class="bills-tabs">' + tabsOn.map(function (x) {
    return '<button type="button" class="' + (tab === x[0] ? "on" : "") + '" onclick="state.billsTab=\'' + x[0] + '\';state.billOpen=null;renderBills()">' + escapeHtml(t(x[1])) + "</button>";
  }).join("") + "</div>" : "";
  contentElement().innerHTML = '<div class="content bills-page"' + (ur ? ' dir="rtl"' : "") + ">" +
    '<div class="toolbar"><div><h2>' + escapeHtml(t(d.all ? "Bills" : "My Bills")) + "</h2><p>" + escapeHtml(t("Last 60 days")) + "</p></div></div>" + tabs +
    '<div class="bl-tools"><input class="search" id="billSearch" type="search" placeholder="' + escapeHtml(t("Search bill no. or customer")) + '" value="' + escapeHtml(bf.q) + '" oninput="billSearch(this.value)">' +
      (people.length > 1 ? '<select class="search" onchange="state.billsFilter.by=this.value;renderBills()"><option value="">' + escapeHtml(t("Everyone")) + "</option>" +
        people.map(function (n) { return "<option" + (bf.by === n ? " selected" : "") + ">" + escapeHtml(n) + "</option>"; }).join("") + "</select>" : "") + "</div>" +
    billHandAllHtml(all, keepers, tab) +
    '<div class="bl-view"><button type="button" class="' + (listView ? "on" : "") + '" onclick="state.billsView=\'list\';renderBills()">☰ ' + escapeHtml(t("List")) + '</button><button type="button" class="' + (listView ? "" : "on") + '" onclick="state.billsView=\'cards\';renderBills()">▭ ' + escapeHtml(t("Cards")) + "</button></div>" +
    (tab === "sales" ? '<div class="qs-seg bl-filter">' + chip("all", "All", 0) + chip("unpaid", "Unpaid", count.unpaid) + (count.cost ? chip("cost", "No cost", count.cost) : "") + (count.deleted ? chip("deleted", "Deleted", count.deleted) : "") + "</div>" : "") +
    '<div class="bills-list">' + (groups.map(function (g) {
      return '<div class="bl-day"><span>' + escapeHtml(dayName(g.day)) + "</span><small>" + g.items.length + " " + escapeHtml(t(g.items.length === 1 ? "bill" : "bills")) +
        (tab === "inwards" ? "" : ' · <b dir="ltr">' + qsMoney(g.total) + "</b>") + "</small></div>" + g.items.map(rowHtml).join("");
    }).join("") || '<p class="empty">' + escapeHtml(t(all.length ? "No bills match." : "No bills yet.")) + "</p>") + "</div></div>";
  updatePageTitle("bills");
}

function billToggle(id) { state.billOpen = state.billOpen === id ? null : id; renderBills(); }
function billSearch(v) {
  state.billsFilter.q = v; renderBills();
  const el = $("billSearch"); if (el) { el.focus(); try { el.setSelectionRange(v.length, v.length); } catch (e) { /* search */ } }
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

// Places the goods are sent from: the main godam (and any other non-shop store), never the shop that gets them.
function qsSourceIds() {
  const to = String(qs.data.shopId || qs.whId || "");
  if (Array.isArray(qs.data.mainIds)) return qs.data.mainIds.filter(function (id) { return id !== to; });
  const shops = qs.data.shopIds || [];
  return (qs.data.warehouses || []).map(function (w) { return String(w.WarehouseID); }).filter(function (id) { return id !== to && shops.indexOf(id) === -1; });
}
function qsSourceNames() {
  const ids = qsSourceIds();
  return (qs.data.warehouses || []).filter(function (w) { return ids.indexOf(String(w.WarehouseID)) !== -1; }).map(function (w) { return w.Name; }).join(", ");
}

function qsOwnerStock(p) {
  if (qs.back) return qsNum((p.locations || {})[String(qs.whId || "")]);     // bringing back: only what that shop has
  if (Array.isArray(qs.data.mainIds)) return qsSourceIds().reduce(function (a, id) { return a + qsNum((p.locations || {})[id]); }, 0);
  const shop = String(qs.data.shopId || qs.whId || "");
  const shops = qs.data.shopIds || [];
  return Object.keys(p.locations || {}).reduce(function (a, k) { return k === shop || shops.indexOf(k) !== -1 ? a : a + qsNum(p.locations[k]); }, 0);
}

// Step 1: which shop gets the goods.
function qsSendShops() {
  const ids = qs.data.shopIds || [];
  const whs = qsWarehousesSorted();
  // Every shop, plus any other warehouse that is not the main godam (a shop with no user yet).
  const isShop = function (w) { return ids.indexOf(String(w.WarehouseID)) !== -1; };
  return whs.filter(function (w) { return isShop(w) || !w.IsDefault; })
    .sort(function (a, b) { return (isShop(b) ? 1 : 0) - (isShop(a) ? 1 : 0); });
}

function canSendToShop() { return !state.user || state.user.admin || (state.user.modules || []).indexOf("inward") !== -1; }
function canBringBack() { return !state.user || state.user.admin || (state.user.modules || []).indexOf("shopreturn") !== -1; }

function qsSetBack(on) {
  if (!!qs.back === !!on) return;
  qs.back = !!on; qs.whId = ""; qs.items = []; qs.note = "";
  renderQuick();
}

function qsSendPickShop() {
  if (qs.back === undefined || (qs.back && !canBringBack()) || (!qs.back && !canSendToShop())) qs.back = !canSendToShop() && canBringBack();
  const shops = qsSendShops();
  const both = false;            // bringing goods back is now Goods In > From our shop
  return qsHead("") + qsSteps(1) + '<div class="qs-body">' +
    (both ? '<div class="qs-seg qs-dir"><button type="button" class="' + (qs.back ? "" : "sel") + '" onclick="qsSetBack(false)">' + escapeHtml(t("Send to shop")) + "</button>" +
      '<button type="button" class="' + (qs.back ? "sel" : "") + '" onclick="qsSetBack(true)">' + escapeHtml(t("Bring back from shop")) + "</button></div>" : "") +
    (qs.back ? '<p class="qs-hint">' + escapeHtml(t("Goods come back from the shop to the main godam.")) + "</p>" : "") +
    "<h4>" + escapeHtml(t(qs.back ? "Bring back from which shop?" : "Choose the shop")) + '</h4><div class="qs-shops">' +
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
    '<div class="qs-total"><small>' + escapeHtml(t(qs.back ? "Back from" : "Sending to")) + ' </small><span dir="ltr">' + escapeHtml(qsShopName()) + '</span><b dir="ltr">' +
    units + " " + escapeHtml(t("units")) + "</b><small>" + qs.items.length + " " + escapeHtml(t("items")) + "</small></div>" +
    '<div class="qs-sum">' + list + "</div>" +
    '<label class="qs-amt qs-note"><small>' + escapeHtml(t("Note")) + '</small><input type="text" value="' + escapeHtml(qs.note) +
    '" oninput="qsSetField(\'note\',this.value,false)" placeholder="' + escapeHtml(t("Example: sent with Rashid")) + '"></label>' +
    "</div>" +
    '<div class="qs-bar"><div class="t"><small>' + escapeHtml(t(qs.back ? "Bring back from shop" : "Send to shop")) + '</small><b dir="ltr">' + units + " " + escapeHtml(t("units")) + "</b></div>" +
    '<button type="button" class="qs-btn qs-primary" id="qsSaveBtn" onclick="qsSave()"' + (qsWarehouse() && !qs.saving ? "" : " disabled") + ">" +
    escapeHtml(qs.saving ? t("Saving...") : t(qs.back ? "Save, goods are back" : "Save and send")) + "</button></div>";
}

async function qsSaveInward() {
  const wh = qsWarehouse();
  if (!wh) return;
  const today = new Date();
  const iso = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const payload = { date: iso, note: qs.note, toWarehouseId: String(wh.WarehouseID), fromWarehouseId: String(wh.WarehouseID),
    items: qs.items.map(function (it) { return { productId: it.id, qty: it.qty }; }) };
  qs.saving = true;
  renderQuick();
  try {
    qs.result = await call(qs.back ? "shopreturn" : "inward", payload);
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
  return '<div class="qs-head"><b>' + escapeHtml(t(r.back ? "Goods back" : "Goods sent")) + "</b></div>" +
    '<div class="qs-done"><div class="qs-tick">✓</div><h3><span dir="ltr">' + escapeHtml(r.inwardId || "") + "</span> " + escapeHtml(t("saved")) + "</h3>" +
    "<p>" + escapeHtml(t(r.back ? "The goods are now in the main godam's stock." : "The goods are now in the shop's stock.")) + "</p>" +
    '<div class="qs-sum"><div><span>' + escapeHtml(t(r.back ? "Back from" : "Sending to")) + '</span><b dir="ltr">' + escapeHtml(r.back ? r.fromName : (r.toName || "")) + "</b></div>" +
    "<div><span>" + escapeHtml(t("Units")) + '</span><b dir="ltr">' + escapeHtml(String(r.units || 0)) + "</b></div></div>" +
    '<button type="button" class="qs-btn qs-wa" onclick="whatsappChallan(\'' + escapeHtml(r.inwardId || "") + '\')">WhatsApp ' + escapeHtml(t("Challan")) + "</button>" +
    '<div class="qs-row2"><button type="button" class="qs-btn" onclick="openChallanPdf(\'' + escapeHtml(r.inwardId || "") + '\')">' + escapeHtml(t("Challan")) + " PDF</button>" +
    '<button type="button" class="qs-btn qs-primary" onclick="qsNewSale()">' + escapeHtml(t(r.back ? "Bring back more" : "Send to shop")) + "</button></div></div>";
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
    doc.rect(0, 0, A5_W, 64, { fill: "#102C66" });
    doc.rect(0, 64, A5_W, 3, { fill: "#F2A900" });
    pdfLogo(doc, M, 10, 44);
    doc.text(M + 54, 30, pdfFit((co.name || "ARHAM ELECTRONICS").toUpperCase(), 190, true, 15), { size: 15, bold: true, color: "#FFFFFF" });
    const sub = [co.address, co.phone ? "Ph: " + co.phone : ""].filter(Boolean).join("   ");
    if (sub) doc.text(M + 54, 45, pdfFit(sub, 190, false, 7.5), { size: 7.5, color: "#C9D6EE" });
    doc.text(R, 26, c.stockIn ? "STOCK IN" : (c.back ? "RETURN CHALLAN" : "DELIVERY CHALLAN"), { size: 10, bold: true, color: "#F2A900", align: "right" });
    doc.text(R, 41, "No. " + (c.inwardId || ""), { size: 9, bold: true, color: "#FFFFFF", align: "right" });
    doc.text(R, 54, formatDate(c.date), { size: 8, color: "#C3CFE6", align: "right" });
    y = 84;
    if (page === 1) {
      doc.text(M, y, c.stockIn ? "Goods received from" : (c.back ? "Goods back from" : "Goods sent to"), { size: 7.5, color: MUTED });
      doc.text(M, y + 13, pdfFit(c.back ? c.fromName + " to " + (c.toName || "") : (c.toName || ""), 250, true, 11), { size: 11, bold: true, color: INK });
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
  const v = pdfViewerOpen(t("Making the challan..."));
  try {
    const c = await getChallan(id);
    const pdf = buildChallanPdf(c);
    pdfViewerShow(v, pdf, PDF_LAST_DOC, { title: t("Challan") + " " + (c.inwardId || ""), text: (typeof challanMessage === "function" ? challanMessage(c) : "") });
  } catch (error) {
    v.remove();
    showError(error.message || "Could not make the challan.");
  }
}

function challanMessage(c) {
  const lines = ["*" + ((c.company || {}).name || "ARHAM ELECTRONICS") + "*", (c.stockIn ? "Stock in " : (c.back ? "Return challan " : "Delivery challan ")) + c.inwardId + " - " + formatDate(c.date),
    c.back ? "Back from: " + c.fromName + " → " + c.toName : "To: " + c.toName, ""];
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
  const data = await call("shopstock", state.myStockShop ? { warehouseId: state.myStockShop } : {});
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
    return '<div class="mystock-row"><div><b dir="ltr">' + cardLink("product", x.id, x.name) + "</b>" + (x.brand ? '<small dir="ltr">' + escapeHtml(x.brand) + "</small>" : "") + "</div>" +
      '<div class="mystock-qty"><b dir="ltr">' + formatNumber(x.qty) + "</b>" + (x.salePrice ? '<small dir="ltr">' + escapeHtml(t("Sale price")) + " " + qsMoney(x.salePrice) + "</small>" : "") + "</div></div>";
  }).join("");
  if (!$("myStockList")) {
    contentElement().innerHTML = '<div class="content mystock-page"' + (ur ? ' dir="rtl"' : "") + ">" +
      '<div class="toolbar"><div><h2>' + escapeHtml(t("My Stock")) + ' <span dir="ltr">' + escapeHtml(d.shopName || "") + '</span></h2><p id="myStockSum"></p></div></div>' +
      ((d.shops || []).length > 1 ? '<div class="stock-tabs">' + d.shops.map(function (w) {
        return '<button type="button" class="' + (w.id === d.shopId ? "on" : "") + '" onclick="myStockShop(\'' + escapeHtml(w.id) + '\')"><b dir="ltr">' + escapeHtml(w.name) + "</b></button>";
      }).join("") + "</div>" : "") +
      '<input class="qs-search" id="myStockSearch" type="search" dir="ltr" autocomplete="off" placeholder="' + escapeHtml(t("Search item in my stock")) + '" value="' + escapeHtml(q) + '" oninput="renderMyStock(this.value)">' +
      '<div id="myStockList" class="mystock-list"></div></div>';
  }
  $("myStockSum").textContent = list.length + " " + t("items") + " · " + formatNumber(d.units || 0) + " " + t("units") + " · " + t("View only");
  $("myStockList").innerHTML = rows || '<p class="empty">' + escapeHtml(t("Nothing in stock.")) + "</p>";
  updatePageTitle("mystock");
}



/* ============================================================
   SALE SCREEN EXTRAS: minimum rate, serial numbers, packages
   ============================================================ */
function qsMinFor(it) {
  if (isBuy() || isInward() || isQuote() || isAdminUser()) return 0;
  const p = qsProduct(it.id);
  return p ? qsNum(p.minPrice) : 0;
}

function qsBelowMin() {
  for (let i = 0; i < qs.items.length; i++) {
    const it = qs.items[i], min = qsMinFor(it);
    if (min > 0 && qsNum(it.rate) < min) return { name: it.name, min: min };
  }
  return null;
}

// Under each item: the minimum rate (staff) and a box for serial numbers (items with warranty).
function qsItemExtras(it, i) {
  let html = "";
  // Selling more than the ERP shows: allowed, but say so (the owner gets a "check the stock" note).
  if (!isBuy() && !isInward() && !isQuote() && !it.isNew && it.stock != null && it.qty > it.stock) {
    html += '<div class="qs-min low">' + escapeHtml(t("ERP stock here is only")) + " " + escapeHtml(String(it.stock)) + ". " +
      escapeHtml(t(isShopUser() ? "The rest comes from the main godam, or the owner is told to check the stock." : "The owner will be told to check the stock.")) + "</div>";
  }
  const min = qsMinFor(it);
  if (min > 0) {
    const low = qsNum(it.rate) > 0 && qsNum(it.rate) < min;
    html += '<div class="qs-min' + (low ? " low" : "") + '">' + escapeHtml(t("Lowest rate")) + ': <b dir="ltr">' + qsMoney(min) + "</b></div>";
  }
  const p = qsProduct(it.id);
  if (!isBuy() && !isInward() && !isQuote() && p && qsNum(p.warrantyMonths) > 0) {
    html += '<label class="qs-serial"><small>' + escapeHtml(t("Serial number")) + (it.qty > 1 ? " (" + it.qty + ", " + escapeHtml(t("one per line or comma")) + ")" : "") +
      " · " + qsNum(p.warrantyMonths) + " " + escapeHtml(t("months warranty")) + '</small><input type="text" dir="ltr" autocapitalize="characters" value="' + escapeHtml(it.serials || "") +
      '" oninput="qs.items[' + i + '].serials=this.value"></label>';
  }
  return html;
}

function qsPackageButtons() {
  if (isBuy()) return "";
  const pk = state.packages || [];
  let html = "";
  if (pk.length) {
    html += '<div class="qs-packs"><h4>' + escapeHtml(t("Packages")) + "</h4>" + pk.map(function (k, i) {
      return '<button type="button" class="qs-pack" onclick="qsAddPackage(' + i + ')"><b dir="ltr">' + escapeHtml(k.name) + "</b><small>" + k.items.length + " " + escapeHtml(t("items")) + "</small></button>";
    }).join("") + "</div>";
  }
  if (isAdminUser() && qs.items.length > 1 && !isInward()) {
    html += '<button type="button" class="qs-more" onclick="qsSavePackage()">' + escapeHtml(t("Save these items as a package")) + "</button>";
  }
  return html;
}

async function loadPackages() {
  try { state.packages = await call("packages", {}); } catch (e) { state.packages = state.packages || []; }
}

function qsAddPackage(i) {
  const k = (state.packages || [])[i];
  if (!k) return;
  const missing = [];
  k.items.forEach(function (pi) {
    const p = qsProduct(pi.productId);
    if (!p) { missing.push(pi.name); return; }
    const have = qs.items.find(function (x) { return x.id === p.id; });
    const max = isInward() ? Math.max(0, qsOwnerStock(p)) : (isQuote() ? 99999 : Math.max(0, qsNum(p.stock)));
    if (max <= 0) { missing.push(p.name); return; }
    if (have) { have.qty = Math.min(have.max, have.qty + pi.qty); return; }
    const last = qsLastRate(p.id);
    qs.items.push({ id: p.id, name: p.name, qty: Math.min(pi.qty, max), max: max, rate: last > 0 ? last : qsNum(p.price), fromLast: last > 0, edited: false });
  });
  renderQuick();
  if (missing.length) showToast(t("Not in stock") + ": " + missing.join(", "));
}

async function qsSavePackage() {
  const name = prompt(t("Package name, for example 5 kW system"));
  if (!name) return;
  try {
    await call("savepackage", { name: name, items: qs.items.filter(function (it) { return !it.isNew; }).map(function (it) { return { productId: it.id, qty: it.qty }; }) });
    await loadPackages();
    showToast(t("Package saved."));
    renderQuick();
  } catch (error) { showError(error.message || "Could not save the package."); }
}


/* ============================================================
   OFFLINE: sales and payments wait on the phone until the internet is back
   ============================================================ */
function newClientRef() {
  return (state.user ? state.user.userId : "open") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function isNetworkError(error) {
  return (typeof navigator !== "undefined" && navigator.onLine === false) || /failed to fetch|networkerror|load failed|network request failed/i.test(String((error && error.message) || error));
}

function outboxList() {
  try { return JSON.parse(localStorage.getItem("erpOutbox") || "[]"); } catch (e) { return []; }
}

function outboxSave(list) {
  try { localStorage.setItem("erpOutbox", JSON.stringify(list)); } catch (e) { /* storage full */ }
  outboxBadge();
}

function outboxAdd(action, payload, label) {
  const list = outboxList();
  list.push({ action: action, payload: payload, label: label, at: new Date().toISOString(), error: "" });
  outboxSave(list);
}

let outboxBusy = false;
async function outboxSync() {
  if (outboxBusy) return;
  const list = outboxList();
  if (!list.length) return;
  outboxBusy = true;
  let sent = 0;
  try {
    for (let i = 0; i < list.length; i++) {
      const job = list[i];
      try {
        await call(job.action, job.payload);
        list.splice(i, 1); i--; sent++;
        outboxSave(list);
      } catch (error) {
        if (isNetworkError(error)) break;            // still offline: try later
        job.error = String(error.message || error);  // the backend refused it: keep it for the owner to see
        outboxSave(list);
      }
    }
  } finally { outboxBusy = false; }
  if (sent) { showToast(sent + " " + t("saved entries were sent.")); state.dashboard = null; }
}

function outboxBadge() {
  const bar = document.querySelector(".topbar-actions");
  if (!bar) return;
  let b = $("outboxBadge");
  const list = outboxList();
  if (!list.length) { if (b) b.remove(); return; }
  if (!b) {
    b = document.createElement("button");
    b.id = "outboxBadge"; b.type = "button"; b.className = "outbox-badge";
    b.addEventListener("click", showOutbox);
    bar.insertBefore(b, bar.firstChild);
  }
  const bad = list.filter(function (x) { return x.error; }).length;
  b.textContent = list.length + " " + t("waiting") + (bad ? " (" + bad + " " + t("problem") + ")" : "");
  b.classList.toggle("bad", !!bad);
}

function showOutbox() {
  const list = outboxList();
  contentElement().innerHTML = '<div class="content bills-page"><div class="toolbar"><div><h2>' + escapeHtml(t("Saved on this phone")) + "</h2><p>" +
    escapeHtml(t("These will be sent when the internet is back.")) + '</p></div><button class="btn primary" type="button" onclick="outboxSync().then(showOutbox)">' + escapeHtml(t("Send now")) + "</button></div>" +
    '<div class="bills-list">' + (list.map(function (x, i) {
      return '<div class="bill-row"><div class="bill-main"><b>' + escapeHtml(x.label || x.action) + "</b><small>" + escapeHtml(formatDate(x.at)) + " " + escapeHtml(String(x.at).slice(11, 16)) + "</small>" +
        (x.error ? '<small class="out">' + escapeHtml(x.error) + "</small>" : "") + "</div>" +
        (x.error ? '<div class="bill-actions"><button class="btn danger ledger-action-btn" type="button" onclick="outboxDrop(' + i + ')">' + escapeHtml(t("Remove")) + "</button></div>" : "") + "</div>";
    }).join("") || '<p class="empty">' + escapeHtml(t("Nothing waiting.")) + "</p>") + "</div></div>";
}

function outboxDrop(i) {
  const list = outboxList();
  if (!confirm(t("Remove this entry? It will not be saved."))) return;
  list.splice(i, 1);
  outboxSave(list);
  showOutbox();
}

function qsOfflineDone() {
  const r = qs.result || {};
  return '<div class="qs-head"><b>' + escapeHtml(t("Saved on this phone")) + "</b></div>" +
    '<div class="qs-done"><div class="qs-tick qs-wait">⏳</div><h3>' + escapeHtml(t("No internet")) + "</h3>" +
    "<p>" + escapeHtml(t("This entry is saved on the phone and will be sent by itself when the internet is back. Do not enter it again.")) + "</p>" +
    '<div class="qs-sum"><div><span>' + escapeHtml(t("Total")) + '</span><b dir="ltr">' + qsMoney(r.netTotal) + "</b></div>" +
    "<div><span>" + escapeHtml(isBuy() ? t("Paid") : t("Received")) + '</span><b dir="ltr">' + qsMoney(r.paid) + "</b></div></div>" +
    '<div class="qs-row2"><button type="button" class="qs-btn" onclick="showPage(homePage())">' + escapeHtml(t("Home")) + "</button>" +
    '<button type="button" class="qs-btn qs-primary" onclick="qsNewSale()">' + escapeHtml(t(isBuy() ? "New Purchase" : "New Sale")) + "</button></div></div>";
}

window.addEventListener("online", function () { outboxSync(); });
window.addEventListener("load", function () { setTimeout(function () { outboxBadge(); outboxSync(); }, 3000); setInterval(outboxSync, 60000); });


/* ============================================================
   RECEIVE PAYMENT: customer pays old credit (udhaar)
   ============================================================ */
const rp = { data: null, step: 1, q: "", customer: null, amount: "", method: "cash", note: "", saving: false, result: null, ref: "" };

async function loadReceive() {
  rp.step = 1; rp.q = ""; rp.customer = null; rp.amount = ""; rp.method = "cash"; rp.note = ""; rp.result = null; rp.ref = ""; rp.cashTo = ""; rp.payAccount = ""; rp.payRef = ""; rp.slip = null;
  rp.bills = null; rp.ticked = {};
  try { rp.data = JSON.parse(localStorage.getItem("erpQuick_receive_" + (state.user ? state.user.userId : "open")) || "null"); } catch (e) { rp.data = null; }
  if (rp.data) renderReceive();
  try {
    rp.data = await call("receivedata", {});
    try { localStorage.setItem("erpQuick_receive_" + (state.user ? state.user.userId : "open"), JSON.stringify(rp.data)); } catch (e) { /* private */ }
  } catch (error) {
    if (!rp.data) { contentElement().innerHTML = '<div class="content"><p class="empty">' + escapeHtml(error.message || "") + "</p></div>"; return; }
  }
  if (state.page === "receive" && rp.step === 1) renderReceive();
}

function rpWrap(inner) {
  const ur = getLang() === "ur";
  contentElement().innerHTML = '<div class="content"><div class="qs' + (ur ? " qs-ur" : "") + '"' + (ur ? ' dir="rtl"' : "") + ">" + inner + "</div></div>";
  updatePageTitle("receive");
}

function renderReceive() {
  if (rp.step === 3) return rpDone();
  const head = '<div class="qs-head">' + (rp.step === 2 ? '<button class="qs-back" type="button" onclick="rp.step=1;renderReceive()">‹</button>' : "") + "<b>" + escapeHtml(t("Receive Payment")) + "</b></div>";
  if (rp.step === 1) {
    const q = rp.q.trim().toLowerCase(), qd = q.replace(/\D/g, "");
    const all = ((rp.data && rp.data.customers) || []).filter(function (c) { return !/^cash customer$|^walk-?in/i.test(c.name); });
    const list = q ? all.filter(function (c) { return c.name.toLowerCase().indexOf(q) !== -1 || (qd.length >= 3 && String(c.phone || "").replace(/\D/g, "").indexOf(qd) !== -1); }).slice(0, 12)
      : all.filter(function (c) { return c.score > 0; }).slice(0, 8);
    rpWrap(head + '<div class="qs-steps"><i class="on"></i><i></i><i></i></div><div class="qs-body">' +
      '<select class="qs-search rp-select" dir="ltr" onchange="if(this.value)rpPick(this.value)"><option value="">' + escapeHtml(t("Select customer")) + "</option>" +
      all.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (c) {
        return '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + (c.balance != null && c.balance > 0.5 ? " (" + qsMoney(c.balance) + ")" : "") + "</option>";
      }).join("") + "</select>" +
      '<input class="qs-search" id="rpSearch" type="search" dir="ltr" autocomplete="off" placeholder="' + escapeHtml(t("Or search name or mobile number")) + '" value="' + escapeHtml(rp.q) + '" oninput="rpSearch(this.value)">' +
      '<div class="qs-grid">' + (list.map(function (c) {
        const b = c.balance == null ? "" : '<small class="' + (c.balance > 0.5 ? "due" : "") + '" dir="ltr">' + escapeHtml(t("Due")) + " " + qsMoney(c.balance) + "</small>";
        return '<button type="button" class="qs-cust" onclick="rpPick(\'' + escapeHtml(c.id) + '\')"><span dir="ltr">' + escapeHtml(c.name) + "</span>" + b + "</button>";
      }).join("") || '<p class="qs-empty">' + escapeHtml(t(q ? "No customer found" : "Search the customer above.")) + "</p>") + "</div></div>");
    return;
  }
  const seg = ["cash", "online", "cheque"].map(function (m) {
    return '<button type="button" class="' + (rp.method === m ? "sel" : "") + '" onclick="rp.method=\'' + m + '\';renderReceive()">' + escapeHtml(t(m.charAt(0).toUpperCase() + m.slice(1))) + "</button>";
  }).join("");
  const c = rp.customer;
  rpWrap(head + '<div class="qs-steps"><i class="on"></i><i class="on"></i><i></i></div><div class="qs-body">' +
    '<div class="qs-total"><small>' + escapeHtml(t("Payment from")) + ' </small><span dir="ltr">' + escapeHtml(c.name) + "</span>" +
    (c.balance != null ? '<small dir="ltr">' + escapeHtml(t("Due")) + " " + qsMoney(c.balance) + "</small>" : "") + "</div>" +
    rpBillsHtml() +
    '<label class="qs-amt"><small>' + escapeHtml(t("Amount received")) + '</small><span dir="ltr">Rs. <input id="rpAmount" type="text" inputmode="decimal" value="' + escapeHtml(rp.amount) + '" oninput="rp.amount=this.value"></span></label>' +
    '<div class="qs-seg">' + seg + "</div>" +
    (rp.method === "cash" ? cashToHtml(rp.data && rp.data.cashKeepers, rp.cashTo, "rpSetCashTo") : payDetailsHtml("rp", rp.data && rp.data.accounts)) +
    '<label class="qs-amt qs-note"><small>' + escapeHtml(t("Note")) + '</small><input type="text" value="' + escapeHtml(rp.note) + '" oninput="rp.note=this.value"></label>' +
    "</div>" +
    '<div class="qs-bar"><div class="t"><small>' + escapeHtml(t("Receive Payment")) + '</small></div><button type="button" class="qs-btn qs-primary" id="rpSave" onclick="rpSave()"' + (rp.saving ? " disabled" : "") + ">" +
    escapeHtml(rp.saving ? t("Saving...") : t("Save")) + "</button></div>");
  const el = $("rpAmount"); if (el && !rp.amount) el.focus();
}

function rpSearch(v) {
  rp.q = v;
  renderReceive();
  const el = $("rpSearch"); if (el) { el.focus(); try { el.setSelectionRange(v.length, v.length); } catch (e) { /* search */ } }
}

function rpPick(id) {
  rp.customer = ((rp.data && rp.data.customers) || []).find(function (c) { return c.id === id; });
  if (!rp.customer) return;
  rp.step = 2; rp.ref = newClientRef(); rp.bills = null; rp.ticked = {};
  renderReceive();
  call("openbills", { customerId: id }).then(function (list) {
    if (!rp.customer || rp.customer.id !== id) return;
    rp.bills = list || [];
    if (state.page === "receive" && rp.step === 2) { const keep = rp.amount; renderReceive(); rp.amount = keep; }
  }).catch(function () { rp.bills = []; });
}

// The customer's unpaid bills, each with a tick. The amount is the total of the ticked bills.
function rpBillsHtml() {
  if (rp.bills === null) return '<p class="qs-hint">' + escapeHtml(t("Loading bills...")) + "</p>";
  if (!rp.bills.length) return "";
  const all = rp.bills.every(function (b) { return rp.ticked[b.saleId]; });
  return '<div class="rp-bills"><div class="rp-bills-head"><b>' + escapeHtml(t("Unpaid bills")) + '</b><label class="qs-check"><input type="checkbox"' + (all ? " checked" : "") + ' onchange="rpTickAll(this.checked)"> ' + escapeHtml(t("All")) + "</label></div>" +
    rp.bills.map(function (b) {
      return '<label class="rp-bill' + (rp.ticked[b.saleId] ? " on" : "") + '"><input type="checkbox"' + (rp.ticked[b.saleId] ? " checked" : "") + ' onchange="rpTick(\'' + escapeHtml(b.saleId) + '\',this.checked)">' +
        '<span><b dir="ltr">' + escapeHtml(b.no) + "</b><small>" + escapeHtml(formatDate(b.date)) + " · " + escapeHtml(t("Bill")) + " " + qsMoney(b.total) + '</small></span><em dir="ltr">' + qsMoney(b.due) + "</em></label>";
    }).join("") + "</div>";
}

function rpTick(id, on) {
  if (on) rp.ticked[id] = true; else delete rp.ticked[id];
  rpTickedToAmount();
}
function rpTickAll(on) { rp.ticked = {}; if (on) rp.bills.forEach(function (b) { rp.ticked[b.saleId] = true; }); rpTickedToAmount(); }
function rpTickedToAmount() {
  const sum = (rp.bills || []).filter(function (b) { return rp.ticked[b.saleId]; }).reduce(function (a, b) { return a + b.due; }, 0);
  rp.amount = sum > 0 ? String(Math.round(sum * 100) / 100) : "";
  renderReceive();
}

async function rpSave() {
  const amount = qsNum(rp.amount);
  if (!(amount > 0)) { showError(t("Enter the amount received.")); return; }
  const payload = { customerId: rp.customer.id, amount: amount, method: rp.method, note: rp.note, clientRef: rp.ref || (rp.ref = newClientRef()) };
  const ticked = (rp.bills || []).filter(function (b) { return rp.ticked[b.saleId]; }).map(function (b) { return { saleId: b.saleId }; });
  if (ticked.length) payload.bills = ticked;
  if (rp.method === "cash" && rp.cashTo) payload.cashTo = rp.cashTo;
  if (rp.method !== "cash") {
    if (rp.payAccount) payload.payAccount = rp.payAccount;
    if (rp.payRef) payload.payRef = rp.payRef;
    if (rp.slip) payload.slip = { data: rp.slip.data, type: rp.slip.type };
  }
  rp.saving = true; renderReceive();
  try {
    rp.result = await call("receivepayment", payload);
    rp.step = 3;
  } catch (error) {
    if (isNetworkError(error)) {
      outboxAdd("receivepayment", payload, t("Payment") + " " + rp.customer.name + " " + qsMoney(amount));
      rp.result = { offline: true, amount: amount, customerName: rp.customer.name, method: rp.method };
      rp.step = 3;
    } else showError(error.message || "Could not save.");
  } finally { rp.saving = false; renderReceive(); }
}

function rpDone() {
  const r = rp.result || {};
  rpWrap('<div class="qs-head"><b>' + escapeHtml(t(r.offline ? "Saved on this phone" : "Payment saved")) + "</b></div>" +
    '<div class="qs-done"><div class="qs-tick' + (r.offline ? " qs-wait" : "") + '">' + (r.offline ? "⏳" : "✓") + "</div><h3 dir=\"ltr\">" + qsMoney(r.amount) + "</h3>" +
    "<p>" + escapeHtml(r.offline ? t("This entry is saved on the phone and will be sent by itself when the internet is back. Do not enter it again.") : t("Received from") + " " + (r.customerName || "")) + "</p>" +
    ((r.bills || []).length ? "<p>" + escapeHtml(t("For bills")) + ": " + escapeHtml(r.bills.map(function (b) { return b.no + " (" + qsMoney(b.amount) + ")"; }).join(", ")) + "</p>" : "") +
    (r.newBalance != null && !r.offline ? '<div class="qs-sum"><div><span>' + escapeHtml(t("New balance")) + '</span><b dir="ltr">' + qsMoney(r.newBalance) + "</b></div></div>" : "") +
    (r.offline ? "" : '<button type="button" class="qs-btn qs-wa" onclick="rpWhatsApp()">' + escapeHtml(t("Send receipt on WhatsApp")) + "</button>") +
    '<div class="qs-row2"><button type="button" class="qs-btn" onclick="showPage(homePage())">' + escapeHtml(t("Home")) + "</button>" +
    '<button type="button" class="qs-btn qs-primary" onclick="loadReceive()">' + escapeHtml(t("New payment")) + "</button></div></div>");
}

function rpWhatsApp() {
  const r = rp.result || {};
  const co = r.company || {};
  const lines = ["*" + (co.name || "ARHAM ELECTRONICS") + "*", "Payment receipt " + (r.paymentId || ""), "Date: " + formatDate(r.date || new Date()), "",
    "Received from: " + (r.customerName || ""), "*Amount: " + qsMoney(r.amount) + "* (" + (r.method || "cash") + ")"];
  if (r.account || r.txnRef) lines.push("Paid " + (r.method || "online") + (r.account ? " to " + r.account : "") + (r.txnRef ? ", ref " + r.txnRef : ""));
  if (r.newBalance != null) lines.push("Balance now: " + qsMoney(r.newBalance));
  lines.push("", "Thank you.");
  showWhatsAppPanel("Send receipt", r.customerName, r.customerPhone, lines.join("\n"));
}


/* ============================================================
   CASH: cash in hand at the shop, and handing it to the owner
   ============================================================ */
async function loadCash(userId) {
  try {
    const both = await Promise.all([call("cashstatus", userId ? { userId: userId } : {}), isAdminUser() ? call("cashpeople", {}) : null]);
    state.cash = both[0]; state.cashPeople = both[1];
  } catch (error) { showError(error.message || "Could not load cash."); return; }
  renderCash();
}

function renderCash() {
  const c = state.cash || {};
  const ur = getLang() === "ur";
  const mine = !c.userId || c.userId === c.me;
  const when = function (d) { return escapeHtml(formatDate(d)) + " " + escapeHtml(String(d || "").slice(11, 16)); };
  const people = isAdminUser() && state.cashPeople ? '<div class="panel"><div class="panel-header"><h3>' + escapeHtml(t("Cash with each person")) + "</h3></div>" +
    '<div class="table-wrap"><table class="table"><thead><tr><th>' + escapeHtml(t("Person")) + "</th><th>" + escapeHtml(t("Shop")) + '</th><th class="num">' + escapeHtml(t("Cash with them")) +
    '</th><th class="num">' + escapeHtml(t("Received today")) + '</th><th class="num">' + escapeHtml(t("Waiting to confirm")) + "</th><th></th></tr></thead><tbody>" +
    state.cashPeople.map(function (x) {
      return "<tr" + (x.userId === c.userId ? ' class="sel-row"' : "") + "><td><b>" + escapeHtml(x.name) + "</b>" + (x.owner ? ' <span class="badge">' + escapeHtml(t("Owner")) + "</span>" : (x.keeper ? ' <span class="badge">' + escapeHtml(t("Cash keeper")) + "</span>" : "")) +
        "</td><td>" + escapeHtml(x.shopName) + '</td><td class="num"><b>' + money(x.inHand) + '</b></td><td class="num">' + money(x.todayIn) + '</td><td class="num">' +
        (x.pendingIn || x.pendingOut ? money(x.pendingIn + x.pendingOut) : "") + '</td><td><button class="btn secondary ledger-action-btn" type="button" onclick="loadCash(\'' + escapeHtml(x.userId) + '\')">' + escapeHtml(t("Open")) + "</button></td></tr>";
    }).join("") + "</tbody></table></div></div>" : "";
  const waiting = (c.pendingIn || []).map(function (e) {
    return '<div class="cash-wait"><div><b dir="ltr">' + qsMoney(e.amount) + "</b> " + escapeHtml(t("from")) + " <b>" + escapeHtml(e.fromName) + "</b><small>" + when(e.date) + (e.text ? " · " + escapeHtml(e.text) : "") + "</small></div>" +
      ((mine || isAdminUser()) ? '<div class="cash-wait-btns"><button class="btn secondary" type="button" onclick="cashConfirm(\'' + escapeHtml(e.id) + '\',false)">' + escapeHtml(t("Not received")) + '</button><button class="btn primary" type="button" onclick="cashConfirm(\'' + escapeHtml(e.id) + '\',true)">' + escapeHtml(t("Received")) + "</button></div>" : "") + "</div>";
  }).join("");
  const sent = (c.pendingOut || []).map(function (e) {
    return '<div class="cash-wait out"><div><b dir="ltr">' + qsMoney(e.amount) + "</b> " + escapeHtml(t("to")) + " <b>" + escapeHtml(e.toName) + "</b><small>" + when(e.date) + " · " + escapeHtml(t("waiting for them to confirm")) + "</small></div></div>";
  }).join("");
  const keepers = c.keepers || [];
  contentElement().innerHTML = '<div class="content cash-page"' + (ur ? ' dir="rtl"' : "") + ">" + moneyTabsHtml("hand") +
    '<div class="toolbar"><div><h2>' + escapeHtml(mine ? t("My cash") : t("Cash") + " · " + (c.name || "")) + "</h2><p>" + escapeHtml(t("Cash from sales and payments, and cash handed from one person to another.")) + "</p></div>" +
    (mine && canOpen("receive") ? '<div class="toolbar-actions"><button class="btn primary" type="button" onclick="showPage(\'receive\')">+ ' + escapeHtml(t("Receive Payment")) + "</button></div>" : "") + "</div>" +
    (waiting ? '<div class="panel cash-alert"><h3>' + escapeHtml(t("Cash handed to you. Did you get it?")) + "</h3>" + waiting + "</div>" : "") +
    '<div class="cash-cards"><div class="cash-main"><small>' + escapeHtml(mine ? t("Cash with me") : t("Cash with") + " " + (c.name || "")) + '</small><b dir="ltr">' + qsMoney(c.inHand) + "</b></div>" +
    '<div><small>' + escapeHtml(t("Received today")) + '</small><b dir="ltr">' + qsMoney(c.todayIn) + "</b></div>" +
    '<div><small>' + escapeHtml(t("Handed over today")) + '</small><b dir="ltr">' + qsMoney(c.todayHanded) + "</b></div></div>" +
    (sent ? '<div class="panel"><h3>' + escapeHtml(t("Handed over, not confirmed yet")) + "</h3>" + sent + "</div>" : "") +
    (keepers.length && (mine || isAdminUser()) ? cashHandHtml(c, keepers, mine) : "") +
    people +
    "<h4>" + escapeHtml(t("Recent")) + '</h4><div class="bills-list">' + ((c.moves || []).map(function (m) {
      return '<div class="bill-row"><div class="bill-main"><b>' + escapeHtml(m.text) + "</b><small>" + when(m.date) + '</small></div><div class="bill-amt"><b dir="ltr" class="' +
        (m.kind === "out" ? "out" : "in") + '">' + (m.kind === "out" ? "- " : "+ ") + qsMoney(m.amount) + "</b></div></div>";
    }).join("") || '<p class="empty">' + escapeHtml(t("No cash yet.")) + "</p>") + "</div></div>";
  updatePageTitle("cash");
}

/* ---------- Hand over cash: all in one place ----------
   Salesman: the cash of each bill, one tap per bill (or all bills).
   Manager / cash keeper: all the cash at once, or a part of it. */
function cashHandTo(keepers) {
  let id = "";
  try { id = localStorage.getItem("arhamHandTo") || ""; } catch (e) { /* private mode */ }
  const k = keepers.find(function (x) { return x.userId === (state.handTo || id); }) || keepers.find(function (x) { return x.owner; }) || keepers[0];
  return k;
}
function cashHandHtml(c, keepers, mine) {
  const to = cashHandTo(keepers);
  const bills = mine ? (c.bills || []) : [];
  const billTotal = bills.reduce(function (a, b) { return a + (Number(b.amount) || 0); }, 0);
  const inHand = Math.max(0, Math.round(Number(c.inHand) || 0));
  return '<div class="panel ch-panel"><h3>' + escapeHtml(t("Hand over cash")) + "</h3>" +
    '<div class="ch-to"><small>' + escapeHtml(t("Give to")) + '</small><div class="qs-seg">' + keepers.map(function (k) {
      return '<button type="button" class="' + (k.userId === to.userId ? "sel" : "") + '" onclick="cashHandPick(\'' + escapeHtml(k.userId) + '\')">' + escapeHtml(k.name) + (k.owner ? " (" + escapeHtml(t("Owner")) + ")" : "") + "</button>";
    }).join("") + "</div></div>" +
    (bills.length ? '<div class="ch-bills"><div class="ch-bills-head"><b>' + escapeHtml(t("Cash of my bills")) + '</b><button type="button" class="qs-btn qs-primary" onclick="cashHandBills(\'all\')">' +
        escapeHtml(t("Hand over all bills")) + ' <span dir="ltr">' + qsMoney(billTotal) + "</span></button></div>" +
      bills.map(function (b) {
        return '<div class="ch-bill"><div><b>' + escapeHtml(b.no) + "</b> · " + escapeHtml(b.customer) + "<small>" + escapeHtml(formatDate(b.date)) + '</small></div><b dir="ltr">' + qsMoney(b.amount) + "</b>" +
          '<button type="button" class="qs-btn" onclick="cashHandBills(\'' + escapeHtml(b.saleId) + '\')">' + escapeHtml(t("Hand over")) + " →</button></div>";
      }).join("") + "</div>" : "") +
    '<div class="ch-amt"><b>' + escapeHtml(t(bills.length ? "Or hand over an amount" : "Hand over an amount")) + "</b>" +
      '<div class="ch-amt-row"><button type="button" class="qs-btn qs-primary" ' + (inHand > 0 ? "" : "disabled ") + 'onclick="cashHandAmount(' + inHand + ')">' + escapeHtml(t("Hand over all")) + ' <span dir="ltr">' + qsMoney(inHand) + "</span></button>" +
      '<span class="ch-part"><input id="chPart" type="text" inputmode="decimal" placeholder="' + escapeHtml(t("Part amount")) + '"><input id="chNote" type="text" placeholder="' + escapeHtml(t("Note")) + '">' +
      '<button type="button" class="qs-btn" onclick="cashHandAmount(-1)">' + escapeHtml(t("Hand over part")) + "</button></span></div></div></div>";
}
function cashHandPick(id) {
  state.handTo = id;
  try { localStorage.setItem("arhamHandTo", id); } catch (e) { /* private mode */ }
  renderCash();
}
async function cashHandAfter(msg) {
  showToast(msg + ". " + t("It moves when they press Received."));
  const c = state.cash || {};
  state.cash = await call("cashstatus", c.userId && c.userId !== c.me ? { userId: c.userId } : {});
  if (isAdminUser()) state.cashPeople = await call("cashpeople", {});
  renderCash();
}
async function cashHandBills(which) {
  const c = state.cash || {};
  const to = cashHandTo(c.keepers || []);
  const list = which === "all" ? (c.bills || []) : (c.bills || []).filter(function (b) { return b.saleId === which; });
  if (!to || !list.length) return;
  if (which === "all" && !confirm(t("Hand over the cash of") + " " + list.length + " " + t(list.length === 1 ? "bill" : "bills") + " (" + qsMoney(list.reduce(function (a, b) { return a + b.amount; }, 0)) + ") " + t("to") + " " + to.name + "?")) return;
  document.querySelectorAll(".ch-panel button").forEach(function (x) { x.disabled = true; });
  try {
    const r = await call("cashhandover", { saleIds: list.map(function (b) { return b.saleId; }), toId: to.userId });
    await cashHandAfter(qsMoney(r.total) + " (" + list.map(function (b) { return b.no; }).slice(0, 3).join(", ") + (list.length > 3 ? "…" : "") + ") → " + to.name);
  } catch (error) { document.querySelectorAll(".ch-panel button").forEach(function (x) { x.disabled = false; }); showError(error.message || "Could not save."); }
}
async function cashHandAmount(amount) {
  const c = state.cash || {};
  const to = cashHandTo(c.keepers || []);
  const mine = !c.userId || c.userId === c.me;
  if (amount < 0) amount = qsNum(($("chPart") || {}).value || "");
  if (!(amount > 0)) { showError(t("Enter the amount handed over.")); return; }
  if (!to) { showError(t("Choose who gets the cash.")); return; }
  if (!confirm(t("Hand over") + " " + qsMoney(amount) + " → " + to.name + "?")) return;
  document.querySelectorAll(".ch-panel button").forEach(function (x) { x.disabled = true; });
  try {
    await call("cashhandover", { amount: amount, toId: to.userId, note: (($("chNote") || {}).value || "").trim(), fromId: mine ? "" : c.userId });
    await cashHandAfter(qsMoney(amount) + " → " + to.name);
  } catch (error) { document.querySelectorAll(".ch-panel button").forEach(function (x) { x.disabled = false; }); showError(error.message || "Could not save."); }
}

async function cashConfirm(id, ok) {
  if (!ok && !confirm(t("Mark as NOT received? The cash goes back to the sender."))) return;
  try {
    state.cash = await call("cashconfirm", { handoverId: id, ok: ok });
    if (isAdminUser()) state.cashPeople = await call("cashpeople", {});
    showToast(ok ? t("Cash received.") : t("Sent back to the sender."));
    renderCash();
    cashBell();
  } catch (error) { showError(error.message || "Could not save."); }
}


/* ============================================================
   DAILY REPORT and PROFIT BY SHOP / SALESMAN (owner)
   ============================================================ */
async function loadDaily(day) {
  const d = day || localDay();
  const monthStart = d.slice(0, 8) + "01";
  try {
    const both = await Promise.all([call("dailyreport", { date: d }), call("profitbyshop", { from: state.profitFrom || monthStart, to: state.profitTo || d }), call("cashall", {})]);
    state.daily = both[0]; state.profit = both[1]; state.cashAll = both[2];
  } catch (error) { showError(error.message || "Could not load the report."); return; }
  renderDaily();
}

function renderDaily() {
  const r = state.daily || { shops: [], total: {}, lowStock: [], topItems: [] };
  const pr = state.profit || { shops: [], users: [] };
  const row = function (cells, cls) { return "<tr" + (cls ? ' class="' + cls + '"' : "") + ">" + cells.map(function (c, i) { return "<td" + (i ? ' class="num"' : "") + ">" + c + "</td>"; }).join("") + "</tr>"; };
  const profitTable = function (list, label) {
    return '<div class="table-wrap"><table class="table"><thead><tr><th>' + label + '</th><th class="num">Bills</th><th class="num">Goods sold</th><th class="num">Cost</th><th class="num">Commission</th><th class="num">Profit</th><th class="num">Margin</th><th class="num">Labour / rent (not profit)</th></tr></thead><tbody>' +
      (list.map(function (x) { return row([escapeHtml(x.name) + (x.itemsWithoutCost ? ' <span class="badge warning">' + x.itemsWithoutCost + " item(s) without cost</span>" : ""), x.bills, money(x.sales), money(x.cost), x.commission ? money(x.commission) : "-", "<b>" + money(x.profit) + "</b>", x.margin + "%", x.charges ? money(x.charges) : "-"]); }).join("") ||
        '<tr><td colspan="8" class="empty">No sales in these dates.</td></tr>') + "</tbody></table></div>";
  };
  contentElement().innerHTML = '<div class="content">' +
    '<div class="toolbar"><div><h2>Daily Report</h2><p>Every shop on one page. Send it to your WhatsApp with one tap.</p></div>' +
    '<div class="toolbar-actions"><input type="date" id="dailyDate" class="search" value="' + escapeHtml(r.date || "") + '" onchange="loadDaily(this.value)">' +
    '<button class="btn primary" type="button" onclick="dailyWhatsApp()">Send on WhatsApp</button></div></div>' +
    '<div class="cash-cards"><div class="cash-main"><small>Total sales</small><b>' + money(r.total.sales) + "</b><small>" + (r.total.bills || 0) + " bills</small></div>" +
    "<div><small>Cash received</small><b>" + money(r.total.cash) + "</b>" +
      (r.total.commissionCash ? "<small>− commission " + money(r.total.commissionCash) + " = <b>" + money(r.total.cashNet) + "</b> in hand</small>" : "") + "</div>" +
    "<div><small>Credit given</small><b>" + money(r.total.credit) + "</b></div><div><small>Old credit received</small><b>" + money(r.total.received) + "</b></div>" +
    (r.total.commission ? "<div><small>Commission (not on bills)</small><b>" + money(r.total.commission) + "</b></div>" : "") +
    (r.total.charges ? "<div><small>Labour / rent / installation</small><b>" + money(r.total.charges) + "</b><small>on bills, not profit</small></div>" : "") + "</div>" +
    '<div class="panel"><div class="panel-header"><h3>Shops on ' + escapeHtml(formatDate(r.date)) + '</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Shop</th><th class="num">Bills</th><th class="num">Sales</th><th class="num">Cash</th><th class="num">Credit given</th><th class="num">Old credit received</th><th class="num">Units</th><th class="num">Cash in hand now</th></tr></thead><tbody>' +
    (r.shops.map(function (s) {
      const ch = (state.cashAll || []).find(function (c) { return c.shopId === s.shopId; });
      return row([escapeHtml(s.shopName), s.bills, money(s.sales), money(s.cash) + (s.commissionCash ? "<br><small>after commission " + money(s.cashNet) + "</small>" : ""), money(s.credit), money(s.received), formatNumber(s.units), ch ? money(ch.inHand) : ""]);
    }).join("") || '<tr><td colspan="8" class="empty">No sales on this day.</td></tr>') + "</tbody></table></div></div>" +
    '<div class="two-col"><div class="panel"><div class="panel-header"><h3>Top items</h3></div>' + (r.topItems.map(function (x) { return '<div class="mini-row"><span>' + (x.id ? cardLink("product", x.id, x.name) : escapeHtml(x.name)) + "</span><b>" + formatNumber(x.qty) + "</b></div>"; }).join("") || '<p class="empty">None</p>') + "</div>" +
    '<div class="panel"><div class="panel-header"><h3>Low stock</h3></div>' + (r.lowStock.map(function (x) { return '<div class="mini-row"><span>' + (x.id ? cardLink("product", x.id, x.name) : escapeHtml(x.name)) + "</span><b>" + formatNumber(x.stock) + " / " + formatNumber(x.min) + "</b></div>"; }).join("") || '<p class="empty">Nothing is below its minimum.</p>') + "</div></div>" +
    '<div class="panel"><div class="panel-header"><div><h3>Profit by shop and salesman</h3><p style="margin:4px 0 0;">Profit = sale price minus the cost price saved on each product. Items without a cost price count as full profit, so fill in purchase prices.</p></div>' +
    '<div class="toolbar-actions"><input type="date" id="pfFrom" class="search" value="' + escapeHtml(pr.from || "") + '"><input type="date" id="pfTo" class="search" value="' + escapeHtml(pr.to || "") + '">' +
    '<button class="btn secondary" type="button" onclick="state.profitFrom=$(\'pfFrom\').value;state.profitTo=$(\'pfTo\').value;loadDaily($(\'dailyDate\').value)">Show</button></div></div>' +
    profitTable(pr.shops, "Shop") + '<div style="height:12px"></div>' + profitTable(pr.users, "Salesman") + "</div>" +
    waSetupPanel() + "</div>";
  updatePageTitle("daily");
  waLoadSettings();
}

function dailyWhatsApp() {
  const r = state.daily;
  if (!r) return;
  const m = function (v) { return "Rs. " + Math.round(Number(v) || 0).toLocaleString("en-US"); };
  const lines = ["*" + ((r.company || {}).name || "ARHAM ELECTRONICS") + "*", "Daily report " + formatDate(r.date), ""];
  r.shops.forEach(function (s) {
    const ch = (state.cashAll || []).find(function (c) { return c.shopId === s.shopId; });
    lines.push("*" + s.shopName + "*: sales " + m(s.sales) + " (" + s.bills + "), cash " + m(s.cash) + ", credit " + m(s.credit) + ", old credit received " + m(s.received) + (ch ? ", cash in hand " + m(ch.inHand) : ""));
  });
  if (!r.shops.length) lines.push("No sales.");
  lines.push("", "*Total: " + m(r.total.sales) + "*");
  if (r.lowStock.length) { lines.push("", "Low stock:"); r.lowStock.slice(0, 10).forEach(function (x) { lines.push("- " + x.name + ": " + x.stock); }); }
  showWhatsAppPanel("Daily report", "Me", "", {
    modes: [{ label: "Report message", text: lines.join("\n") }],
    pdf: { label: "Daily report PDF", text: "Daily report " + formatDate(r.date), make: function () { return buildDailyPdf(r); } }
  });
}

function buildDailyPdf(r) {
  const co = r.company || state.company || {};
  const doc = createPdf(A5_W, A5_H);
  const M = 22, R = A5_W - M, INK = "#172026", MUTED = "#5F6B66", LINE = "#DCE2DE";
  const m = function (v) { return billNumber(Math.round(Number(v) || 0)); };
  let y = 0;
  const header = function () {
    doc.addPage();
    doc.rect(0, 0, A5_W, 58, { fill: "#0F2B5B" });
    doc.rect(0, 58, A5_W, 3, { fill: "#F2A900" });
    doc.text(M, 27, pdfFit(String(co.name || "ARHAM ELECTRONICS").toUpperCase(), 220, true, 14), { size: 14, bold: true, color: "#FFFFFF" });
    doc.text(R, 25, "DAILY REPORT", { size: 10, bold: true, color: "#F2A900", align: "right" });
    doc.text(R, 41, formatDate(r.date), { size: 9, color: "#FFFFFF", align: "right" });
    y = 80;
  };
  header();
  const boxes = [["Total sales", r.total.sales], ["Cash", r.total.cash], ["Credit given", r.total.credit], ["Old credit recd.", r.total.received]];
  const bw = (R - M - 18) / 4;
  boxes.forEach(function (b, i) {
    const x = M + i * (bw + 6);
    doc.rect(x, y, bw, 38, { fill: i ? "#EEF1F5" : "#FFF4D6" });
    doc.text(x + 6, y + 13, b[0], { size: 6.5, color: MUTED });
    doc.text(x + 6, y + 29, pdfFit("Rs. " + m(b[1]), bw - 10, true, 9.5), { size: 9.5, bold: true, color: INK });
  });
  y += 54;
  const cols = [["Shop", M + 3, "left"], ["Bills", M + 150, "right"], ["Sales", M + 205, "right"], ["Cash", M + 255, "right"], ["Credit", M + 305, "right"], ["In hand", R - 3, "right"]];
  doc.rect(M, y, R - M, 16, { fill: "#EEF1EF" });
  cols.forEach(function (c) { doc.text(c[1], y + 11, c[0], { size: 7, bold: true, color: MUTED, align: c[2] }); });
  y += 16;
  r.shops.forEach(function (s) {
    if (y > A5_H - 60) header();
    const ch = (state.cashAll || []).find(function (c) { return c.shopId === s.shopId; });
    const v = [pdfFit(s.shopName, 120, true, 8), String(s.bills), m(s.sales), m(s.cash), m(s.credit), ch ? m(ch.inHand) : ""];
    cols.forEach(function (c, i) { doc.text(c[1], y + 12, v[i], { size: 8, bold: i === 0 || i === 2, color: INK, align: c[2] }); });
    y += 17; doc.line(M, y, R, y, { color: LINE, width: 0.5 });
  });
  if (!r.shops.length) { doc.text(M + 3, y + 12, "No sales on this day.", { size: 8, color: MUTED }); y += 17; }
  const list = function (title, rows) {
    if (!rows.length) return;
    y += 16; if (y > A5_H - 60) header();
    doc.text(M, y, title, { size: 9, bold: true, color: INK }); y += 6;
    rows.forEach(function (row) {
      if (y > A5_H - 30) header();
      y += 13;
      doc.text(M + 3, y, pdfFit(row[0], R - M - 70, false, 8), { size: 8, color: INK });
      doc.text(R - 3, y, row[1], { size: 8, bold: true, color: INK, align: "right" });
    });
  };
  list("Top items", r.topItems.slice(0, 10).map(function (x) { return [x.name, billNumber(x.qty)]; }));
  list("Low stock (stock / minimum)", r.lowStock.slice(0, 15).map(function (x) { return [x.name, billNumber(x.stock) + " / " + billNumber(x.min)]; }));
  return { bytes: doc.output(), filename: "Daily-Report-" + r.date + ".pdf" };
}


/* ============================================================
   WARRANTY: check by serial, phone or bill; claims; warranty card
   ============================================================ */
function loadWarrantyPage() {
  const ur = getLang() === "ur";
  contentElement().innerHTML = '<div class="content bills-page"' + (ur ? ' dir="rtl"' : "") + ">" +
    '<div class="toolbar"><div><h2>' + escapeHtml(t("Warranty")) + "</h2><p>" + escapeHtml(t("Search by serial number, mobile number or bill number.")) + "</p></div></div>" +
    '<form id="wSearch" class="qs-searchrow"><input class="qs-search" name="q" dir="ltr" autocomplete="off" placeholder="' + escapeHtml(t("Serial / mobile / bill no.")) + '" value="' + escapeHtml(state.warrantyQ || "") + '">' +
    '<button class="qs-btn qs-primary" type="submit">' + escapeHtml(t("Search")) + '</button></form><div id="wResults" class="bills-list"></div></div>';
  updatePageTitle("warranty");
  $("wSearch").addEventListener("submit", function (e) { e.preventDefault(); warrantySearch(e.currentTarget.q.value); });
  if (state.warrantyQ) warrantySearch(state.warrantyQ);
}

async function warrantySearch(q) {
  state.warrantyQ = q;
  const box = $("wResults");
  box.innerHTML = '<p class="loading">' + escapeHtml(t("Loading...")) + "</p>";
  try { state.warrantyRows = await call("warrantycheck", { q: q }); } catch (error) { box.innerHTML = '<p class="qs-warn">' + escapeHtml(error.message || "") + "</p>"; return; }
  const rows = state.warrantyRows || [];
  box.innerHTML = rows.map(function (w, i) {
    return '<div class="w-card"><div class="w-top"><div><b dir="ltr">' + escapeHtml(w.serial) + '</b><span dir="ltr">' + escapeHtml(w.product) + "</span></div>" +
      '<span class="badge ' + (w.valid ? "success" : "danger") + '">' + escapeHtml(w.valid ? t("In warranty") + " · " + w.daysLeft + " " + t("days left") : (w.months ? t("Expired") : t("No warranty"))) + "</span></div>" +
      '<small dir="ltr">' + escapeHtml(w.customer) + (w.phone ? " · " + escapeHtml(w.phone) : "") + " · " + escapeHtml(w.invoiceNo) + " · " + escapeHtml(formatDate(w.date)) + (w.expiry ? " → " + escapeHtml(formatDate(w.expiry)) : "") + (w.shop ? " · " + escapeHtml(w.shop) : "") + "</small>" +
      (w.claims.length ? '<div class="w-claims">' + w.claims.map(function (c) {
        return '<div><b>' + escapeHtml(c.claimId) + "</b> " + escapeHtml(formatDate(c.date)) + ": " + escapeHtml(c.issue) + ' <span class="badge">' + escapeHtml(c.status) + "</span>" + (c.note ? " <small>" + escapeHtml(c.note) + "</small>" : "") +
          (isAdminUser() ? ' <select onchange="claimStatus(\'' + escapeHtml(c.claimId) + '\',this.value)">' + ["Open", "Sent to company", "Repaired", "Replaced", "Closed"].map(function (st) { return "<option" + (st === c.status ? " selected" : "") + ">" + st + "</option>"; }).join("") + "</select>" : "") + "</div>";
      }).join("") + "</div>" : "") +
      '<div class="bill-actions"><button class="btn secondary ledger-action-btn" type="button" onclick="newClaim(' + i + ')">' + escapeHtml(t("New claim")) + "</button>" +
      '<button class="btn secondary ledger-action-btn" type="button" onclick="openWarrantyCard(' + i + ')">' + escapeHtml(t("Warranty card")) + "</button></div></div>";
  }).join("") || '<p class="empty">' + escapeHtml(t("Nothing found.")) + "</p>";
}

async function newClaim(i) {
  const w = (state.warrantyRows || [])[i];
  if (!w) return;
  const issue = prompt(t("What is the problem?"));
  if (!issue) return;
  try { await call("warrantyclaim", { warrantyId: w.warrantyId, issue: issue }); showToast(t("Claim saved.")); warrantySearch(state.warrantyQ); }
  catch (error) { showError(error.message || "Could not save."); }
}

async function claimStatus(id, status) {
  const note = prompt(t("Note (optional)")) || "";
  try { await call("claimupdate", { claimId: id, status: status, note: note }); showToast(t("Saved.")); warrantySearch(state.warrantyQ); }
  catch (error) { showError(error.message || "Could not save."); }
}

function buildWarrantyPdf(w, co) {
  co = co || state.company || {};
  const doc = createPdf(A5_W, A5_H);
  const M = 26, R = A5_W - M, INK = "#172026", MUTED = "#5F6B66";
  doc.addPage();
  doc.rect(0, 0, A5_W, 64, { fill: "#0F2B5B" });
  doc.rect(0, 64, A5_W, 3, { fill: "#F2A900" });
  doc.text(M, 28, pdfFit(String((co.name || "ARHAM ELECTRONICS")).toUpperCase(), 230, true, 15), { size: 15, bold: true, color: "#FFFFFF" });
  doc.text(R, 30, "WARRANTY CARD", { size: 12, bold: true, color: "#F2A900", align: "right" });
  let y = 100;
  const line = function (label, value, big) {
    doc.text(M, y, label, { size: 8, color: MUTED });
    doc.text(M + 110, y, pdfFit(String(value || ""), R - M - 110, !!big, big ? 12 : 10), { size: big ? 12 : 10, bold: !!big, color: INK });
    y += big ? 26 : 20;
  };
  line("Product", w.product, true);
  line("Serial number", w.serial, true);
  line("Customer", w.customer);
  line("Mobile", w.phone);
  line("Bill no.", w.invoiceNo);
  line("Date of sale", formatDate(w.date));
  line("Warranty", w.months ? w.months + " months" : "No warranty");
  line("Valid until", w.expiry ? formatDate(w.expiry) : "-");
  y += 10;
  doc.rect(M, y, R - M, 46, { fill: "#FFF4D6" });
  doc.text(M + 10, y + 18, "Keep this card. Bring it with the product for any warranty claim.", { size: 8.5, color: INK });
  doc.text(M + 10, y + 32, "Warranty does not cover damage, burning, water or wrong installation.", { size: 8.5, color: MUTED });
  const sy = A5_H - 50;
  doc.line(R - 140, sy, R, sy, { color: "#94A3B8", width: 0.6 });
  doc.text(R - 70, sy + 11, "For " + (co.name || "Arham Electronics"), { size: 7.5, color: MUTED, align: "center" });
  return { bytes: doc.output(), filename: "Warranty-" + String(w.serial).replace(/[^A-Za-z0-9-]/g, "") + ".pdf" };
}

function openWarrantyCard(i) {
  const w = (state.warrantyRows || [])[i];
  if (!w) return;
  const pdf = buildWarrantyPdf(w);
  showWhatsAppPanel("Warranty card " + w.serial, w.customer, w.phone, {
    modes: [{ label: "Warranty details", text: "*Warranty card*\n" + w.product + "\nSerial: " + w.serial + "\nBill: " + w.invoiceNo + "\nValid until: " + (w.expiry ? formatDate(w.expiry) : "-") }],
    pdf: { label: "Warranty card PDF", text: "Warranty card " + w.serial, make: function () { return pdf; } }
  });
}


/* ============================================================
   QUOTATION: steps 3 and 4 (steps 1 and 2 are the sale screens)
   ============================================================ */
function qsQuoteStep3() {
  const total = qsTotal();
  return qsHead("qsGo(2)") + qsSteps(3) + '<div class="qs-body">' +
    '<div class="qs-total"><small>' + escapeHtml(t("Quotation for")) + ' </small><span dir="ltr">' + escapeHtml(qsCustomerName()) + '</span><b id="qsTotalAmt" dir="ltr">' + qsMoney(total) + "</b><small>" + qs.items.length + " " + escapeHtml(t("items")) + "</small></div>" +
    '<div class="qs-more-box"><label>' + escapeHtml(t("Discount")) + '<span dir="ltr">Rs. <input type="text" inputmode="decimal" value="' + escapeHtml(qs.discount) + '" oninput="qsDiscountLive(this.value)"></span></label>' +
    "<label>" + escapeHtml(t("Valid for (days)")) + '<input type="number" min="1" value="' + escapeHtml(String(qs.validDays || 7)) + '" oninput="qs.validDays=this.value"></label>' +
    "<label>" + escapeHtml(t("Note")) + '<input type="text" value="' + escapeHtml(qs.note) + '" oninput="qsSetField(\'note\',this.value,false)" placeholder="' + escapeHtml(t("Example: installation included")) + '"></label></div>' +
    "</div>" +
    '<div class="qs-bar"><div class="t"><small>' + escapeHtml(t("Quotation")) + '</small></div><button type="button" class="qs-btn qs-primary" id="qsSaveBtn" onclick="qsSave()"' + (qs.saving ? " disabled" : "") + ">" +
    escapeHtml(qs.saving ? t("Saving...") : t("Save Quotation")) + "</button></div>";
}

async function qsSaveQuote() {
  const c = qs.customer || {};
  const payload = { customerId: c.id || "", customerName: c.name || "", phone: c.phone || "", discount: qsNum(qs.discount), note: qs.note, validDays: qsNum(qs.validDays) || 7,
    items: qs.items.map(function (it) { return it.isNew ? { newItem: it.name, qty: it.qty, unitPrice: qsNum(it.rate) } : { productId: it.id, qty: it.qty, unitPrice: qsNum(it.rate) }; }) };
  qs.saving = true; renderQuick();
  try { qs.result = await call("quotation", payload); qs.step = 4; }
  catch (error) { showError(error.message || "Could not save."); }
  finally { qs.saving = false; renderQuick(); }
}

function qsQuoteDone() {
  const r = qs.result || {};
  return '<div class="qs-head"><b>' + escapeHtml(t("Quotation saved")) + "</b></div>" +
    '<div class="qs-done"><div class="qs-tick">✓</div><h3><span dir="ltr">' + escapeHtml(r.quoteId || "") + "</span></h3>" +
    '<div class="qs-sum"><div><span>' + escapeHtml(t("Total")) + '</span><b dir="ltr">' + qsMoney(r.total) + "</b></div><div><span>" + escapeHtml(t("Customer")) + '</span><b dir="ltr">' + escapeHtml(r.customerName || r.phone || "") + "</b></div></div>" +
    '<button type="button" class="qs-btn qs-wa" onclick="whatsappQuote(\'' + escapeHtml(r.quoteId || "") + '\')">WhatsApp ' + escapeHtml(t("Quotation")) + "</button>" +
    '<div class="qs-row2"><button type="button" class="qs-btn" onclick="openQuotePdf(\'' + escapeHtml(r.quoteId || "") + '\')">PDF</button>' +
    (canOpen("quicksale") ? '<button type="button" class="qs-btn qs-primary" onclick="quoteToSale(\'' + escapeHtml(r.quoteId || "") + '\')">' + escapeHtml(t("Make sale")) + "</button>"
      : '<button type="button" class="qs-btn qs-primary" onclick="qsNewSale()">' + escapeHtml(t("New Quotation")) + "</button>") + "</div></div>";
}

const QUOTE_CACHE = {};
async function getQuote(id) {
  if (!QUOTE_CACHE[id]) QUOTE_CACHE[id] = await call("quote", { quoteId: id });
  return QUOTE_CACHE[id];
}

function buildQuotePdf(q) {
  const co = q.company || {};
  const doc = createPdf(A5_W, A5_H);
  const M = 26, R = A5_W - M, INK = "#172026", MUTED = "#5F6B66", LINE = "#DCE2DE";
  let y = 0;
  const header = function () {
    doc.addPage();
    doc.rect(0, 0, A5_W, 64, { fill: "#0F2B5B" });
    doc.rect(0, 64, A5_W, 3, { fill: "#F2A900" });
    doc.text(M, 28, pdfFit(String(co.name || "ARHAM ELECTRONICS").toUpperCase(), 230, true, 15), { size: 15, bold: true, color: "#FFFFFF" });
    const sub = [co.address, co.phone ? "Ph: " + co.phone : ""].filter(Boolean).join("   ");
    if (sub) doc.text(M, 44, pdfFit(sub, 240, false, 7.5), { size: 7.5, color: "#C3CFE6" });
    doc.text(R, 26, "QUOTATION", { size: 10, bold: true, color: "#F2A900", align: "right" });
    doc.text(R, 41, "No. " + q.quoteId, { size: 9, bold: true, color: "#FFFFFF", align: "right" });
    doc.text(R, 54, formatDate(q.date), { size: 8, color: "#C3CFE6", align: "right" });
    y = 84;
  };
  header();
  doc.text(M, y, "For", { size: 7.5, color: MUTED });
  doc.text(M, y + 13, pdfFit(q.customerName || q.phone || "", 240, true, 11), { size: 11, bold: true, color: INK });
  if (q.phone) doc.text(M, y + 25, q.phone, { size: 8, color: MUTED });
  doc.text(R, y + 13, "Valid for " + (q.validDays || 7) + " days", { size: 8, color: MUTED, align: "right" });
  y += 40;
  doc.rect(M, y, R - M, 18, { fill: "#EEF1EF" });
  [["#", M + 4, "left"], ["Item", M + 20, "left"], ["Qty", M + 214, "right"], ["Rate", M + 288, "right"], ["Amount", R - 4, "right"]].forEach(function (h) {
    doc.text(h[1], y + 12, h[0], { size: 7.5, bold: true, color: MUTED, align: h[2] });
  });
  y += 18;
  (q.items || []).forEach(function (it, i) {
    const lines = pdfWrap(it.name, 168, false, 8.5);
    const h = lines.length * 11 + 7;
    if (y + h > A5_H - 120) header();
    doc.text(M + 4, y + 12, String(i + 1), { size: 8.5, color: MUTED });
    lines.forEach(function (ln, k) { doc.text(M + 20, y + 12 + k * 11, ln, { size: 8.5, color: INK }); });
    doc.text(M + 214, y + 12, billNumber(it.qty), { size: 8.5, color: INK, align: "right" });
    doc.text(M + 288, y + 12, billNumber(it.rate), { size: 8.5, color: INK, align: "right" });
    doc.text(R - 4, y + 12, billNumber(it.amount), { size: 8.5, bold: true, color: INK, align: "right" });
    y += h;
    doc.line(M, y, R, y, { color: LINE, width: 0.5 });
  });
  y += 16;
  const tx = R - 170;
  doc.text(tx, y, "Subtotal", { size: 8.5, color: MUTED }); doc.text(R, y, "Rs. " + billNumber(q.subtotal), { size: 8.5, color: INK, align: "right" }); y += 14;
  if (q.discount) { doc.text(tx, y, "Discount", { size: 8.5, color: MUTED }); doc.text(R, y, "- Rs. " + billNumber(q.discount), { size: 8.5, color: INK, align: "right" }); y += 14; }
  doc.rect(tx - 8, y - 12, R - tx + 12, 22, { fill: "#FFF4D6" });
  doc.text(tx, y + 2, "TOTAL", { size: 11, bold: true, color: INK }); doc.text(R, y + 2, "Rs. " + billNumber(q.total), { size: 11, bold: true, color: INK, align: "right" });
  y += 26;
  if (q.note) pdfWrap("Note: " + q.note, R - M, false, 8).slice(0, 3).forEach(function (ln) { doc.text(M, y, ln, { size: 8, color: MUTED }); y += 10; });
  doc.text(A5_W / 2, A5_H - 18, pdfFit("Prices may change after " + (q.validDays || 7) + " days. " + (co.footer || ""), A5_W - 2 * M, false, 7.5), { size: 7.5, color: MUTED, align: "center" });
  return { bytes: doc.output(), filename: "Quotation-" + q.quoteId + ".pdf" };
}

async function openQuotePdf(id) {
  const v = pdfViewerOpen(t("Making the quotation..."));
  try {
    const q = await getQuote(id);
    const pdf = buildQuotePdf(q);
    pdfViewerShow(v, pdf, PDF_LAST_DOC, { title: t("Quotation") + " " + (q.quoteId || ""), phone: q.phone || "" });
  } catch (error) { v.remove(); showError(error.message || "Could not make the PDF."); }
}

async function whatsappQuote(id) {
  try {
    const q = await getQuote(id);
    const lines = ["*" + ((q.company || {}).name || "ARHAM ELECTRONICS") + "*", "Quotation " + q.quoteId + " - " + formatDate(q.date), ""];
    q.items.forEach(function (it) { lines.push(billNumber(it.qty) + " x " + it.name + " @ " + billNumber(it.rate) + " = " + billNumber(it.amount)); });
    if (q.discount) lines.push("Discount: " + billNumber(q.discount));
    lines.push("", "*Total: Rs. " + billNumber(q.total) + "*", "Valid for " + (q.validDays || 7) + " days.");
    showWhatsAppPanel("Send quotation " + q.quoteId, q.customerName, q.phone, {
      modes: [{ label: "Quotation details", text: lines.join("\n") }],
      pdf: { label: "Quotation PDF", text: "Quotation " + q.quoteId, make: function () { return buildQuotePdf(q); } }
    });
  } catch (error) { showError(error.message || "Could not prepare the quotation."); }
}

// Opens the sale screen with the quotation's items, ready to save as a sale.
async function quoteToSale(id) {
  try {
    const q = await getQuote(id);
    state.page = "quicksale";
    await loadQuick("sale", true);
    qsReset();
    qs.quoteId = q.quoteId;
    if (q.customerId) {
      const c = (qs.data.customers || []).find(function (x) { return x.id === q.customerId; });
      qs.customer = c ? { id: c.id, name: c.name, phone: c.phone, balance: c.balance } : { id: "", name: q.customerName, phone: q.phone };
    } else {
      qs.customer = { id: "", name: q.customerName, phone: q.phone };
    }
    const skipped = [];
    q.items.forEach(function (it) {
      const p = it.productId ? qsProduct(it.productId) : null;
      if (!p || qsNum(p.stock) <= 0) { skipped.push(it.name); return; }
      qs.items.push({ id: p.id, name: p.name, qty: Math.min(it.qty, qsNum(p.stock)), max: qsNum(p.stock), rate: it.rate, fromLast: false, edited: true });
    });
    qs.discount = q.discount ? String(q.discount) : "";
    qs.step = 2;
    updateNavigation("quicksale");
    renderQuick();
    if (skipped.length) showToast(t("Not in stock") + ": " + skipped.join(", "));
  } catch (error) { showError(error.message || "Could not open the quotation."); }
}


/* ============================================================
   INSTALLATION JOBS
   ============================================================ */
async function loadJobs() {
  try {
    const both = await Promise.all([call("jobs", {}), call("techs", {}).catch(function () { return []; })]);
    state.jobs = both[0]; state.techs = both[1];
  } catch (error) { showError(error.message || "Could not load jobs."); return; }
  renderJobs();
}

function renderJobs(editId) {
  const jobs = state.jobs || [];
  const ur = getLang() === "ur";
  const editing = editId === "new" ? { jobId: "", date: localDay(), status: "Pending" } : jobs.find(function (j) { return j.jobId === editId; });
  const statuses = ["Pending", "On the way", "Done", "Cancelled"];
  contentElement().innerHTML = '<div class="content bills-page"' + (ur ? ' dir="rtl"' : "") + ">" +
    '<div class="toolbar"><div><h2>' + escapeHtml(t("Installations")) + "</h2><p>" + escapeHtml(t("Who goes where, and is the work done?")) + '</p></div><button class="btn primary" type="button" onclick="renderJobs(\'new\')">+ ' + escapeHtml(t("New job")) + "</button></div>" +
    (editing ? '<form id="jobForm" class="panel erp-form set-stock" data-id="' + escapeHtml(editing.jobId || "") + '"><div class="form-grid">' +
      "<label>" + escapeHtml(t("Customer")) + '<input name="customerName" value="' + escapeHtml(editing.customerName || "") + '"></label>' +
      "<label>" + escapeHtml(t("Mobile")) + '<input name="phone" dir="ltr" value="' + escapeHtml(editing.phone || "") + '"></label>' +
      "<label>" + escapeHtml(t("Address")) + '<input name="address" value="' + escapeHtml(editing.address || "") + '"></label>' +
      "<label>" + escapeHtml(t("Work")) + '<input name="work" value="' + escapeHtml(editing.work || "") + '" placeholder="' + escapeHtml(t("Example: 5 kW system installation")) + '"></label>' +
      "<label>" + escapeHtml(t("Date")) + '<input name="date" type="date" value="' + escapeHtml(editing.date || "") + '"></label>' +
      "<label>" + escapeHtml(t("Technician")) + '<select name="technicianId"><option value="">-</option>' + (state.techs || []).map(function (u) { return '<option value="' + escapeHtml(u.userId) + '"' + (u.userId === editing.technicianId ? " selected" : "") + ">" + escapeHtml(u.name) + "</option>"; }).join("") + "</select></label>" +
      "<label>" + escapeHtml(t("Bill no.")) + '<input name="invoiceNo" dir="ltr" value="' + escapeHtml(editing.invoiceNo || "") + '"></label>' +
      "<label>" + escapeHtml(t("Status")) + '<select name="status">' + statuses.map(function (st) { return "<option" + (st === editing.status ? " selected" : "") + ">" + st + "</option>"; }).join("") + "</select></label>" +
      "<label>" + escapeHtml(t("Note")) + '<input name="note" value="' + escapeHtml(editing.note || "") + '"></label></div>' +
      '<div class="form-actions"><button type="button" class="btn secondary" onclick="renderJobs()">' + escapeHtml(t("Cancel")) + '</button><button type="submit" class="btn primary">' + escapeHtml(t("Save")) + "</button></div></form>" : "") +
    '<div class="bills-list">' + (jobs.map(function (j) {
      const done = /done|cancel/i.test(j.status);
      return '<div class="bill-row' + (done ? " cancelled" : "") + '"><div class="bill-main"><b dir="ltr">' + escapeHtml(j.customerName || j.phone) + "</b><span>" + escapeHtml(j.work || "") + "</span>" +
        "<small>" + escapeHtml(formatDate(j.date)) + (j.address ? " · " + escapeHtml(j.address) : "") + (j.technician ? " · " + escapeHtml(j.technician) : "") + (j.phone ? ' · <a href="tel:' + escapeHtml(j.phone) + '">' + escapeHtml(j.phone) + "</a>" : "") + "</small></div>" +
        '<div class="bill-amt"><span class="badge ' + (j.status === "Done" ? "success" : (j.status === "Pending" ? "warning" : "")) + '">' + escapeHtml(t(j.status)) + "</span>" +
        '<div class="bill-actions">' + (done ? "" : '<button class="btn secondary ledger-action-btn" type="button" onclick="jobStatus(\'' + escapeHtml(j.jobId) + '\',\'Done\')">' + escapeHtml(t("Done")) + "</button>") +
        '<button class="btn secondary ledger-action-btn" type="button" onclick="renderJobs(\'' + escapeHtml(j.jobId) + '\')">' + escapeHtml(t("Edit")) + "</button></div></div></div>";
    }).join("") || '<p class="empty">' + escapeHtml(t("No jobs yet.")) + "</p>") + "</div></div>";
  updatePageTitle("jobs");
  const f = $("jobForm");
  if (f) f.addEventListener("submit", async function (e) {
    e.preventDefault();
    const payload = {};
    ["customerName", "phone", "address", "work", "date", "technicianId", "invoiceNo", "status", "note"].forEach(function (k) { payload[k] = f[k].value; });
    payload.jobId = f.dataset.id || "";
    try { await call("savejob", payload); showToast(t("Saved.")); await loadJobs(); } catch (error) { showError(error.message || "Could not save."); }
  });
}

async function jobStatus(id, status) {
  const j = (state.jobs || []).find(function (x) { return x.jobId === id; });
  if (!j) return;
  const payload = Object.assign({}, j, { status: status });
  try { await call("savejob", payload); showToast(t("Saved.")); await loadJobs(); } catch (error) { showError(error.message || "Could not save."); }
}


/* ============================================================
   HOME: big Sale button, then simple tiles for the user's other work
   ============================================================ */
function homeTilesHtml() {
  const tiles = [
    ["receive", "₨", "Receive Payment", "receivepay"], ["cash", "◍", "Cash", "cash"], ["goodsin", "⇩", "Goods In", "stockin"], ["mystock", "▦", "My Stock", "mystock"],
    ["quote", "✎", "Quotation", "quotes"], ["warranty", "✓", "Warranty", "warranty"], ["jobs", "⚒", "Installations", "jobs"],
    ["bills", "▤", isAdminUser() ? "Bills" : "My Bills", ""], ["daily", "◷", "Daily Report", "reports"]
  ].filter(function (x) { return canOpen(x[0]); });
  if (!tiles.length) return "";
  return '<div class="home-tiles">' + tiles.map(function (x) {
    return '<button type="button" class="home-tile" onclick="showPage(\'' + x[0] + '\')"><i aria-hidden="true">' + x[1] + "</i><span>" + escapeHtml(t(x[2])) + "</span></button>";
  }).join("") + "</div>";
}


/* ---------- Free automatic WhatsApp for the daily report (CallMeBot) ---------- */
function waSetupPanel() {
  return '<div class="panel wa-auto" id="waAuto"><div class="panel-header"><div><h3>Automatic WhatsApp every evening (free)</h3>' +
    '<p style="margin:4px 0 0;">At about 9 PM the report comes to your own WhatsApp with a link to the PDF, and to your email with the PDF attached.</p></div><span id="waState" class="badge">...</span></div>' +
    '<ol class="wa-steps"><li>Save this number in your phone: <b dir="ltr">+34 611 01 16 37</b> (CallMeBot). If it does not reply, check the current number on callmebot.com.</li>' +
    '<li>On WhatsApp send it exactly: <b>I allow callmebot to send me messages</b></li>' +
    '<li>It replies with your <b>APIKEY</b> (a number). Put your mobile number and that key below and press Save.</li>' +
    '<li>Once only: open the Apps Script editor, choose <b>setupDailyReport</b>, press Run and allow the permissions.</li></ol>' +
    '<form id="waForm" class="erp-form"><div class="form-grid"><label>Your WhatsApp number<input name="phone" dir="ltr" placeholder="03001234567"></label>' +
    '<label>APIKEY<input name="apikey" dir="ltr" autocomplete="off" placeholder="from CallMeBot"></label></div>' +
    '<div class="form-actions"><button class="btn secondary" type="button" onclick="waSendNow()">Send today\'s report now</button><button class="btn primary" type="submit">Save</button></div></form></div>';
}

async function waLoadSettings() {
  const f = $("waForm");
  if (!f) return;
  f.addEventListener("submit", async function (e) {
    e.preventDefault();
    try { const st = await call("savewasettings", { phone: f.phone.value.trim(), apikey: f.apikey.value.trim() }); f.apikey.value = ""; waShowState(st); showToast("Saved."); }
    catch (error) { showError(error.message || "Could not save."); }
  });
  try { const st = await call("wasettings", {}); f.phone.value = st.phone || ""; waShowState(st); } catch (error) { waShowState(null); }
}

function waShowState(st) {
  const el = $("waState");
  if (!el) return;
  const ready = st && st.phone && st.hasKey;
  el.textContent = !st ? "Not available" : (ready && st.triggerOn ? "On, every evening" : (ready ? "Key saved. Run setupDailyReport once" : "Not set up"));
  el.className = "badge " + (ready && st.triggerOn ? "success" : "warning");
}

async function waSendNow() {
  showToast("Sending...");
  try {
    const r = await call("senddailynow", {});
    const wa = r.whatsapp === "sent" ? "WhatsApp sent" : (r.whatsapp === "WhatsApp is not set up." ? "WhatsApp not set up" : r.whatsapp);
    showToast(wa + ". Email: " + (r.email === "sent" ? "sent" : r.email) + ".");
  } catch (error) {
    showError(/permission|authoriz|DriveApp|UrlFetch/i.test(error.message || "") ? "Run setupDailyReport once in the Apps Script editor and allow the permissions, then try again." : (error.message || "Could not send."));
  }
}


/* ---------- Who keeps the cash of this sale / payment ---------- */
// Tick boxes: "Payment handed over to Anwar", "... to Ahsan". None ticked = the salesman keeps it.
function cashToHtml(keepers, selected, setter) {
  keepers = keepers || [];
  if (!keepers.length) return "";
  return '<div class="cash-to"><small>' + escapeHtml(t("Who has this cash?")) + "</small>" + keepers.map(function (k) {
    const on = selected === k.userId;
    return '<label class="cash-to-opt' + (on ? " on" : "") + '"><input type="checkbox"' + (on ? " checked" : "") + ' onchange="' + setter + "('" + escapeHtml(k.userId) + "',this.checked)\">" +
      "<span>" + escapeHtml(t("Payment handed over to")) + ' <b dir="ltr">' + escapeHtml(k.name) + "</b></span></label>";
  }).join("") + '<p class="cash-to-note">' + escapeHtml(selected ? t("They get a message. The cash moves to them only when they press Received.") : t("Nothing ticked: the cash stays with you.")) + "</p></div>";
}

function qsSetCashTo(id, on) { qs.cashTo = on ? id : ""; renderQuick(); }
function rpSetCashTo(id, on) { rp.cashTo = on ? id : ""; renderReceive(); }


/* ---------- Cash bell: someone handed cash to me and it waits for "Received" ---------- */
let cashBellLast = -1;
async function cashBell(force) {
  if (!state.user || !canOpen("cash")) return null;
  if (document.hidden && force !== true) return null;     // the app is in the background: no checks (saves the server for the others)
  let c;
  try { c = await call("cashpending", {}); } catch (e) { return null; }
  const bar = document.querySelector(".topbar-actions");
  myCashPill(c.inHand);
  cashPopup(c.list || []);
  let b = $("cashBell");
  if (!c.count) { if (b) b.remove(); cashBellLast = 0; return c; }
  if (bar && !b) {
    b = document.createElement("button");
    b.id = "cashBell"; b.type = "button"; b.className = "cash-bell";
    b.addEventListener("click", function () { showPage("cash"); });
    bar.insertBefore(b, bar.firstChild);
  }
  if (b) b.innerHTML = '<span aria-hidden="true">🔔</span> <b dir="ltr">' + qsMoney(c.total) + "</b> " + escapeHtml(t("to confirm"));
  if (cashBellLast !== -1 && c.count > cashBellLast) {
    try { if (navigator.vibrate) navigator.vibrate(200); } catch (e) { /* no vibration */ }
  }
  cashBellLast = c.count;
  return c;
}
window.addEventListener("load", function () { setTimeout(cashBell, 4000); setInterval(cashBell, 30000); });
// back to the app: check at once
document.addEventListener("visibilitychange", function () { if (!document.hidden) { cashBell(true); setTimeout(ownerBell, 1500); } });

// Today's date on this phone (Pakistan time), as yyyy-mm-dd. toISOString() would give the
// UTC date, which is still "yesterday" between midnight and 5 AM.
function localDay(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}


// Owner: look at one shop's My Stock (the same screen the shop's staff see).
function myStockShop(id) {
  state.myStockShop = id;
  contentElement().innerHTML = '<div class="content"><p class="loading">' + escapeHtml(t("Loading...")) + "</p></div>";
  loadMyStock();
}


/* ============================================================
   ALL LOCATIONS IN ONE EXCEL: download, correct, upload
   One row per product, one column per location (Hamza, Stock Invertor, GM...).
   Only the location columns are read back. An empty cell means "do not change".
   ============================================================ */
function stockLocations() {
  return (state.warehouses || []).filter(function (w) { return w.Active !== false; });
}

async function downloadAllStock() {
  const whs = stockLocations();
  if (!whs.length) return;
  try {
    const X = await loadSheetJs();
    const head = ["ProductID", "Item name", "Brand"].concat(whs.map(function (w) { return w.Name; })).concat(["Total (info)", "Cost (info, not changed)"]);
    const rows = (state.products || []).filter(function (p) { return String(p.Description || "").trim(); })
      .sort(function (a, b) { return String(a.Description).localeCompare(String(b.Description)); })
      .map(function (p, i) {
        const q = whs.map(function (w) { return shopQty(p, String(w.WarehouseID)); });
        const r = i + 3;                                   // Excel row (note row 1, header row 2)
        const first = X.utils.encode_col(3), last = X.utils.encode_col(2 + whs.length);
        const total = { t: "n", v: q.reduce(function (a, b) { return a + b; }, 0), f: "SUM(" + first + r + ":" + last + r + ")" };
        return [String(p.ProductID), p.Description || "", p.Brand || ""].concat(q).concat([total, Number(p.PurchasePrice) || ""]);
      });
    const note = ["Change the numbers under each location to the real count. Empty cell = no change. 0 = none left. New items: add a row at the bottom with ProductID empty. Do not change the ProductID or the top row."];
    const ws = X.utils.aoa_to_sheet([note, head].concat(rows));
    ws["!cols"] = [{ wch: 10 }, { wch: 46 }, { wch: 14 }].concat(whs.map(function () { return { wch: 16 }; })).concat([{ wch: 12 }, { wch: 14 }]);
    ws["!freeze"] = { xSplit: 2, ySplit: 2 };
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, "All locations");
    X.writeFile(wb, "Stock - all locations " + localDay() + ".xlsx");
  } catch (error) { showError(error.message || "Could not make the file."); }
}

function openAllStockUpload() {
  const area = $("stockUploadArea");
  area.innerHTML = '<div class="panel erp-form set-stock"><h3>Upload all locations</h3>' +
    "<p>Choose the file from <b>Download all locations</b> after you corrected it. You will see every change before anything is saved. Only the location columns are used; costs and names are not changed.</p>" +
    '<label>Stock file<input type="file" id="allStockFile" accept=".xlsx,.xls,.csv"></label><div id="allStockPreview"></div>' +
    '<div class="form-actions"><button type="button" class="btn secondary" onclick="$(\'stockUploadArea\').innerHTML=\'\'">Close</button></div></div>';
  $("allStockFile").addEventListener("change", function () { readAllStockFile(this.files && this.files[0]); });
}

async function readAllStockFile(file) {
  const box = $("allStockPreview");
  if (!file) return;
  box.innerHTML = '<p class="loading">Reading the file...</p>';
  try {
    const X = await loadSheetJs();
    const wb = X.read(await file.arrayBuffer(), { type: "array" });
    const rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: "" });
    const whs = stockLocations();
    const norm = function (v) { return String(v == null ? "" : v).trim().toLowerCase(); };
    let hr = -1, cols = {};
    for (let r = 0; r < Math.min(rows.length, 10) && hr === -1; r++) {
      const cells = rows[r].map(norm);
      const nameCol = cells.findIndex(function (c) { return c === "item name" || c === "description" || c === "item"; });
      const whCols = {};
      whs.forEach(function (w) { const i = cells.indexOf(norm(w.Name)); if (i !== -1) whCols[String(w.WarehouseID)] = i; });
      if (nameCol !== -1 && Object.keys(whCols).length) { hr = r; cols = { id: cells.indexOf("productid"), name: nameCol, wh: whCols }; }
    }
    if (hr === -1) throw new Error("Could not find the Item name column and the location columns (" + whs.map(function (w) { return w.Name; }).join(", ") + ") in the first sheet.");
    const byId = {}, byName = {};
    (state.products || []).forEach(function (p) { byId[String(p.ProductID)] = p; byName[normName(p.Description)] = p; });
    const changes = [], unknownIds = [];
    for (let r = hr + 1; r < rows.length; r++) {
      const row = rows[r];
      const name = String(row[cols.name] == null ? "" : row[cols.name]).trim();
      const id = cols.id === -1 ? "" : String(row[cols.id] == null ? "" : row[cols.id]).trim();
      if (!name && !id) continue;
      let prod = id ? byId[id] : byName[normName(name)];
      if (id && !prod) { unknownIds.push(id + " " + name); continue; }
      Object.keys(cols.wh).forEach(function (wid) {
        const raw = row[cols.wh[wid]];
        if (raw === "" || raw == null) return;                       // empty = no change
        const qty = Number(String(raw).replace(/,/g, ""));
        if (!isFinite(qty) || qty < 0) return;
        const now = prod ? shopQty(prod, wid) : 0;
        if (prod && qty === now) return;
        if (!prod && qty === 0) return;
        changes.push({ wid: wid, productId: prod ? String(prod.ProductID) : "", name: prod ? prod.Description : name.toUpperCase(), from: now, to: qty, isNew: !prod });
      });
    }
    state.allStockUpload = { file: file.name, changes: changes };
    const whName = function (wid) { const w = whs.find(function (x) { return String(x.WarehouseID) === wid; }); return w ? w.Name : wid; };
    const per = {};
    changes.forEach(function (c) { per[c.wid] = (per[c.wid] || 0) + 1; });
    box.innerHTML = (changes.length ? "<p><b>" + changes.length + " change(s)</b>: " + Object.keys(per).map(function (wid) { return escapeHtml(whName(wid)) + " " + per[wid]; }).join(", ") + "</p>" : "<p>No changes found. Every number is the same as in the ERP.</p>") +
      (unknownIds.length ? '<p class="qs-warn">Skipped (ProductID not found): ' + escapeHtml(unknownIds.slice(0, 10).join("; ")) + "</p>" : "") +
      (changes.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Location</th><th>Item</th><th class="num">ERP now</th><th class="num">New count</th><th class="num">Change</th></tr></thead><tbody>' +
        changes.map(function (c) {
          const d = c.to - c.from;
          return "<tr><td>" + escapeHtml(whName(c.wid)) + "</td><td>" + escapeHtml(c.name) + (c.isNew ? ' <span class="badge warning">new item</span>' : "") + '</td><td class="num">' + formatNumber(c.from) +
            '</td><td class="num"><b>' + formatNumber(c.to) + '</b></td><td class="num ' + (d < 0 ? "out" : "in") + '">' + (d > 0 ? "+" : "") + formatNumber(d) + "</td></tr>";
        }).join("") + "</tbody></table></div>" +
        '<div id="allStockProgress"></div><div class="form-actions"><button type="button" class="btn primary" id="applyAllStockBtn" onclick="applyAllStockUpload()">Save ' + changes.length + " change(s)</button></div>" : "");
  } catch (error) {
    box.innerHTML = '<p class="qs-warn">' + escapeHtml(error.message || "Could not read the file.") + "</p>";
  }
}

async function applyAllStockUpload() {
  const u = state.allStockUpload;
  if (!u || !u.changes.length) return;
  if (!confirm("Save " + u.changes.length + " stock change(s)?")) return;
  const btn = $("applyAllStockBtn");
  if (btn) btn.disabled = true;
  const prog = $("allStockProgress");
  const byWh = {};
  u.changes.forEach(function (c) {
    (byWh[c.wid] = byWh[c.wid] || []).push(c.productId ? { productId: c.productId, qty: c.to } : { newItem: c.name, qty: c.to });
  });
  let done = 0, changed = 0;
  try {
    for (const wid of Object.keys(byWh)) {
      const items = byWh[wid];
      for (let i = 0; i < items.length; i += 40) {
        const res = await call("setshopstock", { warehouseId: wid, reason: "Stock count " + u.file, items: items.slice(i, i + 40) });
        changed += res.changed || 0;
        done += Math.min(40, items.length - i);
        if (prog) prog.innerHTML = "<p>Saved " + done + " of " + u.changes.length + "...</p>";
      }
    }
    showToast("Stock saved: " + changed + " change(s).");
    state.allStockUpload = null;
    $("stockUploadArea").innerHTML = "";
    await loadPage("products");
  } catch (error) {
    showError((error.message || "Could not save.") + " Saved so far: " + done + ". Upload the same file again to finish; finished lines show no change.");
    if (btn) btn.disabled = false;
  }
}


/* ============================================================
   DELETE / MERGE / RESTORE A PRODUCT (owner)
   ============================================================ */
function openDeleteProduct(productId) {
  const prod = (state.products || []).find(function (x) { return String(x.ProductID) === String(productId); });
  if (!prod) return;
  const whs = (state.warehouses || []);
  const places = whs.map(function (w) { return { name: w.Name, qty: shopQty(prod, String(w.WarehouseID)) }; }).filter(function (x) { return x.qty !== 0; });
  const others = (state.products || []).filter(function (x) { return String(x.ProductID) !== String(productId); })
    .sort(function (a, b) { return String(a.Description).localeCompare(String(b.Description)); });
  const area = $("stockUploadArea");
  area.innerHTML = '<form id="delProductForm" class="panel erp-form set-stock del-product"><h3>Delete ' + escapeHtml(prod.Description) + "</h3>" +
    (places.length
      ? "<p>This item still has stock: <b>" + places.map(function (x) { return escapeHtml(x.name) + " " + formatNumber(x.qty); }).join(", ") + "</b>. " +
        "Choose the item it really is, and its stock moves there (for example a duplicate name). Or set its stock to 0 first.</p>"
      : "<p>It has no stock. It will be hidden from every list and screen. Old bills keep showing it. You can restore it later from <b>Deleted items</b>.</p>") +
    '<label>Move its stock into' + (places.length ? "" : " (optional)") + '<input name="into" list="delProductList" autocomplete="off" placeholder="Type to search the other item"' + (places.length ? " required" : "") + "></label>" +
    '<datalist id="delProductList">' + others.map(function (x) { return '<option value="' + escapeHtml(x.Description) + '"></option>'; }).join("") + "</datalist>" +
    '<div class="form-actions"><button type="button" class="btn secondary" onclick="$(\'stockUploadArea\').innerHTML=\'\'">Cancel</button>' +
    '<button type="submit" class="btn danger">Delete</button></div></form>';
  area.scrollIntoView({ behavior: "smooth", block: "start" });
  $("delProductForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = e.currentTarget.into.value.trim();
    let into = "";
    if (name) {
      const t = others.find(function (x) { return String(x.Description).trim().toLowerCase() === name.toLowerCase(); });
      if (!t) { showError("Choose the item from the list."); return; }
      into = String(t.ProductID);
    }
    if (!confirm("Delete " + prod.Description + (into ? " and move its stock into " + name : "") + "?")) return;
    try {
      const r = await call("deleteproduct", { productId: String(productId), mergeInto: into });
      showToast("Deleted " + r.name + (r.mergedInto ? ". " + formatNumber(r.moved) + " unit(s) moved into " + r.mergedInto + "." : "."));
      area.innerHTML = "";
      await loadPage("products");
    } catch (error) { showError(error.message || "Could not delete."); }
  });
}

async function openDeletedProducts() {
  const area = $("stockUploadArea");
  area.innerHTML = '<div class="panel"><p class="loading">Loading...</p></div>';
  let list = [];
  try { list = await call("deletedproducts", {}); } catch (error) { area.innerHTML = ""; showError(error.message || "Could not load."); return; }
  area.innerHTML = '<div class="panel erp-form set-stock"><h3>Deleted items</h3>' +
    (list.length ? '<div class="bills-list">' + list.map(function (x) {
      return '<div class="bill-row"><div class="bill-main"><b>' + escapeHtml(x.name) + "</b><small>" + escapeHtml(x.brand) + (x.deletedAt ? " · deleted " + escapeHtml(formatDate(x.deletedAt)) : "") + "</small></div>" +
        '<div class="bill-actions"><button class="btn secondary ledger-action-btn" type="button" onclick="restoreProduct(\'' + escapeHtml(x.productId) + '\')">Restore</button></div></div>';
    }).join("") + "</div>" : '<p class="empty">No deleted items.</p>') +
    '<div class="form-actions"><button type="button" class="btn secondary" onclick="$(\'stockUploadArea\').innerHTML=\'\'">Close</button></div></div>';
}

async function restoreProduct(id) {
  try {
    const r = await call("restoreproduct", { productId: id });
    showToast("Restored " + r.name + ".");
    await loadPage("products");
    openDeletedProducts();
  } catch (error) { showError(error.message || "Could not restore."); }
}


/* ============================================================
   MONTHLY EXPENSES (owner): staff salaries + other monthly costs, per shop
   ============================================================ */
const MEXP_HEADS = ["Shop rent", "Electricity", "Internet / Phone", "Tea / Food", "Transport", "Other"];
const mexp = { month: "", shopId: "", data: null, rows: [] };

async function loadMonthExp(month, shopId) {
  mexp.month = month || mexp.month || localDay().slice(0, 7);
  mexp.shopId = shopId !== undefined ? shopId : mexp.shopId;
  try { mexp.data = await call("monthlyexpenses", { month: mexp.month, shopId: mexp.shopId }); }
  catch (error) { showError(error.message || "Could not load."); return; }
  mexp.shopId = mexp.data.shopId;
  mexpBuildRows(mexp.data.rows);
  renderMonthExp();
}

// One line per staff member (salary) + the usual heads, filled from what is saved.
function mexpBuildRows(saved) {
  const d = mexp.data;
  const rows = [];
  const used = {};
  d.staff.forEach(function (u) {
    const s = saved.find(function (r) { return r.type === "Salary" && (r.userId === u.userId || (!r.userId && r.name === u.name)); });
    if (s) used[saved.indexOf(s)] = true;
    rows.push({ type: "Salary", name: u.name, userId: u.userId, amount: s ? s.amount : "", note: s ? s.note : "" });
  });
  saved.forEach(function (r, i) { if (!used[i] && r.type === "Salary") { used[i] = true; rows.push(Object.assign({}, r)); } });
  MEXP_HEADS.forEach(function (h) {
    const k = saved.findIndex(function (r, i) { return !used[i] && r.type === "Other" && r.name === h; });
    if (k !== -1) used[k] = true;
    rows.push({ type: "Other", name: h, userId: "", amount: k !== -1 ? saved[k].amount : "", note: k !== -1 ? saved[k].note : "" });
  });
  saved.forEach(function (r, i) { if (!used[i]) rows.push(Object.assign({}, r)); });
  mexp.rows = rows;
}

function mexpTotal(type) {
  return mexp.rows.filter(function (r) { return !type || r.type === type; }).reduce(function (a, r) { return a + (Number(r.amount) || 0); }, 0);
}

function renderMonthExp() {
  const d = mexp.data || { shops: [] };
  const line = function (r, i) {
    return '<tr><td>' + (r.type === "Other" && !MEXP_HEADS.includes(r.name) && !r.fixed
        ? '<input class="mexp-name" value="' + escapeHtml(r.name) + '" oninput="mexp.rows[' + i + '].name=this.value" placeholder="Expense name">'
        : escapeHtml(r.name)) + "</td>" +
      '<td class="num"><input class="mexp-amt" type="number" inputmode="numeric" min="0" step="1" value="' + escapeHtml(String(r.amount === "" ? "" : r.amount)) + '" oninput="mexp.rows[' + i + '].amount=this.value;mexpTotals()"></td>' +
      '<td><input class="mexp-note" value="' + escapeHtml(r.note || "") + '" oninput="mexp.rows[' + i + '].note=this.value" placeholder="Note"></td></tr>';
  };
  const salaries = mexp.rows.map(function (r, i) { return r.type === "Salary" ? line(r, i) : ""; }).join("");
  const others = mexp.rows.map(function (r, i) { return r.type === "Other" ? line(r, i) : ""; }).join("");
  contentElement().innerHTML = '<div class="content mexp-page">' +
    '<div class="toolbar"><div><h2>Monthly Expenses</h2><p>Write each month\'s staff salaries and other costs for every shop. Empty or 0 = not counted.</p></div>' +
    '<div class="toolbar-actions"><input type="month" class="search" value="' + escapeHtml(mexp.month) + '" onchange="loadMonthExp(this.value, mexp.shopId)"></div></div>' +
    '<div class="stock-tabs">' + d.shops.map(function (w) {
      return '<button type="button" class="' + (w.id === mexp.shopId ? "on" : "") + '" onclick="loadMonthExp(mexp.month, \'' + escapeHtml(w.id) + '\')"><b>' + escapeHtml(w.name) + "</b></button>";
    }).join("") + "</div>" +
    '<div class="cash-cards"><div class="cash-main"><small>Total for ' + escapeHtml(d.shopName || "") + ", " + escapeHtml(mexpMonthName(mexp.month)) + '</small><b id="mexpTotal">' + money(mexpTotal()) + "</b></div>" +
    '<div><small>Salaries</small><b id="mexpSal">' + money(mexpTotal("Salary")) + "</b></div>" +
    '<div><small>Other expenses</small><b id="mexpOth">' + money(mexpTotal("Other")) + "</b></div></div>" +
    '<div class="panel"><div class="panel-header"><h3>Staff salaries</h3>' +
    '<button class="btn secondary" type="button" onclick="mexpAdd(\'Salary\')">+ Add person</button></div>' +
    '<div class="table-wrap"><table class="table mexp-table"><thead><tr><th>Staff</th><th class="num">Salary (Rs.)</th><th>Note</th></tr></thead><tbody>' +
    (salaries || '<tr><td colspan="3" class="empty">No staff for this shop. Add a person, or give users this shop in Settings.</td></tr>') + "</tbody></table></div></div>" +
    '<div class="panel"><div class="panel-header"><h3>Other expenses</h3>' +
    '<button class="btn secondary" type="button" onclick="mexpAdd(\'Other\')">+ Add expense</button></div>' +
    '<div class="table-wrap"><table class="table mexp-table"><thead><tr><th>Expense</th><th class="num">Amount (Rs.)</th><th>Note</th></tr></thead><tbody>' + others + "</tbody></table></div></div>" +
    '<div class="form-actions mexp-actions">' +
    ((d.lastMonth || []).length ? '<button class="btn secondary" type="button" onclick="mexpCopyLast()">Copy last month</button>' : "") +
    '<button class="btn primary" type="button" id="mexpSave" onclick="mexpSave()">Save ' + escapeHtml(mexpMonthName(mexp.month)) + "</button></div></div>";
  updatePageTitle("monthexp");
}

function mexpMonthName(m) {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return (months[Number(String(m).slice(5, 7)) - 1] || "") + " " + String(m).slice(0, 4);
}

function mexpTotals() {
  const set = function (id, v) { const el = $(id); if (el) el.textContent = money(v); };
  set("mexpTotal", mexpTotal()); set("mexpSal", mexpTotal("Salary")); set("mexpOth", mexpTotal("Other"));
}

function mexpAdd(type) {
  if (type === "Salary") {
    const name = prompt("Name of the person");
    if (!name) return;
    mexp.rows.push({ type: "Salary", name: name.trim(), userId: "", amount: "", note: "" });
  } else {
    mexp.rows.push({ type: "Other", name: "", userId: "", amount: "", note: "" });
  }
  renderMonthExp();
}

function mexpCopyLast() {
  if (!confirm("Fill the amounts from last month? You can change them before saving.")) return;
  mexpBuildRows((mexp.data.lastMonth || []).map(function (r) { return Object.assign({}, r); }));
  renderMonthExp();
}

async function mexpSave() {
  const rows = mexp.rows.map(function (r) { return { type: r.type, name: String(r.name || "").trim(), userId: r.userId || "", amount: Number(r.amount) || 0, note: r.note || "" }; })
    .filter(function (r) { return r.name && r.amount > 0; });
  const btn = $("mexpSave"); if (btn) btn.disabled = true;
  try {
    mexp.data = await call("savemonthlyexpenses", { month: mexp.month, shopId: mexp.shopId, rows: rows });
    mexpBuildRows(mexp.data.rows);
    renderMonthExp();
    showToast("Saved: " + mexpMonthName(mexp.month) + ", " + money(mexpTotal()) + ".");
  } catch (error) { if (btn) btn.disabled = false; showError(error.message || "Could not save."); }
}


/* ---------- Online / cheque payment: account, transaction no., slip picture ---------- */
// who: "qs" (sale screen) or "rp" (receive payment). Values live on that object.
function payDetailsHtml(who, accounts) {
  const o = who === "qs" ? qs : rp;
  const set = who + ".";
  return '<div class="pay-details">' +
    '<label><small>' + escapeHtml(t("Received in (account)")) + '</small><input type="text" list="payAccounts" value="' + escapeHtml(o.payAccount || "") +
      '" oninput="' + set + 'payAccount=this.value" placeholder="' + escapeHtml(t("e.g. Meezan Bank, JazzCash, Easypaisa")) + '"></label>' +
    '<datalist id="payAccounts">' + (accounts || []).map(function (a) { return '<option value="' + escapeHtml(a) + '"></option>'; }).join("") + "</datalist>" +
    '<label><small>' + escapeHtml(t("Transaction / cheque no.")) + '</small><input type="text" dir="ltr" value="' + escapeHtml(o.payRef || "") + '" oninput="' + set + 'payRef=this.value"></label>' +
    (o.slip
      ? '<div class="slip-prev"><img src="' + o.slip.preview + '" alt=""><div><b>' + escapeHtml(t("Slip attached")) + "</b><small>" + escapeHtml(o.slip.size) + '</small></div><button type="button" class="qs-btn" onclick="slipRemove(\'' + who + '\')">' + escapeHtml(t("Remove")) + "</button></div>"
      : '<label class="slip-btn"><input type="file" accept="image/*" onchange="slipPick(\'' + who + '\', this.files && this.files[0])"><span>📎 ' + escapeHtml(t("Attach slip / screenshot")) + "</span></label>") +
    "</div>";
}

// Makes the picture small (max 1400 px, JPEG) so it uploads fast on mobile data.
function slipRead(file) {
  return new Promise(function (resolve, reject) {
    if (!file || !/^image\//.test(file.type)) { reject(new Error(t("Choose a picture (screenshot or photo)."))); return; }
    const fr = new FileReader();
    fr.onerror = function () { reject(new Error("Could not read the picture.")); };
    fr.onload = function () {
      const img = new Image();
      img.onerror = function () { reject(new Error("Could not open the picture.")); };
      img.onload = function () {
        const max = 1400, k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        const url = cv.toDataURL("image/jpeg", 0.72);
        const data = url.split(",")[1];
        resolve({ data: data, type: "image/jpeg", preview: url, size: Math.round(data.length * 0.75 / 1024) + " KB" });
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

async function slipPick(who, file) {
  try {
    const slip = await slipRead(file);
    if (who === "qs") { qs.slip = slip; renderQuick(); } else { rp.slip = slip; renderReceive(); }
  } catch (error) { showError(error.message); }
}

function slipRemove(who) {
  if (who === "qs") { qs.slip = null; renderQuick(); } else { rp.slip = null; renderReceive(); }
}


/* ============================================================
   STOCK IN: goods that arrived from a supplier or anywhere outside our shops
   ============================================================ */
const sin = { data: null, from: "", wh: "", q: "", items: [], note: "", saving: false, result: null };

async function loadStockIn() {
  sin.from = ""; sin.fromShop = ""; sin.fromQ = ""; sin.q = ""; sin.items = []; sin.note = ""; sin.result = null; sin.saving = false; sin.mode = "";
  try { sin.data = await call("stockindata", {}); } catch (error) { showError(error.message || "Could not load."); return; }
  sin.wh = sin.data.shopId || sin.data.defaultId || "";
  renderStockIn();
}

function renderStockIn() {
  const d = sin.data || { products: [], sources: [], warehouses: [] };
  const ur = getLang() === "ur";
  let body;
  if (sin.result) {
    const r = sin.result;
    body = '<div class="qs-done"><div class="qs-tick">✓</div><h3>' + escapeHtml(t("Goods saved")) + ' <span dir="ltr">' + escapeHtml(r.inwardId) + "</span></h3>" +
      "<p>" + escapeHtml(formatNumber(r.units) + " " + t("units") + " · " + t("Received from") + " " + r.fromName + " → " + r.toName) + "</p>" +
      '<div class="qs-sum">' + r.items.map(function (it) { return '<div><span dir="ltr">' + escapeHtml(it.name) + '</span><b dir="ltr">' + formatNumber(it.qty) + "</b></div>"; }).join("") + "</div>" +
      '<div class="qs-row2"><button type="button" class="qs-btn" onclick="openChallanPdf(\'' + escapeHtml(r.inwardId) + '\')">PDF</button>' +
      '<button type="button" class="qs-btn qs-primary" onclick="showPage(\'goodsin\')">' + escapeHtml(t("Goods In")) + "</button></div></div>";
  } else {
    const q = sin.q.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
    const atShop = function (p) { return sin.fromShop ? Number(((p.locations || {})[sin.fromShop]) || 0) : null; };
    const found = words.length ? d.products.filter(function (p) {
      const hay = (p.name + " " + p.brand + " " + p.aliases).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; }) && (!sin.fromShop || atShop(p) > 0);
    }).slice(0, 8) : [];
    const units = sin.items.reduce(function (a, it) { return a + (Number(it.qty) || 0); }, 0);
    body = '<div class="qs-body">' + sinFromHtml(d) +
      (d.warehouses.length ? '<label class="qs-amt qs-note"><small>' + escapeHtml(t("Keep in")) + '</small><select onchange="sin.wh=this.value">' + d.warehouses.map(function (w) {
        return '<option value="' + escapeHtml(w.id) + '"' + (w.id === sin.wh ? " selected" : "") + ">" + escapeHtml(w.name) + "</option>"; }).join("") + "</select></label>" : "") +
      '<input class="qs-search" id="sinSearch" type="search" autocomplete="off" placeholder="' + escapeHtml(t("Search item")) + '" value="' + escapeHtml(sin.q) + '" oninput="sinSearch(this.value)">' +
      (q ? '<div class="qs-res">' + found.map(function (p) {
        return '<div><span><span dir="ltr">' + escapeHtml(p.name) + "</span><small>" + escapeHtml(p.brand || "") + (sin.fromShop ? ' · ' + escapeHtml(sin.from) + ": " + formatNumber(atShop(p)) : "") + '</small></span><button type="button" class="qs-add" onclick="sinAdd(\'' + escapeHtml(p.id) + '\')">+ ' + escapeHtml(t("Add")) + "</button></div>";
      }).join("") + (q.length >= 2 && !sin.fromShop ? '<button type="button" class="qs-newrow" onclick="sinAddNew()"><span><small>' + escapeHtml(t("Not in the list?")) + '</small><b dir="ltr">' + escapeHtml(sin.q.trim().toUpperCase()) +
        '</b></span><span class="qs-add">+ ' + escapeHtml(t("New item")) + "</span></button>" : "") + "</div>" : "") +
      (sin.items.length ? "<h4>" + escapeHtml(t("Items")) + "</h4>" + sin.items.map(function (it, i) {
        return '<div class="qs-item"><div class="qs-item-top"><div class="n"><span dir="ltr">' + (it.isNew || String(it.id).indexOf("new:") === 0 ? escapeHtml(it.name) : cardLink("product", it.id, it.name)) + "</span>" + (it.newItem ? ' <span class="qs-badge">' + escapeHtml(t("New item")) + "</span>" : "") + "</div>" +
          '<button type="button" class="qs-x" onclick="sin.items.splice(' + i + ',1);renderStockIn()">✕</button></div>' +
          '<div class="m"><div class="qs-qty" dir="ltr"><button type="button" onclick="sinQty(' + i + ',-1)">−</button><input class="qs-qty-in" type="text" inputmode="numeric" value="' + it.qty +
          '" onchange="sin.items[' + i + '].qty=Math.max(1,Number(this.value)||1);renderStockIn()"><button type="button" onclick="sinQty(' + i + ',1)">+</button></div></div></div>';
      }).join("") : "") +
      '<label class="qs-amt qs-note"><small>' + escapeHtml(t("Note")) + '</small><input type="text" value="' + escapeHtml(sin.note) + '" oninput="sin.note=this.value" placeholder="' + escapeHtml(t("Example: bilty no. 4412")) + '"></label>' +
      (sin.fromShop ? '<p class="qs-hint">' + escapeHtml(t("From our own shop: the goods leave that shop's stock and come here. Nothing is counted twice.")) + "</p>" : "") + "</div>" +
      '<div class="qs-bar"><div class="t"><small>' + escapeHtml(t("Goods In")) + '</small><b dir="ltr">' + units + " " + escapeHtml(t("units")) + "</b></div>" +
      '<button type="button" class="qs-btn qs-primary" onclick="sinSave()"' + (sin.saving || !sin.items.length ? " disabled" : "") + ">" + escapeHtml(sin.saving ? t("Saving...") : t("Save")) + "</button></div>";
  }
  contentElement().innerHTML = '<div class="content"><div class="qs qs-buy' + (ur ? " qs-ur" : "") + '"' + (ur ? ' dir="rtl"' : "") + '><div class="qs-head"><button class="qs-back" type="button" onclick="showPage(\'goodsin\')">‹</button><b>' + escapeHtml(t(sin.mode === "shop" ? "From our shop" : "Goods In")) + "</b></div>" + body + "</div></div>";
  updatePageTitle("stockin");
}

function sinSearch(v) {
  sin.q = v; renderStockIn();
  const el = $("sinSearch"); if (el) { el.focus(); try { el.setSelectionRange(v.length, v.length); } catch (e) { /* search box */ } }
}

function sinAdd(id) {
  const p = (sin.data.products || []).find(function (x) { return x.id === id; });
  if (!p) return;
  const have = sin.items.find(function (x) { return x.productId === id; });
  if (have) have.qty += 1; else sin.items.push({ productId: id, name: p.name, qty: 1 });
  sin.q = ""; renderStockIn();
}

function sinAddNew() {
  const name = sin.q.trim().toUpperCase();
  if (!name) return;
  sin.items.push({ newItem: name, name: name, qty: 1 });
  sin.q = ""; renderStockIn();
}

function sinQty(i, d) { sin.items[i].qty = Math.max(1, (Number(sin.items[i].qty) || 1) + d); renderStockIn(); }

async function sinSave() {
  if (!sin.from.trim()) { showError(t("Write where the goods came from.")); return; }
  if (sin.fromShop && sin.fromShop === sin.wh) { showError(t("The goods cannot come from the same place they go to.")); return; }
  sin.saving = true; renderStockIn();
  try {
    sin.result = await call("stockin", { from: sin.from.trim(), fromShopId: sin.fromShop || "", note: sin.note, warehouseId: sin.wh,
      items: sin.items.map(function (it) { return it.productId ? { productId: it.productId, qty: it.qty } : { newItem: it.newItem, qty: it.qty }; }) });
    CHALLAN_CACHE[sin.result.inwardId] = sin.result;
    state.products = []; state.dashboard = null;
  } catch (error) { showError(error.message || "Could not save."); }
  finally { sin.saving = false; renderStockIn(); }
}


// Owner: turn a Stock In (goods already in the shop) into a purchase bill. The purchase screen opens with the
// supplier and items filled in; only rates and payment are needed. The stock is not added a second time.
async function stockInToPurchase(id) {
  try {
    const c = await getChallan(id);
    state.page = "quickpurchase";
    await loadQuick("purchase", true);
    qsReset();
    qs.stockInId = id;
    const src = String(c.source || c.fromName || "").trim();
    const sup = (qs.data.suppliers || []).find(function (x) { return x.name.trim().toLowerCase() === src.toLowerCase(); });
    qs.customer = sup ? { id: sup.id, name: sup.name, phone: sup.phone, balance: sup.balance } : { id: "", name: src, phone: "" };
    (c.items || []).forEach(function (it) {
      const p = qsProduct(it.productId);
      if (!p) return;
      const last = qsLastRate(p.id);
      qs.items.push({ id: p.id, name: p.name, qty: it.qty, max: 99999, rate: last > 0 ? last : (qsNum(p.price) || ""), fromLast: last > 0, edited: false });
    });
    if (c.toId) qs.whId = c.toId;
    qs.step = 2;
    updateNavigation("quickpurchase");
    renderQuick();
    showToast(t("Enter the rates and save. The stock is already in, it will not be added again."));
  } catch (error) { showError(error.message || "Could not open the stock in."); }
}


/* ============================================================
   OWNER UPDATES: what every user did, and new payments to check
   ============================================================ */
const UPD_ICONS = { sale: "↗", payment: "₨", purchase: "↙", stock: "⇩", cash: "◍", quote: "✎", job: "⚒", warranty: "✓" };
function updRowHtml(x) {
  const tm = String(x.time || "").slice(11, 16);
  const open = x.link && x.link.type === "sale" ? "openCard('sale','" + escapeHtml(x.link.id) + "')" : (x.link && x.link.type === "challan" ? "openChallanPdf('" + escapeHtml(x.link.id) + "')" : "");
  return '<div class="upd-row upd-' + escapeHtml(x.kind) + '"' + (open ? ' role="button" tabindex="0" onclick="' + open + '"' : "") + '><i aria-hidden="true">' + (UPD_ICONS[x.kind] || "•") + "</i>" +
    '<div><b>' + escapeHtml(x.by || "—") + "</b> <span>" + escapeHtml(x.text) + "</span><small>" + escapeHtml(tm) + "</small></div>" +
    (x.amount != null ? '<em dir="ltr">' + qsMoney(x.amount) + "</em>" : "") + "</div>";
}

async function loadUpdates() {
  state.updTab = state.updTab || "pay";
  state.updDate = state.updDate || localDay();
  try {
    const both = await Promise.all([call("paymentchecks", {}), call("activity", { date: state.updDate })]);
    state.updPay = both[0]; state.updAct = both[1];
  } catch (error) { showError(error.message || "Could not load."); return; }
  try { localStorage.setItem("erpUpdSeen", new Date().toISOString()); } catch (e) { /* private */ }
  renderUpdates();
  ownerBell();
}

function renderUpdates() {
  const pay = state.updPay || { items: [], count: 0, total: 0 };
  const act = state.updAct || { items: [], users: [] };
  const who = state.updUser || "";
  const tab = state.updTab;
  const tabs = '<div class="bills-tabs">' +
    '<button type="button" class="' + (tab === "pay" ? "on" : "") + '" onclick="state.updTab=\'pay\';renderUpdates()">' + escapeHtml(t("Payments to check")) + (pay.count ? ' <span class="upd-count blink">' + pay.count + "</span>" : "") + "</button>" +
    '<button type="button" class="' + (tab === "act" ? "on" : "") + '" onclick="state.updTab=\'act\';renderUpdates()">' + escapeHtml(t("Activity")) + "</button></div>";
  let body;
  if (tab === "pay") {
    state.updSel = state.updSel || {};
    Object.keys(state.updSel).forEach(function (k) { if (!pay.items.some(function (x) { return x.paymentId === k; })) delete state.updSel[k]; });
    body = pay.items.length ? '<p class="upd-sum">' + pay.count + " payment(s) taken by staff, " + qsMoney(pay.total) + ". Check each one (and the slip for online), then press OK.</p>" +
      '<div class="chk-bulk"><label class="qs-check"><input type="checkbox" id="updAll"' + (pay.items.every(function (x) { return state.updSel[x.paymentId]; }) ? " checked" : "") + ' onchange="updSelAll(this.checked)"> ' + escapeHtml(t("Select all")) + "</label>" +
        '<button type="button" class="btn primary" id="updOkSel" onclick="checkPaymentsSelected()">' + updSelLabel() + "</button></div>" +
      pay.items.map(function (x) {
        return '<div class="chk-card' + (x.method !== "cash" ? " online" : "") + (state.updSel[x.paymentId] ? " sel" : "") + '"><div class="chk-top"><label class="chk-tick"><input type="checkbox"' + (state.updSel[x.paymentId] ? " checked" : "") + ' onchange="updSel(\'' + escapeHtml(x.paymentId) + '\',this.checked)"><b dir="ltr">' + qsMoney(x.amount) + "</b></label>" +
          '<span class="badge ' + (x.method === "cash" ? "" : "warning") + '">' + escapeHtml(x.method.toUpperCase()) + (x.account ? " · " + escapeHtml(x.account) : "") + "</span></div>" +
          '<div class="chk-info"><span dir="ltr">' + escapeHtml(x.customer) + "</span><small>" + escapeHtml(x.what) + " · " + escapeHtml(x.by) + (x.shop ? " · " + escapeHtml(x.shop) : "") +
          " · " + escapeHtml(formatDate(x.date)) + " " + escapeHtml(String(x.date).slice(11, 16)) + (x.txnRef ? " · Ref " + escapeHtml(x.txnRef) : "") + (x.cashWith ? " · cash with " + escapeHtml(x.cashWith) : "") + "</small></div>" +
          '<div class="chk-actions">' + (x.slipUrl ? '<a class="btn secondary ledger-action-btn" href="' + escapeHtml(x.slipUrl) + '" target="_blank" rel="noopener">📎 ' + escapeHtml(t("View slip")) + "</a>" : (x.method !== "cash" ? '<span class="badge danger">No slip</span>' : "")) +
          '<button type="button" class="btn secondary ledger-action-btn" onclick="checkPayment(\'' + escapeHtml(x.paymentId) + '\',false)">' + escapeHtml(t("Problem")) + "</button>" +
          '<button type="button" class="btn primary ledger-action-btn" onclick="checkPayment(\'' + escapeHtml(x.paymentId) + '\',true)">✓ OK</button></div></div>';
      }).join("") : '<p class="db-clear">✓ ' + escapeHtml(t("All clear. Nothing is waiting for you.")) + "</p>";
  } else {
    const list = act.items.filter(function (x) { return !who || x.by === who; });
    body = '<div class="toolbar-actions upd-filters"><input type="date" class="search" value="' + escapeHtml(state.updDate) + '" onchange="state.updDate=this.value;loadUpdates()">' +
      '<select class="search" onchange="state.updUser=this.value;renderUpdates()"><option value="">All users</option>' +
      act.users.map(function (u) { return "<option" + (u === who ? " selected" : "") + ">" + escapeHtml(u) + "</option>"; }).join("") + "</select></div>" +
      (list.length ? '<div class="upd-list">' + list.map(updRowHtml).join("") + "</div>" : '<p class="empty">Nothing on this day.</p>');
  }
  contentElement().innerHTML = '<div class="content upd-page"><div class="toolbar"><div><h2>' + escapeHtml(t("Updates")) + "</h2><p>Everything your users do, and the payments they take.</p></div></div>" + tabs + body + "</div>";
  updatePageTitle("updates");
}

function updSelLabel() {
  const pay = state.updPay || { items: [] }, sel = state.updSel || {};
  const list = pay.items.filter(function (x) { return sel[x.paymentId]; });
  return list.length ? "✓ " + escapeHtml(t("OK selected")) + " (" + list.length + " · " + qsMoney(list.reduce(function (a, x) { return a + Number(x.amount || 0); }, 0)) + ")" : "✓ " + escapeHtml(t("OK selected"));
}
function updSel(id, on) {
  state.updSel = state.updSel || {};
  if (on) state.updSel[id] = true; else delete state.updSel[id];
  const b = $("updOkSel"); if (b) b.innerHTML = updSelLabel();
  document.querySelectorAll(".chk-card").forEach(function (c) { const i = c.querySelector(".chk-tick input"); if (i) c.classList.toggle("sel", i.checked); });
  const all = $("updAll"); if (all) all.checked = (state.updPay.items || []).every(function (x) { return state.updSel[x.paymentId]; });
}
function updSelAll(on) {
  state.updSel = {};
  if (on) (state.updPay.items || []).forEach(function (x) { state.updSel[x.paymentId] = true; });
  renderUpdates();
}
async function checkPaymentsSelected() {
  const ids = Object.keys(state.updSel || {});
  if (!ids.length) { showError(t("Tick the payments first.")); return; }
  const b = $("updOkSel"); if (b) b.disabled = true;
  try {
    state.updPay = await call("checkpayment", { paymentIds: ids, ok: true });
    state.updSel = {};
    showToast(ids.length + " " + t("payments checked."));
    renderUpdates();
    ownerBell();
  } catch (error) { if (b) b.disabled = false; showError(error.message || "Could not save."); }
}

async function checkPayment(id, ok) {
  let note = "";
  if (!ok) { note = prompt("What is the problem? (for example: not in bank, amount different)") || ""; if (!note) return; }
  try {
    state.updPay = await call("checkpayment", { paymentId: id, ok: ok, note: note });
    showToast(ok ? "Checked." : "Marked as problem.");
    renderUpdates();
    ownerBell();
  } catch (error) { showError(error.message || "Could not save."); }
}

// Owner's bell in the top bar: blinks while new payments wait to be checked.
async function ownerBell() {
  if (!state.user || !isAdminUser()) return;
  if (document.hidden) return;
  let b;
  try { b = await call("ownerbell", {}); } catch (e) { return; }
  const bar = document.querySelector(".topbar-actions");
  let el = $("ownerBell");
  let seen = "";
  try { seen = localStorage.getItem("erpUpdSeen") || ""; } catch (e) { /* private */ }
  const fresh = b.latest && (!seen || b.latest > seen.slice(0, 19));
  if (!b.toCheck && !fresh) { if (el) el.remove(); return; }
  if (bar && !el) {
    el = document.createElement("button");
    el.id = "ownerBell"; el.type = "button";
    el.addEventListener("click", function () { state.updTab = Number(el.dataset.n) > 0 ? "pay" : "act"; showPage("updates"); });
    bar.insertBefore(el, bar.firstChild);
  }
  if (!el) return;
  el.dataset.n = b.toCheck;
  el.className = "owner-bell" + (b.toCheck ? " blink" : "");
  el.title = b.toCheck ? b.toCheck + " " + t("to check") : t("New updates");
  el.innerHTML = '<span aria-hidden="true">🔔</span>' + (b.toCheck ? ' <b dir="ltr">' + b.toCheck + '</b><span class="bell-lbl"> ' + escapeHtml(t("to check")) + "</span>" : '<span class="bell-lbl"> ' + escapeHtml(t("New updates")) + "</span>");
}
window.addEventListener("load", function () { setTimeout(ownerBell, 5000); setInterval(ownerBell, 60000); });
document.addEventListener("visibilitychange", function () { if (!document.hidden) ownerBell(); });


/* ---------- Stock In: "Received from" picker (our shops, suppliers, or a new name) ---------- */
function sinFromHtml(d) {
  if (sin.from) {
    return '<div class="sin-from-sel"><div><small>' + escapeHtml(t("Received from")) + '</small><b dir="ltr">' + escapeHtml(sin.from) + "</b>" +
      (sin.fromShop ? '<span class="qs-badge">' + escapeHtml(t("Our shop")) + "</span>" : (sin.fromNew ? '<span class="qs-badge">' + escapeHtml(t("New supplier")) + "</span>" : "")) + "</div>" +
      '<button type="button" class="qs-btn" onclick="sinFromClear()">' + escapeHtml(t("Change")) + "</button></div>";
  }
  const q = String(sin.fromQ || "").trim(), ql = q.toLowerCase();
  const shops = sin.mode === "supplier" ? [] : (d.shops || []).filter(function (w) { return w.id !== sin.wh && (!ql || w.name.toLowerCase().indexOf(ql) !== -1); });
  const sups = sin.mode === "shop" ? [] : (d.sources || []).filter(function (n) { return !ql || n.toLowerCase().indexOf(ql) !== -1; }).slice(0, ql ? 10 : 6);
  const exact = (d.sources || []).some(function (n) { return n.toLowerCase() === ql; }) || (d.shops || []).some(function (w) { return w.name.toLowerCase() === ql; });
  return '<div class="sin-from"><small>' + escapeHtml(t("Received from")) + " *</small>" +
    '<input class="qs-search" id="sinFromQ" type="search" autocomplete="off" placeholder="' + escapeHtml(t(sin.mode === "shop" ? "Search our shop" : (sin.mode === "supplier" ? "Search supplier, or write a new name" : "Search supplier or shop, or write a new name"))) + '" value="' + escapeHtml(q) + '" oninput="sinFromSearch(this.value)">' +
    (shops.length ? '<h4>' + escapeHtml(t("Our shops")) + '</h4><div class="sin-chips">' + shops.map(function (w) {
      return '<button type="button" class="sin-chip shop" onclick="sinPickShop(\'' + escapeHtml(w.id) + '\')"><b dir="ltr">' + escapeHtml(w.name) + "</b></button>";
    }).join("") + "</div>" : "") +
    (sups.length ? '<h4>' + escapeHtml(t("Suppliers")) + '</h4><div class="sin-list">' + sups.map(function (n) {
      return '<button type="button" class="sin-row" data-name="' + escapeHtml(n) + '" onclick="sinPickName(this.dataset.name,false)"><span dir="ltr">' + escapeHtml(n) + "</span></button>";
    }).join("") + "</div>" : "") +
    (q.length >= 2 && !exact && sin.mode !== "shop" ? '<button type="button" class="qs-newrow" data-name="' + escapeHtml(q) + '" onclick="sinPickName(this.dataset.name,true)"><span><small>' + escapeHtml(t("New supplier")) + '</small><b dir="ltr">' + escapeHtml(q) + '</b></span><span class="qs-add">+ ' + escapeHtml(t("Add")) + "</span></button>" : "") +
    "</div>";
}

function sinFromSearch(v) {
  sin.fromQ = v; renderStockIn();
  const el = $("sinFromQ"); if (el) { el.focus(); try { el.setSelectionRange(v.length, v.length); } catch (e) { /* search box */ } }
}

function sinPickShop(id) {
  const w = ((sin.data || {}).shops || []).find(function (x) { return x.id === id; });
  if (!w) return;
  sin.from = w.name; sin.fromShop = w.id; sin.fromNew = false;
  sin.items = sin.items.filter(function (it) { return it.productId; });     // new items cannot come from our own shop
  renderStockIn();
}

function sinPickName(name, isNew) {
  sin.from = String(name || "").trim(); sin.fromShop = ""; sin.fromNew = !!isNew;
  renderStockIn();
}

function sinFromClear() { sin.from = ""; sin.fromShop = ""; sin.fromNew = false; sin.fromQ = ""; renderStockIn(); }


/* ============================================================
   GOODS IN: one button for every way goods come in.
   - From a supplier, rates later (anyone with Goods In; owner / manager add the bill later)
   - From a supplier with rates and payment (owner / manager: the purchase screen)
   - From our own shop (main shop: a move, nothing counted twice)
   ============================================================ */
function hasRight(m) { return !!(state.user && (state.user.admin || (state.user.modules || []).indexOf(m) !== -1)); }

function loadGoodsIn() {
  const ur = getLang() === "ur";
  const opts = [];
  if (hasRight("stockin")) opts.push(["supplier", "⇩", "From a supplier", hasRight("quickpurchase") ? "Count the goods now, add the rates later" : "Count the goods. The owner adds the rates later.", ""]);
  if (hasRight("quickpurchase")) opts.push(["purchase", "₨", "From a supplier, with rates", "Rates and payment now (purchase bill)", "nv"]);
  if (!isShopUser() && (hasRight("stockin") || hasRight("shopreturn"))) opts.push(["shop", "⇦", "From our shop", "Hamza / GM goods back to here", "gr"]);
  if (opts.length === 1) return goodsInGo(opts[0][0]);
  contentElement().innerHTML = '<div class="content home-page hm gi"' + (ur ? ' dir="rtl"' : "") + "><h2>" + escapeHtml(t("Where did the goods come from?")) + "</h2>" +
    '<div class="gi-list">' + opts.map(function (o) {
      return '<button type="button" class="gi-opt" onclick="goodsInGo(\'' + o[0] + '\')"><span class="hm-ic ' + o[4] + '" aria-hidden="true">' + o[1] + "</span><span><b>" + escapeHtml(t(o[2])) +
        "</b><small>" + escapeHtml(t(o[3])) + '</small></span><span class="gi-go" aria-hidden="true">›</span></button>';
    }).join("") + "</div></div>";
  updatePageTitle("goodsin");
}

async function goodsInGo(kind) {
  if (kind === "purchase") { showPage("quickpurchase"); return; }
  state.page = "stockin";
  updateNavigation("goodsin");
  await loadStockIn();
  sin.mode = kind === "shop" ? "shop" : "supplier";
  renderStockIn();
}


/* ---------- Commission (the "kut") given to the buyer's man: not on the bill ---------- */
function qsCommissionHtml() {
  if (isQuote() || isInward()) return "";
  if (!qs.comm) return '<button type="button" class="qs-more" onclick="qs.comm=true;renderQuick();var e=$(\'qsComm\');if(e)e.focus()">+ ' + escapeHtml(t("Commission (not on the bill)")) + "</button>";
  const cash = qs.method === "cash" && qs.pay !== "credit";
  return '<div class="qs-more-box qs-comm"><b>' + escapeHtml(t("Commission (not on the bill)")) + "</b>" +
    '<small class="qs-hint">' + escapeHtml(t("Given to the buyer's man. The customer never sees it. It lowers the profit and the incentive.")) + "</small>" +
    "<label>" + escapeHtml(t("Amount")) + '<span dir="ltr">Rs. <input id="qsComm" type="text" inputmode="decimal" value="' + escapeHtml(qs.commission) + '" oninput="qs.commission=this.value"></span></label>' +
    "<label>" + escapeHtml(t("Given to")) + '<input type="text" value="' + escapeHtml(qs.commissionTo) + '" placeholder="' + escapeHtml(t("Name (optional)")) + '" oninput="qs.commissionTo=this.value"></label>' +
    (cash ? '<label class="qs-check"><input type="checkbox"' + (qs.commissionCash !== false ? " checked" : "") + ' onchange="qs.commissionCash=this.checked"> ' +
      escapeHtml(t("Paid from this bill's cash (my cash in hand goes down)")) + "</label>" : "") +
    '<button type="button" class="qs-link" onclick="qs.comm=false;qs.commission=\'\';qs.commissionTo=\'\';renderQuick()">' + escapeHtml(t("Remove commission")) + "</button></div>";
}

/* ---------- Delete a wrong bill: items go back to stock, money paid on it is given back ---------- */
async function deleteBillAsk(id, no) {
  const reason = prompt(t("Why delete bill") + " " + no + "?\n" + t("Example: wrong item, wrong rate, made twice"));
  if (reason === null) return;
  if (!reason.trim()) { showError(t("Write why the bill is deleted.")); return; }
  if (!confirm(t("Delete bill") + " " + no + "?\n\n" + t("All its items go back to stock, and money paid on it is given back to the customer. This cannot be undone."))) return;
  try {
    const r = await call("deletebill", { saleId: id, reason: reason.trim() });
    showToast(t("Bill") + " " + r.invoiceNo + " " + t("deleted. Items are back in stock.") + (r.refunded ? " " + qsMoney(r.refunded) + " " + t("given back.") : ""));
    await loadPage(state.page);
  } catch (error) { showError(error.message || "Could not delete the bill."); }
}


/* ---------- Our own shop chosen as the customer: goods go with Send to shop, not a bill ---------- */
function qsOwnShopChosen(shop) {
  if (canOpen("inward") && !isShopUser()) {
    if (!confirm(shop.name + " " + t("is our own shop. Goods for it go with Send to shop, not with a sale bill.") + "\n\n" + t("Open Send to shop for") + " " + shop.name + "?")) return;
    const carry = qs.items.filter(function (it) { return !it.isNew; }).map(function (it) { return { id: it.id, qty: it.qty }; });
    showPage("inward");
    setTimeout(function () {
      try {
        qsPickShop(shop.id);
        carry.forEach(function (x) { const p = qsProduct(x.id); if (p && qsOwnerStock(p) > 0) { qsAddItem(x.id); const it = qs.items[qs.items.length - 1]; if (it) it.qty = Math.min(x.qty, it.max); } });
        renderQuick();
      } catch (e) { /* the user picks again */ }
    }, 900);
  } else {
    showError(shop.name + " " + t("is our own shop. Goods for it go with Send to shop, not with a sale bill. Ask the main shop."));
  }
}

/* ---------- More than one payment on a bill (e.g. two bank slips, or part cash and part online) ---------- */
function qsMorePaysHtml() {
  const list = qs.morePays || [];
  const extra = list.reduce(function (a, x) { return a + qsNum(x.amount); }, 0);
  const first = qsPaidAmount() - extra;
  let html = "";
  if (list.length) {
    html += '<div class="qs-pay1"><span>' + escapeHtml(t("Payment 1")) + " · " + escapeHtml(t(qs.method.charAt(0).toUpperCase() + qs.method.slice(1))) +
      (qs.method !== "cash" && qs.payAccount ? " · " + escapeHtml(qs.payAccount) : "") + '</span><b dir="ltr" id="qsPay1" class="' + (first <= 0 ? "bad" : "") + '">' + qsMoney(first) + "</b></div>";
    list.forEach(function (x, i) {
      html += '<div class="qs-more-box qs-paybox"><div class="qs-payhead"><b>' + escapeHtml(t("Payment")) + " " + (i + 2) + "</b>" +
        '<button type="button" class="qs-link" onclick="qsPayRemove(' + i + ')">' + escapeHtml(t("Remove")) + "</button></div>" +
        '<div class="qs-seg">' + ["online", "cheque", "cash"].map(function (m) {
          return '<button type="button" class="' + (x.method === m ? "sel" : "") + '" onclick="qsPaySet(' + i + ',\'method\',\'' + m + '\',true)">' + escapeHtml(t(m.charAt(0).toUpperCase() + m.slice(1))) + "</button>";
        }).join("") + "</div>" +
        "<label>" + escapeHtml(t("Amount")) + '<span dir="ltr">Rs. <input type="text" inputmode="decimal" value="' + escapeHtml(x.amount || "") + '" oninput="qsPaySet(' + i + ',\'amount\',this.value,false)"></span></label>' +
        (x.method !== "cash"
          ? "<label>" + escapeHtml(t("Received in (account)")) + '<input type="text" list="payAccounts" value="' + escapeHtml(x.payAccount || "") + '" oninput="qsPaySet(' + i + ',\'payAccount\',this.value,false)" placeholder="' + escapeHtml(t("e.g. Meezan Bank, JazzCash, Easypaisa")) + '"></label>' +
            "<label>" + escapeHtml(t("Transaction / cheque no.")) + '<input type="text" dir="ltr" value="' + escapeHtml(x.payRef || "") + '" oninput="qsPaySet(' + i + ',\'payRef\',this.value,false)"></label>' +
            (x.slip
              ? '<div class="slip-prev"><img src="' + x.slip.preview + '" alt=""><div><b>' + escapeHtml(t("Slip attached")) + "</b><small>" + escapeHtml(x.slip.size) + '</small></div><button type="button" class="qs-btn" onclick="qsPaySet(' + i + ',\'slip\',null,true)">' + escapeHtml(t("Remove")) + "</button></div>"
              : '<label class="slip-btn"><input type="file" accept="image/*" onchange="qsPaySlip(' + i + ', this.files && this.files[0])"><span>📎 ' + escapeHtml(t("Attach slip / screenshot")) + "</span></label>")
          : "") + "</div>";
    });
  }
  return html + '<button type="button" class="qs-more" onclick="qsPayAdd()">+ ' + escapeHtml(t("Add another payment (another slip or account)")) + "</button>";
}

function qsPayAdd() {
  qs.morePays = qs.morePays || [];
  if (qs.morePays.length >= 9) return;
  qs.morePays.push({ method: "online", amount: "", payAccount: "", payRef: "", slip: null });
  renderQuick();
  const boxes = document.querySelectorAll(".qs-paybox input[inputmode=decimal]");
  if (boxes.length) boxes[boxes.length - 1].focus();
}

function qsPayRemove(i) { qs.morePays.splice(i, 1); renderQuick(); }

function qsPaySet(i, key, v, redraw) {
  const x = qs.morePays[i];
  if (!x) return;
  x[key] = v;
  if (redraw) { renderQuick(); return; }
  if (key === "amount") {
    const el = $("qsPay1");
    if (el) {
      const first = qsPaidAmount() - qs.morePays.reduce(function (a, y) { return a + qsNum(y.amount); }, 0);
      el.textContent = qsMoney(first); el.className = first <= 0 ? "bad" : "";
    }
  }
}

async function qsPaySlip(i, file) {
  try { qs.morePays[i].slip = await slipRead(file); renderQuick(); } catch (error) { showError(error.message); }
}

/* ---------- Owner / bills: open each payment's slip ---------- */
function billPaysHtml(b) {
  const list = (b.pays || []).filter(function (x) { return x.amount > 0; });
  if (list.length < 2 && !list.some(function (x) { return x.slip; })) return "";
  return '<div class="bill-pays">' + list.map(function (x, k) {
    const label = qsMoney(x.amount) + " " + t(x.method === "cash" ? "Cash" : (x.method === "cheque" ? "Cheque" : "Online")) + (x.account ? " · " + x.account : "") + (x.ref ? " · " + x.ref : "");
    return x.slip
      ? '<a href="' + escapeHtml(x.slip) + '" target="_blank" rel="noopener" class="bill-slip">📎 ' + escapeHtml(label) + "</a>"
      : '<span class="bill-slip none">' + escapeHtml(label) + "</span>";
  }).join("") + "</div>";
}


// Item by item: what each sale earned, and why an item earned nothing (no cost price yet, or no profit).
// Staff get no cost or profit from the server, only what each line earned.
function incentiveDetailsHtml(rows, mine) {
  const list = rows.filter(function (r) { return r.salespersonId !== "unassigned" && (r.lines || []).length; });
  if (!list.length) return "";
  const full = list.some(function (r) { return r.lines.some(function (l) { return l.cost !== undefined; }); });
  const missing = {};
  list.forEach(function (r) { r.lines.forEach(function (l) { if (/cost/i.test(l.why || "") && !/below/.test(l.why)) missing[l.bill] = (missing[l.bill] || 0) + 1; }); });
  const bills = Object.keys(missing);
  const warn = bills.length
    ? '<p class="qs-warn">' + escapeHtml(bills.length + (bills.length === 1 ? " bill has" : " bills have") + " items without a cost price, so they earn no incentive yet: " + bills.slice(0, 10).join(", ") + (bills.length > 10 ? "…" : "")) +
      escapeHtml(full ? ". Open the bill in Bills and tap Set cost." : ". The owner will set the cost.") + "</p>"
    : "";
  return warn + list.map(function (r) {
    const body = r.lines.map(function (l) {
      const sale = (state.incentiveSaleIds || {})[l.bill];
      return "<tr" + (l.why ? ' class="muted-row"' : "") + "><td>" + cardLink("ref", l.bill, l.bill) + "<br><small>" + escapeHtml(formatDate(l.date)) + (l.by ? " · " + escapeHtml(l.by) : "") + "</small></td>" +
        "<td>" + escapeHtml(l.item) + (l.why ? '<br><small class="why">' + escapeHtml(l.why) + "</small>" : "") + "</td>" +
        '<td class="num">' + escapeHtml(String(l.qty)) + "</td>" +
        '<td class="num">' + (l.rate === "" ? "" : money(l.rate)) + "</td>" +
        (full ? '<td class="num">' + (l.cost === "" ? "" : (l.cost > 0 ? money(l.cost) : "—")) + "</td>" + '<td class="num">' + money(l.above) + "</td>" : "") +
        '<td class="num"><b>' + money(l.earn || 0) + "</b></td></tr>";
    }).join("");
    return '<details class="panel inc-detail"' + (mine ? " open" : "") + "><summary><b>" + escapeHtml(mine ? "Item by item" : r.name + ": item by item") + "</b> <small>(" + r.lines.length + " lines)</small></summary>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Bill</th><th>Item</th><th class="num">Qty</th><th class="num">Sold at</th>' +
      (full ? '<th class="num">Cost</th><th class="num">Profit</th>' : "") + '<th class="num">Incentive</th></tr></thead><tbody>' +
      body + "</tbody></table></div></details>";
  }).join("");
}


/* ---------- Owner / manager: set or correct the cost of each item on a bill ---------- */
async function openBillCost(saleId) {
  let d;
  try { d = await call("billcosts", { saleId: saleId }); } catch (error) { showError(error.message); return; }
  const box = document.createElement("div");
  box.className = "cost-modal";
  box.innerHTML = '<div class="cost-card" role="dialog" aria-modal="true"><h3>' + escapeHtml(t("Cost on bill")) + " " + escapeHtml(d.invoiceNo) + "</h3>" +
    '<p class="qs-hint">' + escapeHtml(t("Profit and incentive change at once. The bill and the customer's account stay the same.")) + "</p>" +
    '<div class="table-wrap"><table class="table"><thead><tr><th>' + escapeHtml(t("Item")) + '</th><th class="num">' + escapeHtml(t("Qty")) + '</th><th class="num">' + escapeHtml(t("Sold for")) + '</th><th class="num">' + escapeHtml(t("Cost per unit")) + "</th></tr></thead><tbody>" +
    d.lines.map(function (l, i) {
      const v = l.unitCost > 0 ? l.unitCost : (l.productCost > 0 ? l.productCost : "");
      return "<tr><td>" + escapeHtml(l.item) + (l.unitCost > 0 ? "" : '<br><small class="why">' + escapeHtml(t(l.productCost > 0 ? "Not on the bill. Product cost filled in." : "No cost yet")) + "</small>") + "</td>" +
        '<td class="num">' + escapeHtml(String(l.qty)) + '</td><td class="num">' + money(l.lineTotal) + "</td>" +
        '<td class="num"><input class="cost-in" data-i="' + i + '" type="text" inputmode="decimal" value="' + escapeHtml(String(v)) + '" placeholder="0"></td></tr>';
    }).join("") + "</tbody></table></div>" +
    (d.structure ? '<label class="cost-struct">' + escapeHtml(d.structure.label) + " (" + money(d.structure.amount) + ")<small>" + escapeHtml(t("Fabricator cost for this structure")) + '</small><input id="costStruct" type="text" inputmode="decimal" value="' + escapeHtml(d.structure.cost > 0 ? String(d.structure.cost) : "") + '" placeholder="0"></label>' : "") +
    (d.commission ? '<p class="qs-hint">' + escapeHtml(t("Commission on this bill")) + ": " + money(d.commission) + "</p>" : "") +
    '<label class="qs-check"><input type="checkbox" id="costToProduct" checked> ' + escapeHtml(t("Also save as the product's cost price (for next bills)")) + "</label>" +
    '<div class="form-actions"><button type="button" class="btn secondary" id="costCancel">' + escapeHtml(t("Cancel")) + '</button><button type="button" class="btn primary" id="costSave">' + escapeHtml(t("Save")) + "</button></div></div>";
  document.body.appendChild(box);
  const close = function () { box.remove(); };
  box.addEventListener("click", function (e) { if (e.target === box) close(); });
  box.querySelector("#costCancel").onclick = close;
  const first = box.querySelector(".cost-in"); if (first) first.focus({ preventScroll: true });
  box.querySelector("#costSave").onclick = async function () {
    const lines = [...box.querySelectorAll(".cost-in")].map(function (inp) { return { id: d.lines[Number(inp.dataset.i)].id, unitCost: Number(String(inp.value).replace(/[, ]/g, "")) || 0 }; });
    this.disabled = true;
    try {
      const sc = box.querySelector("#costStruct");
      const r = await call("setbillcost", { saleId: d.saleId, lines: lines, saveToProduct: box.querySelector("#costToProduct").checked, structureCost: sc ? (Number(String(sc.value).replace(/[, ]/g, "")) || 0) : null });
      close();
      showToast(t("Cost saved on bill") + " " + d.invoiceNo + ". " + t("Profit and incentive are updated."));
      await loadPage(state.page);
    } catch (error) { this.disabled = false; showError(error.message || "Could not save."); }
  };
}


/* ============================================================
   CASH & PAYMENTS (owner / manager): all money from customers in one list
   ============================================================ */
function canSeeMoneyIn() { return !!state.user && (isAdminUser() || hasRight("quickpurchase") || hasRight("cashkeep")); }

function moneyTabsHtml(on) {
  if (!canSeeMoneyIn()) return "";
  return '<div class="stock-tabs money-tabs"><button type="button" class="' + (on === "in" ? "on" : "") + '" onclick="state.cashTab=\'in\';loadMoneyIn()"><b>' + escapeHtml(t("All payments")) + "</b><small>" + escapeHtml(t("Bills and ledger")) + "</small></button>" +
    '<button type="button" class="' + (on === "hand" ? "on" : "") + '" onclick="state.cashTab=\'hand\';loadCash()"><b>' + escapeHtml(t("Cash in hand")) + "</b><small>" + escapeHtml(t("With each person")) + "</small></button></div>";
}

const mi = { from: "", to: "", method: "", kind: "", q: "" };
async function loadMoneyIn() {
  state.cashTab = "in";
  if (!mi.from) { mi.from = localDay(); mi.to = localDay(); }
  try { mi.data = await call("moneyin", { from: mi.from, to: mi.to }); } catch (error) { showError(error.message || "Could not load."); return; }
  renderMoneyIn();
}

function renderMoneyIn() {
  const d = mi.data || { rows: [], byMethod: {}, byKind: {} };
  const ur = getLang() === "ur";
  const q = mi.q.trim().toLowerCase();
  const rows = d.rows.filter(function (r) {
    return (!mi.method || r.method === mi.method) && (!mi.kind || (mi.kind === "bill" ? r.kind === "Paid with the bill" : (mi.kind === "ledger" ? /ledger/.test(r.kind) : r.kind === "Money back"))) &&
      (!q || (r.customer + " " + r.bill + " " + r.by + " " + r.account + " " + r.ref).toLowerCase().indexOf(q) !== -1);
  });
  const sel = function (val, cur, label, fn) { return '<button type="button" class="' + (cur === val ? "sel" : "") + '" onclick="' + fn + "('" + val + "')\">" + escapeHtml(t(label)) + "</button>"; };
  contentElement().innerHTML = '<div class="content cash-page"' + (ur ? ' dir="rtl"' : "") + ">" + moneyTabsHtml("in") +
    '<div class="toolbar"><div><h2>' + escapeHtml(t("Cash & Payments")) + "</h2><p>" + escapeHtml(t("Every payment from customers: paid with the bill, and received later on the account.")) + "</p></div>" +
    '<div class="toolbar-actions"><input type="date" class="search" value="' + escapeHtml(mi.from) + '" onchange="mi.from=this.value;if(mi.to<mi.from)mi.to=mi.from;loadMoneyIn()"><input type="date" class="search" value="' + escapeHtml(mi.to) + '" onchange="mi.to=this.value;loadMoneyIn()">' +
    (canOpen("receive") ? '<button class="btn primary" type="button" onclick="showPage(\'receive\')">+ ' + escapeHtml(t("Receive Payment")) + "</button>" : "") + "</div></div>" +
    '<div class="cash-cards"><div class="cash-main"><small>' + escapeHtml(t("Total received")) + '</small><b dir="ltr">' + qsMoney(d.total || 0) + "</b><small>" + escapeHtml(String(d.count || 0)) + " " + escapeHtml(t("payments")) + "</small></div>" +
    '<div><small>' + escapeHtml(t("Cash")) + '</small><b dir="ltr">' + qsMoney(d.byMethod.cash || 0) + "</b></div>" +
    '<div><small>' + escapeHtml(t("Online")) + '</small><b dir="ltr">' + qsMoney(d.byMethod.online || 0) + "</b></div>" +
    '<div><small>' + escapeHtml(t("Cheque")) + '</small><b dir="ltr">' + qsMoney(d.byMethod.cheque || 0) + "</b></div>" +
    '<div><small>' + escapeHtml(t("Paid with the bill")) + '</small><b dir="ltr">' + qsMoney(d.byKind.withBill || 0) + "</b></div>" +
    '<div><small>' + escapeHtml(t("Received later (ledger)")) + '</small><b dir="ltr">' + qsMoney(d.byKind.ledger || 0) + "</b></div></div>" +
    '<div class="panel"><div class="mi-filters"><div class="qs-seg">' + sel("", mi.method, "All", "miSet.bind(null,'method')") + sel("cash", mi.method, "Cash", "miSet.bind(null,'method')") +
      sel("online", mi.method, "Online", "miSet.bind(null,'method')") + sel("cheque", mi.method, "Cheque", "miSet.bind(null,'method')") + "</div>" +
    '<div class="qs-seg">' + sel("", mi.kind, "All", "miSet.bind(null,'kind')") + sel("bill", mi.kind, "With the bill", "miSet.bind(null,'kind')") + sel("ledger", mi.kind, "Ledger", "miSet.bind(null,'kind')") +
      (d.byKind.back ? sel("back", mi.kind, "Money back", "miSet.bind(null,'kind')") : "") + "</div>" +
    '<input class="search" type="search" placeholder="' + escapeHtml(t("Search customer, bill, person")) + '" value="' + escapeHtml(mi.q) + '" oninput="mi.q=this.value;miRows()"></div>' +
    '<div id="miRows">' + miRowsHtml(rows) + "</div></div></div>";
  updatePageTitle("cash");
}

function miSet(key, val) { mi[key] = val; renderMoneyIn(); }
function miRows() { const el = $("miRows"); if (!el) return; renderMoneyIn(); const s = document.querySelector(".mi-filters input.search"); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }

function miRowsHtml(rows) {
  if (!rows.length) return '<p class="empty">' + escapeHtml(t("No payments in these dates.")) + "</p>";
  return '<div class="table-wrap"><table class="table mi-table"><thead><tr><th>' + escapeHtml(t("When")) + "</th><th>" + escapeHtml(t("Customer")) + "</th><th>" + escapeHtml(t("For")) + "</th><th>" +
    escapeHtml(t("How")) + "</th><th>" + escapeHtml(t("By")) + '</th><th class="num">' + escapeHtml(t("Amount")) + "</th></tr></thead><tbody>" +
    rows.map(function (r) {
      const how = t(r.method === "cash" ? "Cash" : (r.method === "cheque" ? "Cheque" : "Online")) + (r.account ? " · " + r.account : "") + (r.ref ? " · " + r.ref : "");
      return "<tr><td>" + escapeHtml(formatDate(r.date)) + "<br><small>" + escapeHtml(r.time || "") + "</small></td>" +
        "<td><b>" + (r.partyId && canOpen("accounts") ? cardLink(r.partyType === "supplier" ? "supplier" : "customer", r.partyId, r.customer) : escapeHtml(r.customer)) + "</b>" + (r.phone ? '<br><small dir="ltr">' + escapeHtml(r.phone) + "</small>" : "") + "</td>" +
        "<td>" + escapeHtml(t(r.kind)) + (r.bill ? '<br><small dir="ltr">' + String(r.bill).split(/\s*,\s*/).map(function (n) { const m = n.match(/^[A-Z]+-?\d+/i); return m ? cardLink("ref", m[0], n) : escapeHtml(n); }).join(", ") + "</small>" : "") + "</td>" +
        "<td>" + escapeHtml(how) + (r.slip ? '<br><a href="' + escapeHtml(r.slip) + '" target="_blank" rel="noopener" class="bill-slip">📎 ' + escapeHtml(t("View slip")) + "</a>" : "") +
          (r.check ? ' <span class="badge ' + (r.check === "OK" ? "success" : "danger") + '">' + escapeHtml(t(r.check === "OK" ? "Checked" : "Problem")) + "</span>" : "") + "</td>" +
        "<td>" + escapeHtml(r.by) + (r.shop ? "<br><small>" + escapeHtml(r.shop) + "</small>" : "") + (r.method === "cash" && r.cashWith && r.cashWith !== r.by ? "<br><small>" + escapeHtml(t("Cash with")) + " " + escapeHtml(r.cashWith) + "</small>" : "") + "</td>" +
        '<td class="num"><b' + (r.amount < 0 ? ' class="neg"' : "") + ' dir="ltr">' + qsMoney(r.amount) + "</b></td></tr>";
    }).join("") + "</tbody></table></div>";
}

/* ============================================================
   PAYMENT ON A BILL (from Bills): short form, Cash / Online / Cheque
   ============================================================ */
function billPayAsk(saleId) {
  const b = ((state.bills && state.bills.sales) || []).find(function (x) { return x.id === saleId; });
  if (!b) return;
  const st = { method: "cash", amount: String(b.due), payAccount: "", payRef: "", slip: null, ref: newClientRef() };
  const box = document.createElement("div");
  box.className = "cost-modal";
  const draw = function () {
    box.innerHTML = '<div class="cost-card bp-card" role="dialog" aria-modal="true"><h3>' + escapeHtml(t("Payment for bill")) + " " + escapeHtml(b.no) + "</h3>" +
      '<p class="qs-hint">' + escapeHtml(b.party) + " · " + escapeHtml(t("Still to pay")) + ' <b dir="ltr">' + qsMoney(b.due) + "</b></p>" +
      '<div class="qs-seg">' + ["cash", "online", "cheque"].map(function (m) {
        return '<button type="button" data-m="' + m + '" class="' + (st.method === m ? "sel" : "") + '">' + escapeHtml(t(m.charAt(0).toUpperCase() + m.slice(1))) + "</button>";
      }).join("") + "</div>" +
      '<label class="qs-amt"><small>' + escapeHtml(t("Amount")) + '</small><span dir="ltr">Rs. <input id="bpAmount" type="text" inputmode="decimal" value="' + escapeHtml(st.amount) + '"></span></label>' +
      (st.method !== "cash"
        ? "<label>" + escapeHtml(t("Received in (account)")) + '<input id="bpAcc" type="text" list="payAccounts" value="' + escapeHtml(st.payAccount) + '" placeholder="' + escapeHtml(t("e.g. Meezan Bank, JazzCash, Easypaisa")) + '"></label>' +
          "<label>" + escapeHtml(t("Transaction / cheque no.")) + '<input id="bpRef" type="text" dir="ltr" value="' + escapeHtml(st.payRef) + '"></label>' +
          (st.slip ? '<div class="slip-prev"><img src="' + st.slip.preview + '" alt=""><div><b>' + escapeHtml(t("Slip attached")) + "</b><small>" + escapeHtml(st.slip.size) + '</small></div><button type="button" class="qs-btn" id="bpSlipX">' + escapeHtml(t("Remove")) + "</button></div>"
            : '<label class="slip-btn"><input id="bpSlip" type="file" accept="image/*"><span>📎 ' + escapeHtml(t("Attach slip / screenshot")) + "</span></label>")
        : "") +
      '<div class="form-actions"><button type="button" class="btn secondary" id="bpCancel">' + escapeHtml(t("Cancel")) + '</button><button type="button" class="btn primary" id="bpSave">' + escapeHtml(t("Save")) + "</button></div></div>";
    const keep = function () {
      const a = box.querySelector("#bpAmount"); if (a) st.amount = a.value;
      const ac = box.querySelector("#bpAcc"); if (ac) st.payAccount = ac.value;
      const rf = box.querySelector("#bpRef"); if (rf) st.payRef = rf.value;
    };
    box.querySelectorAll(".qs-seg button").forEach(function (btn) { btn.onclick = function () { keep(); st.method = btn.dataset.m; draw(); }; });
    box.querySelector("#bpCancel").onclick = function () { box.remove(); };
    const sf = box.querySelector("#bpSlip");
    if (sf) sf.onchange = async function () { keep(); try { st.slip = await slipRead(sf.files && sf.files[0]); draw(); } catch (error) { showError(error.message); } };
    const sx = box.querySelector("#bpSlipX"); if (sx) sx.onclick = function () { keep(); st.slip = null; draw(); };
    box.querySelector("#bpSave").onclick = async function () {
      keep();
      const amount = qsNum(st.amount);
      if (!(amount > 0)) { showError(t("Enter the amount received.")); return; }
      const payload = { customerId: b.customerId, amount: amount, method: st.method, bills: [{ saleId: b.id }], clientRef: st.ref };
      if (st.method !== "cash") {
        if (st.payAccount) payload.payAccount = st.payAccount;
        if (st.payRef) payload.payRef = st.payRef;
        if (st.slip) payload.slip = { data: st.slip.data, type: st.slip.type };
      }
      this.disabled = true;
      try {
        await call("receivepayment", payload);
        box.remove();
        showToast(t("Payment saved for bill") + " " + b.no + ": " + qsMoney(amount));
        await loadPage(state.page);
      } catch (error) { this.disabled = false; showError(error.message || "Could not save."); }
    };
  };
  draw();
  document.body.appendChild(box);
  box.addEventListener("click", function (e) { if (e.target === box) box.remove(); });
  const a = box.querySelector("#bpAmount"); if (a) a.focus({ preventScroll: true });
}


// New items (last 7 days, e.g. made in Goods In): shown on top so the owner can give them a cost and sale price.
function newProductsHtml(rows) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const fresh = (rows || []).filter(function (r) { return String(r.CreatedAt || "").replace(/'/g, "").slice(0, 10) >= since; })
    .sort(function (a, b) { return String(b.CreatedAt || "").localeCompare(String(a.CreatedAt || "")); });
  if (!fresh.length) return "";
  return '<div class="panel new-prods"><b>' + escapeHtml(fresh.length + " " + t(fresh.length === 1 ? "new item in the last 7 days" : "new items in the last 7 days")) + "</b>" +
    '<div class="new-prods-list">' + fresh.slice(0, 30).map(function (r) {
      const need = !(Number(r.PurchasePrice) > 0) || !(Number(r.SalePrice) > 0);
      return '<button type="button" class="new-prod' + (need ? " need" : "") + '" onclick="openProductForm(\'' + escapeHtml(String(r.ProductID)) + '\')"><span>' + escapeHtml(r.Description) + "</span><small>" +
        escapeHtml(t("Stock")) + " " + formatNumber(Number(r.CurrentStock) || 0) + (need ? " · " + escapeHtml(t("set cost / sale price")) : "") + "</small></button>";
    }).join("") + "</div></div>";
}


/* ---------- Hand over the cash of one bill (from Bills) ---------- */
function billHandAsk(saleId) {
  const d = state.bills || {};
  const b = (d.sales || []).find(function (x) { return x.id === saleId; });
  const keepers = d.keepers || [];
  if (!b || !keepers.length) return;
  const box = document.createElement("div");
  box.className = "cost-modal";
  box.innerHTML = '<div class="cost-card bp-card" role="dialog" aria-modal="true"><h3>' + escapeHtml(t("Hand over cash of bill")) + " " + escapeHtml(b.no) + "</h3>" +
    '<label class="qs-amt"><small>' + escapeHtml(t("Amount")) + '</small><span dir="ltr">Rs. <input id="bhAmount" type="text" inputmode="decimal" value="' + escapeHtml(String(b.cashHere)) + '"></span></label>' +
    '<p class="qs-hint">' + escapeHtml(t("Who gets the cash? It moves to them when they press Received.")) + "</p>" +
    '<div class="bh-list">' + keepers.map(function (k) {
      return '<button type="button" class="qs-btn bh-to" data-id="' + escapeHtml(k.userId) + '">' + escapeHtml(t("Hand over to")) + " <b>" + escapeHtml(k.name) + "</b></button>";
    }).join("") + "</div>" +
    '<div class="form-actions"><button type="button" class="btn secondary" id="bhCancel">' + escapeHtml(t("Cancel")) + "</button></div></div>";
  document.body.appendChild(box);
  const close = function () { box.remove(); };
  box.addEventListener("click", function (e) { if (e.target === box) close(); });
  box.querySelector("#bhCancel").onclick = close;
  box.querySelectorAll(".bh-to").forEach(function (btn) {
    btn.onclick = async function () {
      const amount = qsNum(box.querySelector("#bhAmount").value);
      if (!(amount > 0)) { showError(t("Enter the amount handed over.")); return; }
      const k = keepers.find(function (x) { return x.userId === btn.dataset.id; });
      box.querySelectorAll("button").forEach(function (x) { x.disabled = true; });
      try {
        await call("cashhandover", { amount: amount, toId: k.userId, saleId: b.id, note: "Bill " + b.no });
        close();
        showToast(qsMoney(amount) + " " + t("of bill") + " " + b.no + " " + t("handed to") + " " + k.name + ". " + t("It moves when they press Received."));
        await loadPage(state.page);
      } catch (error) { box.querySelectorAll("button").forEach(function (x) { x.disabled = false; }); showError(error.message || "Could not save."); }
    };
  });
}


/* ---------- Hand over cash from Bills with as few taps as possible ---------- */
function billHandAllHtml(all, keepers, tab) {
  if (tab !== "sales" || !canOpen("cash") || !keepers.length) return "";
  const mine = all.filter(function (b) { return b.canHand; });
  if (!mine.length) return "";
  const total = mine.reduce(function (a, b) { return a + (Number(b.cashHere) || 0); }, 0);
  return '<div class="bl-handall"><div><small>' + escapeHtml(t("Cash with you from")) + " " + mine.length + " " + escapeHtml(t(mine.length === 1 ? "bill" : "bills")) + '</small><b dir="ltr">' + qsMoney(total) + "</b></div>" +
    '<div class="bl-handall-btns"><button type="button" class="qs-btn qs-primary" onclick="state.cashTab=\'hand\';showPage(\'cash\')">' + escapeHtml(t("Hand over cash")) + " →</button></div></div>";
}

async function billHandOne(saleId, toId) {
  const d = state.bills || {};
  const b = (d.sales || []).find(function (x) { return x.id === saleId; });
  const k = (d.keepers || []).find(function (x) { return x.userId === toId; });
  if (!b || !k) return;
  try {
    await call("cashhandover", { saleIds: [saleId], toId: toId });
    showToast(qsMoney(b.cashHere) + " (" + b.no + ") → " + k.name + ". " + t("It moves when they press Received."));
    await loadPage(state.page);
  } catch (error) { showError(error.message || "Could not save."); }
}

async function billHandAll(toId) {
  const d = state.bills || {};
  const k = (d.keepers || []).find(function (x) { return x.userId === toId; });
  const mine = (d.sales || []).filter(function (b) { return b.canHand; });
  if (!k || !mine.length) return;
  const total = mine.reduce(function (a, b) { return a + (Number(b.cashHere) || 0); }, 0);
  if (!confirm(t("Hand over the cash of") + " " + mine.length + " " + t(mine.length === 1 ? "bill" : "bills") + " (" + qsMoney(total) + ") " + t("to") + " " + k.name + "?")) return;
  try {
    const r = await call("cashhandover", { saleIds: mine.map(function (b) { return b.id; }), toId: toId });
    showToast(qsMoney(r.total) + " " + t("of") + " " + r.count + " " + t(r.count === 1 ? "bill" : "bills") + " → " + r.to + ". " + t("It moves when they press Received."));
    await loadPage(state.page);
  } catch (error) { showError(error.message || "Could not save."); }
}


/* ============================================================
   PDF VIEWER inside the app. Phones (Chrome on Android) have no PDF viewer of their own, so a PDF opened in
   a tab only shows a link or a download. The same drawing that makes the PDF is drawn here on the screen,
   with Share (WhatsApp...), Download and Print.
   ============================================================ */
function pdfViewerOpen(msg) {
  const v = document.createElement("div");
  v.className = "pdfv";
  v.innerHTML = '<div class="pdfv-bar"><button type="button" class="pdfv-x" aria-label="Close">✕</button><b>' + escapeHtml(msg || "") + '</b></div><div class="pdfv-pages"><p class="pdfv-wait">' + escapeHtml(msg || "") + "</p></div>";
  v.querySelector(".pdfv-x").onclick = function () { v.remove(); };
  document.body.appendChild(v);
  return v;
}

function pdfViewerShow(v, pdf, doc, o) {
  o = o || {};
  if (!document.body.contains(v)) return;          // closed while it was being made
  v.querySelector(".pdfv-bar b").textContent = o.title || pdf.filename;
  const bar = v.querySelector(".pdfv-bar");
  bar.insertAdjacentHTML("beforeend", '<span class="pdfv-acts"><button type="button" class="pdfv-share">' + escapeHtml(t("Share")) + '</button>' +
    '<button type="button" class="pdfv-dl">' + escapeHtml(t("Download")) + '</button><button type="button" class="pdfv-print">' + escapeHtml(t("Print")) + "</button></span>");
  const file = function () { try { return new File([pdf.bytes], pdf.filename, { type: "application/pdf" }); } catch (e) { return null; } };
  const download = function () {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([pdf.bytes], { type: "application/pdf" }));
    a.download = pdf.filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
  bar.querySelector(".pdfv-share").onclick = function () {
    const f = file();
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], title: pdf.filename, text: o.text || "" }).catch(function () { /* cancelled */ });
    } else {
      download();
      showToast(t("PDF downloaded. Attach it in WhatsApp."));
    }
  };
  bar.querySelector(".pdfv-dl").onclick = download;
  bar.querySelector(".pdfv-print").onclick = function () { document.body.classList.add("pdfv-printing"); setTimeout(function () { window.print(); document.body.classList.remove("pdfv-printing"); }, 50); };
  const box = v.querySelector(".pdfv-pages");
  box.innerHTML = "";
  if (!doc || !doc.recs || !doc.recs.length) {          // no drawing (should not happen): fall back to the file
    box.innerHTML = '<p class="pdfv-wait">' + escapeHtml(t("Preview not available. Use Download or Share.")) + "</p>";
    return;
  }
  // sharp enough to zoom in to twice the screen width
  const scale = Math.min(4, (window.devicePixelRatio || 1) * 2 * Math.min(1.6, (Math.min(window.innerWidth, 900) - 24) / doc.width));
  doc.recs.forEach(function () {
    const c = document.createElement("canvas"); c.className = "pdfv-page"; c.title = t("Tap to zoom");
    c.onclick = function () { box.classList.toggle("zoom"); };
    box.appendChild(c);
  });
  const canvases = box.querySelectorAll("canvas");
  doc.recs.forEach(function (ops, i) { pdfDrawPage(canvases[i], doc, ops, scale); });
}

// Draws one recorded page on a canvas (points; y measured from the top, like the PDF writer).
function pdfDrawPage(cv, doc, ops, scale) {
  cv.width = Math.round(doc.width * scale); cv.height = Math.round(doc.height * scale);
  cv.style.aspectRatio = doc.width + " / " + doc.height;
  const g = cv.getContext("2d");
  g.setTransform(scale, 0, 0, scale, 0, 0);
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, doc.width, doc.height);
  const later = [];
  ops.forEach(function (op) {
    const k = op[0];
    if (k === "text") {
      const o = op[4] || {}, size = o.size || 10, bold = !!o.bold, str = op[3];
      let x = op[1];
      if (o.align === "right") x -= pdfTextWidth(str, bold, size);
      else if (o.align === "center") x -= pdfTextWidth(str, bold, size) / 2;
      g.font = (bold || o.serif ? "bold " : "") + size + "px " + (o.serif ? "'Times New Roman', Times, serif" : "Helvetica, Arial, sans-serif");
      g.fillStyle = o.color || "#000000"; g.textBaseline = "alphabetic";
      g.fillText(str, x, op[2]);
    } else if (k === "rect") {
      const o = op[5] || {};
      if (o.fill) { g.fillStyle = o.fill; g.fillRect(op[1], op[2], op[3], op[4]); }
      if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.lineWidth || 0.6; g.strokeRect(op[1], op[2], op[3], op[4]); }
    } else if (k === "round") {
      const x = op[1], y = op[2], w = op[3], h = op[4], o = op[6] || {};
      const r = Math.min(op[5], w / 2, h / 2);
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
      if (o.fill) { g.fillStyle = o.fill; g.fill(); }
      if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.lineWidth || 0.8; g.stroke(); }
    } else if (k === "poly") {
      const pts = op[1], o = op[2] || {};
      g.beginPath(); pts.forEach(function (pt, i) { if (i) g.lineTo(pt[0], pt[1]); else g.moveTo(pt[0], pt[1]); }); g.closePath();
      g.fillStyle = o.fill || "#000000"; g.fill();
    } else if (k === "line") {
      const o = op[5] || {};
      g.beginPath(); g.moveTo(op[1], op[2]); g.lineTo(op[3], op[4]);
      g.strokeStyle = o.color || "#cbd5e1"; g.lineWidth = o.width || 0.6; g.stroke();
    } else if (k === "image") {
      const img = op[5];
      if (img.canvas) g.drawImage(img.canvas, op[1], op[2], op[3], op[4]);
      else later.push(op);
    }
  });
  // JPEG pictures (logo photos, Urdu line without its canvas) are drawn when they are decoded.
  later.forEach(function (op) {
    const im = new Image();
    const url = URL.createObjectURL(new Blob([op[5].bytes], { type: "image/jpeg" }));
    im.onload = function () { g.setTransform(scale, 0, 0, scale, 0, 0); g.drawImage(im, op[1], op[2], op[3], op[4]); URL.revokeObjectURL(url); };
    im.src = url;
  });
}


/* ============================================================
   ONE ACCOUNT, BOTH WAYS (from a customer's or a supplier's ledger)
   Goods out / Goods in / Payment in / Payment out on the same account, e.g. MANZOOR, who buys from us and sells to us.
   ============================================================ */
function partyMoveBar(type, id, name, phone, balance) {
  const can = {
    out: canOpen("quicksale"),
    in: canOpen("quickpurchase"),
    pay: isAdminUser() || hasRight("payments") || hasRight("quickpurchase")
  };
  const tools = canEditLedger(type) ? '<div class="pm-tools">' +
    '<button type="button" class="btn secondary" onclick="ledgerLineAsk(\'\')">＋ ' + escapeHtml(t("Ledger entry (any date)")) + "</button>" +
    '<button type="button" class="btn secondary" onclick="partyEditAsk(\'' + type + "','" + escapeHtml(String(id)) + '\')">✎ ' + escapeHtml(t("Edit name / mobile")) + "</button></div>" : "";
  if (!can.out && !can.in && !can.pay && !tools) return "";
  const b = function (show, cls, icon, label, small, fn) {
    return show ? '<button type="button" class="pm-btn ' + cls + '" onclick="' + fn + '"><i>' + icon + "</i><span><b>" + escapeHtml(t(label)) + "</b><small>" + escapeHtml(t(small)) + "</small></span></button>" : "";
  };
  const args = "'" + type + "','" + escapeHtml(String(id)) + "'";
  window._pmParty = { type: type, id: String(id), name: name, phone: phone, balance: balance };
  return '<div class="panel pm-bar"><div class="pm-grid">' +
    b(can.out, "out", "↗", "Goods out", "Goods we gave (bill)", "partyGoods(" + args + ",'out')") +
    b(can.in, "in", "↙", "Goods in", "Goods we got from them", "partyGoods(" + args + ",'in')") +
    b(can.pay, "pin", "₨", "Payment in", "Money they gave us", "partyPayAsk(" + args + ",'in')") +
    b(can.pay, "pout", "₨", "Payment out", "Money we gave them", "partyPayAsk(" + args + ",'out')") +
    "</div>" + tools + "</div>";
}

// Opens the sale (goods out) or purchase (goods in) screen with this account already chosen.
async function partyGoods(type, id, dir) {
  const pty = window._pmParty && window._pmParty.id === String(id) ? window._pmParty : { type: type, id: String(id), name: "", phone: "" };
  const page = dir === "out" ? "quicksale" : "quickpurchase";
  state.page = page;
  updateNavigation(page);
  await loadQuick(dir === "out" ? "sale" : "purchase", true);
  qsReset();
  qs.customer = { id: pty.id, name: pty.name, phone: pty.phone || "", balance: pty.balance, partyType: type };
  qs.step = 2;
  renderQuick();
  showToast(t(dir === "out" ? "Goods out on the account of" : "Goods in on the account of") + " " + pty.name);
}

// Short form: money in or out on this account (Cash / Online / Cheque).
function partyPayAsk(type, id, dir) {
  const pty = window._pmParty && window._pmParty.id === String(id) ? window._pmParty : { type: type, id: String(id), name: "" };
  const st = { method: "cash", amount: "", payAccount: "", payRef: "", note: "", slip: null, date: todayInput() };
  const box = document.createElement("div");
  box.className = "cost-modal";
  const draw = function () {
    box.innerHTML = '<div class="cost-card bp-card" role="dialog" aria-modal="true"><h3>' + escapeHtml(t(dir === "in" ? "Payment in" : "Payment out")) + ": " + escapeHtml(pty.name) + "</h3>" +
      '<p class="qs-hint">' + escapeHtml(t(dir === "in" ? "Money they gave us." : "Money we gave them.")) + "</p>" +
      '<div class="qs-seg">' + ["cash", "online", "cheque"].map(function (m) {
        return '<button type="button" data-m="' + m + '" class="' + (st.method === m ? "sel" : "") + '">' + escapeHtml(t(m.charAt(0).toUpperCase() + m.slice(1))) + "</button>";
      }).join("") + "</div>" +
      '<label class="qs-amt"><small>' + escapeHtml(t("Amount")) + '</small><span dir="ltr">Rs. <input id="ppAmount" type="text" inputmode="decimal" value="' + escapeHtml(st.amount) + '"></span></label>' +
      (st.method !== "cash"
        ? "<label>" + escapeHtml(t(dir === "in" ? "Received in (account)" : "Paid from (account)")) + '<input id="ppAcc" type="text" value="' + escapeHtml(st.payAccount) + '" placeholder="' + escapeHtml(t("e.g. Meezan Bank, JazzCash, Easypaisa")) + '"></label>' +
          "<label>" + escapeHtml(t("Transaction / cheque no.")) + '<input id="ppRef" type="text" dir="ltr" value="' + escapeHtml(st.payRef) + '"></label>' +
          (st.slip ? '<div class="slip-prev"><img src="' + st.slip.preview + '" alt=""><div><b>' + escapeHtml(t("Slip attached")) + "</b><small>" + escapeHtml(st.slip.size) + '</small></div><button type="button" class="qs-btn" id="ppSlipX">' + escapeHtml(t("Remove")) + "</button></div>"
            : '<label class="slip-btn"><input id="ppSlip" type="file" accept="image/*"><span>📎 ' + escapeHtml(t("Attach slip / screenshot")) + "</span></label>")
        : "") +
      "<label>" + escapeHtml(t("Note")) + '<input id="ppNote" type="text" value="' + escapeHtml(st.note) + '"></label>' +
      "<label>" + escapeHtml(t("Date")) + '<input id="ppDate" type="date" max="' + todayInput() + '" value="' + escapeHtml(st.date) + '">' +
        (st.date && st.date !== todayInput() ? '<small class="pp-old">' + escapeHtml(t("Old date: the payment goes in its place in the ledger.")) + "</small>" : "") + "</label>" +
      '<div class="form-actions"><button type="button" class="btn secondary" id="ppCancel">' + escapeHtml(t("Cancel")) + '</button><button type="button" class="btn primary" id="ppSave">' + escapeHtml(t("Save")) + "</button></div></div>";
    const keep = function () {
      ["Amount", "Acc", "Ref", "Note", "Date"].forEach(function (k) { const el = box.querySelector("#pp" + k); if (el) st[{ Amount: "amount", Acc: "payAccount", Ref: "payRef", Note: "note", Date: "date" }[k]] = el.value; });
    };
    box.querySelectorAll(".qs-seg button").forEach(function (btn) { btn.onclick = function () { keep(); st.method = btn.dataset.m; draw(); }; });
    box.querySelector("#ppCancel").onclick = function () { box.remove(); };
    box.querySelector("#ppDate").onchange = function () { keep(); draw(); };
    const sf = box.querySelector("#ppSlip");
    if (sf) sf.onchange = async function () { keep(); try { st.slip = await slipRead(sf.files && sf.files[0]); draw(); } catch (error) { showError(error.message); } };
    const sx = box.querySelector("#ppSlipX"); if (sx) sx.onclick = function () { keep(); st.slip = null; draw(); };
    box.querySelector("#ppSave").onclick = async function () {
      keep();
      const amount = qsNum(st.amount);
      if (!(amount > 0)) { showError(t("Enter the amount.")); return; }
      if (st.date && st.date > todayInput()) { showError(t("The date cannot be in the future.")); return; }
      const payload = { partyType: type, partyId: String(id), direction: dir, amount: amount, method: st.method, date: st.date || todayInput(),
        reference: dir === "in" ? "Received" : "Paid", notes: st.note,
        particular: (dir === "in" ? "Payment received" : "Payment given") + (st.note ? ": " + st.note : "") };
      if (st.method !== "cash") {
        if (st.payAccount) payload.account = st.payAccount;
        if (st.payRef) payload.txnRef = st.payRef;
        if (st.slip) payload.slip = { data: st.slip.data, type: st.slip.type };
      }
      this.disabled = true;
      try {
        await call("payment", payload);
        box.remove();
        showToast(t(dir === "in" ? "Payment in saved" : "Payment out saved") + ": " + qsMoney(amount));
        await openPartyLedger(type, String(id));
      } catch (error) { this.disabled = false; showError(error.message || "Could not save."); }
    };
  };
  draw();
  document.body.appendChild(box);
  box.addEventListener("click", function (e) { if (e.target === box) box.remove(); });
  const a = box.querySelector("#ppAmount"); if (a) a.focus({ preventScroll: true });
}


/* ============================================================
   ACCOUNTS: customers and suppliers in one list (Customer / Supplier / Both), one ledger each
   ============================================================ */
const acc = { q: "", kind: "", data: null };
async function loadAccounts() {
  try { acc.data = await call("accounts", {}); } catch (error) { showError(error.message || "Could not load."); return; }
  renderAccounts();
}

function accBalanceHtml(b) {
  if (b == null) return "";
  if (b > 0.5) return '<span class="acc-bal pay-us" dir="ltr">' + qsMoney(b) + "<small>" + escapeHtml(t("They have to pay us")) + "</small></span>";
  if (b < -0.5) return '<span class="acc-bal we-pay" dir="ltr">' + qsMoney(-b) + "<small>" + escapeHtml(t("We have to pay them")) + "</small></span>";
  return '<span class="acc-bal zero">—</span>';
}

function renderAccounts() {
  const d = acc.data || { rows: [], suggest: [] };
  const q = acc.q.trim().toLowerCase();
  const count = function (k) { return d.rows.filter(function (r) { return !k || r.kind === k; }).length; };
  const list = d.rows.filter(function (r) { return (!acc.kind || r.kind === acc.kind) && (!q || (r.name + " " + r.phone).toLowerCase().indexOf(q) !== -1); });
  const chip = function (k, label) { return '<button type="button" class="' + (acc.kind === k ? "sel" : "") + '" onclick="acc.kind=\'' + k + '\';renderAccounts()">' + escapeHtml(t(label)) + " <small>" + count(k) + "</small></button>"; };
  contentElement().innerHTML = '<div class="content acc-page">' +
    '<div class="toolbar"><div><h2>' + escapeHtml(t("Accounts")) + "</h2><p>" + escapeHtml(t("Customers and suppliers in one list. Tap a name for its card and ledger.")) + "</p></div>" +
    '<div class="toolbar-actions">' + (canOpen("customers") ? '<button class="btn primary" type="button" onclick="accNew()">+ ' + escapeHtml(t("New account")) + "</button>" : "") + "</div></div>" +
    (d.suggest.length && (isAdminUser() || hasRight("quickpurchase")) ? '<div class="panel acc-suggest"><b>' + d.suggest.length + " " + escapeHtml(t("names are in both lists (customer and supplier)")) + "</b>" +
      d.suggest.map(function (x) {
        return '<div class="acc-sug"><span dir="ltr">' + escapeHtml(x.name) + '</span><button type="button" class="btn secondary" onclick="accMerge(\'' + escapeHtml(x.customerId) + '\',\'' + escapeHtml(x.supplierId) + '\')">' + escapeHtml(t("Make one account")) + "</button></div>";
      }).join("") + "</div>" : "") +
    '<div class="panel"><div class="mi-filters"><div class="qs-seg">' + chip("", "All") + chip("Customer", "Customer") + chip("Supplier", "Supplier") + chip("Both", "Both") + "</div>" +
    '<input class="search" id="accQ" type="search" placeholder="' + escapeHtml(t("Search name or mobile")) + '" value="' + escapeHtml(acc.q) + '" oninput="acc.q=this.value;accRows()"></div>' +
    '<div id="accRows">' + accRowsHtml(list) + "</div></div></div>";
  updatePageTitle("accounts");
}

function accRows() {
  const d = acc.data || { rows: [] }, q = acc.q.trim().toLowerCase();
  const el = $("accRows"); if (!el) return;
  el.innerHTML = accRowsHtml(d.rows.filter(function (r) { return (!acc.kind || r.kind === acc.kind) && (!q || (r.name + " " + r.phone).toLowerCase().indexOf(q) !== -1); }));
}

function accRowsHtml(list) {
  if (!list.length) return '<p class="empty">' + escapeHtml(t("No accounts found.")) + "</p>";
  return '<div class="acc-list">' + list.slice(0, 400).map(function (r) {
    return '<button type="button" class="acc-row" onclick="partyCard(\'' + r.partyType + '\',\'' + escapeHtml(r.id) + '\')"><span class="acc-name"><b dir="ltr">' + escapeHtml(r.name) + '</b><small dir="ltr">' + escapeHtml(r.phone || "") + "</small></span>" +
      '<span class="acc-kind k-' + r.kind.toLowerCase() + '">' + escapeHtml(t(r.kind)) + "</span>" + accBalanceHtml(r.balance) + "</button>";
  }).join("") + "</div>" + (list.length > 400 ? '<p class="qs-hint">' + escapeHtml(t("Showing 400. Search to find others.")) + "</p>" : "");
}

async function accMerge(cid, sid) {
  const x = ((acc.data || {}).suggest || []).find(function (y) { return y.customerId === cid && y.supplierId === sid; }) || { name: "" };
  if (!confirm(t("Make one account for") + " " + x.name + "?\n\n" + t("The supplier account's balance moves into the customer account as one line. The old supplier history stays readable."))) return;
  try {
    const r = await call("mergeparty", { customerId: cid, supplierId: sid });
    showToast(r.name + ": " + t("one account now (Both)."));
    await loadAccounts();
  } catch (error) { showError(error.message || "Could not merge."); }
}

function accNew() {
  const box = document.createElement("div");
  box.className = "cost-modal";
  box.innerHTML = '<div class="cost-card bp-card" role="dialog" aria-modal="true"><h3>' + escapeHtml(t("New account")) + "</h3>" +
    "<label>" + escapeHtml(t("Name")) + '<input id="anName" type="text"></label>' +
    "<label>" + escapeHtml(t("Mobile")) + '<input id="anPhone" type="tel" inputmode="tel" dir="ltr"></label>' +
    '<div class="qs-seg" id="anKind"><button type="button" class="sel" data-k="Customer">' + escapeHtml(t("Customer")) + '</button><button type="button" data-k="Supplier">' + escapeHtml(t("Supplier")) + '</button><button type="button" data-k="Both">' + escapeHtml(t("Both")) + "</button></div>" +
    '<div class="form-actions"><button type="button" class="btn secondary" id="anCancel">' + escapeHtml(t("Cancel")) + '</button><button type="button" class="btn primary" id="anSave">' + escapeHtml(t("Save")) + "</button></div></div>";
  document.body.appendChild(box);
  let kind = "Customer";
  box.querySelectorAll("#anKind button").forEach(function (b) { b.onclick = function () { kind = b.dataset.k; box.querySelectorAll("#anKind button").forEach(function (x) { x.classList.toggle("sel", x === b); }); }; });
  box.querySelector("#anCancel").onclick = function () { box.remove(); };
  box.querySelector("#anName").focus();
  box.querySelector("#anSave").onclick = async function () {
    const name = box.querySelector("#anName").value.trim(), phone = box.querySelector("#anPhone").value.trim();
    if (!name) { showError(t("Write the name.")); return; }
    this.disabled = true;
    try {
      if (kind === "Supplier") await call("supplier", { name: name, phone: phone });
      else {
        const r = await call("customer", { name: name, phone: phone });
        if (kind === "Both") await call("setboth", { customerId: r.id, on: true });
      }
      box.remove(); showToast(t("Saved") + ": " + name);
      await loadAccounts();
    } catch (error) { this.disabled = false; showError(error.message || "Could not save."); }
  };
}

/* ---------- Account card: opens from anywhere a name is shown ---------- */
async function partyCard(type, id) {
  const d = acc.data || (canOpen("accounts") ? await call("accounts", {}).catch(function () { return null; }) : null) || { rows: [] };
  acc.data = acc.data || d;
  const r = d.rows.find(function (x) { return x.partyType === type && x.id === String(id); }) || { partyType: type, id: String(id), name: String(id), phone: "", kind: type === "supplier" ? "Supplier" : "Customer", balance: null };
  const box = document.createElement("div");
  box.className = "cost-modal";
  const goLedger = "this.closest('.cost-modal').remove();openPartyLedger('" + type + "','" + escapeHtml(r.id) + "')";
  window._pmParty = { type: type, id: r.id, name: r.name, phone: r.phone, balance: r.balance };
  const act = function (show, cls, icon, label, fn) { return show ? '<button type="button" class="pm-btn ' + cls + '" onclick="this.closest(\'.cost-modal\').remove();' + fn + '"><i>' + icon + "</i><span><b>" + escapeHtml(t(label)) + "</b></span></button>" : ""; };
  const pay = isAdminUser() || hasRight("payments") || hasRight("quickpurchase");
  box.innerHTML = '<div class="cost-card party-card" role="dialog" aria-modal="true">' +
    '<div class="pc-head"><div><h3 dir="ltr">' + escapeHtml(r.name) + '</h3><small dir="ltr">' + escapeHtml(r.phone || "") + '</small></div><span class="acc-kind k-' + r.kind.toLowerCase() + '">' + escapeHtml(t(r.kind)) + "</span></div>" +
    (r.balance != null ? '<div class="pc-bal">' + accBalanceHtml(r.balance) + "</div>" : "") +
    '<div class="pm-grid">' +
      act(canOpen("quicksale"), "out", "↗", "Goods out", "partyGoods('" + type + "','" + escapeHtml(r.id) + "','out')") +
      act(canOpen("quickpurchase"), "in", "↙", "Goods in", "partyGoods('" + type + "','" + escapeHtml(r.id) + "','in')") +
      act(pay, "pin", "₨", "Payment in", "partyPayAsk('" + type + "','" + escapeHtml(r.id) + "','in')") +
      act(pay, "pout", "₨", "Payment out", "partyPayAsk('" + type + "','" + escapeHtml(r.id) + "','out')") +
    "</div>" +
    (isAdminUser() || hasRight(type === "customer" ? "customers" : "suppliers") ?
      '<div class="pc-ledger-btns"><button type="button" class="btn secondary" onclick="ledgerDownload(\'' + type + "','" + escapeHtml(r.id) + "','" + escapeHtml(String(r.name).replace(/'/g, "")) + '\')">⇩ ' + escapeHtml(t("Download ledger")) + "</button>" +
      '<button type="button" class="btn secondary" onclick="this.closest(\'.cost-modal\').remove();ledgerUploadStart(\'' + type + "','" + escapeHtml(r.id) + "','" + escapeHtml(String(r.name).replace(/'/g, "")) + '\')">⇧ ' + escapeHtml(t("Update ledger")) + "</button>" +
        (canEditLedger(type) ? '<button type="button" class="btn secondary" onclick="partyEditAsk(\'' + type + "','" + escapeHtml(r.id) + '\')">✎ ' + escapeHtml(t("Edit name / mobile")) + "</button>" +
          '<button type="button" class="btn secondary" onclick="this.closest(\'.cost-modal\').remove();ledgerEntryFromCard(\'' + type + "','" + escapeHtml(r.id) + '\')">＋ ' + escapeHtml(t("Ledger entry (any date)")) + "</button>" : "") + "</div>" +
      (isAdminUser() || (hasRight("customers") && hasRight("suppliers")) ? '<button type="button" class="btn secondary pc-merge" onclick="this.closest(\'.cost-modal\').remove();mergeStart(\'' + type + "','" + escapeHtml(r.id) + '\')">⇄ ' + escapeHtml(t("Merge with another account")) + "</button>" : "") : "") +
    ((type === "supplier" || r.kind === "Both") && (isAdminUser() || hasRight("quickpurchase") || hasRight("purchases")) ?
      '<button type="button" class="pm-btn inv-up" onclick="this.closest(\'.cost-modal\').remove();invoiceUploadStart(\'' + type + "','" + escapeHtml(r.id) + "','" + escapeHtml(String(r.name).replace(/'/g, "")) + '\')"><i>⇪</i><span><b>' + escapeHtml(t("Upload invoice")) + "</b><small>" + escapeHtml(t("Supplier's PDF invoice")) + "</small></span></button>" : "") +
    '<div class="form-actions">' +
      (canOpen("partyledger") ? '<button type="button" class="btn primary" onclick="' + goLedger + '">' + escapeHtml(t("Ledger")) + "</button>" : "") +
      (type === "customer" && (isAdminUser() || hasRight("quickpurchase")) ? '<label class="qs-check"><input type="checkbox" id="pcBoth"' + (r.kind === "Both" ? " checked" : "") + "> " + escapeHtml(t("Goods come from them too (Both)")) + "</label>" : "") +
      (type === "supplier" && (isAdminUser() || hasRight("quickpurchase")) ? '<button type="button" class="btn secondary" id="pcMakeBoth">' + escapeHtml(t("Also a customer: make one account")) + "</button>" : "") +
      '<button type="button" class="btn secondary" onclick="this.closest(\'.cost-modal\').remove()">' + escapeHtml(t("Close")) + "</button></div></div>";
  document.body.appendChild(box);
  box.addEventListener("click", function (e) { if (e.target === box) box.remove(); });
  const both = box.querySelector("#pcBoth");
  if (both) both.onchange = async function () {
    try { await call("setboth", { customerId: r.id, on: both.checked }); showToast(r.name + ": " + t(both.checked ? "Both" : "Customer")); acc.data = null; if (state.page === "accounts") loadAccounts(); }
    catch (error) { both.checked = !both.checked; showError(error.message); }
  };
  const mb = box.querySelector("#pcMakeBoth");
  if (mb) mb.onclick = async function () {
    if (!confirm(t("Make one account for") + " " + r.name + "?\n\n" + t("A customer account is made with the same name, the supplier balance moves into it, and it is marked Both."))) return;
    try { const x = await call("makeboth", { supplierId: r.id }); box.remove(); showToast(x.name + ": " + t("one account now (Both).")); acc.data = null; if (state.page === "accounts") loadAccounts(); }
    catch (error) { showError(error.message); }
  };
}

/* ============================================================ REPORTS: one page with every report ============================================================ */
function renderReportsHub() {
  const items = [
    ["daily", "◷", "Daily Report", "Today's sales, cash and credit, by shop"],
    ["reports", "▤", "Reports", "Profit and sales by item"],
    ["incentives", "★", isAdminUser() ? "Incentive Report" : "My Incentive", "Each salesman's incentive"],
    ["monthexp", "◫", "Monthly Expenses", "Salary and other monthly costs"],
    ["health", "✚", "Health check", "Mistakes in stock, bills and balances"]
  ].filter(function (x) { return canOpen(x[0]); });
  contentElement().innerHTML = '<div class="content hm gi"><h2>' + escapeHtml(t("Reports")) + '</h2><div class="gi-list">' + items.map(function (x) {
    return '<button type="button" class="gi-opt" onclick="showPage(\'' + x[0] + '\')"><span class="hm-ic" aria-hidden="true">' + x[1] + "</span><span><b>" + escapeHtml(t(x[2])) + "</b><small>" + escapeHtml(t(x[3])) + '</small></span><span class="gi-go" aria-hidden="true">›</span></button>';
  }).join("") + "</div></div>";
  updatePageTitle("reportshub");
}


/* Phone back button: close an open box first, then go to the page before (asking first if work is not saved) */
try {
  history.replaceState({ page: "" }, "");
  window.addEventListener("popstate", function (e) {
    const modal = document.querySelector("#unsavedAsk, .cost-modal, .pdfv, .wa-overlay");
    const target = (e.state && e.state.page) || homePage();
    if (modal) {
      const ownState = modal.classList.contains("card-sheet");
      modal.remove();
      if (!ownState) { try { history.pushState({ page: state.page }, ""); } catch (x) {} }
      return;
    }
    if (target === state.page) return;
    const work = target !== state.page ? unsavedWork() : null;
    if (work) {
      try { history.pushState({ page: state.page }, ""); } catch (x) {}
      askUnsaved(work, function () { showPageNow(target); });
      return;
    }
    NAV_FROM_HISTORY = true;
    try { showPageNow(target); } finally { NAV_FROM_HISTORY = false; }
  });
  window.addEventListener("beforeunload", function (e) {
    if (unsavedWork()) { e.preventDefault(); e.returnValue = ""; return ""; }
  });
} catch (e) { /* old browser */ }


/* ============================================================
   CARDS EVERYWHERE: tap a bill number, a product or a name → its card.
   Any element with data-card="product:P0001" / "sale:S000001" / "purchase:PU000001" / "challan:SN000001" /
   "customer:C0001" / "supplier:S0001" / "ref:INV-3" opens the card (taps on it don't also open the row under it).
   ============================================================ */
function cardAttr(kind, id) { return id ? ' data-card="' + escapeHtml(kind + ":" + id) + '"' : ""; }
function cardLink(kind, id, text) { return id && !((kind === "customer" || kind === "supplier") && !canOpen("accounts")) ? '<span class="card-link"' + cardAttr(kind, id) + ">" + escapeHtml(text) + "</span>" : escapeHtml(text); }

document.addEventListener("click", function (e) {
  const el = e.target.closest && e.target.closest("[data-card]");
  if (!el) return;
  e.preventDefault(); e.stopPropagation();
  const v = el.dataset.card, i = v.indexOf(":");
  openCard(v.slice(0, i), v.slice(i + 1));
}, true);

async function openCard(kind, id) {
  try {
    if (kind === "product") return await productCard(id);
    if (kind === "sale") return await billCard(id);
    if (kind === "purchase") return await purchaseCard(id);
    if (kind === "challan") return await openChallanPdf(id);
    if (kind === "customer" || kind === "supplier") {
      if (canOpen("accounts")) return await partyCard(kind, id);
      return;
    }
    if (kind === "ref") {
      const r = await call("findref", { ref: id });
      if (!r.kind) { showToast(t("Not found in the records.")); return; }
      return await openCard(r.kind, r.id);
    }
  } catch (error) { showError(error.message || "Could not open."); }
}

function cardBox(cls, html) {
  document.querySelectorAll(".cost-modal.card-sheet").forEach(function (x) { x.remove(); });   // one card at a time
  const box = document.createElement("div");
  box.className = "cost-modal card-sheet";
  box.innerHTML = '<div class="cost-card ' + cls + '" role="dialog" aria-modal="true"><button type="button" class="card-x" aria-label="' + escapeHtml(t("Close")) + '">×</button>' + html + "</div>";
  document.body.appendChild(box);
  box.addEventListener("click", function (e) { if (e.target === box || e.target.classList.contains("card-x")) box.remove(); });
  try { history.pushState({ page: state.page, card: true }, ""); } catch (x) {}
  return box;
}
function cardLoading() { return cardBox("card-wide", '<p class="empty">' + escapeHtml(t("Loading...")) + "</p>"); }

/* ---------- Product: stock at every place + full history ---------- */
const PC_CACHE = {};
async function productCard(pid, filter) {
  if (filter === undefined) delete PC_CACHE[pid];   // opening the card: always fresh; the filter buttons reuse it
  const wait = PC_CACHE[pid] ? null : cardLoading();
  let d;
  try { d = PC_CACHE[pid] || (PC_CACHE[pid] = await call("productcard", { productId: pid })); }
  catch (error) { if (wait) wait.remove(); throw error; }
  if (wait) wait.remove();
  filter = filter || "";
  const pr = d.product;
  const sign = function (q) { return (q > 0 ? "+" : "") + formatNumber(q); };
  const inK = ["purchase", "goodsin", "opening", "bill"], outK = ["sale"];
  const rows = d.history.filter(function (r) {
    if (filter === "in") return inK.indexOf(r.kind) !== -1 || /purchase-(return|cancel)/.test(r.kind);
    if (filter === "out") return outK.indexOf(r.kind) !== -1 || /sale-(return|cancel)/.test(r.kind);
    if (filter === "move") return r.kind === "move";
    return true;
  });
  const fbtn = function (k, label) { return '<button type="button" class="' + (filter === k ? "sel" : "") + '" onclick="productCard(\'' + escapeHtml(pid) + "','" + k + "')\">" + escapeHtml(t(label)) + "</button>"; };
  const hist = rows.length ? rows.map(function (r) {
    const cls = r.kind === "move" ? "mv" : (r.noStock ? "nb" : (r.qty < 0 ? "out" : "in"));
    return '<div class="ph-row ' + cls + '"><div class="ph-top"><span class="ph-date">' + escapeHtml(formatDate(r.date)) + (r.time ? " " + escapeHtml(r.time) : "") + "</span>" +
      '<span class="ph-label">' + escapeHtml(t(r.label)) + "</span>" +
      '<b class="ph-qty" dir="ltr">' + (r.kind === "move" || r.noStock ? formatNumber(Math.abs(r.qty)) : sign(r.qty)) + "</b></div>" +
      '<div class="ph-sub">' + [
        '<span dir="ltr">' + escapeHtml(r.place) + "</span>",
        r.party && r.party.name ? (r.party.id ? cardLink(r.party.type, r.party.id, r.party.name) : escapeHtml(r.party.name)) : "",
        r.ref ? cardLink(r.ref.kind, r.ref.id, r.ref.no) : "",
        r.rate != null ? '<span dir="ltr">@ ' + qsMoney(r.rate) + "</span>" : "",
        r.by ? escapeHtml(r.by) : "", r.note ? "<i>" + escapeHtml(r.note) + "</i>" : ""
      ].filter(Boolean).join(" · ") + "</div></div>";
  }).join("") : '<p class="empty">' + escapeHtml(t("Nothing yet.")) + "</p>";
  const meta = [pr.code, pr.brand, pr.category].filter(Boolean).join(" · ");
  cardBox("card-wide product-card",
    '<div class="pc-head"><div><small>' + escapeHtml(t("Stock card")) + '</small><h3 dir="ltr">' + escapeHtml(pr.name) + "</h3>" + (meta ? '<small dir="ltr">' + escapeHtml(meta) + "</small>" : "") + "</div></div>" +
    '<div class="pk-stats"><div><small>' + escapeHtml(t("In stock")) + '</small><b dir="ltr">' + formatNumber(d.total) + "</b></div>" +
      "<div><small>" + escapeHtml(t("Sale price")) + '</small><b dir="ltr">' + qsMoney(pr.salePrice) + "</b></div>" +
      (pr.cost != null ? "<div><small>" + escapeHtml(t("Cost")) + '</small><b dir="ltr">' + qsMoney(pr.cost) + "</b></div>" : "") +
      "<div><small>" + escapeHtml(t("Bought")) + " / " + escapeHtml(t("Sold")) + '</small><b dir="ltr">' + formatNumber(d.bought) + " / " + formatNumber(d.sold) + "</b></div></div>" +
    '<div class="pk-places">' + d.places.map(function (x) { return '<span class="' + (x.qty > 0 ? "" : "zero") + '"><small>' + escapeHtml(x.name) + '</small><b dir="ltr">' + formatNumber(x.qty) + "</b></span>"; }).join("") + "</div>" +
    ((d.lastIn || d.lastOut) ? '<p class="pk-last">' + [d.lastIn ? escapeHtml(t("Last came")) + ": " + escapeHtml(formatDate(d.lastIn.date)) + (d.lastIn.name ? " · " + escapeHtml(d.lastIn.name) : "") : "",
      d.lastOut ? escapeHtml(t("Last sold")) + ": " + escapeHtml(formatDate(d.lastOut.date)) + (d.lastOut.name ? " · " + escapeHtml(d.lastOut.name) : "") : ""].filter(Boolean).join("<br>") + "</p>" : "") +
    '<div class="pk-hhead"><h4>' + escapeHtml(t("History")) + '</h4><div class="qs-seg">' + fbtn("", "All") + fbtn("in", "In") + fbtn("out", "Out") + fbtn("move", "Moves") + "</div></div>" +
    '<div class="ph-list">' + hist + (d.more && !filter ? '<p class="qs-hint">+' + d.more + " " + escapeHtml(t("older")) + "</p>" : "") + "</div>");
}

/* ---------- Sale bill card ---------- */
async function billCard(saleId) {
  const wait = INVOICE_CACHE[saleId] ? null : cardLoading();
  let d;
  try { d = await getInvoiceData(saleId); } catch (error) { if (wait) wait.remove(); throw error; }
  if (wait) wait.remove();
  const sale = d.sale || {}, c = d.customer || {}, tt = invoiceTotals(d);
  const ptype = String(sale.PartyType || "") === "supplier" ? "supplier" : "customer";
  let charges = tt.charges.filter(function (x) { return Number(x.amount) > 0; });
  cardBox("card-wide bill-card",
    '<div class="pc-head"><div><small>' + escapeHtml(t("Bill")) + (tt.cancelled ? ' · <b class="bl-chip del">' + escapeHtml(t("Deleted")) + "</b>" : "") + '</small><h3 dir="ltr">' + escapeHtml(sale.InvoiceNo || saleId) + "</h3>" +
      "<small>" + escapeHtml(formatDate(sale.Date)) + (sale.WarehouseName ? " · " + escapeHtml(sale.WarehouseName) : "") + "</small></div></div>" +
    '<div class="bc-party"><b dir="ltr">' + cardLink(ptype, String(c.id || sale.CustomerID || ""), c.name || sale.CustomerName || "") + "</b>" + (c.phone ? ' <small dir="ltr">' + escapeHtml(c.phone) + "</small>" : "") +
      (sale.SalespersonName && sale.SalespersonName !== "—" || sale.CreatedBy ? "<small>" + escapeHtml(t("Salesman")) + ": " + escapeHtml(sale.SalespersonName && sale.SalespersonName !== "—" ? sale.SalespersonName : sale.CreatedBy) + "</small>" : "") + "</div>" +
    '<div class="bc-items">' + (d.items || []).map(function (it) {
      return '<div class="bc-it"><span class="bc-name" dir="ltr">' + cardLink("product", it.productId, it.description || it.productId) + (it.serials && it.serials.length ? "<small>" + escapeHtml(it.serials.join(", ")) + "</small>" : "") + "</span>" +
        '<span dir="ltr">' + formatNumber(it.qty) + " × " + qsMoney(it.unitPrice) + '</span><b dir="ltr">' + qsMoney(it.lineTotal) + "</b></div>";
    }).join("") + charges.map(function (x) { return '<div class="bc-it ch"><span>' + escapeHtml(t(x.label || x.name || "Charges")) + '</span><span></span><b dir="ltr">' + qsMoney(x.amount) + "</b></div>"; }).join("") + "</div>" +
    '<div class="bc-tot">' + (tt.discount ? "<div><span>" + escapeHtml(t("Discount")) + '</span><b dir="ltr">-' + qsMoney(tt.discount) + "</b></div>" : "") +
      "<div><span>" + escapeHtml(t("Total")) + '</span><b dir="ltr">' + qsMoney(tt.net) + "</b></div>" +
      "<div><span>" + escapeHtml(t("Paid")) + '</span><b dir="ltr">' + qsMoney(Math.max(0, tt.net - (d.due != null ? d.due : tt.balance))) + "</b></div>" +
      '<div class="' + ((d.due || 0) > 0.5 ? "due" : "") + '"><span>' + escapeHtml(t("Due now")) + '</span><b dir="ltr">' + qsMoney(d.due != null ? d.due : tt.balance) + "</b></div></div>" +
    (sale.EditedAt ? '<p class="pk-last">' + escapeHtml(t("Edited")) + ": " + escapeHtml(formatDate(sale.EditedAt)) + " " + escapeHtml(String(sale.EditedAt).slice(11, 16)) + (sale.EditedBy ? " · " + escapeHtml(sale.EditedBy) : "") + "</p>" : "") +
    '<div class="form-actions"><button type="button" class="btn primary" onclick="this.closest(\'.cost-modal\').remove();openBillPdf(\'' + escapeHtml(saleId) + '\')">' + escapeHtml(t("Bill PDF")) + "</button>" +
      (d.canEdit ? '<button type="button" class="btn secondary" onclick="billEditStart(\'' + escapeHtml(saleId) + '\')">' + escapeHtml(t("Edit bill")) + "</button>" : "") +
      ((d.due || 0) > 0.5 && !tt.cancelled && canOpen("receive") ? '<button type="button" class="btn secondary" onclick="this.closest(\'.cost-modal\').remove();billPayAsk(\'' + escapeHtml(saleId) + '\')">' + escapeHtml(t("Payment")) + "</button>" : "") + "</div>");
}

/* ---------- Purchase bill card ---------- */
async function purchaseCard(id) {
  const wait = cardLoading();
  let d;
  try { d = await call("purchasebill", { purchaseId: id }); } catch (error) { wait.remove(); throw error; }
  wait.remove();
  const b = d.purchase;
  cardBox("card-wide bill-card",
    '<div class="pc-head"><div><small>' + escapeHtml(t("Purchase")) + '</small><h3 dir="ltr">' + escapeHtml(b.no) + "</h3><small>" + escapeHtml(formatDate(b.date)) + (b.place ? " · " + escapeHtml(b.place) : "") + "</small></div></div>" +
    '<div class="bc-party"><b dir="ltr">' + cardLink(b.party.type, b.party.id, b.party.name) + "</b></div>" +
    '<div class="bc-items">' + d.items.map(function (it) {
      return '<div class="bc-it"><span class="bc-name" dir="ltr">' + cardLink("product", it.productId, it.description || it.productId) + "</span>" +
        '<span dir="ltr">' + formatNumber(it.qty) + (it.unitCost != null ? " × " + qsMoney(it.unitCost) : "") + '</span><b dir="ltr">' + (it.lineTotal != null ? qsMoney(it.lineTotal) : "") + "</b></div>";
    }).join("") + "</div>" +
    (b.net != null ? '<div class="bc-tot"><div><span>' + escapeHtml(t("Total")) + '</span><b dir="ltr">' + qsMoney(b.net) + "</b></div><div><span>" + escapeHtml(t("Paid")) + '</span><b dir="ltr">' + qsMoney(b.paid) + "</b></div>" +
      '<div class="' + (b.balance > 0.5 ? "due" : "") + '"><span>' + escapeHtml(t("Due now")) + '</span><b dir="ltr">' + qsMoney(b.balance) + "</b></div></div>" : "") +
    (b.notes ? '<p class="pk-last">' + escapeHtml(b.notes) + "</p>" : ""));
}


// Table cells that name something in the records open its card on tap.
function cellCardWrap(row, column, html, partyType) {
  const v = row[column];
  if (v === null || v === undefined || String(v).trim() === "") return html;
  let card = "";
  if ((column === "Description" || column === "ProductName") && row.ProductID) card = "product:" + row.ProductID;
  else if (column === "InvoiceNo" && row.SaleID) card = "sale:" + row.SaleID;
  else if (column === "ReferenceNo" && row.PurchaseID) card = "purchase:" + row.PurchaseID;
  else if ((column === "Reference" || column === "Ref") && /[A-Z]{2,}-?\d/i.test(String(v))) card = "ref:" + v;
  else if (column === "Particular" && row.Reference && /^(INV-?\d|PU\d|SN\d)/i.test(String(row.Reference)) && !/^Bills /.test(String(row.Reference))) card = "ref:" + row.Reference;
  else if (column === "Name" && (partyType === "customer" || partyType === "supplier") && canOpen("accounts")) card = partyType + ":" + (row.CustomerID || row.SupplierID || "");
  else if (column === "CustomerName" && row.CustomerID && canOpen("accounts")) card = (row.PartyType === "supplier" ? "supplier:" : "customer:") + row.CustomerID;
  else if (column === "SupplierName" && row.SupplierID && canOpen("accounts")) card = (row.PartyType === "customer" ? "customer:" : "supplier:") + row.SupplierID;
  if (!card || /:$/.test(card)) return html;
  return '<span class="card-link" data-card="' + escapeHtml(card) + '">' + html + "</span>";
}


/* ============================================================
   EDIT A BILL (same number). Opens the sale screen with the bill's items; payments stay on the bill.
   ============================================================ */
async function billEditStart(saleId) {
  document.querySelectorAll(".cost-modal").forEach(function (x) { x.remove(); });
  delete INVOICE_CACHE[saleId];
  let d;
  try { d = await getInvoiceData(saleId); } catch (error) { showError(error.message || "Could not open the bill."); return; }
  if (!d.canEdit) { showError(t("This bill cannot be edited.")); return; }
  const go = async function () {
    state.page = "quicksale";
    updateNavigation("quicksale");
    try { history.pushState({ page: "quicksale" }, ""); } catch (e) {}
    await loadQuick("sale", true);
    qsReset();
    const sale = d.sale || {}, c = d.customer || {};
    qs.editId = saleId;
    qs.edit = { no: String(sale.InvoiceNo || saleId), net: Number(sale.NetTotal || 0), paid: Number(sale.Paid || 0), date: sale.Date };
    qs.customer = { id: String(c.id || sale.CustomerID || ""), name: c.name || sale.CustomerName || "", phone: c.phone || "", balance: null,
      partyType: String(sale.PartyType || "") === "supplier" ? "supplier" : "customer" };
    qs.items = (d.items || []).map(function (it) {
      const p = qsProduct(it.productId) || {};
      const q = Number(it.qty) || 1;
      return { id: String(it.productId), name: it.description || p.name || String(it.productId), qty: q, max: 99999, stock: qsNum(p.stock) + q,
        rate: Math.round((Number(it.lineTotal) / q) * 100) / 100, fromLast: false, edited: true };
    });
    let ch = [];
    try { ch = JSON.parse(String(sale.Charges || "[]")) || []; } catch (e) { ch = []; }
    qs.charges = {};
    ch.forEach(function (x) { const k = QS_CHARGES.find(function (y) { return y[1] === x.name; }); if (k) qs.charges[k[0]] = { on: true, amount: String(x.amount) }; });
    if (Number(sale.StructureAmount) > 0) qs.structure = { on: true, amount: String(sale.StructureAmount) };
    qs.discount = sale.Discount ? String(sale.Discount) : "";
    qs.note = String(sale.Notes || "");
    qs.more = !!(qs.discount || qs.note);
    qs.step = 2;
    renderQuick();
    window.scrollTo(0, 0);
  };
  if (state.page !== "quicksale" || !unsavedWork()) return go();
  askUnsaved(unsavedWork(), go);
}

function qsEditStep3() {
  const total = qsTotal(), was = qs.edit.net, diff = Math.round((total - was) * 100) / 100;
  const units = qs.items.reduce(function (a, it) { return a + it.qty; }, 0);
  return qsHead("qsGo(2)") + qsSteps(3) + '<div class="qs-body">' +
    '<div class="qs-total"><small>' + escapeHtml(t("Editing bill")) + ' </small><span dir="ltr">' + escapeHtml(qs.edit.no) + " · " + escapeHtml(qsCustomerName()) + '</span><b id="qsTotalAmt" dir="ltr">' + qsMoney(total) + "</b>" +
      "<small>" + units + " " + escapeHtml(t("units")) + "</small></div>" +
    '<div class="qs-sum qs-editsum"><div><span>' + escapeHtml(t("Was")) + '</span><b dir="ltr">' + qsMoney(was) + "</b></div>" +
      "<div><span>" + escapeHtml(t("Now")) + '</span><b dir="ltr" id="qsEditNow">' + qsMoney(total) + "</b></div>" +
      "<div><span>" + escapeHtml(t("Difference")) + '</span><b dir="ltr" id="qsEditDiff" class="' + (diff > 0 ? "out" : "") + '">' + (diff > 0 ? "+" : "") + qsMoney(diff) + "</b></div>" +
      "<div><span>" + escapeHtml(t("Paid")) + '</span><b dir="ltr">' + qsMoney(qs.edit.paid) + "</b></div></div>" +
    '<p class="qs-hint">' + escapeHtml(t("Payments already received stay on this bill.")) + " " + escapeHtml(t("Only the difference goes to the account and the stock.")) + "</p>" +
    qsChargesHtml() +
    '<div class="qs-more-box"><label>' + escapeHtml(t("Discount")) + '<span dir="ltr">Rs. <input type="text" inputmode="decimal" value="' + escapeHtml(qs.discount) + '" oninput="qsDiscountLive(this.value);qsEditLive()"></span></label>' +
      "<label>" + escapeHtml(t("Note")) + '<input type="text" value="' + escapeHtml(qs.note) + '" oninput="qsSetField(\'note\',this.value,false)"></label>' +
      "<label>" + escapeHtml(t("Why the change? (optional)")) + '<input type="text" value="' + escapeHtml(qs.editReason || "") + '" oninput="qsSetField(\'editReason\',this.value,false)"></label></div>' +
    qsPreviewBtn() +
    "</div>" +
    '<div class="qs-bar"><div class="t"><small>' + escapeHtml(t("Difference")) + '</small><b id="qsEditDiff2" dir="ltr">' + (diff > 0 ? "+" : "") + qsMoney(diff) + "</b></div>" +
    '<button type="button" class="qs-btn qs-primary" id="qsSaveBtn" onclick="qsSave()"' + (qs.saving ? " disabled" : "") + ">" + escapeHtml(qs.saving ? t("Saving...") : t("Save changes")) + "</button></div>";
}

function qsEditLive() {
  if (!qs.editId) return;
  const total = qsTotal(), diff = Math.round((total - qs.edit.net) * 100) / 100, txt = (diff > 0 ? "+" : "") + qsMoney(diff);
  const a = $("qsEditNow"), b = $("qsEditDiff"), c = $("qsEditDiff2");
  if (a) a.textContent = qsMoney(total);
  if (b) { b.textContent = txt; b.className = diff > 0 ? "out" : ""; }
  if (c) c.textContent = txt;
}

async function qsSaveEdit() {
  if (qs.items.some(function (it) { return qsNum(it.rate) <= 0; })) { showError(t("Enter rate")); return; }
  qs.saving = true; renderQuick();
  try {
    const r = await call("editsale", {
      saleId: qs.editId, discount: qsNum(qs.discount), notes: qs.note, reason: qs.editReason || "", charges: qsChargeList(), structure: qsStructPayload(),
      items: qs.items.map(function (it) { const row = { qty: it.qty, unitPrice: qsNum(it.rate) }; if (it.isNew) row.newItem = it.name; else row.productId = it.id; return row; })
    });
    delete INVOICE_CACHE[qs.editId];
    qs.result = r; qs.step = 4;
  } catch (error) {
    showError(error.message || "Could not save.");
  }
  qs.saving = false;
  renderQuick();
}

function qsEditDone() {
  const r = qs.result || {};
  return '<div class="qs-head"><b>' + escapeHtml(t("Bill updated")) + "</b></div>" +
    '<div class="qs-done"><div class="qs-tick">✓</div><h3><span dir="ltr">' + escapeHtml(r.invoiceNo || "") + "</span> " + escapeHtml(t("saved")) + "</h3>" +
    '<div class="qs-sum"><div><span>' + escapeHtml(t("Was")) + '</span><b dir="ltr">' + qsMoney(r.oldNet) + "</b></div>" +
      "<div><span>" + escapeHtml(t("Now")) + '</span><b dir="ltr">' + qsMoney(r.netTotal) + "</b></div>" +
      "<div><span>" + escapeHtml(t("Paid")) + '</span><b dir="ltr">' + qsMoney(r.paid) + "</b></div>" +
      "<div><span>" + escapeHtml(t("Due now")) + '</span><b dir="ltr" class="' + (r.due > 0.5 ? "out" : "") + '">' + qsMoney(r.due) + "</b></div></div>" +
    '<button type="button" class="qs-btn qs-wa" onclick="whatsappInvoice(\'' + escapeHtml(r.saleId || "") + '\')">' + escapeHtml(t("Send invoice on WhatsApp")) + "</button>" +
    '<div class="qs-row2"><button type="button" class="qs-btn" onclick="openBillPdf(\'' + escapeHtml(r.saleId || "") + '\')">' + escapeHtml(t("Bill PDF")) + "</button>" +
    '<button type="button" class="qs-btn qs-primary" onclick="qsReset();showPage(\'bills\')">' + escapeHtml(t("Bills")) + "</button></div></div>";
}

/* ---------- Bill preview while making: the same A5 bill that prints, from what is on the screen now ---------- */
function qsPreviewBtn() {
  return '<button type="button" class="qs-preview" onclick="qsPreviewBill()"><span aria-hidden="true">👁</span> ' + escapeHtml(t("Bill preview")) + "</button>";
}

function qsDraftInvoice() {
  const total = qsTotal();
  const paid = qs.editId ? qs.edit.paid : qsPaidAmount();
  const today = new Date();
  const iso = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  return {
    sale: { InvoiceNo: qs.editId ? qs.edit.no : t("New"), Date: qs.editId ? qs.edit.date : iso, NetTotal: total, Paid: Math.min(paid, total), Balance: Math.max(0, total - paid),
      Discount: qsNum(qs.discount), Charges: JSON.stringify(qsChargeList().concat(qsStructCharge() ? [qsStructCharge()] : [])), Notes: qs.note || "" },
    items: qs.items.map(function (it) { const r = qsNum(it.rate); return { productId: it.id, description: it.name, qty: it.qty, unitPrice: r, discount: 0, lineTotal: Math.round(it.qty * r * 100) / 100 }; }),
    customer: { name: qsCustomerName(), phone: (qs.customer && qs.customer.phone) || "", balance: null },
    company: (state.settings && state.settings.company) || {}
  };
}

function qsPreviewBill() {
  if (!qs.items.length) return;
  const v = pdfViewerOpen(t("Making the bill..."));
  try {
    const pdf = buildInvoicePdf(qsDraftInvoice());
    pdfViewerShow(v, pdf, PDF_LAST_DOC, { title: t("Bill preview"), text: "", phone: "", preview: true });
  } catch (error) { v.remove(); showError(error.message || "Could not make the preview."); }
}


/* ============================================================
   HEALTH CHECK (owner): mistakes in stock, bills and balances, each one tappable
   ============================================================ */
async function loadHealth() {
  try { state.health = await call("healthcheck", {}); } catch (error) { showError(error.message || "Could not run the check."); return; }
  renderHealth();
}

function renderHealth() {
  const h = state.health || { checks: [] };
  const icon = { error: "●", warn: "▲", info: "i" };
  const ok = h.checks.filter(function (c) { return !c.count; });
  const bad = h.checks.filter(function (c) { return c.count; });
  contentElement().innerHTML = '<div class="content health-page">' +
    '<div class="toolbar"><div><h2>' + escapeHtml(t("Health check")) + "</h2><p>" + escapeHtml(t("Finds mistakes in stock, bills and balances. Tap a line to open it.")) + "</p></div>" +
    '<div class="toolbar-actions"><button class="btn secondary" type="button" onclick="loadHealth()">' + escapeHtml(t("Check again")) + "</button></div></div>" +
    '<div class="hc-sum ' + (h.problems ? "bad" : (h.warnings ? "warn" : "good")) + '"><b>' + (h.problems ? h.problems + " " + escapeHtml(t("problem(s) to fix")) : (h.warnings ? escapeHtml(t("No big problems")) : "✓ " + escapeHtml(t("Everything looks right")))) + "</b>" +
      "<small>" + escapeHtml(t("Checked at")) + " " + escapeHtml(String(h.at || "").slice(11, 16)) + "</small></div>" +
    bad.map(function (c) {
      return '<details class="panel hc-check hc-' + c.level + '"' + (c.level === "error" ? " open" : "") + "><summary><i>" + icon[c.level] + "</i><b>" + escapeHtml(t(c.title)) + '</b><em>' + c.count + "</em></summary>" +
        '<p class="hc-help">' + escapeHtml(t(c.help)) + "</p>" +
        (c.fix ? '<button type="button" class="btn primary hc-fix" onclick="healthFix(\'' + c.fix + '\', this)">' + escapeHtml(t("Fix")) + " (" + c.count + ")</button>" : "") +
        '<div class="hc-items">' + c.items.map(function (x) {
          return '<div class="hc-it"' + (x.card ? cardAttr(x.card.slice(0, x.card.indexOf(":")), x.card.slice(x.card.indexOf(":") + 1)) : "") + '><b dir="ltr">' + escapeHtml(x.text) + '</b><small dir="ltr">' + escapeHtml(x.sub || "") + "</small></div>";
        }).join("") + (c.count > c.items.length ? '<p class="qs-hint">+' + (c.count - c.items.length) + " " + escapeHtml(t("more")) + "</p>" : "") + "</div></details>";
    }).join("") +
    (ok.length ? '<div class="panel hc-ok"><h3>' + escapeHtml(t("All right")) + "</h3>" + ok.map(function (c) { return "<div>✓ " + escapeHtml(t(c.title)) + "</div>"; }).join("") + "</div>" : "") +
    "</div>";
  updatePageTitle("health");
}

async function healthFix(key, btn) {
  if (!confirm(t("Fix these now?") + "\n\n" + t("Stock counts and money do not change. Only the records are made to agree."))) return;
  btn.disabled = true;
  try { const r = await call("healthfix", { key: key }); showToast(r.fixed + " " + t("fixed")); await loadHealth(); }
  catch (error) { btn.disabled = false; showError(error.message || "Could not fix."); }
}

/* ============================================================
   HELP: short, only for the pages this user has
   ============================================================ */
const HELP_TOPICS = [
  ["quicksale", "New Sale", ["Choose the customer (or Cash customer), search the item, set quantity and rate, press Next.", "Choose Full paid, Credit or Part paid, then Save Sale.", "Press Bill preview to see the bill exactly as it prints, before saving.", "Labour, rent or installation: tick it on the payment screen and write the amount.", "Structure: tick Structure and write the total sale amount. The owner adds the fabricator cost later (Bills → Set cost)."]],
  ["bills", "Bills", ["Every bill you made, newest first. Tap a bill number to open its card.", "Edit bill: change items, quantity or rate. The bill number and payments stay; only the difference goes to stock and the account.", "A salesman can edit or delete his own bill only on the same day.", "Hand over: send the cash of a bill to Anwar or Ahsan with one tap."]],
  ["receive", "Receive payment", ["Cash page → Receive Payment. Choose the customer, tick the bills being paid, write the amount, Save.", "Online payment: choose the bank and attach the slip photo."]],
  ["cash", "Cash", ["Shows the cash with you now. Hand it to the cash keeper; he presses Received to confirm.", "Cash handed to you shows on top: press Received or Not received."]],
  ["goodsin", "Goods In", ["Goods coming in: from a supplier, from our own shop (Hamza / GM), or a new item.", "From our own shop it is a move: it leaves that shop and comes here, nothing is counted twice."]],
  ["inward", "Send to shop", ["Choose the shop, add the items and quantities, Save. A challan is made for the shop."]],
  ["accounts", "Accounts", ["Customers and suppliers in one list. Green: they have to pay us. Red: we have to pay them.", "Tap a name: Goods out, Goods in, Payment in, Payment out, and the Ledger.", "Someone we buy from and sell to: make it one account (Both), so there is one ledger."]],
  ["products", "Products & stock card", ["Tap any product name for its stock card: stock at every place and the full history.", "History shows when it came, from whom, when it went, to whom, with the bill or challan number."]],
  ["quote", "Quotation", ["Make a price offer for a customer. It does not change stock or accounts. Later it can become a sale."]],
  ["warranty", "Warranty", ["Search by serial number or mobile to see the warranty and add a claim."]],
  ["jobs", "Installations", ["Installation jobs: who, where, which technician, and the status."]],
  ["reportshub", "Reports", ["Daily Report, profit by item, incentive and monthly expenses, all on one page."]],
  ["health", "Health check", ["Run it once a week. It shows stock below zero, bills that do not add up, balances that differ from the ledger, and cash not confirmed.", "Tap a line to open it. Fix only makes records agree; it never changes stock or money."]],
  ["", "Good to know", ["Tap any bill number, product or name to open its card.", "Pressed Back by mistake? The app asks: Save, Discard or Cancel.", "EN / اردو at the top changes the language."]]
];

function renderHelp() {
  const list = HELP_TOPICS.filter(function (x) { return !x[0] || canOpen(x[0]) || (x[0] === "goodsin" && (canOpen("stockin") || canOpen("quickpurchase"))); });
  contentElement().innerHTML = '<div class="content help-page"' + (getLang() === "ur" ? ' dir="rtl"' : "") + '><div class="toolbar"><div><h2>' + escapeHtml(t("Help")) + "</h2><p>" + escapeHtml(t("How to use each page, in short.")) + '</p></div><div class="toolbar-actions"><button type="button" class="btn secondary" onclick="speedCheck()">⏱ ' + escapeHtml(t("Speed check")) + "</button></div></div>" +
    list.map(function (x, i) {
      return '<details class="panel help-topic"' + (i === 0 ? " open" : "") + "><summary><b>" + escapeHtml(t(x[1])) + "</b>" + (x[0] && x[0] !== "health" ? '<button type="button" class="btn secondary" onclick="event.preventDefault();showPage(\'' + (x[0] === "receive" ? "receive" : x[0]) + '\')">' + escapeHtml(t("Open")) + "</button>" : "") +
        "</summary><ul>" + x[2].map(function (l) { return "<li>" + escapeHtml(t(l)) + "</li>"; }).join("") + "</ul></details>";
    }).join("") + "</div>";
  updatePageTitle("help");
}


/* ============================================================
   STRUCTURE on the sale bill: a box like Labour / Rent / Installation, with the total sale amount.
   The fabricator's cost is put on the bill later (Bills → Set cost); profit and incentive count it only then.
   ============================================================ */
function qsStructAmount() {
  const st = qs.structure;
  if (!st || !st.on || isBuy() || isInward() || isQuote()) return 0;
  return Math.max(0, qsNum(st.amount));
}
function qsStructCharge() { const a = qsStructAmount(); return a > 0 ? { name: "Structure", amount: a, kind: "structure" } : null; }
function qsStructPayload() { const a = qsStructAmount(); return a > 0 ? { amount: a } : null; }
function qsStructOn(on) {
  qs.structure = qs.structure || { on: false, amount: "" };
  qs.structure.on = on;
  renderQuick();
  if (on) { const el = $("qsCharge_structure"); if (el) el.focus(); }
}
function qsStructInput(v) {
  qs.structure.amount = v;
  const el = $("qsTotalAmt"); if (el) el.textContent = qsMoney(qsTotal());
  qsPaidLive(qs.paid);
  qsEditLive();
}
function qsStructRow() {
  const st = qs.structure || {}, on = !!st.on;
  return '<div class="qs-charge' + (on ? " on" : "") + '"><label><input type="checkbox"' + (on ? " checked" : "") + ' onchange="qsStructOn(this.checked)"><span>' + escapeHtml(t("Structure")) + "</span></label>" +
    (on ? '<span class="qs-charge-amt" dir="ltr">Rs. <input type="text" inputmode="decimal" id="qsCharge_structure" value="' + escapeHtml(st.amount || "") + '" placeholder="0" oninput="qsStructInput(this.value)"></span>' : "") + "</div>";
}


/* ============================================================
   NEEDS YOUR ATTENTION: tap a line → a card with only those items; resolve each one there.
   When the card closes, the dashboard is drawn again, so a resolved line is gone.
   ============================================================ */
const ATT_TITLES = { pay: "Payments to check", cash: "Cash handed to you", short: "Sold without ERP stock", goodsin: "Goods In waiting for a bill", low: "Low stock" };

async function openAttention(kind) {
  const wait = cardLoading();
  let d;
  try { d = await call("attentionlist", { kind: kind }); } catch (error) { wait.remove(); showError(error.message || "Could not open."); return; }
  wait.remove();
  attRender(kind, d.items || []);
}

function attRender(kind, items) {
  state.attItems = items; state.attKind = kind;
  const open = document.querySelector(".card-sheet.att-sheet");
  const html = attHtml(kind, items);
  if (open) { open.querySelector(".cost-card").innerHTML = '<button type="button" class="card-x" aria-label="' + escapeHtml(t("Close")) + '">×</button>' + html; return; }
  const box = cardBox("card-wide att-card", html);
  box.classList.add("att-sheet");
  // closing the card (×, outside tap or Back) refreshes the dashboard
  new MutationObserver(function (m, obs) { if (!document.body.contains(box)) { obs.disconnect(); attRefreshHome(); } }).observe(document.body, { childList: true });
}

function attRefreshHome() {
  if (state.attSkip) { state.attSkip = 0; return; }
  if (state.page === "dashboard" || state.page === "home") showPageNow(state.page);
  cashBell();
}

function attHtml(kind, items) {
  const head = '<div class="pc-head"><div><h3>' + escapeHtml(t(ATT_TITLES[kind] || "")) + "</h3><small>" + items.length + "</small></div></div>";
  if (!items.length) return head + '<p class="att-done">✓ ' + escapeHtml(t("Done. Nothing left here.")) + "</p>";
  const btn = function (cls, label, fn) { return '<button type="button" class="btn ' + cls + ' ledger-action-btn" onclick="' + fn + '">' + escapeHtml(t(label)) + "</button>"; };
  let top = "", rows = "";
  if (kind === "pay") {
    state.attSel = state.attSel || {};
    top = '<div class="att-top"><label class="qs-check"><input type="checkbox" onchange="attSelAll(this.checked)"' + (items.every(function (x) { return state.attSel[x.paymentId]; }) ? " checked" : "") + "> " + escapeHtml(t("Select all")) + "</label>" +
      btn("primary", "OK selected", "attPayAll()") + "</div>";
    rows = items.map(function (x) {
      const bill = (String(x.what).match(/(INV-?\d+)/) || [])[1];
      return '<div class="att-row" data-id="' + escapeHtml(x.paymentId) + '"><label class="att-tick"><input type="checkbox"' + (state.attSel[x.paymentId] ? " checked" : "") + ' onchange="attSelOne(\'' + escapeHtml(x.paymentId) + '\',this.checked)"></label><div class="att-main"><b dir="ltr">' + qsMoney(x.amount) + "</b> <span dir=\"ltr\">" + escapeHtml(x.customer) + "</span>" +
        "<small>" + escapeHtml([x.method + (x.account ? " · " + x.account : ""), x.txnRef, x.by, formatDate(x.date) + " " + String(x.date || "").slice(11, 16)].filter(Boolean).join(" · ")) + "</small>" +
        "<small>" + (bill ? escapeHtml(t("Paid on bill")) + " " + cardLink("ref", bill, bill) : escapeHtml(t(x.what))) + (x.slipUrl ? ' · <a href="' + escapeHtml(String(x.slipUrl).split(/\s*,\s*/)[0]) + '" target="_blank" rel="noopener">' + escapeHtml(t("View slip")) + "</a>" : "") + "</small></div>" +
        '<div class="att-acts">' + btn("primary", "OK", "attPay('" + escapeHtml(x.paymentId) + "',true)") + btn("danger", "Problem", "attPay('" + escapeHtml(x.paymentId) + "',false)") + "</div></div>";
    }).join("");
  } else if (kind === "cash") {
    rows = items.map(function (x) {
      return '<div class="att-row"><div class="att-main"><b dir="ltr">' + qsMoney(x.amount) + "</b> · " + escapeHtml(t("Given by")) + ' <span dir="ltr">' + escapeHtml(x.fromName) + "</span>" +
        "<small>" + escapeHtml([formatDate(x.date) + " " + String(x.date || "").slice(11, 16), x.note].filter(Boolean).join(" · ")) + "</small></div>" +
        '<div class="att-acts">' + btn("primary", "Received", "attCash('" + escapeHtml(x.id) + "',true)") + btn("danger", "Not received", "attCash('" + escapeHtml(x.id) + "',false)") + "</div></div>";
    }).join("");
  } else if (kind === "short") {
    top = '<p class="qs-hint">' + escapeHtml(t("Correct the stock in Products & Stock if the count is wrong, then press Checked.")) + "</p>";
    rows = items.map(function (x) {
      return '<div class="att-row"><div class="att-main"><b>' + x.qty + "</b> " + cardLink("product", x.productId, x.name) + "<small>" + escapeHtml([x.place, formatDate(x.date), x.note].filter(Boolean).join(" · ")) + "</small></div>" +
        '<div class="att-acts">' + btn("primary", "Checked", "attSeen('short','" + escapeHtml(x.id) + "')") + "</div></div>";
    }).join("");
  } else if (kind === "goodsin") {
    rows = items.map(function (x) {
      return '<div class="att-row"><div class="att-main"><b dir="ltr">' + cardLink("challan", x.id, x.id) + "</b> " + escapeHtml(x.source) + " → " + escapeHtml(x.to) +
        "<small>" + escapeHtml([formatDate(x.date), x.units + " " + t("units"), x.by].filter(Boolean).join(" · ")) + "</small>" + (x.items ? "<small>" + escapeHtml(x.items) + "</small>" : "") + "</div>" +
        '<div class="att-acts">' + btn("primary", "Make purchase bill", "state.attSkip=1;this.closest('.cost-modal').remove();stockInToPurchase('" + escapeHtml(x.id) + "')") + btn("secondary", "No bill needed", "attSeen('goodsin','" + escapeHtml(x.id) + "')") + "</div></div>";
    }).join("");
  } else if (kind === "low") {
    top = '<p class="qs-hint">' + escapeHtml(t("Seen hides it until the stock changes.")) + "</p>";
    rows = items.map(function (x) {
      return '<div class="att-row"><div class="att-main">' + cardLink("product", x.id, x.name) + "<small>" + escapeHtml(t("Stock now")) + ": " + formatNumber(x.stock) + " · " + escapeHtml(t("Minimum")) + ": " + formatNumber(x.min) + "</small></div>" +
        '<div class="att-acts">' + btn("secondary", "Seen", "attSeen('low','" + escapeHtml(x.id) + "')") + "</div></div>";
    }).join("");
  }
  return head + top + '<div class="att-list">' + rows + "</div>";
}

function attBusy(on) { document.querySelectorAll(".att-card .att-acts button, .att-card .att-top button").forEach(function (b) { b.disabled = on; }); }

async function attPay(id, ok) {
  let note = "";
  if (!ok) { note = prompt(t("What was the problem?")) || ""; if (!note) return; }
  attBusy(true);
  try { const r = await call("checkpayment", { paymentId: id, ok: ok, note: note }); attRender("pay", r.items || []); }
  catch (error) { attBusy(false); showError(error.message || "Could not save."); }
}

function attSelOne(id, on) { state.attSel = state.attSel || {}; if (on) state.attSel[id] = true; else delete state.attSel[id]; }
function attSelAll(on) { state.attSel = {}; if (on) (state.attItems || []).forEach(function (x) { state.attSel[x.paymentId] = true; }); attRender("pay", state.attItems || []); }
async function attPayAll() {
  const ids = Object.keys(state.attSel || {}).filter(function (id) { return (state.attItems || []).some(function (x) { return x.paymentId === id; }); });
  if (!ids.length) { showError(t("Tick the payments first.")); return; }
  attBusy(true);
  try { const r = await call("checkpayment", { paymentIds: ids, ok: true }); state.attSel = {}; attRender("pay", r.items || []); showToast(ids.length + " " + t("payments checked.")); }
  catch (error) { attBusy(false); showError(error.message || "Could not save."); }
}

async function attCash(id, ok) {
  attBusy(true);
  try {
    const r = await call("cashconfirm", { handoverId: id, ok: ok });
    myCashPill(r.inHand);
    attRender("cash", (state.attItems || []).filter(function (x) { return x.id !== id; }));
    showToast(t(ok ? "Received" : "Not received"));
  } catch (error) { attBusy(false); showError(error.message || "Could not save."); }
}

async function attSeen(kind, id) {
  attBusy(true);
  try { const r = await call("attresolve", { kind: kind, id: id }); attRender(kind, r.items || []); }
  catch (error) { attBusy(false); showError(error.message || "Could not save."); }
}

/* ---------- My cash: always on top; new cash handed to me pops up ---------- */
function myCashPill(amount) {
  if (amount == null || !state.user || !canOpen("cash")) return;
  const bar = document.querySelector(".topbar-actions");
  if (!bar) return;
  let el = $("myCashPill");
  if (!el) {
    el = document.createElement("button");
    el.id = "myCashPill"; el.type = "button"; el.className = "my-cash-pill";
    el.addEventListener("click", function () { state.cashTab = "hand"; showPage("cash"); });
    bar.insertBefore(el, bar.firstChild);
  }
  el.innerHTML = "<small>" + escapeHtml(t("My cash")) + '</small><b dir="ltr">' + qsMoney(amount) + "</b>";
}

let CASH_POPPED = {};
try { CASH_POPPED = JSON.parse(localStorage.getItem("arhamCashPopped") || "{}") || {}; } catch (e) { CASH_POPPED = {}; }
function cashPopup(list) {
  const fresh = list.filter(function (x) { return !CASH_POPPED[x.id]; });
  if (!fresh.length || document.querySelector(".att-sheet") || document.querySelector(".cost-modal")) return;
  fresh.forEach(function (x) { CASH_POPPED[x.id] = 1; });
  try { localStorage.setItem("arhamCashPopped", JSON.stringify(CASH_POPPED)); } catch (e) { /* private mode */ }
  attRender("cash", list);
}

/* ---------- Settings: cash already at a shop (opening) or a correction ---------- */
async function loadCashAdjPanel() {
  const box = $("cashAdjPanel");
  if (!box) return;
  if (!isAdminUser()) { box.remove(); return; }
  try { state.cashAdj = await call("cashadjustments", {}); } catch (error) { box.innerHTML = '<p class="empty">' + escapeHtml(error.message) + "</p>"; return; }
  renderCashAdjPanel();
}

function renderCashAdjPanel() {
  const box = $("cashAdjPanel"), d = state.cashAdj || { people: [], list: [] };
  if (!box) return;
  box.innerHTML = '<div class="panel-header"><div><h3>' + escapeHtml(t("Cash in hand (opening / correction)")) + '</h3><p style="margin:4px 0 0;">' + escapeHtml(t("Add the cash already kept at a shop, so the cash count matches.")) + "</p></div></div>" +
    '<div class="ca-form"><label>' + escapeHtml(t("Person")) + '<select id="caUser">' + d.people.map(function (x) {
      return '<option value="' + escapeHtml(x.userId) + '">' + escapeHtml(x.name + " · " + x.shop + " · " + t("Cash now") + " " + qsMoney(x.inHand)) + "</option>";
    }).join("") + "</select></label>" +
    '<div class="qs-seg" id="caSign"><button type="button" class="sel" data-s="1">+ ' + escapeHtml(t("Add cash")) + '</button><button type="button" data-s="-1">− ' + escapeHtml(t("Take out")) + "</button></div>" +
    "<label>" + escapeHtml(t("Amount")) + '<input id="caAmt" type="text" inputmode="decimal" dir="ltr" placeholder="0"></label>' +
    "<label>" + escapeHtml(t("Note")) + '<input id="caNote" type="text" placeholder="' + escapeHtml(t("Opening cash")) + '"></label>' +
    '<button type="button" class="btn primary" id="caSave">' + escapeHtml(t("Save")) + "</button></div>" +
    (d.list.length ? "<h4>" + escapeHtml(t("Recent")) + '</h4><div class="ca-list">' + d.list.map(function (x) {
      return '<div><span>' + escapeHtml(formatDate(x.date)) + " · " + escapeHtml(x.name) + (x.note ? " · " + escapeHtml(x.note) : "") + '</span><b dir="ltr" class="' + (x.amount < 0 ? "neg" : "") + '">' + (x.amount < 0 ? "−" : "+") + qsMoney(Math.abs(x.amount)) + "</b></div>";
    }).join("") + "</div>" : "");
  let sign = 1;
  box.querySelectorAll("#caSign button").forEach(function (b) { b.onclick = function () { sign = Number(b.dataset.s); box.querySelectorAll("#caSign button").forEach(function (x) { x.classList.toggle("sel", x === b); }); }; });
  box.querySelector("#caSave").onclick = async function () {
    const amt = Number(String(box.querySelector("#caAmt").value).replace(/[, ]/g, "")) || 0;
    if (!(amt > 0)) { showError(t("Write the amount.")); return; }
    this.disabled = true;
    try {
      state.cashAdj = await call("cashadjust", { userId: box.querySelector("#caUser").value, amount: sign * amt, note: box.querySelector("#caNote").value.trim() || "Opening cash" });
      renderCashAdjPanel(); showToast(t("Saved")); cashBell();
    } catch (error) { this.disabled = false; showError(error.message || "Could not save."); }
  };
}


/* ============================================================
   SUPPLIER INVOICE UPLOAD: from the supplier's account card. The PDF is read here on the phone (pdf.js),
   checked on one screen, then posted as "Ledger only" (old invoices) or "Stock + Ledger" (a purchase bill).
   ============================================================ */
function invNum(s) { const v = Number(String(s).replace(/,/g, "")); return isFinite(v) ? v : NaN; }
function invIsNum(s) { return /^-?[\d,]+(\.\d+)?$/.test(String(s).trim()); }

// items: [{ s, x, y, p }] from pdf.js (y grows upward). Known layout: Inverex MIS "Sales Invoice".
function invParse(items) {
  const all = items.map(function (o) { return o.s; }).join(" ");
  const out = { recognized: false, vendor: "", invoiceNo: "", date: "", billTo: "", total: 0, lines: [] };
  if (/INVEREX/i.test(all)) out.vendor = "INVEREX";
  const no = all.match(/\b(IEP\d{6,})\b/) || all.match(/Invoice\s*(?:No\.?|Number|#)\s*[:#]?\s*([A-Z0-9][A-Z0-9\/-]{2,})/i);
  if (no) out.invoiceNo = no[1];
  const dt = all.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+IEP/) || all.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dt) {
    let m = Number(dt[1]), d = Number(dt[2]);          // Inverex prints month/day/year
    if (m > 12 && d <= 12) { const x = m; m = d; d = x; }
    out.date = dt[3] + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }
  const nm = all.match(/Name\s*:\s*(.+?)\s+Address\s*:/);
  if (nm) out.billTo = nm[1].trim();
  const byPage = {};
  items.forEach(function (o) { (byPage[o.p || 1] = byPage[o.p || 1] || []).push(o); });
  const sameRow = function (list, y, tol) { return list.filter(function (o) { return Math.abs(o.y - y) <= (tol || 2); }); };
  Object.keys(byPage).forEach(function (pg) {
    const list = byPage[pg];
    const incl = list.find(function (o) { return /Total\s*Incl/i.test(o.s); });
    if (incl) {
      const nums = sameRow(list, incl.y, 3).filter(function (o) { return o.x > incl.x && invIsNum(o.s); }).sort(function (a, b) { return a.x - b.x; });
      if (nums.length) out.total = invNum(nums[nums.length - 1].s);
    }
    const head = list.find(function (o) { return o.s.trim() === "Item"; });
    if (!head) return;
    const pack = list.find(function (o) { return /^Packing|^Quantity|^Qty/i.test(o.s.trim()) && Math.abs(o.y - head.y) <= 6 && o.x > head.x; });
    const sno = list.find(function (o) { return /^(S|No\.?|S\.?\s*No\.?|Sr\.?)$/i.test(o.s.trim()) && Math.abs(o.y - head.y) <= 10 && o.x < head.x; });
    if (!pack || !sno) return;
    const cost = list.find(function (o) { return /^Cost$/i.test(o.s.trim()) && Math.abs(o.y - head.y) <= 10 && o.x < head.x; });
    const lo = cost ? (cost.x + head.x) / 2 : sno.x + 15;
    const totalRow = list.filter(function (o) { return /^Total$/i.test(o.s.trim()) && o.y < head.y; }).sort(function (a, b) { return b.y - a.y; })[0];
    const bottom = totalRow ? totalRow.y : -1e9;
    const anchors = list.filter(function (o) { return /^\d{1,3}$/.test(o.s.trim()) && Math.abs(o.x - sno.x) <= 8 && o.y < head.y - 4 && o.y > bottom + 2; })
      .sort(function (a, b) { return b.y - a.y; });
    anchors.forEach(function (a, i) {
      const top = i === 0 ? head.y - 6 : (anchors[i - 1].y + a.y) / 2;
      const bot = i === anchors.length - 1 ? bottom + 3 : (a.y + anchors[i + 1].y) / 2;
      const words = list.filter(function (o) { return o.y < top && o.y > bot && o.x >= lo && o.x < pack.x - 2; })
        .sort(function (p, q) { return (q.y - p.y) || (p.x - q.x); });
      let text = "";
      words.forEach(function (w) { const s = w.s.trim(); text += (text && !/-$/.test(text) ? " " : "") + s; });
      const nums = sameRow(list, a.y, 2).filter(function (o) { return o.x >= pack.x - 2 && invIsNum(o.s); }).sort(function (p, q) { return p.x - q.x; });
      if (!text || nums.length < 2) return;
      out.lines.push({ text: text.replace(/\s+/g, " ").trim(), qty: invNum(nums[0].s), rate: invNum(nums[1].s), lineTotal: invNum(nums[nums.length - 1].s) });
    });
  });
  if (!out.total && out.lines.length) out.total = Math.round(out.lines.reduce(function (s, l) { return s + l.lineTotal; }, 0) * 100) / 100;
  out.recognized = out.lines.length > 0 && out.total > 0;
  return out;
}

let PDFJS_LIB = null;
// The two pdf.js files sit next to app.js (or in a "pdfjs" folder).
async function loadPdfJs() {
  if (PDFJS_LIB) return PDFJS_LIB;
  let lib = null, base = "";
  const tries = [new URL("./", location.href).href, new URL("pdfjs/", location.href).href];
  for (let i = 0; i < tries.length && !lib; i++) {
    try { lib = await import(tries[i] + "pdf.min.mjs"); base = tries[i]; } catch (e) { lib = null; }
  }
  if (!lib) throw new Error(t("The PDF reader files are missing on GitHub: pdf.min.mjs and pdf.worker.min.mjs. Upload them next to app.js."));
  lib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
  PDFJS_LIB = lib;
  return lib;
}

async function invPdfItems(buf) {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
  const out = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    tc.items.forEach(function (it) { if (it.str && it.str.trim()) out.push({ s: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]), p: i }); });
  }
  return out;
}

function invNormText(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9.]+/g, " ").trim(); }
// best product for an invoice line: remembered from last time, else the most words in common (sizes like 2.5KW must match)
function invMatch(text, products, map) {
  const k = invNormText(text);
  if (map && map[k] && products.some(function (p) { return p.id === map[k]; })) return map[k];
  const words = k.split(" ").filter(function (w) { return w.length > 1; });
  const sizes = words.filter(function (w) { return /^\d+(\.\d+)?(KW|KVA|W|WATT|AH|V|HP|TON)$/.test(w); });   // capacity must match exactly
  let best = "", score = 0;
  products.forEach(function (p) {
    const pw = invNormText(p.name).split(" ");
    if (sizes.length && !sizes.every(function (w) { return pw.indexOf(w) !== -1; })) return;
    const hit = words.filter(function (w) { return pw.indexOf(w) !== -1; }).length / Math.max(words.length, 1);
    if (hit > score) { score = hit; best = p.id; }
  });
  return score >= 0.5 ? best : "";
}

const inv = { };
function invoiceUploadStart(type, id, name) {
  const input = document.createElement("input");
  input.type = "file"; input.accept = "application/pdf,.pdf";
  input.onchange = function () { if (input.files && input.files[0]) invoiceFile(type, id, name, input.files[0]); };
  input.click();
}

async function invoiceFile(type, id, name, file) {
  if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { showError(t("Only PDF invoices can be read.")); return; }
  const wait = cardBox("card-wide", '<p class="empty">' + escapeHtml(t("Reading the invoice...")) + "</p>");
  try {
    const buf = await file.arrayBuffer();
    const [items, prep, data] = await Promise.all([
      invPdfItems(buf.slice(0)),
      call("invoiceprep", { partyType: type, partyId: id }),
      new Promise(function (res, rej) { const r = new FileReader(); r.onload = function () { res(String(r.result)); }; r.onerror = rej; r.readAsDataURL(file); })
    ]);
    const parsed = invParse(items);
    Object.keys(inv).forEach(function (k) { delete inv[k]; });
    Object.assign(inv, {
      type: type, id: id, name: name, prep: prep, parsed: parsed, file: { name: file.name, data: data },
      no: parsed.invoiceNo, date: parsed.date || new Date().toISOString().slice(0, 10), total: parsed.total ? String(parsed.total) : "",
      rows: parsed.lines.map(function (l) { return { text: l.text, qty: String(l.qty), lineTotal: String(l.lineTotal), productId: invMatch(l.text, prep.products, prep.itemMap) }; }),
      mode: (function () { try { return localStorage.getItem("arhamInvMode") || "ledger"; } catch (e) { return "ledger"; } })(),
      wh: prep.mainId, saving: false, done: null
    });
    wait.remove();
    invRender();
  } catch (error) {
    wait.remove();
    showError((error && error.message) || "Could not read the invoice.");
  }
}

function invSum() { return Math.round(inv.rows.reduce(function (s, r) { return s + (Number(String(r.lineTotal).replace(/,/g, "")) || 0); }, 0) * 100) / 100; }

function invHtml() {
  if (inv.done) {
    const d = inv.done;
    return '<div class="pc-head"><div><small>' + escapeHtml(t("Invoice saved")) + "</small><h3 dir=\"ltr\">" + escapeHtml(d.invoiceNo) + "</h3><small>" + escapeHtml(d.name) + "</small></div></div>" +
      '<p class="att-done">✓ ' + qsMoney(d.total) + " · " + escapeHtml(t(d.mode === "stock" ? "Stock + Ledger" : "Ledger only")) + "</p>" +
      '<p class="pk-last">' + escapeHtml(t("Balance now")) + ': <b dir="ltr">' + qsMoney(Math.abs(d.balance)) + "</b></p>" +
      '<div class="form-actions">' + (d.purchaseId ? '<button type="button" class="btn secondary" data-card="purchase:' + escapeHtml(d.purchaseId) + '">' + escapeHtml(t("Purchase")) + "</button>" : "") +
      '<button type="button" class="btn primary" onclick="this.closest(\'.cost-modal\').remove();openPartyLedger(\'' + inv.type + "','" + escapeHtml(inv.id) + '\')">' + escapeHtml(t("Ledger")) + "</button></div>";
  }
  const stock = inv.mode === "stock";
  const sum = invSum(), total = Number(String(inv.total).replace(/,/g, "")) || 0;
  const prods = inv.prep.products;
  const opts = function (sel, text) {
    const sug = sel ? prods.filter(function (p) { return p.id === sel; }) : [];
    return '<option value="">+ ' + escapeHtml(t("New product")) + ": " + escapeHtml(String(text).slice(0, 40)) + "</option>" +
      sug.concat(prods.filter(function (p) { return p.id !== sel; })).map(function (p) { return '<option value="' + escapeHtml(p.id) + '"' + (p.id === sel ? " selected" : "") + ">" + escapeHtml(p.name) + "</option>"; }).join("");
  };
  const done = (inv.prep.recent || []).filter(function (r) { return r.no; }).slice(0, 5);
  return '<div class="pc-head"><div><small>' + escapeHtml(t("Supplier invoice")) + (inv.parsed.vendor ? " · " + escapeHtml(inv.parsed.vendor) : "") + '</small><h3 dir="ltr">' + escapeHtml(inv.name) + '</h3><small dir="ltr">' + escapeHtml(inv.file.name) + (inv.parsed.billTo ? " · " + escapeHtml(inv.parsed.billTo) : "") + "</small></div></div>" +
    (inv.parsed.recognized ? "" : '<p class="inv-warn">' + escapeHtml(t("This invoice format is not known yet. Write the number, date and total yourself.")) + "</p>") +
    '<div class="inv-fields"><label>' + escapeHtml(t("Invoice no.")) + '<input type="text" dir="ltr" value="' + escapeHtml(inv.no || "") + '" oninput="inv.no=this.value"></label>' +
      "<label>" + escapeHtml(t("Invoice date")) + '<input type="date" value="' + escapeHtml(inv.date || "") + '" oninput="inv.date=this.value"></label>' +
      "<label>" + escapeHtml(t("Invoice total")) + '<span dir="ltr">Rs. <input type="text" inputmode="decimal" value="' + escapeHtml(inv.total) + '" oninput="inv.total=this.value;invCheckSum()"></span></label></div>' +
    '<div class="qs-seg inv-mode"><button type="button" class="' + (stock ? "" : "sel") + '" onclick="invMode(\'ledger\')">' + escapeHtml(t("Ledger only")) + '</button><button type="button" class="' + (stock ? "sel" : "") + '" onclick="invMode(\'stock\')">' + escapeHtml(t("Stock + Ledger")) + "</button></div>" +
    '<p class="qs-hint">' + escapeHtml(t(stock ? "Goods come into stock and the account is updated (a purchase bill is made)." : "Old invoice: only the account is updated. Stock does not change.")) + "</p>" +
    (stock ? '<label class="inv-place">' + escapeHtml(t("Place")) + '<select onchange="inv.wh=this.value">' + inv.prep.warehouses.map(function (w) { return '<option value="' + escapeHtml(w.id) + '"' + (w.id === inv.wh ? " selected" : "") + ">" + escapeHtml(w.name) + "</option>"; }).join("") + "</select></label>" : "") +
    '<div class="inv-rows">' + inv.rows.map(function (r, i) {
      return '<div class="inv-row"><input class="inv-text" type="text" dir="ltr" value="' + escapeHtml(r.text) + '" oninput="inv.rows[' + i + '].text=this.value">' +
        '<div class="inv-nums"><label><small>' + escapeHtml(t("Qty")) + '</small><input type="text" inputmode="decimal" value="' + escapeHtml(r.qty) + '" oninput="inv.rows[' + i + '].qty=this.value"></label>' +
        "<label><small>" + escapeHtml(t("Amount")) + '</small><input type="text" inputmode="decimal" dir="ltr" value="' + escapeHtml(r.lineTotal) + '" oninput="inv.rows[' + i + '].lineTotal=this.value;invCheckSum()"></label>' +
        '<button type="button" class="btn secondary ledger-action-btn" onclick="inv.rows.splice(' + i + ',1);invRender()">✕</button></div>' +
        (stock ? '<select class="inv-prod" onchange="inv.rows[' + i + '].productId=this.value">' + opts(r.productId, r.text) + "</select>" : "") + "</div>";
    }).join("") + '<button type="button" class="qs-another" onclick="inv.rows.push({text:\'\',qty:\'1\',lineTotal:\'\',productId:\'\'});invRender()">+ ' + escapeHtml(t("Add item")) + "</button></div>" +
    '<p class="inv-sum" id="invSum">' + invSumText(sum, total) + "</p>" +
    (done.length ? '<p class="pk-last">' + escapeHtml(t("Already entered")) + ": " + done.map(function (r) { return escapeHtml(r.no) + " (" + escapeHtml(formatDate(r.date)) + ")"; }).join(", ") + "</p>" : "") +
    '<div class="form-actions"><button type="button" class="btn secondary" onclick="this.closest(\'.cost-modal\').remove()">' + escapeHtml(t("Cancel")) + '</button>' +
    '<button type="button" class="btn primary" id="invSave" onclick="invSave()"' + (inv.saving ? " disabled" : "") + ">" + escapeHtml(inv.saving ? t("Saving...") : t("Save")) + "</button></div>";
}

function invSumText(sum, total) {
  if (!inv.rows.length) return "";
  const bad = total > 0 && Math.abs(sum - total) > 1;
  return '<span class="' + (bad ? "bad" : "") + '">' + escapeHtml(t("Items add up to")) + ' <b dir="ltr">' + qsMoney(sum) + "</b>" + (bad ? " · " + escapeHtml(t("does not match the invoice total")) : " ✓") + "</span>";
}
function invCheckSum() { const el = $("invSum"); if (el) el.innerHTML = invSumText(invSum(), Number(String(inv.total).replace(/,/g, "")) || 0); }
function invMode(m) { inv.mode = m; try { localStorage.setItem("arhamInvMode", m); } catch (e) { /* private mode */ } invRender(); }

function invRender() {
  const open = document.querySelector(".card-sheet.inv-sheet");
  if (open) { open.querySelector(".cost-card").innerHTML = '<button type="button" class="card-x" aria-label="' + escapeHtml(t("Close")) + '">×</button>' + invHtml(); return; }
  const box = cardBox("card-wide inv-card", invHtml());
  box.classList.add("inv-sheet");
}

async function invSave() {
  const total = Number(String(inv.total).replace(/,/g, "")) || 0;
  if (!String(inv.no || "").trim()) { showError(t("Write the invoice number.")); return; }
  if (!(total > 0)) { showError(t("Write the invoice total.")); return; }
  const rows = inv.rows.map(function (r) { return { text: r.text, qty: Number(String(r.qty).replace(/,/g, "")) || 0, lineTotal: Number(String(r.lineTotal).replace(/,/g, "")) || 0, productId: inv.mode === "stock" ? r.productId : (r.productId || "") }; })
    .filter(function (r) { return r.qty > 0; });
  if (inv.mode === "stock" && Math.abs(invSum() - total) > 1 && !confirm(t("Items add up to") + " " + qsMoney(invSum()) + ", " + t("does not match the invoice total") + " (" + qsMoney(total) + "). " + t("Save anyway?"))) return;
  const newOnes = inv.mode === "stock" ? rows.filter(function (r) { return !r.productId; }).length : 0;
  if (!confirm(inv.name + "\n" + inv.no + " · " + qsMoney(total) + "\n" + t(inv.mode === "stock" ? "Stock + Ledger" : "Ledger only") + (newOnes ? "\n+ " + newOnes + " " + t("New product") : "") + "\n\n" + t("Save") + "?")) return;
  inv.saving = true; invRender();
  try {
    inv.done = await call("invoicesave", { partyType: inv.type, partyId: inv.id, mode: inv.mode, invoiceNo: String(inv.no).trim(), date: inv.date, total: total,
      items: rows, warehouseId: inv.wh, file: { name: inv.file.name, data: inv.file.data } });
    inv.saving = false; invRender();
    showToast(t("Invoice saved") + ": " + inv.done.invoiceNo);
  } catch (error) {
    inv.saving = false; invRender();
    showError(error.message || "Could not save.");
  }
}


/* ============================================================
   BILL PDF, "Grid" design (logo colours: navy, yellow, green). A5, one page; rows shrink to fit,
   very long bills continue on a second page. Services (labour, rent, installation, structure)
   sit in their own box under the items.
   ============================================================ */
function amountInWords(n) {
  n = Math.round(Math.abs(Number(n) || 0));
  if (!n) return "Zero";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = function (x) { return x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? " " + a[x % 10] : ""); };
  const three = function (x) { return (x >= 100 ? a[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " : "") : "") + (x % 100 ? two(x % 100) : ""); };
  const parts = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const th = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(three(crore) + " Crore");
  if (lakh) parts.push(two(lakh) + " Lakh");
  if (th) parts.push(two(th) + " Thousand");
  if (n) parts.push(three(n));
  return parts.join(" ");
}

function buildInvoicePdfGrid(data) {
  const sale = data.sale || {}, c = data.customer || {}, co = data.company || {};
  const tt = invoiceTotals(data);
  const doc = createPdf(A5_W, A5_H);
  const NAVY = "#0F2B5B", GOLD = "#FEC40E", GREEN = "#17853A", RED = "#C62828", LINE = "#9FB0CC", MUTED = "#3D5480", ZEBRA = "#F5F7FB";
  const M = 22, R = A5_W - M, W = R - M;
  // columns
  const wSr = 22, wQty = 32, wRate = 56, wAmt = 66;
  const xSr = M, xDesc = xSr + wSr, xAmt = R - wAmt, xRate = xAmt - wRate, xQty = xRate - wQty, wDesc = xQty - xDesc;

  // ---- bottom block (services + totals), drawn once on the last page ----
  const services = tt.charges.filter(function (x) { return Number(x.amount) > 0; });
  const servicesTotal = services.reduce(function (a, x) { return a + Number(x.amount || 0); }, 0);
  const totLines = [["Items total", billNumber(tt.itemsTotal)]];
  if (services.length) totLines.push(["Services", billNumber(servicesTotal)]);
  if (tt.discount) totLines.push(["Discount", "- " + billNumber(tt.discount), GREEN]);
  const after = [["Paid", billNumber(tt.paid)]];
  if (tt.returned) after.push(["Returned", "- " + billNumber(tt.returned)]);
  after.push(["Balance", billNumber(tt.balance), tt.balance > 0.5 ? RED : NAVY, true]);
  const showAcc = c.balance != null && c.name && String(c.name).toUpperCase() !== "CASH CUSTOMER";
  if (showAcc) after.push(["Account balance", billNumber(c.balance), Number(c.balance) > 0 ? RED : NAVY]);
  const LT = 11.5;
  const rightH = 6 + totLines.length * LT + 22 + after.length * LT + 4;
  const words = "Rupees " + amountInWords(tt.net) + " Only";
  const leftWords = pdfWrap(words, W * 0.55 - 14, true, 7.4);
  const notes = sale.Notes ? pdfWrap("Note: " + sale.Notes, W * 0.55 - 14, false, 7.2).slice(0, 2) : [];
  const leftH = (services.length ? 16 + services.length * LT : 6) + 8 + leftWords.length * 9.5 + notes.length * 9 + 4;
  const boxH = Math.max(rightH, leftH);
  const footTop = A5_H - 58;                 // Urdu note + dealers
  const signY = footTop - 22;
  const boxY = signY - 28 - boxH;            // services / totals box
  let y = 0, page = 0;

  const header = function () {
    doc.addPage(); page += 1;
    // name box with the logo, yellow tag strip
    doc.round(M, 16, W, 66, 6, { stroke: NAVY, lineWidth: 1.6 });
    pdfLogo(doc, M + 8, 22, 40);
    doc.text(M + 56, 46, pdfFit(String(co.name || "ARHAM ELECTRONICS").toUpperCase(), W - 62, true, 21), { size: 21, serif: true, color: NAVY });
    doc.text(M + 56, 59, pdfFit(BILL_ADDRESS + "  ·  " + BILL_CELL, W - 62, false, 6.8), { size: 6.8, color: MUTED });
    doc.rect(M + 0.8, 66, W - 1.6, 15.2, { fill: GOLD });
    doc.line(M + 0.8, 66, R - 0.8, 66, { color: NAVY, width: 1.4 });
    doc.text(A5_W / 2, 76.6, BILL_TAGLINE, { size: 7.6, bold: true, color: NAVY, align: "center" });
    doc.round(M, 16, W, 66, 6, { stroke: NAVY, lineWidth: 1.6 });
    // INVOICE pill
    const pill = tt.cancelled ? "CANCELLED" : "INVOICE";
    doc.round(A5_W / 2 - 46, 88, 92, 18, 9, { stroke: tt.cancelled ? RED : GREEN, lineWidth: 1.2 });
    doc.text(A5_W / 2, 101, pill, { size: 11, serif: true, color: tt.cancelled ? RED : GREEN, align: "center" });
    // invoice no / date / customer / mobile
    const gy = 112, gh = 17;
    doc.rect(M, gy, W, gh * 2, { stroke: NAVY, lineWidth: 0.8 });
    doc.line(M + W / 2, gy, M + W / 2, gy + gh * 2, { color: NAVY, width: 0.8 });
    doc.line(M, gy + gh, R, gy + gh, { color: NAVY, width: 0.8 });
    const cell = function (x, yy, label, value, wMax) {
      doc.text(x + 6, yy + 11.6, label, { size: 6.8, color: MUTED });
      const lw = pdfTextWidth(label, false, 6.8) + 4;
      doc.text(x + 6 + lw, yy + 11.8, pdfFit(String(value || ""), wMax - lw - 10, true, 9.4), { size: 9.4, bold: true, color: NAVY });
    };
    cell(M, gy, "Invoice No:", sale.InvoiceNo || "", W / 2);
    cell(M + W / 2, gy, "Date:", formatDate(sale.Date), W / 2);
    cell(M, gy + gh, "Customer:", c.name || "", W / 2);
    cell(M + W / 2, gy + gh, "Mobile:", c.phone || "—", W / 2);
    // table head
    y = gy + gh * 2 + 6;
    doc.rect(M, y, W, 17, { fill: NAVY });
    [[xSr, wSr, "Sr"], [xDesc, wDesc, "Description"], [xQty, wQty, "Qty"], [xRate, wRate, "Rate"], [xAmt, wAmt, "Amount"]].forEach(function (cl) {
      doc.text(cl[0] + cl[1] / 2, y + 11.5, cl[2], { size: 7.6, bold: true, color: "#FFFFFF", align: "center" });
    });
    y += 17;
  };

  // ---- item rows (shrink to fit, else continue on a new page) ----
  let k = 1;
  const rh = function () { return 15.5 * k; };
  const lineH = function () { return 9.6 * k; };
  const items = (data.items || []).map(function (it) {
    const desc = String(it.description || it.productId || "");
    const sn = (Array.isArray(it.serials) ? it.serials.join(", ") : String(it.serials || "")).replace(/\s*[\n,]+\s*/g, ", ").replace(/^[,\s]+|[,\s]+$/g, "");
    return { desc: desc, sn: sn, qty: billNumber(it.qty), rate: billNumber(it.unitPrice), amt: billNumber(it.lineTotal), disc: Number(it.discount) || 0 };
  });
  const linesOf = function (it) {
    const out = pdfWrap(it.desc, wDesc - 10, false, 8.3 * k).map(function (t) { return { text: t, size: 8.3 * k, color: NAVY }; });
    if (it.sn) pdfWrap("S/N: " + it.sn, wDesc - 10, false, 6.8 * k).forEach(function (t) { out.push({ text: t, size: 6.8 * k, color: MUTED }); });
    if (it.disc) out.push({ text: "Discount " + billNumber(it.disc), size: 6.8 * k, color: GREEN });
    return out;
  };
  const heightOf = function (it) { return Math.max(rh(), linesOf(it).length * lineH() + 6 * k); };
  const tableTop = 112 + 34 + 6 + 17;
  const fits = function () { return items.reduce(function (a, it) { return a + heightOf(it); }, 0) <= boxY - tableTop; };
  while (!fits() && k > 0.72) k = Math.round((k - 0.03) * 100) / 100;

  const vlines = function (top, h) {
    [xDesc, xQty, xRate, xAmt].forEach(function (x) { doc.line(x, top, x, top + h, { color: LINE, width: 0.6 }); });
    doc.line(M, top, M, top + h, { color: NAVY, width: 0.9 });
    doc.line(R, top, R, top + h, { color: NAVY, width: 0.9 });
  };
  let rest = items.reduce(function (a, it) { return a + heightOf(it); }, 0), n = 0;
  header();
  items.forEach(function (it) {
    const h = heightOf(it);
    const lastPage = y + rest <= boxY;
    const limit = lastPage ? boxY : A5_H - 40;
    if (y + h > limit) {
      doc.line(M, y, R, y, { color: NAVY, width: 0.9 });
      doc.text(R, y + 10, "Continued on next page", { size: 6.8, color: MUTED, align: "right" });
      header();
    }
    n += 1;
    if (n % 2 === 0) doc.rect(M, y, W, h, { fill: ZEBRA });
    vlines(y, h);
    doc.line(M, y + h, R, y + h, { color: LINE, width: 0.6 });
    const top = y + Math.min(10.6, 10.6 * k + 0.8);
    doc.text(xSr + wSr / 2, top, String(n), { size: 8 * k, color: NAVY, align: "center" });
    linesOf(it).forEach(function (ln, i) { doc.text(xDesc + 5, top + i * lineH(), ln.text, { size: ln.size, color: ln.color }); });
    doc.text(xQty + wQty / 2, top, it.qty, { size: 8.3 * k, color: NAVY, align: "center" });
    doc.text(xRate + wRate - 5, top, it.rate, { size: 8.3 * k, color: NAVY, align: "right" });
    doc.text(xAmt + wAmt - 5, top, it.amt, { size: 8.6 * k, bold: true, color: NAVY, align: "right" });
    y += h;
    rest -= h;
  });
  if (y > boxY) {                              // rows reached the totals: totals go to a new page
    doc.line(M, y, R, y, { color: NAVY, width: 0.9 });
    doc.text(R, y + 10, "Continued on next page", { size: 6.8, color: MUTED, align: "right" });
    header();
  }
  // empty rows down to the totals box, as on a printed bill book
  while (y + rh() <= boxY) { vlines(y, rh()); doc.line(M, y + rh(), R, y + rh(), { color: LINE, width: 0.6 }); y += rh(); }
  if (y < boxY) vlines(y, boxY - y);
  doc.line(M, boxY, R, boxY, { color: NAVY, width: 0.9 });

  // ---- services (left) and totals (right) ----
  const split = M + W * 0.55;
  doc.rect(M, boxY, W, boxH, { stroke: NAVY, lineWidth: 0.9 });
  doc.line(split, boxY, split, boxY + boxH, { color: NAVY, width: 0.9 });
  let ly = boxY + 6;
  if (services.length) {
    const lw = pdfTextWidth("SERVICES", true, 6.8) + 10;
    doc.round(M + 6, ly, lw, 11, 3, { fill: GOLD });
    doc.text(M + 6 + lw / 2, ly + 8, "SERVICES", { size: 6.8, bold: true, color: NAVY, align: "center" });
    ly += 16;
    services.forEach(function (x) {
      const label = x.kind === "structure" && x.qty ? "Structure (" + billNumber(x.qty) + (x.unit === "W" ? " W" : " panels") + ")" : String(x.name || "");
      doc.text(M + 7, ly + 8, pdfFit(label, split - M - 70, false, 8), { size: 8, color: NAVY });
      doc.text(split - 6, ly + 8, billNumber(x.amount), { size: 8, color: NAVY, align: "right" });
      ly += LT;
    });
  }
  ly += 4;
  doc.line(M + 6, ly, split - 6, ly, { color: LINE, width: 0.5 });
  ly += 3;
  leftWords.forEach(function (w) { doc.text(M + 7, ly + 7.5, w, { size: 7.4, bold: true, color: GREEN }); ly += 9.5; });
  notes.forEach(function (w) { doc.text(M + 7, ly + 7.5, w, { size: 7.2, color: MUTED }); ly += 9; });

  let ry = boxY + 6;
  const rline = function (label, value, color, bold) {
    doc.text(split + 7, ry + 8, label, { size: 8, color: color || NAVY });
    doc.text(R - 6, ry + 8, value, { size: 8, bold: !!bold, color: color || NAVY, align: "right" });
    ry += LT;
  };
  totLines.forEach(function (l) { rline(l[0], l[1], l[2]); });
  ry += 2;
  doc.rect(split + 0.5, ry, R - split - 1, 20, { fill: NAVY });
  doc.text(split + 7, ry + 13.6, "TOTAL", { size: 9.5, bold: true, color: "#FFFFFF" });
  doc.text(R - 6, ry + 14, "Rs " + billNumber(tt.net), { size: 12, bold: true, color: GOLD, align: "right" });
  ry += 22;
  after.forEach(function (l) { rline(l[0], l[1], l[2], l[3]); });

  // ---- signatures and footer ----
  doc.line(M, signY, M + W * 0.38, signY, { color: NAVY, width: 0.7 });
  doc.line(R - W * 0.38, signY, R, signY, { color: NAVY, width: 0.7 });
  doc.text(M + W * 0.19, signY + 10, "Customer signature", { size: 7.2, color: NAVY, align: "center" });
  doc.text(R - W * 0.19, signY + 10, "Authorized signature", { size: 7.2, color: NAVY, align: "center" });
  const ur = billUrduImage(NAVY);
  if (ur) doc.image(A5_W / 2 - ur.wPt / 2, footTop + 2, ur.wPt, ur.hPt, ur);
  doc.line(M, footTop + 22, R, footTop + 22, { color: GREEN, width: 1.6 });
  const label = "AUTHORIZED DEALER:";
  const widths = BILL_DEALERS.map(function (d) { return pdfTextWidth(d, true, 7.6); });
  const full = pdfTextWidth(label, true, 7.6) + 8 + widths.reduce(function (a, w) { return a + w + 8; }, 0) - 8;
  let bx = A5_W / 2 - full / 2;
  doc.text(bx, footTop + 34, label, { size: 7.6, bold: true, color: GREEN });
  bx += pdfTextWidth(label, true, 7.6) + 8;
  BILL_DEALERS.forEach(function (d, i) { doc.text(bx, footTop + 34, d, { size: 7.6, bold: true, color: i % 2 ? NAVY : MUTED }); bx += widths[i] + 8; });
  const pages = doc.pageCount();
  if (pages > 1) for (let i = 0; i < pages; i++) { doc.onPage(i); doc.text(R, A5_H - 8, "Page " + (i + 1) + " of " + pages, { size: 6.5, color: MUTED, align: "right" }); }
  return { bytes: doc.output(), filename: "Bill-" + String(sale.InvoiceNo || "invoice").replace(/[^A-Za-z0-9-]/g, "") + ".pdf" };
}


/* ============================================================
   UPDATE LEDGER from Excel (owner / manager), from the account card.
   Download ledger → correct it in Excel → Update ledger. Only the ledger and the balance change.
   Reads the ERP's own download and the old per-party sheets (Date, Item, Qty, Debit, Credit, Balance).
   ============================================================ */
function lgNum(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[,\s]|Rs\.?/gi, ""));
  return isFinite(n) ? n : 0;
}
function lgDate(v) {
  if (v instanceof Date && !isNaN(v)) return new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
  const s = String(v || "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);            // day/month/year (Pakistan)
  if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return y + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); }
  m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[A-Za-z]*[\s-](\d{2,4})$/);   // 27-May-2024
  if (m) {
    const mi = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(m[2].toLowerCase());
    if (mi !== -1) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return y + "-" + String(mi + 1).padStart(2, "0") + "-" + m[1].padStart(2, "0"); }
  }
  return "";
}

// aoa: the sheet as rows of cells. -> { ok, rows: [{date, particular, ref, debit, credit, bal}], lastBalance }
function lgParse(aoa) {
  let hr = -1, cols = null;
  for (let r = 0; r < Math.min(20, aoa.length) && hr === -1; r++) {
    const h = (aoa[r] || []).map(function (x) { return String(x == null ? "" : x).trim().toLowerCase(); });
    const find = function (re) { for (let i = 0; i < h.length; i++) if (re.test(h[i])) return i; return -1; };
    const c = { date: find(/^date/), part: find(/particul|^item|description|detail|narration|remarks?$/), qty: find(/^qty|^quantity/),
      ref: find(/^ref|^bill|^invoice|^voucher|^v\.?\s*no|^folio/), debit: find(/^debit|^dr\.?$/), credit: find(/^credit|^cr\.?$/), bal: find(/^balance|^bal\.?$/) };
    if (c.date !== -1 && (c.debit !== -1 || c.credit !== -1)) { hr = r; cols = c; }
  }
  if (hr === -1) return { ok: false, rows: [], lastBalance: null };
  const out = [];
  let lastBal = null, lastDate = "";
  for (let r = hr + 1; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const get = function (k) { return cols[k] === -1 ? "" : row[cols[k]]; };
    const part = String(get("part") == null ? "" : get("part")).trim();
    const qty = get("qty");
    const d = lgNum(get("debit")), c = lgNum(get("credit"));
    const balCell = get("bal");
    const hasBal = balCell !== "" && balCell != null && isFinite(lgNum(balCell)) && String(balCell).charAt(0) !== "=";
    if (hasBal) lastBal = lgNum(balCell);
    if (/^(grand\s*)?total/i.test(part)) continue;
    const date = lgDate(get("date")) || lastDate;
    if (date) lastDate = date;
    if (!d && !c) {
      // a balance with no amount before any line = the opening balance
      if (!out.length && hasBal && lgNum(balCell)) out.push({ date: date, particular: "Opening balance", ref: "", debit: 0, credit: 0, open: lgNum(balCell) });
      continue;
    }
    out.push({ date: date, particular: part + (qty !== "" && qty != null && lgNum(qty) ? " (" + lgNum(qty) + ")" : ""), ref: String(get("ref") == null ? "" : get("ref")).trim(), debit: d, credit: c });
  }
  const first = out.find(function (x) { return x.date; });
  out.forEach(function (x) { if (!x.date) x.date = first ? first.date : todayInput(); });
  return { ok: true, rows: out, lastBalance: lastBal };
}

// the lines as the ERP will save them, for this account type and the chosen debit/credit sides
function lgRowsFor(parsed, type, swap) {
  return parsed.rows.map(function (r) {
    let d = r.debit, c = r.credit;
    if (r.open != null) {
      // opening: in the file the balance is (debit - credit), so a positive one is on the debit side of the file
      d = r.open > 0 ? r.open : 0; c = r.open > 0 ? 0 : -r.open;
      if (swap) { const x = d; d = c; c = x; }
      return { date: r.date, particular: "Opening balance", ref: "", debit: d, credit: c };
    }
    if (swap) { const x = d; d = c; c = x; }
    return { date: r.date, particular: r.particular, ref: r.ref, debit: d, credit: c };
  });
}
function lgFinal(rows, type) { return Math.round(rows.reduce(function (b, r) { return b + (type === "customer" ? r.debit - r.credit : r.credit - r.debit); }, 0) * 100) / 100; }

async function ledgerDownload(type, id, name) {
  try {
    const [X, rows] = await Promise.all([loadSheetJs(), call("ledger", { partyType: type, partyId: id })]);
    const aoa = [["Date", "Particular", "Ref", "Debit", "Credit", "Balance"]].concat((rows || []).map(function (r) {
      return [String(r.Date || "").slice(0, 10), r.Particular || "", r.Reference || r.Ref || "", Number(r.Debit) || "", Number(r.Credit) || "", Number(r.Balance) || 0];
    }));
    const ws = X.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 12 }, { wch: 50 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, "Ledger");
    X.writeFile(wb, "Ledger - " + name + ".xlsx");
  } catch (error) { showError(error.message || "Could not make the file."); }
}

const lgu = {};
function ledgerUploadStart(type, id, name) {
  const input = document.createElement("input");
  input.type = "file"; input.accept = ".xlsx,.xls,.csv";
  input.onchange = function () { if (input.files && input.files[0]) ledgerFile(type, id, name, input.files[0]); };
  input.click();
}

async function ledgerFile(type, id, name, file) {
  const wait = cardBox("card-wide", '<p class="empty">' + escapeHtml(t("Reading the file...")) + "</p>");
  try {
    const [X, acc0] = await Promise.all([loadSheetJs(), call("accounts", {}).catch(function () { return null; })]);
    const wb = X.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const norm = function (x) { return String(x || "").toLowerCase().replace(/[^a-z0-9]/g, ""); };
    const nn = norm(name);
    const best = wb.SheetNames.slice().sort(function (a, b) {
      const sa = norm(a) && (nn.indexOf(norm(a)) !== -1 || norm(a).indexOf(nn) !== -1) ? 1 : 0, sb = norm(b) && (nn.indexOf(norm(b)) !== -1 || norm(b).indexOf(nn) !== -1) ? 1 : 0;
      return sb - sa;
    })[0];
    const me = acc0 && acc0.rows ? acc0.rows.find(function (x) { return x.partyType === type && x.id === String(id); }) : null;
    Object.keys(lgu).forEach(function (k) { delete lgu[k]; });
    Object.assign(lgu, { type: type, id: id, name: name, file: file.name, wb: wb, X: X, sheet: best, swap: false, now: me ? me.balance : null, saving: false, done: null });
    lgLoadSheet();
    wait.remove();
    lgRender();
  } catch (error) { wait.remove(); showError(error.message || "Could not read the file."); }
}

function lgLoadSheet() {
  const ws = lgu.wb.Sheets[lgu.sheet];
  lgu.parsed = lgParse(lgu.X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }));
  // pick the debit/credit sides that give the file's own last balance
  lgu.swap = false;
  if (lgu.parsed.ok && lgu.parsed.lastBalance != null) {
    const a = lgFinal(lgRowsFor(lgu.parsed, lgu.type, false), lgu.type), b = lgFinal(lgRowsFor(lgu.parsed, lgu.type, true), lgu.type);
    if (Math.abs(a - lgu.parsed.lastBalance) > 1 && Math.abs(b - lgu.parsed.lastBalance) <= 1) lgu.swap = true;
  }
}

function lgBalWords(v) { return v > 0.5 ? (lgu.type === "customer" ? t("They have to pay us") : t("We have to pay them")) : (v < -0.5 ? (lgu.type === "customer" ? t("We have to pay them") : t("They have to pay us")) : t("Nothing to pay")); }

function lgHtml() {
  if (lgu.done) {
    const d = lgu.done;
    return '<div class="pc-head"><div><small>' + escapeHtml(t("Ledger updated")) + '</small><h3 dir="ltr">' + escapeHtml(d.name) + "</h3></div></div>" +
      '<p class="att-done">✓ ' + d.added + " " + escapeHtml(t("Lines")) + "</p>" +
      '<p class="pk-last">' + escapeHtml(t("Balance now")) + ': <b dir="ltr">' + qsMoney(Math.abs(d.balance)) + "</b> · " + escapeHtml(lgBalWords(d.balance)) + "</p>" +
      '<div class="form-actions"><button type="button" class="btn primary" onclick="this.closest(\'.cost-modal\').remove();openPartyLedger(\'' + lgu.type + "','" + escapeHtml(lgu.id) + '\')">' + escapeHtml(t("Ledger")) + "</button></div>";
  }
  const p = lgu.parsed;
  const sheetSel = lgu.wb.SheetNames.length > 1 ? '<label class="inv-place">' + escapeHtml(t("Sheet")) + '<select onchange="lgu.sheet=this.value;lgLoadSheet();lgRender()">' +
    lgu.wb.SheetNames.map(function (n) { return '<option' + (n === lgu.sheet ? " selected" : "") + ">" + escapeHtml(n) + "</option>"; }).join("") + "</select></label>" : "";
  const head = '<div class="pc-head"><div><small>' + escapeHtml(t("Update ledger")) + '</small><h3 dir="ltr">' + escapeHtml(lgu.name) + '</h3><small dir="ltr">' + escapeHtml(lgu.file) + "</small></div></div>" + sheetSel;
  if (!p.ok || !p.rows.length) return head + '<p class="inv-warn">' + escapeHtml(t("No Date / Debit / Credit columns found in this sheet.")) + "</p>";
  const rows = lgRowsFor(p, lgu.type, lgu.swap);
  const fin = lgFinal(rows, lgu.type);
  const td = rows.reduce(function (a, r) { return a + r.debit; }, 0), tc = rows.reduce(function (a, r) { return a + r.credit; }, 0);
  const match = p.lastBalance != null ? Math.abs(Math.abs(fin) - Math.abs(p.lastBalance)) <= 1 : null;
  const show = rows.length > 10 ? rows.slice(0, 5).concat([null]).concat(rows.slice(-5)) : rows;
  return head +
    '<div class="pk-stats"><div><small>' + escapeHtml(t("Lines")) + "</small><b>" + rows.length + "</b></div>" +
      "<div><small>" + escapeHtml(t("Total debit")) + '</small><b dir="ltr">' + qsMoney(td) + "</b></div>" +
      "<div><small>" + escapeHtml(t("Total credit")) + '</small><b dir="ltr">' + qsMoney(tc) + "</b></div></div>" +
    '<div class="lg-bal"><div><small>' + escapeHtml(t("Balance after upload")) + '</small><b dir="ltr">' + qsMoney(Math.abs(fin)) + "</b><span>" + escapeHtml(lgBalWords(fin)) + "</span></div>" +
      (p.lastBalance != null ? "<div><small>" + escapeHtml(t("Balance in the file")) + '</small><b dir="ltr">' + qsMoney(Math.abs(p.lastBalance)) + '</b><span class="' + (match ? "ok" : "bad") + '">' + (match ? "✓ " + escapeHtml(t("matches")) : "✗ " + escapeHtml(t("does not match"))) + "</span></div>" : "") +
      (lgu.now != null ? "<div><small>" + escapeHtml(t("Balance in the ERP now")) + '</small><b dir="ltr">' + qsMoney(Math.abs(lgu.now)) + "</b><span>" + escapeHtml(lgBalWords(lgu.now)) + "</span></div>" : "") + "</div>" +
    '<label class="qs-check"><input type="checkbox"' + (lgu.swap ? " checked" : "") + ' onchange="lgu.swap=this.checked;lgRender()"> ' + escapeHtml(t("Debit and Credit are the other way round in this file")) + "</label>" +
    '<div class="lg-wrap"><table class="lg-prev"><thead><tr><th>' + escapeHtml(t("Date")) + "</th><th>" + escapeHtml(t("Particular")) + '</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>' +
      show.map(function (r) { return r ? "<tr><td>" + escapeHtml(formatDate(r.date)) + "</td><td>" + escapeHtml(r.particular) + (r.ref ? " <small>" + escapeHtml(r.ref) + "</small>" : "") + '</td><td class="num">' + (r.debit ? billNumber(r.debit) : "") + '</td><td class="num">' + (r.credit ? billNumber(r.credit) : "") + "</td></tr>" : '<tr><td colspan="4" class="lg-gap">⋯</td></tr>'; }).join("") +
    "</tbody></table></div>" +
    '<p class="inv-warn">' + escapeHtml(t("This replaces the whole ledger of this account in the ERP. Stock, bills and payments do not change. The old lines are kept as a backup.")) + "</p>" +
    '<div class="form-actions"><button type="button" class="btn secondary" onclick="this.closest(\'.cost-modal\').remove()">' + escapeHtml(t("Cancel")) + "</button>" +
    '<button type="button" class="btn primary" id="lgSave" onclick="lgSave()"' + (lgu.saving ? " disabled" : "") + ">" + escapeHtml(lgu.saving ? t("Saving...") : t("Replace ledger")) + "</button></div>";
}

function lgRender() {
  const open = document.querySelector(".card-sheet.lg-sheet");
  if (open) { open.querySelector(".cost-card").innerHTML = '<button type="button" class="card-x" aria-label="' + escapeHtml(t("Close")) + '">×</button>' + lgHtml(); return; }
  const box = cardBox("card-wide lg-card", lgHtml());
  box.classList.add("lg-sheet");
}

async function lgSave() {
  const rows = lgRowsFor(lgu.parsed, lgu.type, lgu.swap);
  const fin = lgFinal(rows, lgu.type);
  if (!confirm(lgu.name + "\n" + rows.length + " " + t("Lines") + " · " + t("Balance after upload") + ": " + qsMoney(Math.abs(fin)) + " (" + lgBalWords(fin) + ")\n\n" + t("Replace ledger") + "?")) return;
  lgu.saving = true; lgRender();
  try {
    lgu.done = await call("replaceledger", { partyType: lgu.type, partyId: lgu.id, fileName: lgu.file, rows: rows });
    lgu.saving = false; acc.data = null; lgRender();
    showToast(t("Ledger updated") + ": " + lgu.done.name);
  } catch (error) { lgu.saving = false; lgRender(); showError(error.message || "Could not save."); }
}


/* ---------- Merge two accounts (from the account card) ---------- */
const mg = {};
async function mergeStart(type, id) {
  try { if (!acc.data) acc.data = await call("accounts", {}); } catch (error) { showError(error.message); return; }
  Object.keys(mg).forEach(function (k) { delete mg[k]; });
  const me = acc.data.rows.find(function (x) { return x.partyType === type && x.id === String(id); });
  Object.assign(mg, { a: me || { partyType: type, id: String(id), name: String(id), kind: type === "supplier" ? "Supplier" : "Customer", balance: 0 }, b: null, keep: "b", q: "", saving: false, done: null });
  // suggest accounts with a similar first word (e.g. DANISH - IN / DANISH ELECTRONICS - OUT)
  mg.q = String(mg.a.name).split(/[\s-]+/)[0] || "";
  mgRender();
}

function mgSigned(x) { return x.partyType === "supplier" ? -(Number(x.balance) || 0) : (Number(x.balance) || 0); }   // in "they owe us" terms

function mgHtml() {
  if (mg.done) {
    return '<div class="pc-head"><div><small>' + escapeHtml(t("Merged")) + '</small><h3 dir="ltr">' + escapeHtml(mg.done.name) + "</h3></div></div>" +
      '<p class="att-done">✓ ' + escapeHtml(t("Balance now")) + ": " + qsMoney(Math.abs(mg.done.balance)) + "</p>" +
      '<div class="form-actions"><button type="button" class="btn secondary" onclick="this.closest(\'.cost-modal\').remove();ledgerUploadStart(\'' + mg.done.type + "','" + escapeHtml(mg.done.id) + "','" + escapeHtml(String(mg.done.name).replace(/'/g, "")) + '\')">⇧ ' + escapeHtml(t("Update ledger")) + "</button>" +
      '<button type="button" class="btn primary" onclick="this.closest(\'.cost-modal\').remove();openPartyLedger(\'' + mg.done.type + "','" + escapeHtml(mg.done.id) + '\')">' + escapeHtml(t("Ledger")) + "</button></div>";
  }
  const a = mg.a, q = mg.q.trim().toLowerCase();
  const list = acc.data.rows.filter(function (x) { return !(x.partyType === a.partyType && x.id === a.id) && x.balance != null && (!q || (x.name + " " + x.phone).toLowerCase().indexOf(q) !== -1); }).slice(0, 30);
  let html = '<div class="pc-head"><div><small>' + escapeHtml(t("Merge accounts")) + '</small><h3 dir="ltr">' + escapeHtml(a.name) + '</h3><small>' + escapeHtml(t(a.kind)) + " · " + qsMoney(Math.abs(a.balance || 0)) + "</small></div></div>";
  if (!mg.b) {
    return html + "<label>" + escapeHtml(t("Choose the other account")) + '<input type="search" value="' + escapeHtml(mg.q) + '" oninput="mg.q=this.value;mgRender(true)" placeholder="' + escapeHtml(t("Search name or mobile")) + '"></label>' +
      '<div class="acc-list mg-list">' + list.map(function (x) {
        return '<button type="button" class="acc-row" onclick="mgPick(\'' + x.partyType + "','" + escapeHtml(x.id) + '\')"><span class="acc-name"><b dir="ltr">' + escapeHtml(x.name) + '</b><small dir="ltr">' + escapeHtml(x.phone || "") + '</small></span><span class="acc-kind k-' + x.kind.toLowerCase() + '">' + escapeHtml(t(x.kind)) + "</span>" + accBalanceHtml(x.partyType === "supplier" ? -x.balance : x.balance) + "</button>";
      }).join("") + "</div>";
  }
  const b = mg.b, keep = mg.keep === "a" ? a : b, gone = mg.keep === "a" ? b : a;
  const after = mgSigned(a) + mgSigned(b);
  const opt = function (k, x) { return '<label class="mg-opt' + (mg.keep === k ? " sel" : "") + '"><input type="radio" name="mgkeep"' + (mg.keep === k ? " checked" : "") + ' onchange="mg.keep=\'' + k + '\';mgRender()"><span><b dir="ltr">' + escapeHtml(x.name) + "</b><small>" + escapeHtml(t(x.kind)) + " · " + qsMoney(Math.abs(x.balance || 0)) + "</small></span></label>"; };
  return html + "<p><b>" + escapeHtml(t("Keep this name")) + ":</b></p>" + opt("a", a) + opt("b", b) +
    '<div class="lg-bal"><div><small>' + escapeHtml(t("Balance after merge")) + '</small><b dir="ltr">' + qsMoney(Math.abs(after)) + "</b><span>" + escapeHtml(after > 0.5 ? t("They have to pay us") : (after < -0.5 ? t("We have to pay them") : t("Nothing to pay"))) + "</span></div></div>" +
    '<p class="inv-warn">' + escapeHtml(t("Bills, payments and ledger lines of the other account move to the one you keep. The other account is closed. Stock does not change.")) + "<br><b dir=\"ltr\">" + escapeHtml(gone.name) + " → " + escapeHtml(keep.name) + "</b></p>" +
    '<div class="form-actions"><button type="button" class="btn secondary" onclick="mg.b=null;mgRender()">' + escapeHtml(t("Back")) + "</button>" +
    '<button type="button" class="btn primary" onclick="mgSave()"' + (mg.saving ? " disabled" : "") + ">" + escapeHtml(mg.saving ? t("Saving...") : t("Merge")) + "</button></div>";
}

function mgPick(type, id) {
  mg.b = acc.data.rows.find(function (x) { return x.partyType === type && x.id === String(id); });
  // keep a "Both" account, else the one with more history (the bigger balance)
  mg.keep = mg.b.kind === "Both" && mg.a.kind !== "Both" ? "b" : (mg.a.kind === "Both" ? "a" : (Math.abs(mg.b.balance || 0) >= Math.abs(mg.a.balance || 0) ? "b" : "a"));
  mgRender();
}

function mgRender(keepFocus) {
  const open = document.querySelector(".card-sheet.mg-sheet");
  if (open) {
    if (keepFocus) { const l = open.querySelector(".mg-list"); const tmp = document.createElement("div"); tmp.innerHTML = mgHtml(); const nl = tmp.querySelector(".mg-list"); if (l && nl) { l.innerHTML = nl.innerHTML; return; } }
    open.querySelector(".cost-card").innerHTML = '<button type="button" class="card-x" aria-label="' + escapeHtml(t("Close")) + '">×</button>' + mgHtml(); return;
  }
  const box = cardBox("card-wide mg-card", mgHtml());
  box.classList.add("mg-sheet");
}

async function mgSave() {
  const keep = mg.keep === "a" ? mg.a : mg.b, gone = mg.keep === "a" ? mg.b : mg.a;
  if (!confirm(gone.name + "  →  " + keep.name + "\n\n" + t("Merge") + "?")) return;
  mg.saving = true; mgRender();
  try {
    mg.done = await call("mergeaccounts", { fromType: gone.partyType, fromId: gone.id, toType: keep.partyType, toId: keep.id });
    mg.saving = false; acc.data = null; mgRender();
    if (state.page === "accounts") loadAccounts();
  } catch (error) { mg.saving = false; mgRender(); showError(error.message || "Could not merge."); }
}


/* ============================================================
   LEDGER: add a line on any date, change or remove a line, edit the account name.
   Only the ledger changes (no stock, no cash). Owner and managers only.
   ============================================================ */
function canEditLedger(type) { return isAdminUser() || hasRight(type === "supplier" ? "suppliers" : "customers"); }
function ledgerEditCols(cols, type) { return canEditLedger(type) ? cols.concat(["Edit"]) : cols; }
function ledgerEditRows(rows) { return rows.map(function (r) { const x = Object.assign({}, r); x.Edit = r.EntryID || ""; return x; }); }
function ledgerDay(v) {
  if (!v) return todayInput();
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// entryId "" = a new line
function ledgerLineAsk(entryId) {
  const type = window._ledgerPartyType === "supplier" ? "supplier" : "customer";
  const pid = window._ledgerSelectedPartyId || "";
  const row = entryId ? (state.ledger || []).find(function (r) { return String(r.EntryID) === String(entryId); }) : null;
  if (entryId && !row) { showError(t("Ledger line not found.")); return; }
  const pty = window._pmParty && window._pmParty.id === pid ? window._pmParty : { name: "" };
  const st = row ? { date: ledgerDay(row.Date), particular: row.Particular || "", ref: row.Ref || row.Reference || "", side: Number(row.Credit) > 0 && !(Number(row.Debit) > 0) ? "credit" : "debit", amount: String(Number(row.Credit) > 0 && !(Number(row.Debit) > 0) ? Number(row.Credit) : Number(row.Debit) || 0) }
    : { date: todayInput(), particular: "", ref: "", side: "debit", amount: "" };
  const linked = row && String(row.Type || "") && String(row.Type) !== "Manual entry";
  const sides = type === "customer"
    ? { debit: ["Debit", "They owe us more (bill, old balance)"], credit: ["Credit", "They owe us less (payment, return)"] }
    : { debit: ["Debit", "We owe them less (payment, return)"], credit: ["Credit", "We owe them more (bill, old balance)"] };
  const box = cardBox("lg-entry", "");
  const card = box.querySelector(".cost-card");
  const draw = function () {
    card.innerHTML = '<button type="button" class="card-x" aria-label="' + escapeHtml(t("Close")) + '">×</button>' +
      "<h3>" + escapeHtml(t(row ? "Change ledger line" : "New ledger entry")) + (pty.name ? ": " + escapeHtml(pty.name) : "") + "</h3>" +
      '<p class="qs-hint">' + escapeHtml(t("Only the ledger changes. Stock and cash stay the same.")) + "</p>" +
      (linked ? '<p class="pp-old">' + escapeHtml(t("This line came from a bill or payment. Changing it here changes the ledger only, not the bill or payment.")) + "</p>" : "") +
      "<label>" + escapeHtml(t("Date")) + '<input id="leDate" type="date" max="' + todayInput() + '" value="' + escapeHtml(st.date) + '"></label>' +
      "<label>" + escapeHtml(t("Particular")) + '<input id="lePart" type="text" value="' + escapeHtml(st.particular) + '" placeholder="' + escapeHtml(t("e.g. Old balance, Bill 125, Cash received")) + '"></label>' +
      "<label>" + escapeHtml(t("Ref / Bill no.")) + '<input id="leRef" type="text" dir="ltr" value="' + escapeHtml(st.ref) + '"></label>' +
      '<div class="qs-seg le-side">' + ["debit", "credit"].map(function (k) {
        return '<button type="button" data-s="' + k + '" class="' + (st.side === k ? "sel" : "") + '"><b>' + escapeHtml(t(sides[k][0])) + "</b><small>" + escapeHtml(t(sides[k][1])) + "</small></button>";
      }).join("") + "</div>" +
      '<label class="qs-amt"><small>' + escapeHtml(t("Amount")) + '</small><span dir="ltr">Rs. <input id="leAmt" type="text" inputmode="decimal" value="' + escapeHtml(st.amount) + '"></span></label>' +
      '<div class="form-actions">' + (row ? '<button type="button" class="btn danger" id="leDel">' + escapeHtml(t("Remove line")) + "</button>" : "") +
      '<button type="button" class="btn secondary" id="leCancel">' + escapeHtml(t("Cancel")) + '</button><button type="button" class="btn primary" id="leSave">' + escapeHtml(t("Save")) + "</button></div>";
    const keep = function () { st.date = card.querySelector("#leDate").value; st.particular = card.querySelector("#lePart").value; st.ref = card.querySelector("#leRef").value; st.amount = card.querySelector("#leAmt").value; };
    card.querySelectorAll(".le-side button").forEach(function (b) { b.onclick = function () { keep(); st.side = b.dataset.s; draw(); }; });
    card.querySelector("#leCancel").onclick = function () { box.remove(); };
    const send = async function (btn, mode) {
      keep();
      const amount = qsNum(st.amount);
      if (mode !== "delete") {
        if (!(amount > 0)) { showError(t("Enter the amount.")); return; }
        if (!st.date) { showError(t("Choose the date.")); return; }
        if (st.date > todayInput()) { showError(t("The date cannot be in the future.")); return; }
      } else if (!confirm(t("Remove this line from the ledger?"))) return;
      btn.disabled = true;
      try {
        const r = await call("ledgerentry", { mode: mode, partyType: type, partyId: pid, entryId: entryId || "", date: st.date, particular: st.particular, ref: st.ref,
          debit: st.side === "debit" ? amount : 0, credit: st.side === "credit" ? amount : 0 });
        box.remove();
        showToast(t(mode === "add" ? "Ledger entry saved" : mode === "delete" ? "Line removed" : "Line changed") + " · " + t("Balance") + ": " + qsMoney(Math.abs(Number(r && r.balance) || 0)));
        await openPartyLedger(type, pid);
      } catch (error) { btn.disabled = false; showError(error.message || "Could not save."); }
    };
    card.querySelector("#leSave").onclick = function () { send(this, row ? "edit" : "add"); };
    const del = card.querySelector("#leDel"); if (del) del.onclick = function () { send(this, "delete"); };
  };
  draw();
}

function partyEditAsk(type, id) {
  const list = type === "supplier" ? state.suppliers : state.customers;
  const key = type === "supplier" ? "SupplierID" : "CustomerID";
  const p = (list || []).find(function (x) { return String(x[key]) === String(id); }) || (window._pmParty && window._pmParty.id === String(id) ? { Name: window._pmParty.name, Phone: window._pmParty.phone } : {});
  const box = cardBox("lg-entry",
    "<h3>" + escapeHtml(t("Edit name / mobile")) + "</h3>" +
    "<label>" + escapeHtml(t("Name")) + '<input id="peName" type="text" value="' + escapeHtml(p.Name || "") + '"></label>' +
    "<label>" + escapeHtml(t("Mobile")) + '<input id="pePhone" type="tel" dir="ltr" value="' + escapeHtml(String(p.Phone || p.Mobile || "")) + '"></label>' +
    '<p class="qs-hint">' + escapeHtml(t("Old bills and the ledger stay on this account; they show the new name.")) + "</p>" +
    '<div class="form-actions"><button type="button" class="btn secondary" id="peCancel">' + escapeHtml(t("Cancel")) + '</button><button type="button" class="btn primary" id="peSave">' + escapeHtml(t("Save")) + "</button></div>");
  box.querySelector("#peCancel").onclick = function () { box.remove(); };
  box.querySelector("#peSave").onclick = async function () {
    const name = box.querySelector("#peName").value.trim();
    if (!name) { showError(t("Write the name.")); return; }
    this.disabled = true;
    try {
      await call("updateparty", { partyType: type, partyId: String(id), name: name, phone: box.querySelector("#pePhone").value.trim() });
      box.remove();
      showToast(t("Saved") + ": " + name);
      document.querySelectorAll(".cost-modal").forEach(function (x) { x.remove(); });
      try { acc.data = null; } catch (e) { /* accounts not opened yet */ }
      if (state.page === "partyledger" || state.page === "ledger") await openPartyLedger(type, String(id));
      else if (state.page === "accounts") await loadAccounts();
    } catch (error) { this.disabled = false; showError(error.message || "Could not save."); }
  };
}

// From the account card: open the ledger, then the "new line" box (any date).
async function ledgerEntryFromCard(type, id) {
  await openPartyLedger(type, String(id));
  if (window._ledgerSelectedPartyId === String(id)) ledgerLineAsk("");
}

/* ---------- Speed check (Help page): where the waiting goes ---------- */
const SPEED_LOG = [];
async function speedCheck() {
  const box = cardBox("card-wide", "<h3>" + escapeHtml(t("Speed check")) + '</h3><p class="qs-hint">' + escapeHtml(t("Checking...")) + "</p>");
  const card = box.querySelector(".cost-card");
  const rows = [];
  const tests = [["version", {}], ["me", {}], ["apiDashboard", {}], ["accounts", {}], ["mybills", { days: 60 }]];
  for (const tst of tests) {
    if (tst[0] === "apiDashboard" && !canOpen("dashboard")) continue;
    if (tst[0] === "accounts" && !canOpen("accounts")) continue;
    if (tst[0] === "mybills" && !canOpen("bills")) continue;
    const t0 = Date.now();
    try { await callNet(tst[0], tst[1]); } catch (e) { /* timing only */ }
    const last = SPEED_LOG[0] || {};
    rows.push([tst[0], Date.now() - t0, last.server]);
  }
  const sec = function (ms) { return ms == null ? "-" : (ms / 1000).toFixed(1) + " s"; };
  card.innerHTML = '<button type="button" class="card-x">×</button><h3>' + escapeHtml(t("Speed check")) + "</h3>" +
    '<p class="qs-hint">' + escapeHtml(t("Total = internet + Google. Server = the ERP's own work. Send a screenshot of this to the developer.")) + "</p>" +
    '<table class="table"><thead><tr><th>' + escapeHtml(t("Action")) + '</th><th class="num">' + escapeHtml(t("Total")) + '</th><th class="num">' + escapeHtml(t("Server")) + "</th></tr></thead><tbody>" +
    rows.map(function (r) { return "<tr><td>" + escapeHtml(r[0]) + '</td><td class="num">' + sec(r[1]) + '</td><td class="num">' + sec(r[2]) + "</td></tr>"; }).join("") +
    "</tbody></table><h4>" + escapeHtml(t("Last pages")) + '</h4><table class="table"><tbody>' +
    SPEED_LOG.slice(rows.length, rows.length + 15).map(function (r) { return "<tr><td>" + escapeHtml(r.action) + '</td><td class="num">' + sec(r.total) + '</td><td class="num">' + sec(r.server) + "</td></tr>"; }).join("") +
    "</tbody></table><small>" + escapeHtml(APP_VERSION_LABEL()) + "</small>";
}
function APP_VERSION_LABEL() { try { return "App " + (typeof APP_VERSION !== "undefined" ? APP_VERSION : ""); } catch (e) { return ""; } }
