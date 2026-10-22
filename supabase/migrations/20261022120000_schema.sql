-- CRM · esquema base
-- Tablas de negocio, catálogos y triggers. Los permisos (RLS) van en la migración siguiente.

-- Tipos ---------------------------------------------------------------
create type public.user_role      as enum ('admin', 'manager', 'sales');
create type public.contact_status as enum ('lead', 'prospect', 'customer', 'inactive');
create type public.activity_type  as enum ('call', 'meeting', 'email', 'task', 'note', 'whatsapp');

-- Perfiles (1 a 1 con auth.users) --------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  role        public.user_role not null default 'sales',
  avatar_url  text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Empresas ------------------------------------------------------------
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  ruc         text unique,
  industry    text,
  website     text,
  phone       text,
  address     text,
  city        text,
  owner_id    uuid not null default auth.uid() references public.profiles,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index companies_owner_idx on public.companies (owner_id);
create index companies_name_idx  on public.companies (lower(name));

-- Contactos -----------------------------------------------------------
create table public.contacts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies on delete set null,
  first_name  text not null,
  last_name   text,
  email       text,
  phone       text,
  position    text,
  status      public.contact_status not null default 'lead',
  source      text,              -- 'web', 'referido', 'feria', 'facebook'…
  notes       text,
  owner_id    uuid not null default auth.uid() references public.profiles,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index contacts_company_idx on public.contacts (company_id);
create index contacts_owner_idx   on public.contacts (owner_id);
create index contacts_email_idx   on public.contacts (lower(email));

-- Etapas del pipeline (configurables por el admin) --------------------
create table public.pipeline_stages (
  id           serial primary key,
  name         text not null,
  position     int  not null,
  probability  int  not null default 0 check (probability between 0 and 100),
  is_won       boolean not null default false,
  is_lost      boolean not null default false,
  check (not (is_won and is_lost))
);

insert into public.pipeline_stages (name, position, probability, is_won, is_lost) values
  ('Nuevo',        1,  10, false, false),
  ('Contactado',   2,  25, false, false),
  ('Propuesta',    3,  50, false, false),
  ('Negociación',  4,  75, false, false),
  ('Ganado',       5, 100, true,  false),
  ('Perdido',      6,   0, false, true);

-- Oportunidades -------------------------------------------------------
create table public.deals (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  company_id      uuid references public.companies on delete set null,
  contact_id      uuid references public.contacts  on delete set null,
  stage_id        int  not null default 1 references public.pipeline_stages,
  value           numeric(12,2) not null default 0,
  currency        char(3) not null default 'PEN',
  expected_close  date,
  closed_at       timestamptz,
  lost_reason     text,
  position        int not null default 0,   -- orden dentro de la columna del kanban
  owner_id        uuid not null default auth.uid() references public.profiles,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index deals_stage_idx   on public.deals (stage_id);
create index deals_owner_idx   on public.deals (owner_id);
create index deals_company_idx on public.deals (company_id);
create index deals_contact_idx on public.deals (contact_id);

-- Actividades (llamadas, reuniones, tareas, notas) --------------------
create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  type        public.activity_type not null,
  subject     text not null,
  body        text,
  due_at      timestamptz,
  done_at     timestamptz,
  company_id  uuid references public.companies on delete cascade,
  contact_id  uuid references public.contacts  on delete cascade,
  deal_id     uuid references public.deals     on delete cascade,
  owner_id    uuid not null default auth.uid() references public.profiles,
  created_at  timestamptz not null default now()
);
create index activities_pending_idx on public.activities (owner_id, due_at) where done_at is null;
create index activities_contact_idx on public.activities (contact_id);
create index activities_company_idx on public.activities (company_id);
create index activities_deal_idx    on public.activities (deal_id);

-- Adjuntos (metadatos; el archivo vive en Storage) --------------------
create table public.attachments (
  id          uuid primary key default gen_random_uuid(),
  path        text not null,             -- ruta dentro del bucket "adjuntos"
  file_name   text not null,
  size_bytes  bigint,
  company_id  uuid references public.companies on delete cascade,
  contact_id  uuid references public.contacts  on delete cascade,
  deal_id     uuid references public.deals     on delete cascade,
  owner_id    uuid not null default auth.uid() references public.profiles,
  created_at  timestamptz not null default now()
);

-- Etiquetas -----------------------------------------------------------
create table public.tags (
  id     serial primary key,
  name   text not null unique,
  color  text not null default '#64748b'
);
create table public.contact_tags (
  contact_id  uuid references public.contacts on delete cascade,
  tag_id      int  references public.tags     on delete cascade,
  primary key (contact_id, tag_id)
);

-- updated_at automático ----------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger touch_companies before update on public.companies for each row execute function public.touch_updated_at();
create trigger touch_contacts  before update on public.contacts  for each row execute function public.touch_updated_at();
create trigger touch_deals     before update on public.deals     for each row execute function public.touch_updated_at();

-- closed_at automático al pasar a Ganado/Perdido ----------------------
create function public.set_deal_closed_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id then
    new.closed_at := case
      when exists (select 1 from public.pipeline_stages s
                   where s.id = new.stage_id and (s.is_won or s.is_lost))
      then now() else null end;
  end if;
  return new;
end $$;

create trigger deal_closed_at before insert or update on public.deals
  for each row execute function public.set_deal_closed_at();

-- Perfil automático al crear un usuario -------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.email));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
