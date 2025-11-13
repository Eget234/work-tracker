// ---- Şifre kapısı ----
async function sha256Hex(s){
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
document.getElementById('gateBtn').addEventListener('click', async ()=>{
  const val = (document.getElementById('gatePw').value||'').trim();
  const hex = await sha256Hex(val);
  const msg = document.getElementById('gateMsg');
  if(hex === window.HELLO_HASH){
    document.getElementById('gate').style.display='none';
    document.getElementById('auth').hidden = false;
  }else{ msg.textContent = "Şifre yanlış."; }
});

const DB_KEY = "taskapp.db.v2";
function loadDB(){ try{ return JSON.parse(localStorage.getItem(DB_KEY)) || {}; }catch{ return {}; } }
function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

(function seed(){
  const db = loadDB();
  if(!db.users){ db.users = [{id:"u_admin", name:"admin", pass:"Admin@123", role:"admin"}]; }
  if(!db.stages){ db.stages = ["Backlog","In Progress","Review","Done"]; }
  if(!db.tasks){ db.tasks = []; }
  if(!db.templates){
    db.templates = [{id:"tpl_eta", name:"ETA Süreci", steps:["Placed","ETA'ya Sipariş Girişi","Proforma Al","Proforma Onay","Sevk","Fatura Girişi","Depo Giriş","Done"]}];
  }
  if(!db.orders){ db.orders = []; }
  saveDB(db);
})();

let currentUser=null;
function renderWho(){ document.getElementById('whoami').textContent = currentUser ? `${currentUser.name} (${currentUser.role})` : "-"; }
function isAdmin(){ return currentUser && currentUser.role==="admin"; }
document.getElementById('loginBtn').addEventListener('click', ()=>{
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const db = loadDB();
  const found = (db.users||[]).find(u=>u.name===user && u.pass===pass);
  const msg = document.getElementById('authMsg');
  if(found){
    currentUser=found;
    document.getElementById('auth').hidden=true;
    document.getElementById('app').hidden=false;
    renderWho(); renderTabs(); renderUsers(); renderStages(); renderTemplates(); fillAssigneeOptions(); fillStageOptions(); renderTasks(); renderOrders();
  }else{ msg.textContent="Kullanıcı adı veya şifre hatalı."; }
});
document.getElementById('loginUser').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('loginBtn').click(); });
document.getElementById('loginPass').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('loginBtn').click(); });
document.getElementById('logout').addEventListener('click', ()=>{ currentUser=null; document.getElementById('app').hidden=true; document.getElementById('auth').hidden=false; });
document.getElementById('resetDb').addEventListener('click', ()=>{ if(confirm('Tüm veriler silinsin mi?')){ localStorage.removeItem(DB_KEY); location.reload(); } });

// Tabs
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    const tab=btn.dataset.tab;
    document.getElementById('tab-orders').hidden = tab!=='orders';
    document.getElementById('tab-tasks').hidden = tab!=='tasks';
    document.getElementById('tab-admin').hidden = tab!=='admin';
    document.getElementById('tab-settings').hidden = tab!=='settings';
  });
});
function renderTabs(){ const b=[...document.querySelectorAll('.tab')].find(x=>x.dataset.tab==='admin'); b.style.display=isAdmin()?'inline-block':'none'; }

// Users
function renderUsers(){
  const db=loadDB(); const body=document.getElementById('userBody'); body.innerHTML='';
  (db.users||[]).forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${u.name}</td><td><span class="badge">${u.role}</span></td><td>${u.name!=='admin'?`<button class="ghost" data-del="${u.id}">Sil</button>`:''}</td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll('button[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const id=btn.dataset.del; if(!confirm('Kullanıcı silinsin mi?')) return; const db2=loadDB(); db2.users=db2.users.filter(x=>x.id!==id); saveDB(db2); renderUsers(); fillAssigneeOptions(); renderOrders(); });
  });
}
document.getElementById('uAdd').addEventListener('click', ()=>{
  if(!isAdmin()) return alert('Sadece admin kullanıcı ekleyebilir.');
  const name=document.getElementById('uName').value.trim(); const pass=document.getElementById('uPass').value; const role=document.getElementById('uRole').value;
  if(!name||!pass) return alert('Ad ve şifre gerekli.');
  const db=loadDB(); if(db.users.some(u=>u.name===name)) return alert('Bu isimde kullanıcı var.');
  const id='u_'+Math.random().toString(36).slice(2,8); db.users.push({id,name,pass,role}); saveDB(db);
  document.getElementById('uName').value=''; document.getElementById('uPass').value=''; renderUsers(); fillAssigneeOptions(); renderOrders();
});

