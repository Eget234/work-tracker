// Şifre kapısı: HELLOWORLD (SHA-256 karşılaştırması)
const HELLO_HASH = window.HELLO_HASH;

async function sha256Hex(s){
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

const gate = document.getElementById('gate');
document.getElementById('gateBtn').addEventListener('click', async ()=>{
  const val = (document.getElementById('gatePw').value||'').trim();
  const hex = await sha256Hex(val);
  const msg = document.getElementById('gateMsg');
  if(hex === HELLO_HASH){
    gate.style.display = 'none';
    document.getElementById('auth').hidden = false;
  }else{
    msg.textContent = "Şifre yanlış.";
  }
});

// ---- Basit depolama katmanı (localStorage) ----
const DB_KEY = "taskapp.db.v1";
function loadDB(){
  try{
    return JSON.parse(localStorage.getItem(DB_KEY)) || {};
  }catch{ return {}; }
}
function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

// ilk kurulum
(function seed(){
  const db = loadDB();
  if(!db.users){
    db.users = [
      {id: "u_admin", name:"admin", pass:"Admin@123", role:"admin"},
    ];
  }
  if(!db.stages){
    db.stages = ["Backlog","In Progress","Review","Done"];
  }
  if(!db.tasks){ db.tasks = []; }
  if(!db.sessions){ db.sessions = {}; }
  saveDB(db);
})();

// ---- Auth ----
let currentUser = null;
function renderWho(){ document.getElementById('whoami').textContent = currentUser ? `${currentUser.name} (${currentUser.role})` : "-"; }
function isAdmin(){ return currentUser && currentUser.role === "admin"; }

document.getElementById('loginBtn').addEventListener('click', ()=>{
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const db = loadDB();
  const found = (db.users||[]).find(u => u.name === user && u.pass === pass);
  const msg = document.getElementById('authMsg');
  if(found){
    currentUser = found;
    document.getElementById('auth').hidden = true;
    document.getElementById('app').hidden = false;
    renderWho();
    renderTabs();
    renderUsers();
    renderStages();
    fillAssigneeOptions();
    fillStageOptions();
    renderTasks();
  }else{
    msg.textContent = "Kullanıcı adı veya şifre hatalı.";
  }
});

document.getElementById('logout').addEventListener('click', ()=>{
  currentUser = null;
  document.getElementById('app').hidden = true;
  document.getElementById('auth').hidden = false;
});

// ---- Tabs ----
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-tasks').hidden = tab!=='tasks';
    document.getElementById('tab-admin').hidden = tab!=='admin';
    document.getElementById('tab-settings').hidden = tab!=='settings';
  });
});
function renderTabs(){
  // admin değilse Admin sekmesini gizle
  const adminTabBtn = [...document.querySelectorAll('.tab')].find(b=>b.dataset.tab==='admin');
  adminTabBtn.style.display = isAdmin() ? 'inline-block' : 'none';
}

