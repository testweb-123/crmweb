export const PAGE_SIZE = 25

/**
 * Convierte un texto libre en un filtro `or` de PostgREST. Cada palabra debe aparecer en alguna
 * de las columnas: "ana torres" encuentra a quien tenga "ana" y "torres" en cualquiera de ellas.
 * Devuelve null si no hay nada que buscar.
 */
export function searchFilter(text: string, columns: string[]): string | null {
  const terms = text
    .replace(/["\\%*(),]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
  if (!terms.length) return null
  const anyColumn = (term: string) => columns.map((c) => `${c}.ilike."%${term}%"`).join(',')
  return terms.length === 1 ? anyColumn(terms[0]!) : `and(${terms.map((t) => `or(${anyColumn(t)})`).join(',')})`
}

export function pageRange(page: number) {
  const from = (page - 1) * PAGE_SIZE
  return [from, from + PAGE_SIZE - 1] as const
}
