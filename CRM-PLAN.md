# CRM · Plan técnico

CRM web multiusuario, online y con costo cero mientras se mantenga dentro de los planes gratuitos.

- **Frontend:** React + Vite + TypeScript en Cloudflare Pages
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime)

---

## 1. Stack elegido

| Capa | Tecnología | Para qué |
|---|---|---|
| Lenguaje | TypeScript | Un solo lenguaje en frontend y funciones |
| Framework UI | React 18 + Vite | SPA rápida, build estático |
| Componentes | shadcn/ui + Tailwind CSS + lucide-react | Tablas, formularios, diálogos, menús ya resueltos |
| Rutas | React Router | `/contactos`, `/empresas/:id`, `/pipeline`, etc. |
| Estado de servidor | TanStack Query | Caché, reintentos, invalidación tras guardar |
| Tablas | TanStack Table | Orden, filtros, paginación, columnas visibles |
| Formularios | React Hook Form + Zod | Validación tipada en cliente |
| Kanban | dnd-kit | Arrastrar oportunidades entre etapas |
| Gráficos | Recharts | Panel de métricas |
| Base de datos | Supabase · PostgreSQL | Relacional, SQL completo, RLS |
| Autenticación | Supabase Auth | Correo/contraseña, enlace mágico, Google |
| Permisos | Row Level Security (RLS) | Cada vendedor ve lo suyo; gerente y admin ven todo |
| Archivos | Supabase Storage | Adjuntos de contactos y oportunidades |
| Lógica de servidor | Supabase Edge Functions (Deno) | Formulario de leads, webhooks, correos |
| Tareas programadas | pg_cron (incluido en Supabase) | Recordatorios diarios, limpieza |
| Tiempo real | Supabase Realtime | Kanban y actividades sincronizados entre usuarios |
| Correo transaccional | Resend | Recordatorios y avisos |
| Hosting | Cloudflare Pages | SSL, dominio propio, despliegue desde GitHub |
| Código y CI | GitHub + GitHub Actions | Repositorio, copias de seguridad nocturnas |

### Por qué este y no otro

- **Supabase y no Cloudflare D1:** un CRM necesita login, roles, relaciones y tiempo real. Supabase los trae resueltos; con D1 + Workers habría que programar autenticación y permisos a mano.
- **SPA estática y no Next.js con servidor:** Cloudflare Pages sirve archivos estáticos gratis y sin límite de ancho de banda. Toda la seguridad vive en la base (RLS), no en un servidor intermedio.
- **Postgres y no NoSQL:** los datos de un CRM son relacionales (empresa → contactos → oportunidades → actividades). Los reportes son consultas SQL directas.

---

## 2. Planes gratuitos y sus límites

> Cifras de referencia; **verificar en la web de cada servicio antes de empezar**, cambian con frecuencia.

| Servicio | Límite gratuito aproximado | Riesgo |
|---|---|---|
| Supabase | 500 MB de base, 1 GB de archivos, 50 000 usuarios activos/mes, 2 proyectos | **Pausa el proyecto tras 7 días sin actividad.** Sin copias descargables. |
| Cloudflare Pages | Ancho de banda ilimitado, 500 builds/mes | Ninguno relevante |
| Resend | ~3 000 correos/mes, 100/día | Suficiente para recordatorios internos |
| GitHub Actions | 2 000 min/mes en repos privados | Un `pg_dump` diario consume ~1 min |

**Mitigaciones:**

1. **Pausa por inactividad:** un workflow diario de GitHub Actions hace una consulta a la API (ver §9). Con uso diario del CRM no hace falta, pero cubre vacaciones.
2. **Copias de seguridad:** `pg_dump` nocturno guardado como artefacto o en un repo privado (ver §9).
3. **Crecimiento:** si se superan los 500 MB, el plan Pro de Supabase (~25 USD/mes) no requiere migración.

---

## 3. Arquitectura

