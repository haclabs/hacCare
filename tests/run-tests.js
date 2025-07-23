#!/usr/bin/env node

// Quick test runner for tenant functionality
console.log('🧪 HacCare Tenant System Test Runner\n');

const tests = [
  {
    name: 'Basic Tenant Creation',
    file: 'test-tenant-creation.mjs',
    description: 'Tests if super admin can create tenants'
  },
  {
    name: 'Available Admin Users',
    file: 'show-available-admins.js', 
    description: 'Shows users available for tenant admin role'
  },
  {
    name: 'RLS Status Check',
    file: 'check-rls-status.mjs',
    description: 'Checks current RLS policies'
  }
];

console.log('Available tests:');
tests.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  console.log(`   📁 ${test.file}`);
  console.log(`   📝 ${test.description}`);
  console.log('');
});

console.log('💡 To run a test:');
console.log('   node tests/[filename]');
console.log('');
console.log('🚀 Recommended first test:');
console.log('   node tests/test-tenant-creation.mjs');
