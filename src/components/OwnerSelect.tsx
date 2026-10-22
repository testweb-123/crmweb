import { useProfiles } from '@/features/profiles/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ALL = '__all__'

/**
 * Selector de responsable. Con `allLabel` añade la opción "todos" (para filtros) y devuelve null al elegirla.
 * Solo lista usuarios activos, salvo el que ya esté seleccionado.
 */
export function OwnerSelect({ value, onChange, allLabel, id, className }: {
  value: string | null
  onChange: (id: string | null) => void
  allLabel?: string
  id?: string
  className?: string
}) {
  const { data: profiles = [] } = useProfiles()
  const options = profiles.filter((p) => p.active || p.id === value)
  const items = [
    ...(allLabel ? [{ value: ALL, label: allLabel }] : []),
    ...options.map((p) => ({ value: p.id, label: p.full_name })),
  ]

  return (
    <Select
      items={items}
      value={value ?? (allLabel ? ALL : null)}
      onValueChange={(v) => onChange(!v || v === ALL ? null : (v as string))}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder="Responsable" />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
