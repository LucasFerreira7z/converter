/* ═══════════════════════════════════════
   STOQUE — app.js
   Lógica: lucro = receita - custo
   Custo é salvo no snapshot do pagamento.
   Pendente = soma das pessoas que ainda NÃO pagaram.
   Quando alguém paga → sai da lista de pedidos.
═══════════════════════════════════════ */

const K = { prods:'sq_prods', persons:'sq_persons', pays:'sq_pays', ids:'sq_ids' };

let prods    = [];
let persons  = [];
let payments = [];   /* registros permanentes de pagamentos confirmados */
let pidC = 0, perC = 0;

/* ── LocalStorage ── */
function loadLS(){
  try{
    prods    = JSON.parse(localStorage.getItem(K.prods)   || '[]');
    persons  = JSON.parse(localStorage.getItem(K.persons) || '[]');
    payments = JSON.parse(localStorage.getItem(K.pays)    || '[]');
    payments = payments.map(p => ({ ...p, time: new Date(p.time) }));
    const ids = JSON.parse(localStorage.getItem(K.ids)    || '{}');
    pidC = ids.pidC || 0;
    perC = ids.perC || 0;
  } catch(e){ prods=[]; persons=[]; payments=[]; pidC=0; perC=0; }
}

function saveLS(){
  try{
    localStorage.setItem(K.prods,   JSON.stringify(prods));
    localStorage.setItem(K.persons, JSON.stringify(persons));
    localStorage.setItem(K.pays,    JSON.stringify(payments));
    localStorage.setItem(K.ids,     JSON.stringify({ pidC, perC }));
  } catch(e){}
}

function clearAll(){
  if(!confirm('Apagar TODOS os dados? Esta ação não pode ser desfeita.')) return;
  [K.prods, K.persons, K.pays, K.ids].forEach(k => localStorage.removeItem(k));
  prods=[]; persons=[]; payments=[]; pidC=0; perC=0;
  renderProds(); renderPersons();
  toast('🗑 Dados apagados.');
}

/* ── Helpers ── */
const fmt = v => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
const ini = n => (n||'?').trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const COLS = ['#cc0000','#aa1100','#991133','#bb2200','#882200'];
const col  = i => COLS[i % COLS.length];

/* Total de venda de um pedido */
const perTotal = p => (p.items||[]).reduce((s,i) => s + i.price * i.qty, 0);

/* Custo total de um pedido (cada item já traz o custo no snapshot) */
const perCusto = items => (items||[]).reduce((s,i) => s + i.cost * i.qty, 0);

