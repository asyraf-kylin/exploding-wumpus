/*
 * Exploding Wumpus: Twin Towers Operation - firmware NodeMCU (ESP8266)
 * Dikendalikan oleh server.py lewat WiFi (Browser -> Python -> ESP8266).
 *
 * Wiring:
 *   D1 (GPIO5) -> resistor 220 ohm -> LED North Tower -> GND
 *   D2 (GPIO4) -> resistor 220 ohm -> LED South Tower -> GND
 *
 * Endpoint (HTTP GET):
 *   /led/north/blink | /led/north/solid | /led/north/off
 *   /led/south/blink | /led/south/solid | /led/south/off
 *   /led/all/off
 *   /status   -> JSON: kondisi LED, IP, kekuatan sinyal, uptime
 *
 * Indikator saat nyala:
 *   Kedua LED berkedip 3x = berhasil tersambung WiFi.
 *   Kedua LED berkedip cepat 6x = gagal tersambung (akan terus mencoba di background).
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>

// ====== Ubah sesuai jaringanmu ======
const char* WIFI_SSID = "NAMA_WIFI";
const char* WIFI_PASS = "PASSWORD_WIFI";

// IP statis: harus sama dengan nilai --esp saat menjalankan server.py
IPAddress localIP(192, 168, 1, 100);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dnsServer(8, 8, 8, 8);
// ====================================

const unsigned long BLINK_INTERVAL_MS = 400;
const unsigned long WIFI_CHECK_INTERVAL_MS = 10000;

enum LedMode { LED_OFF, LED_BLINK, LED_SOLID };

struct Tower {
  const char* name;
  uint8_t pin;
  LedMode mode;
  bool level;
  unsigned long lastToggle;
};

Tower northTower = { "north", D1, LED_OFF, false, 0 };
Tower southTower = { "south", D2, LED_OFF, false, 0 };

ESP8266WebServer server(80);

const char* modeName(LedMode m) {
  switch (m) {
    case LED_BLINK: return "blink";
    case LED_SOLID: return "solid";
    default:        return "off";
  }
}

void writeLed(Tower &t) {
  digitalWrite(t.pin, t.level ? HIGH : LOW);
}

void setMode(Tower &t, LedMode m) {
  t.mode = m;
  t.lastToggle = millis();
  t.level = (m != LED_OFF);  // blink dimulai dari menyala
  writeLed(t);
}

// Kedip tanpa delay(), supaya web server tetap responsif
void updateTower(Tower &t) {
  if (t.mode == LED_BLINK && millis() - t.lastToggle >= BLINK_INTERVAL_MS) {
    t.lastToggle = millis();
    t.level = !t.level;
    writeLed(t);
  }
}

// Dipakai di setup() saja (memakai delay)
void flashBoth(int times, int intervalMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(northTower.pin, HIGH);
    digitalWrite(southTower.pin, HIGH);
    delay(intervalMs);
    digitalWrite(northTower.pin, LOW);
    digitalWrite(southTower.pin, LOW);
    delay(intervalMs);
  }
}

void sendOk(const String &body) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", body);
}

void respond(Tower &t, LedMode m) {
  setMode(t, m);
  sendOk(String(t.name) + " -> " + modeName(m));
}

void handleStatus() {
  String json = "{\"north\":\"";
  json += modeName(northTower.mode);
  json += "\",\"south\":\"";
  json += modeName(southTower.mode);
  json += "\",\"ip\":\"";
  json += WiFi.localIP().toString();
  json += "\",\"rssi\":";
  json += String(WiFi.RSSI());
  json += ",\"uptime_s\":";
  json += String(millis() / 1000);
  json += "}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.config(localIP, gateway, subnet, dnsServer);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("Menyambung ke WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\nTersambung. IP: ");
    Serial.println(WiFi.localIP());
    flashBoth(3, 150);
  } else {
    Serial.println("\nGagal tersambung. Cek SSID/password. Akan dicoba lagi otomatis.");
    flashBoth(6, 60);
  }
}

// Sambung ulang otomatis kalau WiFi sempat putus
void keepWiFiAlive() {
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck < WIFI_CHECK_INTERVAL_MS) return;
  lastCheck = millis();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi putus, mencoba menyambung ulang...");
    WiFi.reconnect();
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(northTower.pin, OUTPUT);
  pinMode(southTower.pin, OUTPUT);
  setMode(northTower, LED_OFF);
  setMode(southTower, LED_OFF);

  connectWiFi();

  if (MDNS.begin("wumpus")) {
    Serial.println("mDNS aktif: http://wumpus.local");
  }

  server.on("/led/north/blink", []() { respond(northTower, LED_BLINK); });
  server.on("/led/north/solid", []() { respond(northTower, LED_SOLID); });
  server.on("/led/north/off",   []() { respond(northTower, LED_OFF); });

  server.on("/led/south/blink", []() { respond(southTower, LED_BLINK); });
  server.on("/led/south/solid", []() { respond(southTower, LED_SOLID); });
  server.on("/led/south/off",   []() { respond(southTower, LED_OFF); });

  server.on("/led/all/off", []() {
    setMode(northTower, LED_OFF);
    setMode(southTower, LED_OFF);
    sendOk("all -> off");
  });

  server.on("/status", handleStatus);

  server.onNotFound([]() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(404, "text/plain", "Endpoint tidak dikenal");
  });

  server.begin();
  Serial.println("HTTP server berjalan");
}

void loop() {
  server.handleClient();
  MDNS.update();
  keepWiFiAlive();
  updateTower(northTower);
  updateTower(southTower);
}