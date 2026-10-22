type MaybePgError = { code?: string; message?: string; details?: string | null }

/** Traduce errores de PostgREST/Postgres a un mensaje para el usuario. */
export function errorMessage(err: unknown): string {
  const e = (err ?? {}) as MaybePgError
  switch (e.code) {
    case '23505':
      if (e.message?.includes('ruc')) return 'Ya existe una empresa con ese RUC.'
      if (e.message?.includes('tags_name')) return 'Ya existe una etiqueta con ese nombre.'
      return 'Ese registro ya existe.'
    case '23503':
      return 'El registro está en uso por otros datos y no se puede quitar.'
    case '42501':
      return e.message?.startsWith('Solo') ? e.message : 'No tienes permiso para hacer esto.'
    case '23514':
      return e.message ?? 'Los datos no son válidos.'
    case 'PGRST116':
      return 'No se encontró el registro o no tienes acceso.'
  }
  if (/failed to fetch|network/i.test(e.message ?? '')) return 'No se pudo conectar con el servidor.'
  return e.message || 'Ocurrió un error inesperado.'
}
