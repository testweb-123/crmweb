-- CRM · fase 1
-- 1. profiles.email: la pantalla de usuarios necesita el correo y auth.users no es accesible desde la API.
-- 2. Siempre debe quedar al menos un administrador activo.

-- Correo en el perfil, sincronizado con auth.users ---------------------
alter table public.profiles add column email text;

update public.profiles p set email = u.email
from auth.users u where u.id = p.id;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.email), new.email);
  return new;
end $$;

create function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- El correo lo pone auth, no el usuario -------------------------------
-- (un revoke por columna no anula el grant de tabla: se reemplaza por grants por columna)
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, role, active) on public.profiles to authenticated;

-- Guarda de privilegios: rol/estado solo admin y nunca sin admins -----
create or replace function public.guard_profile_privileges() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.role, new.active) is distinct from (old.role, old.active) then
    -- auth.uid() nulo = SQL editor o service_role: se permite (así se crea el primer admin).
    if (select auth.uid()) is not null and not public.current_role_is('admin') then
      raise exception 'Solo un administrador puede cambiar el rol o el estado de un usuario'
        using errcode = '42501';
    end if;

    if old.role = 'admin' and old.active
       and (new.role <> 'admin' or not new.active)
       and not exists (
         select 1 from public.profiles
         where role = 'admin' and active and id <> old.id
       ) then
      raise exception 'Debe quedar al menos un administrador activo'
        using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
