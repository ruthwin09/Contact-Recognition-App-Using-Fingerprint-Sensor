/**
 * FingerprintService — Hardware Abstraction Layer
 *
 * This service acts as a broker between the REST API and the actual
 * fingerprint hardware (or mock simulator). Switching between
 * hardware and mock mode is controlled by the FINGERPRINT_MODE
 * environment variable:
 *
 *   FINGERPRINT_MODE=hardware  → AS608Adapter / R307Adapter
 *   FINGERPRINT_MODE=mock      → MockAdapter (development / demo)
 *
 * IMPORTANT: MockAdapter simulates fingerprint behaviour only for
 * development and demonstration purposes. It does NOT perform actual
 * biometric matching. Never present mock mode results as real sensor data.
 */

const MockAdapter = require('./adapters/MockAdapter');
const AS608Adapter = require('./adapters/AS608Adapter');

class FingerprintService {
  constructor() {
    const mode = (process.env.FINGERPRINT_MODE || 'mock').toLowerCase();
    const sensorType = (process.env.DEFAULT_SENSOR_TYPE || 'AS608').toUpperCase();

    if (mode === 'hardware') {
      if (sensorType === 'AS608' || sensorType === 'R307') {
        this.adapter = new AS608Adapter();
        console.log(`[FingerprintService] Using real hardware adapter: ${sensorType}`);
      } else {
        console.warn(`[FingerprintService] Unknown sensor type '${sensorType}'. Falling back to MockAdapter.`);
        this.adapter = new MockAdapter();
      }
    } else {
      this.adapter = new MockAdapter();
      console.log('[FingerprintService] ⚠️  Running in DEVELOPMENT / MOCK MODE. Not real biometric data.');
    }
  }

  isMockMode() {
    return this.adapter instanceof MockAdapter;
  }

  /**
   * Get the current status of the connected fingerprint sensor / ESP32 device.
   * @returns {Promise<{connected: boolean, templateCount: number, deviceId: string, mode: string}>}
   */
  async getStatus() {
    return await this.adapter.getStatus();
  }

  /**
   * Enroll a new fingerprint. Returns the sensor slot ID assigned.
   * @param {object} options - { contactId, preferredSlot }
   * @returns {Promise<{success: boolean, fingerprintId: number, message: string}>}
   */
  async enroll(options = {}) {
    return await this.adapter.enroll(options);
  }

  /**
   * Identify a fingerprint from the sensor.
   * @returns {Promise<{success: boolean, fingerprintId: number|null, confidence: number|null, status: 'RECOGNIZED'|'UNKNOWN'|'ERROR'}>}
   */
  async identify() {
    return await this.adapter.identify();
  }

  /**
   * Delete a fingerprint slot from the sensor.
   * @param {number} fingerprintId - The sensor template slot ID to delete.
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deleteTemplate(fingerprintId) {
    return await this.adapter.deleteTemplate(fingerprintId);
  }

  /**
   * Get the count of enrolled templates stored in the sensor.
   * @returns {Promise<number>}
   */
  async getTemplateCount() {
    return await this.adapter.getTemplateCount();
  }
}

module.exports = new FingerprintService();
