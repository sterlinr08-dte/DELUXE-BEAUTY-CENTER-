-- AMATISTA DENTAL - Registro en el directorio central NEXUS
-- Esta sentencia se ejecuta en la base de NEXUS PRO Seguros (tnwsgcxurfyuszxsewsn),
-- NO en la base de Amatista. Es la fila que hace que "<usuario>@amatista" enrute
-- a la base propia de Amatista desde el portal central nexusprord.com.
--
-- auth_key = clave anónima (publishable/anon) de la base de Amatista. Es pública
-- por diseño; la protege RLS.

insert into organizaciones (slug, nombre, tipo, color, activo, auth_url, auth_key, email_dominio)
select 'amatista', 'Amatista Dental', 'externa', '#C9A227', true,
       'https://sdxyqaawxomnfhyaxuyo.supabase.co',
       '<<ANON_KEY_DE_AMATISTA>>',
       '@amatista.local'
where not exists (select 1 from organizaciones where slug = 'amatista');
