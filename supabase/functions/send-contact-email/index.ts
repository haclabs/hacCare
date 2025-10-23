// Supabase Edge Function to handle contact form submissions
// This function does NOT require authentication (public endpoint)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SMTP2GO_API_KEY = Deno.env.get('SMTP2GO_API_KEY')

interface ContactFormData {
  name: string
  email: string
  institution: string
  message: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
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
    // Parse the request body
    const formData: ContactFormData = await req.json()
    
    // Validate required fields
    if (!formData.name || !formData.email || !formData.message) {
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Priority 1: Try SMTP2GO if API key is configured
    if (SMTP2GO_API_KEY) {
      console.log('📧 Sending via SMTP2GO...')
      
      // NOTE: Change sender email to match your verified SMTP2GO sender domain
      // If haccare.app is not verified in SMTP2GO, use your verified domain
      // Example: 'HacCare Contact <noreply@yourdomain.com>'
      
      const res = await fetch('https://api.smtp2go.com/v3/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Smtp2go-Api-Key': SMTP2GO_API_KEY,
        },
        body: JSON.stringify({
          sender: 'HacCare Contact Form <noreply@haccare.app>',
          to: ['support@haccare.app'],
          reply_to: formData.email,
          subject: `New Contact Form Submission from ${formData.name}`,
          html_body: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Institution:</strong> ${formData.institution || 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <p>${formData.message.replace(/\n/g, '<br>')}</p>
          `,
          text_body: `
New Contact Form Submission

Name: ${formData.name}
Email: ${formData.email}
Institution: ${formData.institution || 'Not provided'}

Message:
${formData.message}
          `.trim(),
        }),
      })

      const data = await res.json()
      console.log('SMTP2GO response:', data)

      if (res.ok && data.data?.succeeded > 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Thank you for your message! We\'ll get back to you soon.' 
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
        // Continue to fallback methods
      }
    }

    // Priority 2: Try Resend if API key is configured
    if (RESEND_API_KEY) {
      console.log('📧 Sending via Resend...')
      
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'HacCare Contact Form <noreply@haccare.app>',
          to: ['support@haccare.app'],
          reply_to: formData.email,
          subject: `New Contact Form Submission from ${formData.name}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Institution:</strong> ${formData.institution || 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <p>${formData.message.replace(/\n/g, '<br>')}</p>
          `,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        return new Response(
          JSON.stringify({ success: true, message: 'Email sent successfully' }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        )
      } else {
        console.error('Resend API error:', data)
        // Continue to database fallback
      }
    }

    // Priority 3: Fallback - Store in database if no email service configured
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error } = await supabaseClient
      .from('contact_submissions')
      .insert({
        name: formData.name,
        email: formData.email,
        institution: formData.institution,
        message: formData.message,
        submitted_at: new Date().toISOString(),
      })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Your message has been received. We\'ll get back to you soon!' 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )

  } catch (error) {
    console.error('Error processing contact form:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process contact form submission' }),
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
