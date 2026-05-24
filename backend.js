/* ═══════════════════════════════════════════════════════════
   VLTX — Conector Frontend ↔ Backend

   ⚠ APÓS HOSPEDAR NO RAILWAY:
   Substitua a URL abaixo pela URL do seu serviço.
   Ex: "https://vltx-backend.up.railway.app"
═══════════════════════════════════════════════════════════ */

var BASE_URL = "lk-backend-production-91d8.up.railway.app"; // ← trocar aqui

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
