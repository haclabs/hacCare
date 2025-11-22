// Supabase Edge Function to send debrief report via email with PDF attachment

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
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-my-custom-header',
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

    // Create Supabase admin client for database access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Parse the request body
    const requestData: SendDebriefRequest = await req.json()
    console.log('Request data:', { 
      historyRecordId: requestData.historyRecordId, 
      recipientCount: requestData.recipientEmails?.length,
      hasPDF: !!requestData.pdfBase64,
      filename: requestData.pdfFilename
    })
    
    // Validate required fields
    if (!requestData.historyRecordId || !requestData.recipientEmails || requestData.recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Validate PDF data
    if (!requestData.pdfBase64 || !requestData.pdfFilename) {
      return new Response(
        JSON.stringify({ error: 'PDF data is required' }),
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

    // Fetch the history record to get simulation details
    console.log('Fetching history record:', requestData.historyRecordId)
    const { data: historyRecord, error: historyError } = await supabaseAdmin
      .from('simulation_history')
      .select('name, completed_at, ended_at, started_at, student_activities')
      .eq('id', requestData.historyRecordId)
      .single()

    if (historyError || !historyRecord) {
      console.error('History fetch error:', historyError)
      return new Response(
        JSON.stringify({ error: 'Simulation history record not found' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Extract student names from student_activities
    const studentNames: string[] = []
    if (historyRecord.student_activities && Array.isArray(historyRecord.student_activities)) {
      historyRecord.student_activities.forEach((activity: any) => {
        if (activity.studentName) {
          studentNames.push(activity.studentName)
        }
      })
    }

    // Format timestamp in MST 24-hour format
    // Use completed_at if available, fallback to ended_at, then started_at
    const dateToUse = historyRecord.completed_at || historyRecord.ended_at || historyRecord.started_at
    const completedDate = new Date(dateToUse)
    
    // Check if date is valid
    if (isNaN(completedDate.getTime())) {
      console.error('Invalid date:', { completed_at: historyRecord.completed_at, ended_at: historyRecord.ended_at, started_at: historyRecord.started_at })
      return new Response(
        JSON.stringify({ error: 'Invalid simulation completion date' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }
    
    // Convert to MST (UTC-7)
    const mstDate = new Date(completedDate.getTime() - (7 * 60 * 60 * 1000))
    const dateStr = mstDate.toISOString().split('T')[0]
    const timeStr = mstDate.toISOString().split('T')[1].substring(0, 5)
    const timestamp = `${dateStr} ${timeStr} MST`
    
    console.log('Timestamp calculation:', { dateToUse, completedDate: completedDate.toISOString(), timestamp })

    // Build subject line
    const studentsStr = studentNames.length > 0 ? ` - ${studentNames.join(', ')}` : ''
    const subject = `${historyRecord.name} - ${timestamp}${studentsStr}`

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

    console.log(`📧 Sending debrief report via SMTP2GO to: ${requestData.recipientEmails.join(', ')}`)

    // Send email via SMTP2GO with PDF attachment
    const res = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': SMTP2GO_API_KEY,
      },
      body: JSON.stringify({
        sender: 'hacCare Simulation Reports <support@haccare.app>',
        to: requestData.recipientEmails,
        subject: subject,
        html_body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Simulation Debrief Report</h2>
            <p>Please find attached the detailed debrief report for:</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Simulation:</strong> ${historyRecord.name}</p>
              <p style="margin: 5px 0;"><strong>Completed:</strong> ${timestamp}</p>
              ${studentNames.length > 0 ? `<p style="margin: 5px 0;"><strong>Students:</strong> ${studentNames.join(', ')}</p>` : ''}
            </div>
            <p>The attached PDF contains:</p>
            <ul>
              <li>Student activity summary</li>
              <li>Performance metrics</li>
              <li>Clinical interventions</li>
              <li>Detailed activity logs</li>
            </ul>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              This email was sent from hacCare Simulation Training System.<br>
              If you have questions, please contact your simulation coordinator.
            </p>
          </div>
        `,
        text_body: `
Simulation Debrief Report

Simulation: ${historyRecord.name}
Completed: ${timestamp}
${studentNames.length > 0 ? `Students: ${studentNames.join(', ')}` : ''}

Please see the attached PDF for the complete debrief report including student activity summary, performance metrics, clinical interventions, and detailed activity logs.

---
This email was sent from hacCare Simulation Training System.
        `.trim(),
        attachments: [
          {
            filename: requestData.pdfFilename,
            fileblob: requestData.pdfBase64,
            mimetype: 'application/pdf'
          }
        ]
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
