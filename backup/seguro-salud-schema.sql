-- ============================================================
-- RESPALDO DE ESQUEMA - Sistema Seguro de Salud (sterlinr08)
-- Generado antes de reutilizar el proyecto Supabase para DELUXE BEAUTY CENTER
-- Proyecto Supabase origen: mrtqkhachhvsczltwakt
-- Fecha de respaldo: 2026-06-07
-- Los datos correspondientes estan en: seguro-salud-data-backup.json
-- ============================================================

CREATE TABLE public.abonos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cliente_id uuid,
  monto numeric NOT NULL,
  metodo text,
  referencia text,
  fecha date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  factura_id uuid,
  tipo text DEFAULT 'ABONO'::text,
  estado text DEFAULT 'ACTIVO'::text,
  created_by_name text,
  created_by_user_id text,
  updated_by_name text,
  updated_by_user_id text,
  updated_at timestamp with time zone DEFAULT now(),
  nota text,
  agente_cobro text,
  banco text,
  comprobante_url text,
  PRIMARY KEY (id)
);

CREATE TABLE public.agentes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nom text NOT NULL,
  cargo text,
  tel text,
  email text,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  licencia text,
  lic_vence date,
  PRIMARY KEY (id)
);

CREATE TABLE public.ars_catalog (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text NOT NULL,
  activo boolean DEFAULT true,
  created_by text,
  updated_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.asientos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  fecha date NOT NULL,
  referencia text,
  descripcion text NOT NULL,
  cuenta_dr_cod text,
  cuenta_dr_nom text,
  monto_dr numeric DEFAULT 0,
  cuenta_cr_cod text,
  cuenta_cr_nom text,
  monto_cr numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.auditoria (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ts timestamp with time zone DEFAULT now(),
  usuario text,
  rol text,
  accion text,
  detalle text,
  modulo text,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  entity_table text,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  result text DEFAULT 'OK'::text,
  error_message text,
  ip text,
  device text,
  origen text DEFAULT 'WEB'::text,
  PRIMARY KEY (id)
);

CREATE TABLE public.auto_jobs_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  fecha timestamp with time zone DEFAULT now(),
  estado text,
  facturas_generadas integer DEFAULT 0,
  errores integer DEFAULT 0,
  detalle jsonb,
  PRIMARY KEY (id)
);

CREATE TABLE public.auto_notificaciones_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  fecha timestamp with time zone DEFAULT now(),
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  estado text DEFAULT 'pendiente'::text,
  detalle jsonb,
  PRIMARY KEY (id)
);

