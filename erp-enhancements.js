/* ============================================================
   ARHAM ELECTRONICS ERP - UI ENHANCEMENTS
   Safe frontend layer: does not modify the database or backend.
   ============================================================ */
(function () {
  'use strict';

  function text(v) { return v === null || v === undefined ? '' : String(v).trim(); }
  function appState() { return typeof state !== 'undefined' ? state : {}; }
  function findById(list, id, key) {
    const value = text(id);
    if (!value || !Array.isArray(list)) return null;
    return list.find(function (r) { return text(r[key]) === value; }) || null;
  }
  function productLabel(id) {
    const r = findById(appState().products, id, 'ProductID');
    return r ? (text(r.Description) || text(r.Code) || text(id)) : text(id);
  }
  function customerLabel(id) {
    const r = findById(appState().customers, id, 'CustomerID');
    return r ? (text(r.CustomerName) || text(r.Name) || text(r.Description) || text(id)) : text(id);
  }
  function supplierLabel(id) {
    const r = findById(appState().suppliers, id, 'SupplierID');
    return r ? (text(r.SupplierName) || text(r.Name) || text(r.Description) || text(id)) : text(id);
  }
  function enhanceSelects() {
    document.querySelectorAll('select').forEach(function (select) {
      const name = (select.name || select.id || '').toLowerCase();
      Array.from(select.options).forEach(function (option) {
        const value = text(option.value);
        if (!value) return;
        if (name.includes('product')) option.textContent = productLabel(value);
        else if (name.includes('customer')) option.textContent = customerLabel(value);
        else if (name.includes('supplier')) option.textContent = supplierLabel(value);
      });
    });
  }
  function enhanceTables() {
    document.querySelectorAll('table').forEach(function (table) {
      const headers = Array.from(table.querySelectorAll('thead th')).map(function (th) { return text(th.textContent).toLowerCase(); });
      if (!headers.length) return;
      table.querySelectorAll('tbody tr').forEach(function (row) {
        Array.from(row.children).forEach(function (cell, i) {
          const header = headers[i] || '';
          const raw = text(cell.textContent);
          if (!raw) return;
          if (header === 'customerid' || header === 'customer') cell.textContent = customerLabel(raw);
          else if (header === 'supplierid' || header === 'supplier') cell.textContent = supplierLabel(raw);
          else if (header === 'productid' || header === 'product') cell.textContent = productLabel(raw);
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
    if (refresh) topbar.insertBefore(badge, refresh); else topbar.appendChild(badge);
  }
  async function checkConnection() {
    const badge = document.getElementById('erpConnectionStatus');
    if (!badge || typeof API_URL === 'undefined') return;
    try {
      const response = await fetch(API_URL + '?action=health&_ts=' + Date.now(), { method: 'GET', cache: 'no-store' });
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
    if (document.getElementById('erpMobileQuickBar') || window.innerWidth > 820) return;
    const bar = document.createElement('div');
    bar.id = 'erpMobileQuickBar';
    bar.className = 'erp-mobile-quickbar';
    bar.innerHTML = '<button data-go="dashboard">⌂<span>Home</span></button><button data-go="sales">＋<span>Sale</span></button><button data-go="purchases">＋<span>Purchase</span></button><button data-go="payments">৳<span>Payment</span></button>';
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
    const target = document.getElementById('content');
    if (target) {
      const observer = new MutationObserver(function () { window.requestAnimationFrame(refreshEnhancements); });
      observer.observe(target, { childList: true, subtree: true });
    }
  });
})();