// Stages
function renderStages(){
  const db=loadDB(); const list=document.getElementById('stageList'); list.innerHTML='';
  (db.stages||[]).forEach((s,i)=>{ const li=document.createElement('li'); li.innerHTML=`${i+1}. ${s} ${isAdmin()?`<button class="ghost" data-rm="${i}">Kaldır</button>`:''}`; list.appendChild(li); });
  list.querySelectorAll('button[data-rm]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ if(!isAdmin()) return; const idx=+btn.dataset.rm; const db2=loadDB(); db2.stages.splice(idx,1); saveDB(db2); renderStages(); fillStageOptions(); renderTasks(); });
  });
}
document.getElementById('stageAdd').addEventListener('click', ()=>{
  if(!isAdmin()) return; const val=document.getElementById('stageInput').value.trim(); if(!val) return;
  const db=loadDB(); db.stages.push(val); saveDB(db); document.getElementById('stageInput').value=''; renderStages(); fillStageOptions();
});
document.getElementById('stageReset').addEventListener('click', ()=>{
  if(!isAdmin()) return; const db=loadDB(); db.stages=["Backlog","In Progress","Review","Done"]; saveDB(db); renderStages(); fillStageOptions(); renderTasks();
});
function fillAssigneeOptions(){
  const db=loadDB(); const sel1=document.getElementById('tAssignee'); const sel2=document.getElementById('oFirstAssignee');
  [sel1, sel2].forEach(sel=>{ if(!sel) return; sel.innerHTML=''; (db.users||[]).forEach(u=>{ const o=document.createElement('option'); o.value=u.id; o.textContent=u.name+(u.role==='admin'?' (admin)':''); sel.appendChild(o); }); });
}
function fillStageOptions(){ const db=loadDB(); const sel=document.getElementById('tStage'); sel.innerHTML=''; (db.stages||[]).forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; sel.appendChild(o); }); }

// Templates
function renderTemplates(){
  const db=loadDB(); const list=document.getElementById('tplList'); const sel=document.getElementById('oTemplate'); list.innerHTML=''; sel.innerHTML='';
  (db.templates||[]).forEach(tpl=>{ const li=document.createElement('li'); li.textContent=`${tpl.name}: ${tpl.steps.join(' → ')}`; list.appendChild(li); const o=document.createElement('option'); o.value=tpl.id; o.textContent=tpl.name; sel.appendChild(o); });
}
document.getElementById('tplAdd').addEventListener('click', ()=>{
  if(!isAdmin()) return; const name=document.getElementById('tplName').value.trim(); const steps=document.getElementById('tplSteps').value.split(',').map(s=>s.trim()).filter(Boolean);
  if(!name||steps.length<2) return alert('En az 2 adım olmalı.');
  const db=loadDB(); const id='tpl_'+Math.random().toString(36).slice(2,8); db.templates.push({id,name,steps}); saveDB(db); document.getElementById('tplName').value=''; document.getElementById('tplSteps').value=''; renderTemplates();
});
document.getElementById('tplReset').addEventListener('click', ()=>{
  if(!isAdmin()) return; const db=loadDB(); db.templates=[{id:"tpl_eta", name:"ETA Süreci", steps:["Placed","ETA'ya Sipariş Girişi","Proforma Al","Proforma Onay","Sevk","Fatura Girişi","Depo Giriş","Done"]}]; saveDB(db); renderTemplates();
});

// Orders
function renderOrders(){
  const db=loadDB(); const showArchived=document.getElementById('showArchived').checked; const body=document.getElementById('orderBody'); body.innerHTML='';
  (db.orders||[]).filter(o=> showArchived || !o.archived).forEach(o=>{
    const step=o.steps[o.idx]||'Done'; const user=(db.users||[]).find(u=>u.id===o.currentAssignee);
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${o.code}</td>
      <td>${o.placedAt}</td>
      <td><span class="badge ${step==='Done'?'done':'warn'}">${step}</span></td>
      <td>
        <select class="small" data-assign="${o.id}">
          ${(db.users||[]).map(u=>`<option value="${u.id}" ${u.id===o.currentAssignee?'selected':''}>${u.name}</option>`).join('')}
        </select>
      </td>
      <td>${o.archived?'<span class="badge done">Arşiv</span>':'<span class="badge warn">Aktif</span>'}</td>
      <td>
        ${canActOn(o)?`<button data-done="${o.id}">Yapıldı</button>`:''}
        ${isAdmin()?` <button class="ghost" data-archive="${o.id}">${o.archived?'Geri Al':'Arşivle'}</button>`:''}
      </td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll('select[data-assign]').forEach(sel=>{
    sel.addEventListener('change', ()=>{ const id=sel.dataset.assign; const db2=loadDB(); const o=db2.orders.find(x=>x.id===id); o.currentAssignee=sel.value; saveDB(db2); renderOrders(); });
  });
  body.querySelectorAll('button[data-done]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const id=btn.dataset.done; const db2=loadDB(); const o=db2.orders.find(x=>x.id===id); if(!canActOn(o)) return alert('Sadece atanan kişi veya admin ilerletebilir.'); o.idx=Math.min(o.idx+1, o.steps.length-1); if(o.steps[o.idx]==='Done'){ o.archived=true; } saveDB(db2); renderOrders(); });
  });
  body.querySelectorAll('button[data-archive]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const id=btn.dataset.archive; const db2=loadDB(); const o=db2.orders.find(x=>x.id===id); o.archived=!o.archived; saveDB(db2); renderOrders(); });
  });
}
function canActOn(o){ return isAdmin() || (currentUser && currentUser.id===o.currentAssignee); }
document.getElementById('showArchived').addEventListener('change', renderOrders);
document.getElementById('oAdd').addEventListener('click', ()=>{
  if(!isAdmin()) return alert('Sadece admin sipariş açabilir.');
  const code=document.getElementById('oCode').value.trim();
  const placed=document.getElementById('oPlaced').value;
  const tplId=document.getElementById('oTemplate').value;
  const assignee=document.getElementById('oFirstAssignee').value;
  if(!code) return alert('Kod gerekli.');
  const db=loadDB(); if((db.orders||[]).some(o=>o.code===code)) return alert('Bu kod zaten var (unique olmalı).');
  const tpl=(db.templates||[]).find(t=>t.id===tplId);
  const id='o_'+Math.random().toString(36).slice(2,8);
  db.orders.push({id, code, placedAt: placed || new Date().toISOString().slice(0,10), tplId, steps: tpl?tpl.steps:["Placed","Done"], idx:0, archived:false, currentAssignee: assignee});
  saveDB(db); document.getElementById('oCode').value=''; renderOrders();
});

