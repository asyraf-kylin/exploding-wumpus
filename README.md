# Exploding Wumpus — Operasi Gedung E, F, G ITK

Game web bertema Wumpus World: jinakkan bom Wumpus di tiga gedung ITK (E, F, lalu G) sebelum waktu habis.
Ranjau di peta memicu kuis seputar ITK. LED, LCD, dan buzzer fisik (NodeMCU/ESP8266) ikut mengikuti jalannya game.

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

## IoT (NodeMCU ESP8266)

### Komponen

3 LED merah (gedung E, F, G), 1 LED hijau (berhasil), 1 LED merah (gagal), LCD 16x2 I2C, buzzer, NodeMCU ESP8266, resistor 220 ohm untuk tiap LED.

### Wiring

| Komponen | Pin NodeMCU | Catatan |
|---|---|---|
| LED merah gedung E | `D5` | D5 -> resistor 220 -> LED -> GND |
| LED merah gedung F | `D6` | sama |
| LED merah gedung G | `D7` | sama |
| LED hijau (berhasil) | `D0` | D0 -> resistor 220 -> LED -> GND |
| LED merah (gagal) | `D4` | **terbalik**: 3V3 -> resistor 220 -> LED (anoda) -> kaki katoda ke D4 |
| Buzzer | `D8` | D8 -> buzzer (+), buzzer (-) -> GND. Aktif maupun pasif bisa |
| LCD I2C | `D2` (SDA), `D1` (SCL) | VCC ke `VIN` (5V), GND ke GND |

LED merah gagal dipasang terbalik karena `D4` (GPIO2) harus HIGH saat NodeMCU menyala.

### Alur LED, LCD, buzzer

| Kejadian di game | LED gedung | LED hijau / merah | LCD | Buzzer |
|---|---|---|---|---|
| Stage mulai | gedung stage itu **nyala** | mati | `GEDUNG E   00:59` / `BOM AKTIF!` | beep tiap detik, 2x/detik di 10 detik terakhir |
| Menginjak ranjau (kuis) | tetap nyala | mati | baris 2: `RANJAU! QUIZ 12s` | beep lebih tinggi dan cepat |
| Kuis benar | tetap nyala | mati | kembali ke timer | beep timer biasa |
| Jawaban salah / waktu habis / injak bom | **tetap nyala** (gedung meledak) | **merah** nyala | `GEDUNG E HANCUR` / `** BOOM!!! **` | bunyi ledakan |
| Defuse berhasil | **mati** (gedung aman) | **hijau** nyala | `GEDUNG E AMAN!` / `BOM DIJINAKKAN!` | nada sukses |
| Stage berikutnya mulai | gedung baru nyala, gedung hancur sebelumnya tetap nyala | **tidak berubah**: hasil stage sebelumnya (hijau / merah) bertahan sampai hasil stage ini keluar | timer baru | beep timer |
| Selesai stage terakhir | LED tetap seperti hasil akhir (gedung hancur tetap nyala) sampai Reset Misi ditekan | sesuai hasil | hasil stage terakhir | diam |
| Reset misi | semua mati | mati | `EXPLODING WUMPUS` | diam |

Timer LCD dihitung sendiri oleh NodeMCU dari waktu yang dikirim game di awal stage, jadi tetap mulus walau WiFi lag. Hasil akhir (clear / hancur) tetap diputuskan oleh game.

### Langkah pasang

1. Rakit sesuai tabel wiring.
2. Arduino IDE: pasang paket board **ESP8266** (Boards Manager) dan library **LiquidCrystal I2C** oleh Frank de Brabander (Library Manager). Pilih board `NodeMCU 1.0 (ESP-12E Module)`.
3. Buka `firmware/wumpus/wumpus.ino`, isi `WIFI_SSID` dan `WIFI_PASS`, lalu upload.
4. Saat menyala, NodeMCU mengetes semua LED dan buzzer, lalu menampilkan **alamat IP-nya di LCD** (juga di Serial Monitor 115200). Catat IP itu.
5. Jalankan server dengan IP tersebut: `ESP_IP=192.168.x.x python server.py` (Windows PowerShell: `$env:ESP_IP="192.168.x.x"; python server.py`).
6. Buka http://localhost:8000. Badge pojok kanan atas menunjukkan `ESP: TERHUBUNG`.

Komputer yang menjalankan `server.py` dan NodeMCU harus ada di WiFi/jaringan yang sama. Kalau ingin IP tetap, ubah `USE_STATIC_IP` di firmware.
Untuk mematikan fitur IoT, ubah `IOT_ENABLED` jadi `false` di `js/config.js`. Tanpa NodeMCU, game tetap bisa dimainkan.

Endpoint NodeMCU (dipanggil lewat `server.py` sebagai `/api/...`): `/status`, `/stage/start?stage=1&t=60`, `/quiz/start?t=15`, `/quiz/end`, `/stage/clear?stage=1`, `/stage/destroyed?stage=1`, `/reset`.

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
│   ├── iot.js           # pengirim perintah ke server.py + badge status ESP
│   ├── ui.js            # semua urusan tampilan
│   └── game.js          # logika game
├── images/              # 15 gambar kondisi gedung E, F, G
└── firmware/wumpus/wumpus.ino   # firmware NodeMCU / ESP8266
```

## Menambah soal kuis

Tambah satu objek di `js/quiz-data.js`. `answer` adalah index jawaban benar di `options`.
