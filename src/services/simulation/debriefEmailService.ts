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

    // Call the Supabase Edge Function using the Supabase client
    // The client automatically handles authentication with the new JWT format
    console.log('🔥 CALLING EDGE FUNCTION via supabase.functions.invoke');
    console.log('🔥 Request:', { recipientEmails: request.recipientEmails });
    
    const { data, error } = await supabase.functions.invoke('send-debrief-report', {
      body: request,
    });

    console.log('🔥 Response data:', data);
    console.log('🔥 Response error:', error);

    if (error) {
      console.error('Error sending debrief email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email. Please try again.',
      };
    }

    // Check if the response data contains an error
    if (data?.error) {
      console.error('Edge Function returned error:', data.error);
      return {
        success: false,
        error: data.error,
      };
    }

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
