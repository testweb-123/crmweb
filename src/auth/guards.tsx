import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './context'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { Button } from '@/components/ui/button'

/** Rutas que exigen sesión iniciada y perfil activo. */
export function RequireAuth() {
  const { session, profile, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (profile && !profile.active) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          Tu usuario está desactivado. Pide a un administrador que lo vuelva a activar.
        </p>
        <Button variant="outline" onClick={signOut}>Cerrar sesión</Button>
      </div>
    )
  }
  return <Outlet />
}

/** Rutas solo para administradores (dentro de RequireAuth). */
export function RequireAdmin() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />
}
