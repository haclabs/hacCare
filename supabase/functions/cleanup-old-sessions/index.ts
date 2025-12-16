// Edge Function: cleanup-old-sessions
// Scheduled to run daily to cleanup user_sessions older than 7 days
// Deploy: supabase functions deploy cleanup-old-sessions
// Schedule via Supabase Dashboard > Edge Functions > Cron Jobs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    // Verify this is a scheduled request (optional security check)
    const authHeader = req.headers.get('Authorization');
    
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_old_user_sessions');

    if (error) {
      console.error('Error cleaning up sessions:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Successfully cleaned up old user sessions');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Old sessions cleaned up successfully',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Exception during cleanup:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
