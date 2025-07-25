#!/usr/bin/env node

/**
 * Test DOMPurify integration in sanitization utilities
 */

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Setup DOM environment for Node.js testing
const window = new JSDOM('').window;
global.window = window;
global.document = window.document;

// Initialize DOMPurify with the jsdom window
const purify = DOMPurify(window);

// Simulate the sanitization functions
const sanitizeHtml = (input) => {
  if (typeof input !== 'string' || !input) return '';

  return purify.sanitize(input, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'b', 'i', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'pre', 'code',
      'a', 'img'
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'title', 'alt', 'src', 'href', 'target',
      'style', 'width', 'height', 'colspan', 'rowspan'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    USE_PROFILES: { html: true }
  });
};

const sanitizeHtmlStrict = (input) => {
  if (typeof input !== 'string' || !input) return '';

  return purify.sanitize(input, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'b', 'i', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code'
    ],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'a', 'img', 'link'],
    FORBID_ATTR: ['href', 'src', 'style', 'onclick', 'onerror', 'onload'],
    RETURN_DOM: false,
    USE_PROFILES: { html: true }
  });
};

const sanitizeUserInput = (input) => {
  if (typeof input !== 'string' || !input) return '';

  let sanitized = purify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true
  });

  sanitized = sanitized.replace(/(['";]|--|\*|\/\*|\*\/)/g, '');
  return sanitized.replace(/\s+/g, ' ').trim();
};

// Test cases
console.log('🧪 Testing DOMPurify Integration\n');

console.log('🔒 Testing XSS Prevention:');
const xssTests = [
  '<script>alert("xss")</script>',
  '<script >alert("xss")</script >',
  '<img src="x" onerror="alert(1)">',
  '<a href="javascript:alert(1)">Click me</a>',
  '<div onclick="alert(1)">Click me</div>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<object data="javascript:alert(1)"></object>',
  '<embed src="javascript:alert(1)">'
];

xssTests.forEach((test, i) => {
  const result = sanitizeHtml(test);
  const isBlocked = !result.includes('alert') && !result.includes('javascript:');
  console.log(`  ${i + 1}. ${isBlocked ? '✅ BLOCKED' : '❌ FAILED'}: "${test}" -> "${result}"`);
});

console.log('\n✅ Testing Safe HTML:');
const safeTests = [
  '<p>Normal paragraph</p>',
  '<strong>Bold text</strong>',
  '<em>Italic text</em>',
  '<a href="https://example.com">Safe link</a>',
  '<img src="image.jpg" alt="Safe image">',
  '<ul><li>List item</li></ul>'
];

safeTests.forEach((test, i) => {
  const result = sanitizeHtml(test);
  const isPreserved = result.length > 0 && !result.includes('&lt;');
  console.log(`  ${i + 1}. ${isPreserved ? '✅ PRESERVED' : '❌ REMOVED'}: "${test}" -> "${result}"`);
});

console.log('\n🔒 Testing Strict Sanitization:');
const strictTests = [
  '<p>Text with <a href="link">link</a></p>',
  '<img src="image.jpg" alt="image">',
  '<strong>Bold text</strong>',
  '<script>alert(1)</script><p>Content</p>'
];

strictTests.forEach((test, i) => {
  const result = sanitizeHtmlStrict(test);
  const hasNoLinks = !result.includes('<a') && !result.includes('<img');
  console.log(`  ${i + 1}. ${hasNoLinks ? '✅ STRICT' : '❌ FAILED'}: "${test}" -> "${result}"`);
});

console.log('\n📝 Testing User Input Sanitization:');
const userInputTests = [
  'Normal text input',
  '<script>alert(1)</script>Text content',
  'Text with <b>HTML</b> tags',
  'SQL injection attempt: \'; DROP TABLE users; --'
];

userInputTests.forEach((test, i) => {
  const result = sanitizeUserInput(test);
  const isSafe = !result.includes('<') && !result.includes('DROP TABLE');
  console.log(`  ${i + 1}. ${isSafe ? '✅ SAFE' : '❌ UNSAFE'}: "${test}" -> "${result}"`);
});

console.log('\n🎉 DOMPurify integration testing complete!');
