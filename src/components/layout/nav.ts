import {
  BarChart3Icon,
  Building2Icon,
  CheckSquareIcon,
  KanbanIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  adminOnly?: boolean
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Panel', icon: LayoutDashboardIcon },
  { to: '/contactos', label: 'Contactos', icon: UsersIcon },
  { to: '/empresas', label: 'Empresas', icon: Building2Icon },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanIcon },
  { to: '/tareas', label: 'Tareas', icon: CheckSquareIcon },
  { to: '/reportes', label: 'Reportes', icon: BarChart3Icon },
  { to: '/ajustes', label: 'Ajustes', icon: SettingsIcon, adminOnly: true },
]
