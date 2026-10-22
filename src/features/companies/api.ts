import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { pageRange, searchFilter } from '@/lib/search'

export type CompanyFilters = { search: string; owner: string | null; page: number }

const LIST_SELECT = '*, owner:profiles(id, full_name), contacts(count)'

export function useCompanies(f: CompanyFilters) {
  return useQuery({
    queryKey: ['companies', f],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from('companies').select(LIST_SELECT, { count: 'exact' })
      const search = searchFilter(f.search, ['name', 'ruc', 'industry', 'city'])
      if (search) q = q.or(search)
      if (f.owner) q = q.eq('owner_id', f.owner)
      const [from, to] = pageRange(f.page)
      const { data, error, count } = await q.order('name').range(from, to)
      if (error) throw error
      return { rows: data, count: count ?? 0 }
    },
  })
}

export type CompanyListRow = NonNullable<ReturnType<typeof useCompanies>['data']>['rows'][number]

/** Búsqueda corta para el selector de empresa en formularios. */
export function useCompanyOptions(search: string) {
  return useQuery({
    queryKey: ['company-options', search],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from('companies').select('id, name, ruc')
      const filter = searchFilter(search, ['name', 'ruc'])
      if (filter) q = q.or(filter)
      const { data, error } = await q.order('name').limit(20)
      if (error) throw error
      return data
    },
  })
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ['company', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*, owner:profiles(id, full_name), contacts(id, first_name, last_name, email, phone, position, status)')
        .eq('id', id!)
        .order('first_name', { referencedTable: 'contacts' })
        .single()
      if (error) throw error
      return data
    },
  })
}

export type CompanyInput = Database['public']['Tables']['companies']['Insert']

export function useSaveCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: CompanyInput) => {
      const { data, error } = id
        ? await supabase.from('companies').update(values).eq('id', id).select('id').single()
        : await supabase.from('companies').insert(values).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      qc.invalidateQueries({ queryKey: ['company-options'] })
      qc.invalidateQueries({ queryKey: ['company', id] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useDeleteCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Sin .select() un delete bloqueado por RLS no da error: se pide la fila para comprobarlo
      const { data, error } = await supabase.from('companies').delete().eq('id', id).select('id')
      if (error) throw error
      if (!data.length) throw { code: '42501' }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      qc.invalidateQueries({ queryKey: ['company-options'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
