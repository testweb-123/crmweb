import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2Icon, UserPlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import type { Enums } from '@/lib/database.types'
import { errorMessage } from '@/lib/errors'
import { initials } from '@/lib/format'
import { roleLabels } from '@/lib/labels'
import { Field } from '@/components/shared'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInviteUser, useProfiles, useUpdateProfile } from './api'

const roles = Object.keys(roleLabels) as Enums<'user_role'>[]
const roleItems = roles.map((r) => ({ value: r, label: roleLabels[r] }))

export function UsersPanel() {
  const { user } = useAuth()
  const { data: profiles, isPending } = useProfiles()
  const update = useUpdateProfile()
  const [inviting, setInviting] = useState(false)

  function patch(id: string, values: { role?: Enums<'user_role'>; active?: boolean }, success: string) {
    update.mutate({ id, ...values }, {
      onSuccess: () => toast.success(success),
      onError: (err) => toast.error(errorMessage(err)),
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Los usuarios entran solo por invitación. Un usuario desactivado no puede usar el CRM, pero sus datos se conservan.
        </p>
        <Button onClick={() => setInviting(true)}>
          <UserPlusIcon />
          Invitar usuario
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead className="w-44">Rol</TableHead>
              <TableHead className="w-24 text-center">Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              Array.from({ length: 3 }, (_, i) => (
                <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8" /></TableCell></TableRow>
              ))}
            {profiles?.map((p) => {
              const isMe = p.id === user?.id
              return (
                <TableRow key={p.id} className={p.active ? undefined : 'opacity-60'}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm"><AvatarFallback>{initials(p.full_name)}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 truncate font-medium">
                          {p.full_name}
                          {isMe && <Badge variant="secondary">Tú</Badge>}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{p.email ?? '—'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      items={roleItems}
                      value={p.role}
                      onValueChange={(v) => v && v !== p.role && patch(p.id, { role: v as Enums<'user_role'> }, `${p.full_name} ahora es ${roleLabels[v as Enums<'user_role'>].toLowerCase()}.`)}
                    >
                      <SelectTrigger className="w-full" aria-label={`Rol de ${p.full_name}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roleItems.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={p.active}
                      aria-label={`${p.full_name} activo`}
                      onCheckedChange={(active) => patch(p.id, { active }, active ? `${p.full_name} reactivado.` : `${p.full_name} desactivado.`)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <InviteDialog open={inviting} onOpenChange={setInviting} />
    </div>
  )
}

const inviteSchema = z.object({
  full_name: z.string().trim().min(1, 'El nombre es obligatorio'),
  email: z.email('Correo no válido').trim(),
  role: z.enum(roles as [Enums<'user_role'>, ...Enums<'user_role'>[]]),
})
type InviteValues = z.infer<typeof inviteSchema>

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const invite = useInviteUser()
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { full_name: '', email: '', role: 'sales' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await invite.mutateAsync(values)
      toast.success(`Invitación enviada a ${values.email}.`)
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
          <DialogDescription>Recibirá un correo con un enlace para crear su contraseña.</DialogDescription>
        </DialogHeader>
        <form id="invite-form" noValidate onSubmit={onSubmit} className="space-y-4">
          <Field label="Nombre completo" htmlFor="inv-name" error={errors.full_name?.message}>
            <Input id="inv-name" autoFocus aria-invalid={!!errors.full_name} {...register('full_name')} />
          </Field>
          <Field label="Correo" htmlFor="inv-email" error={errors.email?.message}>
            <Input id="inv-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
          </Field>
          <Field label="Rol" htmlFor="inv-role">
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select items={roleItems} value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <SelectTrigger id="inv-role" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleItems.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="invite-form" disabled={invite.isPending}>
            {invite.isPending && <Loader2Icon className="animate-spin" />}
            Enviar invitación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
