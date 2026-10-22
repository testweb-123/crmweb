export function fullName(p: { first_name: string; last_name: string | null }) {
  return [p.first_name, p.last_name].filter(Boolean).join(' ')
}

export function initials(name: string) {
  return name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

/** Enlace wa.me; a los móviles peruanos de 9 dígitos les antepone el 51. */
export function whatsappUrl(phone: string) {
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 9 && digits.startsWith('9')) digits = `51${digits}`
  return digits.length >= 8 ? `https://wa.me/${digits}` : null
}

/** "" → null, para que los campos opcionales vacíos se guarden como NULL. */
export function emptyToNull<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]),
  ) as T
}
