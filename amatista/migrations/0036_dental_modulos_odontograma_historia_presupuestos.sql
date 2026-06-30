-- AMATISTA DENTAL - Módulos propios de una clínica odontológica
-- Aplicado sobre la base propia de Amatista (Supabase: sdxyqaawxomnfhyaxuyo),
-- encima del clon del esquema de Deluxe (migraciones 0001-0035).
-- Notación dental FDI: permanentes 11-48, temporales 51-85.

-- ============ ODONTOGRAMA (mapa de dientes por paciente) ============
create table if not exists public.odontograma (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  diente smallint not null,                 -- código FDI de la pieza
  cara text,                                 -- vestibular, palatino/lingual, mesial, distal, oclusal/incisal; null = pieza completa
  estado text not null default 'sano'
    check (estado in ('sano','caries','obturado','ausente','corona','implante',
                      'endodoncia','fractura','sellante','extraccion_indicada',
                      'protesis','puente','movilidad')),
  tratamiento_id uuid references public.servicios(id) on delete set null,
  cita_id uuid references public.citas(id) on delete set null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_odontograma_updated before update on public.odontograma
  for each row execute function public.set_updated_at();
create index if not exists idx_odontograma_cliente on public.odontograma(cliente_id);

alter table public.odontograma enable row level security;
create policy odontograma_sel on public.odontograma for select to authenticated using (true);
create policy odontograma_rw  on public.odontograma for all to authenticated
  using (auth_tiene('clientes')) with check (auth_tiene('clientes'));

-- ============ HISTORIA CLÍNICA (1 ficha por paciente) ============
create table if not exists public.historias_clinicas (
  cliente_id uuid primary key references public.clientes(id) on delete cascade,
  antecedentes text,
  alergias text,
  medicamentos text,
  enfermedades text,            -- diabetes, hipertensión, cardiopatías, etc.
  grupo_sanguineo text,
  embarazada boolean not null default false,
  fumador boolean not null default false,
  observaciones text,
  updated_at timestamptz not null default now()
);
create trigger trg_historias_updated before update on public.historias_clinicas
  for each row execute function public.set_updated_at();

alter table public.historias_clinicas enable row level security;
create policy historias_sel on public.historias_clinicas for select to authenticated using (true);
create policy historias_rw  on public.historias_clinicas for all to authenticated
  using (auth_tiene('clientes')) with check (auth_tiene('clientes'));

-- Evoluciones / notas clínicas por visita
create table if not exists public.historia_evoluciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  cita_id uuid references public.citas(id) on delete set null,
  empleado_id uuid references public.empleados(id) on delete set null,
  fecha date not null default current_date,
  motivo text,
  diagnostico text,
  procedimiento text,
  indicaciones text,
  notas text,
  created_at timestamptz not null default now()
);
create index if not exists idx_evoluciones_cliente on public.historia_evoluciones(cliente_id);

alter table public.historia_evoluciones enable row level security;
create policy evoluciones_sel on public.historia_evoluciones for select to authenticated using (true);
create policy evoluciones_rw  on public.historia_evoluciones for all to authenticated
  using (auth_tiene('clientes')) with check (auth_tiene('clientes'));

-- ============ PRESUPUESTOS / PLANES DE TRATAMIENTO ============
create sequence if not exists public.presupuesto_codigo_seq start 1;

create table if not exists public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  codigo integer not null default nextval('public.presupuesto_codigo_seq'),
  cliente_id uuid references public.clientes(id) on delete set null,
  empleado_id uuid references public.empleados(id) on delete set null,
  fecha date not null default current_date,
  estado text not null default 'BORRADOR'
    check (estado in ('BORRADOR','PRESENTADO','APROBADO','RECHAZADO','FACTURADO')),
  subtotal numeric not null default 0,
  descuento numeric not null default 0,
  total numeric not null default 0,
  notas text,
  factura_id uuid references public.facturas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_presupuestos_updated before update on public.presupuestos
  for each row execute function public.set_updated_at();
create index if not exists idx_presupuestos_cliente on public.presupuestos(cliente_id);

create table if not exists public.presupuesto_items (
  id uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references public.presupuestos(id) on delete cascade,
  servicio_id uuid references public.servicios(id) on delete set null,
  diente smallint,                  -- pieza FDI opcional
  descripcion text not null default '',
  cantidad numeric not null default 1,
  precio_unit numeric not null default 0,
  subtotal numeric not null default 0,
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE','APROBADO','REALIZADO')),
  created_at timestamptz not null default now()
);
create index if not exists idx_presupuesto_items on public.presupuesto_items(presupuesto_id);

alter table public.presupuestos enable row level security;
alter table public.presupuesto_items enable row level security;
create policy presupuestos_sel on public.presupuestos for select to authenticated using (true);
create policy presupuestos_rw  on public.presupuestos for all to authenticated
  using (auth_tiene('facturacion')) with check (auth_tiene('facturacion'));
create policy presupuesto_items_sel on public.presupuesto_items for select to authenticated using (true);
create policy presupuesto_items_rw  on public.presupuesto_items for all to authenticated
  using (auth_tiene('facturacion')) with check (auth_tiene('facturacion'));

-- Auditoría también para las tablas dentales
do $$
declare t text;
begin
  foreach t in array array['odontograma','historias_clinicas','historia_evoluciones','presupuestos']
  loop
    execute format('drop trigger if exists trg_auditoria on public.%I', t);
    execute format('create trigger trg_auditoria after insert or update or delete on public.%I for each row execute function public.fn_auditoria()', t);
  end loop;
end $$;
