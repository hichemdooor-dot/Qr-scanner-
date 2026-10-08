-- SBI: secure Forgot Password request flow.
-- Run this ONCE in Supabase -> SQL Editor.
-- The login page calls this RPC instead of inserting directly into public.maintenance.

create or replace function public.submit_password_change_request(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_text text;
begin
  if v_email = '' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Adresse email invalide';
  end if;

  v_text := concat(
    'Demande de changement de mot de passe', E'\n',
    'Utilisateur : Compte non connecté', E'\n',
    'Email : ', v_email, E'\n',
    'Motif :', E'\n',
    'Mot de passe oublié — demande envoyée depuis la page de connexion.'
  );

  insert into public.maintenance (
    qr_id,
    date,
    technicien,
    type,
    travaux,
    created_by
  ) values (
    'password-reset-request',
    current_date,
    v_email,
    'Demande changement mot de passe',
    v_text,
    null
  );
end;
$$;

revoke all on function public.submit_password_change_request(text) from public;
grant execute on function public.submit_password_change_request(text) to anon, authenticated;

-- Keep the maintenance table protected. The RPC above is the only public path
-- used by the login page for this operation.
alter table public.maintenance enable row level security;
