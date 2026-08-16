/**
 * AS608Adapter — Real Hardware Communication Layer for AS608 / R307 Sensors
 *
 * This adapter communicates with the ESP32 device (running fingerprint_controller firmware)
 * via HTTP REST API over Wi-Fi. The ESP32 relays commands to the connected AS608 or R307
 * optical fingerprint module over UART (Serial2, GPIO 16/17, 57600 baud).
 *
 * Communication flow:
 *   Backend API → HTTP → ESP32 REST endpoint → UART → AS608/R307 Sensor
 *
 * The ESP32 IP address is automatically resolved via device registration.
 * Set DEFAULT_DEVICE_ID and the device must be registered in the devices table.
 */

const http = require('http');

const DEFAULT_ESP32_IP = process.env.ESP32_IP || '192.168.1.105';
const DEFAULT_ESP32_PORT = parseInt(process.env.ESP32_PORT || '80', 10);
const ESP32_API_KEY = process.env.ESP32_API_KEY || '';
const REQUEST_TIMEOUT_MS = parseInt(process.env.ESP32_TIMEOUT_MS || '8000', 10);

class AS608Adapter {
  constructor() {
    this.esp32Ip = DEFAULT_ESP32_IP;
    this.esp32Port = DEFAULT_ESP32_PORT;
    this.deviceId = process.env.DEFAULT_DEVICE_ID || 'ESP32-BIO-01';
    console.log(`[AS608Adapter] Targeting ESP32 at ${this.esp32Ip}:${this.esp32Port}`);
  }

  async _request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const options = {
        hostname: this.esp32Ip,
        port: this.esp32Port,
        path,
        method,
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': ESP32_API_KEY,
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`ESP32 request timed out after ${REQUEST_TIMEOUT_MS}ms. Check device connectivity.`));
      });

      req.on('error', (err) => {
        reject(new Error(`Cannot reach ESP32 at ${this.esp32Ip}:${this.esp32Port} — ${err.message}`));
      });

      if (payload) req.write(payload);
      req.end();
    });
  }

  async getStatus() {
    try {
      const result = await this._request('/status');
      return {
        connected: true,
        templateCount: result.templateCount || 0,
        deviceId: result.deviceId || this.deviceId,
        sensorType: result.sensorType || 'AS608',
        firmwareVersion: result.firmwareVersion || 'unknown',
        ipAddress: this.esp32Ip,
        mode: 'hardware'
      };
    } catch (err) {
      return {
        connected: false,
        templateCount: 0,
        deviceId: this.deviceId,
        sensorType: 'AS608',
        firmwareVersion: 'unknown',
        ipAddress: this.esp32Ip,
        mode: 'hardware',
        error: err.message
      };
    }
  }

  async enroll({ contactId, preferredSlot } = {}) {
    try {
      const result = await this._request('/enroll', 'POST', {
        contactId,
        preferredSlot: preferredSlot || null
      });

      if (result.success) {
        return {
          success: true,
          fingerprintId: result.fingerprintId,
          message: `Fingerprint enrolled in sensor slot #${result.fingerprintId}.`,
          mode: 'hardware'
        };
      } else {
        return {
          success: false,
          fingerprintId: null,
          message: result.message || 'Enrollment failed. Check sensor and finger placement.',
          mode: 'hardware'
        };
      }
    } catch (err) {
      return {
        success: false,
        fingerprintId: null,
        message: `Hardware enrollment error: ${err.message}`,
        mode: 'hardware'
      };
    }
  }

  async identify() {
    try {
      const result = await this._request('/identify', 'POST', {});

      if (result.event === 'FINGERPRINT_RECOGNIZED' || result.status === 'RECOGNIZED') {
        return {
          success: true,
          fingerprintId: result.fingerprintId,
          confidence: result.confidence || null,
          status: 'RECOGNIZED',
          mode: 'hardware'
        };
      } else if (result.event === 'FINGERPRINT_UNKNOWN' || result.status === 'UNKNOWN') {
        return {
          success: true,
          fingerprintId: null,
          confidence: null,
          status: 'UNKNOWN',
          mode: 'hardware'
        };
      } else {
        return {
          success: false,
          fingerprintId: null,
          confidence: null,
          status: 'ERROR',
          message: result.message || 'Sensor returned unexpected response.',
          mode: 'hardware'
        };
      }
    } catch (err) {
      return {
        success: false,
        fingerprintId: null,
        confidence: null,
        status: 'ERROR',
        message: `Hardware identification error: ${err.message}`,
        mode: 'hardware'
      };
    }
  }

  async deleteTemplate(fingerprintId) {
    try {
      const result = await this._request('/delete', 'POST', { fingerprintId });
      return {
        success: result.success || false,
        message: result.message || `Delete of slot #${fingerprintId} completed.`,
        mode: 'hardware'
      };
    } catch (err) {
      return {
        success: false,
        message: `Hardware delete error: ${err.message}`,
        mode: 'hardware'
      };
    }
  }

  async getTemplateCount() {
    try {
      const result = await this._request('/status');
      return result.templateCount || 0;
    } catch (err) {
      return 0;
    }
  }
}

module.exports = AS608Adapter;
