import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { arrivedFromInvite, supabase } from '@/lib/supabase'
import { AuthContext, type AuthState } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [restoring, setRestoring] = useState(true)
  const inviteHandled = useRef(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setRestoring(false)
    })

    // No llamar a supabase dentro de este callback: puede bloquear el cliente.
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') navigate('/cambiar-clave')
      // supabase-js repite SIGNED_IN al volver a la pestaña: redirigir solo la primera vez
      if (event === 'SIGNED_IN' && arrivedFromInvite && !inviteHandled.current) {
        inviteHandled.current = true
        navigate('/cambiar-clave', { replace: true })
      }
      if (event === 'SIGNED_OUT') queryClient.clear()
    })
    return () => sub.subscription.unsubscribe()
  }, [navigate, queryClient])

  const userId = session?.user.id
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single()
      if (error) throw error
      return data
    },
  })

  const value = useMemo<AuthState>(() => {
    const profile = profileQuery.data ?? null
    const role = profile?.active ? profile.role : null
    return {
      session,
      user: session?.user ?? null,
      profile,
      loading: restoring || (Boolean(userId) && profileQuery.isPending),
      isAdmin: role === 'admin',
      isManager: role === 'admin' || role === 'manager',
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }
  }, [session, restoring, userId, profileQuery.data, profileQuery.isPending])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
