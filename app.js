/* ============================================================
   ARHAM ELECTRONICS ERP
   COMPLETE FRONTEND APP.JS
   GitHub Pages + Google Apps Script Backend
   ============================================================ */

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

    const initialPage =
      normalizePage(
        String(window.location.hash || "")
          .replace(/^#/, "")
      ) || "dashboard";

    showPage(initialPage);

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
    .querySelectorAll(".nav[data-page]")
    .forEach(
      function (button) {
        button.addEventListener(
          "click",
          function () {
            const page = button.dataset.page;
            showPage(page);
          }
        );
      }
    );
}

function bindRefresh() {
  const button = $("refreshBtn");
  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    function () {
      loadPage(state.page, true);
    }
  );
}

function showPage(page) {
  page = normalizePage(page);
  state.page = page;

  try {
    window.location.hash = "#" + page;
  } catch (e) {}

  loadPage(page, false);
}

function normalizePage(page) {
  const map = {
    dashboard: "dashboard",
    products: "products",
    stock: "stock",
    customers: "customers",
    suppliers: "suppliers",
    ledger: "ledger",
    sales: "sales",
    purchases: "purchases",
    payments: "payments",
    expenses: "expenses",
    salespersons: "salespersons",
    incentives: "incentives"
  };

  return map[String(page || "").toLowerCase()] || "dashboard";
}

function loadPage(page, forceRefresh) {
  page = normalizePage(page);

  const nav = document.querySelector(".nav.active");
  if (nav) {
    nav.classList.remove("active");
  }

  const btn = document.querySelector('.nav[data-page="' + page + '"]');
  if (btn) {
    btn.classList.add("active");
  }

  const titleMap = {
    dashboard: "Dashboard",
    products: "Products",
    stock: "Stock",
    customers: "Customers",
    suppliers: "Suppliers",
    ledger: "Ledger",
    sales: "Sales",
    purchases: "Purchases",
    payments: "Payments",
    expenses: "Expenses",
    salespersons: "Sales Persons",
    incentives: "Sales Incentive"
  };

  const title = titleMap[page] || "Dashboard";
  $("pageTitle").textContent = title;
  $("crumb").textContent = title;

  if (page === "dashboard") {
    loadDashboard();
  } else if (page === "products") {
    loadProducts();
  } else if (page === "stock") {
    loadStock();
  } else if (page === "customers") {
    loadCustomers();
  } else if (page === "suppliers") {
    loadSuppliers();
  } else if (page === "ledger") {
    loadLedger();
  } else if (page === "sales") {
    loadSales();
  } else if (page === "purchases") {
    loadPurchases();
  } else if (page === "payments") {
    loadPayments();
  } else if (page === "expenses") {
    loadExpenses();
  } else if (page === "salespersons") {
    loadSalesPersons();
  } else if (page === "incentives") {
    loadIncentives();
  } else {
    loadDashboard();
  }
}

/* ============================================================
   API CALL
   ============================================================ */

async function call(action, payload) {
  try {
    const url = new URL(API_URL);
    url.searchParams.set("action", action);

    if (payload && Object.keys(payload).length > 0) {
      url.searchParams.set("payload", JSON.stringify(payload));
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || "API error");
    }

    return data.data;
  } catch (error) {
    console.error("API Error:", action, error);
    throw error;
  }
}

/* ============================================================
   DASHBOARD
   ============================================================ */