```
 Navegador (React SPA)
        │  HTTPS
        ▼
 Cloudflare Pages ── sirve index.html + JS/CSS estáticos
        │
        │  supabase-js (clave anon + JWT del usuario)
        ▼
 ┌──────────────────── Supabase ────────────────────┐
 │  Auth ──► JWT con user id                        │
 │  PostgREST ──► PostgreSQL (RLS filtra por fila)  │
 │  Realtime ──► cambios en deals / activities      │
 │  Storage ──► bucket "adjuntos" (privado)         │
 │  Edge Functions ──► lead-form, send-reminders    │
 │  pg_cron ──► dispara send-reminders cada mañana  │
 └──────────────────────────────────────────────────┘
        │
        ▼
     Resend (correo)

 Sitios web de clientes (WordPress, estáticos)
        │  POST formulario
        ▼
 Edge Function "lead-form" ──► inserta contacto con status = 'lead'
```

La clave `anon` es pública y va en el frontend; **la seguridad depende 100 % de que todas las tablas tengan RLS activado.** La `service_role` solo vive en las Edge Functions y en los secretos de GitHub, nunca en el frontend.

---

## 4. Modelo de datos

```
profiles ─┐ (owner_id en todas las tablas de negocio)
          │
companies ──< contacts
    │            │
    └──< deals >─┘ ──> pipeline_stages
           │
activities (puede colgar de company, contact o deal)
attachments (puede colgar de company, contact o deal)
tags ──< contact_tags >── contacts
```

### 4.1 Esquema SQL

Archivo: `supabase/migrations/0001_schema.sql`

```sql
-- Tipos ---------------------------------------------------------------
create type user_role       as enum ('admin', 'manager', 'sales');
create type contact_status  as enum ('lead', 'prospect', 'customer', 'inactive');
create type activity_type   as enum ('call', 'meeting', 'email', 'task', 'note', 'whatsapp');

-- Perfiles (1 a 1 con auth.users) --------------------------------------
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  role        user_role not null default 'sales',
  avatar_url  text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Empresas ------------------------------------------------------------
create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  ruc         text unique,
  industry    text,
  website     text,
  phone       text,
  address     text,
  city        text,
  owner_id    uuid not null references profiles default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Contactos -----------------------------------------------------------
create table contacts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies on delete set null,
  first_name  text not null,
  last_name   text,
  email       text,
  phone       text,
  position    text,
  status      contact_status not null default 'lead',
  source      text,              -- 'web', 'referido', 'feria', 'facebook'…
  notes       text,
  owner_id    uuid not null references profiles default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on contacts (company_id);
create index on contacts (owner_id);
create index on contacts (lower(email));

-- Etapas del pipeline (configurables por el admin) --------------------
create table pipeline_stages (
  id           serial primary key,
  name         text not null,
  position     int  not null,
  probability  int  not null default 0 check (probability between 0 and 100),
  is_won       boolean not null default false,
  is_lost      boolean not null default false
);

insert into pipeline_stages (name, position, probability, is_won, is_lost) values
  ('Nuevo',        1,  10, false, false),
  ('Contactado',   2,  25, false, false),
  ('Propuesta',    3,  50, false, false),
  ('Negociación',  4,  75, false, false),
  ('Ganado',       5, 100, true,  false),
  ('Perdido',      6,   0, false, true);

-- Oportunidades -------------------------------------------------------
create table deals (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  company_id      uuid references companies on delete set null,
  contact_id      uuid references contacts  on delete set null,
  stage_id        int  not null references pipeline_stages default 1,
  value           numeric(12,2) not null default 0,
  currency        char(3) not null default 'PEN',
  expected_close  date,
  closed_at       timestamptz,
  lost_reason     text,
  position        int not null default 0,   -- orden dentro de la columna del kanban
  owner_id        uuid not null references profiles default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on deals (stage_id);
create index on deals (owner_id);

-- Actividades (llamadas, reuniones, tareas, notas) --------------------
create table activities (
  id          uuid primary key default gen_random_uuid(),
  type        activity_type not null,
  subject     text not null,
  body        text,
  due_at      timestamptz,
  done_at     timestamptz,
  company_id  uuid references companies on delete cascade,
  contact_id  uuid references contacts  on delete cascade,
  deal_id     uuid references deals     on delete cascade,
  owner_id    uuid not null references profiles default auth.uid(),
  created_at  timestamptz not null default now()
);
create index on activities (owner_id, due_at) where done_at is null;

-- Adjuntos (metadatos; el archivo vive en Storage) --------------------
create table attachments (
  id          uuid primary key default gen_random_uuid(),
  path        text not null,             -- ruta dentro del bucket "adjuntos"
  file_name   text not null,
  size_bytes  bigint,
  company_id  uuid references companies on delete cascade,
  contact_id  uuid references contacts  on delete cascade,
  deal_id     uuid references deals     on delete cascade,
  owner_id    uuid not null references profiles default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Etiquetas -----------------------------------------------------------
create table tags (
  id     serial primary key,
  name   text not null unique,
  color  text not null default '#64748b'
);
create table contact_tags (
  contact_id  uuid references contacts on delete cascade,
  tag_id      int  references tags     on delete cascade,
  primary key (contact_id, tag_id)
);

-- updated_at automático ----------------------------------------------
create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger t_companies before update on companies for each row execute function touch_updated_at();
create trigger t_contacts  before update on contacts  for each row execute function touch_updated_at();
create trigger t_deals     before update on deals     for each row execute function touch_updated_at();

-- closed_at automático al pasar a Ganado/Perdido ----------------------
create function set_deal_closed_at() returns trigger language plpgsql as $$
begin
  if new.stage_id is distinct from old.stage_id then
    new.closed_at := case
      when exists (select 1 from pipeline_stages s
                   where s.id = new.stage_id and (s.is_won or s.is_lost))
      then now() else null end;
  end if;
  return new;
end $$;
create trigger t_deal_closed before update on deals for each row execute function set_deal_closed_at();

-- Perfil automático al registrarse ------------------------------------
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
```

