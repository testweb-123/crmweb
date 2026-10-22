import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

// Se lee antes de crear el cliente, que limpia el hash al procesar el enlace.
// Un usuario invitado entra con sesión pero sin contraseña: hay que llevarlo a crearla.
export const arrivedFromInvite = /[#&]type=invite\b/.test(window.location.hash)

// Con valores de relleno el cliente se crea igual y la app muestra el aviso de configuración.
export const supabase = createClient<Database>(
  url ?? 'http://localhost:54321',
  anonKey ?? 'missing-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)
