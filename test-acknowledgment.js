/**
 * Test script to verify acknowledgment debouncing
 * This simulates rapid clicking behavior to ensure alerts don't reappear
 */

// Simulate acknowledgment state management
class AcknowledgmentTest {
  constructor() {
    this.acknowledgingAlerts = new Set();
    this.acknowledgedCount = 0;
    this.duplicateAttempts = 0;
  }

  // Simulate the handleAcknowledge function from AlertPanel
  async handleAcknowledge(alertId) {
    // Prevent double-clicking acknowledgment
    if (this.acknowledgingAlerts.has(alertId)) {
      console.log(`⚠️ Alert ${alertId} already being acknowledged, skipping...`);
      this.duplicateAttempts++;
      return;
    }

    try {
      this.acknowledgingAlerts.add(alertId);
      console.log(`🔄 Starting acknowledgment for alert: ${alertId}`);
      
      // Simulate async acknowledgment (like database call)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.acknowledgedCount++;
      console.log(`✅ Alert ${alertId} acknowledged successfully`);
    } catch (error) {
      console.error(`❌ Failed to acknowledge alert: ${alertId}`, error);
    } finally {
      // Remove from acknowledging set after a delay to prevent rapid re-acknowledgment
      setTimeout(() => {
        this.acknowledgingAlerts.delete(alertId);
        console.log(`🔓 Alert acknowledgment cooldown ended for: ${alertId}`);
      }, 5000); // 5 second cooldown
    }
  }

  // Simulate rapid clicking
  async simulateRapidClicking(alertId, clickCount = 10) {
    console.log(`\n🎯 Testing rapid clicking for alert ${alertId} (${clickCount} clicks)...\n`);
    
    const promises = [];
    for (let i = 0; i < clickCount; i++) {
      promises.push(this.handleAcknowledge(alertId));
      // Add small delay between clicks to simulate real user behavior
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    await Promise.all(promises);
    
    // Wait for all cooldowns to complete
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    console.log(`\n📊 Test Results for Alert ${alertId}:`);
    console.log(`  - Total click attempts: ${clickCount}`);
    console.log(`  - Successful acknowledgments: ${this.acknowledgedCount}`);
    console.log(`  - Duplicate attempts blocked: ${this.duplicateAttempts}`);
    console.log(`  - Success rate: ${this.acknowledgedCount === 1 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  - Duplicate prevention: ${this.duplicateAttempts === clickCount - 1 ? '✅ PASSED' : '❌ FAILED'}`);
  }
}

// Run the test
async function runTest() {
  console.log('🧪 Starting Acknowledgment Debouncing Test\n');
  
  const test = new AcknowledgmentTest();
  await test.simulateRapidClicking('alert-123', 10);
  
  console.log('\n🎉 Test completed!');
}

runTest().catch(console.error);
