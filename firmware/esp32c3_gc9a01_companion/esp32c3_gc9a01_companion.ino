#define LGFX_USE_V1
#include <Arduino.h>
#include <WiFi.h>
#include <time.h>
#include <DHT.h>
#include <LovyanGFX.hpp>
#include "iot_maker_logo_240.h"

// =====================================================
// WIFI SETTINGS
// =====================================================
const char* WIFI_SSID = "esp";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";  // Paste your password locally before uploading.

// Display Configuration Labels
const char* LOCATION_NAME = "BENGALURU";
const long GMT_OFFSET_SEC = 19800;  // India Standard Time (UTC+5:30)
const int DAYLIGHT_OFFSET_SEC = 0;
const char* NTP_SERVER = "pool.ntp.org";

// =====================================================
// DHT11 SENSOR CONFIGURATION
// =====================================================
#define DHT_PIN 3
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// =====================================================
// MULTI-SYSTEM DRIVER DEFINITION
// =====================================================
class LGFX_ESP32C3_GC9A01 : public lgfx::LGFX_Device {
  lgfx::Panel_GC9A01 panel;
  lgfx::Bus_SPI bus;

public:
  LGFX_ESP32C3_GC9A01() {
    auto cfg = bus.config();
    cfg.spi_host = SPI2_HOST;
    cfg.spi_mode = 0;
    cfg.freq_write = 20000000;  // 20MHz stabilizes data throughput to avoid antenna jamming
    cfg.freq_read = 16000000;
    cfg.pin_sclk = 4;
    cfg.pin_mosi = 6;
    cfg.pin_miso = -1;
    cfg.pin_dc = 1;
    bus.config(cfg);
    panel.setBus(&bus);

    auto pc = panel.config();
    pc.pin_cs = 7;
    pc.pin_rst = 0;
    pc.pin_busy = -1;
    pc.panel_width = 240;
    pc.panel_height = 240;
    pc.memory_width = 240;
    pc.memory_height = 240;
    pc.offset_x = 0;
    pc.offset_y = 0;
    pc.invert = true;
    pc.rgb_order = false;
    panel.config(pc);
    setPanel(&panel);
  }
};

LGFX_ESP32C3_GC9A01 tft;
// Face graphics are drawn directly to the TFT to avoid a large framebuffer.

// =====================================================
// COLOR SPECTRUM SYSTEM
// =====================================================
constexpr uint16_t BLACK = 0x0000;
constexpr uint16_t NAVY = 0x0861;
constexpr uint16_t CYAN = 0x07FF;
constexpr uint16_t BLUE = 0x249F;
constexpr uint16_t WHITE = 0xFFFF;
constexpr uint16_t YELLOW = 0xFFE0;
constexpr uint16_t GREEN = 0x07E0;
constexpr uint16_t RED = 0xF800;
constexpr uint16_t GREY = 0x8410;
constexpr uint16_t PINK = 0xF81F;
constexpr uint16_t PURPLE = 0xA81F;

constexpr int CX = 120;
constexpr int CY = 120;

// =====================================================
// STATE REGISTERS & GLOBAL ENGINE TIMER BLOCKS
// =====================================================
enum OperationalMode { MODE_FACE,
                       MODE_DASHBOARD };
OperationalMode currentMode = MODE_FACE;
uint32_t lastModeSwitchTime = 0;
constexpr uint32_t MODE_SWITCH_INTERVAL_MS = 4000;  // Cycles screens every 4 seconds

// Sensor Tracking Fields
float temperatureC = NAN;
float humidityPct = NAN;
bool sensorValid = false;
bool clockValid = false;
bool ntpRequested = false;

uint32_t lastSensorRead = 0;
uint32_t lastDisplayUpdate = 0;
uint32_t lastWiFiAttempt = 0;
const uint32_t SENSOR_INTERVAL_MS = 2500;
const uint32_t DISPLAY_INTERVAL_MS = 500;
const uint32_t WIFI_RETRY_MS = 15000;

