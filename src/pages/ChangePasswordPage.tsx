import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/context'
import { AuthShell } from '@/components/layout/AuthShell'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MIN_LENGTH = 8

/** Destino de los enlaces de invitación y de recuperación: fija una contraseña nueva. */
export function ChangePasswordPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <FullScreenLoader />

  if (!session) {
    return (
      <AuthShell title="Enlace no válido" description="El enlace caducó o ya se usó.">
        <Button variant="outline" className="w-full" nativeButton={false} render={<Link to="/login" />}>
          Pedir uno nuevo
        </Button>
      </AuthShell>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_LENGTH) return void toast.error(`Usa al menos ${MIN_LENGTH} caracteres.`)
    if (password !== confirm) return void toast.error('Las contraseñas no coinciden.')

    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return void toast.error(error.message)

    toast.success('Contraseña guardada.')
    navigate('/', { replace: true })
  }

  return (
    <AuthShell title="Nueva contraseña" description={`Para ${session.user.email}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña nueva</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_LENGTH}
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Repítela</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2Icon className="animate-spin" />}
          Guardar contraseña
        </Button>
      </form>
    </AuthShell>
  )
}
