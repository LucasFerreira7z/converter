/* ═══════════════════════════════════════════
   VLTX — File Converter
   ═══════════════════════════════════════════ */

const CONVERSIONS = {
  docx:['txt','html','pdf'], doc:['txt','html'],
  pptx:['txt','json'], ppt:['txt'], pdf:['txt'],
  xlsx:['csv','json','html'], xls:['csv','json','html'], csv:['xlsx','json','html'],
  json:['csv','xlsx','xml','txt'], xml:['json','txt'],
  txt:['pdf','html'], html:['txt','pdf'], md:['html','txt','pdf'],
  png:['jpg','webp','gif','bmp','ico'], jpg:['png','webp','gif','bmp','ico'],
  jpeg:['png','webp','gif','bmp','ico'], webp:['png','jpg','bmp','ico'],
  gif:['png','jpg','webp'], bmp:['png','jpg','webp'], svg:['png'], ico:['png'],
  mp3:['ogg','webm'], wav:['ogg','webm'], ogg:['webm'], aac:['webm'], webm:['ogg'],
};

const CATS = {
  docx:'office',doc:'office',pptx:'office',ppt:'office',pdf:'office',
  xlsx:'spreadsheet',xls:'spreadsheet',csv:'spreadsheet',
  json:'text',xml:'text',txt:'text',html:'text',md:'text',
  png:'image',jpg:'image',jpeg:'image',webp:'image',gif:'image',bmp:'image',svg:'image',ico:'image',
  mp3:'audio',wav:'audio',ogg:'audio',aac:'audio',webm:'audio',
};

let files = [];

/* ── Drop zone ───────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('dropzone');
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop',      e => { e.preventDefault(); dz.classList.remove('over'); handleFiles([...e.dataTransfer.files]); });
  document.getElementById('fileInput').addEventListener('change', e => handleFiles([...e.target.files]));
});

function handleFiles(arr) {
  arr.forEach(f => {
    if (files.find(x => x.file.name === f.name && x.file.size === f.size)) return;
    const ext = getExt(f);
    const targets = CONVERSIONS[ext] || [];
    files.push({ file: f, ext, targets, selected: targets[0] || null });
  });
  renderQueue();
}

function getExt(f) { return f.name.split('.').pop().toLowerCase(); }

function renderQueue() {
  const q = document.getElementById('fileQueue');
  q.innerHTML = '';
  files.forEach((item, idx) => {
    const cat  = CATS[item.ext] || 'unknown';
    const card = document.createElement('div');
    card.className   = 'file-card';
    card.dataset.idx = idx;
    card.innerHTML   = `
      <span class="fc-badge cat-${cat}">${item.ext.toUpperCase()}</span>
      <div class="fc-info">
        <div class="fc-name" title="${item.file.name}">${item.file.name}</div>
        <div class="fc-size">${fmtSize(item.file.size)}</div>
        <div class="fc-progress"><div class="fc-bar"></div></div>
        <div class="fc-status"></div>
      </div>
      ${item.targets.length
        ? `<select class="fc-select" onchange="files[${idx}].selected=this.value">
            ${item.targets.map(t => `<option value="${t}">${t.toUpperCase()}</option>`).join('')}
           </select>`
        : `<span style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace">sem suporte</span>`}
      <button class="btn-rm" onclick="removeFile(${idx})" title="Remover">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>`;
    q.appendChild(card);
  });
  document.getElementById('convertSection').style.display =
    files.length && files.some(f => f.targets.length) ? 'flex' : 'none';
  document.getElementById('fileInput').value = '';
}

function removeFile(idx) { files.splice(idx, 1); renderQueue(); }

function fmtSize(b) {
  if (b < 1024)     return b + ' B';
  if (b < 1048576)  return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

/* ── Convert all ─────────────────────────── */
async function convertAll() {
  const btn = document.getElementById('convertBtn');
  btn.disabled = true; btn.textContent = 'Convertendo…';
  let ok = 0, err = 0;

  for (let i = 0; i < files.length; i++) {
    const item = files[i];
    if (!item.selected) continue;
    const card = document.querySelector(`.file-card[data-idx="${i}"]`);
    if (!card) continue;
    card.classList.add('converting');
    card.querySelector('.fc-progress').style.display = 'block';
    const iv = animProg(card);

    try {
      await dispatch(item);
      ok++;
      clearInterval(iv);
      card.querySelector('.fc-bar').style.width = '100%';
      setStatus(card, '✓ Concluído', 'var(--success)');
    } catch (e) {
      err++;
      clearInterval(iv);
      setStatus(card, '✗ ' + e.message, 'var(--danger)');
    }
    card.classList.remove('converting');
  }

  btn.disabled = false; btn.textContent = '⚡ Converter Tudo';
  if (ok)  showToast(`${ok} arquivo${ok > 1 ? 's' : ''} convertido${ok > 1 ? 's' : ''}!`, 'success');
  if (err) showToast(`${err} erro${err > 1 ? 's' : ''}.`, 'error');
}

