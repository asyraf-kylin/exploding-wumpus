# Exploding Wumpus — Operasi Gedung E, F, G ITK

Game web bertema Wumpus World: jinakkan bom Wumpus di tiga gedung ITK (E, F, lalu G) sebelum waktu habis.
Ranjau di peta memicu kuis seputar ITK. LED fisik (NodeMCU/ESP8266) ikut menyala sesuai hasil tiap gedung.

## Cara main

- Gerak: `WASD` atau tombol panah. `G` / spasi = ambil Defuse Kit. `E` = panggil pasukan.
- Kumpulkan 5 Defuse Kit, balik ke Bunker (pojok kiri bawah), lalu panggil pasukan.
- Menginjak bom Wumpus, salah menjawab kuis ranjau, atau waktu habis (60 detik) = gedung hancur.
- Stage berurutan: Gedung E, F, lalu G. Menang atau kalah, stage tetap lanjut.
- Sensor: Bau Mesiu (dekat bom), Dengung Detektor (dekat ranjau), Sinyal Radar (ada kit di petak).

## Menjalankan

```bash
pip install -r requirements.txt
python server.py
```

Buka http://localhost:8000. Game harus dibuka lewat `server.py` supaya jalur `/api/...` ke ESP ketemu.

Pengaturan server (opsional, lewat environment variable):

| Variabel | Default | Fungsi |
|---|---|---|
| `ESP_IP` | `192.168.1.100` | IP NodeMCU, samakan dengan firmware |
| `HOST` | `127.0.0.1` | isi `0.0.0.0` supaya bisa dibuka dari perangkat lain |
| `PORT` | `8000` | port server |

Contoh: `ESP_IP=192.168.0.50 python server.py`

## Gambar kondisi gedung

Taruh 15 gambar (foto udara 1080 x 1080 px) di folder `images/` dengan nama `1.jpg` sampai `15.jpg`.
Kalau formatnya bukan `.jpg`, ubah `BUILDING_IMAGE_EXT` di `js/config.js`.

Hijau = aman, merah = hancur, abu-abu = belum dimainkan. Urutan warna gedung: E, F, G.

| No | Kondisi (E_F_G) | No | Kondisi (E_F_G) |
|---|---|---|---|
| 1 | idle_idle_idle | 9 | destroyed_destroyed_destroyed |
| 2 | clear_idle_idle | 10 | clear_destroyed_idle |
| 3 | clear_clear_idle | 11 | clear_destroyed_clear |
| 4 | clear_clear_destroyed | 12 | clear_destroyed_destroyed |
| 5 | clear_clear_clear | 13 | destroyed_clear_idle |
| 6 | destroyed_idle_idle | 14 | destroyed_clear_destroyed |
| 7 | destroyed_destroyed_idle | 15 | destroyed_clear_clear |
| 8 | destroyed_destroyed_clear | | |

Kalau gambar belum ada, game menampilkan ilustrasi placeholder, jadi tetap bisa dimainkan.

## IoT (opsional)

1. Rakit 3 LED + resistor 220 ohm: E ke `D1`, F ke `D2`, G ke `D5`, katoda ke GND.
2. Buka `firmware/wumpus.ino`, isi `WIFI_SSID`, `WIFI_PASS`, dan IP tetap, lalu upload ke NodeMCU.
3. Jalankan `server.py` dengan `ESP_IP` yang sama.
4. Di `js/config.js`, ubah `IOT_ENABLED` jadi `true`.
5. Opsional: aktifkan baris `<div id="espStatus"></div>` di `index.html` untuk menampilkan badge status ESP.

Perilaku LED: berkedip saat stage dimainkan, menyala saat gedung selamat, mati saat gedung hancur.

Endpoint ESP (dipanggil lewat `server.py`): `/status`, `/led/<e|f|g>/<blink|solid|off>`, `/led/all/off`.

## Struktur

```
exploding-wumpus/
├── index.html
├── server.py            # server game + perantara ke ESP
├── requirements.txt
├── README.md
├── css/style.css
├── js/
│   ├── config.js        # pengaturan game + daftar gambar gedung
│   ├── quiz-data.js     # bank soal kuis (seputar ITK)
│   ├── assets.js        # ikon SVG
│   ├── audio.js         # efek suara (Web Audio)
│   ├── iot.js           # pemanggil API ke server.py + badge status ESP
│   ├── ui.js            # semua urusan tampilan
│   └── game.js          # logika game
├── images/              # 15 gambar kondisi gedung E, F, G
└── firmware/wumpus.ino  # firmware NodeMCU / ESP8266
```

## Menambah soal kuis

Tambah satu objek di `js/quiz-data.js`. `answer` adalah index jawaban benar di `options`.
