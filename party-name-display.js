/* ============================================================
   ARHAM ERP - CUSTOMER / SUPPLIER NAME DISPLAY FIX
   Keeps IDs internally, but shows names in the UI.
   ============================================================ */
(function () {
  "use strict";

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function maps() {
    const s = window.ERP && window.ERP.state;
    const customers = {};
    const suppliers = {};

    (s && Array.isArray(s.customers) ? s.customers : []).forEach(function (x) {
      if (x && x.CustomerID) customers[String(x.CustomerID)] = x.Name || x.CustomerID;
    });

    (s && Array.isArray(s.suppliers) ? s.suppliers : []).forEach(function (x) {
      if (x && x.SupplierID) suppliers[String(x.SupplierID)] = x.Name || x.SupplierID;
    });

    return { customers: customers, suppliers: suppliers };
  }

  function fixTable(table, map) {
    if (!table) return;

    const headers = Array.from(table.querySelectorAll("thead th")).map(function (th) {
      return String(th.textContent || "").trim().toLowerCase();
    });

    if (!headers.length) return;

    const customerIndex = headers.findIndex(function (h) {
      return h === "customerid" || h === "customer" || h === "customer id";
    });

    const supplierIndex = headers.findIndex(function (h) {
      return h === "supplierid" || h === "supplier" || h === "supplier id";
    });

    table.querySelectorAll("tbody tr").forEach(function (tr) {
      const cells = Array.from(tr.children);

      if (customerIndex >= 0 && cells[customerIndex]) {
        const id = String(cells[customerIndex].textContent || "").trim();
        if (map.customers[id]) {
          cells[customerIndex].innerHTML = esc(map.customers[id]);
        }
      }

      if (supplierIndex >= 0 && cells[supplierIndex]) {
        const id = String(cells[supplierIndex].textContent || "").trim();
        if (map.suppliers[id]) {
          cells[supplierIndex].innerHTML = esc(map.suppliers[id]);
        }
      }
    });
  }

  function fixDashboard() {
    const root = document.getElementById("erpDashboardEnhancements");
    if (!root || !window.ERP) return;

    const map = maps();

    root.querySelectorAll("table").forEach(function (table) {
      const headers = Array.from(table.querySelectorAll("thead th")).map(function (th) {
        return String(th.textContent || "").trim().toLowerCase();
      });

      const customerIndex = headers.findIndex(function (h) {
        return h === "customer";
      });

      const supplierIndex = headers.findIndex(function (h) {
        return h === "supplier";
      });

      table.querySelectorAll("tbody tr").forEach(function (tr) {
        const cells = Array.from(tr.children);

        if (customerIndex >= 0 && cells[customerIndex]) {
          const id = String(cells[customerIndex].textContent || "").trim();
          if (map.customers[id]) cells[customerIndex].textContent = map.customers[id];
        }

        if (supplierIndex >= 0 && cells[supplierIndex]) {
          const id = String(cells[supplierIndex].textContent || "").trim();
          if (map.suppliers[id]) cells[supplierIndex].textContent = map.suppliers[id];
        }
      });
    });
  }

  function run() {
    if (!window.ERP) return;
    const map = maps();

    document.querySelectorAll("table").forEach(function (table) {
      fixTable(table, map);
    });

    fixDashboard();
  }

  function start() {
    const content = document.getElementById("content");

    if (content) {
      new MutationObserver(function () {
        setTimeout(run, 0);
      }).observe(content, { childList: true, subtree: true });
    }

    setInterval(run, 1000);
    setTimeout(run, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();