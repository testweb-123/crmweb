import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useTheme, type Theme } from '@/lib/theme-context'
import { useAuth } from '@/auth/context'
import { initials } from '@/lib/format'
import { roleLabels } from '@/lib/labels'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const { profile, user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const name = profile?.full_name ?? user?.email ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Menú de usuario" />}
      >
        <Avatar size="sm">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-40 truncate text-sm sm:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm text-foreground">{name}</span>
            <span className="truncate font-normal">
              {user?.email}
              {profile && ` · ${roleLabels[profile.role]}`}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tema</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
            <DropdownMenuRadioItem value="light"><SunIcon />Claro</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><MoonIcon />Oscuro</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system"><MonitorIcon />Sistema</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOutIcon />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
