-- AMATISTA DENTAL - Marca, categorías odontológicas, roles y catálogo de tratamientos

-- 1) Datos del negocio (la dueña completa dirección/teléfono desde Configuración)
update public.ajustes_negocio
set nombre = 'Amatista Dental',
    direccion = '',
    referencia = '',
    telefono = '',
    whatsapp = '',
    instagram = '',
    rnc = '',
    prefijo_cliente = 'PA',
    updated_at = now()
where id = true;

-- 2) Rol clínico: el "estilista" del molde pasa a ser Odontólogo/a (mismo key interno)
update public.roles
set nombre = 'Odontólogo/a',
    permisos = '["panel","citas","clientes","servicios"]'::jsonb
where key = 'estilista';

-- 3) Categorías: reemplazar las de belleza por categorías odontológicas
delete from public.categorias;
insert into public.categorias (nombre, tipo) values
  -- Tratamientos (servicios)
  ('Diagnóstico','servicio'),('Prevención','servicio'),('Operatoria','servicio'),
  ('Endodoncia','servicio'),('Cirugía','servicio'),('Periodoncia','servicio'),
  ('Prótesis','servicio'),('Ortodoncia','servicio'),('Estética','servicio'),
  ('Implantes','servicio'),('Odontopediatría','servicio'),('General','servicio'),
  -- Insumos (artículos)
  ('Anestesia','articulo'),('Resinas','articulo'),('Instrumental','articulo'),
  ('Descartables','articulo'),('Higiene','articulo'),('Medicamentos','articulo'),
  ('General','articulo'),('Otros','articulo')
on conflict (nombre, tipo) do nothing;

-- 4) Catálogo inicial de tratamientos (precio en 0: la dueña fija las tarifas)
insert into public.servicios (nombre, categoria, duracion_min, precio, activo) values
  ('Consulta / Evaluación','Diagnóstico',20,0,true),
  ('Radiografía periapical','Diagnóstico',15,0,true),
  ('Radiografía panorámica','Diagnóstico',20,0,true),
  ('Limpieza dental (profilaxis)','Prevención',40,0,true),
  ('Aplicación de flúor','Prevención',20,0,true),
  ('Sellante de fosas y fisuras','Prevención',20,0,true),
  ('Resina (obturación) 1 superficie','Operatoria',40,0,true),
  ('Resina (obturación) 2 superficies','Operatoria',50,0,true),
  ('Resina (obturación) 3 superficies','Operatoria',60,0,true),
  ('Endodoncia unirradicular','Endodoncia',60,0,true),
  ('Endodoncia multirradicular','Endodoncia',90,0,true),
  ('Extracción simple','Cirugía',30,0,true),
  ('Extracción de tercer molar (cordal)','Cirugía',60,0,true),
  ('Raspado y alisado radicular','Periodoncia',45,0,true),
  ('Destartraje (tártaro)','Periodoncia',40,0,true),
  ('Corona de porcelana','Prótesis',60,0,true),
  ('Prótesis parcial removible','Prótesis',60,0,true),
  ('Prótesis total (dentadura)','Prótesis',60,0,true),
  ('Blanqueamiento dental','Estética',60,0,true),
  ('Carilla de resina','Estética',60,0,true),
  ('Implante dental','Implantes',90,0,true),
  ('Evaluación de ortodoncia','Ortodoncia',30,0,true),
  ('Colocación de brackets','Ortodoncia',90,0,true),
  ('Ajuste de ortodoncia (mensual)','Ortodoncia',30,0,true),
  ('Sellantes / fluor pediátrico','Odontopediatría',30,0,true);