// Robotic Expressions Fields
enum Emotion {
  NEUTRAL,
  HAPPY,
  SAD,
  ANGRY,
  SLEEPY,
  SURPRISED,
  CURIOUS,
  CONFUSED,
  EXCITED,
  SUSPICIOUS,
  SCARED,
  LOVE,
  DIZZY,
  THINKING,
  CRYING,
  PLAYFUL,
  TIRED,
  DETERMINED,
  EMOTION_COUNT
};

Emotion emotion = NEUTRAL;
uint32_t emotionTimer = 0;
uint32_t frameTimer = 0;
uint32_t blinkTimer = 0;
uint32_t blinkStart = 0;
uint32_t gazeTimer = 0;

int gazeX = 0;
int gazeY = 0;
bool blinking = false;
constexpr uint32_t EMOTION_MS = 3000;
constexpr uint32_t FRAME_MS = 200;  // Direct TFT redraw; reduces unnecessary refresh traffic.
constexpr uint32_t BLINK_MS = 150;

// =====================================================
// TEXT & GRAPHICS HELPERS
// =====================================================
void centeredText(const char* text, int x, int y, uint16_t color, int size = 1) {
  tft.setTextDatum(middle_center);
  tft.setTextColor(color, BLACK);
  tft.setTextSize(size);
  tft.drawString(text, x, y);
}

void clearTextArea(int x, int y, int w, int h) {
  tft.fillRect(x, y, w, h, BLACK);
}

void drawWiFiIcon(int x, int y, bool connected) {
  uint16_t c = connected ? GREEN : RED;
  tft.fillCircle(x, y - 7, 2, c);
  tft.drawLine(x - 5, y - 3, x, y + 1, c);
  tft.drawLine(x + 5, y - 3, x, y + 1, c);
  tft.drawLine(x - 9, y - 6, x, y + 3, c);
  tft.drawLine(x + 9, y - 6, x, y + 3, c);
  tft.fillCircle(x, y + 4, 2, c);
}

void drawThermometer(int x, int y) {
  tft.drawRoundRect(x - 4, y - 10, 8, 20, 4, CYAN);
  tft.fillCircle(x, y + 9, 5, CYAN);
  tft.fillRect(x - 2, y - 3, 4, 12, CYAN);
}

void drawHumidityIcon(int x, int y) {
  tft.fillTriangle(x, y - 10, x - 6, y + 2, x + 6, y + 2, BLUE);
  tft.fillCircle(x, y + 3, 6, BLUE);
  tft.fillCircle(x, y + 3, 2, BLACK);
}

// =====================================================
// EXPRESIONS GENERATOR RENDERING HELPER PIPELINES
// =====================================================
void sparkle(int x, int y, int r, uint16_t color) {
  tft.drawLine(x - r, y, x + r, y, color);
  tft.drawLine(x, y - r, x, y + r, color);
  tft.drawLine(x - r / 2, y - r / 2, x + r / 2, y + r / 2, color);
  tft.drawLine(x - r / 2, y + r / 2, x + r / 2, y - r / 2, color);
}

void heart(int x, int y, int s, uint16_t color) {
  tft.fillCircle(x - s / 3, y - s / 4, s / 3, color);
  tft.fillCircle(x + s / 3, y - s / 4, s / 3, color);
  tft.fillTriangle(x - s * 2 / 3, y - s / 5, x + s * 2 / 3, y - s / 5, x, y + s, color);
}

