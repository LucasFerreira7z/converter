/* ═══════════════════════════════════════════════════════════════
   VLTX — YouTube UI Controller

   BACKEND HOOKS (implement these to connect your backend):

   ┌─────────────────────────────────────────────────────────┐
   │  window.YT_BACKEND = {                                  │
   │    fetchInfo(videoId) → Promise<{                       │
   │      title, channel, views, duration, thumbUrl          │
   │    }>,                                                  │
   │    download(videoId, format, quality) → Promise<{       │
   │      downloadUrl, filename                              │
   │    }>                                                   │
   │  }                                                      │
   └─────────────────────────────────────────────────────────┘

   If window.YT_BACKEND is not defined, demo mode is used.
═══════════════════════════════════════════════════════════════ */

/* ─── State ──────────────────────────────────────────────── */
var yt = {
  videoId: null,
  videoInfo: null,
  format: "mp3",
  quality: "128",
};

/* ─── Helpers ────────────────────────────────────────────── */
function ytEl(id) {
  return document.getElementById(id);
}
function ytShow(id) {
  var e = ytEl(id);
  if (e) {
    e.classList.add("visible");
    e.style.display = "";
  }
}
function ytHide(id) {
  var e = ytEl(id);
  if (e) {
    e.classList.remove("visible");
    e.style.display = "none";
  }
}
function ytText(id, txt) {
  var e = ytEl(id);
  if (e) e.textContent = txt;
}
function ytHtml(id, html) {
  var e = ytEl(id);
  if (e) e.innerHTML = html;
}
function ytAttr(id, k, v) {
  var e = ytEl(id);
  if (e) e[k] = v;
}
function ytDisable(id, on) {
  var e = ytEl(id);
  if (e) e.disabled = on;
}

