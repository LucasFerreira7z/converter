/* ═══════════════════════════════════════════════════════════
   VLTX — Conector Frontend ↔ Backend

   Este arquivo conecta a UI do YouTube (youtube.js)
   ao servidor Flask (server.py).

   Altere BASE_URL se o seu servidor rodar em outra porta.
═══════════════════════════════════════════════════════════ */

var BASE_URL = "http://localhost:5000";

window.YT_BACKEND = {
  /* ── Busca informações do vídeo ─────────────────────────
     Chama GET /api/info?v=VIDEO_ID
     Retorna: { title, channel, views, duration, thumbUrl }
  ──────────────────────────────────────────────────────── */
  async fetchInfo(videoId) {
    var res = await fetch(BASE_URL + "/api/info?v=" + videoId);
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao buscar informações");
    return data;
  },

  /* ── Faz o download ─────────────────────────────────────
     Chama GET /api/download?v=VIDEO_ID&fmt=mp3|mp4&q=qualidade
     O servidor retorna o arquivo diretamente.
  ──────────────────────────────────────────────────────── */
  async download(videoId, format, quality) {
    var url =
      BASE_URL +
      "/api/download" +
      "?v=" +
      encodeURIComponent(videoId) +
      "&fmt=" +
      encodeURIComponent(format) +
      "&q=" +
      encodeURIComponent(quality);

    /* Retorna a URL para o youtube.js fazer o download */
    return {
      downloadUrl: url,
      filename: videoId + "." + format,
    };
  },
};
