/**
 * Debrief Email Service
 * Handles sending debrief reports via email with PDF attachments
 */

import { supabase } from '../../lib/api/supabase';

export interface SendDebriefEmailRequest {
  historyRecordId: string;
  recipientEmails: string[];
  pdfBase64: string;
  pdfFilename: string;
}

export interface SendDebriefEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Send debrief report via email with PDF attachment
 */
export async function sendDebriefEmail(
  request: SendDebriefEmailRequest
): Promise<SendDebriefEmailResponse> {
  try {
    // Validate required fields
    if (!request.historyRecordId || !request.recipientEmails || request.recipientEmails.length === 0) {
      return {
        success: false,
        error: 'Missing required fields',
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = request.recipientEmails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return {
        success: false,
        error: `Invalid email format: ${invalidEmails.join(', ')}`,
      };
    }

    // Validate PDF data
    if (!request.pdfBase64 || !request.pdfFilename) {
      return {
        success: false,
        error: 'PDF data is required',
      };
    }

    // Use direct fetch to call the Edge Function WITHOUT auth headers (like contact form)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-debrief-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error sending debrief email:', response.status, errorText);
      return {
        success: false,
        error: `Failed to send email (${response.status}). Please try again.`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: data?.message || `Email sent to ${request.recipientEmails.length} recipient${request.recipientEmails.length !== 1 ? 's' : ''}`,
    };
  } catch (error) {
    console.error('Unexpected error sending debrief email:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
    };
  }
}