function setStatus(card, msg, color) {
  const el = card.querySelector('.fc-status');
  el.textContent = msg; el.style.color = color; el.style.display = 'block';
}

function animProg(card) {
  const bar = card.querySelector('.fc-bar'); let w = 0;
  return setInterval(() => { w = Math.min(w + Math.random() * 12, 85); bar.style.width = w + '%'; }, 160);
}

/* ── Dispatch ────────────────────────────── */
async function dispatch(item) {
  const cat = CATS[item.ext];
  if (cat === 'image')       return convertImage(item);
  if (cat === 'audio')       return convertAudio(item);
  if (cat === 'spreadsheet') return convertSpreadsheet(item);
  if (cat === 'office')      return convertOffice(item);
  if (cat === 'text')        return convertText(item);
  throw new Error('Formato não suportado');
}

/* ── Image ───────────────────────────────── */
function convertImage(item) {
  return new Promise((resolve, reject) => {
    const { file, selected: t } = item;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width  = t === 'ico' ? 32 : img.naturalWidth;
      c.height = t === 'ico' ? 32 : img.naturalHeight;
      const ctx = c.getContext('2d');
      if (t === 'jpg' || t === 'jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const mimes = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp', gif:'image/gif', bmp:'image/bmp', ico:'image/png' };
      c.toBlob(blob => {
        if (!blob) return reject(new Error('Falha ao gerar imagem'));
        dlBlob(blob, chExt(file.name, t)); resolve();
      }, mimes[t] || 'image/png', 0.93);
    };
    img.onerror = () => reject(new Error('Imagem inválida'));
    img.src = URL.createObjectURL(file);
  });
}

/* ── Audio ───────────────────────────────── */
async function convertAudio(item) {
  return new Promise(async (resolve, reject) => {
    try {
      const ac  = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await ac.decodeAudioData(await item.file.arrayBuffer());
      const dest = ac.createMediaStreamDestination();
      const src  = ac.createBufferSource(); src.buffer = buf; src.connect(dest);
      const mimes = ['audio/ogg;codecs=opus','audio/webm;codecs=opus','audio/webm','audio/ogg'];
      const used  = mimes.find(m => MediaRecorder.isTypeSupported(m)) || '';
      const chunks = [];
      const rec = new MediaRecorder(dest.stream, used ? { mimeType: used } : {});
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: used || 'audio/webm' });
        const ext  = (used.match(/audio\/(\w+)/) || ['','webm'])[1];
        dlBlob(blob, chExt(item.file.name, ext)); ac.close(); resolve();
      };
      rec.start(); src.start(0); src.onended = () => setTimeout(() => rec.stop(), 100);
    } catch (e) { reject(e); }
  });
}

