const CFG={
 sheets:{products:'Products',stock:'StockMovements',customers:'Customers',suppliers:'Suppliers',ledger:'LedgerEntries',settings:'Settings',sales:'Sales',saleItems:'SaleItems',purchases:'Purchases',purchaseItems:'PurchaseItems',payments:'Payments',expenses:'Expenses',audit:'AuditLog'},
 headers:{
 Sales:['SaleID','Date','CustomerID','InvoiceNo','Subtotal','Discount','NetTotal','Paid','Balance','Status','Notes','CreatedAt'],
 SaleItems:['SaleItemID','SaleID','ProductID','Description','Qty','UnitPrice','Discount','LineTotal','UnitCost','COGS'],
 Purchases:['PurchaseID','Date','SupplierID','ReferenceNo','Subtotal','Discount','NetTotal','Paid','Balance','Status','Notes','CreatedAt'],
 PurchaseItems:['PurchaseItemID','PurchaseID','ProductID','Description','Qty','UnitCost','Discount','LineTotal'],
 Payments:['PaymentID','Date','PartyType','PartyID','Direction','Amount','Method','Reference','Notes','CreatedAt'],
 Expenses:['ExpenseID','Date','Category','Description','Amount','PaymentMethod','Notes','CreatedAt'],
 AuditLog:['AuditID','Timestamp','Action','EntityType','EntityID','User','Details']
 }
};

function doGet(e){try{const p=(e&&e.parameter)||{},a=p.action||'health';return json_({ok:true,action:a,data:route_(a,p)});}catch(err){return json_({ok:false,error:String(err&&err.message||err)});}}
function doPost(e){try{const p=JSON.parse((e&&e.postData&&e.postData.contents)||'{}'),a=p.action||'';if(!a)throw Error('Missing action');return json_({ok:true,action:a,data:route_(a,p)});}catch(err){return json_({ok:false,error:String(err&&err.message||err)});}}

function route_(a,p){
 switch(String(a).toLowerCase()){
 case'health':return health_();case'dashboard':return dashboard_();case'products':return list_(CFG.sheets.products);
 case'customers':return list_(CFG.sheets.customers);case'suppliers':return list_(CFG.sheets.suppliers);
 case'stock':return stock_(p.productId);case'ledger':return ledger_(p.partyType,p.partyId);
 case'sale':return createSale_(p);case'purchase':return createPurchase_(p);case'payment':return createPayment_(p);
 case'expense':return createExpense_(p);case'bootstrap':return bootstrap_();default:throw Error('Unknown action: '+a);
 }
}

/* API names used by the existing App.html */
function apiDashboard(){return dashboard_();}
function apiProducts(){return list_(CFG.sheets.products);}
function apiCustomers(){return list_(CFG.sheets.customers);}
function apiSuppliers(){return list_(CFG.sheets.suppliers);}
function apiStock(id){return stock_(id);}
function apiLedger(t,id){return ledger_(t,id);}
function apiSale(p){return createSale_(p||{});}
function apiPurchase(p){return createPurchase_(p||{});}
function apiPayment(p){return createPayment_(p||{});}
function apiExpense(p){return createExpense_(p||{});}

function health_(){const ss=SpreadsheetApp.getActive();return{name:ss.getName(),spreadsheetId:ss.getId(),time:new Date().toISOString(),sheets:ss.getSheets().map(s=>s.getName())};}
function bootstrap_(){Object.keys(CFG.headers).forEach(k=>ensure_(k,CFG.headers[k]));return health_();}

function dashboard_(){
 const p=list_(CFG.sheets.products),c=list_(CFG.sheets.customers),s=list_(CFG.sheets.suppliers),sa=safe_(CFG.sheets.sales),pu=safe_(CFG.sheets.purchases),ex=safe_(CFG.sheets.expenses);
 let qty=0,val=0,low=0;p.forEach(x=>{let q=n(x.CurrentStock),cost=n(x.PurchasePrice);qty+=q;val+=q*cost;if(n(x.MinStock)>0&&q<=n(x.MinStock))low++;});
 return{productCount:p.length,customerCount:c.length,supplierCount:s.length,stockQty:qty,stockValue:val,lowStockCount:low,salesCount:sa.length,purchaseCount:pu.length,expenseCount:ex.length,salesTotal:sum(sa,'NetTotal'),purchasesTotal:sum(pu,'NetTotal'),expensesTotal:sum(ex,'Amount')};
}
function stock_(id){const r=list_(CFG.sheets.stock);return id?r.filter(x=>String(x.ProductID)===String(id)):r;}
function ledger_(t,id){return list_(CFG.sheets.ledger).filter(x=>(!t||String(x.PartyType).toLowerCase()===String(t).toLowerCase())&&(!id||String(x.PartyID)===String(id)));}

