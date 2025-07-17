/**
 * Test Script for Duplicate Alert Fixes
 * Run this in the browser console to test deduplication
 */

// Test 1: Check current alerts and deduplication
console.log('🧪 Testing Alert Deduplication...');

// Simulate fetching alerts and testing deduplication
const testAlerts = [
  {
    id: '1',
    patientId: 'patient1',
    patientName: 'John Doe',
    type: 'Medication Due',
    message: 'Acetaminophen 500mg is due in 30 minutes',
    priority: 'High',
    timestamp: '2025-07-17T14:00:00Z',
    acknowledged: false
  },
  {
    id: '2', 
    patientId: 'patient1',
    patientName: 'John Doe',
    type: 'Medication Due',
    message: 'OVERDUE: Acetaminophen 500mg is overdue by 15 minutes',
    priority: 'Critical',
    timestamp: '2025-07-17T14:30:00Z',
    acknowledged: false
  },
  {
    id: '3',
    patientId: 'patient1', 
    patientName: 'John Doe',
    type: 'Vital Signs Alert',
    message: 'Temperature 39.2°C - Fever',
    priority: 'High',
    timestamp: '2025-07-17T14:15:00Z',
    acknowledged: false
  },
  {
    id: '4',
    patientId: 'patient1',
    patientName: 'John Doe', 
    type: 'Vital Signs Alert',
    message: 'Temperature 39.5°C - Fever',
    priority: 'Critical',
    timestamp: '2025-07-17T14:45:00Z',
    acknowledged: false
  },
  {
    id: '5',
    patientId: 'patient2',
    patientName: 'Jane Smith',
    type: 'Medication Due', 
    message: 'Lisinopril 10mg is due now',
    priority: 'High',
    timestamp: '2025-07-17T14:20:00Z',
    acknowledged: false
  }
];

// Deduplication function (copy from AlertContext)
const deduplicateAlerts = (alerts) => {
  const alertMap = new Map();
  
  for (const alert of alerts) {
    let messageKey = alert.message;
    
    // For medication alerts, extract medication name for grouping
    if (alert.type === 'Medication Due') {
      const medicationMatch = alert.message.match(/^(OVERDUE: )?([^0-9]+)/);
      messageKey = medicationMatch ? medicationMatch[2].trim() : alert.message;
    }
    
    // For vital signs alerts, extract vital type for grouping
    if (alert.type === 'Vital Signs Alert') {
      const vitalMatch = alert.message.match(/^(Temperature|Blood Pressure|Heart Rate|Oxygen Saturation|Respiratory Rate)/);
      messageKey = vitalMatch ? vitalMatch[1] : alert.message;
    }
    
    const key = `${alert.patientId}-${alert.type}-${messageKey}`;
    
    // Keep the most recent alert for each unique key
    if (!alertMap.has(key) || new Date(alert.timestamp) > new Date(alertMap.get(key).timestamp)) {
      alertMap.set(key, alert);
    }
  }
  
  return Array.from(alertMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

console.log('Original alerts:', testAlerts.length);
testAlerts.forEach(alert => {
  console.log(`- ${alert.patientName}: ${alert.type} - ${alert.message}`);
});

const deduplicated = deduplicateAlerts(testAlerts);
console.log('\nDeduplicated alerts:', deduplicated.length);
deduplicated.forEach(alert => {
  console.log(`- ${alert.patientName}: ${alert.type} - ${alert.message}`);
});

console.log('\n✅ Expected result: 3 alerts (most recent Acetaminophen, most recent Temperature, Lisinopril)');
console.log(`✅ Actual result: ${deduplicated.length} alerts`);
console.log(`✅ Test ${deduplicated.length === 3 ? 'PASSED' : 'FAILED'}`);

// Test 2: Check if alerts are properly grouped
const groupKeys = deduplicated.map(alert => {
  let messageKey = alert.message;
  if (alert.type === 'Medication Due') {
    const medicationMatch = alert.message.match(/^(OVERDUE: )?([^0-9]+)/);
    messageKey = medicationMatch ? medicationMatch[2].trim() : alert.message;
  }
  if (alert.type === 'Vital Signs Alert') {
    const vitalMatch = alert.message.match(/^(Temperature|Blood Pressure|Heart Rate|Oxygen Saturation|Respiratory Rate)/);
    messageKey = vitalMatch ? vitalMatch[1] : alert.message;
  }
  return `${alert.patientId}-${alert.type}-${messageKey}`;
});

console.log('\nGroup keys:', groupKeys);
console.log(`✅ Unique groups: ${new Set(groupKeys).size === deduplicated.length ? 'PASSED' : 'FAILED'}`);
