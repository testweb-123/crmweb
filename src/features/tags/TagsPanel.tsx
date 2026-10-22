import { useState, type FormEvent } from 'react'
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { TagBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TAG_COLORS, useDeleteTag, useSaveTag, useTags, type Tag } from './api'

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Color">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn('size-6 rounded-full ring-offset-2 ring-offset-background transition', value === c && 'ring-2 ring-foreground')}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}

/** Formulario en línea para crear o renombrar una etiqueta. */
function TagEditor({ tag, onDone }: { tag?: Tag; onDone: () => void }) {
  const save = useSaveTag()
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState(tag?.color ?? TAG_COLORS[0]!)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await save.mutateAsync({ id: tag?.id, name: name.trim(), color })
      toast.success(tag ? 'Etiqueta actualizada.' : 'Etiqueta creada.')
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de la etiqueta"
        aria-label="Nombre de la etiqueta"
        autoFocus
        maxLength={40}
        className="sm:w-56"
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-1 sm:ml-auto">
        <Button type="submit" size="sm" disabled={!name.trim() || save.isPending}>
          <CheckIcon />
          Guardar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} aria-label="Cancelar">
          <XIcon />
        </Button>
      </div>
    </form>
  )
}

export function TagsPanel() {
  const { data: tags, isPending } = useTags()
  const remove = useDeleteTag()
  const [editing, setEditing] = useState<number | 'new' | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Agrupa contactos para filtrarlos rápido: VIP, distribuidor, licitación…</p>
        <Button onClick={() => setEditing('new')} disabled={editing === 'new'}>
          <PlusIcon />
          Nueva etiqueta
        </Button>
      </div>

      {editing === 'new' && <TagEditor onDone={() => setEditing(null)} />}

      <div className="divide-y rounded-xl border">
        {isPending && <div className="p-3"><Skeleton className="h-6" /></div>}
        {tags?.length === 0 && editing !== 'new' && (
          <p className="p-4 text-center text-sm text-muted-foreground">Aún no hay etiquetas.</p>
        )}
        {tags?.map((t) =>
          editing === t.id ? (
            <div key={t.id} className="p-2"><TagEditor tag={t} onDone={() => setEditing(null)} /></div>
          ) : (
            <div key={t.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <TagBadge name={t.name} color={t.color} />
              <div className="flex gap-1">
                <Button size="icon-sm" variant="ghost" onClick={() => setEditing(t.id)} aria-label={`Editar ${t.name}`}>
                  <PencilIcon />
                </Button>
                <ConfirmDelete
                  trigger={<Button size="icon-sm" variant="ghost" aria-label={`Eliminar ${t.name}`}><Trash2Icon /></Button>}
                  title={`¿Eliminar la etiqueta «${t.name}»?`}
                  description="Se quitará de todos los contactos que la tengan."
                  onConfirm={async () => {
                    try {
                      await remove.mutateAsync(t.id)
                      toast.success('Etiqueta eliminada.')
                    } catch (err) {
                      toast.error(errorMessage(err))
                    }
                  }}
                />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