// Tasks (v1)
function renderTasks(){
  const db=loadDB(); const onlyMine=document.getElementById('onlyMine').checked; const hideDone=document.getElementById('hideDone').checked; const body=document.getElementById('taskBody'); body.innerHTML='';
  const meId=currentUser?.id;
  (db.tasks||[]).filter(t=>{ if(onlyMine && t.assignee!==meId) return false; if(hideDone && t.status==='Done') return false; return true; }).forEach((t,i)=>{
    const user=(db.users||[]).find(u=>u.id===t.assignee); const nextStage=nextStageOf(t.stage); const canAdvance=(currentUser && (currentUser.id===t.assignee || isAdmin()));
    const tr=document.createElement('tr'); tr.innerHTML=`
      <td>${i+1}</td><td>${t.title}</td><td>${user?user.name:'-'}</td>
      <td><span class="badge ${t.stage==='Done'?'done':'warn'}">${t.stage}</span></td>
      <td>${t.status==='Done'?'<span class="badge done">Tamamlandı</span>':'<span class="badge warn">Devam</span>'}</td>
      <td>${canAdvance && nextStage?`<button data-adv="${t.id}">Aşama: ${nextStage} →</button>`:''}
          ${canAdvance && !nextStage?`<button data-done="${t.id}">Bitir</button>`:''}
          ${isAdmin()?`<button class="ghost" data-del="${t.id}">Sil</button>`:''}</td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll('button[data-adv]').forEach(btn=>{ btn.addEventListener('click', ()=>{ const id=btn.dataset.adv; const db2=loadDB(); const t=db2.tasks.find(x=>x.id===id); t.stage=nextStageOf(t.stage); saveDB(db2); renderTasks(); }); });
  body.querySelectorAll('button[data-done]').forEach(btn=>{ btn.addEventListener('click', ()=>{ const id=btn.dataset.done; const db2=loadDB(); const t=db2.tasks.find(x=>x.id===id); t.stage="Done"; t.status="Done"; saveDB(db2); renderTasks(); }); });
  body.querySelectorAll('button[data-del]').forEach(btn=>{ btn.addEventListener('click', ()=>{ if(!confirm('Görev silinsin mi?')) return; const id=btn.dataset.del; const db2=loadDB(); db2.tasks=db2.tasks.filter(x=>x.id!==id); saveDB(db2); renderTasks(); }); });
}
function nextStageOf(stage){ const db=loadDB(); const idx=(db.stages||[]).indexOf(stage); if(idx>=0 && idx<db.stages.length-1) return db.stages[idx+1]; return null; }
document.getElementById('tAdd').addEventListener('click', ()=>{
  if(!isAdmin()) return alert('Sadece admin görev ekleyebilir.');
  const title=document.getElementById('tTitle').value.trim(); const assignee=document.getElementById('tAssignee').value; const stage=document.getElementById('tStage').value;
  if(!title) return alert('Başlık gir.'); const db=loadDB(); const id='t_'+Math.random().toString(36).slice(2,10);
  db.tasks.push({id,title,assignee,stage,status: stage==='Done'?'Done':'Open', createdAt: Date.now()}); saveDB(db); document.getElementById('tTitle').value=''; renderTasks();
});
document.getElementById('onlyMine').addEventListener('change', renderTasks);
document.getElementById('hideDone').addEventListener('change', renderTasks);
