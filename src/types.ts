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

// Tipado mínimo para el cliente de Supabase.
export type Database = any
