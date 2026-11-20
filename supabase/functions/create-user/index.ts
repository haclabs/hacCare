// Supabase Edge Function: create-user
// Creates a pre-confirmed auth user with an admin-chosen password using the
// Admin API (service role). Replaces client-side signUp() in the admin user
// form, so public sign-up can stay disabled (accounts are invitation-only).
// Instructors are invited by email instead (see invite-user).
// Requires a valid caller session (admin/coordinator/super_admin only).
// Deploy: supabase functions deploy create-user

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Mirrors [auth] minimum_password_length in supabase/config.toml
const MIN_PASSWORD_LENGTH = 8

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

interface CreateUserRequestBody {
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

  const ALLOWED_ROLES = ['admin', 'coordinator', 'super_admin']
  if (profileError || !callerProfile || !ALLOWED_ROLES.includes(callerProfile.role)) {
    return jsonResponse({ error: 'Not authorized to create users' }, 403)
  }

  let body: CreateUserRequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ''
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    return jsonResponse({ error: 'A valid email address is required' }, 400)
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return jsonResponse({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400)
  }

  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: body.firstName?.trim() || '',
      last_name: body.lastName?.trim() || '',
    },
  })

  if (createError || !createData.user) {
    const isDuplicate = /already.*(registered|exists)/i.test(createError?.message || '')
    return jsonResponse(
      { error: isDuplicate ? 'A user with this email address already exists' : (createError?.message || 'Failed to create user') },
      isDuplicate ? 409 : 500
    )
  }

  return jsonResponse({ success: true, userId: createData.user.id }, 200)
})
