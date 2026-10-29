/*
  Firmware Exploding Wumpus - NodeMCU (ESP8266)

  Alur: game (browser) -> server.py (/api/led/...) -> ESP ini (/led/...)

  Wiring (LED + resistor 220 ohm, katoda ke GND):
    LED Gedung E -> D1 (GPIO5)
    LED Gedung F -> D2 (GPIO4)
    LED Gedung G -> D5 (GPIO14)

  Endpoint (semua GET, membalas 200 OK kalau berhasil):
    /status                    -> cek ESP hidup (dipakai badge ESP di game)
    /led/<e|f|g>/<mode>        -> mode: blink | solid | off
    /led/all/off               -> matikan semua LED

  Perilaku LED (sesuai game):
    blink = gedung sedang dimainkan
    solid = gedung selamat (clear)
    off   = gedung hancur / belum dimainkan

  Cara pakai:
    1. Isi WIFI_SSID, WIFI_PASS, lalu IP tetap di bawah.
    2. Pastikan STATIC_IP SAMA dengan ESP_IP di server.py
       (default 192.168.1.100), atau jalankan: ESP_IP=<ip> python server.py
    3. Board: "NodeMCU 1.0 (ESP-12E Module)", library bawaan ESP8266 core.
*/

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

// ---------- Pengaturan WiFi ----------
const char* WIFI_SSID = "NAMA_WIFI";
const char* WIFI_PASS = "PASSWORD_WIFI";

// IP tetap. Harus satu jaringan dengan laptop yang menjalankan server.py.
IPAddress STATIC_IP(192, 168, 1, 100);   // samakan dengan ESP_IP di server.py
IPAddress GATEWAY(192, 168, 1, 1);       // IP router
IPAddress SUBNET(255, 255, 255, 0);
IPAddress DNS(8, 8, 8, 8);

// ---------- Pin LED ----------
const uint8_t PIN_E = D1;
const uint8_t PIN_F = D2;
const uint8_t PIN_G = D5;

const unsigned long BLINK_INTERVAL_MS = 300;   // kecepatan kedip
const unsigned long WIFI_RETRY_MS     = 10000; // jeda coba sambung ulang WiFi

// ---------- Status LED ----------
enum LedMode { MODE_OFF, MODE_SOLID, MODE_BLINK };

struct Led {
  char          id;       // 'e' | 'f' | 'g'
  uint8_t       pin;
  LedMode       mode;
  bool          level;    // keadaan fisik saat ini (untuk blink)
};

Led leds[] = {
  { 'e', PIN_E, MODE_OFF, false },
  { 'f', PIN_F, MODE_OFF, false },
  { 'g', PIN_G, MODE_OFF, false }
};
const uint8_t LED_COUNT = sizeof(leds) / sizeof(leds[0]);

ESP8266WebServer server(80);

unsigned long lastBlink = 0;
unsigned long lastWifiTry = 0;

// ---------- Helper LED ----------
Led* findLed(char id) {
  for (uint8_t i = 0; i < LED_COUNT; i++) {
    if (leds[i].id == id) return &leds[i];
  }
  return nullptr;
}

void writeLed(Led &l, bool on) {
  l.level = on;
  digitalWrite(l.pin, on ? HIGH : LOW);
}

void setMode(Led &l, LedMode mode) {
  l.mode = mode;
  switch (mode) {
    case MODE_OFF:   writeLed(l, false); break;
    case MODE_SOLID: writeLed(l, true);  break;
    case MODE_BLINK: writeLed(l, true);  break;   // mulai dari menyala, lalu dikedipkan di loop()
  }
}

void allOff() {
  for (uint8_t i = 0; i < LED_COUNT; i++) setMode(leds[i], MODE_OFF);
}

