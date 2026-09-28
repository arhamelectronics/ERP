/* ============================================================
   ARHAM ELECTRONICS ERP - UI ENHANCEMENTS
   Safe frontend layer: does not modify the database or backend.
   ============================================================ */
(function () {
  'use strict';

  function text(v) {
    return v === null || v === undefined ? '' : String(v).trim();
  }

  function findById(rows, id, idKey) {
    const key = text(id);
    if (!key || !Array.isArray(rows)) return null;
    return rows.find(function (r) { return text(r[idKey]) === key; }) || null;
  }

  function productLabel(id) {
    const r = findById(window.state && state.products, id, 'ProductID');
    if (!r) return text(id);
    return text(r.Description) || text(r.Code) || text(id);
  }

  function customerLabel(id) {
    const r = findById(window.state && state.customers, id, 'CustomerID');
    if (!r) return text(id);
    return text(r.CustomerName) || text(r.Name) || text(r.Description) || text(id);
  }

  function supplierLabel(id) {
    const r = findById(window.state && state.suppliers, id, 'SupplierID');
    if (!r) return text(id);
    return text(r.SupplierName) || text(r.Name) || text(r.Description) || text(id);
  }

  function enhanceSelects() {
    document.querySelectorAll('select').forEach(function (select) {
      const name = (select.name || select.id || '').toLowerCase();
      Array.from(select.options).forEach(function (option) {
        const value = text(option.value);
        if (!value) return;
        if (name.includes('product')) {
          option.textContent = productLabel(value);
        } else if (name.includes('customer')) {
          option.textContent = customerLabel(value);
        } else if (name.includes('supplier')) {
          option.textContent = supplierLabel(value);
        }
      });
    });
  }

  function enhanceTables() {
    document.querySelectorAll('table').forEach(function (table) {
      const headers = Array.from(table.querySelectorAll('thead th')).map(function (th) {
        return text(th.textContent).toLowerCase();
      });
      if (!headers.length) return;

      table.querySelectorAll('tbody tr').forEach(function (row) {
        const cells = row.children;
        headers.forEach(function (header, i) {
          if (!cells[i]) return;
          const cell = cells[i];
          const raw = text(cell.textContent);
          if (!raw) return;
          if (header === 'customerid' || header === 'customer') {
            const label = customerLabel(raw);
            if (label && label !== raw) cell.textContent = label;
          } else if (header === 'supplierid' || header === 'supplier') {
            const label = supplierLabel(raw);
            if (label && label !== raw) cell.textContent = label;
          } else if (header === 'productid' || header === 'product') {
            const label = productLabel(raw);
            if (label && label !== raw) cell.textContent = label;
          }
        });
      });
    });
  }

  function addConnectionStatus() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('erpConnectionStatus')) return;

    const badge = document.createElement('div');
    badge.id = 'erpConnectionStatus';
    badge.className = 'erp-connection online';
    badge.innerHTML = '<span class="erp-dot"></span><span>ERP Online</span>';

    const refresh = document.getElementById('refreshBtn');
    if (refresh) topbar.insertBefore(badge, refresh);
    else topbar.appendChild(badge);
  }

  async function checkConnection() {
    const badge = document.getElementById('erpConnectionStatus');
    if (!badge || typeof API_URL === 'undefined') return;
    try {
      const response = await fetch(API_URL + '?action=health&_ts=' + Date.now(), {
        method: 'GET', cache: 'no-store'
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!data || data.ok === false) throw new Error('Backend error');
      badge.className = 'erp-connection online';
      badge.innerHTML = '<span class="erp-dot"></span><span>ERP Online</span>';
    } catch (e) {
      badge.className = 'erp-connection offline';
      badge.innerHTML = '<span class="erp-dot"></span><span>ERP Offline</span>';
    }
  }

  function addMobileQuickBar() {
    if (document.getElementById('erpMobileQuickBar')) return;
    if (window.innerWidth > 820) return;

    const bar = document.createElement('div');
    bar.id = 'erpMobileQuickBar';
    bar.className = 'erp-mobile-quickbar';
    bar.innerHTML =
      '<button data-go="dashboard">⌂<span>Home</span></button>' +
      '<button data-go="sales">＋<span>Sale</span></button>' +
      '<button data-go="purchases">＋<span>Purchase</span></button>' +
      '<button data-go="payments">৳<span>Payment</span></button>';

    bar.addEventListener('click', function (e) {
      const button = e.target.closest('button[data-go]');
      if (button && typeof window.showPage === 'function') window.showPage(button.dataset.go);
    });
    document.body.appendChild(bar);
  }

  function refreshEnhancements() {
    addConnectionStatus();
    enhanceSelects();
    enhanceTables();
    addMobileQuickBar();
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      refreshEnhancements();
      checkConnection();
      setInterval(checkConnection, 60000);
    }, 700);

    const observer = new MutationObserver(function () {
      window.requestAnimationFrame(refreshEnhancements);
    });
    const target = document.getElementById('content');
    if (target) observer.observe(target, { childList: true, subtree: true });
  });
})();
