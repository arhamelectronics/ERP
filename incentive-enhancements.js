/* ============================================================
   ARHAM ELECTRONICS ERP - SALES INCENTIVE UI
   Profit-based incentive per Sales Person.
   ============================================================ */
(function () {
  "use strict";

  function esc(v) {
    if (typeof escapeHtml === "function") return escapeHtml(v == null ? "" : v);
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function moneySafe(v) {
    if (typeof money === "function") return money(Number(v) || 0);
    return "Rs. " + (Number(v) || 0).toLocaleString();
  }

  function pct(v) {
    const n = Number(v) || 0;
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 }) + "%";
  }

  async function getPeople() {
    const rows = await call("salespersons");
    return Array.isArray(rows) ? rows : [];
  }

  window.showSalesIncentive = async function () {
    try {
      contentElement().innerHTML = '<div class="content"><div class="panel"><div class="empty">Loading Sales Incentive...</div></div></div>';
      const people = await getPeople();
      renderPage(people);
    } catch (e) {
      showError(e.message || "Could not load Sales Incentive.");
    }
  };

  function renderPage(people) {
    const options = people.map(function (p) {
      return '<option value="' + esc(p.Name) + '">' + esc(p.Name) + ' — ' + esc(pct(p.IncentivePercent)) + '</option>';
    }).join("");

    contentElement().innerHTML = `
      <div class="content">
        <div class="toolbar">
          <div>
            <h2>Sales Incentive</h2>
            <p>Profit-based incentive for each Sales Person</p>
          </div>
          <button class="btn secondary" onclick="showSalesIncentive()">↻ Refresh</button>
        </div>

        <div class="dash-two-col">
          <div class="panel">
            <div class="panel-header"><h3>Sales Persons & Incentive %</h3></div>
            <form id="incentivePersonForm" class="erp-form">
              <div class="form-grid">
                <label>Sales Person
                  <input name="name" list="existingSalesPersons" placeholder="Name" required autocomplete="off">
                  <datalist id="existingSalesPersons">${people.map(function(p){return '<option value="'+esc(p.Name)+'">';}).join("")}</datalist>
                </label>
                <label>Incentive %
                  <input name="incentivePercent" type="number" min="0" max="100" step="0.01" placeholder="e.g. 5" required>
                </label>
              </div>
              <label class="checkbox-line"><input name="active" type="checkbox" checked> Active</label>
              <div class="form-actions"><button class="btn primary" type="submit">Save Sales Person</button></div>
            </form>
            <div class="table-wrap" style="margin-top:16px">
              <table class="table">
                <thead><tr><th>Name</th><th class="num">Incentive %</th><th>Status</th></tr></thead>
                <tbody>
                  ${people.length ? people.map(function(p){
                    return '<tr><td>'+esc(p.Name)+'</td><td class="num">'+esc(pct(p.IncentivePercent))+'</td><td>'+((String(p.Active).toLowerCase()==='false')?'Inactive':'Active')+'</td></tr>';
                  }).join("") : '<tr><td colspan="3" class="empty">No Sales Persons added yet.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header"><h3>Incentive Report</h3></div>
            <form id="incentiveReportForm" class="erp-form">
              <div class="form-grid">
                <label>From <input name="from" type="date"></label>
                <label>To <input name="to" type="date"></label>
              </div>
              <div class="form-actions"><button class="btn primary" type="submit">Load Report</button></div>
            </form>
            <div id="incentiveReportResult" style="margin-top:16px"><div class="empty">Select dates and load the report.</div></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("incentivePersonForm").addEventListener("submit", savePerson);
    document.getElementById("incentiveReportForm").addEventListener("submit", loadReport);
  }

  async function savePerson(e) {
    e.preventDefault();
    const f = e.currentTarget;
    try {
      showToast("Saving Sales Person...");
      const result = await call("savesalesperson", {
        name: f.name.value.trim(),
        incentivePercent: Number(f.incentivePercent.value) || 0,
        active: f.active.checked
      });
      showToast((result.updated ? "Sales Person updated" : "Sales Person added") + ": " + result.name);
      showSalesIncentive();
    } catch (err) { showError(err.message); }
  }

  async function loadReport(e) {
    e.preventDefault();
    const f = e.currentTarget;
    try {
      showToast("Loading incentive report...");
      const data = await call("incentivereport", { from: f.from.value, to: f.to.value });
      const rows = Array.isArray(data.summary) ? data.summary : [];
      const host = document.getElementById("incentiveReportResult");
      if (!rows.length) { host.innerHTML = '<div class="empty">No incentive records found for this period.</div>'; return; }
      const total = rows.reduce(function(t,r){return t+(Number(r.incentive)||0);},0);
      host.innerHTML = `
        <div class="stat-grid" style="grid-template-columns:1fr">
          ${typeof statCard === "function" ? statCard("Total Incentive", moneySafe(total), null, "green") : '<div class="panel"><b>Total Incentive</b><h2>'+moneySafe(total)+'</h2></div>'}
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Sales Person</th><th class="num">Sales</th><th class="num">Cost</th><th class="num">Profit</th><th class="num">Incentive</th></tr></thead>
            <tbody>${rows.map(function(r){
              return '<tr><td>'+esc(r.salesPerson)+'</td><td class="num">'+moneySafe(r.sales)+'</td><td class="num">'+moneySafe(r.cost)+'</td><td class="num">'+moneySafe(r.profit)+'</td><td class="num"><b>'+moneySafe(r.incentive)+'</b></td></tr>';
            }).join("")}</tbody>
          </table>
        </div>`;
    } catch (err) { showError(err.message); }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const originalShowPage = window.showPage;
    if (!originalShowPage) return;
    const originalTitles = window.updatePageTitle;
    window.updatePageTitle = function (page) {
      if (page === "sales-incentive") {
        if ($("pageTitle")) $("pageTitle").textContent = "Sales Incentive";
        if ($("crumb")) $("crumb").textContent = "Sales Incentive";
        return;
      }
      if (originalTitles) originalTitles(page);
    };
  });
})();