void eyebrows(int x, int y, Emotion e) {
  int lx = x - 17;
  int rx = x + 17;
  int by = y - 37;
  switch (e) {
    case ANGRY:
    case DETERMINED:
      tft.drawLine(lx - 12, by - 5, lx + 12, by + 4, CYAN);
      tft.drawLine(rx - 12, by + 4, rx + 12, by - 5, CYAN);
      break;
    case SAD:
    case CRYING:
      tft.drawLine(lx - 12, by + 4, lx + 12, by - 4, BLUE);
      tft.drawLine(rx - 12, by - 4, rx + 12, by + 4, BLUE);
      break;
    case SURPRISED:
    case SCARED:
    case EXCITED:
      tft.drawLine(lx - 10, by - 5, lx + 10, by - 5, CYAN);
      tft.drawLine(rx - 10, by - 5, rx + 10, by - 5, CYAN);
      break;
    case CONFUSED:
    case CURIOUS:
    case SUSPICIOUS:
      tft.drawLine(lx - 10, by - 3, lx + 10, by, CYAN);
      tft.drawLine(rx - 10, by, rx + 10, by - 6, CYAN);
      break;
    default:
      tft.drawLine(lx - 8, by, lx + 8, by, NAVY);
      tft.drawLine(rx - 8, by, rx + 8, by, NAVY);
      break;
  }
}

void drawEye(int x, int y, int w, int h, Emotion e, bool closed, uint16_t color) {
  if (closed || h < 5) {
    tft.drawLine(x - w / 2, y, x - w / 4, y + 3, color);
    tft.drawLine(x - w / 4, y + 3, x, y + 4, color);
    tft.drawLine(x, y + 4, x + w / 4, y + 3, color);
    tft.drawLine(x + w / 4, y + 3, x + w / 2, y, color);
    return;
  }
  tft.fillRoundRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 14, NAVY);
  tft.fillRoundRect(x - w / 2, y - h / 2, w, h, 12, color);
  int px = x + gazeX;
  int py = y + gazeY;
  if (e == LOVE) {
    heart(px, py - 2, 16, PINK);
  } else if (e == DIZZY) {
    tft.drawLine(px - 7, py - 7, px + 7, py + 7, BLACK);
    tft.drawLine(px + 7, py - 7, px - 7, py + 7, BLACK);
  } else if (e == EXCITED) {
    tft.fillCircle(px, py, 6, WHITE);
    tft.drawCircle(px, py, 9, BLUE);
  } else {
    tft.fillCircle(px, py, 9, BLACK);
    tft.fillCircle(px - 3, py - 4, 3, WHITE);
  }
  if (e == SLEEPY || e == TIRED) {
    tft.fillRect(x - w / 2, y - h / 2, w, h / 3, BLACK);
    tft.drawLine(x - w / 2, y - h / 6, x + w / 2, y - h / 6, color);
  }
  if (e == ANGRY || e == DETERMINED) { tft.fillTriangle(x - w / 2, y - h / 2, x + w / 2, y - h / 2, x + w / 2, y - h / 5, BLACK); }
  if (e == SAD || e == CRYING) { tft.fillTriangle(x - w / 2, y - h / 2, x + w / 2, y - h / 2, x - w / 2, y + h / 5, BLACK); }
}

void drawExtras(Emotion e) {
  switch (e) {
    case HAPPY:
      tft.drawLine(42, 148, 54, 152, PINK);
      tft.drawLine(186, 152, 198, 148, PINK);
      break;
    case EXCITED:
      sparkle(37, 86, 6, YELLOW);
      sparkle(203, 86, 6, YELLOW);
      break;
    case LOVE:
      heart(39, 86, 11, PINK);
      heart(201, 86, 11, PINK);
      break;
    case DIZZY:
      tft.drawCircle(120, 181, 6, PURPLE);
      tft.drawCircle(120, 181, 3, PURPLE);
      break;
    case THINKING:
      tft.drawCircle(191, 78, 4, CYAN);
      tft.drawCircle(202, 67, 3, CYAN);
      break;
    case CRYING:
      tft.fillCircle(66, 151, 4, CYAN);
      tft.fillCircle(174, 151, 4, CYAN);
      tft.fillTriangle(62, 153, 70, 153, 66, 163, CYAN);
      tft.fillTriangle(170, 153, 178, 153, 174, 163, CYAN);
      break;
    case PLAYFUL:
      tft.drawLine(108, 180, 120, 187, PINK);
      tft.drawLine(120, 187, 132, 180, PINK);
      break;
    case SCARED: tft.drawCircle(120, 181, 8, BLUE); break;
    default: break;
  }
}

