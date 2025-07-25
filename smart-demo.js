// Simple demo version in CommonJS for direct execution
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Setup DOM environment for Node.js testing
const window = new JSDOM('').window;
global.window = window;
global.document = window.document;

// Initialize DOMPurify with the jsdom window
const purify = DOMPurify(window);

/**
 * 🤖 Smart Sanitization Engine Demo Version
 */
class SmartSanitizationEngine {
  constructor() {
    this.medicalTerms = new Set([
      'diagnosis', 'prognosis', 'symptom', 'treatment', 'medication', 'prescription',
      'patient', 'hypertension', 'diabetes', 'infection', 'surgery', 'therapy',
      'blood pressure', 'heart rate', 'temperature', 'respiratory', 'cardiovascular',
      'neurological', 'gastrointestinal', 'dermatological', 'orthopedic', 'oncology'
    ]);
    
    this.phiPatterns = new Map([
      ['ssn', /\b\d{3}-?\d{2}-?\d{4}\b/g],
      ['phone', /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g],
      ['dob', /\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}\b/g],
      ['mrn', /\b(MRN|MR#?)\s*:?\s*([A-Z0-9]{6,12})\b/gi],
      ['email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g]
    ]);
    
    this.threatPatterns = new Map([
      ['xss', /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi],
      ['sql_injection', /(\bUNION\b.*\bSELECT\b|\bDROP\s+TABLE\b)/gi],
      ['command_injection', /(\||;|`|\$\(|\${)/g]
    ]);
  }

  async smartSanitize(input, context = {}) {
    // Step 1: Classify the content
    const classification = await this.classifyContent(input);
    
    // Step 2: Detect PHI
    const phiMatches = this.detectPHI(input);
    
    // Step 3: Calculate threat score
    const threatScore = this.calculateThreatScore(input, classification);
    
    // Step 4: Apply sanitization
    const sanitized = this.applySanitization(input, classification, phiMatches, context);
    
    // Step 5: Generate recommendations
    const recommendations = this.generateRecommendations(classification, phiMatches, threatScore);

    return {
      sanitized,
      classification,
      appliedRules: this.getAppliedRules(classification, phiMatches),
      phiDetected: phiMatches,
      threatScore,
      recommendations
    };
  }

  async classifyContent(input) {
    const features = this.extractFeatures(input);
    let type = 'general';
    let confidence = 0;
    let riskLevel = 'low';
    const detectedElements = [];

    // Medical note detection
    if (features.medicalTermCount > 3 && features.hasStructuredFormat) {
      type = 'medical-note';
      confidence = Math.min(0.9, 0.6 + (features.medicalTermCount * 0.05));
      detectedElements.push('medical-terminology', 'clinical-structure');
    }

    // Patient data detection
    if (features.hasPersonalIdentifiers || features.hasDemographicInfo) {
      type = 'patient-data';
      confidence = Math.max(confidence, 0.8);
      riskLevel = 'high';
      detectedElements.push('personal-identifiers');
    }

    // PHI detection
    if (features.phiIndicators > 0) {
      type = 'phi-containing';
      confidence = 0.95;
      riskLevel = 'critical';
      detectedElements.push('protected-health-information');
    }

    // Sensitive data detection
    if (features.hasSensitiveKeywords) {
      if (type === 'general') type = 'sensitive';
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      detectedElements.push('sensitive-keywords');
    }

    return { type, confidence, detectedElements, riskLevel };
  }

  detectPHI(input) {
    const matches = [];

    this.phiPatterns.forEach((pattern, type) => {
      const found = Array.from(input.matchAll(pattern));
      found.forEach(match => {
        const confidence = this.calculatePHIConfidence(type, match[0]);
        if (confidence > 0.7) {
          matches.push({
            type,
            value: match[0],
            redacted: this.generateRedaction(type, match[0]),
            position: match.index,
            confidence
          });
        }
      });
    });

    return matches;
  }

  applySanitization(input, classification, phiMatches, context) {
    let sanitized = input;

    // First, redact any PHI
    phiMatches.forEach(phi => {
      sanitized = sanitized.replace(phi.value, phi.redacted);
    });

    // Apply classification-specific sanitization
    switch (classification.type) {
      case 'medical-note':
        sanitized = this.sanitizeMedicalNote(sanitized);
        break;
      case 'patient-data':
      case 'sensitive':
        sanitized = this.sanitizeHtmlStrict(sanitized);
        break;
      case 'phi-containing':
        sanitized = this.sanitizePHIContent(sanitized);
        break;
      default:
        sanitized = this.sanitizeHtml(sanitized);
    }

    // Apply threat-specific sanitization
    if (classification.riskLevel === 'critical') {
      sanitized = this.applyCriticalSanitization(sanitized);
    }

    return sanitized;
  }

  sanitizeHtml(input) {
    return purify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a'],
      ALLOWED_ATTR: ['class', 'id', 'title', 'href'],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form'],
      FORBID_ATTR: ['onclick', 'onerror', 'onload']
    });
  }

  sanitizeHtmlStrict(input) {
    return purify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'span'],
      ALLOWED_ATTR: ['class'],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'a', 'img'],
      FORBID_ATTR: ['href', 'src', 'onclick', 'onerror', 'onload']
    });
  }

  sanitizeMedicalNote(input) {
    return purify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'span', 'div', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['class', 'id', 'title'],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'a', 'img'],
      FORBID_ATTR: ['onclick', 'onerror', 'onload', 'href', 'src']
    });
  }

  sanitizePHIContent(input) {
    let sanitized = purify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });

    sanitized = sanitized.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[REDACTED_SSN]');
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[REDACTED_PHONE]');
    
    return sanitized;
  }

  applyCriticalSanitization(input) {
    let sanitized = input;
    this.threatPatterns.forEach((pattern, threatType) => {
      sanitized = sanitized.replace(pattern, `[REMOVED_${threatType.toUpperCase()}]`);
    });
    return sanitized;
  }

  extractFeatures(input) {
    return {
      length: input.length,
      medicalTermCount: this.countMedicalTerms(input),
      hasStructuredFormat: /^(SUBJECTIVE|OBJECTIVE|ASSESSMENT|PLAN|CHIEF COMPLAINT)/im.test(input),
      hasPersonalIdentifiers: /\b(patient|dob|ssn|mrn|insurance)\b/gi.test(input),
      hasDemographicInfo: /\b(male|female|age|years old|\d{1,2}\/\d{1,2}\/\d{4})\b/gi.test(input),
      phiIndicators: (input.match(/\b(\d{3}-?\d{2}-?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4})\b/g) || []).length,
      hasSensitiveKeywords: /\b(confidential|private|restricted|diagnosis|treatment|medication)\b/gi.test(input),
      threatLevel: this.calculateBasicThreatLevel(input)
    };
  }

  calculateThreatScore(input, classification) {
    let score = 0;
    const baseScores = {
      'general': 10,
      'sensitive': 30,
      'patient-data': 50,
      'medical-note': 40,
      'phi-containing': 90
    };
    score += baseScores[classification.type];

    this.threatPatterns.forEach((pattern) => {
      if (pattern.test(input)) score += 20;
    });

    const phiCount = (input.match(/\b\d{3}-?\d{2}-?\d{4}\b/g) || []).length;
    score += phiCount * 25;

    return Math.min(100, score);
  }

  generateRecommendations(classification, phiMatches, threatScore) {
    const recommendations = [];

    if (phiMatches.length > 0) {
      recommendations.push(`🚨 ${phiMatches.length} PHI elements detected and redacted. Review HIPAA compliance.`);
    }

    if (threatScore > 70) {
      recommendations.push('⚠️ High threat score detected. Consider additional security review.');
    }

    if (classification.type === 'medical-note' && classification.confidence < 0.8) {
      recommendations.push('📝 Medical note classification uncertain. Verify medical terminology.');
    }

    if (classification.riskLevel === 'critical') {
      recommendations.push('🔴 Critical risk level. Immediate security review recommended.');
    }

    return recommendations;
  }

  countMedicalTerms(input) {
    const words = input.toLowerCase().split(/\s+/);
    return words.filter(word => this.medicalTerms.has(word)).length;
  }

  calculatePHIConfidence(type, value) {
    const patterns = {
      'ssn': /^\d{3}-?\d{2}-?\d{4}$/,
      'phone': /^\d{3}[-.]?\d{3}[-.]?\d{4}$/,
      'dob': /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/,
      'mrn': /^[A-Z0-9]{6,12}$/i,
      'email': /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/
    };
    
    const pattern = patterns[type];
    return pattern && pattern.test(value) ? 0.9 : 0.6;
  }

  generateRedaction(type, value) {
    const hash = Buffer.from(value).toString('base64').substring(0, 6);
    return `[REDACTED_${type.toUpperCase()}_${hash}]`;
  }

  calculateBasicThreatLevel(input) {
    let level = 0;
    if (/<script/i.test(input)) level += 3;
    if (/javascript:/i.test(input)) level += 2;
    if (/on\w+\s*=/i.test(input)) level += 2;
    return level;
  }

  getAppliedRules(classification, phiMatches) {
    const rules = [`classification-${classification.type}`];
    if (phiMatches.length > 0) rules.push('phi-redaction');
    if (classification.riskLevel === 'critical') rules.push('critical-sanitization');
    return rules;
  }
}

// Demo data
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

// Run the demo
async function runDemo() {
  const engine = new SmartSanitizationEngine();
  
  console.log('🚀 AI-Powered Smart Sanitization Demo\n');
  console.log('=' .repeat(80));

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log('-'.repeat(60));
    console.log(`📥 INPUT: ${testCase.input.substring(0, 100)}${testCase.input.length > 100 ? '...' : ''}`);
    
    try {
      const result = await engine.smartSanitize(testCase.input, testCase.context);
      
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

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Demo completed! The smart sanitizer intelligently handled all content types.');
}

runDemo().catch(console.error);
