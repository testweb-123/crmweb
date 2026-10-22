import type { Enums } from './database.types'

export const roleLabels: Record<Enums<'user_role'>, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  sales: 'Ventas',
}

export const contactStatusLabels: Record<Enums<'contact_status'>, string> = {
  lead: 'Lead',
  prospect: 'Prospecto',
  customer: 'Cliente',
  inactive: 'Inactivo',
}

/** Clases del badge por estado (se combinan con variant="outline"). */
export const contactStatusClasses: Record<Enums<'contact_status'>, string> = {
  lead: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  prospect: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  customer: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  inactive: 'border-border bg-muted text-muted-foreground',
}

export const contactSources = ['Web', 'Referido', 'Feria', 'Redes sociales', 'Llamada en frío', 'Correo', 'Otro']

export const currency = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })

const dateFormat = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
export const formatDate = (iso: string | null | undefined) => (iso ? dateFormat.format(new Date(iso)) : '—')