// =====================================================
// VIEW RENDER EXECUTION PLANNERS
// =====================================================
void renderFace() {
  tft.fillScreen(BLACK);
  tft.drawCircle(CX, CY, 108, NAVY);
  tft.drawCircle(CX, CY, 105, NAVY);

  int w = 64;
  int h = 54;
  int ey = 116;
  int gx = gazeX;
  int gy = gazeY;
  uint16_t color = CYAN;
  bool forcedClosed = false;

  switch (emotion) {
    case HAPPY:
      w = 64;
      h = 38;
      break;
    case SAD:
      w = 64;
      h = 49;
      gy = 4;
      color = BLUE;
      break;
    case ANGRY:
      w = 64;
      h = 43;
      color = BLUE;
      break;
    case SLEEPY:
      w = 64;
      h = 32;
      forcedClosed = true;
      color = BLUE;
      break;
    case SURPRISED:
      w = 58;
      h = 62;
      break;
    case CURIOUS:
      w = 60;
      h = 50;
      gx = 7;
      break;
    case CONFUSED:
      w = 64;
      h = 45;
      gx = -4;
      break;
    case EXCITED:
      w = 64;
      h = 58;
      color = YELLOW;
      break;
    case SUSPICIOUS:
      w = 64;
      h = 36;
      gx = 8;
      color = BLUE;
      break;
    case SCARED:
      w = 58;
      h = 60;
      color = BLUE;
      break;
    case LOVE:
      w = 64;
      h = 52;
      color = PINK;
      break;
    case DIZZY:
      w = 64;
      h = 52;
      color = PURPLE;
      break;
    case THINKING:
      w = 64;
      h = 48;
      gx = 9;
      gy = -5;
      break;
    case CRYING:
      w = 64;
      h = 44;
      color = BLUE;
      break;
    case PLAYFUL:
      w = 64;
      h = 45;
      gx = -5;
      break;
    case TIRED:
      w = 64;
      h = 32;
      color = BLUE;
      break;
    case DETERMINED:
      w = 64;
      h = 42;
      color = BLUE;
      break;
    default: break;
  }

  const int leftX = 78;
  const int rightX = 162;
  eyebrows(leftX, ey, emotion);
  eyebrows(rightX, ey, emotion);
  bool closed = blinking || forcedClosed;

  drawEye(leftX, ey, w, h, emotion, closed, color);

  drawEye(rightX, ey, w, h, emotion, closed, color);
  drawExtras(emotion);
  tft.setTextDatum(middle_center);
  tft.setTextColor(NAVY, BLACK);
  tft.setTextSize(1);
  tft.drawString("THE IoT MAKER", CX, 204);
  int sx = CX - 34;
  for (int i = 0; i < EMOTION_COUNT; i++) {
    tft.fillCircle(sx + i * 4, 219, 1, (i == emotion) ? CYAN : NAVY);
  }
}
void drawHomeLayout() {
  tft.fillScreen(BLACK);
  tft.drawCircle(CX, CY, 108, NAVY);
  tft.drawCircle(CX, CY, 105, NAVY);
  centeredText("THE IoT MAKER", CX, 30, CYAN, 1);
  bool connected = (WiFi.status() == WL_CONNECTED);
  drawWiFiIcon(43, 57, connected);
  centeredText(connected ? "WIFI CONNECTED" : "WIFI OFFLINE", 123, 57, connected ? GREEN : RED, 1);
  struct tm timeInfo;
  char timeText[12] = "--:--";
  char dateText[24] = "WAITING FOR NTP";
  if (clockValid && getLocalTime(&timeInfo, 5)) {
    strftime(timeText, sizeof(timeText), "%H:%M", &timeInfo);
    strftime(dateText, sizeof(dateText), "%a, %d %b", &timeInfo);
  }
  centeredText(timeText, CX, 88, WHITE, 3);
  centeredText(dateText, CX, 111, BLUE, 1);
  // Matching sensor cards: same icon offset, value baseline, and label center.
  tft.drawRoundRect(25, 130, 92, 60, 9, NAVY);
  tft.drawRoundRect(123, 130, 92, 60, 9, NAVY);
  drawThermometer(43, 148);
  drawHumidityIcon(141, 148);

  char tempText[16];
  char humText[16];
  if (sensorValid) {
    snprintf(tempText, sizeof(tempText), "%.1f C", temperatureC);
    snprintf(humText, sizeof(humText), "%.0f %%", humidityPct);
  } else {
    snprintf(tempText, sizeof(tempText), "--.- C");
    snprintf(humText, sizeof(humText), "-- %%");
  }
  centeredText(tempText, 81, 150, CYAN, 2);
  centeredText(humText, 179, 150, WHITE, 2);
  centeredText("TEMP", 71, 174, GREY, 1);
  centeredText("HUMIDITY", 169, 174, GREY, 1);
  tft.drawLine(52, 194, 188, 194, NAVY);
  centeredText(LOCATION_NAME, CX, 207, YELLOW, 1);
  centeredText("SMART DASHBOARD", CX, 224, BLUE, 1);
}
void updateActiveDashboardElements() {
  bool connected = (WiFi.status() == WL_CONNECTED);
  clearTextArea(30, 39, 175, 34);
  drawWiFiIcon(43, 57, connected);
  centeredText(connected ? "WIFI CONNECTED" : "WIFI OFFLINE", 123, 57, connected ? GREEN : RED, 1);
  struct tm timeInfo;
  char timeText[12] = "--:--";
  char dateText[24] = "WAITING FOR NTP";
  if (getLocalTime(&timeInfo, 5)) {
    strftime(timeText, sizeof(timeText), "%H:%M", &timeInfo);
    strftime(dateText, sizeof(dateText), "%a, %d %b", &timeInfo);
    clockValid = true;
  }
  clearTextArea(45, 69, 150, 39);
  clearTextArea(46, 101, 148, 19);
  centeredText(timeText, CX, 88, WHITE, 3);
  centeredText(dateText, CX, 111, BLUE, 1);
  char tempText[16];
  char humText[16];
  if (sensorValid) {
    snprintf(tempText, sizeof(tempText), "%.1f C", temperatureC);
    snprintf(humText, sizeof(humText), "%.0f %%", humidityPct);
  } else {
    snprintf(tempText, sizeof(tempText), "--.- C");
    snprintf(humText, sizeof(humText), "-- %%");
  }
  // Clear only each card's value field, preserving its border and icon.
  tft.fillRect(53, 137, 58, 27, BLACK);
  tft.fillRect(151, 137, 58, 27, BLACK);
  centeredText(tempText, 81, 150, CYAN, 2);
  centeredText(humText, 179, 150, WHITE, 2);
}
// =====================================================
// RECURRENT STATE BACKGROUND ASYNC ENGINES
// =====================================================
void runExpressionStateEngine(uint32_t now) {
  if (now - emotionTimer >= EMOTION_MS) {
    emotionTimer = now;
    // Corrected casting syntax using explicit template indicators
    emotion = static_cast<Emotion>((static_cast<int>(emotion) + 1) % EMOTION_COUNT);
  }
  if (!blinking && (now - blinkTimer >= 3000 + random(4000))) {
    blinking = true;
    blinkStart = now;
  }
  if (blinking && (now - blinkStart >= BLINK_MS)) {
    blinking = false;
    blinkTimer = now;
  }
  if (now - gazeTimer >= 1500 + random(2000)) {
    gazeTimer = now;
    if (random(10) > 6) {
      gazeX = random(-6, 7); gazeY = random(-4, 5);
    } else {
      gazeX = 0; gazeY = 0;
    }
  }
}

