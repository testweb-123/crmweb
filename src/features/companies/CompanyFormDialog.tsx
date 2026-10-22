import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { Tables } from '@/lib/database.types'
import { errorMessage } from '@/lib/errors'
import { emptyToNull } from '@/lib/format'
import { useAuth } from '@/auth/context'
import { Field } from '@/components/shared'
import { OwnerSelect } from '@/components/OwnerSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useSaveCompany } from './api'

const optional = z.string().trim()

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  ruc: optional.refine((v) => v === '' || /^\d{11}$/.test(v), 'El RUC tiene 11 dígitos'),
  industry: optional,
  website: optional,
  phone: optional,
  address: optional,
  city: optional,
  owner_id: z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

function toForm(c: Tables<'companies'> | null | undefined, userId: string | null): FormValues {
  return {
    name: c?.name ?? '',
    ruc: c?.ruc ?? '',
    industry: c?.industry ?? '',
    website: c?.website ?? '',
    phone: c?.phone ?? '',
    address: c?.address ?? '',
    city: c?.city ?? '',
    owner_id: c?.owner_id ?? userId,
  }
}

export function CompanyFormDialog({ open, onOpenChange, company, onSaved }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si viene, el formulario edita esta empresa; si no, crea una nueva. */
  company?: Tables<'companies'> | null
  onSaved?: (id: string) => void
}) {
  const { isManager, user } = useAuth()
  const userId = user?.id ?? null
  const save = useSaveCompany()
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toForm(company, userId),
  })

  // Reinicia el formulario al abrirlo, no en cada render del padre
  const resetKey = `${open}:${company?.id}`
  useEffect(() => {
    if (open) reset(toForm(company, userId))
  }, [resetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = handleSubmit(async ({ owner_id, ...values }) => {
    try {
      const id = await save.mutateAsync({
        ...emptyToNull(values),
        name: values.name,
        id: company?.id,
        // sin owner_id el insert toma auth.uid(); solo manager/admin lo eligen
        ...(isManager && owner_id ? { owner_id } : {}),
      })
      toast.success(company ? 'Empresa actualizada.' : 'Empresa creada.')
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
          <DialogTitle>{company ? 'Editar empresa' : 'Nueva empresa'}</DialogTitle>
        </DialogHeader>
        <form id="company-form" noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Razón social o nombre" htmlFor="c-name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="c-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
          </Field>
          <Field label="RUC" htmlFor="c-ruc" error={errors.ruc?.message}>
            <Input id="c-ruc" inputMode="numeric" maxLength={11} aria-invalid={!!errors.ruc} {...register('ruc')} />
          </Field>
          <Field label="Rubro" htmlFor="c-industry">
            <Input id="c-industry" placeholder="Construcción, minería…" {...register('industry')} />
          </Field>
          <Field label="Teléfono" htmlFor="c-phone">
            <Input id="c-phone" type="tel" {...register('phone')} />
          </Field>
          <Field label="Web" htmlFor="c-website">
            <Input id="c-website" placeholder="empresa.pe" {...register('website')} />
          </Field>
          <Field label="Dirección" htmlFor="c-address" className="sm:col-span-2">
            <Input id="c-address" {...register('address')} />
          </Field>
          <Field label="Ciudad" htmlFor="c-city">
            <Input id="c-city" placeholder="Lima" {...register('city')} />
          </Field>
          {isManager && (
            <Field label="Responsable" htmlFor="c-owner">
              <Controller
                control={control}
                name="owner_id"
                render={({ field }) => <OwnerSelect id="c-owner" className="w-full" value={field.value} onChange={field.onChange} />}
              />
            </Field>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="company-form" disabled={save.isPending}>
            {save.isPending && <Loader2Icon className="animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