// ---- Users ----
function renderUsers(){
  const db = loadDB();
  const body = document.getElementById('userBody');
  body.innerHTML = '';
  (db.users||[]).forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.name}</td><td><span class="badge">${u.role}</span></td>
      <td><button class="ghost" data-del="${u.id}">Sil</button></td>`;
    body.appendChild(tr);
  });
  // delete
  body.querySelectorAll('button[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.del;
      if(!confirm('Kullanıcı silinsin mi?')) return;
      const db2 = loadDB();
      db2.users = (db2.users||[]).filter(x=>x.id!==id);
      saveDB(db2);
      renderUsers();
      fillAssigneeOptions();
    });
  });
}
document.getElementById('uAdd').addEventListener('click', ()=>{
  if(!isAdmin()) return alert('Sadece admin kullanıcı ekleyebilir.');
  const name = document.getElementById('uName').value.trim();
  const pass = document.getElementById('uPass').value;
  const role = document.getElementById('uRole').value;
  if(!name || !pass) return alert('Ad ve şifre gerekli.');
  const db = loadDB();
  if((db.users||[]).some(u=>u.name===name)) return alert('Bu isimde kullanıcı var.');
  const id = 'u_'+Math.random().toString(36).slice(2,8);
  db.users.push({id, name, pass, role});
  saveDB(db);
  document.getElementById('uName').value=''; document.getElementById('uPass').value='';
  renderUsers(); fillAssigneeOptions();
});

// ---- Stages (workflow) ----
function renderStages(){
  const db = loadDB();
  const list = document.getElementById('stageList');
  list.innerHTML='';
  (db.stages||[]).forEach((s,i)=>{
    const li = document.createElement('li');
    li.innerHTML = `${i+1}. ${s} <button class="ghost" data-rm="${i}">Kaldır</button>`;
    list.appendChild(li);
  });
  list.querySelectorAll('button[data-rm]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(!isAdmin()) return alert('Sadece admin aşama kaldırabilir.');
      const idx = +btn.dataset.rm;
      const db2 = loadDB();
      db2.stages.splice(idx,1);
      saveDB(db2);
      renderStages(); fillStageOptions(); renderTasks();
    });
  });
}
document.getElementById('stageAdd').addEventListener('click', ()=>{
  if(!isAdmin()) return alert('Sadece admin aşama ekleyebilir.');
  const val = document.getElementById('stageInput').value.trim();
  if(!val) return;
  const db = loadDB();
  db.stages.push(val);
  saveDB(db);
  document.getElementById('stageInput').value='';
  renderStages(); fillStageOptions();
});
document.getElementById('stageReset').addEventListener('click', ()=>{
  if(!isAdmin()) return alert('Sadece admin sıfırlayabilir.');
  const db = loadDB();
  db.stages = ["Backlog","In Progress","Review","Done"];
  saveDB(db);
  renderStages(); fillStageOptions(); renderTasks();
});

function fillAssigneeOptions(){
  const db = loadDB();
  const sel = document.getElementById('tAssignee');
  sel.innerHTML='';
  (db.users||[]).forEach(u=>{
    const o = document.createElement('option');
    o.value = u.id; o.textContent = u.name + (u.role==='admin'?' (admin)':''); sel.appendChild(o);
  });
}
function fillStageOptions(){
  const db = loadDB();
  const sel = document.getElementById('tStage');
  sel.innerHTML='';
  (db.stages||[]).forEach(s=>{
    const o = document.createElement('option');
    o.value = s; o.textContent = s; sel.appendChild(o);
  });
}

// ---- Tasks ----
function renderTasks(){
  const db = loadDB();
  const onlyMine = document.getElementById('onlyMine').checked;
  const hideDone = document.getElementById('hideDone').checked;
  const body = document.getElementById('taskBody');
  body.innerHTML='';
  const meId = currentUser?.id;
  (db.tasks||[]).filter(t=>{
    if(onlyMine && t.assignee!==meId) return false;
    if(hideDone && t.status==='Done') return false;
    return true;
  }).forEach((t,i)=>{
    const user = (db.users||[]).find(u=>u.id===t.assignee);
    const canAdvance = (currentUser && (currentUser.id===t.assignee || isAdmin()));
    const nextStage = nextStageOf(t.stage);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${t.title}</td>
      <td>${user?user.name:'-'}</td>
      <td><span class="badge ${t.stage==='Done'?'done':''}">${t.stage}</span></td>
      <td>${t.status==='Done' ? '<span class="badge done">Tamamlandı</span>' : '<span class="badge warn">Devam</span>'}</td>
      <td>
        ${canAdvance && nextStage ? `<button data-adv="${t.id}">Aşama: ${nextStage} →</button>`:''}
        ${canAdvance && !nextStage ? `<button data-done="${t.id}">Bitir</button>`:''}
        ${isAdmin() ? `<button class="ghost" data-del="${t.id}">Sil</button>`:''}
      </td>`;
    body.appendChild(tr);
  });

  // handlers
  body.querySelectorAll('button[data-adv]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.adv;
      const db2 = loadDB();
      const t = db2.tasks.find(x=>x.id===id);
      t.stage = nextStageOf(t.stage);
      saveDB(db2);
      renderTasks();
    });
  });
  body.querySelectorAll('button[data-done]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.done;
      const db2 = loadDB();
      const t = db2.tasks.find(x=>x.id===id);
      t.stage = "Done"; t.status = "Done";
      saveDB(db2);
      renderTasks();
    });
  });
  body.querySelectorAll('button[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(!confirm('Görev silinsin mi?')) return;
      const id = btn.dataset.del;
      const db2 = loadDB();
      db2.tasks = db2.tasks.filter(x=>x.id!==id);
      saveDB(db2);
      renderTasks();
    });
  });
}

function nextStageOf(stage){
  const db = loadDB();
  const idx = (db.stages||[]).indexOf(stage);
  if(idx>=0 && idx < db.stages.length-1) return db.stages[idx+1];
  return null;
}

document.getElementById('tAdd').addEventListener('click', ()=>{
  if(!isAdmin()) return alert('Sadece admin görev ekleyebilir.');
  const title = document.getElementById('tTitle').value.trim();
  const assignee = document.getElementById('tAssignee').value;
  const stage = document.getElementById('tStage').value;
  if(!title) return alert('Başlık gir.');
  const db = loadDB();
  const id = 't_'+Math.random().toString(36).slice(2,10);
  db.tasks.push({id, title, assignee, stage, status: stage==='Done' ? 'Done' : 'Open', createdAt: Date.now()});
  saveDB(db);
  document.getElementById('tTitle').value='';
  renderTasks();
});

document.getElementById('onlyMine').addEventListener('change', renderTasks);
document.getElementById('hideDone').addEventListener('change', renderTasks);

// Admin → Demo verisi, wipe
document.getElementById('seedDemo').addEventListener('click', ()=>{
  if(!isAdmin()) return alert('Sadece admin.');
  const db = loadDB();
  const usr = db.users.find(u=>u.name!=='admin');
  const anyUser = usr ? usr.id : db.users[0].id;
  db.tasks.push(
    {id:'t_demo1', title:'Katalog PDF güncelle', assignee:anyUser, stage:db.stages[0], status:'Open', createdAt:Date.now()},
    {id:'t_demo2', title:'Stok sayım formu', assignee:anyUser, stage:db.stages[1]||db.stages[0], status:'Open', createdAt:Date.now()}
  );
  saveDB(db);
  renderTasks();
});

document.getElementById('wipeAll').addEventListener('click', ()=>{
  if(!isAdmin()) return alert('Sadece admin.');
  if(!confirm('Tüm veriler silinsin mi?')) return;
  localStorage.removeItem(DB_KEY);
  location.reload();
});


// Ensure default admin always exists
function ensureAdmin(){
  const db = loadDB();
  if(!db.users) db.users = [];
  if(!db.users.some(u=>u.name==='admin')){
    db.users.push({id:'u_admin', name:'admin', pass:'Admin@123', role:'admin'});
    saveDB(db);
  }
}
ensureAdmin();

// Enter to login
document.getElementById('loginUser').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('loginBtn').click(); });
document.getElementById('loginPass').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('loginBtn').click(); });

// Reset DB button
document.getElementById('resetDb').addEventListener('click', ()=>{
  if(confirm('Tüm veriler (kullanıcılar ve görevler) silinsin mi?')){
    localStorage.removeItem(DB_KEY);
    alert('DB sıfırlandı. Sayfa yenileniyor.');
    location.reload();
  }
});
