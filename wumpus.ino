/*
  Exploding Wumpus - firmware NodeMCU (ESP8266)

  Perangkat:
    - 3 LED merah   : indikator gedung E, F, G
    - 3 LED lampu lalu lintas (merah, kuning, hijau):
        merah tetap = sedang defuse, merah+kuning+hijau kelap-kelip = hasil keluar (berhasil / gagal)
    - LCD 16x2 I2C  : timer + status
    - Buzzer        : beep timer, kuis ranjau, ledakan, nada sukses

  Alur (mengikuti game di browser):
    /stage/start      LED gedung stage itu NYALA (merah), timer LCD jalan, buzzer beep per detik
                      (lampu indikator kembali merah tetap)
    /quiz/start       kena ranjau -> LCD tampil hitung mundur kuis, beep lebih cepat/tinggi
    /quiz/end         kuis dijawab benar -> kembali ke timer biasa
    /stage/clear      LED gedung MATI, lampu indikator kelap-kelip, nada sukses
    /stage/destroyed  LED gedung TETAP NYALA, lampu indikator kelap-kelip, bunyi ledakan
    /reset            semua mati
    /status           JSON status (dipakai badge "ESP terhubung" di game)

  Library (Arduino IDE > Library Manager):
    - "LiquidCrystal I2C" oleh Frank de Brabander
  Board: "NodeMCU 1.0 (ESP-12E Module)" (paket board ESP8266 dari Boards Manager)

  Wiring (semua LED lewat resistor 220 ohm):
    LED gedung E  : D5 -> resistor -> LED -> GND
    LED gedung F  : D6 -> resistor -> LED -> GND
    LED gedung G  : D7 -> resistor -> LED -> GND
    LED hijau     : D0 -> resistor -> LED -> GND
    LED kuning    : 3V3 -> resistor -> LED -> D3   (terbalik / "active low")
    LED merah     : 3V3 -> resistor -> LED -> D4   (dipasang terbalik / "active low", lihat catatan)
    Buzzer        : D8 (+) -> buzzer -> GND
    LCD I2C       : SDA -> D2, SCL -> D1, VCC -> VIN (5V), GND -> GND

  Catatan: D4 (GPIO2) dan D3 (GPIO0) harus HIGH saat boot, makanya LED merah dan kuning dipasang
  aktif-rendah (nyala saat pin LOW). Kalau LED kuning/merah kamu pasang biasa (pin -> resistor -> LED -> GND),
  ubah YELLOW_ACTIVE_LOW / RED_ACTIVE_LOW jadi false.
*/

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ================== PENGATURAN ==================
const char* WIFI_SSID = "Kalorimeter";
const char* WIFI_PASS = "Modul_2#";

// false = IP otomatis dari router (IP tampil di LCD + Serial Monitor saat menyala).
// true  = IP tetap (isi 3 baris di bawah, samakan dengan ESP_IP di server.py).
const bool USE_STATIC_IP = false;
IPAddress STATIC_IP(192, 168, 1, 100);
IPAddress GATEWAY(192, 168, 1, 1);
IPAddress SUBNET(255, 255, 255, 0);

const uint8_t PIN_BLDG[3]   = { D5, D6, D7 };   // gedung E, F, G
const uint8_t PIN_GREEN     = D0;               // hijau
const uint8_t PIN_RED       = D4;               // merah (aktif-rendah)
const uint8_t PIN_YELLOW    = D3;               // kuning (aktif-rendah)
const uint8_t PIN_BUZZER    = D8;
const bool    RED_ACTIVE_LOW = false;
const bool    YELLOW_ACTIVE_LOW = false;
const unsigned long BLINK_MS = 250;             // kecepatan kelap-kelip lampu hasil
// =================================================

struct Note { uint16_t freq; uint16_t ms; };    // freq 0 = jeda
const Note MELODY_BOOM[] = {
  {1200, 40}, {0, 20}, {900, 60}, {700, 70}, {500, 90},
  {350, 110}, {250, 150}, {180, 220}, {0, 40}, {120, 400}
};
const Note MELODY_WIN[] = {
  {523, 120}, {659, 120}, {784, 120}, {1047, 350}
};

