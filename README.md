# Exploding Wumpus: Twin Towers Operation

Alur koneksi:

```
Browser (game)  ->  server.py (Python/Flask)  ->  ESP8266 (WiFi)  ->  LED North / South & Bomb
```

## Struktur file

Taruh semua file dalam satu folder yang sama (kecuali `.ino`, yang di-upload ke ESP). Gambar di subfolder `images/`.

| File | Isi |
|---|---|
| `server.py` | Server perantara: menyajikan game, meneruskan perintah LED ke ESP, cek status ESP |
| `requirements.txt` | Dependensi Python (flask, requests) |
| `wumpus.ino` | Firmware NodeMCU / ESP8266 |
| `index.html`, `style.css` | Halaman dan gaya |
| `config.js` | Pengaturan game (waktu, jumlah kit/ranjau, gambar WTC) |
| `quiz-data.js`, `assets.js`, `audio.js`, `ui.js`, `game.js` | Data kuis, ikon, suara, tampilan, logika |
| `iot.js` | Pemanggil API ke server.py + badge status ESP |

## Langkah 1: ESP8266

1. Buka `wumpus_esp8266.ino` di Arduino IDE (board: NodeMCU 1.0 / ESP8266).
2. Isi `WIFI_SSID` dan `WIFI_PASS`. Sesuaikan IP statis dengan jaringanmu.
3. Wiring: D1 → resistor 220Ω → LED North → GND, D2 → resistor 220Ω → LED South → GND.
4. Upload. Kalau WiFi tersambung, kedua LED berkedip 3x.
5. Tes di browser: `http://192.168.1.100/status` harus menampilkan JSON.

## Langkah 2: Server Python

```
pip install -r requirements.txt
python server.py --esp 192.168.1.100
```

Lalu buka game di **http://localhost:8000** (bukan membuka `index.html` langsung dari folder).

Opsi tambahan:

| Opsi | Fungsi |
|---|---|
| `--esp IP` | IP ESP (atau set env `ESP_IP`) |
| `--port 8080` | Ganti port |
| `--host 0.0.0.0` | Izinkan dibuka dari perangkat lain di jaringan yang sama |
| `--timeout 2` | Lama menunggu ESP (detik) |

## Badge status di game

Tambahkan `<div id="espStatus"></div>` di bawah subjudul di `index.html`. Badge-nya:

| Badge | Artinya |
|---|---|
| ESP ONLINE (hijau) | Server dan ESP sama-sama jalan |
| ESP OFFLINE (merah) | Server jalan, tapi ESP tidak terjangkau |
| SERVER PYTHON MATI (kuning) | `server.py` tidak jalan / game tidak dibuka lewat server |

## Kalau ESP OFFLINE

- Laptop dan ESP harus satu jaringan WiFi. Sebagian WiFi publik/kampus memblokir komunikasi antar perangkat (client isolation); pakai hotspot HP atau router sendiri.
- IP di `.ino` harus sama dengan `--esp`.
- Cek langsung dari browser: `http://<IP ESP>/status`.
- Lihat log di terminal `server.py`: tiap perintah tercatat OK atau GAGAL.

## Kontrol game

WASD / panah = jalan, `G` / spasi = ambil kit, `E` = panggil pasukan.

## Alur stage

- Stage 1 (North Tower), lalu Stage 2 (South Tower), menang atau kalah tetap lanjut.
- Setelah Stage 2, kembali ke Stage 1 dan semua LED dimatikan.
