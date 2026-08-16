/**
 * ============================================================
 * ESP32 Fingerprint Controller Firmware
 * For: AS608 / R307 Optical Fingerprint Sensor
 * ============================================================
 *
 * HARDWARE REQUIREMENTS:
 *   - ESP32 DevKit board (any variant)
 *   - AS608 or R307 optical fingerprint module
 *
 * UART WIRING (AS608/R307 → ESP32):
 *   AS608/R307 VCC  → ESP32 3.3V or 5V (check module datasheet!)
 *   AS608/R307 GND  → ESP32 GND
 *   AS608/R307 TX   → ESP32 GPIO16 (Serial2 RX)
 *   AS608/R307 RX   → ESP32 GPIO17 (Serial2 TX)
 *
 * LIBRARY DEPENDENCIES (install via Arduino Library Manager):
 *   - Adafruit Fingerprint Sensor Library (Adafruit)
 *   - ArduinoJson (6.x)
 *   - WiFi (built-in ESP32)
 *   - WebServer (built-in ESP32)
 *
 * COMMUNICATION PROTOCOL:
 *   This firmware exposes a simple HTTP REST API so the Node.js backend
 *   can issue commands:
 *
 *   GET  /status   → { "connected": true, "templateCount": 5, "deviceId": "ESP32-BIO-01" }
 *   POST /enroll   → Body: { "contactId": 12 } → { "success": true, "fingerprintId": 27 }
 *   POST /identify → { "event": "FINGERPRINT_RECOGNIZED", "fingerprintId": 27, "confidence": 95 }
 *   POST /delete   → Body: { "fingerprintId": 27 } → { "success": true }
 *
 * CONFIGURATION:
 *   Update WIFI_SSID, WIFI_PASSWORD, BACKEND_URL, and DEVICE_ID below.
 *   Never commit credentials to Git — use placeholder values in version control.
 *
 * WARNING:
 *   Always verify power requirements before wiring. AS608 modules typically
 *   operate at 3.3V logic but may require 5V VCC. R307 modules typically
 *   require 3.6–6V VCC. Consult your specific module's datasheet.
 *
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Adafruit_Fingerprint.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURATION — Update these values for your environment
// NEVER commit real credentials to version control.
// ============================================================
const char* WIFI_SSID        = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD    = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL      = "http://192.168.1.100:5000";  // Node.js backend IP
const char* DEVICE_ID        = "ESP32-BIO-01";
const char* SENSOR_TYPE      = "AS608";
const char* API_KEY          = "YOUR_ESP32_API_KEY";       // Matches server ESP32_API_KEY
const int   FIRMWARE_VERSION = 120;                          // 1.2.0

// ============================================================
// UART PINS for AS608 / R307 Sensor
// Serial2: RX=GPIO16, TX=GPIO17
// ============================================================
#define FINGERPRINT_BAUD 57600
HardwareSerial fingerprintSerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerprintSerial);

// ============================================================
// HTTP Web Server (Port 80)
// ============================================================
WebServer server(80);

// ============================================================
// Heartbeat timer
// ============================================================
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

// ============================================================
// UTILITY: Send JSON response
// ============================================================
void sendJson(int code, const String& payload) {
  server.sendHeader("Content-Type", "application/json");
  server.send(code, "application/json", payload);
}

// ============================================================
// SENSOR STATUS HANDLER
// GET /status
// ============================================================
void handleStatus() {
  int templateCount = 0;
  bool connected = false;

  if (finger.verifyPassword()) {
    connected = true;
    finger.getTemplateCount();
    templateCount = finger.templateCount;
  }

  StaticJsonDocument<256> doc;
  doc["connected"] = connected;
  doc["templateCount"] = templateCount;
  doc["deviceId"] = DEVICE_ID;
  doc["sensorType"] = SENSOR_TYPE;
  doc["firmwareVersion"] = "1.2.0";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["mode"] = "hardware";

  String output;
  serializeJson(doc, output);
  sendJson(200, output);
}

// ============================================================
// ENROLLMENT HANDLER — Captures 2 images, creates template
// POST /enroll
// Body: { "contactId": 12, "preferredSlot": null }
// ============================================================
void handleEnroll() {
  if (!server.hasArg("plain")) {
    sendJson(400, "{\"success\":false,\"message\":\"Request body required.\"}");
    return;
  }

  StaticJsonDocument<128> reqDoc;
  DeserializationError err = deserializeJson(reqDoc, server.arg("plain"));
  if (err) {
    sendJson(400, "{\"success\":false,\"message\":\"Invalid JSON body.\"}");
    return;
  }

  int contactId = reqDoc["contactId"] | 0;
  int preferredSlot = reqDoc["preferredSlot"] | 0;

  if (contactId == 0) {
    sendJson(400, "{\"success\":false,\"message\":\"contactId is required.\"}");
    return;
  }

  // ---- STEP 1: First finger capture ----
  Serial.println("[ENROLL] Place finger on sensor...");
  int result;
  int maxWait = 30; // 30 x 500ms = 15 seconds timeout

  // Wait for valid image
  int tries = 0;
  while ((result = finger.getImage()) != FINGERPRINT_OK) {
    if (result == FINGERPRINT_NOFINGER) {
      delay(500);
      tries++;
      if (tries >= maxWait) {
        sendJson(408, "{\"success\":false,\"message\":\"Timeout: No finger detected. Please place your finger firmly on the sensor.\"}");
        return;
      }
    } else {
      sendJson(500, "{\"success\":false,\"message\":\"Sensor error during first image capture.\"}");
      return;
    }
  }

  result = finger.image2Tz(1);
  if (result != FINGERPRINT_OK) {
    sendJson(500, "{\"success\":false,\"message\":\"Poor fingerprint quality. Clean the sensor and try again.\"}");
    return;
  }

  // ---- STEP 2: Remove finger and second capture ----
  Serial.println("[ENROLL] Remove finger and place again...");
  delay(2000);

  while (finger.getImage() != FINGERPRINT_NOFINGER) {
    delay(200);
  }

  tries = 0;
  while ((result = finger.getImage()) != FINGERPRINT_OK) {
    if (result == FINGERPRINT_NOFINGER) {
      delay(500);
      tries++;
      if (tries >= maxWait) {
        sendJson(408, "{\"success\":false,\"message\":\"Timeout on second capture. Please try again.\"}");
        return;
      }
    } else {
      sendJson(500, "{\"success\":false,\"message\":\"Sensor error on second capture.\"}");
      return;
    }
  }

  result = finger.image2Tz(2);
  if (result != FINGERPRINT_OK) {
    sendJson(500, "{\"success\":false,\"message\":\"Second image quality poor.\"}");
    return;
  }

  // ---- STEP 3: Create template from both images ----
  result = finger.createModel();
  if (result == FINGERPRINT_ENROLLMISMATCH) {
    sendJson(400, "{\"success\":false,\"message\":\"Fingerprint mismatch between two captures. Please try again.\"}");
    return;
  } else if (result != FINGERPRINT_OK) {
    sendJson(500, "{\"success\":false,\"message\":\"Failed to create fingerprint template.\"}");
    return;
  }

  // ---- STEP 4: Store template in sensor ----
  int targetSlot = (preferredSlot > 0 && preferredSlot <= 1000) ? preferredSlot : 0;

  if (targetSlot == 0) {
    finger.getTemplateCount();
    targetSlot = finger.templateCount + 1;
    if (targetSlot > 1000) {
      sendJson(500, "{\"success\":false,\"message\":\"Sensor storage full (1000 templates max).\"}");
      return;
    }
  }

  result = finger.storeModel(targetSlot);
  if (result != FINGERPRINT_OK) {
    sendJson(500, "{\"success\":false,\"message\":\"Failed to store template in sensor memory.\"}");
    return;
  }

  Serial.printf("[ENROLL] Success — slot %d enrolled for contactId %d\n", targetSlot, contactId);

  StaticJsonDocument<200> respDoc;
  respDoc["success"] = true;
  respDoc["fingerprintId"] = targetSlot;
  respDoc["contactId"] = contactId;
  respDoc["message"] = "Fingerprint enrolled and stored in sensor.";
  respDoc["mode"] = "hardware";

  String output;
  serializeJson(respDoc, output);
  sendJson(201, output);
}

// ============================================================
// IDENTIFICATION HANDLER
// POST /identify
// ============================================================
void handleIdentify() {
  int result = finger.getImage();

  if (result == FINGERPRINT_NOFINGER) {
    sendJson(200, "{\"event\":\"FINGERPRINT_NOFINGER\",\"status\":\"NOFINGER\"}");
    return;
  }

  if (result != FINGERPRINT_OK) {
    sendJson(500, "{\"event\":\"FINGERPRINT_ERROR\",\"status\":\"ERROR\",\"message\":\"Image capture failed.\"}");
    return;
  }

  result = finger.image2Tz();
  if (result != FINGERPRINT_OK) {
    sendJson(500, "{\"event\":\"FINGERPRINT_ERROR\",\"status\":\"ERROR\",\"message\":\"Feature extraction failed.\"}");
    return;
  }

  result = finger.fingerSearch();

  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["mode"] = "hardware";

  String output;

  if (result == FINGERPRINT_OK) {
    doc["event"] = "FINGERPRINT_RECOGNIZED";
    doc["status"] = "RECOGNIZED";
    doc["fingerprintId"] = finger.fingerID;
    doc["confidence"] = finger.confidence;
    serializeJson(doc, output);
    sendJson(200, output);

    Serial.printf("[IDENTIFY] Recognized slot %d, confidence %d\n", finger.fingerID, finger.confidence);
  } else if (result == FINGERPRINT_NOTFOUND) {
    doc["event"] = "FINGERPRINT_UNKNOWN";
    doc["status"] = "UNKNOWN";
    serializeJson(doc, output);
    sendJson(200, output);

    Serial.println("[IDENTIFY] Fingerprint not found in database.");
  } else {
    doc["event"] = "FINGERPRINT_ERROR";
    doc["status"] = "ERROR";
    doc["message"] = "Fingerprint search failed.";
    serializeJson(doc, output);
    sendJson(500, output);
  }
}

// ============================================================
// DELETE HANDLER
// POST /delete
// Body: { "fingerprintId": 27 }
// ============================================================
void handleDelete() {
  if (!server.hasArg("plain")) {
    sendJson(400, "{\"success\":false,\"message\":\"Request body required.\"}");
    return;
  }

  StaticJsonDocument<64> reqDoc;
  deserializeJson(reqDoc, server.arg("plain"));
  int fpId = reqDoc["fingerprintId"] | 0;

  if (fpId <= 0) {
    sendJson(400, "{\"success\":false,\"message\":\"Invalid fingerprintId.\"}");
    return;
  }

  int result = finger.deleteModel(fpId);

  StaticJsonDocument<128> respDoc;
  if (result == FINGERPRINT_OK) {
    respDoc["success"] = true;
    respDoc["message"] = "Fingerprint template deleted from sensor.";
    respDoc["fingerprintId"] = fpId;
    String output;
    serializeJson(respDoc, output);
    sendJson(200, output);
    Serial.printf("[DELETE] Slot %d deleted.\n", fpId);
  } else {
    respDoc["success"] = false;
    respDoc["message"] = "Failed to delete template.";
    String output;
    serializeJson(respDoc, output);
    sendJson(500, output);
  }
}

// ============================================================
// HEARTBEAT — Sends device status to backend
// ============================================================
void sendHeartbeat() {
  // This would use HTTPClient in a production sketch.
  // Documented here as reference — implement with HTTPClient library for your WiFi stack.
  Serial.println("[HEARTBEAT] Sending heartbeat to backend...");
  // HTTPClient http;
  // http.begin(String(BACKEND_URL) + "/api/devices/heartbeat");
  // http.addHeader("Content-Type", "application/json");
  // String body = "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"sensor_type\":\"" + SENSOR_TYPE + "\"}";
  // http.POST(body);
  // http.end();
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[BOOT] Biometric Contact Recognition — ESP32 Firmware v1.2.0");

  // Initialize AS608/R307 Sensor on UART2
  fingerprintSerial.begin(FINGERPRINT_BAUD, SERIAL_8N1, 16, 17);
  finger.begin(FINGERPRINT_BAUD);

  if (finger.verifyPassword()) {
    Serial.println("[SENSOR] AS608/R307 fingerprint sensor connected successfully.");
    finger.getTemplateCount();
    Serial.printf("[SENSOR] Enrolled templates: %d\n", finger.templateCount);
  } else {
    Serial.println("[SENSOR] ERROR: Cannot connect to fingerprint sensor. Check UART wiring (GPIO16/17).");
  }

  // Connect to WiFi
  Serial.printf("[WIFI] Connecting to %s ...", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int wifiTimeout = 0;
  while (WiFi.status() != WL_CONNECTED && wifiTimeout < 30) {
    delay(1000);
    Serial.print(".");
    wifiTimeout++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] WARNING: Could not connect to WiFi. REST API will not be available.");
  }

  // Register HTTP routes
  server.on("/status",   HTTP_GET,  handleStatus);
  server.on("/enroll",   HTTP_POST, handleEnroll);
  server.on("/identify", HTTP_POST, handleIdentify);
  server.on("/delete",   HTTP_POST, handleDelete);
  server.begin();

  Serial.println("[HTTP] ESP32 REST server started on port 80.");
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
  server.handleClient();

  // Send heartbeat every 30 seconds
  unsigned long now = millis();
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    sendHeartbeat();
  }
}
