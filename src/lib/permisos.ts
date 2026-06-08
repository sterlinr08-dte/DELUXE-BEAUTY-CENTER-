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
  { key: 'articulos', label: 'Artículos / Productos', path: '/articulos' },
  { key: 'empleados', label: 'Empleados', path: '/empleados' },
  { key: 'facturacion', label: 'Facturación', path: '/facturacion' },
  { key: 'caja', label: 'Caja', path: '/caja' },
  { key: 'cuentas', label: 'Cuentas por cobrar', path: '/cuentas' },
  { key: 'compras', label: 'Compras', path: '/compras' },
  { key: 'gastos', label: 'Gastos', path: '/gastos' },
  { key: 'nomina', label: 'Pagos a empleados', path: '/nomina' },
  { key: 'contabilidad', label: 'Contabilidad', path: '/contabilidad' },
  { key: 'configuracion', label: 'Configuración', path: '/configuracion' },
]

export const TODOS_MODULOS = MODULOS.map((m) => m.key)

// Funciones / acciones controlables por rol (control de accesos fino).
// Se guardan en el mismo arreglo de permisos del rol.
export interface Accion {
  key: string
  label: string
  modulo: string
}

export const ACCIONES: Accion[] = [
  { key: 'facturas.cobrar', label: 'Cobrar / registrar pago de facturas', modulo: 'facturacion' },
  { key: 'facturas.editar', label: 'Editar facturas ya guardadas', modulo: 'facturacion' },
  { key: 'facturas.anular', label: 'Anular facturas', modulo: 'facturacion' },
  { key: 'facturas.eliminar', label: 'Eliminar facturas', modulo: 'facturacion' },
  { key: 'caja.abrir', label: 'Abrir y cerrar caja', modulo: 'caja' },
  { key: 'caja.movimiento', label: 'Registrar entradas / salidas de efectivo', modulo: 'caja' },
  { key: 'caja.cerrar_descuadre', label: 'Cerrar caja aunque haya descuadre (diferencia)', modulo: 'caja' },
  { key: 'creditos.cobrar', label: 'Registrar abonos de ventas a crédito', modulo: 'caja' },
  { key: 'clientes.eliminar', label: 'Eliminar clientes', modulo: 'clientes' },
  { key: 'servicios.eliminar', label: 'Eliminar servicios', modulo: 'servicios' },
  { key: 'articulos.eliminar', label: 'Eliminar artículos', modulo: 'articulos' },
  { key: 'compras.eliminar', label: 'Eliminar compras', modulo: 'compras' },
  { key: 'gastos.eliminar', label: 'Eliminar gastos', modulo: 'gastos' },
  { key: 'citas.eliminar', label: 'Eliminar citas', modulo: 'citas' },
]

export function etiquetaPermiso(key: string): string {
  return MODULOS.find((m) => m.key === key)?.label ?? ACCIONES.find((a) => a.key === key)?.label ?? key
}

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
  username: string | null
  email: string | null
  rol_key: string | null
  activo: boolean
  rol_nombre?: string | null
  permisos: string[]
  es_admin: boolean
}
