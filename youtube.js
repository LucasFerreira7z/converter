/* ═══════════════════════════════════════════
   VLTX — YouTube Downloader
   Uses cobalt.tools API v7 + blob fetch
   ═══════════════════════════════════════════ */

let ytVideoId   = null;
let ytVideoInfo = null;
let ytFmt       = 'mp3';
let ytQuality   = '128';

/* ── Helpers ─────────────────────────────── */
function getYtId(url) {
  const pats = [
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/,
    /youtube\.com\/shorts\/([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
  ];
  for (const p of pats) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

function sanitize(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '-').trim().substring(0, 80) || 'download';
}

/* ── Fetch video info ────────────────────── */
async function fetchYtInfo() {
  const url = document.getElementById('ytUrl').value.trim();
  if (!url) { showToast('Cole um link do YouTube primeiro.', 'error'); return; }

  const id = getYtId(url);
  if (!id) { showToast('Link inválido — use um link do YouTube.', 'error'); return; }

  ytVideoId = id;
  const btn = document.getElementById('ytFetchBtn');
  btn.disabled = true; btn.textContent = 'Buscando...';
  hideError();

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
    );
    if (!res.ok) throw new Error('Vídeo não encontrado, privado ou restrito por região.');
    const d = await res.json();

    document.getElementById('ytThumb').src       = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
    document.getElementById('ytVidTitle').textContent   = d.title;
    document.getElementById('ytVidChannel').textContent = d.author_name;
    document.getElementById('ytVidDuration').textContent = 'Vídeo público · YouTube';
    ytVideoInfo = { id, title: d.title, channel: d.author_name };

    document.getElementById('ytPreview').style.display  = 'block';
    document.getElementById('ytFormats').style.display  = 'grid';
    document.getElementById('ytQuality').style.display  = 'flex';
    document.getElementById('ytDlBtn').style.display    = 'flex';
    updateDlBtn();

  } catch (e) {
    showError(e.message);
    showToast('Erro ao buscar vídeo.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Buscar';
  }
}

/* ── Format / quality selection ─────────── */
function selectYtFmt(fmt, el) {
  ytFmt = fmt;
  document.querySelectorAll('.yt-fmt-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');

  const qw = document.getElementById('ytQuality');
  if (fmt === 'mp4') {
    ytQuality = '720';
    qw.innerHTML = `
      <button class="yt-q-btn" data-q="360" onclick="selectQ('360',this)">360p</button>
      <button class="yt-q-btn selected" data-q="720" onclick="selectQ('720',this)">720p</button>
      <button class="yt-q-btn" data-q="1080" onclick="selectQ('1080',this)">1080p</button>`;
  } else {
    ytQuality = '128';
    qw.innerHTML = `
      <button class="yt-q-btn selected" data-q="128" onclick="selectQ('128',this)">128 kbps</button>
      <button class="yt-q-btn" data-q="192" onclick="selectQ('192',this)">192 kbps</button>
      <button class="yt-q-btn" data-q="320" onclick="selectQ('320',this)">320 kbps</button>`;
  }
  updateDlBtn();
}

function selectQ(q, el) {
  ytQuality = q;
  document.querySelectorAll('.yt-q-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function updateDlBtn() {
  const label = ytFmt === 'mp3'
    ? `Baixar MP3 · ${ytQuality} kbps`
    : `Baixar MP4 · ${ytQuality}p`;
  document.getElementById('ytDlBtn').innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>${label}`;
}

/* ── Download ────────────────────────────── */
async function downloadYt() {
  if (!ytVideoId || !ytVideoInfo) return;

  const btn  = document.getElementById('ytDlBtn');
  const prog = document.getElementById('ytProgress');
  const bar  = document.getElementById('ytProgBar');
  const lbl  = document.getElementById('ytProgLabel');

  btn.disabled = true;
  prog.style.display = 'block';
  bar.style.width = '0%';
  hideError();

  /* Animate fake progress up to 70% while waiting for response */
  let pct = 0;
  const ticker = setInterval(() => {
    pct = Math.min(pct + Math.random() * 6, 70);
    bar.style.width = pct + '%';
  }, 300);

  lbl.textContent = 'Conectando ao servidor...';

  try {
    /* ── Try cobalt.tools v7 API ── */
    const streamUrl = await fetchCobalt();
    clearInterval(ticker);
    lbl.textContent = 'Baixando arquivo...';
    bar.style.width = '80%';

    await blobDownload(streamUrl, sanitize(ytVideoInfo.title) + '.' + ytFmt);

    bar.style.width = '100%';
    lbl.textContent = '✓ Download concluído!';
    showToast('Download concluído!', 'success');

    setTimeout(() => { prog.style.display = 'none'; bar.style.width = '0%'; }, 3000);

  } catch (e) {
    clearInterval(ticker);
    console.error('Cobalt error:', e);
    lbl.textContent = 'Tentando método alternativo...';
    bar.style.width = '0%';

    try {
      /* ── Fallback: yt-dlp web proxy ── */
      const fbUrl = await fetchFallback();
      clearInterval(ticker);
      lbl.textContent = 'Baixando arquivo...';
      bar.style.width = '80%';

      await blobDownload(fbUrl, sanitize(ytVideoInfo.title) + '.' + ytFmt);

      bar.style.width = '100%';
      lbl.textContent = '✓ Download concluído!';
      showToast('Download concluído!', 'success');
      setTimeout(() => { prog.style.display = 'none'; bar.style.width = '0%'; }, 3000);

    } catch (e2) {
      console.error('Fallback error:', e2);
      prog.style.display = 'none';
      bar.style.width = '0%';
      showError(
        'Não foi possível baixar automaticamente. Tente:<br>' +
        '• <a href="https://cobalt.tools" target="_blank" style="color:var(--p200)">cobalt.tools</a> — cole o link lá<br>' +
        '• <a href="https://yt-dlp.github.io/yt-dlp-web-ui/" target="_blank" style="color:var(--p200)">yt-dlp Web UI</a> — ferramenta avançada<br>' +
        'O YouTube bloqueia alguns vídeos de download externo.'
      );
      showToast('Download bloqueado pelo YouTube.', 'error');
    }
  } finally {
    btn.disabled = false;
  }
}

/* ── cobalt.tools v7 ─────────────────────── */
async function fetchCobalt() {
  /* Public cobalt instance — no key needed for basic use */
  const endpoints = [
    'https://api.cobalt.tools',
    'https://cobalt.api.timelessnesses.me',
    'https://capi.oak.cx',
  ];

  const body = {
    url: `https://www.youtube.com/watch?v=${ytVideoId}`,
    downloadMode: ytFmt === 'mp3' ? 'audio' : 'auto',
    audioFormat: 'mp3',
    audioBitrate: ytQuality,
    videoQuality: ytFmt === 'mp4' ? ytQuality : '720',
    filenameStyle: 'basic',
    twitterGif: false,
    youtubeVideoCodec: 'h264',
    youtubeDubBrowserLang: false,
    alwaysProxy: false,
  };

  for (const base of endpoints) {
    try {
      const res = await fetch(base + '/api/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 'error' || data.status === 'rate-limit') continue;
      const url = data.url || data?.picker?.[0]?.url;
      if (url) return url;
    } catch (_) { continue; }
  }
  throw new Error('All cobalt endpoints failed');
}

/* ── Fallback: y2mate-style public API ───── */
async function fetchFallback() {
  /* Use a CORS-friendly proxy endpoint */
  const apiUrl = `https://yt-download.org/api/button/${ytFmt}/${ytVideoId}`;

  /* This returns a redirect — follow it to get actual media URL */
  const res = await fetch(apiUrl, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error('Fallback API failed');

  /* If it's a blob response, download it directly */
  const ct = res.headers.get('Content-Type') || '';
  if (ct.includes('audio') || ct.includes('video') || ct.includes('octet')) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return url;
  }

  /* If JSON, parse for URL */
  if (ct.includes('json')) {
    const d = await res.json();
    if (d.url || d.downloadUrl || d.link) return d.url || d.downloadUrl || d.link;
  }

  throw new Error('Fallback returned unexpected content');
}

/* ── Blob download (no new tab!) ─────────── */
async function blobDownload(url, filename) {
  /* Fetch the file as a blob and trigger download via object URL.
     This avoids the browser opening a new tab. */
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    triggerDownload(objUrl, filename);
    setTimeout(() => URL.revokeObjectURL(objUrl), 10000);
  } catch (e) {
    /* If CORS blocks the fetch, fall back to direct anchor click.
       This may open a tab but at least triggers the download. */
    console.warn('blobDownload CORS fallback:', e.message);
    triggerDownload(url, filename);
  }
}

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── UI helpers ──────────────────────────── */
function showError(html) {
  const el = document.getElementById('ytError');
  el.innerHTML = html;
  el.style.display = 'block';
}
function hideError() {
  const el = document.getElementById('ytError');
  if (el) el.style.display = 'none';
}

/* Enter key on input */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ytUrl').addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchYtInfo();
  });
});
