import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon, Building2Icon, CalendarClockIcon, HandCoinsIcon, MailIcon, MessageCircleIcon, PencilIcon, PhoneIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { errorMessage } from '@/lib/errors'
import { fullName, whatsappUrl } from '@/lib/format'
import { formatDate } from '@/lib/labels'
import { contactTags, useContact, useDeleteContact } from '@/features/contacts/api'
import { ContactFormDialog } from '@/features/contacts/ContactFormDialog'
import { useSetContactTags } from '@/features/tags/api'
import { TagPicker } from '@/features/tags/TagPicker'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorNotice, InfoRow, StatusBadge, TagBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { data: contact, isPending, error } = useContact(id)
  const remove = useDeleteContact()
  const setTags = useSetContactTags()
  const [editing, setEditing] = useState(false)

  if (isPending) return <Skeleton className="h-64" />
  if (error || !contact) {
    return (
      <>
        <BackLink />
        <ErrorNotice error={error ?? { message: 'Contacto no encontrado.' }} />
      </>
    )
  }

  const tags = contactTags(contact)
  const wa = contact.phone ? whatsappUrl(contact.phone) : null

  function updateTags(next: number[]) {
    setTags.mutate(
      { contactId: contact!.id, current: tags.map((t) => t.id), next },
      { onError: (err) => toast.error(errorMessage(err)) },
    )
  }

  return (
    <>
      <BackLink />
      <PageHeader
        title={fullName(contact)}
        description={[contact.position, contact.company?.name].filter(Boolean).join(' · ') || undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            {contact.phone && (
              <Button variant="outline" nativeButton={false} render={<a href={`tel:${contact.phone}`} />} aria-label="Llamar">
                <PhoneIcon />
              </Button>
            )}
            {wa && (
              <Button variant="outline" nativeButton={false} render={<a href={wa} target="_blank" rel="noreferrer" />} aria-label="WhatsApp">
                <MessageCircleIcon />
              </Button>
            )}
            {contact.email && (
              <Button variant="outline" nativeButton={false} render={<a href={`mailto:${contact.email}`} />} aria-label="Enviar correo">
                <MailIcon />
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilIcon />
              Editar
            </Button>
            {isAdmin && (
              <ConfirmDelete
                trigger={<Button variant="destructive" aria-label="Eliminar contacto"><Trash2Icon /></Button>}
                title="¿Eliminar este contacto?"
                description="Se borran también sus actividades y etiquetas. Esta acción no se puede deshacer."
                onConfirm={async () => {
                  try {
                    await remove.mutateAsync(contact.id)
                    toast.success('Contacto eliminado.')
                    navigate('/contactos', { replace: true })
                  } catch (err) {
                    toast.error(errorMessage(err))
                  }
                }}
              />
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
              <CardAction><StatusBadge status={contact.status} /></CardAction>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <InfoRow label="Correo">
                  {contact.email && <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>}
                </InfoRow>
                <InfoRow label="Teléfono">
                  {contact.phone && <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>}
                </InfoRow>
                <InfoRow label="Empresa">
                  {contact.company && (
                    <Link to={`/empresas/${contact.company.id}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Building2Icon className="size-3.5" />
                      {contact.company.name}
                    </Link>
                  )}
                </InfoRow>
                <InfoRow label="Origen">{contact.source}</InfoRow>
                <InfoRow label="Responsable">{contact.owner?.full_name}</InfoRow>
                <InfoRow label="Creado">{formatDate(contact.created_at)}</InfoRow>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Etiquetas</CardTitle>
              <CardAction>
                <TagPicker selected={tags.map((t) => t.id)} onChange={updateTags} disabled={setTags.isPending} />
              </CardAction>
            </CardHeader>
            <CardContent>
              {tags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => <TagBadge key={t.id} name={t.name} color={t.color} />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin etiquetas.</p>
              )}
            </CardContent>
          </Card>

          {contact.notes && (
            <Card>
              <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{contact.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Oportunidades</CardTitle></CardHeader>
            <CardContent>
              <EmptyState icon={HandCoinsIcon} title="Próximamente" description="Las oportunidades de venta llegan en la fase 2." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Actividad</CardTitle></CardHeader>
            <CardContent>
              <EmptyState icon={CalendarClockIcon} title="Próximamente" description="Llamadas, reuniones y tareas llegan en la fase 3." />
            </CardContent>
          </Card>
        </div>
      </div>

      <ContactFormDialog open={editing} onOpenChange={setEditing} contact={contact} />
    </>
  )
}

function BackLink() {
  return (
    <Link to="/contactos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeftIcon className="size-4" />
      Contactos
    </Link>
  )
}