### 4.2 Seguridad por fila (RLS)

Archivo: `supabase/migrations/0002_rls.sql`

Regla general: **`sales` ve y edita solo lo suyo; `manager` y `admin` ven y editan todo; solo `admin` borra y configura.**

```sql
-- Helpers (security definer para no recursar sobre profiles) ----------
create function current_role_is(r user_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = r and active)
$$;

create function is_manager_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles
                 where id = auth.uid() and role in ('admin','manager') and active)
$$;

-- Activar RLS en todo -------------------------------------------------
alter table profiles        enable row level security;
alter table companies       enable row level security;
alter table contacts        enable row level security;
alter table pipeline_stages enable row level security;
alter table deals           enable row level security;
alter table activities      enable row level security;
alter table attachments     enable row level security;
alter table tags            enable row level security;
alter table contact_tags    enable row level security;

-- Perfiles: todos ven a todos (para asignar responsables); cada uno edita el suyo, admin edita todos
create policy profiles_read   on profiles for select to authenticated using (true);
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or current_role_is('admin'));

-- Tablas de negocio con owner_id: mismo patrón -----------------------
do $$
declare t text;
begin
  foreach t in array array['companies','contacts','deals','activities','attachments'] loop
    execute format($f$
      create policy %1$s_select on %1$s for select to authenticated
        using (owner_id = auth.uid() or is_manager_or_admin());
      create policy %1$s_insert on %1$s for insert to authenticated
        with check (owner_id = auth.uid() or is_manager_or_admin());
      create policy %1$s_update on %1$s for update to authenticated
        using (owner_id = auth.uid() or is_manager_or_admin());
      create policy %1$s_delete on %1$s for delete to authenticated
        using (current_role_is('admin'));
    $f$, t);
  end loop;
end $$;

-- Catálogos: todos leen, solo admin escribe --------------------------
create policy stages_read  on pipeline_stages for select to authenticated using (true);
create policy stages_write on pipeline_stages for all    to authenticated
  using (current_role_is('admin')) with check (current_role_is('admin'));

create policy tags_read  on tags for select to authenticated using (true);
create policy tags_write on tags for all    to authenticated
  using (is_manager_or_admin()) with check (is_manager_or_admin());

-- contact_tags hereda el permiso del contacto ------------------------
create policy contact_tags_all on contact_tags for all to authenticated
  using (exists (select 1 from contacts c where c.id = contact_id
                 and (c.owner_id = auth.uid() or is_manager_or_admin())))
  with check (exists (select 1 from contacts c where c.id = contact_id
                 and (c.owner_id = auth.uid() or is_manager_or_admin())));
```

