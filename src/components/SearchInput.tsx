import { useEffect, useRef, useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

const DELAY = 300

/** Campo de búsqueda con debounce: escribe libremente y avisa 300 ms después de la última tecla. */
export function SearchInput({ value, onChange, placeholder, className }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [text, setText] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Si el filtro cambia desde fuera (p. ej. "quitar filtros"), refleja el valor nuevo
  if (value !== lastValue) {
    setLastValue(value)
    setText(value)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  function handleChange(next: string) {
    setText(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(next.trim()), DELAY)
  }

  return (
    <div className={cn('relative', className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" value={text} onChange={(e) => handleChange(e.target.value)} placeholder={placeholder} className="pl-8" />
    </div>
  )
}