function createSale_(p){
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  const cid=String(p.customerId||'');if(!cid)throw Error('customerId is required');
  const items=Array.isArray(p.items)?p.items:[];if(!items.length)throw Error('At least one sale item is required');
  const date=p.date?new Date(p.date):new Date(),saleId=nextId_(CFG.sheets.sales,'SaleID','S'),invoice=String(p.invoiceNo||nextInvoice_());
  const map=index_(list_(CFG.sheets.products),'ProductID'),moves=[],rows=[];let sub=0,cogs=0;
  items.forEach((it,i)=>{const pid=String(it.productId||''),q=n(it.qty);if(!pid||q<=0)throw Error('Invalid sale item '+(i+1));const pr=map[pid];if(!pr)throw Error('Product not found: '+pid);const cur=n(pr.CurrentStock);if(cur<q)throw Error('Insufficient stock for '+pid+'. Current '+cur+', requested '+q);const price=n(it.unitPrice||pr.SalePrice),disc=n(it.discount),line=Math.max(0,q*price-disc),cost=n(it.unitCost||pr.PurchasePrice);sub+=q*price;cogs+=q*cost;rows.push([nextId_('SaleItems','SaleItemID','SI'),saleId,pid,String(it.description||pr.Description||''),q,price,disc,line,cost,q*cost]);pr.CurrentStock=cur-q;moves.push([nextId_('StockMovements','MovementID','MV'),pid,date,'sale',-q,'Sale '+invoice,cur-q,'ERP','Sales',saleId]);});
  const disc=n(p.discount),net=Math.max(0,sub-disc),paid=Math.max(0,n(p.paid)),bal=net-paid;
  ensure_('Sales',CFG.headers.Sales);ensure_('SaleItems',CFG.headers.SaleItems);rows.forEach(x=>append_('SaleItems',x));moves.forEach(x=>append_('StockMovements',x));
  append_('Sales',[saleId,date,cid,invoice,sub,disc,net,paid,bal,'posted',String(p.notes||''),new Date()]);writeProducts_(map);
  appendLedger_('customer',cid,date,'Sale '+invoice,invoice,net,0,'sale');if(paid)payment_({date:date,partyType:'customer',partyId:cid,direction:'in',amount:paid,method:String(p.paymentMethod||'cash'),reference:invoice,notes:'Sale payment'});
  audit_('create','sale',saleId,'ERP','Created sale '+invoice);return{saleId:saleId,invoiceNo:invoice,subtotal:sub,discount:disc,netTotal:net,paid:paid,balance:bal,cogs:cogs};
 }finally{lock.releaseLock();}
}

function createPurchase_(p){
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  const sid=String(p.supplierId||'');if(!sid)throw Error('supplierId is required');const items=Array.isArray(p.items)?p.items:[];if(!items.length)throw Error('At least one purchase item is required');
  const date=p.date?new Date(p.date):new Date(),id=nextId_(CFG.sheets.purchases,'PurchaseID','PU'),ref=String(p.referenceNo||id),map=index_(list_(CFG.sheets.products),'ProductID'),moves=[],rows=[];let sub=0;
  items.forEach((it,i)=>{const pid=String(it.productId||''),q=n(it.qty),cost=n(it.unitCost);if(!pid||q<=0||cost<0)throw Error('Invalid purchase item '+(i+1));const pr=map[pid];if(!pr)throw Error('Product not found: '+pid);const oldq=n(pr.CurrentStock),oldc=n(pr.PurchasePrice),newq=oldq+q;pr.CurrentStock=newq;pr.PurchasePrice=newq?((oldq*oldc)+(q*cost))/newq:cost;sub+=q*cost;rows.push([nextId_('PurchaseItems','PurchaseItemID','PI'),id,pid,String(it.description||pr.Description||''),q,cost,n(it.discount),Math.max(0,q*cost-n(it.discount))]);moves.push([nextId_('StockMovements','MovementID','MV'),pid,date,'purchase',q,'Purchase '+ref,newq,'ERP','Purchases',id]);});
  const disc=n(p.discount),net=Math.max(0,sub-disc),paid=Math.max(0,n(p.paid)),bal=net-paid;ensure_('Purchases',CFG.headers.Purchases);ensure_('PurchaseItems',CFG.headers.PurchaseItems);rows.forEach(x=>append_('PurchaseItems',x));moves.forEach(x=>append_('StockMovements',x));append_('Purchases',[id,date,sid,ref,sub,disc,net,paid,bal,'posted',String(p.notes||''),new Date()]);writeProducts_(map);
  appendLedger_('supplier',sid,date,'Purchase '+ref,ref,0,net,'purchase');if(paid)payment_({date:date,partyType:'supplier',partyId:sid,direction:'out',amount:paid,method:String(p.paymentMethod||'cash'),reference:ref,notes:'Purchase payment'});audit_('create','purchase',id,'ERP','Created purchase');return{purchaseId:id,subtotal:sub,discount:disc,netTotal:net,paid:paid,balance:bal};
 }finally{lock.releaseLock();}
}
function createPayment_(p){const lock=LockService.getScriptLock();lock.waitLock(30000);try{return payment_(p);}finally{lock.releaseLock();}}
function payment_(p){const t=String(p.partyType||'').toLowerCase(),id=String(p.partyId||''),amt=n(p.amount);if(!['customer','supplier'].includes(t)||!id||amt<=0)throw Error('Invalid payment');const date=p.date?new Date(p.date):new Date(),pid=nextId_(CFG.sheets.payments,'PaymentID','PAY');ensure_('Payments',CFG.headers.Payments);const dir=String(p.direction||(t==='customer'?'in':'out'));append_('Payments',[pid,date,t,id,dir,amt,String(p.method||'cash'),String(p.reference||''),String(p.notes||''),new Date()]);if(t==='customer')appendLedger_(t,id,date,'Payment '+pid,String(p.reference||pid),0,amt,'payment');else appendLedger_(t,id,date,'Payment '+pid,String(p.reference||pid),amt,0,'payment');audit_('create','payment',pid,'ERP','Created payment');return{paymentId:pid,amount:amt};}
function createExpense_(p){const amt=n(p.amount);if(amt<=0)throw Error('Expense amount must be greater than zero');const id=nextId_(CFG.sheets.expenses,'ExpenseID','EXP');ensure_('Expenses',CFG.headers.Expenses);append_('Expenses',[id,p.date?new Date(p.date):new Date(),String(p.category||'General'),String(p.description||''),amt,String(p.paymentMethod||'cash'),String(p.notes||''),new Date()]);audit_('create','expense',id,'ERP','Created expense');return{expenseId:id,amount:amt};}

