"""
Exploding Wumpus: server perantara (Opsi B)

Alur:  Browser  ->  server.py (Flask)  ->  ESP8266 (lewat WiFi)

Fungsi:
  1. Menyajikan file game (index.html, css, js, images) di http://localhost:8000
  2. Meneruskan perintah LED dari game ke ESP8266   (/api/led/<tower>/<mode>)
  3. Menyediakan status ESP untuk badge di game      (/api/status)

Cara jalan:
    pip install -r requirements.txt
    python server.py --esp 192.168.1.100

Lalu buka http://localhost:8000
"""

import argparse
import os
from datetime import datetime

import requests
from flask import Flask, abort, jsonify, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Whitelist: hanya perintah ini yang boleh diteruskan ke ESP
ALLOWED_TOWERS = {"north", "south"}
ALLOWED_MODES = {"blink", "solid", "off"}

# Hanya tipe file ini yang disajikan, supaya server.py / .ino tidak ikut terbuka
STATIC_EXTENSIONS = {".html", ".css", ".js", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".ico"}

app = Flask(__name__)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0  # tanpa cache, jadi perubahan file langsung terlihat

# Diisi dari argumen command line di main()
settings = {"esp_url": "http://192.168.1.100", "timeout": 1.5}


def log(message):
    print(f"[{datetime.now():%H:%M:%S}] {message}", flush=True)


def normalize_esp_url(value):
    value = value.strip().rstrip("/")
    if not value.startswith(("http://", "https://")):
        value = "http://" + value
    return value


def call_esp(path):
    """Kirim GET ke ESP. Mengembalikan (berhasil, response_atau_error)."""
    url = settings["esp_url"] + path
    try:
        response = requests.get(url, timeout=settings["timeout"])
        response.raise_for_status()
        return True, response
    except requests.RequestException as exc:
        return False, exc


def forward(path):
    ok, result = call_esp(path)
    if ok:
        text = result.text.strip()
        log(f"OK     {path}  ->  {text}")
        return jsonify(ok=True, esp_response=text)

    log(f"GAGAL  {path}  ->  {type(result).__name__}")
    return jsonify(ok=False, error="ESP tidak terjangkau", detail=str(result)), 502


# ---------- API ----------
@app.get("/api/led/all/off")
def led_all_off():
    return forward("/led/all/off")


@app.get("/api/led/<tower>/<mode>")
def led(tower, mode):
    if tower not in ALLOWED_TOWERS or mode not in ALLOWED_MODES:
        return jsonify(ok=False, error="tower atau mode tidak dikenal"), 400
    return forward(f"/led/{tower}/{mode}")


@app.get("/api/status")
def status():
    """Selalu 200 selama server hidup. Browser membedakan 'server mati' dan 'ESP offline'."""
    ok, result = call_esp("/status")
    if ok:
        try:
            esp_data = result.json()
        except ValueError:
            esp_data = {}
        return jsonify(server=True, esp_online=True, esp_url=settings["esp_url"], esp=esp_data)

    return jsonify(server=True, esp_online=False, esp_url=settings["esp_url"], error=type(result).__name__)


# ---------- File game ----------
@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<path:filename>")
def static_files(filename):
    if os.path.splitext(filename)[1].lower() not in STATIC_EXTENSIONS:
        abort(404)
    return send_from_directory(BASE_DIR, filename)


# ---------- Main ----------
def main():
    parser = argparse.ArgumentParser(description="Server perantara Exploding Wumpus (Browser -> Python -> ESP8266)")
    parser.add_argument("--esp", default=os.environ.get("ESP_IP", "192.168.1.100"),
                        help="IP ESP8266 (default: 192.168.1.100, atau env ESP_IP)")
    parser.add_argument("--port", type=int, default=8000, help="port server (default: 8000)")
    parser.add_argument("--host", default="127.0.0.1",
                        help="alamat server; pakai 0.0.0.0 supaya bisa dibuka dari perangkat lain")
    parser.add_argument("--timeout", type=float, default=1.5, help="batas waktu menunggu ESP, detik (default: 1.5)")
    args = parser.parse_args()

    settings["esp_url"] = normalize_esp_url(args.esp)
    settings["timeout"] = args.timeout

    print("=" * 52)
    print("  EXPLODING WUMPUS: server perantara")
    print("=" * 52)
    print(f"  Game  : http://{'localhost' if args.host == '127.0.0.1' else args.host}:{args.port}")
    print(f"  ESP   : {settings['esp_url']}")

    ok, _ = call_esp("/status")
    if ok:
        print("  Status: ESP terhubung")
    else:
        print("  Status: ESP belum terjangkau (game tetap bisa dimainkan, LED belum jalan)")
    print("=" * 52)

    app.run(host=args.host, port=args.port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
