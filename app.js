(()=>{"use strict";
const API=(window.ERP_CONFIG||{}).API_URL, C=(window.ERP_CONFIG||{}).CURRENCY||"PKR";
const $=s=>document.querySelector(s), state={page:"dashboard",cache:{}};
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=x=>C+" "+Number(x||0).toLocaleString("en-PK",{maximumFractionDigits:2});
const date=x=>{if(!x)return"";let d=new Date(x);return isNaN(d)?esc(x):d.toLocaleDateString("en-GB")};
async function api(action,p={}){let q=new URLSearchParams({action,...p}),r=await fetch(API+"?"+q,{cache:"no-store"});if(!r.ok)throw Error("ERP backend returned HTTP "+r.status+".");let j=await r.json();if(!j.ok)throw Error(j.error||"Backend error");return j.data}
async function load(a,p={}){let k=a+JSON.stringify(p);if(state.cache[k])return state.cache[k];return state.cache[k]=await api(a,p)}
function toast(s){let t=$("#toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
function head(t,s){return `<div class="head"><div><h1>${t}</h1><p>${s}</p></div></div>`}
function table(h,rows){return rows.length?`<div class="tablewrap"><table class="table"><thead><tr>${h.map(x=>"<th>"+x+"</th>").join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`:`<div class="empty">No records found.</div>`}
async function dashboard(){let d=await load("dashboard");$("#page").innerHTML=head("Dashboard","Arham Electronics — business overview")+`
<div class="cards">
<div class="card"><div class="label">Products</div><div class="value">${d.productCount||0}</div></div>
<div class="card"><div class="label">Customers</div><div class="value">${d.customerCount||0}</div></div>
<div class="card"><div class="label">Suppliers</div><div class="value">${d.supplierCount||0}</div></div>
<div class="card"><div class="label">Stock Quantity</div><div class="value">${Number(d.stockQty||0).toLocaleString()}</div></div></div>
<div class="cards">
<div class="card"><div class="label">Sales Total</div><div class="value">${money(d.salesTotal)}</div></div>
<div class="card"><div class="label">Purchases Total</div><div class="value">${money(d.purchasesTotal)}</div></div>
<div class="card"><div class="label">Expenses</div><div class="value">${money(d.expensesTotal)}</div></div>
<div class="card"><div class="label">Low Stock</div><div class="value ${d.lowStockCount?"low":""}">${d.lowStockCount||0}</div></div></div>
<div class="grid2"><div class="panel"><h3>Business Activity</h3>${table(["Module","Records"],[
`<tr><td>Sales</td><td>${d.salesCount||0}</td></tr>`,`<tr><td>Purchases</td><td>${d.purchaseCount||0}</td></tr>`,`<tr><td>Expenses</td><td>${d.expenseCount||0}</td></tr>`])}</div>
<div class="panel"><h3>Stock Position</h3><p>Stock value: <b>${money(d.stockValue)}</b></p><p>Low stock items: <b>${d.lowStockCount||0}</b></p></div></div>`}
async function list(a,t,s,h,fn){let rows=await load(a);$("#page").innerHTML=head(t,s)+`<div class="panel"><input id="search" class="search" placeholder="Search..."><div id="tbl"></div></div>`;let draw=f=>$("#tbl").innerHTML=table(h,rows.filter(x=>JSON.stringify(x).toLowerCase().includes(f.toLowerCase())).map(fn));draw("");$("#search").oninput=e=>draw(e.target.value)}
async function customers(){await list("customers","Customers","Customer master data",["ID","Customer Name","Phone","Balance"],r=>`<tr><td>${esc(r.CustomerID)}</td><td><b>${esc(r.Name||r.CustomerName||r.Description||"")}</b></td><td>${esc(r.Phone||r.Mobile||"")}</td><td>${money(r.Balance||r.CurrentBalance)}</td></tr>`)}
async function suppliers(){await list("suppliers","Suppliers","Supplier master data",["ID","Supplier Name","Phone","Balance"],r=>`<tr><td>${esc(r.SupplierID)}</td><td><b>${esc(r.Name||r.SupplierName||r.Description||"")}</b></td><td>${esc(r.Phone||r.Mobile||"")}</td><td>${money(r.Balance||r.CurrentBalance)}</td></tr>`)}
async function products(){await list("products","Products / Stock","Product description is displayed for users",["Product","Brand","Stock","Sale Price","Purchase Price"],r=>`<tr><td><b>${esc(r.Description||r.ProductName||r.Name||"")}</b><br><small>${esc(r.ProductID)}</small></td><td>${esc(r.Brand||r.Manufacturer||"")}</td><td>${esc(r.CurrentStock||0)}</td><td>${money(r.SalePrice)}</td><td>${money(r.PurchasePrice)}</td></tr>`)}
async function sales(){await list("sales","Sales","Customer sales",["Date","Invoice","Customer","Net Total","Paid","Balance"],r=>`<tr><td>${date(r.Date)}</td><td><span class="pill">${esc(r.InvoiceNo||r.SaleID)}</span></td><td>${esc(r.CustomerName||r.Name||r.CustomerID)}</td><td>${money(r.NetTotal)}</td><td>${money(r.Paid)}</td><td>${money(r.Balance)}</td></tr>`)}
async function purchases(){await list("purchases","Purchases","Supplier purchases",["Date","Reference","Supplier","Net Total","Paid","Balance"],r=>`<tr><td>${date(r.Date)}</td><td><span class="pill">${esc(r.ReferenceNo||r.PurchaseID)}</span></td><td>${esc(r.SupplierName||r.Name||r.SupplierID)}</td><td>${money(r.NetTotal)}</td><td>${money(r.Paid)}</td><td>${money(r.Balance)}</td></tr>`)}
async function payments(){await list("payments","Payments","Customer and supplier payments",["Date","Party","Direction","Amount","Method","Reference"],r=>`<tr><td>${date(r.Date)}</td><td>${esc(r.PartyID)}</td><td>${esc(r.Direction)}</td><td>${money(r.Amount)}</td><td>${esc(r.Method)}</td><td>${esc(r.Reference)}</td></tr>`)}
async function expenses(){await list("expenses","Expenses","Business expenses",["Date","Category","Description","Amount","Method"],r=>`<tr><td>${date(r.Date)}</td><td>${esc(r.Category)}</td><td>${esc(r.Description)}</td><td>${money(r.Amount)}</td><td>${esc(r.PaymentMethod)}</td></tr>`)}
async function ledger(){let type=prompt("Party type: customer or supplier","customer");if(!type)return;let id=prompt("Enter Customer/Supplier ID");if(!id)return;let rows=await load("ledger",{partyType:type,partyId:id});$("#page").innerHTML=head("Ledger",type+" — "+id)+`<div class="panel">${table(["Date","Particular","Reference","Debit","Credit","Balance"],rows.map(r=>`<tr><td>${date(r.Date)}</td><td>${esc(r.Particular)}</td><td>${esc(r.Reference)}</td><td>${money(r.Debit)}</td><td>${money(r.Credit)}</td><td>${money(r.Balance)}</td></tr>`))}</div>`}
async function nav(p){state.page=p;document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));$("#sidebar").classList.remove("open");$("#page").innerHTML='<div class="panel"><div class="empty">Loading…</div></div>';try{await ({dashboard,sales,purchases,customers,suppliers,products,payments,expenses,ledger}[p]||dashboard)()}catch(e){$("#page").innerHTML=`<div class="panel"><div class="empty">${esc(e.message)}</div></div>`;toast(e.message)}}
async function health(){try{await api("health");$("#connectionBadge").textContent="Backend Connected";$("#connectionBadge").className="badge ok"}catch(e){$("#connectionBadge").textContent="Backend Error";$("#connectionBadge").className="badge bad"}}
document.addEventListener("click",e=>{let n=e.target.closest(".nav");if(n)nav(n.dataset.page)});
$("#mobileMenu").onclick=()=>$("#sidebar").classList.toggle("open");
$("#refreshBtn").onclick=()=>{state.cache={};health();nav(state.page)};
health();nav("dashboard");
})();