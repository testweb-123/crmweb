import { useState } from 'react'
import { Building2Icon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import { useCompanyOptions } from '@/features/companies/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type CompanyRef = { id: string; name: string }

/** Selector de empresa con búsqueda en el servidor. */
export function CompanyCombobox({ value, onChange, id }: {
  value: CompanyRef | null
  onChange: (company: CompanyRef | null) => void
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data: options = [], isFetching } = useCompanyOptions(search)

  return (
    <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button id={id} variant="outline" className="min-w-0 flex-1 justify-between font-normal" />
          }
        >
          <span className={cn('flex min-w-0 items-center gap-2', !value && 'text-muted-foreground')}>
            <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value?.name ?? 'Sin empresa'}</span>
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-(--anchor-width) min-w-64 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar por nombre o RUC…" value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>{isFetching ? 'Buscando…' : 'Sin resultados.'}</CommandEmpty>
              <CommandGroup>
                {options.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    data-checked={c.id === value?.id}
                    onSelect={() => {
                      onChange({ id: c.id, name: c.name })
                      setOpen(false)
                    }}
                  >
                    <span className="truncate">{c.name}</span>
                    {c.ruc && <span className="text-xs text-muted-foreground">{c.ruc}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Quitar empresa">
          <XIcon />
        </Button>
      )}
    </div>
  )
}
