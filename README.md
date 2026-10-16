# Exploding Wumpus: Operation WTC Defuse

## Struktur file

Taruh semua file ini dalam satu folder yang sama (kecuali `.ino`, yang di-upload ke ESP):

| File | Isi |
|---|---|
| `index.html` | Kerangka halaman |
| `style.css` | Animasi & gaya kustom |
| `config.js` | Semua pengaturan (IP ESP, waktu, jumlah kit/ranjau, stage) |
| `quiz-data.js` | Bank soal kuis ranjau |
| `assets.js` | Ikon SVG |
| `audio.js` | Efek suara (Web Audio) |
| `iot.js` | Kirim perintah HTTP ke ESP |
| `ui.js` | Render grid, modal, toast, efek ledakan |
| `game.js` | Logika game & kontrol |
| `wumpus_esp8266.ino` | Firmware NodeMCU / ESP8266 |

## Menjalankan game

Cara paling gampang, jalankan server lokal pakai Python dari folder proyek:

```
python -m http.server 8000
```

Lalu buka `http://localhost:8000`. Membuka `index.html` langsung juga bisa.

> Buka lewat `http://`, bukan `https://`. Browser memblokir request ke ESP yang tidak ber-HTTPS dari halaman HTTPS.

## Setup ESP8266

1. Buka `wumpus.ino` di Arduino IDE (board: NodeMCU 1.0 / ESP8266).
2. Isi `WIFI_SSID` dan `WIFI_PASS`.
3. Pastikan IP statis di firmware sama dengan `NODEMCU_IP` di `config.js`.
4. Wiring: D1 → resistor 220Ω → LED North → GND, D2 → resistor 220Ω → LED South → GND.
5. Upload, lalu tes di browser: `http://192.168.1.100/led/north/blink`.

Kalau belum punya ESP, set `IOT_ENABLED: false` di `config.js`.

## Kontrol

WASD / panah = jalan, `G` / spasi = ambil kit, `E` = panggil pasukan.

## Alur stage

- Menang Stage 1 → lanjut Stage 2.
- Kalah di stage mana pun → ulangi stage yang sama.
- Menang Stage 2 → selesai, kembali ke Stage 1.
