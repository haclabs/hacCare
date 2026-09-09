// Supabase Edge Function: delete-simulation-student
// Rollback counterpart to create-simulation-student: deletes a disposable
// simulation-only student auth account. Used ONLY when a launch fails after
// the account was already created (so it never gets tied to a real
// simulation and would otherwise be orphaned forever in auth.users — nothing
// else can clean it up since delete_simulation() only knows how to remove
// accounts tracked in simulation_auto_students, which never gets a row until
// after a successful launch).
// Requires a valid caller session (admin/coordinator/super_admin/instructor only).
// Safety: only deletes accounts whose email matches the auto-generated
// sim-student pattern (simNNN@haccare.app) — never an arbitrary user.
// Deploy: supabase functions deploy delete-simulation-student

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AUTO_STUDENT_EMAIL_PATTERN = /^sim\d+@haccare\.app$/i

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

interface DeleteStudentRequestBody {
  userId: string
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
    return jsonResponse({ error: 'Not authorized to delete student accounts' }, 403)
  }

  let body: DeleteStudentRequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  const userId = body.userId
  if (!userId) {
    return jsonResponse({ error: 'userId is required' }, 400)
  }

  const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (getUserError || !targetUser.user) {
    // Already gone — treat as success, nothing left to clean up.
    return jsonResponse({ success: true }, 200)
  }

  if (!targetUser.user.email || !AUTO_STUDENT_EMAIL_PATTERN.test(targetUser.user.email)) {
    return jsonResponse({ error: 'Refusing to delete: target account is not an auto-generated simulation student' }, 400)
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (deleteError) {
    return jsonResponse({ success: false, error: deleteError.message }, 200)
  }

  return jsonResponse({ success: true }, 200)
})
