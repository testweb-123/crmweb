import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { Enums } from '@/lib/database.types'
import { errorMessage } from '@/lib/errors'
import { emptyToNull } from '@/lib/format'
import { contactSources, contactStatusLabels } from '@/lib/labels'
import { useAuth } from '@/auth/context'
import { CompanyCombobox, type CompanyRef } from '@/components/CompanyCombobox'
import { Field } from '@/components/shared'
import { OwnerSelect } from '@/components/OwnerSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useSaveContact, type ContactListRow } from './api'

const statuses = Object.keys(contactStatusLabels) as Enums<'contact_status'>[]
const statusItems = statuses.map((s) => ({ value: s, label: contactStatusLabels[s] }))

const schema = z.object({
  first_name: z.string().trim().min(1, 'El nombre es obligatorio'),
  last_name: z.string().trim(),
  email: z.string().trim().refine((v) => v === '' || z.email().safeParse(v).success, 'Correo no válido'),
  phone: z.string().trim(),
  position: z.string().trim(),
  status: z.enum(statuses as [Enums<'contact_status'>, ...Enums<'contact_status'>[]]),
  source: z.string().trim(),
  notes: z.string().trim(),
  company: z.object({ id: z.string(), name: z.string() }).nullable(),
  owner_id: z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

function toForm(c: ContactListRow | null | undefined, defaults: { company?: CompanyRef | null; userId: string | null }): FormValues {
  return {
    first_name: c?.first_name ?? '',
    last_name: c?.last_name ?? '',
    email: c?.email ?? '',
    phone: c?.phone ?? '',
    position: c?.position ?? '',
    status: c?.status ?? 'lead',
    source: c?.source ?? '',
    notes: c?.notes ?? '',
    company: c ? c.company : (defaults.company ?? null),
    owner_id: c?.owner_id ?? defaults.userId,
  }
}

export function ContactFormDialog({ open, onOpenChange, contact, defaultCompany, onSaved }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si viene, edita este contacto; si no, crea uno nuevo. */
  contact?: ContactListRow | null
  /** Empresa preseleccionada al crear desde la ficha de una empresa. */
  defaultCompany?: CompanyRef | null
  onSaved?: (id: string) => void
}) {
  const { isManager, user } = useAuth()
  const userId = user?.id ?? null
  const save = useSaveContact()
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toForm(contact, { company: defaultCompany, userId }),
  })

  // Reinicia el formulario al abrirlo (o al cambiar de registro), no en cada render del padre
  const resetKey = `${open}:${contact?.id}:${defaultCompany?.id}`
  useEffect(() => {
    if (open) reset(toForm(contact, { company: defaultCompany, userId }))
  }, [resetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = handleSubmit(async ({ company, owner_id, ...values }) => {
    try {
      const id = await save.mutateAsync({
        ...emptyToNull(values),
        first_name: values.first_name,
        status: values.status,
        email: values.email ? values.email.toLowerCase() : null,
        company_id: company?.id ?? null,
        id: contact?.id,
        ...(isManager && owner_id ? { owner_id } : {}),
      })
      toast.success(contact ? 'Contacto actualizado.' : 'Contacto creado.')
      onOpenChange(false)
      onSaved?.(id)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{contact ? 'Editar contacto' : 'Nuevo contacto'}</DialogTitle>
        </DialogHeader>
        <form id="contact-form" noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="ct-first" error={errors.first_name?.message}>
            <Input id="ct-first" autoFocus aria-invalid={!!errors.first_name} {...register('first_name')} />
          </Field>
          <Field label="Apellidos" htmlFor="ct-last">
            <Input id="ct-last" {...register('last_name')} />
          </Field>
          <Field label="Correo" htmlFor="ct-email" error={errors.email?.message}>
            <Input id="ct-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
          </Field>
          <Field label="Teléfono / WhatsApp" htmlFor="ct-phone">
            <Input id="ct-phone" type="tel" placeholder="987 654 321" {...register('phone')} />
          </Field>
          <Field label="Empresa" htmlFor="ct-company" className="sm:col-span-2">
            <Controller
              control={control}
              name="company"
              render={({ field }) => <CompanyCombobox id="ct-company" value={field.value} onChange={field.onChange} />}
            />
          </Field>
          <Field label="Cargo" htmlFor="ct-position">
            <Input id="ct-position" placeholder="Gerente de compras" {...register('position')} />
          </Field>
          <Field label="Estado" htmlFor="ct-status">
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select items={statusItems} value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <SelectTrigger id="ct-status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusItems.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Origen" htmlFor="ct-source" hint="De dónde llegó el contacto.">
            <Input id="ct-source" list="contact-sources" {...register('source')} />
            <datalist id="contact-sources">
              {contactSources.map((s) => <option key={s} value={s} />)}
            </datalist>
          </Field>
          {isManager && (
            <Field label="Responsable" htmlFor="ct-owner">
              <Controller
                control={control}
                name="owner_id"
                render={({ field }) => <OwnerSelect id="ct-owner" className="w-full" value={field.value} onChange={field.onChange} />}
              />
            </Field>
          )}
          <Field label="Notas" htmlFor="ct-notes" className="sm:col-span-2">
            <Textarea id="ct-notes" rows={3} {...register('notes')} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="contact-form" disabled={save.isPending}>
            {save.isPending && <Loader2Icon className="animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
