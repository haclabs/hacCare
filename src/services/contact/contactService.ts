/**
 * Contact Form Service
 * Handles sending contact form submissions to the backend
 */

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

    // Call the Supabase Edge Function directly with anon key
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-contact-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Error submitting contact form:', result);
      return {
        success: false,
        error: result.error || 'Failed to send message. Please try again or email support@haccare.app directly.',
      };
    }

    return {
      success: true,
      message: result.message || 'Thank you for your message! We\'ll get back to you soon.',
    };
  } catch (error) {
    console.error('Unexpected error submitting contact form:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
    };
  }
}
