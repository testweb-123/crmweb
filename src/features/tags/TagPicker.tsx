import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TagIcon } from 'lucide-react'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTags } from './api'

/** Popover con casillas para marcar/desmarcar etiquetas. Cada clic avisa con la lista completa. */
export function TagPicker({ selected, onChange, disabled }: {
  selected: number[]
  onChange: (next: number[]) => void
  disabled?: boolean
}) {
  const { isAdmin } = useAuth()
  const { data: tags = [] } = useTags()
  const [open, setOpen] = useState(false)

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <TagIcon />
        Etiquetas
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar etiqueta…" />
          <CommandList>
            <CommandEmpty>
              {tags.length === 0 ? 'No hay etiquetas creadas.' : 'Sin resultados.'}
            </CommandEmpty>
            <CommandGroup>
              {tags.map((t) => (
                <CommandItem key={t.id} value={t.name} disabled={disabled} data-checked={selected.includes(t.id)} onSelect={() => toggle(t.id)}>
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {isAdmin && (
            <div className="border-t p-1">
              <Button variant="ghost" size="sm" className="w-full justify-start" nativeButton={false} render={<Link to="/ajustes?tab=etiquetas" />}>
                Gestionar etiquetas
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
