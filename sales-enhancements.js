/* ============================================================
   ARHAM ELECTRONICS ERP - SALES ENHANCEMENTS
   Product descriptions + Sales Person + incentive-aware Sales Person list.
   ============================================================ */
(function () {
  "use strict";

  function esc(value) {
    if (typeof escapeHtml === "function") return escapeHtml(value == null ? "" : value);
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function productLabel(product) {
    return product.Description || product.Name || product.ProductName || product.Code || product.ProductID || "Product";
  }

  function getSalesPersonFromNotes(notes) {
    const text = String(notes || "");
    const match = text.match(/(?:^|\|)\s*Sales Person\s*:\s*([^|]*)/i);
    return match ? match[1].trim() : "";
  }

  function cleanOriginalNotes(notes) {
    const text = String(notes || "");
    return text.replace(/(?:^|\|)\s*Sales Person\s*:\s*[^|]*\s*/i, "").replace(/^\s*\|\s*|\s*\|\s*$/g, "").trim();
  }

  function buildNotes(salesPerson, notes) {
    const person = String(salesPerson || "").trim();
    const original = cleanOriginalNotes(notes);
    if (!person) return original;
    return "Sales Person: " + person + (original ? " | " + original : "");
  }

  function productOptions() {
    return (state.products || []).map(function (product) {
      return '<option value="' + esc(product.ProductID) + '">' + esc(productLabel(product)) + '</option>';
    }).join("");
  }

  function saleItemRowEnhanced() {
    return `
      <div class="item-row">
        <select name="productId" required>
          <option value="">Select product description</option>
          ${productOptions()}
        </select>
        <input type="number" name="qty" min="0.01" step="0.01" placeholder="Qty" required>
        <input type="number" name="unitPrice" min="0" step="0.01" placeholder="Price">
        <input type="number" name="discount" min="0" step="0.01" placeholder="Discount" value="0">
        <button type="button" class="btn danger" onclick="this.parentElement.remove()">Remove</button>
      </div>`;
  }

  window.addSaleItemRow = function () {
    const box = document.getElementById("saleItems");
    if (box) box.insertAdjacentHTML("beforeend", saleItemRowEnhanced());
  };

  async function fillSalesPersons() {
    try {
      const people = await call("salespersons");
      const list = document.getElementById("salesPersonList");
      if (!list) return;
      list.innerHTML = (Array.isArray(people) ? people : []).filter(function (p) {
        return String(p.Active).toLowerCase() !== "false";
      }).map(function (p) {
        return '<option value="' + esc(p.Name) + '">' + esc(pct(p.IncentivePercent)) + '</option>';
      }).join("");

      const input = document.querySelector('#saleForm [name="salesPerson"]');
      const rateBox = document.getElementById("salesPersonRate");
      if (input && rateBox) {
        input.addEventListener("input", function () {
          const row = (people || []).find(function (p) {
            return String(p.Name || "").trim().toLowerCase() === input.value.trim().toLowerCase();
          });
          rateBox.textContent = row ? "Incentive: " + pct(row.IncentivePercent) + " of profit" : "";
        });
      }
    } catch (e) {
      console.warn("Could not load Sales Persons:", e);
    }
  }

  function pct(v) {
    const n = Number(v) || 0;
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 }) + "%";
  }

  window.openSaleForm = function () {
    if (!state.customers || !state.customers.length) {
      showToast("Loading customers...");
      return loadCustomers().then(window.openSaleForm).catch(function (error) { showError(error.message); });
    }
    if (!state.products || !state.products.length) {
      showToast("Loading products...");
      return loadProducts().then(window.openSaleForm).catch(function (error) { showError(error.message); });
    }

    const customerOptions = (state.customers || []).map(function (customer) {
      return '<option value="' + esc(customer.CustomerID) + '">' + esc(customer.Name || customer.CustomerName || customer.CustomerID) + '</option>';
    }).join("");

    contentElement().innerHTML = `
      <div class="content">
        <div class="panel">
          <div class="panel-header">
            <h2>New Sale</h2>
            <button class="btn secondary" onclick="showPage('sales')">Cancel</button>
          </div>
          <form id="saleForm" class="erp-form">
            <div class="form-grid">
              <label>Customer
                <select name="customerId" required><option value="">Select customer</option>${customerOptions}</select>
              </label>
              <label>Sales Person
                <input name="salesPerson" type="text" list="salesPersonList" placeholder="Enter sales person name" required autocomplete="off">
                <datalist id="salesPersonList"></datalist>
                <small id="salesPersonRate" class="field-help"></small>
              </label>
              <label>Invoice No <input name="invoiceNo" placeholder="Auto"></label>
              <label>Date <input type="date" name="date" value="${todayInput()}" required></label>
              <label>Discount <input type="number" name="discount" min="0" step="0.01" value="0"></label>
              <label>Paid <input type="number" name="paid" min="0" step="0.01" value="0"></label>
              <label>Payment Method
                <select name="paymentMethod"><option value="cash">Cash</option><option value="bank">Bank</option><option value="online">Online</option><option value="other">Other</option></select>
              </label>
            </div>
            <h3>Items</h3>
            <div id="saleItems" class="items-box">${saleItemRowEnhanced()}</div>
            <button type="button" class="btn secondary" onclick="addSaleItemRow()">+ Add Item</button>
            <label>Notes <textarea name="notes" rows="3" placeholder="Optional sale notes"></textarea></label>
            <div class="form-actions"><button type="submit" class="btn primary">Save Sale</button></div>
          </form>
        </div>
      </div>`;

    document.getElementById("saleForm").addEventListener("submit", window.submitSaleEnhanced);
    fillSalesPersons();
  };

  window.submitSaleEnhanced = async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      showToast("Saving sale...");
      const items = Array.from(form.querySelectorAll(".item-row")).map(function (row) {
        return {
          productId: row.querySelector('[name="productId"]').value,
          qty: Number(row.querySelector('[name="qty"]').value),
          unitPrice: Number(row.querySelector('[name="unitPrice"]').value) || undefined,
          discount: Number(row.querySelector('[name="discount"]').value) || 0
        };
      });
      const salesPerson = form.salesPerson.value.trim();
      if (!salesPerson) throw new Error("Sales Person is required.");
      const payload = {
        customerId: form.customerId.value,
        invoiceNo: form.invoiceNo.value.trim(),
        date: form.date.value,
        discount: Number(form.discount.value) || 0,
        paid: Number(form.paid.value) || 0,
        paymentMethod: form.paymentMethod.value,
        notes: buildNotes(salesPerson, form.notes.value.trim()),
        items: items
      };
      const result = await call("apiSale", payload);
      showToast("Sale saved: " + (result.invoiceNo || "Success") + " | Incentive: " + (Number(result.incentiveAmount) || 0).toLocaleString());
      showPage("sales");
    } catch (error) { showError(error.message); }
  };

  function enhanceSalesTable() {
    const tableHost = document.getElementById("salesTable");
    if (!tableHost) return;
    const table = tableHost.querySelector("table");
    if (!table || table.dataset.salesPersonEnhanced === "1") return;
    const headers = Array.from(table.querySelectorAll("thead th"));
    const source = Array.isArray(state.sales) ? state.sales : [];
    const byInvoice = {};
    source.forEach(function (row) { byInvoice[String(row.InvoiceNo || "")] = getSalesPersonFromNotes(row.Notes); });
    const invoiceIndex = headers.findIndex(function (th) { return /invoice/i.test(th.textContent || ""); });
    if (invoiceIndex < 0) return;
    const headRow = table.querySelector("thead tr");
    const newTh = document.createElement("th"); newTh.textContent = "Sales Person"; headRow.appendChild(newTh);
    Array.from(table.querySelectorAll("tbody tr")).forEach(function (tr) {
      const cells = tr.querySelectorAll("td");
      const invoice = cells[invoiceIndex] ? cells[invoiceIndex].textContent.trim() : "";
      const td = document.createElement("td"); td.textContent = byInvoice[invoice] || ""; tr.appendChild(td);
    });
    table.dataset.salesPersonEnhanced = "1";
  }

  const observer = new MutationObserver(function () { enhanceSalesTable(); });
  document.addEventListener("DOMContentLoaded", function () {
    observer.observe(document.getElementById("content") || document.body, { childList: true, subtree: true });
  });
})();