// Kedip tanpa delay(), supaya web server tetap responsif (server.py timeout 1,5 detik).
void updateBlink() {
  unsigned long now = millis();
  if (now - lastBlink < BLINK_INTERVAL_MS) return;
  lastBlink = now;

  for (uint8_t i = 0; i < LED_COUNT; i++) {
    if (leds[i].mode == MODE_BLINK) writeLed(leds[i], !leds[i].level);
  }
}

// ---------- Handler HTTP ----------
void sendOk(const String &msg) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", msg);
}

void sendErr(int code, const String &msg) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(code, "text/plain", msg);
}

void handleStatus() {
  sendOk("OK");
}

// Mengurai URI manual: /led/<gedung>/<mode>
void handleLedRoute() {
  String uri = server.uri();   // contoh: "/led/e/blink"

  if (!uri.startsWith("/led/")) {
    sendErr(404, "Not found");
    return;
  }

  String rest = uri.substring(5);          // "e/blink" atau "all/off"
  int slash = rest.indexOf('/');
  if (slash < 0) {
    sendErr(400, "Format: /led/<e|f|g>/<blink|solid|off>");
    return;
  }

  String building = rest.substring(0, slash);
  String modeStr  = rest.substring(slash + 1);
  building.toLowerCase();
  modeStr.toLowerCase();

  // /led/all/off
  if (building == "all") {
    if (modeStr != "off") {
      sendErr(400, "Untuk 'all' hanya mode 'off'");
      return;
    }
    allOff();
    sendOk("ALL OFF");
    return;
  }

  // /led/<e|f|g>/<mode>
  if (building.length() != 1) {
    sendErr(400, "Gedung harus e, f, atau g");
    return;
  }
  Led* led = findLed(building.charAt(0));
  if (!led) {
    sendErr(400, "Gedung harus e, f, atau g");
    return;
  }

  if (modeStr == "blink")      setMode(*led, MODE_BLINK);
  else if (modeStr == "solid") setMode(*led, MODE_SOLID);
  else if (modeStr == "off")   setMode(*led, MODE_OFF);
  else {
    sendErr(400, "Mode harus blink, solid, atau off");
    return;
  }

  Serial.printf("LED %c -> %s\n", led->id, modeStr.c_str());
  sendOk("OK");
}

void handleNotFound() {
  if (server.uri().startsWith("/led/")) {
    handleLedRoute();
    return;
  }
  sendErr(404, "Not found");
}

// ---------- WiFi ----------
void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.config(STATIC_IP, GATEWAY, SUBNET, DNS);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("Menyambung ke WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Tersambung. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Gagal sambung WiFi, akan dicoba lagi di loop().");
  }
}

// Tes singkat saat boot: tiap LED menyala bergantian, memastikan wiring benar.
void bootTest() {
  for (uint8_t i = 0; i < LED_COUNT; i++) {
    digitalWrite(leds[i].pin, HIGH);
    delay(150);
    digitalWrite(leds[i].pin, LOW);
  }
}

// ---------- Arduino ----------
void setup() {
  Serial.begin(115200);
  delay(100);

  for (uint8_t i = 0; i < LED_COUNT; i++) {
    pinMode(leds[i].pin, OUTPUT);
    digitalWrite(leds[i].pin, LOW);
  }
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);   // LED bawaan aktif LOW: HIGH = mati

  bootTest();
  connectWifi();

  server.on("/status", HTTP_GET, handleStatus);
  server.onNotFound(handleNotFound);
  server.begin();
  Serial.println("HTTP server jalan di port 80");
}

void loop() {
  server.handleClient();
  updateBlink();

  // LED bawaan NodeMCU menyala = WiFi tersambung
  digitalWrite(LED_BUILTIN, WiFi.status() == WL_CONNECTED ? LOW : HIGH);

  // Sambung ulang otomatis kalau WiFi putus
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiTry > WIFI_RETRY_MS) {
    lastWifiTry = millis();
    Serial.println("WiFi putus, mencoba sambung ulang...");
    WiFi.disconnect();
    WiFi.config(STATIC_IP, GATEWAY, SUBNET, DNS);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
  }
}
