import { HandshakeIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const APP_NAME = (import.meta.env.VITE_APP_NAME as string | undefined) || 'CRM'

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 font-semibold', className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HandshakeIcon className="size-4" />
      </span>
      <span className="truncate">{APP_NAME}</span>
    </div>
  )
}
