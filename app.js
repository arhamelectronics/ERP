const state = {
  products: JSON.parse(localStorage.getItem('ae_products') || '[]'),
  customers: JSON.parse(localStorage.getItem('ae_customers') || '[]'),
  suppliers: JSON.parse(localStorage.getItem('ae_suppliers') || '[]'),
  sales: JSON.parse(localStorage.getItem('ae_sales') || '[]'),
  purchases: JSON.parse(localStorage.getItem('ae_purchases') || '[]'),
  payments: JSON.parse(localStorage.getItem('ae_payments') || '[]'),
  expenses: JSON.parse(localStorage.getItem('ae_expenses') || '[]'),
  movements: JSON.parse(localStorage.getItem('ae_movements') || '[]')
};

const money = n => 'Rs ' + Number(n || 0).toLocaleString('en-PK', {minimumFractionDigits:2, maximumFractionDigits:2});
const save = () => Object.entries(state).forEach(([k,v]) => localStorage.setItem('ae_'+k, JSON.stringify(v)));

function setView(view) {
  document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('active', x.dataset.view === view));
  document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.target === view));
  const titles = {dashboard:'Dashboard',products:'Products & Inventory',sales:'Sales',purchases:'Purchases',customers:'Customers',suppliers:'Suppliers',ledger:'Ledgers',payments:'Payments',expenses:'Expenses',reports:'Reports',settings:'Settings'};
  document.getElementById('pageTitle').textContent = titles[view] || 'Dashboard';
  document.querySelectorAll('.view').forEach(x => x.classList.toggle('hidden', x.dataset.view !== view));
  if(view === 'dashboard') renderDashboard();
  if(view === 'products') renderProducts();
  if(view === 'customers') renderContacts('customers');
  if(view === 'suppliers') renderContacts('suppliers');
}
document.querySelectorAll('.nav-item').forEach(x => x.onclick = () => setView(x.dataset.target));

function renderDashboard() {
  document.getElementById('statProducts').textContent = state.products.length;
  document.getElementById('statCustomers').textContent = state.customers.length;
  document.getElementById('statSuppliers').textContent = state.suppliers.length;
  document.getElementById('statSales').textContent = money(state.sales.reduce((s,x)=>s+Number(x.total||0),0));
  document.getElementById('recentActivity').innerHTML = [
    ...state.sales.map(x=>({date:x.date||'',type:'Sale',ref:x.invoice||'-',amount:x.total||0})),
    ...state.purchases.map(x=>({date:x.date||'',type:'Purchase',ref:x.ref||'-',amount:x.total||0}))
  ].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8).map(x=>`<tr><td>${x.date}</td><td><span class="badge ${x.type==='Sale'?'sale':'purchase'}">${x.type}</span></td><td>${x.ref}</td><td class="text-right">${money(x.amount)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No transactions yet</td></tr>';
}
function renderProducts() {
  document.getElementById('productCount').textContent = state.products.length;
  document.getElementById('productsBody').innerHTML = state.products.map((p,i)=>`<tr><td>${p.sku||'-'}</td><td><strong>${p.name||'-'}</strong></td><td>${p.category||'-'}</td><td>${p.qty||0}</td><td>${money(p.cost||0)}</td><td>${money((p.qty||0)*(p.cost||0))}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No products imported yet.</td></tr>';
}
function renderContacts(type) {
  const arr=state[type]||[];
  const body=document.getElementById(type+'Body');
  body.innerHTML=arr.map(x=>`<tr><td><strong>${x.name||'-'}</strong></td><td>${x.phone||'-'}</td><td>${x.address||'-'}</td><td>${money(x.balance||0)}</td></tr>`).join('') || `<tr><td colspan="4" class="empty">No ${type} imported yet.</td></tr>`;
}
function exportBackup(){
  const blob=new Blob([JSON.stringify({version:1,createdAt:new Date().toISOString(),state},null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='arham-erp-backup.json'; a.click(); URL.revokeObjectURL(a.href);
}
function importBackup(input){
  const file=input.files[0]; if(!file)return;
  const reader=new FileReader(); reader.onload=()=>{try{
    const incoming=JSON.parse(reader.result); Object.keys(state).forEach(k=>{if(Array.isArray(incoming.state?.[k])) state[k]=incoming.state[k]});
    save(); setView('dashboard'); alert('Backup restored successfully.');
  }catch(e){alert('Invalid backup file.')} }; reader.readAsText(file);
}
document.getElementById('backupBtn').onclick=exportBackup;
document.getElementById('restoreInput').onchange=e=>importBackup(e.target);
document.getElementById('globalSearch').oninput=e=>{
  const q=e.target.value.trim().toLowerCase(); if(!q)return;
  const hits=[...state.products.map(x=>({kind:'Product',name:x.name,ref:x.sku})),...state.customers.map(x=>({kind:'Customer',name:x.name,ref:x.phone})),...state.suppliers.map(x=>({kind:'Supplier',name:x.name,ref:x.phone}))].filter(x=>JSON.stringify(x).toLowerCase().includes(q)).slice(0,8);
  const box=document.getElementById('searchResults'); box.innerHTML=hits.map(x=>`<div><b>${x.kind}</b> · ${x.name||'-'} <small>${x.ref||''}</small></div>`).join('') || '<div>No matches</div>'; box.classList.add('show');
};
document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))document.getElementById('searchResults').classList.remove('show')});
renderDashboard();
