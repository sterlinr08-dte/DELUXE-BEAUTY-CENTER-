-- AMATISTA DENTAL - Usuario administrador inicial
-- El portal central (nexusprord.com) compone el correo real como
--   <usuario> + email_dominio   ->   admin + @amatista.local
-- por eso el admin entra escribiendo  "admin@amatista"  en el login central.
--
-- NOTA DE SEGURIDAD: al aplicar esto se usó una CONTRASEÑA TEMPORAL que debe
-- cambiarse en el primer ingreso. No se versiona la contraseña real; sustituye
-- el marcador antes de ejecutar en una instalación nueva.

do $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    'admin@amatista.local', crypt('<<CONTRASEÑA_TEMPORAL>>', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', 'admin@amatista.local'),
    'email', now(), now(), now()
  );
  insert into public.perfiles (id, nombre, email, rol_key, activo, username)
  values (uid, 'Administrador', 'admin@amatista.local', 'admin', true, 'admin')
  on conflict (id) do update set rol_key='admin', activo=true, username='admin';
end $$;
