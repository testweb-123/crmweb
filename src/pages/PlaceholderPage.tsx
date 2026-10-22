import { ConstructionIcon } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

/** Sección reservada para una fase posterior de la hoja de ruta (CRM-PLAN.md §10). */
export function PlaceholderPage({ title, description, phase }: { title: string; description: string; phase: number }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <ConstructionIcon className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">En construcción</p>
        <p className="text-sm text-muted-foreground">Llega en la fase {phase} de la hoja de ruta.</p>
      </div>
    </>
  )
}
