-- CRM · vistas de reportes, bucket de adjuntos y ping de keep-alive

-- Embudo: valor y cantidad por etapa ----------------------------------
-- security_invoker: la vista respeta el RLS de quien consulta.
create view public.v_pipeline_summary with (security_invoker = on) as
select s.id, s.name, s.position, s.probability, s.is_won, s.is_lost,
       count(d.id)                                         as deals,
       coalesce(sum(d.value), 0)                           as total_value,
       coalesce(sum(d.value * s.probability / 100.0), 0)   as weighted_value
from public.pipeline_stages s
left join public.deals d on d.stage_id = s.id
group by s.id
order by s.position;

-- Ventas ganadas por mes y vendedor -----------------------------------
create view public.v_won_by_month with (security_invoker = on) as
select date_trunc('month', d.closed_at)::date as month,
       d.owner_id,
       p.full_name   as seller,
       count(*)      as deals,
       sum(d.value)  as total
from public.deals d
join public.pipeline_stages s on s.id = d.stage_id and s.is_won
join public.profiles p on p.id = d.owner_id
group by 1, 2, 3;

grant select on public.v_pipeline_summary, public.v_won_by_month to authenticated;

-- Bucket privado de adjuntos ------------------------------------------
-- Ruta: {owner_id}/{entidad}/{id}/{archivo}
insert into storage.buckets (id, name, public, file_size_limit)
values ('adjuntos', 'adjuntos', false, 10485760)   -- 10 MB por archivo
on conflict (id) do nothing;

create policy adjuntos_select on storage.objects for select to authenticated
  using (bucket_id = 'adjuntos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or public.is_manager_or_admin()));

create policy adjuntos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'adjuntos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy adjuntos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'adjuntos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or public.current_role_is('admin')));

-- Ping público para el workflow de keep-alive -------------------------
create function public.ping() returns boolean
language sql stable set search_path = '' as $$ select true $$;

grant execute on function public.ping() to anon;