function appendLedger_(t,id,date,particular,ref,debit,credit,type){const a=ledger_(t,id),last=a.length?a[a.length-1]:null,bal=(last?n(last.Balance):0)+n(debit)-n(credit),eid=nextId_(CFG.sheets.ledger,'EntryID','LE');append_('LedgerEntries',[eid,t,id,date,particular,ref,debit,credit,bal,'',bal,type,false,'ERP','ERP',eid]);return bal;}

function writeProducts_(map){const s=get_('Products');if(!s)return;const v=s.getDataRange().getValues();let hr=0;for(let i=0;i<Math.min(3,v.length);i++){if(v[i].some(x=>String(x).trim()!=='')){hr=i;break;}}const ix={};v[hr].forEach((h,i)=>ix[String(h)]=i);for(let r=hr+1;r<v.length;r++){const id=String(v[r][ix.ProductID]||'');if(map[id]){if(ix.CurrentStock!=null)v[r][ix.CurrentStock]=map[id].CurrentStock;if(ix.PurchasePrice!=null)v[r][ix.PurchasePrice]=map[id].PurchasePrice;}}s.getRange(1,1,v.length,v[0].length).setValues(v);}

function ensure_(name,headers){let s=get_(name);if(!s)s=SpreadsheetApp.getActive().insertSheet(name);if(s.getLastRow()===0)s.appendRow(headers);return s;}
function get_(name){return SpreadsheetApp.getActive().getSheetByName(name);}
function list_(name){const s=get_(name);if(!s)return[];const v=s.getDataRange().getValues();if(!v.length)return[];let hr=0;for(let i=0;i<Math.min(3,v.length);i++){if(v[i].some(x=>String(x).trim()!=='')){hr=i;break;}}const h=v[hr].map(x=>String(x||'').trim()),o=[];for(let r=hr+1;r<v.length;r++){if(v[r].every(x=>x===''||x==null))continue;const z={};h.forEach((k,i)=>{if(k)z[k]=v[r][i] instanceof Date?v[r][i].toISOString():v[r][i];});o.push(z);}return o;}
function safe_(name){try{return list_(name);}catch(e){return[];}}
function append_(name,row){get_(name).appendRow(row);}
function index_(rows,key){const o={};rows.forEach(r=>{if(r[key]!=null)o[String(r[key])]=r;});return o;}
function sum(a,k){return a.reduce((x,r)=>x+n(r[k]),0);}
function n(v){if(v===''||v==null)return 0;const x=Number(String(v).replace(/,/g,''));return isNaN(x)?0:x;}
function nextId_(sheet,col,prefix){const a=safe_(sheet);let m=0;a.forEach(r=>{const z=String(r[col]||'').match(/(\d+)$/);if(z)m=Math.max(m,Number(z[1]));});return prefix+String(m+1).padStart(6,'0');}
function nextInvoice_(){const s=get_('Settings');if(!s)return'INV-1';const v=s.getDataRange().getValues();for(let r=0;r<v.length;r++)if(String(v[r][0])==='NextSaleNo'){const x=n(v[r][1])||1;s.getRange(r+1,2).setValue(x+1);return'INV-'+x;}s.appendRow(['NextSaleNo',2]);return'INV-1';}
function audit_(a,t,id,u,d){ensure_('AuditLog',CFG.headers.AuditLog);append_('AuditLog',[nextId_('AuditLog','AuditID','AUD'),new Date(),a,t,id,u,d]);}
function json_(x){return ContentService.createTextOutput(JSON.stringify(x,function(k,v){return v instanceof Date?v.toISOString():v;})).setMimeType(ContentService.MimeType.JSON);}
