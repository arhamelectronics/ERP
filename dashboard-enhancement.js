/* ============================================================
   ARHAM ELECTRONICS ERP
   DASHBOARD ENHANCEMENT LAYER
   Uses data returned by the production Apps Script dashboard API.
   ============================================================ */

(function () {
  "use strict";

  const STYLE_ID = "erp-dashboard-enhancement-style";
  let enhanced = false;

  function money(value) {
    const n = Number(value || 0);
    return "Rs. " + n.toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function number(value) {
    return Number(value || 0).toLocaleString("en-PK", {
      maximumFractionDigits: 2
    });
  }

  function date(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  }

  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .dash-summary-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:16px;
        margin-top:16px;
      }
      .dash-panel{
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:18px;
        box-shadow:0 4px 14px rgba(15,23,42,.04);
        min-width:0;
      }
      .dash-panel-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:14px;
      }
      .dash-panel-head h3{
        margin:0;
        font-size:16px;
        color:#111827;
      }
      .dash-panel-head span{
        color:#6b7280;
        font-size:12px;
      }
      .dash-table-wrap{
        overflow:auto;
        max-height:360px;
      }
      .dash-table{
        width:100%;
        border-collapse:collapse;
        font-size:13px;
      }
      .dash-table th{
        text-align:left;
        padding:10px 8px;
        color:#6b7280;
        font-weight:600;
        border-bottom:1px solid #e5e7eb;
        white-space:nowrap;
      }
      .dash-table td{
        padding:10px 8px;
        border-bottom:1px solid #f1f5f9;
        vertical-align:top;
      }
      .dash-table tr:last-child td{border-bottom:0}
      .dash-num{text-align:right;white-space:nowrap}
      .dash-muted{color:#6b7280}
      .dash-empty{
        padding:24px 10px;
        text-align:center;
        color:#6b7280;
      }
      .dash-kpi-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
      }
      .dash-kpi{
        border:1px solid #e5e7eb;
        border-radius:12px;
        padding:14px;
        background:#f8fafc;
      }
      .dash-kpi-label{
        font-size:12px;
        color:#64748b;
        margin-bottom:6px;
      }
      .dash-kpi-value{
        font-size:20px;
        font-weight:700;
        color:#111827;
      }
      .dash-alert{
        border-left:4px solid #f59e0b;
      }
      .dash-alert .dash-kpi-value{color:#b45309}
      @media (max-width:900px){
        .dash-summary-grid{grid-template-columns:1fr}
      }
      @media (max-width:600px){
        .dash-kpi-grid{grid-template-columns:1fr}
        .dash-panel{padding:14px}
      }
    `;
    document.head.appendChild(style);
  }

  function renderTableRows(rows, type) {
    if (!rows || !rows.length) {
      return '<tr><td colspan="5" class="dash-empty">No records available.</td></tr>';
    }

    if (type === "sales") {
      return rows.map(function (r) {
        return `
          <tr>
            <td>${esc(date(r.Date))}</td>
            <td><strong>${esc(r.InvoiceNo || r.SaleID)}</strong></td>
            <td>${esc(r.CustomerID)}</td>
            <td class="dash-num">${money(r.NetTotal)}</td>
            <td class="dash-num">${money(r.Balance)}</td>
          </tr>
        `;
      }).join("");
    }

    if (type === "purchases") {
      return rows.map(function (r) {
        return `
          <tr>
            <td>${esc(date(r.Date))}</td>
            <td><strong>${esc(r.ReferenceNo || r.PurchaseID)}</strong></td>
            <td>${esc(r.SupplierID)}</td>
            <td class="dash-num">${money(r.NetTotal)}</td>
            <td class="dash-num">${money(r.Balance)}</td>
          </tr>
        `;
      }).join("");
    }

    return rows.map(function (r) {
      return `
        <tr>
          <td><strong>${esc(r.Code || r.ProductID)}</strong></td>
          <td>${esc(r.Description)}</td>
          <td class="dash-num">${number(r.CurrentStock)} ${esc(r.Unit)}</td>
          <td class="dash-num">${number(r.MinStock)}</td>
          <td>${esc(r.Location)}</td>
        </tr>
      `;
    }).join("");
  }

  function enhance(data) {
    if (!data || !document.getElementById("content")) return;

    const old = document.getElementById("erpDashboardEnhancements");
    if (old) old.remove();

    const root = document.createElement("div");
    root.id = "erpDashboardEnhancements";
    root.innerHTML = `
      <div class="dash-summary-grid">

        <section class="dash-panel">
          <div class="dash-panel-head">
            <div>
              <h3>Financial Snapshot</h3>
              <span>Current outstanding balances</span>
            </div>
          </div>
          <div class="dash-kpi-grid">
            <div class="dash-kpi">
              <div class="dash-kpi-label">Customer Receivables</div>
              <div class="dash-kpi-value">${money(data.receivables)}</div>
            </div>
            <div class="dash-kpi">
              <div class="dash-kpi-label">Supplier Payables</div>
              <div class="dash-kpi-value">${money(data.payables)}</div>
            </div>
            <div class="dash-kpi">
              <div class="dash-kpi-label">Total Sales</div>
              <div class="dash-kpi-value">${money(data.salesTotal)}</div>
            </div>
            <div class="dash-kpi">
              <div class="dash-kpi-label">Total Purchases</div>
              <div class="dash-kpi-value">${money(data.purchasesTotal)}</div>
            </div>
          </div>
        </section>

        <section class="dash-panel ${Number(data.lowStockCount || 0) ? "dash-alert" : ""}">
          <div class="dash-panel-head">
            <div>
              <h3>Low Stock Alerts</h3>
              <span>Products at or below minimum level</span>
            </div>
            <strong>${number(data.lowStockCount)} items</strong>
          </div>
          <div class="dash-table-wrap">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Min</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                ${renderTableRows(data.lowStock || [], "stock")}
              </tbody>
            </table>
          </div>
        </section>

        <section class="dash-panel">
          <div class="dash-panel-head">
            <div>
              <h3>Recent Sales</h3>
              <span>Latest posted sales</span>
            </div>
            <button class="btn secondary" onclick="showPage('sales')">View Sales</button>
          </div>
          <div class="dash-table-wrap">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th class="dash-num">Net</th>
                  <th class="dash-num">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${renderTableRows(data.recentSales || [], "sales")}
              </tbody>
            </table>
          </div>
        </section>

        <section class="dash-panel">
          <div class="dash-panel-head">
            <div>
              <h3>Recent Purchases</h3>
              <span>Latest posted purchases</span>
            </div>
            <button class="btn secondary" onclick="showPage('purchases')">View Purchases</button>
          </div>
          <div class="dash-table-wrap">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Supplier</th>
                  <th class="dash-num">Net</th>
                  <th class="dash-num">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${renderTableRows(data.recentPurchases || [], "purchases")}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    `;

    const content = document.getElementById("content");
    content.appendChild(root);
  }

  function tryEnhance() {
    if (!window.ERP || !window.ERP.state) return;
    if (window.ERP.state.page !== "dashboard") {
      enhanced = false;
      return;
    }

    const data = window.ERP.state.dashboard;
    if (!data) return;

    const dashboardRoot = document.querySelector("#content .content");
    if (!dashboardRoot) return;

    if (document.getElementById("erpDashboardEnhancements")) return;

    injectStyles();
    enhance(data);
    enhanced = true;
  }

  function start() {
    const observer = new MutationObserver(function () {
      if (!enhanced) tryEnhance();
      else if (window.ERP && window.ERP.state && window.ERP.state.page === "dashboard") {
        const data = window.ERP.state.dashboard;
        const existing = document.getElementById("erpDashboardEnhancements");
        if (data && existing) {
          enhanced = false;
          tryEnhance();
        }
      }
    });

    const content = document.getElementById("content");
    if (content) observer.observe(content, {childList:true, subtree:true});

    setInterval(tryEnhance, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();