enum Mode { MODE_IDLE, MODE_PLAYING, MODE_CLEAR, MODE_DESTROYED };

Mode mode = MODE_IDLE;
int  stageNo = 0;                      // 1..3
bool bldgOn[3] = { false, false, false };
bool chaseActive = false;              // true = lampu merah+kuning+hijau kelap-kelip (hasil stage keluar)
uint8_t chaseStep = 0;                 // 0 = fase nyala, 1 = fase mati
unsigned long nextChaseAt = 0;
unsigned long stageEnd = 0;            // millis() saat timer stage habis
bool quizActive = false;
unsigned long quizEnd = 0;

// buzzer
unsigned long nextBeepAt = 0;
unsigned long toneOffAt = 0;           // 0 = tidak ada nada tunggal yang aktif
const Note* melody = nullptr;
size_t melodyLen = 0, melodyPos = 0;
unsigned long noteEndAt = 0;

LiquidCrystal_I2C* lcd = nullptr;
char lcdCache[2][17] = { "", "" };
unsigned long lastLcdAt = 0;

ESP8266WebServer server(80);

// ---------- Output dasar ----------
void setRed(bool on)   { digitalWrite(PIN_RED, (on != RED_ACTIVE_LOW) ? HIGH : LOW); }
void setGreen(bool on) { digitalWrite(PIN_GREEN, on ? HIGH : LOW); }
void setYellow(bool on) { digitalWrite(PIN_YELLOW, (on != YELLOW_ACTIVE_LOW) ? HIGH : LOW); }

void applyLeds() {
  for (int i = 0; i < 3; i++) digitalWrite(PIN_BLDG[i], bldgOn[i] ? HIGH : LOW);
  if (!chaseActive) {                      // saat kelap-kelip jalan, updateChase() yang atur
    setRed(mode == MODE_PLAYING);          // merah tetap hanya saat tahap defuse
    setYellow(false);
    setGreen(false);
  }
}

// Hasil keluar (berhasil ATAU gagal): merah, kuning, hijau kelap-kelip bersamaan
void updateChase(unsigned long now) {
  if (!chaseActive || (long)(now - nextChaseAt) < 0) return;
  bool on = (chaseStep == 0);
  setRed(on);
  setYellow(on);
  setGreen(on);
  chaseStep = on ? 1 : 0;
  nextChaseAt = now + BLINK_MS;
}

void stopSound() {
  noTone(PIN_BUZZER);
  digitalWrite(PIN_BUZZER, LOW);
  melody = nullptr;
  toneOffAt = 0;
}

void beep(uint16_t freq, uint16_t ms) {
  tone(PIN_BUZZER, freq);
  toneOffAt = millis() + ms;
}

void playMelody(const Note* m, size_t len) {
  stopSound();
  melody = m; melodyLen = len; melodyPos = 0;
  if (m[0].freq) tone(PIN_BUZZER, m[0].freq);
  noteEndAt = millis() + m[0].ms;
}

void updateSound(unsigned long now) {
  // Melodi (ledakan / sukses)
  if (melody) {
    if ((long)(now - noteEndAt) >= 0) {
      melodyPos++;
      if (melodyPos >= melodyLen) { stopSound(); return; }
      const Note& n = melody[melodyPos];
      if (n.freq) tone(PIN_BUZZER, n.freq); else noTone(PIN_BUZZER);
      noteEndAt = now + n.ms;
    }
    return;
  }

  // Matikan beep pendek
  if (toneOffAt && (long)(now - toneOffAt) >= 0) {
    noTone(PIN_BUZZER);
    digitalWrite(PIN_BUZZER, LOW);
    toneOffAt = 0;
  }

  // Beep timer bom: 1x/detik, 2x/detik di 10 detik terakhir, nada lebih tinggi saat kuis ranjau
  if (mode == MODE_PLAYING && (long)(now - nextBeepAt) >= 0) {
    unsigned long remaining = (stageEnd > now) ? (stageEnd - now) : 0;
    bool urgent = remaining <= 10000UL;
    beep(quizActive ? 2600 : 1800, quizActive ? 80 : 60);
    nextBeepAt = now + ((urgent || quizActive) ? 500 : 1000);
  }
}

