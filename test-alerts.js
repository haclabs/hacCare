/**
 * Test Alert System Performance
 * This script tests the improved alert system to verify reduced alert generation
 */

import { runAlertChecks, fetchActiveAlerts } from '../src/lib/alertService';

async function testAlertSystem() {
  console.log('🧪 Testing Alert System Performance...');
  console.log('=====================================');
  
  // Get initial alert count
  const alertsBefore = await fetchActiveAlerts();
  console.log(`📊 Initial active alerts: ${alertsBefore.length}`);
  
  // Run alert checks
  console.log('\n⏳ Running alert checks...');
  const startTime = Date.now();
  
  await runAlertChecks();
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Get final alert count
  const alertsAfter = await fetchActiveAlerts();
  console.log(`📊 Final active alerts: ${alertsAfter.length}`);
  
  // Show results
  console.log('\n📈 Results:');
  console.log(`- Processing time: ${duration}ms`);
  console.log(`- Alerts before: ${alertsBefore.length}`);
  console.log(`- Alerts after: ${alertsAfter.length}`);
  console.log(`- Net change: ${alertsAfter.length - alertsBefore.length}`);
  
  // Break down by type
  const alertsByType = alertsAfter.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n📋 Alerts by type:');
  Object.entries(alertsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  console.log('\n✅ Alert system test completed!');
}

// Run the test
testAlertSystem().catch(console.error);