function getYtId(url) {
  var pats = [
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/,
    /youtube\.com\/shorts\/([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (var i = 0; i < pats.length; i++) {
    var m = url.match(pats[i]);
    if (m) return m[1];
  }
  return null;
}

/* ─── Tab: clear URL input ───────────────────────────────── */
function clearYtUrl() {
  var inp = ytEl("ytUrlInput");
  if (inp) {
    inp.value = "";
    inp.focus();
  }
  resetYtUI();
}

function resetYtUI() {
  ytHide("ytPreview");
  ytHide("ytOptions");
  ytHide("ytProgressWrap");
  ytHide("ytDownloadBtn");
  ytHide("ytErrorBox");
  yt.videoId = null;
  yt.videoInfo = null;
}

/* ─── Fetch video info ───────────────────────────────────── */
async function ytFetchInfo() {
  var raw = (ytEl("ytUrlInput") || {}).value;
  if (!raw || !raw.trim()) {
    showToast("Cole um link do YouTube primeiro.", "error");
    return;
  }

  var id = getYtId(raw.trim());
  if (!id) {
    showToast("Link inválido — use um link do YouTube.", "error");
    return;
  }

  resetYtUI(); // limpa estado antigo ANTES de setar o novo ID
  yt.videoId = id; // agora salva o ID sem ser apagado

  ytDisable("ytFetchBtn", true);
  ytAttr("ytFetchBtn", "textContent", "Buscando...");

  try {
    var info = await _fetchVideoInfo(id);
    yt.videoInfo = info;
    _renderPreview(info);
    ytShow("ytPreview");
    ytShow("ytOptions");
    ytShow("ytDownloadBtn");
    _updateDownloadLabel();
  } catch (e) {
    _showError(e.message || "Erro desconhecido ao buscar o vídeo.");
    showToast("Erro ao buscar vídeo.", "error");
  } finally {
    ytDisable("ytFetchBtn", false);
    ytAttr("ytFetchBtn", "textContent", "Buscar");
  }
}

/* ─── Internal: call backend or demo ────────────────────── */
async function _fetchVideoInfo(id) {
  /* ── YOUR BACKEND HOOK ──────────────────────────────────
     Replace this block with your real API call, e.g.:

     if (window.YT_BACKEND) {
       return await window.YT_BACKEND.fetchInfo(id);
     }
  ─────────────────────────────────────────────────────── */

  if (window.YT_BACKEND && typeof window.YT_BACKEND.fetchInfo === "function") {
    return await window.YT_BACKEND.fetchInfo(id);
  }

  /* Demo: use YouTube oEmbed (no API key needed, just metadata) */
  var res = await fetch(
    "https://www.youtube.com/oembed?url=" +
      encodeURIComponent("https://www.youtube.com/watch?v=" + id) +
      "&format=json",
  );
  if (!res.ok)
    throw new Error(
      "Vídeo não encontrado, privado ou indisponível na sua região.",
    );
  var d = await res.json();
  return {
    title: d.title,
    channel: d.author_name,
    views: "",
    duration: "",
    thumbUrl: "https://img.youtube.com/vi/" + id + "/mqdefault.jpg",
  };
}

/* ─── Render preview card ────────────────────────────────── */
function _renderPreview(info) {
  ytAttr(
    "ytThumb",
    "src",
    info.thumbUrl ||
      "https://img.youtube.com/vi/" + yt.videoId + "/mqdefault.jpg",
  );
  ytAttr("ytThumb", "alt", info.title || "");
  ytText("ytTitle", info.title || "");
  ytText("ytChannel", info.channel ? "📺 " + info.channel : "");
  ytText("ytViews", info.views || "");
  ytText("ytDuration", info.duration || "");
}

/* ─── Format selection ───────────────────────────────────── */
function ytSelectFmt(fmt, el) {
  yt.format = fmt;
  document.querySelectorAll(".yt-fmt-card").forEach(function (b) {
    b.classList.remove("active");
  });
  if (el) el.classList.add("active");

  /* Swap quality options */
  var qrow = ytEl("ytQualityRow");
  if (!qrow) return;

  if (fmt === "mp4") {
    yt.quality = "720";
    qrow.innerHTML =
      '<button class="yt-q-pill" onclick="ytSelectQ(\'360\',this)">360p</button>' +
      '<button class="yt-q-pill active" onclick="ytSelectQ(\'720\',this)">720p HD</button>' +
      '<button class="yt-q-pill" onclick="ytSelectQ(\'1080\',this)">1080p FHD</button>';
  } else {
    yt.quality = "128";
    qrow.innerHTML =
      '<button class="yt-q-pill active" onclick="ytSelectQ(\'128\',this)">128 kbps</button>' +
      '<button class="yt-q-pill" onclick="ytSelectQ(\'192\',this)">192 kbps</button>' +
      '<button class="yt-q-pill" onclick="ytSelectQ(\'320\',this)">320 kbps</button>';
  }
  _updateDownloadLabel();
}

function ytSelectQ(q, el) {
  yt.quality = q;
  document.querySelectorAll(".yt-q-pill").forEach(function (b) {
    b.classList.remove("active");
  });
  if (el) el.classList.add("active");
  _updateDownloadLabel();
}

function _updateDownloadLabel() {
  var label =
    yt.format === "mp3"
      ? "Baixar MP3 · " + yt.quality + " kbps"
      : "Baixar MP4 · " + yt.quality + "p";
  ytText("ytDownloadLabel", label);
}

/* ─── Download ───────────────────────────────────────────── */
async function ytDownload() {
  if (!yt.videoId) {
    showToast("Busque um vídeo primeiro.", "error");
    return;
  }

  ytDisable("ytDownloadBtn", true);
  ytHide("ytErrorBox");

  /* Show progress */
  var fill = ytEl("ytProgressFill");
  var label = ytEl("ytProgressLabel");
  var pct = ytEl("ytProgressPct");
  ytShow("ytProgressWrap");
  if (fill) {
    fill.style.width = "0%";
    fill.classList.add("indeterminate");
  }
  if (label) label.textContent = "Conectando ao servidor…";
  if (pct) pct.textContent = "";

  try {
    /* ── YOUR BACKEND HOOK ──────────────────────────────────
       Replace this block with your real download call, e.g.:

       var result = await window.YT_BACKEND.download(
         yt.videoId, yt.format, yt.quality
       );
       // result = { downloadUrl: '...', filename: '...' }
       _triggerDownload(result.downloadUrl, result.filename);
    ─────────────────────────────────────────────────────── */

    if (window.YT_BACKEND && typeof window.YT_BACKEND.download === "function") {
      if (fill) fill.classList.remove("indeterminate");
      if (label) label.textContent = "Processando…";

      var result = await window.YT_BACKEND.download(
        yt.videoId,
        yt.format,
        yt.quality,
      );

      _animateProgress(fill, pct, label, 100, function () {
        _triggerDownload(result.downloadUrl, result.filename);
        if (label) label.textContent = "✓ Download iniciado!";
        showToast("Download iniciado!", "success");
        setTimeout(function () {
          ytHide("ytProgressWrap");
        }, 3000);
      });
    } else {
      /* No backend connected — show instructional message */
      if (fill) fill.classList.remove("indeterminate");
      setTimeout(function () {
        ytHide("ytProgressWrap");
        _showError(
          "<b>Backend não conectado.</b><br>" +
            "Implemente <code>window.YT_BACKEND.download(videoId, format, quality)</code> " +
            "no seu servidor para processar o download.<br><br>" +
            "→ videoId: <b>" +
            yt.videoId +
            "</b><br>" +
            "→ format: <b>" +
            yt.format +
            "</b><br>" +
            "→ quality: <b>" +
            yt.quality +
            "</b>",
        );
      }, 800);
    }
  } catch (e) {
    if (fill) fill.classList.remove("indeterminate");
    ytHide("ytProgressWrap");
    _showError(
      "<b>Erro no download:</b> " + (e.message || "Erro desconhecido."),
    );
    showToast("Falha no download.", "error");
  } finally {
    ytDisable("ytDownloadBtn", false);
  }
}

/* ─── Animate progress bar ───────────────────────────────── */
function _animateProgress(fill, pct, label, target, onDone) {
  var current = 0;
  var iv = setInterval(function () {
    current = Math.min(current + Math.random() * 15, target - 2);
    if (fill) fill.style.width = current + "%";
    if (pct) pct.textContent = Math.round(current) + "%";
    if (current >= target - 2) {
      clearInterval(iv);
      if (fill) fill.style.width = "100%";
      if (pct) pct.textContent = "100%";
      if (label) label.textContent = "Concluído!";
      setTimeout(onDone, 400);
    }
  }, 200);
}

/* ─── Trigger file download ──────────────────────────────── */
function _triggerDownload(url, filename) {
  var a = document.createElement("a");
  a.href = url;
  a.download = filename || "download." + yt.format;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ─── Error display ──────────────────────────────────────── */
function _showError(html) {
  ytHtml("ytErrorBox", html);
  ytShow("ytErrorBox");
}

/* ─── Enter key on URL input ─────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  var inp = ytEl("ytUrlInput");
  if (inp) {
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") ytFetchInfo();
    });
  }
});
