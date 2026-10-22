import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon, GlobeIcon, PencilIcon, PhoneIcon, PlusIcon, Trash2Icon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/labels'
import { fullName } from '@/lib/format'
import { useCompany, useDeleteCompany } from '@/features/companies/api'
import { CompanyFormDialog } from '@/features/companies/CompanyFormDialog'
import { ContactFormDialog } from '@/features/contacts/ContactFormDialog'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorNotice, InfoRow, StatusBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function websiteUrl(site: string) {
  return /^https?:\/\//i.test(site) ? site : `https://${site}`
}

export function CompanyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { data: company, isPending, error } = useCompany(id)
  const remove = useDeleteCompany()
  const [editing, setEditing] = useState(false)
  const [addingContact, setAddingContact] = useState(false)

  if (isPending) return <Skeleton className="h-64" />
  if (error || !company) {
    return (
      <>
        <BackLink />
        <ErrorNotice error={error ?? { message: 'Empresa no encontrada.' }} />
      </>
    )
  }

  return (
    <>
      <BackLink />
      <PageHeader
        title={company.name}
        description={[company.industry, company.city].filter(Boolean).join(' · ') || undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilIcon />
              Editar
            </Button>
            {isAdmin && (
              <ConfirmDelete
                trigger={<Button variant="destructive" aria-label="Eliminar empresa"><Trash2Icon /></Button>}
                title="¿Eliminar esta empresa?"
                description="Sus contactos se conservan pero quedan sin empresa. Esta acción no se puede deshacer."
                onConfirm={async () => {
                  try {
                    await remove.mutateAsync(company.id)
                    toast.success('Empresa eliminada.')
                    navigate('/empresas', { replace: true })
                  } catch (err) {
                    toast.error(errorMessage(err))
                  }
                }}
              />
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <InfoRow label="RUC"><span className="tabular-nums">{company.ruc}</span></InfoRow>
              <InfoRow label="Teléfono">
                {company.phone && (
                  <a href={`tel:${company.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                    <PhoneIcon className="size-3.5" />{company.phone}
                  </a>
                )}
              </InfoRow>
              <InfoRow label="Web">
                {company.website && (
                  <a href={websiteUrl(company.website)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
                    <GlobeIcon className="size-3.5" />{company.website}
                  </a>
                )}
              </InfoRow>
              <InfoRow label="Dirección">{company.address}</InfoRow>
              <InfoRow label="Responsable">{company.owner?.full_name}</InfoRow>
              <InfoRow label="Creada">{formatDate(company.created_at)}</InfoRow>
            </dl>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Contactos ({company.contacts.length})</CardTitle>
            <CardAction>
              <Button size="sm" variant="outline" onClick={() => setAddingContact(true)}>
                <PlusIcon />
                Añadir
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {company.contacts.length === 0 ? (
              <EmptyState icon={UsersIcon} title="Sin contactos" description="Añade a las personas con las que tratas en esta empresa." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.contacts.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/contactos/${c.id}`)}>
                      <TableCell>
                        <div className="font-medium">{fullName(c)}</div>
                        {c.position && <div className="text-xs text-muted-foreground">{c.position}</div>}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{c.email ?? c.phone ?? '—'}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CompanyFormDialog open={editing} onOpenChange={setEditing} company={company} />
      <ContactFormDialog
        open={addingContact}
        onOpenChange={setAddingContact}
        defaultCompany={{ id: company.id, name: company.name }}
      />
    </>
  )
}

function BackLink() {
  return (
    <Link to="/empresas" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeftIcon className="size-4" />
      Empresas
    </Link>
  )
}