> Si se prefiere que **todo el equipo vea todos los contactos** (modelo colaborativo), basta con cambiar las políticas `_select` a `using (true)` y dejar el filtro por dueño solo en `update`.

### 4.3 Storage

- Bucket `adjuntos`, **privado**.
- Ruta: `{owner_id}/{entidad}/{id}/{nombre-archivo}`.
- Política: el usuario lee y sube dentro de su carpeta `{auth.uid()}/…`; manager/admin leen todo.
- Descarga mediante `createSignedUrl` (enlace que caduca en 60 s).

### 4.4 Vistas para reportes

```sql
-- Embudo: valor y cantidad por etapa
create view v_pipeline_summary with (security_invoker = on) as
select s.id, s.name, s.position, s.probability,
       count(d.id)                       as deals,
       coalesce(sum(d.value), 0)         as total_value,
       coalesce(sum(d.value * s.probability / 100.0), 0) as weighted_value
from pipeline_stages s
left join deals d on d.stage_id = s.id
group by s.id
order by s.position;

-- Ventas ganadas por mes y vendedor
create view v_won_by_month with (security_invoker = on) as
select date_trunc('month', d.closed_at)::date as month,
       p.full_name as seller,
       count(*)    as deals,
       sum(d.value) as total
from deals d
join pipeline_stages s on s.id = d.stage_id and s.is_won
join profiles p on p.id = d.owner_id
group by 1, 2;
```

`security_invoker = on` hace que las vistas respeten el RLS del usuario que consulta.

---

## 5. Módulos y pantallas

| Ruta | Pantalla | Contenido |
|---|---|---|
| `/login` | Acceso | Correo + contraseña, enlace mágico, "olvidé mi contraseña" |
| `/` | Panel | KPIs (pipeline abierto, ganado del mes, tasa de cierre), tareas de hoy, gráfico de ventas por mes |
| `/contactos` | Lista | Tabla con búsqueda, filtros (estado, origen, etiqueta, responsable), acciones masivas, exportar CSV |
| `/contactos/:id` | Ficha 360° | Datos, empresa, oportunidades, línea de tiempo de actividades, adjuntos, botones de llamar / WhatsApp / correo |
| `/empresas` · `/empresas/:id` | Empresas | Igual que contactos, con sus contactos y oportunidades anidados |
| `/pipeline` | Kanban | Columnas por etapa, arrastrar tarjetas, total por columna, filtro por responsable |
| `/oportunidades/:id` | Oportunidad | Valor, etapa, fecha de cierre, contacto, actividades, motivo de pérdida |
| `/tareas` | Agenda | Pendientes de hoy / vencidas / próximas; marcar como hechas |
| `/reportes` | Reportes | Embudo, ganadas por vendedor, origen de leads, tiempo medio de cierre |
| `/ajustes` | Configuración (admin) | Usuarios y roles, etapas del pipeline, etiquetas, importar CSV |

**Atajos de productividad:** búsqueda global con `Ctrl+K`, creación rápida de contacto/tarea desde cualquier pantalla, enlace `https://wa.me/51…` en cada teléfono.

---

## 6. Edge Functions

| Función | Disparador | Qué hace |
|---|---|---|
| `lead-form` | `POST` desde formularios web de clientes | Valida (Zod + honeypot + límite por IP), inserta contacto `status='lead'`, `source='web'`, asigna al responsable por defecto y avisa por correo |
| `send-reminders` | pg_cron cada día 08:00 (hora de Lima) | Busca actividades pendientes del día por usuario y envía un resumen vía Resend |
| `import-csv` | Botón en `/ajustes` | Recibe CSV, normaliza, deduplica por email/RUC e inserta en lote |

Ejemplo de programación con pg_cron (13:00 UTC = 08:00 Lima):

```sql
select cron.schedule('daily-reminders', '0 13 * * *', $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'))
  );
$$);
```

El secreto se guarda una vez con `select vault.create_secret('<valor>', 'cron_secret');` (extensiones `pg_cron` y `pg_net` activadas en Database → Extensions).

### Formulario de leads en sitios WordPress