// =====================================================
// START NTP WHEN WIFI CONNECTS
// =====================================================
void startNTP() {
  configTime(
    GMT_OFFSET_SEC,
    DAYLIGHT_OFFSET_SEC,
    NTP_SERVER);
  ntpRequested = true;
  Serial.println("NTP time synchronization requested.");
}
// =====================================================
// NON-BLOCKING WIFI MANAGEMENT
// =====================================================
void manageWiFi(uint32_t now) {
  if (WiFi.status() == WL_CONNECTED) {
    if (!ntpRequested) {
      startNTP();
    }
    return;
  }
  ntpRequested = false;
  if (now - lastWiFiAttempt < WIFI_RETRY_MS) {
    return;
  }
  lastWiFiAttempt = now;
  Serial.printf("Connecting to Wi-Fi SSID: %s\n", WIFI_SSID);
  if (WiFi.status() != WL_IDLE_STATUS) {
    WiFi.disconnect();
  }
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);  // Suppress antenna electrical noise to keep SPI clean
}
void runNetworkAndSensorEngines(uint32_t now) {
  // Asynchronous Sensor Engine
  if (now - lastSensorRead >= SENSOR_INTERVAL_MS) {
    lastSensorRead = now;
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    if (!isnan(h) && !isnan(t)) {
      temperatureC = t;
      humidityPct = h;
      sensorValid = true;
    }
  }
  // Execute Non-Blocking Wi-Fi Management Block
  manageWiFi(now);
}
// =====================================================
// STARTUP LOGO SPLASH
// Header must define a 240x240 RGB565 array named
// iot_maker_logo_240. Keep the header beside this sketch.
// =====================================================
void showLogoSplash() {
  tft.fillScreen(WHITE);
  tft.setSwapBytes(true);
  tft.pushImage(0, 0, 240, 240, iot_maker_logo_240);
  delay(2200);
  tft.setSwapBytes(false);
}

