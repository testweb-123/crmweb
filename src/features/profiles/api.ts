import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database, Enums } from '@/lib/database.types'

/** Todos los perfiles (para responsables, filtros y la gestión de usuarios). */
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name')
      if (error) throw error
      return data
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Database['public']['Tables']['profiles']['Update']) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export type InviteInput = { email: string; full_name: string; role: Enums<'user_role'> }

/** Invita por correo a través de la Edge Function invite-user (necesita service_role). */
export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: InviteInput) => {
      const { data, error } = await supabase.functions.invoke<{ error?: string }>('invite-user', {
        body: { ...input, redirect_to: `${window.location.origin}/cambiar-clave` },
      })
      if (error) {
        // FunctionsHttpError trae la respuesta: el cuerpo tiene el mensaje de la función
        const body = await (error.context as Response | undefined)?.json?.().catch(() => null)
        throw new Error(body?.error ?? error.message)
      }
      if (data?.error) throw new Error(data.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  })
}