async function loadDashboard() {
  try {
    renderLoading();
    const data = await call("apiDashboard");
    state.dashboard = data;
    renderDashboard(data);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading dashboard: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderDashboard(data) {
  if (!data) {
    data = {};
  }

  const stats = [
    {
      label: "Total Products",
      value: data.totalProducts || 0,
      class: "stat-blue"
    },
    {
      label: "Stock Value",
      value: "Rs. " + money(data.stockValue || 0),
      class: "stat-green"
    },
    {
      label: "Today's Sales",
      value: "Rs. " + money(data.todaysSales || 0),
      class: "stat-green"
    },
    {
      label: "Monthly Sales",
      value: "Rs. " + money(data.monthlySales || 0),
      class: "stat-blue"
    },
    {
      label: "Monthly Purchases",
      value: "Rs. " + money(data.monthlyPurchases || 0),
      class: "stat-amber"
    },
    {
      label: "Customer Receivables",
      value: "Rs. " + money(data.customerReceivables || 0),
      class: "stat-red"
    },
    {
      label: "Supplier Payables",
      value: "Rs. " + money(data.supplierPayables || 0),
      class: "stat-amber"
    },
    {
      label: "Unpaid Incentives",
      value: "Rs. " + money(data.unpaidIncentives || 0),
      class: "stat-red"
    }
  ];

  let html = '<div class="content">';
  html += '<div class="stat-grid">';

  stats.forEach(function (stat) {
    html +=
      '<div class="stat-card ' +
      stat.class +
      '">' +
      '<div class="stat-label">' +
      escapeHtml(stat.label) +
      "</div>" +
      '<div class="stat-value">' +
      escapeHtml(stat.value) +
      "</div>" +
      "</div>";
  });

  html += "</div>";

  if (data.lowStockItems && data.lowStockItems.length > 0) {
    html += '<div class="panel">';
    html += "<h2>⚠ Low Stock Items</h2>";
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html += "<th>Product</th><th class='num'>Current</th><th class='num'>Minimum</th>";
    html += "</tr></thead><tbody>";

    data.lowStockItems.forEach(function (item) {
      html += "<tr>";
      html += "<td>" + escapeHtml(item.description || item.productId || "") + "</td>";
      html += '<td class="num">' + formatNumber(item.currentStock || 0) + "</td>";
      html += '<td class="num">' + formatNumber(item.minStock || 0) + "</td>";
      html += "</tr>";
    });

    html += "</tbody></table></div>";
    html += "</div>";
  }

  if (data.recentSales && data.recentSales.length > 0) {
    html += '<div class="panel">';
    html += "<h2>Recent Sales</h2>";
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html += "<th>Invoice</th><th>Customer</th><th class='num'>Amount</th><th>Status</th>";
    html += "</tr></thead><tbody>";

    data.recentSales.forEach(function (sale) {
      html += "<tr>";
      html +=
        "<td>" +
        escapeHtml(sale.invoiceNo || sale.saleId || "") +
        "</td>";
      html +=
        "<td>" +
        escapeHtml(sale.customerName || sale.customerId || "") +
        "</td>";
      html +=
        '<td class="num">' +
        money(sale.netTotal || 0) +
        "</td>";
      const status = sale.status || "Pending";
      html += "<td><span class='badge'>" + escapeHtml(status) + "</span></td>";
      html += "</tr>";
    });

    html += "</tbody></table></div>";
    html += "</div>";
  }

  html += "</div>";
  contentElement().innerHTML = html;
}

/* ============================================================
   PRODUCTS
   ============================================================ */

async function loadProducts() {
  try {
    renderLoading();
    const data = await call("apiProducts");
    state.products = Array.isArray(data) ? data : [];
    renderProducts(state.products);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading products: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderProducts(rows) {
  let html = '<div class="content">';
  html +=
    '<div class="toolbar"><div><h2>Products</h2><p>Manage product catalog</p></div>';
  html +=
    '<button class="btn primary" onclick="openProductForm()">+ Add Product</button></div>';

  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h3>Products</h3><span class="badge">' +
    rows.length +
    ' record(s)</span></div>';

  if (rows.length === 0) {
    html += '<div class="empty">No products found.</div>';
  } else {
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html +=
      "<th>Code</th><th>Description</th><th>Brand</th><th class='num'>Stock</th><th class='num'>Cost</th><th class='num'>Sale</th><th>Action</th>";
    html += "</tr></thead><tbody>";

    rows.forEach(function (r) {
      html += "<tr>";
      html +=
        "<td>" +
        escapeHtml(r.Code || r.ProductID || "") +
        "</td>";
      html +=
        "<td>" +
        escapeHtml(r.Description || "") +
        "</td>";
      html += "<td>" + escapeHtml(r.Brand || "") + "</td>";
      html +=
        '<td class="num">' +
        formatNumber(r.CurrentStock || 0) +
        "</td>";
      html +=
        '<td class="num">' +
        money(r.PurchasePrice || 0) +
        "</td>";
      html +=
        '<td class="num">' +
        money(r.SalePrice || 0) +
        "</td>";
      html +=
        '<td><button class="btn secondary" onclick="editProduct(\'' +
        escapeHtml(r.ProductID) +
        '\')">Edit</button></td>';
      html += "</tr>";
    });

    html += "</tbody></table></div>";
  }

  html += "</div></div>";
  contentElement().innerHTML = html;
}

function editProduct(id) {
  showError("Edit product feature coming soon");
}

async function openProductForm() {
  contentElement().innerHTML = `
    <div class="content">
      <div class="panel">
        <div class="panel-header">
          <h2>New Product</h2>
          <button class="btn secondary" onclick="showPage('products')">Cancel</button>
        </div>
        <form id="productForm" class="erp-form">
          <div class="form-grid">
            <label>
              Description <span style="color:red">*</span>
              <input type="text" id="prodDesc" name="description" required placeholder="Product name / description">
            </label>
            <label>
              Code
              <input type="text" id="prodCode" name="code" placeholder="Product code">
            </label>
            <label>
              Brand
              <input type="text" id="prodBrand" name="brand" placeholder="Brand">
            </label>
            <label>
              Category
              <input type="text" id="prodCategory" name="category" placeholder="Category">
            </label>
            <label>
              Unit
              <input type="text" id="prodUnit" name="unit" value="pcs" placeholder="Unit (pcs, kg, etc.)">
            </label>
            <label>
              Location
              <input type="text" id="prodLocation" name="location" placeholder="Warehouse location">
            </label>
            <label>
              Purchase Price
              <input type="number" id="prodCost" name="purchasePrice" min="0" step="0.01" placeholder="Cost per unit">
            </label>
            <label>
              Sale Price
              <input type="number" id="prodSale" name="salePrice" min="0" step="0.01" placeholder="Selling price per unit">
            </label>
            <label>
              Opening Stock
              <input type="number" id="prodStock" name="currentStock" min="0" value="0" placeholder="Initial quantity">
            </label>
            <label>
              Minimum Stock
              <input type="number" id="prodMin" name="minStock" min="0" value="0" placeholder="Reorder level">
            </label>
          </div>
          <div class="form-actions">
            <button type="button" class="btn secondary" onclick="showPage('products')">Cancel</button>
            <button type="submit" class="btn primary">Create Product</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = $("productForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      saveProductForm();
    });
  }
}

async function saveProductForm() {
  try {
    const description = ($("prodDesc") ? $("prodDesc").value : "").trim();
    if (!description) {
      showError("Product description is required");
      return;
    }

    showToast("Creating product...");

    const payload = {
      description: description,
      code: ($("prodCode") ? $("prodCode").value : "").trim(),
      brand: ($("prodBrand") ? $("prodBrand").value : "").trim(),
      category: ($("prodCategory") ? $("prodCategory").value : "").trim(),
      unit: ($("prodUnit") ? $("prodUnit").value : "pcs").trim(),
      location: ($("prodLocation") ? $("prodLocation").value : "").trim(),
      purchasePrice: parseFloat(
        ($("prodCost") ? $("prodCost").value : "0") || "0"
      ),
      salePrice: parseFloat(
        ($("prodSale") ? $("prodSale").value : "0") || "0"
      ),
      currentStock: parseFloat(
        ($("prodStock") ? $("prodStock").value : "0") || "0"
      ),
      minStock: parseFloat(($("prodMin") ? $("prodMin").value : "0") || "0")
    };

    const result = await call("apiProduct", payload);

    showToast("✓ Product created: " + escapeHtml(result.productId || ""));

    setTimeout(function () {
      showPage("products");
    }, 1200);
  } catch (error) {
    console.error("Error creating product:", error);
    showError(
      "Could not create product. " +
        (error.message || "Please try again.")
    );
  }
}

/* ============================================================
   STOCK
   ============================================================ */

async function loadStock() {
  try {
    renderLoading();
    const data = await call("apiStock");
    state.stock = Array.isArray(data) ? data : [];
    renderStock(state.stock);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading stock: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderStock(rows) {
  let html = '<div class="content">';
  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h3>Stock Movements</h3><span class="badge">' +
    rows.length +
    ' record(s)</span></div>';

  if (rows.length === 0) {
    html += '<div class="empty">No stock movements found.</div>';
  } else {
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html +=
      "<th>Date</th><th>Product</th><th class='num'>Qty</th><th>Type</th><th>Reference</th>";
    html += "</tr></thead><tbody>";

    rows.forEach(function (r) {
      html += "<tr>";
      html += "<td>" + escapeHtml(formatDate(r.Date)) + "</td>";
      html +=
        "<td>" +
        escapeHtml(r.ProductDescription || r.ProductID || "") +
        "</td>";
      html +=
        '<td class="num">' +
        formatNumber(r.Qty || 0) +
        "</td>";
      html += "<td>" + escapeHtml(r.Type || "") + "</td>";
      html +=
        "<td>" +
        escapeHtml(r.Reference || "") +
        "</td>";
      html += "</tr>";
    });

    html += "</tbody></table></div>";
  }

  html += "</div></div>";
  contentElement().innerHTML = html;
}

/* ============================================================
   CUSTOMERS
   ============================================================ */

async function loadCustomers() {
  try {
    renderLoading();
    const data = await call("apiCustomers");
    state.customers = Array.isArray(data) ? data : [];
    renderCustomers(state.customers);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading customers: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderCustomers(rows) {
  let html = '<div class="content">';
  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h3>Customers</h3><span class="badge">' +
    rows.length +
    ' record(s)</span></div>';

  if (rows.length === 0) {
    html += '<div class="empty">No customers found.</div>';
  } else {
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html +=
      "<th>ID</th><th>Name</th><th>Phone</th><th class='num'>Balance</th>";
    html += "</tr></thead><tbody>";

    rows.forEach(function (r) {
      html += "<tr>";
      html +=
        "<td>" +
        escapeHtml(r.CustomerID || "") +
        "</td>";
      html += "<td>" + escapeHtml(r.Name || "") + "</td>";
      html +=
        "<td>" +
        escapeHtml(r.Phone || "") +
        "</td>";
      html +=
        '<td class="num">' +
        money(r.ClosingBalance || 0) +
        "</td>";
      html += "</tr>";
    });

    html += "</tbody></table></div>";
  }

  html += "</div></div>";
  contentElement().innerHTML = html;
}

/* ============================================================
   SUPPLIERS
   ============================================================ */

async function loadSuppliers() {
  try {
    renderLoading();
    const data = await call("apiSuppliers");
    state.suppliers = Array.isArray(data) ? data : [];
    renderSuppliers(state.suppliers);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading suppliers: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderSuppliers(rows) {
  let html = '<div class="content">';
  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h3>Suppliers</h3><span class="badge">' +
    rows.length +
    ' record(s)</span></div>';

  if (rows.length === 0) {
    html += '<div class="empty">No suppliers found.</div>';
  } else {
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html +=
      "<th>ID</th><th>Name</th><th>Phone</th><th class='num'>Balance</th>";
    html += "</tr></thead><tbody>";

    rows.forEach(function (r) {
      html += "<tr>";
      html +=
        "<td>" +
        escapeHtml(r.SupplierID || "") +
        "</td>";
      html += "<td>" + escapeHtml(r.Name || "") + "</td>";
      html +=
        "<td>" +
        escapeHtml(r.Phone || "") +
        "</td>";
      html +=
        '<td class="num">' +
        money(r.ClosingBalance || 0) +
        "</td>";
      html += "</tr>";
    });

    html += "</tbody></table></div>";
  }

  html += "</div></div>";
  contentElement().innerHTML = html;
}

/* ============================================================
   LEDGER
   ============================================================ */

async function loadLedger() {
  try {
    renderLoading();
    const data = await call("apiLedger");
    state.ledger = Array.isArray(data) ? data : [];
    renderLedger(state.ledger);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading ledger: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderLedger(rows) {
  let html = '<div class="content">';
  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h3>Ledger Entries</h3><span class="badge">' +
    rows.length +
    ' record(s)</span></div>';

  if (rows.length === 0) {
    html += '<div class="empty">No ledger entries found.</div>';
  } else {
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html +=
      "<th>Date</th><th>Description</th><th class='num'>Debit</th><th class='num'>Credit</th><th>Party</th>";
    html += "</tr></thead><tbody>";

    rows.forEach(function (r) {
      html += "<tr>";
      html += "<td>" + escapeHtml(formatDate(r.Date)) + "</td>";
      html +=
        "<td>" +
        escapeHtml(r.Description || "") +
        "</td>";
      html +=
        '<td class="num">' +
        money(r.Debit || 0) +
        "</td>";
      html +=
        '<td class="num">' +
        money(r.Credit || 0) +
        "</td>";
      html +=
        "<td>" +
        escapeHtml(r.PartyName || r.PartyID || "") +
        "</td>";
      html += "</tr>";
    });

    html += "</tbody></table></div>";
  }

  html += "</div></div>";
  contentElement().innerHTML = html;
}

/* ============================================================
   SALES
   ============================================================ */

async function loadSales() {
  try {
    renderLoading();
    const data = await call("apiSale");
    state.sales = Array.isArray(data) ? data : [];
    renderSales(state.sales);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading sales: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderSales(rows) {
  let html = '<div class="content">';
  html +=
    '<div class="toolbar"><div><h2>Sales</h2><p>Record customer sales</p></div>';
  html +=
    '<button class="btn primary" onclick="openSaleForm()">+ New Sale</button></div>';

  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h3>Sales</h3><span class="badge">' +
    rows.length +
    ' record(s)</span></div>';

  if (rows.length === 0) {
    html += '<div class="empty">No sales found.</div>';
  } else {
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html +=
      "<th>Invoice</th><th>Date</th><th>Customer</th><th class='num'>Amount</th><th>Sales Person</th><th>Status</th>";
    html += "</tr></thead><tbody>";

    rows.forEach(function (r) {
      html += "<tr>";
      html +=
        "<td>" +
        escapeHtml(r.InvoiceNo || r.SaleID || "") +
        "</td>";
      html += "<td>" + escapeHtml(formatDate(r.Date)) + "</td>";
      html +=
        "<td>" +
        escapeHtml(r.CustomerName || r.CustomerID || "") +
        "</td>";
      html +=
        '<td class="num">' +
        money(r.NetTotal || 0) +
        "</td>";
      html +=
        "<td>" +
        escapeHtml(r.SalesPerson || "-") +
        "</td>";
      html +=
        '<td><span class="badge">' +
        escapeHtml(r.Status || "Pending") +
        "</span></td>";
      html += "</tr>";
    });

    html += "</tbody></table></div>";
  }

  html += "</div></div>";
  contentElement().innerHTML = html;
}

async function openSaleForm() {
  try {
    if (state.products.length === 0) {
      const prods = await call("apiProducts");
      state.products = Array.isArray(prods) ? prods : [];
    }
    if (state.customers.length === 0) {
      const custs = await call("apiCustomers");
      state.customers = Array.isArray(custs) ? custs : [];
    }
    if (state.salesPersons.length === 0) {
      const sps = await call("apiSalesPersons");
      state.salesPersons = Array.isArray(sps) ? sps : [];
    }

    const productOptions = (state.products || [])
      .map(function (p) {
        return (
          '<option value="' +
          escapeHtml(p.ProductID) +
          '">' +
          escapeHtml(p.Code || p.Description || p.ProductID) +
          "</option>"
        );
      })
      .join("");

    const customerOptions = (state.customers || [])
      .map(function (c) {
        return (
          '<option value="' +
          escapeHtml(c.CustomerID) +
          '">' +
          escapeHtml(c.Name || c.CustomerID) +
          "</option>"
        );
      })
      .join("");

    const salesPersonOptions = (state.salesPersons || [])
      .filter(function (sp) {
        return sp.Active !== false && String(sp.Active).toLowerCase() !== "false";
      })
      .map(function (sp) {
        return (
          '<option value="' +
          escapeHtml(sp.SalesPersonID) +
          '">' +
          escapeHtml(sp.Name) +
          " — " +
          escapeHtml(sp.IncentivePercent) +
          "%</option>"
        );
      })
      .join("");

    const today = todayInput();

    let html = '<div class="content">';
    html += '<div class="panel">';
    html +=
      '<div class="panel-header"><h2>New Sale</h2><button class="btn secondary" onclick="showPage(\'sales\')">Cancel</button></div>';
    html += '<form id="saleForm" class="erp-form">';

    html += '<div class="form-grid">';

    html += '<label>Customer <span style="color:red">*</span>';
    html +=
      '<select name="customerId" required><option value="">Select customer</option>' +
      customerOptions +
      "</select></label>";

    html += '<label>Date <span style="color:red">*</span>';
    html +=
      '<input type="date" name="date" value="' +
      today +
      '" required></label>';

    html += '<label>Sales Person';
    html +=
      '<select name="salesPersonId"><option value="">None</option>' +
      salesPersonOptions +
      "</select></label>";

    html += '<label>Invoice No';
    html += '<input type="text" name="invoiceNo" placeholder="Auto-generated"></label>';

    html += "</div>";

    html += "<h3>Items</h3>";
    html += '<div id="saleItems" class="items-box">';
    html += saleItemRow(productOptions);
    html += "</div>";

    html +=
      '<button type="button" class="btn secondary" onclick="addSaleItemRow()">+ Add Item</button>';

    html += '<div class="form-grid">';
    html +=
      '<label>Discount <input type="number" name="discount" min="0" step="0.01" value="0"></label>';
    html +=
      '<label>Paid <input type="number" name="paid" min="0" step="0.01" value="0"></label>';
    html +=
      '<label>Payment Method <select name="paymentMethod"><option value="cash">Cash</option><option value="bank">Bank</option><option value="online">Online</option><option value="other">Other</option></select></label>';
    html += "</div>";

    html += '<label>Notes <textarea name="notes" placeholder="Order notes"></textarea></label>';

    html += '<div class="form-actions">';
    html +=
      '<button type="button" class="btn secondary" onclick="showPage(\'sales\')">Cancel</button>';
    html +=
      '<button type="submit" class="btn primary">Create Sale</button>';
    html += "</div>";

    html += "</form></div></div>";

    contentElement().innerHTML = html;

    const form = $("saleForm");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        saveSaleForm();
      });
    }
  } catch (error) {
    console.error("Error opening sale form:", error);
    showError("Could not load sale form. " + error.message);
  }
}

async function saveSaleForm() {
  try {
    const form = $("saleForm");
    if (!form) {
      showError("Form not found");
      return;
    }

    const customerId = form.querySelector('select[name="customerId"]').value;
    const date = form.querySelector('input[name="date"]').value;
    const salesPersonId =
      form.querySelector('select[name="salesPersonId"]').value || null;
    const invoiceNo = form.querySelector('input[name="invoiceNo"]').value;
    const discount =
      parseFloat(form.querySelector('input[name="discount"]').value) || 0;
    const paid = parseFloat(form.querySelector('input[name="paid"]').value) || 0;
    const paymentMethod =
      form.querySelector('select[name="paymentMethod"]').value || "cash";
    const notes = form.querySelector('textarea[name="notes"]').value || "";

    if (!customerId) {
      showError("Please select a customer");
      return;
    }

    const itemRows = form.querySelectorAll(".item-row");
    if (itemRows.length === 0) {
      showError("Please add at least one item");
      return;
    }

    const items = [];
    itemRows.forEach(function (row) {
      const productId = row.querySelector('select[name="productId"]').value;
      const qty =
        parseFloat(row.querySelector('input[name="qty"]').value) || 0;
      const unitPrice =
        parseFloat(row.querySelector('input[name="unitPrice"]').value) || 0;
      const itemDiscount =
        parseFloat(row.querySelector('input[name="discount"]').value) || 0;

      if (productId && qty > 0) {
        items.push({
          productId: productId,
          qty: qty,
          unitPrice: unitPrice,
          discount: itemDiscount
        });
      }
    });

    if (items.length === 0) {
      showError("Please add valid items");
      return;
    }

    showToast("Creating sale...");

    const payload = {
      customerId: customerId,
      date: date,
      salesPersonId: salesPersonId,
      invoiceNo: invoiceNo,
      items: items,
      discount: discount,
      paid: paid,
      paymentMethod: paymentMethod,
      notes: notes
    };

    const result = await call("apiSale", payload);

    showToast("✓ Sale created: " + escapeHtml(result.saleId || ""));

    setTimeout(function () {
      showPage("sales");
    }, 1200);
  } catch (error) {
    console.error("Error creating sale:", error);
    showError(
      "Could not create sale. " + (error.message || "Please try again.")
    );
  }
}

function saleItemRow(productOptions) {
  return `
    <div class="item-row">
      <div>
        <label>Product
          <select name="productId" required onchange="updateSaleItemCost(this)">
            <option value="">Select product</option>
            ${productOptions}
          </select>
        </label>
      </div>
      <div>
        <label>Qty
          <input type="number" name="qty" min="1" value="1" step="1" required>
        </label>
      </div>
      <div>
        <label>Price
          <input type="number" name="unitPrice" min="0" step="0.01" required>
        </label>
      </div>
      <div>
        <label>Discount
          <input type="number" name="discount" min="0" step="0.01" value="0">
        </label>
      </div>
      <button type="button" class="btn danger" onclick="removeSaleItemRow(this)">✕</button>
    </div>
  `;
}

function addSaleItemRow() {
  const box = $("saleItems");
  if (!box) return;

  const productOptions = (state.products || [])
    .map(function (p) {
      return (
        '<option value="' +
        escapeHtml(p.ProductID) +
        '">' +
        escapeHtml(p.Code || p.Description || p.ProductID) +
        "</option>"
      );
    })
    .join("");

  const row = document.createElement("div");
  row.innerHTML = saleItemRow(productOptions);
  box.appendChild(row.firstChild);
}

function removeSaleItemRow(button) {
  const row = button.closest(".item-row");
  if (row) row.remove();
}

function updateSaleItemCost(select) {
  const productId = select.value;
  const product = (state.products || []).find(function (p) {
    return p.ProductID === productId;
  });
  if (!product) return;

  const row = select.closest(".item-row");
  const priceInput = row.querySelector('input[name="unitPrice"]');
  if (priceInput) {
    priceInput.value = product.SalePrice || 0;
  }
}

/* ============================================================
   PURCHASES
   ============================================================ */

async function loadPurchases() {
  try {
    renderLoading();
    const data = await call("apiPurchase");
    state.purchases = Array.isArray(data) ? data : [];
    renderPurchases(state.purchases);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading purchases: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderPurchases(rows) {
  let html = '<div class="content">';
  html +=
    '<div class="toolbar"><div><h2>Purchases</h2><p>Record supplier purchases</p></div>';
  html +=
    '<button class="btn primary" onclick="alert(\'Purchase form coming soon\')">+ New Purchase</button></div>';

  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h3>Purchases</h3><span class="badge">' +
    rows.length +
    ' record(s)</span></div>';

  if (rows.length === 0) {
    html += '<div class="empty">No purchases found.</div>';
  } else {
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html +=
      "<th>Reference</th><th>Date</th><th>Supplier</th><th class='num'>Amount</th><th>Status</th>";
    html += "</tr></thead><tbody>";

    rows.forEach(function (r) {
      html += "<tr>";
      html +=
        "<td>" +
        escapeHtml(r.ReferenceNo || r.PurchaseID || "") +
        "</td>";
      html += "<td>" + escapeHtml(formatDate(r.Date)) + "</td>";
      html +=
        "<td>" +
        escapeHtml(r.SupplierName || r.SupplierID || "") +
        "</td>";
      html +=
        '<td class="num">' +
        money(r.NetTotal || 0) +
        "</td>";
      html +=
        '<td><span class="badge">' +
        escapeHtml(r.Status || "Pending") +
        "</span></td>";
      html += "</tr>";
    });

    html += "</tbody></table></div>";
  }

  html += "</div></div>";
  contentElement().innerHTML = html;
}

/* ============================================================
   PAYMENTS
   ============================================================ */

async function loadPayments() {
  try {
    renderLoading();
    const data = await call("apiPayment");
    state.payments = Array.isArray(data) ? data : [];
    renderPayments(state.payments);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading payments: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderPayments(rows) {
  let html = '<div class="content">';
  html +=
    '<div class="toolbar"><div><h2>Payments</h2><p>Record customer and supplier payments</p></div>';
  html +=
    '<button class="btn primary" onclick="alert(\'Payment form coming soon\')">+ New Payment</button></div>';

  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h3>Payments</h3><span class="badge">' +
    rows.length +
    ' record(s)</span></div>';

  if (rows.length === 0) {
    html += '<div class="empty">No payments found.</div>';
  } else {
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html +=
      "<th>Date</th><th>Party</th><th class='num'>Amount</th><th>Method</th><th>Reference</th>";
    html += "</tr></thead><tbody>";

    rows.forEach(function (r) {
      html += "<tr>";
      html += "<td>" + escapeHtml(formatDate(r.Date)) + "</td>";
      html +=
        "<td>" +
        escapeHtml(r.PartyName || r.PartyID || "") +
        "</td>";
      html +=
        '<td class="num">' +
        money(r.Amount || 0) +
        "</td>";
      html +=
        "<td>" +
        escapeHtml(r.Method || "") +
        "</td>";
      html +=
        "<td>" +
        escapeHtml(r.Reference || "") +
        "</td>";
      html += "</tr>";
    });

    html += "</tbody></table></div>";
  }

  html += "</div></div>";
  contentElement().innerHTML = html;
}

/* ============================================================
   EXPENSES
   ============================================================ */

async function loadExpenses() {
  try {
    renderLoading();
    const data = await call("apiExpense");
    state.expenses = Array.isArray(data) ? data : [];
    renderExpenses(state.expenses);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading expenses: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderExpenses(rows) {
  let html = '<div class="content">';
  html +=
    '<div class="toolbar"><div><h2>Expenses</h2><p>Record business expenses</p></div>';
  html +=
    '<button class="btn primary" onclick="alert(\'Expense form coming soon\')">+ New Expense</button></div>';

  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h3>Expenses</h3><span class="badge">' +
    rows.length +
    ' record(s)</span></div>';

  if (rows.length === 0) {
    html += '<div class="empty">No expenses found.</div>';
  } else {
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html +=
      "<th>Date</th><th>Category</th><th>Description</th><th class='num'>Amount</th>";
    html += "</tr></thead><tbody>";

    rows.forEach(function (r) {
      html += "<tr>";
      html += "<td>" + escapeHtml(formatDate(r.Date)) + "</td>";
      html +=
        "<td>" +
        escapeHtml(r.Category || "") +
        "</td>";
      html +=
        "<td>" +
        escapeHtml(r.Description || "") +
        "</td>";
      html +=
        '<td class="num">' +
        money(r.Amount || 0) +
        "</td>";
      html += "</tr>";
    });

    html += "</tbody></table></div>";
  }

  html += "</div></div>";
  contentElement().innerHTML = html;
}

/* ============================================================
   SALES PERSONS
   ============================================================ */

async function loadSalesPersons() {
  try {
    renderLoading();
    const data = await call("apiSalesPersons");
    state.salesPersons = Array.isArray(data) ? data : [];
    renderSalesPersons(state.salesPersons);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading sales persons: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderSalesPersons(rows) {
  let html = '<div class="content">';
  html +=
    '<div class="toolbar"><div><h2>Sales Persons</h2><p>Manage sales team and incentive rates</p></div>';
  html +=
    '<button class="btn primary" onclick="openSalesPersonForm()">+ Add Sales Person</button></div>';

  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h3>Sales Persons</h3><span class="badge">' +
    rows.length +
    ' record(s)</span></div>';

  if (rows.length === 0) {
    html += '<div class="empty">No sales persons found.</div>';
  } else {
    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html +=
      "<th>ID</th><th>Name</th><th class='num'>Incentive %</th><th>Status</th><th>Created</th><th>Action</th>";
    html += "</tr></thead><tbody>";

    rows.forEach(function (r) {
      const active =
        r.Active !== false &&
        String(r.Active).toLowerCase() !== "false";
      const badge = active
        ? '<span class="badge success">Active</span>'
        : '<span class="badge warning">Inactive</span>';

      html += "<tr>";
      html +=
        "<td>" +
        escapeHtml(r.SalesPersonID || "") +
        "</td>";
      html += "<td>" + escapeHtml(r.Name || "") + "</td>";
      html +=
        '<td class="num">' +
        escapeHtml(r.IncentivePercent || "0") +
        "%</td>";
      html += "<td>" + badge + "</td>";
      html +=
        "<td>" +
        escapeHtml(formatDate(r.CreatedAt)) +
        "</td>";
      html +=
        '<td><button class="btn secondary" onclick="openSalesPersonForm(\'' +
        escapeHtml(r.SalesPersonID) +
        '\')">Edit</button></td>';
      html += "</tr>";
    });

    html += "</tbody></table></div>";
  }

  html += "</div></div>";
  contentElement().innerHTML = html;
}

function openSalesPersonForm(id) {
  id = id || "";

  const existing = id
    ? (state.salesPersons || []).find(function (p) {
        return String(p.SalesPersonID) === id;
      })
    : null;

  const title = existing
    ? "Edit Sales Person"
    : "New Sales Person";
  const nameValue = existing
    ? escapeHtml(existing.Name || "")
    : "";
  const percentValue = existing
    ? escapeHtml(existing.IncentivePercent || "0")
    : "0";
  const activeChecked =
    !existing ||
    (existing.Active !== false &&
      String(existing.Active).toLowerCase() !== "false")
      ? " checked"
      : "";

  let html = '<div class="content">';
  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h2>' +
    escapeHtml(title) +
    '</h2><button class="btn secondary" onclick="showPage(\'salespersons\')">Cancel</button></div>';
  html += '<form id="salesPersonForm" class="erp-form">';

  html += '<div class="form-grid">';

  html += '<label>Name <span style="color:red">*</span>';
  html +=
    '<input type="text" id="spName" name="name" value="' +
    nameValue +
    '" required placeholder="Sales person name"></label>';

  html += '<label>Incentive Percent <span style="color:red">*</span>';
  html +=
    '<input type="number" id="spPercent" name="incentivePercent" value="' +
    percentValue +
    '" min="0" max="100" step="0.01" required></label>';

  html += "</div>";

  html +=
    '<label style="display:flex;flex-direction:row;gap:8px;align-items:center">';
  html +=
    '<input type="checkbox" id="spActive" name="active"' +
    activeChecked +
    ">";
  html += "<span>Active</span></label>";

  html += '<div class="form-actions">';
  html +=
    '<button type="button" class="btn secondary" onclick="showPage(\'salespersons\')">Cancel</button>';
  html +=
    '<button type="submit" class="btn primary">Save Sales Person</button>';
  html += "</div>";

  html += "</form></div></div>";

  contentElement().innerHTML = html;

  const form = $("salesPersonForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      saveSalesPersonForm(id);
    });
  }
}

async function saveSalesPersonForm(id) {
  try {
    const name = ($("spName") ? $("spName").value : "").trim();
    const percent =
      parseFloat(($("spPercent") ? $("spPercent").value : "0") || "0");
    const active = $("spActive") ? $("spActive").checked : true;

    if (!name) {
      showError("Sales person name is required");
      return;
    }

    if (percent < 0 || percent > 100) {
      showError("Incentive percent must be between 0 and 100");
      return;
    }

    showToast("Saving sales person...");

    const payload = {
      salesPersonId: id || undefined,
      name: name,
      incentivePercent: percent,
      active: active
    };

    await call("apiSaveSalesPerson", payload);

    showToast("✓ Sales person saved successfully");

    setTimeout(function () {
      showPage("salespersons");
    }, 1200);
  } catch (error) {
    console.error("Error saving sales person:", error);
    showError(
      "Could not save sales person. " +
        (error.message || "Please try again.")
    );
  }
}

/* ============================================================
   INCENTIVE REPORT
   ============================================================ */

async function loadIncentives() {
  try {
    renderLoading();
    const data = await call("apiIncentives");
    state.incentiveRaw = Array.isArray(data) ? data : [];
    state.incentives = state.incentiveRaw;
    renderIncentives(state.incentives);
  } catch (error) {
    contentElement().innerHTML =
      '<div class="content"><div class="panel"><p style="color:red">Error loading incentive report: ' +
      escapeHtml(error.message) +
      "</p></div></div>";
  }
}

function renderIncentives(rows) {
  let html = '<div class="content">';
  html += '<div class="panel">';
  html +=
    '<div class="panel-header"><h2>Sales Incentive Report</h2></div>';

  html += '<div class="form-grid" style="margin-bottom:16px">';

  html += '<label>Date From';
  html +=
    '<input type="date" id="incentiveFrom" value="' +
    (state.incentiveFilter.from || "") +
    '" onchange="filterIncentives()"></label>';

  html += '<label>Date To';
  html +=
    '<input type="date" id="incentiveTo" value="' +
    (state.incentiveFilter.to || "") +
    '" onchange="filterIncentives()"></label>';

  html += '<label>Sales Person';
  html += '<select id="incentivePerson" onchange="filterIncentives()">';
  html += '<option value="">All</option>';

  const persons = [...new Set((rows || []).map(function (r) { return r.SalesPerson; }))];
  persons.forEach(function (p) {
    const selected =
      p === state.incentiveFilter.personName ? " selected" : "";
    html +=
      '<option value="' +
      escapeHtml(p) +
      '"' +
      selected +
      ">" +
      escapeHtml(p) +
      "</option>";
  });

  html += "</select></label>";

  html += '<label>Status';
  html += '<select id="incentiveStatus" onchange="filterIncentives()">';
  html += '<option value="all">All</option>';
  html += '<option value="Paid">Paid</option>';
  html += '<option value="Unpaid">Unpaid</option>';
  html += "</select></label>";

  html += "</div>";

  if (rows.length === 0) {
    html += '<div class="empty">No incentive records found.</div>';
  } else {
    html +=
      '<div style="margin-bottom:12px"><strong>Total Records: ' +
      rows.length +
      "</strong></div>";

    html += '<div class="table-wrap"><table class="table"><thead><tr>';
    html +=
      "<th>Invoice</th><th>Date</th><th>Customer</th><th class='num'>Sale</th><th class='num'>COGS</th><th class='num'>Profit</th>";
    html +=
      "<th>Sales Person</th><th class='num'>%</th><th class='num'>Incentive</th><th>Status</th><th>Action</th>";
    html += "</tr></thead><tbody>";

    let totalSale = 0,
      totalProfit = 0,
      totalIncentive = 0;

    rows.forEach(function (r) {
      const saleAmount = parseFloat(r.NetTotal || 0);
      const cogs = parseFloat(r.Profit || 0); // Note: "Profit" field actually contains COGS in some old schemas
      const profit = saleAmount - cogs;
      const incentiveAmount = parseFloat(r.IncentiveAmount || 0);

      totalSale += saleAmount;
      totalProfit += profit;
      totalIncentive += incentiveAmount;

      const statusBadge =
        '<span class="badge ' +
        (r.IncentiveStatus === "Paid"
          ? "success"
          : "warning") +
        '">' +
        escapeHtml(r.IncentiveStatus || "Unpaid") +
        "</span>";

      html += "<tr>";
      html +=
        "<td>" +
        escapeHtml(r.InvoiceNo || r.SaleID || "") +
        "</td>";
      html +=
        "<td>" +
        escapeHtml(formatDate(r.Date)) +
        "</td>";
      html +=
        "<td>" +
        escapeHtml(r.CustomerName || r.CustomerID || "") +
        "</td>";
      html +=
        '<td class="num">' +
        money(saleAmount) +
        "</td>";
      html +=
        '<td class="num">' +
        money(cogs) +
        "</td>";
      html +=
        '<td class="num">' +
        money(profit) +
        "</td>";
      html +=
        "<td>" +
        escapeHtml(r.SalesPerson || "-") +
        "</td>";
      html +=
        '<td class="num">' +
        escapeHtml(r.IncentivePercent || "0") +
        "%</td>";
      html +=
        '<td class="num">' +
        money(incentiveAmount) +
        "</td>";
      html += "<td>" + statusBadge + "</td>";

      const paidClass =
        r.IncentiveStatus === "Paid"
          ? " style='color:#999'"
          : "";
      html +=
        '<td><button class="btn secondary" onclick="toggleIncentiveStatus(\'' +
        escapeHtml(r.SaleID) +
        "', '" +
        escapeHtml(r.IncentiveStatus || "Unpaid") +
        "')"" +
        paidClass +
        ">" +
        (r.IncentiveStatus === "Paid"
          ? "✓ Paid"
          : "Mark Paid") +
        "</button></td>";

      html += "</tr>";
    });

    html += '<tr style="background:#f0f4f8;font-weight:bold">';
    html +=
      '<td colspan="3">TOTAL</td><td class="num">' +
      money(totalSale) +
      "</td>";
    html +=
      '<td class="num">' +
      money(0) +
      "</td>";
    html +=
      '<td class="num">' +
      money(totalProfit) +
      "</td>";
    html += "<td></td><td></td>";
    html +=
      '<td class="num">' +
      money(totalIncentive) +
      "</td>";
    html += "<td colspan='2'></td></tr>";

    html += "</tbody></table></div>";
  }

  html += "</div></div>";

  contentElement().innerHTML = html;
}

function filterIncentives() {
  const from =
    ($("incentiveFrom") ? $("incentiveFrom").value : "") || "";
  const to = ($("incentiveTo") ? $("incentiveTo").value : "") || "";
  const personName =
    ($("incentivePerson") ? $("incentivePerson").value : "") || "";
  const status =
    ($("incentiveStatus") ? $("incentiveStatus").value : "all") || "all";

  state.incentiveFilter = { from, to, personName, status };

  let filtered = state.incentiveRaw || [];

  if (from) {
    filtered = filtered.filter(function (r) {
      return (r.Date || "").substring(0, 10) >= from;
    });
  }

  if (to) {
    filtered = filtered.filter(function (r) {
      return (r.Date || "").substring(0, 10) <= to;
    });
  }

  if (personName) {
    filtered = filtered.filter(function (r) {
      return r.SalesPerson === personName;
    });
  }

  if (status !== "all") {
    filtered = filtered.filter(function (r) {
      return (r.IncentiveStatus || "Unpaid") === status;
    });
  }

  state.incentives = filtered;
  renderIncentives(state.incentives);
}

async function toggleIncentiveStatus(saleId, currentStatus) {
  try {
    const newStatus = currentStatus === "Paid" ? "Unpaid" : "Paid";

    showToast("Updating incentive status...");

    await call("apiIncentiveStatus", {
      saleId: saleId,
      status: newStatus
    });

    showToast(
      "✓ Incentive status updated to: " +
      escapeHtml(newStatus)
    );

    setTimeout(function () {
      loadIncentives();
    }, 600);
  } catch (error) {
    console.error("Error updating incentive status:", error);
    showError(
      "Could not update status. " +
        (error.message || "Please try again.")
    );
  }
}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

function renderLoading() {
  contentElement().innerHTML =
    '<div class="content" style="padding:40px;text-align:center"><p>Loading...</p></div>';
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(function () {
    toast.classList.add("hidden");
  }, 3000);
}

function showError(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = "❌ " + message;
  toast.classList.remove("hidden");

  console.error("ERP Error:", message);

  setTimeout(function () {
    toast.classList.add("hidden");
  }, 5000);
}

function escapeHtml(text) {
  if (!text) return "";

  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

function formatDate(date) {
  if (!date) return "";

  try {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return day + "-" + month + "-" + year;
  } catch (e) {
    return String(date).slice(0, 10);
  }
}

function formatNumber(value) {
  const num = parseFloat(value) || 0;
  return num.toLocaleString();
}

function money(value) {
  const num = parseFloat(value) || 0;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function todayInput() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

/* ============================================================ END ============================================================ */
