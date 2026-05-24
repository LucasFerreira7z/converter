/* ═══════════════════════════════════════════════════════════
   VLTX — Conector Frontend ↔ Backend
═══════════════════════════════════════════════════════════ */

var BASE_URL = "https://lk-backend-production-91d8.up.railway.app";

window.YT_BACKEND = {
  async fetchInfo(videoId) {
    var res = await fetch(BASE_URL + "/api/info?v=" + videoId);
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao buscar informações");
    return data;
  },

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
    return {
      downloadUrl: url,
      filename: videoId + "." + format,
    };
  },
};
