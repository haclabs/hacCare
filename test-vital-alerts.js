/**
 * Test Vital Signs Alert System
 * This script tests the improved vital signs alert system
 */

import { checkVitalSignsAlerts, checkMissingVitalsAlerts, fetchActiveAlerts } from '../src/lib/alertService';

async function testVitalSignsAlerts() {
  console.log('🩺 Testing Vital Signs Alert System...');
  console.log('====================================');
  
  // Get initial counts
  const alertsBefore = await fetchActiveAlerts();
  const vitalAlertsBefore = alertsBefore.filter(alert => alert.type === 'Vital Signs Alert');
  
  console.log(`📊 Initial vital signs alerts: ${vitalAlertsBefore.length}`);
  console.log(`📊 Total initial alerts: ${alertsBefore.length}`);
  
  // Run vital signs checks
  console.log('\n⏳ Running vital signs checks...');
  const startTime = Date.now();
  
  await checkVitalSignsAlerts();
  await checkMissingVitalsAlerts();
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Get final counts
  const alertsAfter = await fetchActiveAlerts();
  const vitalAlertsAfter = alertsAfter.filter(alert => alert.type === 'Vital Signs Alert');
  
  console.log('\n📈 Results:');
  console.log(`- Processing time: ${duration}ms`);
  console.log(`- Vital alerts before: ${vitalAlertsBefore.length}`);
  console.log(`- Vital alerts after: ${vitalAlertsAfter.length}`);
  console.log(`- Net change: ${vitalAlertsAfter.length - vitalAlertsBefore.length}`);
  
  // Analyze vital alerts by patient
  const alertsByPatient = vitalAlertsAfter.reduce((acc, alert) => {
    const patientName = alert.patientName;
    if (!acc[patientName]) {
      acc[patientName] = [];
    }
    acc[patientName].push(alert);
    return acc;
  }, {});
  
  console.log('\n👥 Vital alerts by patient:');
  Object.entries(alertsByPatient).forEach(([patient, alerts]) => {
    console.log(`  ${patient}: ${alerts.length} alerts`);
    alerts.forEach(alert => {
      const type = alert.message.includes('overdue') ? 'Missing Vitals' : 
                   alert.message.match(/^(Temperature|Blood Pressure|Heart Rate|Oxygen Saturation|Respiratory Rate)/)?.[1] || 'Unknown';
      console.log(`    - ${type}: ${alert.message.substring(0, 50)}...`);
    });
  });
  
  // Check for duplicates
  const duplicateCount = Object.values(alertsByPatient).reduce((count, alerts) => {
    // Count missing vitals duplicates
    const missingVitals = alerts.filter(alert => alert.message.includes('overdue'));
    if (missingVitals.length > 1) count += missingVitals.length - 1;
    
    // Count abnormal vital duplicates by type
    const vitalTypes = ['Temperature', 'Blood Pressure', 'Heart Rate', 'Oxygen Saturation', 'Respiratory Rate'];
    vitalTypes.forEach(type => {
      const typeAlerts = alerts.filter(alert => alert.message.startsWith(type));
      if (typeAlerts.length > 1) count += typeAlerts.length - 1;
    });
    
    return count;
  }, 0);
  
  console.log(`\n🚨 Potential duplicates found: ${duplicateCount}`);
  
  if (duplicateCount === 0) {
    console.log('✅ No duplicates detected - vital signs alert system working correctly!');
  } else {
    console.log('❌ Duplicates still exist - may need further optimization');
  }
  
  console.log('\n✅ Vital signs alert system test completed!');
}

// Run the test
testVitalSignsAlerts().catch(console.error);