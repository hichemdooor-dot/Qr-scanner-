-- SBI: allow password-change requests from the unauthenticated login page.
-- The policy permits only the specific request record shape; it does not grant
-- anonymous users access to read, update, or delete maintenance records.

alter table public.maintenance enable row level security;

grant insert on table public.maintenance to anon;

drop policy if exists "anon_submit_password_change_requests" on public.maintenance;
create policy "anon_submit_password_change_requests"
on public.maintenance
for insert
to anon
with check (
  type = 'Demande changement mot de passe'
  and created_by is null
  and qr_id = 'password-reset-request'
  and char_length(trim(coalesce(technicien, ''))) between 3 and 254
  and char_length(trim(coalesce(travaux, ''))) between 3 and 1200
);

-- Grant the needed sequence permission only if maintenance.id uses a sequence.
do $$
declare
  seq_name text;
begin
  seq_name := pg_get_serial_sequence('public.maintenance', 'id');
  if seq_name is not null then
    execute format('grant usage, select on sequence %s to anon', seq_name);
  end if;
end $$;
