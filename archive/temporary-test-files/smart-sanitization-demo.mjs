#!/usr/bin/env node

/**
 * 🤖 Smart Sanitization Demo
 * Demonstrates the AI-powered content classification and sanitization
 */

// Import ES module style
import { smartSanitize } from './src/utils/sanitization-smart.js';

const testCases = [
  {
    name: '🏥 Medical Note',
    input: `SUBJECTIVE: Patient reports chest pain and shortness of breath. 
    OBJECTIVE: Blood pressure 140/90, heart rate 95 bpm, temperature 98.6°F.
    ASSESSMENT: Possible cardiovascular issue requiring further investigation.
    PLAN: Order ECG and chest X-ray. Prescribe medication for hypertension.`,
    context: { userRole: 'doctor', department: 'cardiology' }
  },
  {
    name: '🔒 PHI-Containing Data',
    input: `Patient John Doe, SSN: 123-45-6789, DOB: 03/15/1985, Phone: 555-123-4567
    has been diagnosed with diabetes. MRN: ABC123456`,
    context: { userRole: 'nurse', department: 'endocrinology' }
  },
  {
    name: '⚠️ Malicious XSS Attempt',
    input: `Patient notes: <script>alert('xss')</script>Regular medical content about treatment.
    <img src="x" onerror="alert('hack')">`,
    context: { userRole: 'admin' }
  },
  {
    name: '📝 General Healthcare Content',
    input: `<p>Welcome to our healthcare portal. You can <a href="/appointments">schedule appointments</a> 
    and view your <strong>medical history</strong>.</p>`,
    context: { userRole: 'patient' }
  },
  {
    name: '💉 Sensitive Treatment Data',
    input: `CONFIDENTIAL: Patient underwent surgery for tumor removal. 
    Treatment plan includes chemotherapy and radiation therapy.
    Insurance: Blue Cross Blue Shield, Policy: XYZ789`,
    context: { userRole: 'doctor', department: 'oncology' }
  }
];

console.log('🚀 AI-Powered Smart Sanitization Demo\n');
console.log('=' .repeat(80));

async function runDemo() {
  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log('-'.repeat(60));
    console.log(`📥 INPUT: ${testCase.input.substring(0, 100)}${testCase.input.length > 100 ? '...' : ''}`);
    
    try {
      const result = await smartSanitize(testCase.input, testCase.context);
      
      console.log(`🤖 CLASSIFICATION: ${result.classification.type} (${(result.classification.confidence * 100).toFixed(1)}% confidence)`);
      console.log(`🛡️ RISK LEVEL: ${result.classification.riskLevel.toUpperCase()}`);
      console.log(`⚠️ THREAT SCORE: ${result.threatScore}/100`);
      
      if (result.phiDetected.length > 0) {
        console.log(`🔒 PHI DETECTED: ${result.phiDetected.length} items`);
        result.phiDetected.forEach(phi => {
          console.log(`   - ${phi.type.toUpperCase()}: ${phi.value} → ${phi.redacted}`);
        });
      }
      
      console.log(`📋 APPLIED RULES: ${result.appliedRules.join(', ')}`);
      console.log(`📤 OUTPUT: ${result.sanitized.substring(0, 150)}${result.sanitized.length > 150 ? '...' : ''}`);
      
      if (result.recommendations.length > 0) {
        console.log(`💡 RECOMMENDATIONS:`);
        result.recommendations.forEach(rec => console.log(`   ${rec}`));
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
}

runDemo().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log('🎉 Demo completed! The smart sanitizer intelligently handled all content types.');
}).catch(console.error);