// =====================================================
// CORE ARDUINO BOOT & SCHEDULER LOOP
// =====================================================
void setup() {
  Serial.begin(115200);
  // Clean initialization sequence to prevent background crash loops
  WiFi.disconnect(true, true);
  delay(400);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);
  Serial.println("[BOOT] Initializing Hardware SPI and Modules...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);  // Drops radio current load spikes
  dht.begin();
  tft.init();
  tft.setRotation(0);

  // Show the logo after panel initialization and before any screen renderer.
  showLogoSplash();

  lastModeSwitchTime = millis();
  drawHomeLayout();  // Initialize base canvas coordinates layout
}
void loop() {
  uint32_t now = millis();
  // Run async asset trackers continuously
  runNetworkAndSensorEngines(now);
  // Screen Mode Switching logic (Swaps screens every 4 seconds)
  if (now - lastModeSwitchTime >= MODE_SWITCH_INTERVAL_MS) {
    lastModeSwitchTime = now;
    // Alternate between the face and dashboard every four seconds.
    currentMode = (currentMode == MODE_FACE) ? MODE_DASHBOARD : MODE_FACE;
    if (currentMode == MODE_DASHBOARD) {
      drawHomeLayout();  // Full layout background refresh when flipping
    }
  }
  // Screen View Rendering Logic
  if (currentMode == MODE_FACE) {
    runExpressionStateEngine(now);
    if (now - frameTimer >= FRAME_MS) {
      frameTimer = now;
      renderFace();  // Draws directly to the TFT without a full-screen sprite
    }
  } else {
    if (now - lastDisplayUpdate >= DISPLAY_INTERVAL_MS) {
      lastDisplayUpdate = now;
      updateActiveDashboardElements();  // Partial space refresh to clear out screen flicker
    }
  }
}