```html
<form id="crm-lead">
  <input name="name" required placeholder="Nombre">
  <input name="email" type="email" required placeholder="Correo">
  <input name="phone" placeholder="Teléfono">
  <textarea name="message" placeholder="Mensaje"></textarea>
  <input name="website" style="display:none" tabindex="-1" autocomplete="off"><!-- honeypot -->
  <button>Enviar</button>
</form>
<script>
document.getElementById('crm-lead').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const r = await fetch('https://<project-ref>.supabase.co/functions/v1/lead-form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, origin: location.hostname })
  });
  e.target.innerHTML = r.ok ? '<p>¡Gracias! Te contactaremos pronto.</p>' : '<p>Error, intenta de nuevo.</p>';
});
</script>
```

---

## 7. Estructura del proyecto

```
crm/
├── CRM-PLAN.md                  ← este documento
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── .env.local                   ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (no se sube)
├── .env.example
├── public/
│   └── _redirects               ← "/*  /index.html  200" (rutas de la SPA en Pages)
├── src/
│   ├── main.tsx
│   ├── App.tsx                  ← rutas + guardas de sesión
│   ├── lib/
│   │   ├── supabase.ts          ← createClient tipado con Database
│   │   ├── database.types.ts    ← generado por `supabase gen types`
│   │   └── utils.ts
│   ├── hooks/                   ← useContacts, useDeals, useActivities… (TanStack Query)
│   ├── components/
│   │   ├── ui/                  ← shadcn/ui
│   │   ├── layout/              ← Sidebar, Topbar, CommandMenu (Ctrl+K)
│   │   ├── contacts/
│   │   ├── companies/
│   │   ├── deals/               ← KanbanBoard, DealCard
│   │   └── activities/          ← Timeline, ActivityForm
│   └── pages/                   ← una por ruta de §5
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_schema.sql
│   │   ├── 0002_rls.sql
│   │   └── 0003_views_storage_cron.sql
│   ├── seed.sql                 ← datos de prueba para desarrollo local
│   └── functions/
│       ├── lead-form/index.ts
│       ├── send-reminders/index.ts
│       └── import-csv/index.ts
└── .github/workflows/
    ├── backup.yml
    └── keepalive.yml
```

---

## 8. Puesta en marcha

### 8.1 Requisitos locales

- Node.js 20+
- Supabase CLI (`npm i -g supabase` o `scoop install supabase`)
- Docker Desktop (solo si se quiere Supabase local para desarrollo)
- Cuenta en GitHub, Supabase, Cloudflare y Resend

### 8.2 Crear el frontend

```bash
npm create vite@latest crm -- --template react-ts
cd crm
npm i @supabase/supabase-js @tanstack/react-query @tanstack/react-table react-router-dom react-hook-form zod @hookform/resolvers @dnd-kit/core @dnd-kit/sortable recharts lucide-react date-fns
npx shadcn@latest init
npx shadcn@latest add button input table dialog dropdown-menu form select badge card tabs toast command sheet
```

### 8.3 Crear y vincular Supabase

1. Crear proyecto en supabase.com (región **São Paulo** `sa-east-1`, la más cercana a Perú).
2. Vincular y aplicar migraciones:

```bash
supabase login
supabase init
supabase link --project-ref <project-ref>
supabase db push
supabase gen types typescript --linked > src/lib/database.types.ts
```

3. En **Authentication → URL Configuration** poner la URL de Cloudflare Pages y `http://localhost:5173`.
4. Desactivar el registro público (**Authentication → Providers → Email → "Allow new users to sign up" = off**) e invitar usuarios desde el panel: es un CRM interno.
5. Crear el primer usuario y promoverlo a admin:

```sql
update profiles set role = 'admin' where id = '<uuid-del-usuario>';
```

### 8.4 Desplegar en Cloudflare Pages

1. Subir el repo a GitHub (privado).
2. Cloudflare → Workers & Pages → Create → Pages → conectar repo.
3. Build command `npm run build`, output `dist`.
4. Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
5. Dominio propio opcional: `crm.midominio.com`.

### 8.5 Edge Functions y secretos

```bash
supabase secrets set RESEND_API_KEY=... CRM_DEFAULT_OWNER=<uuid> CRON_SECRET=...
supabase functions deploy lead-form --no-verify-jwt
supabase functions deploy send-reminders
supabase functions deploy import-csv
```

