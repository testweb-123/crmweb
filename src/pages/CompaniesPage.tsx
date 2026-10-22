import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2Icon, PlusIcon } from 'lucide-react'
import { useAuth } from '@/auth/context'
import { useUrlFilters } from '@/lib/hooks'
import { useCompanies } from '@/features/companies/api'
import { CompanyFormDialog } from '@/features/companies/CompanyFormDialog'
import { PageHeader } from '@/components/PageHeader'
import { OwnerSelect } from '@/components/OwnerSelect'
import { SearchInput } from '@/components/SearchInput'
import { EmptyState, ErrorNotice, Pagination } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function CompaniesPage() {
  const navigate = useNavigate()
  const { isManager } = useAuth()
  const [creating, setCreating] = useState(false)
  const { values, page, set } = useUrlFilters(['q', 'owner'] as const)
  const filters = { search: values.q ?? '', owner: values.owner, page }
  const { data, isPending, error, isPlaceholderData } = useCompanies(filters)
  const hasFilters = Boolean(values.q || values.owner)

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Clientes y prospectos por organización."
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            Nueva empresa
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput
          className="w-full sm:w-72"
          value={filters.search}
          onChange={(q) => set({ q })}
          placeholder="Buscar por nombre, RUC, rubro o ciudad"
        />
        {isManager && (
          <OwnerSelect className="w-full sm:w-52" value={values.owner} onChange={(owner) => set({ owner })} allLabel="Todos los responsables" />
        )}
      </div>

      <ErrorNotice error={error} />

      {data && data.count === 0 ? (
        <EmptyState
          icon={Building2Icon}
          title={hasFilters ? 'Ninguna empresa coincide' : 'Aún no hay empresas'}
          description={hasFilters ? 'Prueba con otra búsqueda o quita los filtros.' : 'Registra la primera para empezar a asociarle contactos.'}
          action={
            hasFilters ? (
              <Button variant="outline" onClick={() => set({ q: null, owner: null })}>Quitar filtros</Button>
            ) : (
              <Button onClick={() => setCreating(true)}><PlusIcon />Nueva empresa</Button>
            )
          }
        />
      ) : (
        <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="hidden md:table-cell">RUC</TableHead>
                  <TableHead className="hidden lg:table-cell">Ciudad</TableHead>
                  <TableHead className="text-right">Contactos</TableHead>
                  <TableHead className="hidden sm:table-cell">Responsable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending &&
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-5" /></TableCell>
                    </TableRow>
                  ))}
                {data?.rows.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/empresas/${c.id}`)}>
                    <TableCell className="max-w-64">
                      <div className="truncate font-medium">{c.name}</div>
                      {c.industry && <div className="truncate text-xs text-muted-foreground">{c.industry}</div>}
                    </TableCell>
                    <TableCell className="hidden tabular-nums md:table-cell">{c.ruc ?? '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{c.city ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.contacts[0]?.count ?? 0}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{c.owner?.full_name ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && <Pagination page={page} count={data.count} onPage={(p) => set({ page: p })} />}
        </div>
      )}

      <CompanyFormDialog open={creating} onOpenChange={setCreating} onSaved={(id) => navigate(`/empresas/${id}`)} />
    </>
  )
}
