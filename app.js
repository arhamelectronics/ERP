const KEY="arham_erp_v2";
const seed={
  products:[
    {sku:"P-001",name:"6KV NITROX",category:"Inverter",brand:"NITROX",qty:12,cost:709000},
    {sku:"P-002",name:"4KV VEYRON",category:"Inverter",brand:"VEYRON",qty:12,cost:151500},
    {sku:"P-003",name:"NS 1000 SD",category:"Inverter",brand:"NITROX",qty:12,cost:24000},
    {sku:"P-004",name:"PV 3200",category:"Panel",brand:"",qty:10,cost:80900}
  ],
  customers:[
    {code:"C-001",name:"KHADIM",phone:"",address:"",balance:0},
    {code:"C-002",name:"DANISH",phone:"",address:"",balance:0},
    {code:"C-003",name:"HAMZA ELECTRONICS",phone:"",address:"",balance:0},
    {code:"C-004",name:"RAFAY ELECTRONICS",phone:"",address:"",balance:0}
  ],
  suppliers:[],
  sales:[],purchases:[],stockMovements:[],payments:[],expenses:[],audit:[]
};
function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY)||"null");
    if(saved)return {...seed,...saved};
  }catch(e){}
  return JSON.parse(JSON.stringify(seed));
}
const state=load();
state.page="Dashboard";
function persist(){const copy={...state,page:undefined};delete copy.page;localStorage.setItem(KEY,JSON.stringify(copy))}
function money(n){return new Intl.NumberFormat("en-PK",{style:"currency",currency:"PKR",maximumFractionDigits:0}).format(Number(n)||0)}
function num(v){return Number(v)||0}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function today(){return new Date().toISOString().slice(0,10)}
function id(prefix){return prefix+"-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,6).toUpperCase()}
function log(action,entity_type,entity_id,details=""){state.audit.push({id:id("AUD"),occurred_at:new Date().toISOString(),action,entity_type,entity_id,details});persist()}
function nav(){return["Dashboard","Products","Stock Flow","Sales","Purchases","Customers","Suppliers","Ledger","Payments","Expenses","Reports","Invoices","Settings"]}
function shell(){
  document.getElementById("app").innerHTML=`<div class="layout"><aside class="sidebar"><div class="brand">ARHAM ELECTRONICS<small>ERP / BUSINESS MANAGEMENT</small></div><div class="nav">${nav().map(x=>`<button class="${state.page===x?"active":""}" onclick="go('${x}')">${x}</button>`).join("")}</div></aside><main class="main"><div class="top"><div><h1>${state.page}</h1><div class="sub">Transaction-ready prototype • source-safe migration architecture</div></div><div class="user">Admin <span class="badge">Prototype</span></div></div><div id="content"></div></main></div>`;
  render();
}
function go(p){state.page=p;shell()}
function render(){
  const c=document.getElementById("content");
  if(state.page==="Dashboard")return dashboard(c);
  if(state.page==="Products")return products(c);
  if(state.page==="Customers")return parties(c,false);
  if(state.page==="Suppliers")return parties(c,true);
  if(state.page==="Stock Flow")return stock(c);
  if(state.page==="Sales")return sales(c);
  if(state.page==="Purchases")return purchases(c);
  if(state.page==="Ledger")return ledger(c);
  if(state.page==="Payments")return payments(c);
  if(state.page==="Expenses")return expenses(c);
  if(state.page==="Reports")return reports(c);
  if(state.page==="Invoices")return invoices(c);
  return settings(c);
}
function inventoryValue(){return state.products.reduce((a,p)=>a+num(p.qty)*num(p.cost),0)}
function salesTotal(){return state.sales.filter(x=>x.status!=="cancelled").reduce((a,x)=>a+num(x.total),0)}
function purchaseTotal(){return state.purchases.filter(x=>x.status!=="cancelled").reduce((a,x)=>a+num(x.total),0)}
function cogsTotal(){return state.sales.filter(x=>x.status!=="cancelled").reduce((a,x)=>a+num(x.cogs),0)}
function dashboard(c){
  const receivables=state.customers.reduce((a,x)=>a+Math.max(0,num(x.balance)),0);
  const payables=state.suppliers.reduce((a,x)=>a+Math.max(0,num(x.balance)),0);
  const profit=salesTotal()-cogsTotal()-state.expenses.reduce((a,x)=>a+num(x.amount),0);
  c.innerHTML=`<div class="grid">
    <div class="card metric"><div class="label">Products</div><div class="value">${state.products.length}</div><div class="delta">Inventory master</div></div>
    <div class="card metric"><div class="label">Inventory Value</div><div class="value">${money(inventoryValue())}</div><div class="delta">Current recorded cost</div></div>
    <div class="card metric"><div class="label">Receivables</div><div class="value">${money(receivables)}</div><div class="delta">Customer outstanding</div></div>
    <div class="card metric"><div class="label">Payables</div><div class="value">${money(payables)}</div><div class="delta">Supplier outstanding</div></div>
    <div class="card metric"><div class="label">Sales</div><div class="value">${money(salesTotal())}</div><div class="delta">${state.sales.length} invoices</div></div>
    <div class="card metric"><div class="label">Purchases</div><div class="value">${money(purchaseTotal())}</div><div class="delta">${state.purchases.length} bills</div></div>
    <div class="card metric"><div class="label">Gross Profit</div><div class="value">${money(salesTotal()-cogsTotal())}</div><div class="delta">Sales less COGS</div></div>
    <div class="card metric"><div class="label">Net Profit</div><div class="value">${money(profit)}</div><div class="delta">After expenses</div></div>
  </div>
  <div class="cards2 panel"><div class="card"><h2>Quick Actions</h2><div class="quick">
    <button onclick="go('Sales')"><strong>+ New Sale</strong><span class="small">Invoice, stock and customer balance</span></button>
    <button onclick="go('Purchases')"><strong>+ New Purchase</strong><span class="small">Receive stock and supplier balance</span></button>
    <button onclick="go('Payments')"><strong>+ Payment</strong><span class="small">Record customer/supplier payment</span></button>
  </div></div><div class="card"><h2>System Status</h2><div class="notice success">Transaction engine is active in browser storage. Production database/authentication remains the next backend phase.</div></div></div>`;
}
function products(c){
  c.innerHTML=`<div class="card panel"><div class="toolbar"><input id="pq" class="input" placeholder="Search products..." oninput="filterProducts()"><button class="btn" onclick="addProduct()">+ Add Product</button></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Brand</th><th>Qty</th><th>Cost</th><th>Value</th></tr></thead><tbody id="ptbody">${rowsProducts(state.products)}</tbody></table></div></div>`;
}
function rowsProducts(a){return a.map(p=>`<tr><td>${esc(p.sku)}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.category||"-")}</td><td>${esc(p.brand||"-")}</td><td>${num(p.qty)}</td><td>${money(p.cost)}</td><td>${money(num(p.qty)*num(p.cost))}</td></tr>`).join("")||`<tr><td colspan="7" class="small">No products</td></tr>`}
function filterProducts(){const q=(document.getElementById("pq").value||"").toLowerCase();document.getElementById("ptbody").innerHTML=rowsProducts(state.products.filter(p=>(p.name+" "+p.sku+" "+p.brand+" "+p.category).toLowerCase().includes(q)))}
function addProduct(){
  const name=prompt("Product name");if(!name)return;
  const sku=prompt("SKU (optional)")||("P-"+String(state.products.length+1).padStart(3,"0"));
  state.products.push({sku,name,category:prompt("Category")||"Other",brand:prompt("Brand")||"",qty:0,cost:0});
  persist();log("create","product",sku,name);products(document.getElementById("content"));
}
function parties(c,isSupplier){
  const arr=isSupplier?state.suppliers:state.customers;
  c.innerHTML=`<div class="card panel"><div class="toolbar"><input class="input" id="cq" placeholder="Search..." oninput="filterParty(${isSupplier})"><button class="btn" onclick="addParty(${isSupplier})">+ Add ${isSupplier?"Supplier":"Customer"}</button></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Name</th><th>Phone</th><th>Balance</th></tr></thead><tbody id="ctbody">${rowsParty(arr)}</tbody></table></div></div>`;
}
function rowsParty(a){return a.map(x=>`<tr><td>${esc(x.code)}</td><td><b>${esc(x.name)}</b></td><td>${esc(x.phone||"-")}</td><td>${money(x.balance)}</td></tr>`).join("")||`<tr><td colspan="4" class="small">No records yet</td></tr>`}
function filterParty(isSupplier){const q=(document.getElementById("cq").value||"").toLowerCase();const arr=isSupplier?state.suppliers:state.customers;document.getElementById("ctbody").innerHTML=rowsParty(arr.filter(x=>(x.name+" "+x.code+" "+x.phone).toLowerCase().includes(q)))}
function addParty(isSupplier){
  const name=prompt((isSupplier?"Supplier":"Customer")+" name");if(!name)return;
  const arr=isSupplier?state.suppliers:state.customers;
  arr.push({code:(isSupplier?"S-":"C-")+String(arr.length+1).padStart(3,"0"),name,phone:prompt("Phone")||"",address:"",balance:0});
  persist();log("create",isSupplier?"supplier":"customer",name);parties(document.getElementById("content"),isSupplier);
}
function productOptions(){return state.products.map(p=>`<option value="${esc(p.sku)}">${esc(p.name)} — ${esc(p.sku)} (stock ${num(p.qty)})</option>`).join("")}
function customerOptions(){return state.customers.map(x=>`<option value="${esc(x.code)}">${esc(x.name)}</option>`).join("")}
function supplierOptions(){return state.suppliers.map(x=>`<option value="${esc(x.code)}">${esc(x.name)}</option>`).join("")}
function sales(c){
  c.innerHTML=`<div class="cards2"><div class="card"><h2>New Sale</h2><div class="form-grid">
  <label>Date<input id="saleDate" class="input" type="date" value="${today()}"></label>
  <label>Customer<select id="saleCustomer" class="input"><option value="">Cash Customer</option>${customerOptions()}</select></label>
  <label>Product<select id="saleProduct" class="input">${productOptions()}</select></label>
  <label>Quantity<input id="saleQty" class="input" type="number" min="0.01" step="0.01" value="1"></label>
  <label>Unit Price<input id="salePrice" class="input" type="number" min="0" step="1" placeholder="Selling price"></label>
  <label>Discount<input id="saleDiscount" class="input" type="number" min="0" step="1" value="0"></label>
  </div><button class="btn" onclick="createSale()">Save Sale & Generate Invoice</button><div class="small form-note">Stock is reduced by a movement and customer credit is posted only for the unpaid amount.</div></div>
  <div class="card"><h2>Recent Sales</h2><div class="table-wrap"><table class="table"><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>${state.sales.slice(-10).reverse().map(s=>`<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.sale_date)}</td><td>${esc(s.customer_name||"Cash")}</td><td>${money(s.total)}</td><td><span class="badge">${esc(s.status)}</span></td></tr>`).join("")||`<tr><td colspan="5" class="small">No sales yet</td></tr>`}</tbody></table></div></div></div>`;
}
function createSale(){
  const p=state.products.find(x=>x.sku===document.getElementById("saleProduct").value);
  if(!p)return alert("Select a product.");
  const qty=num(document.getElementById("saleQty").value), price=num(document.getElementById("salePrice").value), discount=num(document.getElementById("saleDiscount").value);
  if(qty<=0||price<0)return alert("Enter a valid quantity and price.");
  if(qty>num(p.qty))return alert("Insufficient stock.");
  const total=Math.max(0,qty*price-discount), cogs=qty*num(p.cost);
  const customer=state.customers.find(x=>x.code===document.getElementById("saleCustomer").value);
  const paid=num(prompt("Amount received now",String(total))||0);
  if(paid<0||paid>total)return alert("Payment must be between 0 and total.");
  const invoice="INV-"+new Date().getFullYear()+"-"+String(state.sales.length+1).padStart(5,"0");
  const sale={id:id("SAL"),invoice_no:invoice,sale_date:document.getElementById("saleDate").value,customer_code:customer?.code||"",customer_name:customer?.name||"Cash Customer",items:[{sku:p.sku,name:p.name,quantity:qty,unit_price:price,cost:num(p.cost)}],subtotal:qty*price,discount,total,paid,balance:total-paid,cogs,status:"posted"};
  state.sales.push(sale);
  p.qty=num(p.qty)-qty;
  state.stockMovements.push({id:id("STK"),occurred_at:sale.sale_date,sku:p.sku,product_name:p.name,quantity:-qty,type:"SALE",reference:invoice,cost:num(p.cost)});
  if(customer){customer.balance+=sale.balance}
  if(paid)state.payments.push({id:id("PAY"),occurred_at:sale.sale_date,party_type:"customer",party_code:customer?.code||"",party_name:customer?.name||"Cash Customer",amount:paid,method:"Cash",reference:invoice,status:"posted"});
  persist();log("create","sale",sale.id,invoice);alert("Sale saved: "+invoice);go("Invoices");
}
function purchases(c){
  c.innerHTML=`<div class="cards2"><div class="card"><h2>New Purchase</h2><div class="form-grid">
  <label>Date<input id="purDate" class="input" type="date" value="${today()}"></label>
  <label>Supplier<select id="purSupplier" class="input"><option value="">Select supplier</option>${supplierOptions()}</select></label>
  <label>Product<select id="purProduct" class="input">${productOptions()}</select></label>
  <label>Quantity<input id="purQty" class="input" type="number" min="0.01" step="0.01" value="1"></label>
  <label>Unit Cost<input id="purCost" class="input" type="number" min="0" step="1" placeholder="Purchase cost"></label>
  </div><button class="btn" onclick="createPurchase()">Save Purchase</button><div class="small form-note">Purchase updates stock and recalculates weighted-average cost.</div></div>
  <div class="card"><h2>Recent Purchases</h2><div class="table-wrap"><table class="table"><thead><tr><th>Bill</th><th>Date</th><th>Supplier</th><th>Total</th></tr></thead><tbody>${state.purchases.slice(-10).reverse().map(x=>`<tr><td>${esc(x.invoice_no)}</td><td>${esc(x.purchase_date)}</td><td>${esc(x.supplier_name||"-")}</td><td>${money(x.total)}</td></tr>`).join("")||`<tr><td colspan="4" class="small">No purchases yet</td></tr>`}</tbody></table></div></div></div>`;
}
function createPurchase(){
  const p=state.products.find(x=>x.sku===document.getElementById("purProduct").value), supplier=state.suppliers.find(x=>x.code===document.getElementById("purSupplier").value);
  const qty=num(document.getElementById("purQty").value), cost=num(document.getElementById("purCost").value);
  if(!p||!supplier||qty<=0||cost<0)return alert("Select supplier/product and enter valid quantity/cost.");
  const oldQty=num(p.qty), oldCost=num(p.cost), total=qty*cost, newQty=oldQty+qty;
  p.cost=newQty?((oldQty*oldCost)+(qty*cost))/newQty:cost;p.qty=newQty;
  const invoice="PUR-"+new Date().getFullYear()+"-"+String(state.purchases.length+1).padStart(5,"0");
  const paid=num(prompt("Amount paid now", "0")||0);if(paid<0||paid>total)return alert("Payment must be between 0 and total.");
  const pur={id:id("PUR"),invoice_no:invoice,purchase_date:document.getElementById("purDate").value,supplier_code:supplier.code,supplier_name:supplier.name,items:[{sku:p.sku,name:p.name,quantity:qty,unit_cost:cost}],total,paid,balance:total-paid,status:"posted"};
  state.purchases.push(pur);supplier.balance+=pur.balance;
  state.stockMovements.push({id:id("STK"),occurred_at:pur.purchase_date,sku:p.sku,product_name:p.name,quantity:qty,type:"PURCHASE",reference:invoice,cost:cost});
  if(paid)state.payments.push({id:id("PAY"),occurred_at:pur.purchase_date,party_type:"supplier",party_code:supplier.code,party_name:supplier.name,amount:paid,method:"Cash",reference:invoice,status:"posted"});
  persist();log("create","purchase",pur.id,invoice);alert("Purchase saved: "+invoice);go("Purchases");
}
function stock(c){
  c.innerHTML=`<div class="card panel"><div class="toolbar"><span class="badge">Movement-based inventory</span><span class="small">Every sale/purchase creates a stock movement.</span></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Product</th><th>Type</th><th>Qty</th><th>Reference</th><th>Unit Cost</th></tr></thead><tbody>${state.stockMovements.slice().reverse().map(x=>`<tr><td>${esc(x.occurred_at)}</td><td>${esc(x.product_name)}</td><td><span class="badge">${esc(x.type)}</span></td><td>${x.quantity>0?"+":""}${x.quantity}</td><td>${esc(x.reference)}</td><td>${money(x.cost)}</td></tr>`).join("")||`<tr><td colspan="6" class="small">No movements yet. Imported historical movements will appear here after migration.</td></tr>`}</tbody></table></div></div>`;
}
function ledger(c){
  const rows=[];
  state.customers.forEach(x=>{if(x.balance)rows.push({party:x.name,type:"Customer",balance:x.balance})});
  state.suppliers.forEach(x=>{if(x.balance)rows.push({party:x.name,type:"Supplier",balance:x.balance})});
  c.innerHTML=`<div class="card panel"><h2>Outstanding Ledger</h2><div class="table-wrap"><table class="table"><thead><tr><th>Party</th><th>Type</th><th>Balance</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.party)}</b></td><td><span class="badge">${x.type}</span></td><td>${money(x.balance)}</td></tr>`).join("")||`<tr><td colspan="3" class="small">No outstanding balances.</td></tr>`}</tbody></table></div><div class="notice" style="margin-top:14px">Detailed historical ledgers will be populated from the protected source workbooks during the migration phase.</div></div>`;
}
function payments(c){
  c.innerHTML=`<div class="card panel"><h2>Payments</h2><div class="toolbar"><button class="btn" onclick="addPayment()">+ Record Payment</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Party</th><th>Type</th><th>Amount</th><th>Reference</th></tr></thead><tbody>${state.payments.slice().reverse().map(x=>`<tr><td>${esc(x.occurred_at)}</td><td>${esc(x.party_name)}</td><td>${esc(x.party_type)}</td><td>${money(x.amount)}</td><td>${esc(x.reference||"-")}</td></tr>`).join("")||`<tr><td colspan="5" class="small">No payments yet.</td></tr>`}</tbody></table></div></div>`;
}
function addPayment(){
  const type=prompt("Type: customer or supplier","customer");if(!["customer","supplier"].includes(type))return;
  const arr=type==="customer"?state.customers:state.suppliers;if(!arr.length)return alert("No "+type+" accounts exist.");
  const code=prompt("Party code",arr[0].code), party=arr.find(x=>x.code.toLowerCase()===String(code||"").toLowerCase());if(!party)return alert("Party not found.");
  const amount=num(prompt("Amount","0"));if(amount<=0)return alert("Enter a positive amount.");
  if(type==="customer")party.balance=Math.max(0,party.balance-amount);else party.balance=Math.max(0,party.balance-amount);
  state.payments.push({id:id("PAY"),occurred_at:today(),party_type:type,party_code:party.code,party_name:party.name,amount,method:prompt("Method","Cash"),reference:prompt("Reference","")||"",status:"posted"});
  persist();log("create","payment",party.code,String(amount));payments(document.getElementById("content"));
}
function expenses(c){
  c.innerHTML=`<div class="card panel"><h2>Expenses</h2><div class="toolbar"><button class="btn" onclick="addExpense()">+ Add Expense</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>${state.expenses.slice().reverse().map(x=>`<tr><td>${esc(x.occurred_at)}</td><td>${esc(x.category)}</td><td>${esc(x.description)}</td><td>${money(x.amount)}</td></tr>`).join("")||`<tr><td colspan="4" class="small">No expenses yet.</td></tr>`}</tbody></table></div></div>`;
}
function addExpense(){
  const category=prompt("Expense category");if(!category)return;const amount=num(prompt("Amount","0"));if(amount<=0)return;
  state.expenses.push({id:id("EXP"),occurred_at:today(),category,description:prompt("Description","")||"",amount,status:"posted"});
  persist();log("create","expense",category,String(amount));expenses(document.getElementById("content"));
}
function reports(c){
  const sales=salesTotal(),cogs=cogsTotal(),exp=state.expenses.reduce((a,x)=>a+num(x.amount),0);
  c.innerHTML=`<div class="grid"><div class="card metric"><div class="label">Gross Sales</div><div class="value">${money(sales)}</div></div><div class="card metric"><div class="label">COGS</div><div class="value">${money(cogs)}</div></div><div class="card metric"><div class="label">Gross Profit</div><div class="value">${money(sales-cogs)}</div></div><div class="card metric"><div class="label">Expenses</div><div class="value">${money(exp)}</div></div></div>
  <div class="cards2 panel"><div class="card"><h2>Profit & Loss</h2><table class="table"><tbody><tr><td>Gross Sales</td><td>${money(sales)}</td></tr><tr><td>Less: COGS</td><td>${money(cogs)}</td></tr><tr><td><b>Gross Profit</b></td><td><b>${money(sales-cogs)}</b></td></tr><tr><td>Less: Expenses</td><td>${money(exp)}</td></tr><tr><td><b>Net Profit</b></td><td><b>${money(sales-cogs-exp)}</b></td></tr></tbody></table></div>
  <div class="card"><h2>Inventory</h2><div class="notice success">Current inventory value: <b>${money(inventoryValue())}</b></div><div class="small" style="margin-top:10px">Historical valuation and reconciliation will use imported source movements in the database phase.</div></div></div>`;
}
function invoices(c){
  c.innerHTML=`<div class="card panel"><h2>Invoices</h2><div class="table-wrap"><table class="table"><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th></th></tr></thead><tbody>${state.sales.slice().reverse().map(x=>`<tr><td><b>${esc(x.invoice_no)}</b></td><td>${esc(x.sale_date)}</td><td>${esc(x.customer_name)}</td><td>${money(x.total)}</td><td>${money(x.paid)}</td><td>${money(x.balance)}</td><td><button class="btn small-btn" onclick="printInvoice('${esc(x.id)}')">Print</button></td></tr>`).join("")||`<tr><td colspan="7" class="small">No invoices yet.</td></tr>`}</tbody></table></div></div>`;
}
function printInvoice(invoiceId){
  const s=state.sales.find(x=>x.id===invoiceId);if(!s)return;
  const w=window.open("","_blank");if(!w)return alert("Please allow pop-ups to print invoices.");
  w.document.write(`<!doctype html><html><head><title>${esc(s.invoice_no)}</title><style>body{font-family:Arial;padding:35px;color:#111}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:25px}th,td{border-bottom:1px solid #ddd;padding:10px;text-align:left}.totals{margin-left:auto;width:320px;margin-top:20px}.totals div{display:flex;justify-content:space-between;padding:5px}.grand{font-size:18px;font-weight:bold;border-top:2px solid #111}</style></head><body><h1>ARHAM ELECTRONICS</h1><p>Sales Invoice: <b>${esc(s.invoice_no)}</b><br>Date: ${esc(s.sale_date)}<br>Customer: ${esc(s.customer_name)}</p><table><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>${s.items.map(i=>`<tr><td>${esc(i.name)}</td><td>${i.quantity}</td><td>${money(i.unit_price)}</td><td>${money(i.quantity*i.unit_price)}</td></tr>`).join("")}</table><div class="totals"><div><span>Subtotal</span><span>${money(s.subtotal)}</span></div><div><span>Discount</span><span>${money(s.discount)}</span></div><div class="grand"><span>Total</span><span>${money(s.total)}</span></div><div><span>Paid</span><span>${money(s.paid)}</span></div><div><span>Balance</span><span>${money(s.balance)}</span></div></div><script>window.print()<\/script></body></html>`);w.document.close();
}
function settings(c){
  c.innerHTML=`<div class="cards2"><div class="card"><h2>System</h2><div class="notice">This browser build is a safe prototype layer. Original source workbooks are not stored here and are not modified.</div><p class="small">Next backend phase: persistent database, authentication, permissions, server-side accounting, migration staging and reconciliation.</p><button class="btn" onclick="exportBackup()">Export Prototype Backup</button></div><div class="card"><h2>Audit Log</h2><div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>${state.audit.slice().reverse().slice(0,20).map(x=>`<tr><td>${esc(x.occurred_at)}</td><td>${esc(x.action)}</td><td>${esc(x.entity_type)}</td><td>${esc(x.details)}</td></tr>`).join("")||`<tr><td colspan="4" class="small">No audit events yet.</td></tr>`}</tbody></table></div></div></div>`;
}
function exportBackup(){
  const blob=new Blob([JSON.stringify({...state,page:undefined},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="arham-erp-prototype-backup-"+today()+".json";a.click();URL.revokeObjectURL(a.href);
}
if(!state.products.length)state.products=JSON.parse(JSON.stringify(seed.products));
if(!state.customers.length)state.customers=JSON.parse(JSON.stringify(seed.customers));
persist();shell();