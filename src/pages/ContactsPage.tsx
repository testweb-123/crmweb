import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, UsersIcon } from 'lucide-react'
import { useAuth } from '@/auth/context'
import type { Enums } from '@/lib/database.types'
import { fullName } from '@/lib/format'
import { useUrlFilters } from '@/lib/hooks'
import { contactStatusLabels } from '@/lib/labels'
import { contactTags, useContacts } from '@/features/contacts/api'
import { ContactFormDialog } from '@/features/contacts/ContactFormDialog'
import { useTags } from '@/features/tags/api'
import { PageHeader } from '@/components/PageHeader'
import { OwnerSelect } from '@/components/OwnerSelect'
import { SearchInput } from '@/components/SearchInput'
import { EmptyState, ErrorNotice, Pagination, StatusBadge, TagBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ALL = '__all__'
const statusItems = [
  { value: ALL, label: 'Todos los estados' },
  ...Object.entries(contactStatusLabels).map(([value, label]) => ({ value, label })),
]

export function ContactsPage() {
  const navigate = useNavigate()
  const { isManager } = useAuth()
  const { data: tags = [] } = useTags()
  const [creating, setCreating] = useState(false)
  const { values, page, set } = useUrlFilters(['q', 'status', 'owner', 'tag'] as const)

  const filters = {
    search: values.q ?? '',
    status: (values.status as Enums<'contact_status'> | null) ?? null,
    owner: values.owner,
    tag: values.tag ? Number(values.tag) : null,
    page,
  }
  const { data, isPending, error, isPlaceholderData } = useContacts(filters)
  const hasFilters = Boolean(values.q || values.status || values.owner || values.tag)
  const tagItems = [{ value: ALL, label: 'Todas las etiquetas' }, ...tags.map((t) => ({ value: String(t.id), label: t.name }))]

  return (
    <>
      <PageHeader
        title="Contactos"
        description="Personas con las que trabajas."
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            Nuevo contacto
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput
          className="w-full sm:w-72"
          value={filters.search}
          onChange={(q) => set({ q })}
          placeholder="Buscar por nombre, correo o teléfono"
        />
        <Select items={statusItems} value={values.status ?? ALL} onValueChange={(v) => set({ status: v === ALL ? null : (v as string) })}>
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-44" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statusItems.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={tagItems} value={values.tag ?? ALL} onValueChange={(v) => set({ tag: v === ALL ? null : (v as string) })}>
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-44" aria-label="Etiqueta"><SelectValue /></SelectTrigger>
          <SelectContent>
            {tagItems.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {isManager && (
          <OwnerSelect className="w-full sm:w-52" value={values.owner} onChange={(owner) => set({ owner })} allLabel="Todos los responsables" />
        )}
        {hasFilters && (
          <Button variant="ghost" onClick={() => set({ q: null, status: null, owner: null, tag: null })}>
            Quitar filtros
          </Button>
        )}
      </div>

      <ErrorNotice error={error} />

      {data && data.count === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={hasFilters ? 'Ningún contacto coincide' : 'Aún no hay contactos'}
          description={hasFilters ? 'Prueba con otra búsqueda o quita los filtros.' : 'Crea el primero o impórtalos más adelante desde un CSV.'}
          action={!hasFilters && <Button onClick={() => setCreating(true)}><PlusIcon />Nuevo contacto</Button>}
        />
      ) : (
        <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Empresa</TableHead>
                  <TableHead className="hidden lg:table-cell">Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden xl:table-cell">Etiquetas</TableHead>
                  <TableHead className="hidden sm:table-cell">Responsable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending &&
                  Array.from({ length: 6 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-5" /></TableCell>
                    </TableRow>
                  ))}
                {data?.rows.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/contactos/${c.id}`)}>
                    <TableCell className="max-w-56">
                      <div className="truncate font-medium">{fullName(c)}</div>
                      {c.position && <div className="truncate text-xs text-muted-foreground">{c.position}</div>}
                    </TableCell>
                    <TableCell className="hidden max-w-48 truncate md:table-cell">{c.company?.name ?? '—'}</TableCell>
                    <TableCell className="hidden max-w-56 lg:table-cell">
                      <div className="truncate">{c.email ?? '—'}</div>
                      {c.phone && <div className="truncate text-xs text-muted-foreground">{c.phone}</div>}
                    </TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {contactTags(c).map((t) => <TagBadge key={t.id} name={t.name} color={t.color} />)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{c.owner?.full_name ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && <Pagination page={page} count={data.count} onPage={(p) => set({ page: p })} />}
        </div>
      )}

      <ContactFormDialog open={creating} onOpenChange={setCreating} onSaved={(id) => navigate(`/contactos/${id}`)} />
    </>
  )
}
