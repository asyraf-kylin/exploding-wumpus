"""Server game + perantara ke NodeMCU (ESP8266).

Browser memanggil /api/<perintah>, server meneruskannya ke http://<ESP_IP>/<perintah>.
Dengan begitu browser tidak kena masalah CORS / mixed-content, dan IP ESP cukup diatur di sini.

Jalankan:
    pip install -r requirements.txt
    python server.py
"""
import os

import requests
from flask import Flask, Response, request, send_from_directory

ESP_IP = os.environ.get("ESP_IP", "192.168.1.9")
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
ESP_TIMEOUT = 1.5  # detik; ESP8266 biasanya menjawab < 100 ms

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=None)

# Hanya perintah ini yang boleh diteruskan ke ESP.
ALLOWED = ("status", "stage/start", "stage/clear", "stage/destroyed",
           "quiz/start", "quiz/end", "reset")


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    # Hanya folder aset game yang disajikan, bukan seluruh isi proyek (mis. server.py).
    if filename.split("/")[0] not in ("css", "js", "images"):
        return Response("Not found", status=404)
    return send_from_directory(BASE_DIR, filename)


@app.route("/api/<path:command>")
def proxy_to_esp(command):
    if command not in ALLOWED:
        return Response("Perintah tidak dikenal", status=404)
    try:
        r = requests.get(f"http://{ESP_IP}/{command}", params=request.args, timeout=ESP_TIMEOUT)
        return Response(r.content, status=r.status_code,
                        content_type=r.headers.get("Content-Type", "application/json"))
    except requests.RequestException:
        return Response(f'{{"ok":false,"error":"ESP tidak terjangkau ({ESP_IP})"}}',
                        status=502, content_type="application/json")


if __name__ == "__main__":
    print(f"Game : http://{HOST}:{PORT}")
    print(f"ESP  : http://{ESP_IP}  (ubah dengan: ESP_IP=192.168.x.x python server.py)")
    app.run(host=HOST, port=PORT, threaded=True)
