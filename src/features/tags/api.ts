import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export type Tag = Tables<'tags'>

export const TAG_COLORS = ['#64748b', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0d9488', '#2563eb', '#7c3aed', '#db2777']

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('tags').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useSaveTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, color }: { id?: number; name: string; color: string }) => {
      const { error } = id
        ? await supabase.from('tags').update({ name, color }).eq('id', id)
        : await supabase.from('tags').insert({ name, color })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['contact'] })
    },
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('tags').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['contact'] })
    },
  })
}

/** Reemplaza las etiquetas de un contacto por `tagIds`, tocando solo las que cambian. */
export function useSetContactTags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ contactId, current, next }: { contactId: string; current: number[]; next: number[] }) => {
      const toAdd = next.filter((id) => !current.includes(id))
      const toRemove = current.filter((id) => !next.includes(id))
      if (toRemove.length) {
        const { error } = await supabase.from('contact_tags').delete().eq('contact_id', contactId).in('tag_id', toRemove)
        if (error) throw error
      }
      if (toAdd.length) {
        const { error } = await supabase.from('contact_tags').insert(toAdd.map((tag_id) => ({ contact_id: contactId, tag_id })))
        if (error) throw error
      }
    },
    // Devolver la promesa mantiene isPending hasta tener las etiquetas nuevas:
    // así un segundo clic no parte de una lista desactualizada.
    onSuccess: (_d, { contactId }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['contacts'] }),
        qc.invalidateQueries({ queryKey: ['contact', contactId] }),
      ]),
  })
}
