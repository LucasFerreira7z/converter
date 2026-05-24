"""
VLTX — Backend YouTube (Flask + pytube)
========================================
Instalar dependências:
  pip install flask flask-cors pytube

Rodar:
  python server.py

O servidor sobe em http://localhost:5000
"""

import os
import re
import tempfile
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from pytubefix import YouTube

server = Flask(__name__)

# Permite o frontend (qualquer origem) chamar este servidor
CORS(server)

# Pasta temporária para guardar os arquivos baixados
DOWNLOAD_DIR = tempfile.mkdtemp()


# ─── Utilitário ──────────────────────────────────────────────
def extract_video_id(url_or_id: str) -> str:
    """Extrai o ID de 11 chars de uma URL do YouTube."""
    patterns = [
        r"youtu\.be/([^?&\s]+)",
        r"youtube\.com/watch\?.*v=([^&\s]+)",
        r"youtube\.com/shorts/([^?&\s]+)",
        r"youtube\.com/embed/([^?&\s]+)",
        r"^([a-zA-Z0-9_-]{11})$",
    ]
    for pat in patterns:
        m = re.search(pat, url_or_id)
        if m:
            return m.group(1)
    raise ValueError("ID de vídeo inválido")


# ─── Rota 1: buscar informações do vídeo ─────────────────────
@server.route("/api/info")
def info():
    """
    GET /api/info?v=VIDEO_ID
    Retorna: { title, channel, views, duration, thumbUrl }
    """
    video_id = request.args.get("v", "").strip()
    if not video_id:
        return jsonify({"error": "Parâmetro 'v' obrigatório"}), 400

    try:
        vid_id = extract_video_id(video_id)
        url = f"https://www.youtube.com/watch?v={vid_id}"

        yt = YouTube(url)

        # Formata duração  ex: "3:45"
        secs = yt.length or 0
        duration = f"{secs // 60}:{secs % 60:02d}" if secs else ""

        # Formata visualizações  ex: "1.2M"
        views = yt.views or 0
        if views >= 1_000_000:
            views_str = f"{views / 1_000_000:.1f}M visualizações"
        elif views >= 1_000:
            views_str = f"{views / 1_000:.0f}K visualizações"
        else:
            views_str = f"{views} visualizações"

        return jsonify({
            "title":    yt.title,
            "channel":  yt.author,
            "views":    views_str,
            "duration": duration,
            "thumbUrl": yt.thumbnail_url,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Rota 2: baixar o vídeo/áudio ────────────────────────────
@server.route("/api/download")
def download():
    """
    GET /api/download?v=VIDEO_ID&fmt=mp3|mp4&q=128|192|320|360|720|1080
    Retorna o arquivo diretamente para o browser baixar.
    """
    video_id = request.args.get("v", "").strip()
    fmt      = request.args.get("fmt", "mp3").strip().lower()
    quality  = request.args.get("q", "128").strip()

    if not video_id:
        return jsonify({"error": "Parâmetro 'v' obrigatório"}), 400

    try:
        vid_id = extract_video_id(video_id)
        url = f"https://www.youtube.com/watch?v={vid_id}"
        yt = YouTube(url)

        safe_title = re.sub(r'[\\/*?:"<>|]', "-", yt.title)[:60].strip()

        if fmt == "mp3":
            # Baixa só o áudio e envia como .mp3
            stream = (
                yt.streams
                  .filter(only_audio=True)
                  .order_by("abr")
                  .last()           # maior bitrate disponível
            )
            if not stream:
                return jsonify({"error": "Nenhuma stream de áudio encontrada"}), 404

            filepath = stream.download(
                output_path=DOWNLOAD_DIR,
                filename=safe_title + ".mp4"   # pytube baixa como .mp4
            )

            # Renomeia para .mp3
            mp3_path = filepath.replace(".mp4", ".mp3")
            os.rename(filepath, mp3_path)

            return send_file(
                mp3_path,
                as_attachment=True,
                download_name=safe_title + ".mp3",
                mimetype="audio/mpeg",
            )

        else:  # mp4
            # Mapeia qualidade solicitada → itag do YouTube
            quality_map = {
                "360":  "18",   # 360p
                "720":  "22",   # 720p
                "1080": None,   # precisa merge (não suportado sem ffmpeg aqui)
            }

            if quality == "1080":
                # 1080p precisa de ffmpeg para merge — usa 720p como fallback
                stream = yt.streams.get_by_itag(22)
                if not stream:
                    stream = yt.streams.get_highest_resolution()
            elif quality == "720":
                stream = yt.streams.get_by_itag(22)
                if not stream:
                    stream = yt.streams.get_highest_resolution()
            else:
                stream = yt.streams.get_by_itag(18)
                if not stream:
                    stream = yt.streams.get_highest_resolution()

            if not stream:
                return jsonify({"error": "Nenhuma stream de vídeo encontrada"}), 404

            filepath = stream.download(
                output_path=DOWNLOAD_DIR,
                filename=safe_title + ".mp4",
            )

            return send_file(
                filepath,
                as_attachment=True,
                download_name=safe_title + ".mp4",
                mimetype="video/mp4",
            )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Iniciar servidor ─────────────────────────────────────────
if __name__ == "__main__":
    print("✅ VLTX Backend rodando em http://localhost:5000")
    print("   Pasta de downloads temporários:", DOWNLOAD_DIR)
    server.run(debug=True, port=5000)
