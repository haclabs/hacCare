// Supabase Edge Function: create-simulation-student
// Creates a disposable, pre-confirmed simulation-only student auth account
// using the Admin API (service role) instead of client-side signUp(). The
// Admin API never sends a confirmation/invite email — signUp() does, and
// that email was bouncing in SMTP2GO because these accounts use fake,
// non-deliverable addresses (sim247@haccare.app) that exist only to satisfy
// login, never to receive mail.
// Requires a valid caller session (admin/coordinator/super_admin/instructor only).
// Deploy: supabase functions deploy create-simulation-student

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

interface CreateStudentRequestBody {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401)
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set' }, 500)
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Identify and authorize the caller from their bearer token
  const callerToken = authHeader.replace('Bearer ', '')
  const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(callerToken)
  if (callerError || !callerData.user) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401)
  }

  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single()

  const ALLOWED_ROLES = ['admin', 'coordinator', 'super_admin', 'instructor']
  if (profileError || !callerProfile || !ALLOWED_ROLES.includes(callerProfile.role)) {
    return jsonResponse({ error: 'Not authorized to create student accounts' }, 403)
  }

  let body: CreateStudentRequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  if (!email || !password) {
    return jsonResponse({ error: 'email and password are required' }, 400)
  }

  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pre-confirmed — no confirmation email is ever sent by this API
    user_metadata: {
      first_name: body.firstName || '',
      last_name: body.lastName || '',
    },
  })

  if (createError || !createData.user) {
    // Short login-code space means email collisions are expected — let the
    // caller retry with a freshly generated code instead of failing outright.
    const isCollision = /already.*(registered|exists)/i.test(createError?.message || '')
    return jsonResponse(
      { success: false, code: isCollision ? 'email_exists' : 'create_failed', error: createError?.message || 'Failed to create user' },
      200
    )
  }

  return jsonResponse({ success: true, userId: createData.user.id }, 200)
})
