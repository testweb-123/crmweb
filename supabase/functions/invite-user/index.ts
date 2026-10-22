// Invita a un usuario por correo. Solo para administradores del CRM.
// La invitación necesita la clave service_role, por eso no puede hacerse desde el navegador.
//
// Despliegue: npx supabase functions deploy invite-user
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2'

const ROLES = ['admin', 'manager', 'sales'] as const
type Role = (typeof ROLES)[number]

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'Método no permitido' })

  const url = Deno.env.get('SUPABASE_URL')!
  const authHeader = req.headers.get('Authorization') ?? ''

  // 1. ¿Quién llama? Se usa su propio JWT, así current_role_is() mira su perfil.
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: isAdmin, error: roleError } = await caller.rpc('current_role_is', { r: 'admin' })
  if (roleError || !isAdmin) return reply(403, { error: 'Solo un administrador puede invitar usuarios.' })

  // 2. Validar la entrada
  let body: { email?: string; full_name?: string; role?: string; redirect_to?: string }
  try {
    body = await req.json()
  } catch {
    return reply(400, { error: 'Cuerpo JSON no válido.' })
  }
  const email = body.email?.trim().toLowerCase() ?? ''
  const fullName = body.full_name?.trim() ?? ''
  const role = (ROLES as readonly string[]).includes(body.role ?? '') ? (body.role as Role) : 'sales'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: 'Correo no válido.' })
  if (!fullName) return reply(400, { error: 'El nombre es obligatorio.' })

  // 3. Invitar con service_role. Supabase solo acepta redirect_to si está en Redirect URLs.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: body.redirect_to,
  })
  if (error) {
    const msg = /already been registered|already exists/i.test(error.message)
      ? 'Ya existe un usuario con ese correo.'
      : error.message
    return reply(400, { error: msg })
  }

  // 4. El trigger handle_new_user crea el perfil como 'sales'; ajustar si se pidió otro rol
  if (role !== 'sales') {
    const { error: updError } = await admin.from('profiles').update({ role }).eq('id', data.user.id)
    if (updError) return reply(500, { error: `Usuario invitado, pero no se pudo asignar el rol: ${updError.message}` })
  }

  return reply(200, { id: data.user.id })
})
