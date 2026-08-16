# ESP32 Fingerprint Controller Firmware

## Overview

This firmware runs on an **ESP32** microcontroller connected to an **AS608** or **R307** optical fingerprint sensor over UART. It exposes a local HTTP REST API so the Node.js backend can issue biometric commands.

## Supported Sensors
| Sensor | Communication | Baud Rate | Notes |
|--------|--------------|-----------|-------|
| AS608  | UART (Serial2, GPIO 16/17) | 57600 | Widely available optical sensor |
| R307   | UART (Serial2, GPIO 16/17) | 57600 | Compatible command protocol |

## Wiring Diagram

```
ESP32 DevKit           AS608 / R307 Module
─────────────────      ───────────────────
GPIO 16 (RX2)   ←───  TX
GPIO 17 (TX2)   ───►  RX
GND             ────  GND
3.3V or 5V*     ────  VCC

* Check your specific module's datasheet for VCC requirements.
  AS608: typically 3.3V VCC, 3.3V logic
  R307:  typically 3.6–6V VCC, 3.3V logic
  Do NOT supply 5V to a 3.3V-logic module without level shifting.
```

## REST API Exposed by ESP32

| Method | Endpoint  | Description |
|--------|-----------|-------------|
| GET    | /status   | Sensor and device status |
| POST   | /enroll   | Start fingerprint enrollment |
| POST   | /identify | Identify a fingerprint scan |
| POST   | /delete   | Delete a template from sensor |

## Arduino Library Dependencies

Install via Arduino Library Manager:
- **Adafruit Fingerprint Sensor Library** (by Adafruit)
- **ArduinoJson** (by Benoit Blanchon, version 6.x)

## Setup

1. Open `fingerprint_controller.ino` in Arduino IDE.
2. Select **Tools → Board → ESP32 Dev Module**.
3. Update configuration at the top of the sketch:
   - `WIFI_SSID` / `WIFI_PASSWORD`
   - `BACKEND_URL` (your Node.js server IP)
   - `DEVICE_ID`
   - `API_KEY`
4. Upload to ESP32.
5. Open Serial Monitor at 115200 baud to confirm startup.

## Troubleshooting

| Symptom | Possible Cause | Fix |
|---------|---------------|-----|
| "Cannot connect to fingerprint sensor" | Wrong wiring | Check GPIO 16/17 → sensor TX/RX (cross-connect) |
| No WiFi connection | Wrong credentials | Verify SSID/password; check 2.4GHz band |
| Enrollment always fails | Poor finger placement | Ensure flat, clean, steady contact |
| Sensor responds but returns errors | Wrong baud rate | Confirm sensor baud matches `FINGERPRINT_BAUD` |
