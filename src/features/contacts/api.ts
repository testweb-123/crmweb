import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database, Enums } from '@/lib/database.types'
import { pageRange, searchFilter } from '@/lib/search'

export type ContactFilters = {
  search: string
  status: Enums<'contact_status'> | null
  owner: string | null
  tag: number | null
  page: number
}

// tag_filter es un segundo embed de contact_tags que solo sirve para filtrar (!inner),
// así contact_tags sigue trayendo todas las etiquetas del contacto.
const TAGS = 'contact_tags(tag:tags(id, name, color))'
const LIST_SELECT = `*, company:companies(id, name), owner:profiles(id, full_name), ${TAGS}`

export function useContacts(f: ContactFilters) {
  return useQuery({
    queryKey: ['contacts', f],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const select = f.tag ? `${LIST_SELECT}, tag_filter:contact_tags!inner(tag_id)` : LIST_SELECT
      let q = supabase.from('contacts').select(select, { count: 'exact' })
      const search = searchFilter(f.search, ['first_name', 'last_name', 'email', 'phone', 'position'])
      if (search) q = q.or(search)
      if (f.status) q = q.eq('status', f.status)
      if (f.owner) q = q.eq('owner_id', f.owner)
      if (f.tag) q = q.eq('tag_filter.tag_id', f.tag)
      const [from, to] = pageRange(f.page)
      const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to)
      if (error) throw error
      return { rows: data as unknown as ContactListRow[], count: count ?? 0 }
    },
  })
}

type TagRef = { id: number; name: string; color: string }

export type ContactListRow = Database['public']['Tables']['contacts']['Row'] & {
  company: { id: string; name: string } | null
  owner: { id: string; full_name: string } | null
  contact_tags: { tag: TagRef | null }[]
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ['contact', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select(LIST_SELECT).eq('id', id!).single()
      if (error) throw error
      return data as unknown as ContactListRow
    },
  })
}

export const contactTags = (c: Pick<ContactListRow, 'contact_tags'>) =>
  c.contact_tags.map((ct) => ct.tag).filter((t): t is TagRef => t !== null)

export type ContactInput = Database['public']['Tables']['contacts']['Insert']

export function useSaveContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: ContactInput) => {
      const { data, error } = id
        ? await supabase.from('contacts').update(values).eq('id', id).select('id').single()
        : await supabase.from('contacts').insert(values).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['contact', id] })
      qc.invalidateQueries({ queryKey: ['companies'] })
      qc.invalidateQueries({ queryKey: ['company'] })
    },
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('contacts').delete().eq('id', id).select('id')
      if (error) throw error
      if (!data.length) throw { code: '42501' }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['companies'] })
      qc.invalidateQueries({ queryKey: ['company'] })
    },
  })
}