// ---------- LCD ----------
void lcdLine(int row, const char* text) {
  char buf[17];
  snprintf(buf, sizeof(buf), "%-16.16s", text);   // isi spasi sampai 16 karakter
  if (strcmp(buf, lcdCache[row]) == 0) return;    // tidak berubah, tidak perlu tulis ulang
  strcpy(lcdCache[row], buf);
  lcd->setCursor(0, row);
  lcd->print(buf);
}

void refreshLcd(unsigned long now) {
  char l1[40], l2[40];
  char b = "EFG"[(stageNo >= 1 && stageNo <= 3) ? stageNo - 1 : 0];

  switch (mode) {
    case MODE_PLAYING: {
      unsigned long rem = (stageEnd > now) ? (stageEnd - now + 999) / 1000 : 0;
      snprintf(l1, sizeof(l1), "GEDUNG %c   %02lu:%02lu", b, rem / 60, rem % 60);
      if (quizActive) {
        unsigned long q = (quizEnd > now) ? (quizEnd - now + 999) / 1000 : 0;
        snprintf(l2, sizeof(l2), "RANJAU! QUIZ %2lus", q);
      } else {
        snprintf(l2, sizeof(l2), "BOM AKTIF!");
      }
      break;
    }
    case MODE_CLEAR:
      snprintf(l1, sizeof(l1), "GEDUNG %c AMAN!", b);
      snprintf(l2, sizeof(l2), "BOM DIJINAKKAN!");
      break;
    case MODE_DESTROYED:
      snprintf(l1, sizeof(l1), "GEDUNG %c HANCUR", b);
      snprintf(l2, sizeof(l2), "** BOOM!!! **");
      break;
    default:
      snprintf(l1, sizeof(l1), "EXPLODING WUMPUS");
      snprintf(l2, sizeof(l2), "Menunggu game...");
  }
  lcdLine(0, l1);
  lcdLine(1, l2);
}

// ---------- HTTP ----------
void sendJson(const char* extra) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  char body[160];
  const char* names[] = { "idle", "playing", "clear", "destroyed" };
  snprintf(body, sizeof(body),
           "{\"ok\":true,\"mode\":\"%s\",\"stage\":%d,\"quiz\":%s%s}",
           names[mode], stageNo, quizActive ? "true" : "false", extra);
  server.send(200, "application/json", body);
}

bool readStage() {
  int s = server.arg("stage").toInt();
  if (s < 1 || s > 3) {
    server.send(400, "application/json", "{\"ok\":false,\"error\":\"stage harus 1-3\"}");
    return false;
  }
  stageNo = s;
  return true;
}

void handleStageStart() {
  if (!readStage()) return;
  long t = server.arg("t").toInt();
  if (t < 1 || t > 3600) t = 60;
  mode = MODE_PLAYING;
  quizActive = false;
  bldgOn[stageNo - 1] = true;              // gedung ini terancam: LED merah nyala
  chaseActive = false;                     // kelap-kelip berhenti, lampu kembali merah tetap
  stageEnd = millis() + (unsigned long)t * 1000UL;
  stopSound();
  nextBeepAt = millis();
  applyLeds();
  refreshLcd(millis());
  sendJson("");
}

void handleQuizStart() {
  long t = server.arg("t").toInt();
  if (t < 1 || t > 600) t = 15;
  if (mode == MODE_PLAYING) {
    quizActive = true;
    quizEnd = millis() + (unsigned long)t * 1000UL;
    nextBeepAt = millis();
  }
  refreshLcd(millis());
  sendJson("");
}

void handleQuizEnd() {
  quizActive = false;
  refreshLcd(millis());
  sendJson("");
}

void handleStageClear() {
  if (!readStage()) return;
  mode = MODE_CLEAR;
  quizActive = false;
  bldgOn[stageNo - 1] = false;             // gedung selamat: LED gedung mati
  chaseActive = true;                      // berhasil: semua lampu kelap-kelip
  chaseStep = 0;
  nextChaseAt = millis();
  applyLeds();
  playMelody(MELODY_WIN, sizeof(MELODY_WIN) / sizeof(Note));
  refreshLcd(millis());
  sendJson("");
}

