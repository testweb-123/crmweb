import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-5xl font-semibold text-muted-foreground">404</p>
      <p className="text-sm text-muted-foreground">Esta página no existe.</p>
      <Button variant="outline" nativeButton={false} render={<Link to="/" />}>
        Ir al panel
      </Button>
    </div>
  )
}
