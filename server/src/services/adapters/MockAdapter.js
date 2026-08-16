/**
 * MockAdapter — Software simulation of AS608 / R307 fingerprint sensor behaviour
 *
 * ⚠️  WARNING: This is NOT real biometric matching.
 * This adapter simulates the fingerprint sensor protocol for software development
 * and demonstration purposes ONLY.
 *
 * It does NOT process actual fingerprint images, perform feature extraction,
 * or perform real biometric identification.
 *
 * Always ensure the UI clearly displays "MOCK / DEVELOPMENT MODE" when this
 * adapter is active.
 */

const enrolledSlots = new Set([5, 9, 12, 18, 27]); // Pre-loaded slots matching seed data

class MockAdapter {
  constructor() {
    this.deviceId = process.env.DEFAULT_DEVICE_ID || 'ESP32-BIO-01-MOCK';
    this.connected = true;
    this.enrollCounter = enrolledSlots.size;
  }

  async getStatus() {
    return {
      connected: this.connected,
      templateCount: enrolledSlots.size,
      deviceId: this.deviceId,
      sensorType: 'MOCK',
      firmwareVersion: '1.2.0-mock',
      mode: 'mock',
      ipAddress: '127.0.0.1'
    };
  }

  async enroll({ contactId, preferredSlot } = {}) {
    // Simulate a 1-second capture delay
    await this._delay(1000);

    // Find next available slot (1-1000)
    let assignedSlot = preferredSlot;
    if (!assignedSlot || enrolledSlots.has(assignedSlot)) {
      for (let slot = 1; slot <= 1000; slot++) {
        if (!enrolledSlots.has(slot)) {
          assignedSlot = slot;
          break;
        }
      }
    }

    if (!assignedSlot) {
      return {
        success: false,
        fingerprintId: null,
        message: 'Sensor storage is full. Maximum 1000 templates reached.'
      };
    }

    enrolledSlots.add(assignedSlot);
    this.enrollCounter++;

    console.log(`[MockAdapter] ⚠️  SIMULATED enrollment — slot ${assignedSlot} for contactId ${contactId}`);

    return {
      success: true,
      fingerprintId: assignedSlot,
      message: `[MOCK MODE] Fingerprint simulated and assigned to slot #${assignedSlot}. Connect real hardware for actual biometric capture.`,
      mode: 'mock'
    };
  }

  async identify() {
    await this._delay(800);

    // Randomly select from enrolled slots (or simulate unknown)
    const slotsArray = Array.from(enrolledSlots);
    const roll = Math.random();

    if (slotsArray.length === 0 || roll < 0.1) {
      // 10% chance of "unknown" when slots exist
      console.log('[MockAdapter] ⚠️  SIMULATED — fingerprint UNKNOWN');
      return {
        success: true,
        fingerprintId: null,
        confidence: null,
        status: 'UNKNOWN',
        mode: 'mock'
      };
    }

    const randomSlot = slotsArray[Math.floor(Math.random() * slotsArray.length)];
    const confidence = Math.floor(Math.random() * 20) + 80; // 80–100

    console.log(`[MockAdapter] ⚠️  SIMULATED — recognized slot ${randomSlot} with confidence ${confidence}`);

    return {
      success: true,
      fingerprintId: randomSlot,
      confidence,
      status: 'RECOGNIZED',
      mode: 'mock'
    };
  }

  async deleteTemplate(fingerprintId) {
    await this._delay(300);
    const id = parseInt(fingerprintId, 10);

    if (!enrolledSlots.has(id)) {
      return { success: false, message: `Slot #${id} is not enrolled in mock sensor.` };
    }

    enrolledSlots.delete(id);
    console.log(`[MockAdapter] ⚠️  SIMULATED — deleted slot ${id}`);
    return { success: true, message: `Slot #${id} deleted from mock sensor.`, mode: 'mock' };
  }

  async getTemplateCount() {
    return enrolledSlots.size;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MockAdapter;
