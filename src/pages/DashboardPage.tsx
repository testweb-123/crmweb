import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { currency } from '@/lib/labels'
import { useAuth } from '@/auth/context'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function usePipelineSummary() {
  return useQuery({
    queryKey: ['pipeline-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_pipeline_summary').select('*')
      if (error) throw error
      return data
    },
  })
}

export function DashboardPage() {
  const { profile } = useAuth()
  const { data, isPending, error } = usePipelineSummary()

  const open = data?.filter((s) => !s.is_won && !s.is_lost) ?? []
  const won = data?.find((s) => s.is_won)
  const kpis = [
    { label: 'Pipeline abierto', value: currency.format(open.reduce((n, s) => n + (s.total_value ?? 0), 0)) },
    { label: 'Pipeline ponderado', value: currency.format(open.reduce((n, s) => n + (s.weighted_value ?? 0), 0)) },
    { label: 'Oportunidades abiertas', value: String(open.reduce((n, s) => n + (s.deals ?? 0), 0)) },
    { label: 'Ganado (total)', value: currency.format(won?.total_value ?? 0) },
  ]

  const firstName = profile?.full_name.split(' ')[0]

  return (
    <>
      <PageHeader title={firstName ? `Hola, ${firstName}` : 'Panel'} description="Resumen de tu actividad comercial." />

      {error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No se pudo cargar el resumen: {error.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader>
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{isPending ? '…' : k.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Embudo por etapa</CardTitle>
          <CardDescription>Cantidad y valor de oportunidades en cada etapa.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(data ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-2">
                <span>{s.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {s.deals} · {currency.format(s.total_value ?? 0)}
                </span>
              </li>
            ))}
            {isPending && <li className="py-2 text-muted-foreground">Cargando…</li>}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