`lead-form` va sin JWT porque la llaman sitios públicos; por eso lleva honeypot, validación y límite por IP.

---

## 9. Copias de seguridad y keep-alive

### `.github/workflows/backup.yml`

```yaml
name: backup
on:
  schedule: [{ cron: '0 8 * * *' }]   # 03:00 Lima
  workflow_dispatch:
jobs:
  dump:
    runs-on: ubuntu-latest
    steps:
      - uses: supabase/setup-cli@v1
      - run: supabase db dump --db-url "$DB_URL" -f schema.sql
        env: { DB_URL: '${{ secrets.SUPABASE_DB_URL }}' }
      - run: supabase db dump --db-url "$DB_URL" --data-only -f data.sql
        env: { DB_URL: '${{ secrets.SUPABASE_DB_URL }}' }
      - uses: actions/upload-artifact@v4
        with:
          name: crm-backup-${{ github.run_id }}
          path: '*.sql'
          retention-days: 30
```

`SUPABASE_DB_URL` = cadena de conexión del *Session pooler* (Project Settings → Database).

### `.github/workflows/keepalive.yml`

```yaml
name: keepalive
on:
  schedule: [{ cron: '0 12 */3 * *' }]  # cada 3 días
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS "$URL/rest/v1/pipeline_stages?select=id&limit=1" \
            -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
        env:
          URL: ${{ secrets.SUPABASE_URL }}
          KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

> Con RLS, la clave anon sin sesión no lee `pipeline_stages` (la política es `to authenticated`), pero la petición igualmente cuenta como actividad. Si se quiere una respuesta con datos, crear una función `ping()` pública que devuelva `true`.

---

## 10. Hoja de ruta

| Fase | Entregable | Duración estimada |
|---|---|---|
| **0 · Base** | Repo, Supabase, migraciones, login, layout con sidebar, despliegue en Pages | 2–3 días |
| **1 · Núcleo** | Empresas y contactos (CRUD, lista con filtros, ficha), etiquetas | 1 semana |
| **2 · Ventas** | Oportunidades, kanban con arrastrar, etapas configurables | 1 semana |
| **3 · Seguimiento** | Actividades y tareas, línea de tiempo, agenda, recordatorios por correo | 1 semana |
| **4 · Captación** | Edge Function `lead-form`, snippet para WordPress, importar CSV | 3–4 días |
| **5 · Análisis** | Panel con KPIs, reportes, exportar CSV | 3–4 días |
| **6 · Pulido** | Ctrl+K, tiempo real en kanban, adjuntos, modo oscuro, móvil, backups | 1 semana |

**MVP usable al terminar la fase 3** (~3–4 semanas a tiempo parcial).

### Ampliaciones posteriores

- Cotizaciones en PDF desde una oportunidad
- Plantillas de correo y registro automático de correos enviados
- Integración con WhatsApp Business Cloud API (tiene costo por conversación)
- Multiempresa (columna `org_id` en todas las tablas + RLS por organización) para ofrecer el CRM a varios clientes
- PWA instalable en el celular

---

## 11. Checklist de seguridad

- [ ] RLS activado en **todas** las tablas (`select relname from pg_class where relrowsecurity = false and relnamespace = 'public'::regnamespace` debe devolver vacío)
- [ ] Registro público desactivado; usuarios solo por invitación
- [ ] `service_role` nunca en el frontend ni en el repo
- [ ] Bucket `adjuntos` privado, descargas con URL firmada
- [ ] `lead-form` con honeypot, validación Zod y límite por IP
- [ ] Backups nocturnos verificados (restaurar una vez en un proyecto de prueba)
- [ ] `.env.local` en `.gitignore`

---

## 12. Alternativa sin programar

Si se necesita un CRM operativo de inmediato: **Twenty CRM** (código abierto) con Docker en **Oracle Cloud Always Free** (VM ARM de 4 núcleos y 24 GB de RAM). Funciona en una tarde, pero depende de la cuenta de Oracle, el servidor se mantiene a mano y personalizarlo es más difícil que en un desarrollo propio.
