import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Tables } from '@/lib/database.types'

export type AuthState = {
  session: Session | null
  user: User | null
  profile: Tables<'profiles'> | null
  /** true mientras se recupera la sesión guardada o se carga el perfil */
  loading: boolean
  isAdmin: boolean
  isManager: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
