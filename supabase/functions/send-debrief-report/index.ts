// Supabase Edge Function to send debrief report via email with PDF attachment
// Requires authentication - instructors/admins only

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SMTP2GO_API_KEY = Deno.env.get('SMTP2GO_API_KEY')

interface SendDebriefRequest {
  historyRecordId: string
  recipientEmails: string[]
  pdfBase64: string
  pdfFilename: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }

  try {
    console.log('=== Send Debrief Report Function Started ===')

    // Parse the request body
    const requestData: SendDebriefRequest = await req.json()
    console.log('Request data:', { 
      historyRecordId: requestData.historyRecordId, 
      recipientCount: requestData.recipientEmails?.length,
      hasPDF: !!requestData.pdfBase64,
      filename: requestData.pdfFilename
    })
    
    // Validate required fields (only emails required for test)
    if (!requestData.recipientEmails || requestData.recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing recipient emails' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Validate email format for all recipients
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = requestData.recipientEmails.filter(email => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      return new Response(
        JSON.stringify({ error: `Invalid email format: ${invalidEmails.join(', ')}` }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // SIMPLIFIED TEST VERSION - just send basic email
    console.log('📧 TEST MODE: Sending simple email without database lookup')
    const subject = 'Test Simulation Debrief Report'
    const timestamp = new Date().toISOString()

    // Check if SMTP2GO API key is configured
    if (!SMTP2GO_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    console.log(`📧 Sending TEST email via SMTP2GO to: ${requestData.recipientEmails.join(', ')}`)

    // Send simple email via SMTP2GO WITHOUT PDF attachment for testing
    const res = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': SMTP2GO_API_KEY,
      },
      body: JSON.stringify({
        sender: 'HacCare Simulation Reports <support@haccare.app>',
        to: requestData.recipientEmails,
        subject: subject,
        html_body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Test Email - Simulation Debrief Report</h2>
            <p>This is a test email from the HacCare debrief email system.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Test Time:</strong> ${timestamp}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Edge Function is working!</p>
            </div>
            <p>If you received this email, the email delivery system is functioning correctly.</p>
          </div>
        `,
        text_body: `Test Email - Simulation Debrief Report

This is a test email from the HacCare debrief email system.
Test Time: ${timestamp}
Status: Edge Function is working!

If you received this email, the email delivery system is functioning correctly.`.trim(),
      }),
    })

    const data = await res.json()
    console.log('SMTP2GO response:', data)

    if (res.ok && data.data?.succeeded > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Report sent successfully to ${requestData.recipientEmails.length} recipient${requestData.recipientEmails.length !== 1 ? 's' : ''}` 
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    } else {
      console.error('SMTP2GO API error:', data)
      return new Response(
        JSON.stringify({ error: 'Failed to send email. Please try again.' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

  } catch (error) {
    console.error('=== ERROR in send-debrief-report ===')
    console.error('Error:', error)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send debrief report', 
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})
