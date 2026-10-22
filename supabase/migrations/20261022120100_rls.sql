-- CRM · permisos
-- sales: ve y edita solo lo suyo · manager: ve y edita todo · admin: además borra y configura.

-- Helpers (security definer para no recursar sobre el RLS de profiles) --
create function public.current_role_is(r public.user_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = r and active
  )
$$;

create function public.is_manager_or_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'manager') and active
  )
$$;

-- Nadie se sube el rol ni se reactiva a sí mismo ----------------------
-- auth.uid() nulo = SQL editor o service_role: se permite (así se crea el primer admin).
create function public.guard_profile_privileges() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.role, new.active) is distinct from (old.role, old.active)
     and (select auth.uid()) is not null
     and not public.current_role_is('admin') then
    raise exception 'Solo un administrador puede cambiar el rol o el estado de un usuario'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger guard_profile_privileges before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Activar RLS en todas las tablas -------------------------------------
alter table public.profiles        enable row level security;
alter table public.companies       enable row level security;
alter table public.contacts        enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.deals           enable row level security;
alter table public.activities      enable row level security;
alter table public.attachments     enable row level security;
alter table public.tags            enable row level security;
alter table public.contact_tags    enable row level security;

-- Perfiles: todos ven a todos (para asignar responsables) --------------
create policy profiles_select on public.profiles for select to authenticated
  using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.current_role_is('admin'));

-- Tablas con owner_id: mismo patrón ----------------------------------
-- Sin with check en update, Postgres reutiliza el using: un vendedor no puede
-- traspasar un registro a otro usuario, pero manager/admin sí.
do $$
declare t text;
begin
  foreach t in array array['companies', 'contacts', 'deals', 'activities', 'attachments'] loop
    execute format($f$
      create policy %1$s_select on public.%1$s for select to authenticated
        using (owner_id = (select auth.uid()) or public.is_manager_or_admin());
      create policy %1$s_insert on public.%1$s for insert to authenticated
        with check (owner_id = (select auth.uid()) or public.is_manager_or_admin());
      create policy %1$s_update on public.%1$s for update to authenticated
        using (owner_id = (select auth.uid()) or public.is_manager_or_admin());
      create policy %1$s_delete on public.%1$s for delete to authenticated
        using (public.current_role_is('admin'));
    $f$, t);
  end loop;
end $$;

-- Catálogos: todos leen; etapas solo admin, etiquetas manager/admin ---
create policy stages_select on public.pipeline_stages for select to authenticated
  using (true);
create policy stages_write on public.pipeline_stages for all to authenticated
  using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

create policy tags_select on public.tags for select to authenticated
  using (true);
create policy tags_write on public.tags for all to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

-- contact_tags hereda el permiso del contacto ------------------------
create policy contact_tags_all on public.contact_tags for all to authenticated
  using (exists (
    select 1 from public.contacts c
    where c.id = contact_id
      and (c.owner_id = (select auth.uid()) or public.is_manager_or_admin())
  ))
  with check (exists (
    select 1 from public.contacts c
    where c.id = contact_id
      and (c.owner_id = (select auth.uid()) or public.is_manager_or_admin())
  ));

-- Privilegios explícitos (el RLS decide qué filas) --------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on all tables in schema public from anon;