/* ── Spreadsheet ─────────────────────────── */
async function convertSpreadsheet(item) {
  const { file, ext, selected: t } = item;
  let wb;
  if (ext === 'xlsx' || ext === 'xls') wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  else wb = XLSX.read(await file.text(), { type: 'string' });
  if (!wb) throw new Error('Falha ao ler planilha');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (t === 'xlsx') {
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    dlBlob(new Blob([out], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), chExt(file.name, 'xlsx'));
  } else if (t === 'csv') {
    dlBlob(new Blob([XLSX.utils.sheet_to_csv(sheet)], { type:'text/csv;charset=utf-8' }), chExt(file.name, 'csv'));
  } else if (t === 'json') {
    dlBlob(new Blob([JSON.stringify(XLSX.utils.sheet_to_json(sheet), null, 2)], { type:'application/json' }), chExt(file.name, 'json'));
  } else if (t === 'html') {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}th{background:#f5f5f5}</style></head><body>${XLSX.utils.sheet_to_html(sheet)}</body></html>`;
    dlBlob(new Blob([html], { type:'text/html;charset=utf-8' }), chExt(file.name, 'html'));
  }
}

/* ── Office docs ─────────────────────────── */
async function convertOffice(item) {
  const { file, ext, selected: t } = item;

  if (ext === 'docx' || ext === 'doc') {
    if (typeof mammoth === 'undefined') throw new Error('Biblioteca mammoth não carregada');
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    const html = result.value; const text = h2t(html);
    if (t === 'html') {
      const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;line-height:1.8;color:#1a1a1a;padding:0 20px}h1,h2,h3{color:#111;margin:1.5em 0 0.5em}p{margin:0 0 1em}</style></head><body>${html}</body></html>`;
      dlBlob(new Blob([full], { type:'text/html;charset=utf-8' }), chExt(file.name, 'html'));
    } else if (t === 'txt') {
      dlBlob(new Blob([text], { type:'text/plain;charset=utf-8' }), chExt(file.name, 'txt'));
    } else if (t === 'pdf') {
      await toPdf(text, chExt(file.name, 'pdf'));
    }
    return;
  }

  if (ext === 'pptx' || ext === 'ppt') {
    if (typeof JSZip === 'undefined') throw new Error('JSZip não carregada');
    const zip  = await JSZip.loadAsync(await file.arrayBuffer());
    const sfiles = Object.keys(zip.files)
      .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
    const slides = [];
    for (const sf of sfiles) {
      const xml = await zip.files[sf].async('string');
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      slides.push([...doc.querySelectorAll('a\\:t,t')].map(n => n.textContent.trim()).filter(Boolean).join(' '));
    }
    if (t === 'txt') dlBlob(new Blob([slides.map((s,i) => `=== Slide ${i+1} ===\n${s}`).join('\n\n')], { type:'text/plain;charset=utf-8' }), chExt(file.name,'txt'));
    else dlBlob(new Blob([JSON.stringify(slides.map((text,i) => ({slide:i+1,text})),null,2)], { type:'application/json' }), chExt(file.name,'json'));
    return;
  }

  if (ext === 'pdf') {
    dlBlob(new Blob([await pdfTxt(file)], { type:'text/plain;charset=utf-8' }), chExt(file.name,'txt'));
    return;
  }
  throw new Error('Conversão não disponível');
}

/* ── Text/Data ───────────────────────────── */
async function convertText(item) {
  const { file, ext, selected: t } = item;
  const text = await file.text();
  let sd = null;
  try {
    if (ext==='json') sd = JSON.parse(text);
    else if (ext==='csv') sd = parseCSV(text);
    else if (ext==='xml')  sd = xmlToObj(text);
  } catch (_) {}

  if (t === 'txt')  dlBlob(new Blob([(ext==='html'?h2t(text):text)], {type:'text/plain;charset=utf-8'}), chExt(file.name,'txt'));
  else if (t === 'html') {
    const body = ext==='md' ? md2h(text) : `<pre style="white-space:pre-wrap">${exXml(text)}</pre>`;
    dlBlob(new Blob([`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.7}</style></head><body>${body}</body></html>`],{type:'text/html;charset=utf-8'}), chExt(file.name,'html'));
  } else if (t === 'pdf') {
    await toPdf(ext==='html'?h2t(text):text, chExt(file.name,'pdf'));
  } else if (t === 'json') {
    dlBlob(new Blob([JSON.stringify(sd||{content:text},null,2)],{type:'application/json'}), chExt(file.name,'json'));
  } else if (t === 'csv') {
    const csv = (ext==='json'&&sd) ? j2csv(Array.isArray(sd)?sd:[sd]) : text;
    dlBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}), chExt(file.name,'csv'));
  } else if (t === 'xlsx') {
    const data = (ext==='json'&&sd) ? (Array.isArray(sd)?sd:[sd]) : (ext==='csv'&&sd) ? sd : [{content:text}];
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    const out = XLSX.write(wb, {bookType:'xlsx', type:'array'});
    dlBlob(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), chExt(file.name,'xlsx'));
  } else if (t === 'xml') {
    const xml = (ext==='json'&&sd) ? `<?xml version="1.0" encoding="UTF-8"?>\n${j2xml(sd)}` : `<?xml version="1.0" encoding="UTF-8"?>\n<root><content>${exXml(text)}</content></root>`;
    dlBlob(new Blob([xml],{type:'application/xml;charset=utf-8'}), chExt(file.name,'xml'));
  }
}

