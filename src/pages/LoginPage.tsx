import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/context'
import { AuthShell } from '@/components/layout/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Mode = 'password' | 'magic' | 'reset'

const copy: Record<Mode, { title: string; description: string; submit: string }> = {
  password: { title: 'Iniciar sesión', description: 'Entra con tu correo y contraseña.', submit: 'Entrar' },
  magic: { title: 'Acceso con enlace', description: 'Te enviaremos un enlace de acceso a tu correo.', submit: 'Enviar enlace' },
  reset: { title: 'Recuperar contraseña', description: 'Te enviaremos un enlace para crear una nueva.', submit: 'Enviar enlace' },
}

function translateAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Correo o contraseña incorrectos.'
  if (/email not confirmed/i.test(message)) return 'Confirma tu correo antes de entrar.'
  if (/signups not allowed|user not found/i.test(message)) return 'No existe un usuario con ese correo. Pide una invitación al administrador.'
  if (/rate limit|too many/i.test(message)) return 'Demasiados intentos. Espera unos minutos.'
  if (/failed to fetch|network/i.test(message)) return 'No se pudo conectar con el servidor.'
  return message
}

export function LoginPage() {
  const { session } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (session) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const origin = window.location.origin
    const { error } =
      mode === 'password'
        ? await supabase.auth.signInWithPassword({ email, password })
        : mode === 'magic'
          ? await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: origin } })
          : await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/cambiar-clave` })
    setBusy(false)

    if (error) {
      toast.error(translateAuthError(error.message))
      return
    }
    if (mode !== 'password') setSentTo(email)
  }

  function switchMode(next: Mode) {
    setMode(next)
    setSentTo(null)
  }

  const t = copy[mode]
  const linkClass = 'underline-offset-4 hover:text-foreground hover:underline'

  return (
    <AuthShell title={t.title} description={t.description}>
      {sentTo ? (
        <div className="space-y-4 text-sm">
          <p>
            Revisa la bandeja de <strong>{sentTo}</strong> y abre el enlace que te enviamos.
          </p>
          <Button variant="outline" className="w-full" onClick={() => switchMode('password')}>
            Volver al inicio de sesión
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {mode === 'password' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <button type="button" className={`text-xs text-muted-foreground ${linkClass}`} onClick={() => switchMode('reset')}>
                  ¿La olvidaste?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2Icon className="animate-spin" />}
            {t.submit}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            {mode === 'password' ? (
              <button type="button" className={linkClass} onClick={() => switchMode('magic')}>
                Prefiero recibir un enlace por correo
              </button>
            ) : (
              <button type="button" className={linkClass} onClick={() => switchMode('password')}>
                Entrar con contraseña
              </button>
            )}
          </div>
        </form>
      )}
    </AuthShell>
  )
}