let toastTimer;
function toast(msg){
  clearTimeout(toastTimer);
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ── Tabs ── */
function showTab(t){
  document.querySelectorAll('.tab').forEach((el,i) =>
    el.classList.toggle('active', ['estoque','pedidos','dashboard'][i] === t));
  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
  if(t === 'dashboard') renderDash();
  if(t === 'pedidos')   renderPersons();
}

/* ════════════════════════════════
   PRODUTOS
════════════════════════════════ */
function addProd(){
  const n = document.getElementById('pn').value.trim();
  const p = parseFloat(document.getElementById('pp').value);
  const c = parseFloat(document.getElementById('pc2').value) || 0;
  if(!n || isNaN(p) || p < 0){ toast('⚠ Preencha nome e preço de venda.'); return; }
  if(c > p){ toast('⚠ Custo maior que o preço de venda!'); return; }
  prods.push({ id:++pidC, name:n, price:p, cost:c });
  document.getElementById('pn').value  = '';
  document.getElementById('pp').value  = '';
  document.getElementById('pc2').value = '';
  document.getElementById('pn').focus();
  saveLS(); renderProds();
  toast(`✓ "${n}" adicionado.`);
}

function delProd(id){
  const p = prods.find(p => p.id === id);
  prods = prods.filter(p => p.id !== id);
  persons.forEach(p => { p.items = p.items.filter(i => i.pid !== id); });
  saveLS(); renderProds(); renderPersons();
  if(p) toast(`"${p.name}" removido.`);
}

function renderProds(){
  const el = document.getElementById('plist');
  document.getElementById('pcount').textContent =
    prods.length + ' ite' + (prods.length === 1 ? 'm' : 'ns');

  if(!prods.length){
    el.innerHTML = '<div class="empty" style="grid-column:1/-1"><i class="ti ti-package"></i>Nenhum produto ainda.</div>';
    return;
  }

  el.innerHTML = prods.map(p => {
    const lucroUnit = p.price - p.cost;
    const hasCost   = p.cost > 0;
    let badge, sub;
    if(!hasCost){
      badge = '<span class="prod-badge sem-custo">sem custo</span>';
      sub   = '';
    } else if(lucroUnit >= 0){
      badge = `<span class="prod-badge lucro">+${fmt(lucroUnit)}/un.</span>`;
      sub   = `<div class="prod-sub">custo: ${fmt(p.cost)}</div>`;
    } else {
      badge = `<span class="prod-badge prejuizo">${fmt(lucroUnit)}/un.</span>`;
      sub   = `<div class="prod-sub">custo: ${fmt(p.cost)}</div>`;
    }
    return `
    <div class="prod-card">
      <div class="prod-nm">${esc(p.name)}</div>
      <div class="prod-row">
        <span class="prod-price">${fmt(p.price)}</span>
        ${badge}
      </div>
      ${sub}
      <button class="del-btn" onclick="delProd(${p.id})"><i class="ti ti-x"></i> remover</button>
    </div>`;
  }).join('');
}

/* ════════════════════════════════
   PEDIDOS
════════════════════════════════ */
function addPerson(){
  const n = document.getElementById('per-inp').value.trim();
  if(!n) return;
  persons.push({ id:++perC, name:n, items:[], open:true });
  document.getElementById('per-inp').value = '';
  saveLS(); renderPersons();
}

function remPerson(id){
  const p = persons.find(p => p.id === id);
  persons = persons.filter(p => p.id !== id);
  saveLS(); renderPersons();
  if(p) toast(`"${p.name}" removido(a).`);
}

function toggleP(id){
  const p = persons.find(p => p.id === id);
  if(p){ p.open = !p.open; saveLS(); renderPersons(); }
}

function addItem(pId){
  const sel = document.getElementById('sel-'+pId);
  if(!sel || !sel.value) return;
  const prod = prods.find(p => p.id === parseInt(sel.value));
  if(!prod) return;
  const per = persons.find(p => p.id === pId);
  const ex  = per.items.find(i => i.pid === prod.id);
  if(ex){
    ex.qty += 1;
  } else {
    /* ← custo salvo aqui no item do pedido, não no snapshot */
    per.items.push({ pid:prod.id, name:prod.name, price:prod.price, cost:prod.cost||0, qty:1 });
  }
  saveLS(); renderPersons();
}

function chgQty(pId, pid, d){
  const per = persons.find(p => p.id === pId);
  const it  = per.items.find(i => i.pid === pid);
  if(!it) return;
  it.qty += d;
  if(it.qty <= 0) per.items = per.items.filter(i => i.pid !== pid);
  saveLS(); renderPersons();
}

function remItem(pId, pid){
  const per = persons.find(p => p.id === pId);
  per.items = per.items.filter(i => i.pid !== pid);
  saveLS(); renderPersons();
}

/*
  confirmPay:
  - Calcula receita e custo a partir dos itens do pedido
  - Salva snapshot completo em payments[]
  - Remove a pessoa da lista com animação
*/
function confirmPay(pId){
  const per = persons.find(p => p.id === pId);
  if(!per) return;

  const receita = perTotal(per);
  const custo   = perCusto(per.items);

  payments.push({
    payId    : Date.now() + '_' + pId,
    personId : per.id,
    name     : per.name,
    receita  : receita,   /* quanto recebeu */
    custo    : custo,     /* quanto custou  */
    lucro    : receita - custo,  /* diferença real */
    items    : per.items.map(i => ({ pid:i.pid, name:i.name, qty:i.qty, price:i.price, cost:i.cost })),
    time     : new Date()
  });

  /* Animação de saída */
  const block = document.querySelector(`[data-pid="${pId}"]`);
  if(block){
    block.style.transition = 'opacity .35s, transform .35s';
    block.style.opacity    = '0';
    block.style.transform  = 'translateX(40px)';
    setTimeout(() => {
      persons = persons.filter(p => p.id !== pId);
      saveLS(); renderPersons();
    }, 360);
  } else {
    persons = persons.filter(p => p.id !== pId);
    saveLS(); renderPersons();
  }

  toast(`✓ ${per.name} — ${fmt(receita)} confirmado!`);
}

function renderPersons(){
  const el = document.getElementById('persons-list');
  if(!persons.length){
    el.innerHTML = '<div class="empty"><i class="ti ti-users"></i>Adicione pessoas para registrar pedidos.</div>';
    return;
  }

  const opts = prods.length
    ? '<option value="">Escolher produto...</option>' +
      prods.map(p => `<option value="${p.id}">${esc(p.name)} — ${fmt(p.price)}</option>`).join('')
    : '<option value="">Nenhum produto cadastrado</option>';

  el.innerHTML = persons.map((per, idx) => {
    const tot = perTotal(per);
    const cnt = per.items.reduce((s,i) => s + i.qty, 0);
    return `
    <div class="person-block" data-pid="${per.id}">
      <div class="person-head" onclick="toggleP(${per.id})">
        <div style="display:flex;align-items:center;gap:.7rem">
          <div class="avatar" style="background:${col(idx)}">${ini(per.name)}</div>
          <div>
            <div class="person-nm">${esc(per.name)} <span class="tag-pend">pendente</span></div>
            <div class="person-sub">${cnt} ite${cnt===1?'m':'ns'} no pedido</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:.7rem">
          <div class="person-total-val">${fmt(tot)}</div>
          <i class="ti ti-chevron-down chevron ${per.open?'open':''}"></i>
        </div>
      </div>
      <div class="pbody ${per.open?'':'hidden'}">
        <div class="order-row">
          <select class="sel" id="sel-${per.id}" style="flex:2;min-width:140px">${opts}</select>
          <button class="btn btn-sm" onclick="addItem(${per.id})"><i class="ti ti-plus"></i> Item</button>
          <button class="btn btn-sm btn-ghost" onclick="remPerson(${per.id})"><i class="ti ti-trash"></i></button>
        </div>
        <div class="items-list">
          ${per.items.length === 0
            ? '<div style="text-align:center;padding:.7rem;color:var(--muted);font-size:.82rem">Nenhum item adicionado.</div>'
            : per.items.map(it => `
              <div class="oi">
                <span class="oi-nm">${esc(it.name)}</span>
                <div class="oi-ctrl">
                  <button class="qbtn" onclick="chgQty(${per.id},${it.pid},-1)">−</button>
                  <span class="qnum">${it.qty}</span>
                  <button class="qbtn" onclick="chgQty(${per.id},${it.pid},1)">+</button>
                </div>
                <span class="oi-price">${fmt(it.price * it.qty)}</span>
                <button class="oi-del" onclick="remItem(${per.id},${it.pid})"><i class="ti ti-x"></i></button>
              </div>`).join('')}
        </div>
        <div class="pay-row">
          <div>
            <div class="pay-total-lbl">Total do pedido</div>
            <div class="pay-total-val">${fmt(tot)}</div>
          </div>
          <button class="btn btn-green" onclick="confirmPay(${per.id})"
            ${per.items.length===0 ? 'disabled style="opacity:.35;cursor:not-allowed"' : ''}>
            <i class="ti ti-cash"></i> Confirmar pagamento
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ════════════════════════════════
   DASHBOARD
   
   Lógica correta:
   - totalReceita  = soma de payments[].receita   (quanto entrou)
   - totalCusto    = soma de payments[].custo      (quanto saiu)
   - lucroTotal    = totalReceita - totalCusto     (diferença)
   - pendente      = soma dos pedidos ainda abertos (persons[])
   - paidCount     = payments.length
════════════════════════════════ */
function renderDash(){
  const totalReceita = payments.reduce((s,p) => s + p.receita, 0);
  const totalCusto   = payments.reduce((s,p) => s + p.custo,   0);
  const lucroTotal   = totalReceita - totalCusto;   /* POSITIVO = lucro | NEGATIVO = prejuízo */
  const pendente     = persons.reduce((s,p) => s + perTotal(p), 0);
  const paidCount    = payments.length;

  /* ── Métricas ── */
  document.getElementById('metrics').innerHTML = `
    <div class="metric">
      <div class="metric-lbl"><i class="ti ti-users"></i> Pagaram</div>
      <div class="metric-num col-g">${paidCount}</div>
    </div>
    <div class="metric">
      <div class="metric-lbl"><i class="ti ti-clock"></i> Aguardando</div>
      <div class="metric-num col-r">${persons.length}</div>
    </div>
    <div class="metric">
      <div class="metric-lbl"><i class="ti ti-check"></i> Recebido</div>
      <div class="metric-num col-g">${fmt(totalReceita)}</div>
    </div>
    <div class="metric pend-card">
      <div class="metric-lbl rlbl"><i class="ti ti-clock"></i> Pendente</div>
      <div class="metric-num col-r">${fmt(pendente)}</div>
    </div>`;

  /* ── Card Lucro / Prejuízo ── */
  const lucroBanner = document.getElementById('lucro-banner');
  const temCusto    = payments.some(p => p.custo > 0);

  if(paidCount > 0 && temCusto){
    const isLucro  = lucroTotal >= 0;
    const margem   = totalReceita > 0 ? Math.round((lucroTotal / totalReceita) * 100) : 0;
    lucroBanner.style.display = 'block';
    lucroBanner.innerHTML = `
      <div class="lucro-card ${isLucro ? 'positivo' : 'negativo'}">
        <div>
          <div class="lucro-label" style="color:${isLucro ? '#27a85b' : 'var(--R)'}">
            <i class="ti ti-trending-${isLucro ? 'up' : 'down'}"></i>
            ${isLucro ? 'LUCRO TOTAL' : 'PREJUÍZO TOTAL'}
          </div>
          <div class="lucro-val" style="color:${isLucro ? '#27a85b' : 'var(--R)'}">
            ${isLucro ? '' : '-'}${fmt(Math.abs(lucroTotal))}
          </div>
        </div>
        <div class="lucro-detail">
          <div>💰 Receita: <strong style="color:#27a85b">${fmt(totalReceita)}</strong></div>
          <div>📦 Custo: <strong style="color:var(--R)">${fmt(totalCusto)}</strong></div>
          <div style="color:var(--muted);font-size:.75rem;margin-top:.1rem">
            margem: <strong style="color:${isLucro?'#27a85b':'var(--R)'}">${margem}%</strong>
          </div>
        </div>
      </div>`;
  } else {
    lucroBanner.style.display = 'none';
  }

  /* ── Histórico de pagamentos ── */
  const hist = document.getElementById('pay-hist');
  hist.innerHTML = payments.length
    ? [...payments].reverse().map(p => `
        <div class="ph-item">
          <div class="ph-left">
            <div class="ph-av">${ini(p.name)}</div>
            <div>
              <div class="ph-nm">${esc(p.name)}</div>
              <div class="ph-time">${new Date(p.time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          </div>
          <div class="ph-val">${fmt(p.receita)}</div>
        </div>`).join('')
    : '<div class="empty" style="padding:1.2rem"><i class="ti ti-coin"></i>Nenhum pagamento ainda.</div>';

  /* ── Barras (pagos + pendentes) ── */
  const barsEl = document.getElementById('bars');
  const allEntries = [
    ...payments.map(p => ({ name:p.name, val:p.receita, paid:true  })),
    ...persons.map(p  => ({ name:p.name, val:perTotal(p), paid:false }))
  ];
  const maxVal = allEntries.length ? Math.max(...allEntries.map(e => e.val), 1) : 1;
  barsEl.innerHTML = allEntries.length
    ? allEntries.map(e => {
        const pct = Math.round((e.val / maxVal) * 100);
        return `
        <div class="bar-row">
          <span class="bar-nm">${esc(e.name)}</span>
          <div class="bar-bg">
            <div class="bar-fill" style="width:${pct}%;background:${e.paid?'#27a85b':'var(--R)'}"></div>
          </div>
          <span class="bar-val">${fmt(e.val)}</span>
        </div>`;
      }).join('')
    : '<div class="empty" style="padding:1.2rem"><i class="ti ti-chart-bar"></i>Sem dados.</div>';

  /* ── Anel de status ── */
  const ringsEl      = document.getElementById('rings');
  const totalPessoas = paidCount + persons.length;
  if(!totalPessoas){
    ringsEl.innerHTML = '<div class="empty" style="padding:.8rem">Sem pessoas ainda.</div>';
    return;
  }
  const paidPct = Math.round((paidCount / totalPessoas) * 100);
  const r = 38, circ = 2 * Math.PI * r;
  const arc = (circ * (paidCount / totalPessoas)).toFixed(2);

  ringsEl.innerHTML = `
    <div class="ring-wrap">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r="${r}" fill="none" stroke="#1e1e1e" stroke-width="9"/>
        <circle cx="45" cy="45" r="${r}" fill="none" stroke="#27a85b" stroke-width="9"
          stroke-dasharray="${arc} ${circ.toFixed(2)}" stroke-linecap="round"/>
      </svg>
      <div class="ring-label">
        <div class="ring-pct">${paidPct}%</div>
        <div class="ring-sub">pagos</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:.65rem;justify-content:center">
      <div style="display:flex;align-items:center;gap:.5rem;font-size:.85rem">
        <span style="width:10px;height:10px;border-radius:2px;background:#27a85b;flex-shrink:0"></span>
        <span>${paidCount} pag${paidCount===1?'ou':'aram'} — <strong style="color:#27a85b">${fmt(totalReceita)}</strong></span>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;font-size:.85rem">
        <span style="width:10px;height:10px;border-radius:2px;background:var(--R);flex-shrink:0"></span>
        <span>${persons.length} pendente${persons.length===1?'':'s'} — <strong style="color:var(--R)">${fmt(pendente)}</strong></span>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;font-size:.85rem;color:var(--muted)">
        <span style="width:10px;height:10px;border-radius:2px;background:#2a2a2a;flex-shrink:0"></span>
        <span>${totalPessoas} pessoa${totalPessoas===1?'':'s'} no total</span>
      </div>
    </div>`;
}

/* ── Boot ── */
loadLS();
renderProds();
renderPersons();
document.getElementById('pn').addEventListener('keydown',     e => { if(e.key==='Enter') addProd(); });
document.getElementById('per-inp').addEventListener('keydown', e => { if(e.key==='Enter') addPerson(); });
