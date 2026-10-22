# CRM

CRM web multiusuario: React + Vite en Cloudflare Pages, Supabase como backend. El plan completo está en [CRM-PLAN.md](CRM-PLAN.md).

**Estado:** fase 1.
- **Fase 0:** login, sesión, roles, layout y panel.
- **Fase 1:** contactos y empresas (lista con búsqueda y filtros, ficha, alta y edición), etiquetas y Ajustes (usuarios, roles, invitaciones, etiquetas).

Pipeline, tareas y reportes son páginas reservadas para las fases siguientes.

## Estructura

```
src/
  auth/              sesión (AuthProvider), useAuth, guardas de ruta
  features/          datos (hooks de TanStack Query) y formularios por módulo:
                     contacts, companies, tags, profiles
  components/        piezas compartidas (tablas, filtros, selectores, confirmaciones)
  components/layout/ AppLayout (sidebar + drawer móvil), UserMenu, AuthShell
  components/ui/     shadcn/ui (estilo base-nova, sobre Base UI)
  lib/               cliente Supabase, tipos de la base, tema, búsqueda, formatos
  pages/             una por ruta
supabase/
  migrations/        esquema, RLS, vistas, bucket de adjuntos, email en perfiles
  functions/         invite-user (invitar usuarios con service_role)
  seed.sql           etiquetas de ejemplo (solo local)
public/_redirects    rutas de la SPA en Cloudflare Pages
```

Los filtros de las listas viven en la URL (`/contactos?status=lead&tag=3`): se pueden recargar, compartir y volver atrás.

## Puesta en marcha

### 1. Proyecto de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com), región **South America (São Paulo)**.
2. Vincula y sube las migraciones (pide el token de acceso y la contraseña de la base):

   ```bash
   npx supabase login
   npm run db:link -- --project-ref <project-ref>
   npm run db:push
   npm run db:types
   npx supabase functions deploy invite-user
   ```

3. **Authentication → Sign In / Providers → Email**: desactiva *Allow new users to sign up*. Es un CRM interno: los usuarios entran solo por invitación.
4. **Authentication → URL Configuration**:
   - *Site URL*: la URL de producción (por ejemplo `https://crm.midominio.com`).
   - *Redirect URLs*: esa misma URL con `/**`, más `http://localhost:5173/**`.

### 2. Primer administrador

1. **Authentication → Users → Invite user** con tu correo.
2. Abre el enlace del correo: la app te lleva a crear tu contraseña.
3. En **SQL Editor**:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'tu@correo.pe');
   ```

A partir de ahí, los demás usuarios se invitan desde **Ajustes → Usuarios → Invitar usuario**, eligiendo su rol. Ahí mismo se cambia el rol o se desactiva a alguien. La base impide quedarse sin ningún administrador activo.

### 3. Desarrollo local

```bash
cp .env.example .env.local   # pega la URL y la clave anon (Project Settings → API)
npm install
npm run dev
```

Sin `.env.local` la app muestra un aviso de configuración en lugar del login.

### 4. Despliegue en Cloudflare Pages

1. Sube el repo a GitHub (privado).
2. Cloudflare → Workers & Pages → Create → Pages → conecta el repo.
3. Framework preset *None* · build `npm run build` · salida `dist`.
4. Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (y opcional `VITE_APP_NAME`).
5. Añade la URL de Pages en las *Redirect URLs* de Supabase.

## Permisos

| Rol | Ve | Edita | Borra | Configura |
|---|---|---|---|---|
| `sales` | lo suyo | lo suyo | — | — |
| `manager` | todo | todo y reasigna | — | etiquetas |
| `admin` | todo | todo | sí | etapas, roles, usuarios |

Lo hace cumplir la base (RLS), no la interfaz. Nadie puede cambiarse el propio rol, y la clave `anon` sin sesión no lee ninguna tabla.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en :5173 |
| `npm run build` | Typecheck + build de producción en `dist/` |
| `npm run lint` | oxlint |
| `npm run db:link` | Vincula la carpeta `supabase/` a un proyecto remoto |
| `npm run db:push` | Aplica las migraciones pendientes al proyecto vinculado |
| `npm run db:types` | Regenera `src/lib/database.types.ts` desde el proyecto vinculado |
