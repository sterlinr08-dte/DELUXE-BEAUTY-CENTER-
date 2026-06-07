// Catálogo único de módulos del sistema (fuente de verdad para permisos y menú)

export interface Modulo {
  key: string
  label: string
  path: string
}

export const MODULOS: Modulo[] = [
  { key: 'panel', label: 'Panel', path: '/' },
  { key: 'citas', label: 'Citas / Agenda', path: '/citas' },
  { key: 'clientes', label: 'Clientes', path: '/clientes' },
  { key: 'servicios', label: 'Servicios y precios', path: '/servicios' },
  { key: 'empleados', label: 'Empleados', path: '/empleados' },
  { key: 'facturacion', label: 'Facturación', path: '/facturacion' },
  { key: 'compras', label: 'Compras', path: '/compras' },
  { key: 'gastos', label: 'Gastos', path: '/gastos' },
  { key: 'nomina', label: 'Pagos a empleados', path: '/nomina' },
  { key: 'contabilidad', label: 'Contabilidad', path: '/contabilidad' },
  { key: 'configuracion', label: 'Configuración', path: '/configuracion' },
]

export const TODOS_MODULOS = MODULOS.map((m) => m.key)

export interface Rol {
  key: string
  nombre: string
  permisos: string[]
  es_admin: boolean
  protegido: boolean
}

export interface Perfil {
  id: string
  nombre: string | null
  email: string | null
  rol_key: string | null
  activo: boolean
  rol_nombre?: string | null
  permisos: string[]
  es_admin: boolean
}
