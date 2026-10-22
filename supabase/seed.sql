-- Datos de prueba para desarrollo local (supabase db reset). No se aplica en producción.

insert into public.tags (name, color) values
  ('VIP',        '#dc2626'),
  ('Distribuidor','#2563eb'),
  ('Licitación', '#d97706'),
  ('Recurrente', '#16a34a')
on conflict (name) do nothing;