/* ── PDF generation ─────────────────────── */
async function toPdf(text, fname) {
  if (typeof window.jspdf === 'undefined') throw new Error('jsPDF não carregada');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'p', unit:'mm', format:'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), m = 15;
  doc.setFont('helvetica','normal'); doc.setFontSize(11);
  const lines = doc.splitTextToSize(text, W - m*2); let y = m + 5;
  for (const l of lines) { if (y > H-m) { doc.addPage(); y = m+5; } doc.text(l, m, y); y += 6; }
  doc.save(fname);
}

/* ── PDF text extraction ─────────────────── */
async function pdfTxt(file) {
  const str = new TextDecoder('latin1').decode(new Uint8Array(await file.arrayBuffer()));
  let text = '';
  for (const m of str.matchAll(/BT([\s\S]*?)ET/g)) {
    for (const s of [...m[1].matchAll(/\(([^)]*)\)\s*Tj/g)]) text += s[1].replace(/\\n/g,'\n').replace(/\\\\/g,'\\') + ' ';
    text += '\n';
  }
  return text.trim() || '[Não foi possível extrair texto. PDF escaneado não suportado.]';
}

/* ── Tiny utilities ─────────────────────── */
function parseCSV(t) {
  const l = t.trim().split('\n');
  const h = l[0].split(',').map(x => x.trim().replace(/^"|"$/g,''));
  return l.slice(1).map(r => { const v=r.split(',').map(x=>x.trim().replace(/^"|"$/g,'')); const o={}; h.forEach((k,i)=>o[k]=v[i]||''); return o; });
}
function j2csv(arr) {
  if (!arr.length) return '';
  const h = Object.keys(arr[0]);
  return [h.join(','), ...arr.map(r => h.map(k=>JSON.stringify(r[k]??'')).join(','))].join('\n');
}
function exXml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function j2xml(obj, tag='root') {
  if (Array.isArray(obj)) return `<${tag}>${obj.map(o=>j2xml(o,'item')).join('')}</${tag}>`;
  if (obj && typeof obj==='object') return `<${tag}>${Object.entries(obj).map(([k,v])=>j2xml(v,k.replace(/\s+/g,'_'))).join('')}</${tag}>`;
  return `<${tag}>${exXml(obj)}</${tag}>`;
}
function xmlToObj(xml) { return nodeToObj(new DOMParser().parseFromString(xml,'text/xml').documentElement); }
function nodeToObj(n) {
  if (n.childNodes.length===1&&n.childNodes[0].nodeType===3) return n.childNodes[0].nodeValue;
  const o={};
  for (const c of n.childNodes) { if(c.nodeType!==1)continue; const v=nodeToObj(c); if(o[c.tagName]){if(!Array.isArray(o[c.tagName]))o[c.tagName]=[o[c.tagName]];o[c.tagName].push(v);}else o[c.tagName]=v; }
  return o;
}
function h2t(html) { const d=document.createElement('div'); d.innerHTML=html; return (d.innerText||d.textContent||'').trim(); }
function md2h(md) { return md.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`(.+?)`/g,'<code>$1</code>').replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>'); }
function chExt(name, ext) { return name.replace(/\.[^.]+$/, '.') + ext; }
function dlBlob(blob, name) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
