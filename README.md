# Exploding Wumpus: Twin Towers Operation

Game web bertema ITK (Institut Teknologi Kalimantan): jinakkan bom di **North Tower** dan **South Tower** ala Wumpus World, jawab kuis ranjau, dan lihat kondisi Twin Towers berubah sesuai hasilmu. LED di ESP8266 ikut menyala sebagai umpan balik.

Alur koneksi:

```
Browser (game)  ->  server.py (Python/Flask)  ->  ESP8266 (WiFi)  ->  LED North / South
```

## Struktur folder

```
Exploding Wumpus/
├── index.html
├── server.py
├── requirements.txt
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── config.js        # pengaturan game + daftar gambar WTC
│   ├── quiz-data.js     # bank soal kuis (seputar ITK)
│   ├── assets.js        # ikon SVG
│   ├── audio.js         # efek suara (Web Audio)
│   ├── iot.js           # pemanggil API ke server.py + badge status ESP
│   ├── ui.js            # semua urusan tampilan
│   └── game.js          # logika game
├── images/              # 7 gambar kondisi WTC
└── firmware/
    └── wumpus.ino      # firmware NodeMCU / ESP8266
```

Nama folder `firmware/wumpus/` harus sama dengan nama file `wumpus.ino`, ini aturan Arduino IDE.

## Status IoT

```

Opsional, untuk badge status ESP, tambahkan di bawah subjudul:

```html
<div id="espStatus"></div>
```

## Gambar kondisi Twin Tower

Taruh di `images/`. Nama file diatur di `js/config.js` (`WTC_IMAGES`). Kalau file belum ada, game menampilkan ilustrasi placeholder.

| Kondisi | File |
|---|---|
| Misi dimulai | `wtc-idle.jpg` |
| North aman, South belum | `north-clear.jpg` |
| North hancur, South belum | `north-destroyed.jpg` |
| Kedua aman | `wtc-win.jpg` |
| North aman, South hancur | `north-clear-south-destroyed.jpg` |
| North hancur, South aman | `north-destroyed-south-clear.jpg` |
| Kedua hancur | `wtc-gameover.jpg` |

Ukuran yang disarankan: **1280 x 1080** (rasio `aspect-[32/27]`, pakai `object-contain`). Kalau memakai gambar potret, pakai **1080 x 1350** dengan `aspect-[4/5]` dan `object-cover object-top` agar tidak ada celah di panel.

## Langkah 1: ESP8266

1. Buka `firmware/wumpus/wumpus.ino` di Arduino IDE (board: NodeMCU 1.0 / ESP8266).
2. Isi `WIFI_SSID` dan `WIFI_PASS`. Sesuaikan IP statis dengan jaringanmu.
3. Wiring: D1 -> resistor 220 ohm -> LED North -> GND, D2 -> resistor 220 ohm -> LED South -> GND.
4. Upload. Kalau WiFi tersambung, kedua LED berkedip 3x (gagal: 6x cepat).
5. Tes di browser: `http://192.168.1.100/status` harus menampilkan JSON.

Endpoint ESP: `/led/{north,south}/{blink,solid,off}`, `/led/all/off`, `/status`. Alamat mDNS: `wumpus.local`.

## Langkah 2: Server Python

```
pip install -r requirements.txt
python server.py --esp 192.168.1.100
```

Lalu buka **http://localhost:8000** (jangan membuka `index.html` langsung dari folder).

| Opsi | Fungsi |
|---|---|
| `--esp IP` | IP ESP (atau env `ESP_IP`) |
| `--port 8080` | Ganti port |
| `--host 0.0.0.0` | Izinkan dibuka dari perangkat lain di jaringan yang sama |
| `--timeout 2` | Lama menunggu ESP (detik) |

## Badge status ESP

| Badge | Artinya |
|---|---|
| ESP ONLINE (hijau) | Server dan ESP sama-sama jalan |
| ESP OFFLINE (merah) | Server jalan, tapi ESP tidak terjangkau |
| SERVER PYTHON MATI (kuning) | `server.py` tidak jalan / game tidak dibuka lewat server |

## Kalau ESP OFFLINE

- Laptop dan ESP harus satu jaringan WiFi. Sebagian WiFi publik/kampus memblokir komunikasi antar perangkat (client isolation); pakai hotspot HP atau router sendiri.
- IP di `wumpus.ino` harus sama dengan `--esp`.
- Cek langsung dari browser: `http://<IP ESP>/status`.
- Lihat log di terminal `server.py`: tiap perintah tercatat OK atau GAGAL.

## Kontrol

`WASD` / panah = jalan, `G` / spasi = ambil kit, `E` = panggil pasukan.

## Alur stage

- Stage 1 (North Tower), lalu Stage 2 (South Tower). Menang atau kalah, tetap lanjut ke stage berikutnya.
- Hasil tiap stage mengubah gambar WTC dan LED tower terkait (menyala tetap = aman, mati = hancur).
- Setelah Stage 2 selesai, game kembali ke Stage 1 dan semua LED dimatikan.
- Tiap stage: 60 detik, kuis ranjau 15 detik, soal diacak (tidak berulang sampai semua soal keluar).
