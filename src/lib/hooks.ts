import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Filtros de una lista guardados en la URL (?q=…&page=…), para que sobrevivan
 * a recargar, volver atrás o compartir el enlace.
 * Cambiar cualquier filtro distinto de `page` vuelve a la página 1.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams()

  const values = Object.fromEntries(keys.map((k) => [k, params.get(k)])) as Record<K, string | null>
  const page = Math.max(1, Number(params.get('page')) || 1)

  const set = useCallback(
    (patch: Partial<Record<K | 'page', string | number | null>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === '' || v === undefined) next.delete(k)
            else next.set(k, String(v))
          }
          if (!('page' in patch)) next.delete('page')
          if (next.get('page') === '1') next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return { values, page, set }
}
