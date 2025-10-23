/**
 * Contact Form Service
 * Handles sending contact form submissions to the backend
 */

import { supabase } from '../../lib/api/supabase';

export interface ContactFormData {
  name: string;
  email: string;
  institution?: string;
  message: string;
}

export interface ContactFormResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Submit contact form to Supabase Edge Function
 */
export async function submitContactForm(
  formData: ContactFormData
): Promise<ContactFormResponse> {
  try {
    // Validate required fields
    if (!formData.name || !formData.email || !formData.message) {
      return {
        success: false,
        error: 'Please fill in all required fields',
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      };
    }

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-contact-email', {
      body: formData,
    });

    if (error) {
      console.error('Error submitting contact form:', error);
      return {
        success: false,
        error: 'Failed to send message. Please try again or email info@haccare.app directly.',
      };
    }

    return {
      success: true,
      message: data?.message || 'Thank you for your message! We\'ll get back to you soon.',
    };
  } catch (error) {
    console.error('Unexpected error submitting contact form:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
    };
  }
}
