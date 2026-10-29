"""Server Exploding Wumpus.

Tugasnya dua:
1. Menyajikan game (index.html, css/, js/, images/) di http://localhost:8000
2. Jadi perantara browser -> ESP8266, supaya game tidak bicara langsung ke ESP.

Alur LED: game (browser) -> /api/led/<gedung>/<mode> di sini -> /led/<gedung>/<mode> di ESP

Jalankan:
    pip install -r requirements.txt
    python server.py

Pengaturan lewat environment variable (opsional):
    ESP_IP   alamat IP NodeMCU, harus sama dengan di firmware (default 192.168.1.100)
    HOST     alamat server (default 127.0.0.1; isi 0.0.0.0 supaya bisa dibuka dari HP/laptop lain)
    PORT     port server (default 8000)
"""

import os

import requests
from flask import Flask, abort, jsonify, send_from_directory

ESP_IP = os.environ.get("ESP_IP", "192.168.1.100")
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))

# Harus lebih kecil dari IOT_REQUEST_TIMEOUT_MS di js/iot.js (4000 ms),
# supaya "ESP offline" tidak salah terbaca sebagai "server mati".
ESP_TIMEOUT_SEC = 1.5

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_FOLDERS = {"css", "js", "images"}   # hanya folder ini yang boleh dibuka dari browser

BUILDINGS = {"e", "f", "g"}                # sama dengan iotPrefix di js/config.js
MODES = {"blink", "solid", "off"}

app = Flask(__name__, static_folder=None)


# ---------- Perantara ke ESP ----------
def esp_get(path):
    return requests.get(f"http://{ESP_IP}{path}", timeout=ESP_TIMEOUT_SEC)


def forward_to_esp(path):
    try:
        res = esp_get(path)
    except requests.RequestException:
        return jsonify(ok=False, error="ESP tidak terjangkau"), 502
    if not res.ok:
        return jsonify(ok=False, error=f"ESP membalas {res.status_code}"), 502
    return jsonify(ok=True)


@app.get("/api/status")
def api_status():
    try:
        online = esp_get("/status").ok
    except requests.RequestException:
        online = False
    return jsonify(esp_online=online)


@app.get("/api/led/all/off")
def api_led_all_off():
    return forward_to_esp("/led/all/off")


@app.get("/api/led/<building>/<mode>")
def api_led(building, mode):
    if building not in BUILDINGS or mode not in MODES:
        abort(400)
    return forward_to_esp(f"/led/{building}/{mode}")


# ---------- File game ----------
@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/favicon.ico")
def favicon():
    return "", 204


@app.get("/<path:filename>")
def static_files(filename):
    if filename.split("/")[0] not in PUBLIC_FOLDERS:
        abort(404)
    return send_from_directory(BASE_DIR, filename)


if __name__ == "__main__":
    print(f"Game: http://{'localhost' if HOST == '127.0.0.1' else HOST}:{PORT}   |   ESP: http://{ESP_IP}")
    app.run(host=HOST, port=PORT)