void handleStageDestroyed() {
  if (!readStage()) return;
  mode = MODE_DESTROYED;
  quizActive = false;
  bldgOn[stageNo - 1] = true;              // gedung hancur: LED gedung tetap nyala
  chaseActive = true;                      // gagal: semua lampu kelap-kelip
  chaseStep = 0;
  nextChaseAt = millis();
  applyLeds();
  playMelody(MELODY_BOOM, sizeof(MELODY_BOOM) / sizeof(Note));
  refreshLcd(millis());
  sendJson("");
}

void handleReset() {
  mode = MODE_IDLE;
  stageNo = 0;
  quizActive = false;
  for (int i = 0; i < 3; i++) bldgOn[i] = false;
  chaseActive = false;
  stopSound();
  applyLeds();
  refreshLcd(millis());
  sendJson("");
}

void handleStatus() {
  char extra[48];
  snprintf(extra, sizeof(extra), ",\"rssi\":%d", WiFi.RSSI());
  sendJson(extra);
}

// ---------- Setup ----------
uint8_t findLcdAddress() {
  const uint8_t candidates[] = { 0x27, 0x3F };
  for (uint8_t a : candidates) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) return a;
  }
  return 0x27;   // tidak ketemu: coba alamat umum
}

void selfTest() {
  // Cek cepat semua komponen: tiap LED nyala bergantian + satu beep.
  for (int i = 0; i < 3; i++) { digitalWrite(PIN_BLDG[i], HIGH); delay(150); digitalWrite(PIN_BLDG[i], LOW); }
  setGreen(true); delay(150); setGreen(false);
  setRed(true);   delay(150); setRed(false);
  setYellow(true); delay(150); setYellow(false);
  tone(PIN_BUZZER, 1500); delay(120); noTone(PIN_BUZZER); digitalWrite(PIN_BUZZER, LOW);
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 3; i++) pinMode(PIN_BLDG[i], OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  applyLeds();
  digitalWrite(PIN_BUZZER, LOW);

  Wire.begin(D2, D1);                      // SDA, SCL
  lcd = new LiquidCrystal_I2C(findLcdAddress(), 16, 2);
  lcd->init();
  lcd->backlight();
  lcdLine(0, "EXPLODING WUMPUS");
  lcdLine(1, "Cek komponen...");
  selfTest();

  lcdLine(1, "Konek WiFi...");
  WiFi.mode(WIFI_STA);
  if (USE_STATIC_IP) WiFi.config(STATIC_IP, GATEWAY, SUBNET);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long startWait = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startWait < 20000) {
    delay(250);
    Serial.print('.');
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWiFi OK, IP: %s\n", WiFi.localIP().toString().c_str());
    lcdLine(0, "IP ESP (server):");
    lcdLine(1, WiFi.localIP().toString().c_str());
    delay(4000);                           // waktu untuk mencatat IP
  } else {
    Serial.println("\nWiFi GAGAL (cek SSID/password). Akan mencoba terus.");
    lcdLine(0, "WiFi GAGAL");
    lcdLine(1, "Cek SSID/pass");
    delay(3000);
  }

  server.on("/status", handleStatus);
  server.on("/stage/start", handleStageStart);
  server.on("/stage/clear", handleStageClear);
  server.on("/stage/destroyed", handleStageDestroyed);
  server.on("/quiz/start", handleQuizStart);
  server.on("/quiz/end", handleQuizEnd);
  server.on("/reset", handleReset);
  server.onNotFound([]() { server.send(404, "application/json", "{\"ok\":false,\"error\":\"tidak ada\"}"); });
  server.begin();

  refreshLcd(millis());
}

void loop() {
  server.handleClient();
  unsigned long now = millis();
  updateSound(now);
  updateChase(now);
  if (now - lastLcdAt >= 200) {            // LCD tidak perlu secepat loop
    lastLcdAt = now;
    refreshLcd(now);
  }
}
