// Tipos de dominio para DELUXE BEAUTY CENTER

export type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA'

export interface Empleado {
  id: string
  nombre: string
  puesto: string
  telefono: string | null
  email: string | null
  especialidad: string | null
  color: string | null
  comision_pct: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Servicio {
  id: string
  nombre: string
  categoria: string
  descripcion: string | null
  duracion_min: number
  precio: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  fecha_nacimiento: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Cita {
  id: string
  cliente_id: string | null
  empleado_id: string | null
  servicio_id: string | null
  fecha: string
  hora_inicio: string
  hora_fin: string | null
  estado: EstadoCita
  precio: number
  notas: string | null
  created_at: string
  updated_at: string
}

// Cita con las relaciones expandidas (join)
export interface CitaConRelaciones extends Cita {
  cliente: Pick<Cliente, 'id' | 'nombre' | 'telefono'> | null
  empleado: Pick<Empleado, 'id' | 'nombre' | 'color'> | null
  servicio: Pick<Servicio, 'id' | 'nombre' | 'precio' | 'duracion_min'> | null
}

// ===================== FACTURACIÓN Y CONTABILIDAD =====================

export type EstadoFactura = 'PENDIENTE' | 'PAGADA' | 'ANULADA'
export type TipoPagoEmpleado = 'SALARIO' | 'COMISION' | 'ADELANTO' | 'BONO'

export interface FacturaItem {
  id: string
  factura_id: string
  servicio_id: string | null
  empleado_id: string | null
  descripcion: string
  cantidad: number
  precio_unit: number
  importe: number
}

export interface Factura {
  id: string
  numero: number
  cliente_id: string | null
  cliente_nombre: string | null
  cita_id: string | null
  fecha: string
  subtotal: number
  descuento: number
  itbis: number
  total: number
  estado: EstadoFactura
  metodo_pago: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface FacturaConItems extends Factura {
  items: FacturaItem[]
}

export interface Gasto {
  id: string
  fecha: string
  categoria: string
  concepto: string
  beneficiario: string | null
  monto: number
  metodo_pago: string | null
  notas: string | null
  created_at: string
}

export interface Compra {
  id: string
  numero: number
  fecha: string
  proveedor: string | null
  descripcion: string
  categoria: string
  subtotal: number
  itbis: number
  total: number
  metodo_pago: string | null
  notas: string | null
  created_at: string
}

export interface PagoEmpleado {
  id: string
  empleado_id: string | null
  empleado_nombre: string | null
  fecha: string
  periodo: string | null
  tipo: TipoPagoEmpleado
  monto: number
  metodo_pago: string | null
  notas: string | null
  created_at: string
}

// Tipado mínimo para el cliente de Supabase.
export type Database = any

export interface Articulo {
  id: string
  codigo: number
  nombre: string
  categoria: string
  descripcion: string | null
  precio: number
  costo: number
  stock: number
  activo: boolean
  created_at: string
  updated_at: string
}