CREATE TABLE public.automation_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  clave text DEFAULT 'auto_facturacion'::text NOT NULL,
  dia_principal integer DEFAULT 1,
  dias_personalizados text,
  hora time without time zone DEFAULT '08:00:00'::time without time zone,
  wa_automatico boolean DEFAULT false,
  alerta_vencimiento_dias integer DEFAULT 30,
  activo boolean DEFAULT true,
  updated_by text,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.bancos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text NOT NULL,
  activo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.changelog (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  version text,
  tipo text DEFAULT 'GENERAL'::text,
  modulo text,
  descripcion text NOT NULL,
  archivo text,
  archivo_hash text,
  usuario text,
  user_id uuid,
  estado text DEFAULT 'EXITOSO'::text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.clientes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nom text NOT NULL,
  cedula text,
  wa text,
  tel text,
  email text,
  plan text NOT NULL,
  empresa_id uuid,
  agente_id uuid,
  dir text,
  deps jsonb DEFAULT '[]'::jsonb,
  deuda_total numeric DEFAULT 0,
  pagado numeric DEFAULT 0,
  activo boolean DEFAULT true,
  motivo_inhab text,
  nota_inhab text,
  created_at timestamp with time zone DEFAULT now(),
  numero_poliza text,
  fecha_inicio date,
  fecha_fin date,
  tipo_ncf text DEFAULT 'B02'::text,
  ars text,
  dia_facturacion integer DEFAULT 1,
  precio_titular numeric,
  precio_dep numeric,
  referencia text,
  referencia_wa text,
  created_by_name text,
  created_by_user_id text,
  updated_by_name text,
  updated_by_user_id text,
  updated_at timestamp with time zone,
  saldo_inicial numeric DEFAULT 0,
  saldo_inicial_pagado numeric DEFAULT 0,
  saldo_inicial_detalle text,
  saldo_inicial_fecha date,
  saldo_inicial_meses integer DEFAULT 0,
  saldo_inicial_created_by text,
  saldo_inicial_created_at timestamp with time zone,
  estado_cliente text DEFAULT 'EN_PROCESO'::text,
  permitir_facturacion boolean DEFAULT true,
  motivo_proceso text,
  nota_proceso text,
  fecha_seguimiento date,
  responsable_seguimiento text,
  prioridad_proceso text DEFAULT 'MEDIA'::text,
  pendientes_proceso jsonb DEFAULT '[]'::jsonb,
  otro_pendiente_detalle text,
  porcentaje_progreso integer DEFAULT 100,
  vip boolean DEFAULT false,
  precio_especial_titular numeric DEFAULT 0,
  precio_especial_dep numeric DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE public.comisiones (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  agente_id uuid,
  agente_nom text,
  mes integer,
  anio integer,
  periodo text,
  total_primas numeric DEFAULT 0,
  porcentaje numeric DEFAULT 0,
  monto_bruto numeric DEFAULT 0,
  itbis numeric DEFAULT 0,
  monto_neto numeric DEFAULT 0,
  estado text DEFAULT 'Pendiente'::text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.configuracion (
  clave text NOT NULL,
  valor text,
  updated_at timestamp with time zone DEFAULT now(),
  actualizado timestamp with time zone DEFAULT now(),
  PRIMARY KEY (clave)
);

CREATE TABLE public.configuration_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  clave text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  usuario text,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.documentos_clientes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cliente_id uuid NOT NULL,
  tipo text NOT NULL,
  nombre_archivo text,
  url_publica text,
  tipo_mime text,
  tamaño bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.egresos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tipo text NOT NULL,
  concepto text NOT NULL,
  beneficiario text,
  monto numeric DEFAULT 0 NOT NULL,
  metodo text,
  banco text,
  referencia text,
  comprobante_url text,
  nota text,
  fecha date DEFAULT CURRENT_DATE NOT NULL,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.email_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  clave text DEFAULT 'emailjs'::text NOT NULL,
  public_key text,
  service_id text,
  template_id text,
  correo_destino text,
  hora_envio time without time zone DEFAULT '07:00:00'::time without time zone,
  activo boolean DEFAULT false,
  updated_by text,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.empresas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nom text NOT NULL,
  rnc text,
  sector text,
  tel text,
  email text,
  contacto text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.entregas_admin (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  agente_id text NOT NULL,
  monto numeric(15,2) NOT NULL,
  metodo text DEFAULT 'Efectivo'::text NOT NULL,
  banco text,
  referencia text,
  nota text,
  fecha date DEFAULT CURRENT_DATE NOT NULL,
  confirmado boolean DEFAULT false NOT NULL,
  confirmado_at timestamp with time zone,
  confirmado_por text,
  depositado boolean DEFAULT false NOT NULL,
  depositado_at timestamp with time zone,
  depositado_banco text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text,
  es_directo boolean DEFAULT false NOT NULL,
  cobro_id text,
  cliente_id text,
  comprobante_url text,
  PRIMARY KEY (id)
);

CREATE TABLE public.facturas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cliente_id uuid,
  cliente_nom text,
  plan text,
  empresa_id uuid,
  periodo text,
  mes integer,
  anio integer,
  prima_base numeric DEFAULT 0,
  prima_deps numeric DEFAULT 0,
  deuda_ant numeric DEFAULT 0,
  total numeric DEFAULT 0,
  estado text DEFAULT 'Pendiente'::text,
  wa_sent boolean DEFAULT false,
  fecha_emision date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  ncf text,
  tipo_ncf text,
  created_by_name text,
  created_by_user_id text,
  updated_by_name text,
  updated_by_user_id text,
  updated_at timestamp with time zone DEFAULT now(),
  origen text DEFAULT 'MANUAL'::text,
  PRIMARY KEY (id)
);

CREATE TABLE public.mis_cuentas_bancarias (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  banco text NOT NULL,
  tipo text DEFAULT 'Ahorros'::text NOT NULL,
  numero text NOT NULL,
  titular text NOT NULL,
  cedula text,
  notas text,
  orden integer DEFAULT 0,
  activa boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.pagos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cliente_id uuid,
  factura_id uuid,
  monto numeric NOT NULL,
  tipo text DEFAULT 'ABONO'::text,
  metodo text,
  referencia text,
  nota text,
  fecha date DEFAULT CURRENT_DATE,
  estado text DEFAULT 'ACTIVO'::text,
  created_by_name text,
  created_by_user_id text,
  updated_by_name text,
  updated_by_user_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.permissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  key text NOT NULL,
  modulo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  created_at timestamp with time zone DEFAULT now(),
  code text,
  name text,
  module text,
  description text,
  PRIMARY KEY (id)
);

CREATE TABLE public.reporte_destinatarios (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre text NOT NULL,
  correo text NOT NULL,
  secciones jsonb DEFAULT '[]'::jsonb,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.role_permissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  role_key text NOT NULL,
  permission_key text NOT NULL,
  permitido boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  role_code text,
  permission_code text,
  allowed boolean DEFAULT true,
  PRIMARY KEY (id)
);

CREATE TABLE public.roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  key text DEFAULT (gen_random_uuid())::text NOT NULL,
  nombre text DEFAULT 'SIN NOMBRE'::text NOT NULL,
  descripcion text,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  code text,
  description text,
  name text,
  PRIMARY KEY (id)
);

CREATE TABLE public.secuencias_ncf (
  tipo text NOT NULL,
  ultimo_numero integer DEFAULT 0,
  PRIMARY KEY (tipo)
);

CREATE TABLE public.smart_historial (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pregunta text NOT NULL,
  respuesta text,
  contexto_usado jsonb,
  tokens_usados integer,
  duracion_ms integer,
  error text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.system_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  clave text NOT NULL,
  valor jsonb DEFAULT '{}'::jsonb NOT NULL,
  activo boolean DEFAULT true,
  updated_by text,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.transferencias_agentes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  desde_agente text NOT NULL,
  hacia_agente text NOT NULL,
  monto numeric NOT NULL,
  metodo text NOT NULL,
  banco text,
  referencia text NOT NULL,
  nota text,
  fecha date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.user_permissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  permission_key text NOT NULL,
  permitido boolean NOT NULL,
  created_by text,
  updated_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  permission_code text,
  allowed boolean DEFAULT true,
  PRIMARY KEY (id)
);

CREATE TABLE public.user_theme_preferences (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  tema text DEFAULT 'AUTO'::text,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.usuarios_sistema (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nom text NOT NULL,
  cargo text,
  login text NOT NULL,
  pwd text,
  rol text DEFAULT 'agente'::text,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  email text,
  password_hash text,
  ultimo_login timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  tema_preferido text DEFAULT 'AUTO'::text,
  permisos_override jsonb DEFAULT '{}'::jsonb,
  creado_por text,
  actualizado_por text,
  puede_cobrar_todos boolean DEFAULT false,
  PRIMARY KEY (id)
);
