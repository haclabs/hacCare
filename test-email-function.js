// Test script to call the send-debrief-report Edge Function
// Run with: node test-email-function.js

const testEmailFunction = async () => {
  // Get token from .env file
  const SUPABASE_URL = 'https://cwhqffubvqolhnkecyck.supabase.co';
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';
  const USER_JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Get from localStorage in browser

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-debrief-report`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${USER_JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      historyRecordId: 'test-id',
      recipientEmails: ['test@example.com'],
      pdfBase64: 'dGVzdA==', // "test" in base64
      pdfFilename: 'test.pdf'
    })
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
};

testEmailFunction().catch(console.error);
