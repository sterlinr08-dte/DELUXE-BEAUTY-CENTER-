// Constantes compartidas del sistema

// Login por nombre de usuario: internamente se usa un correo "<usuario>@deluxe.local"
export const DOMINIO_USUARIO = '@deluxe.local'
export function usuarioAEmail(usuario: string): string {
  const u = usuario.trim().toLowerCase()
  // Tolerante: si la persona ya escribió un correo completo (con "@"),
  // se respeta tal cual; si solo escribió el usuario, se le agrega el dominio.
  if (u.includes('@')) return u
  return u + DOMINIO_USUARIO
}


// Datos del negocio (aparecen en facturas, login y panel)
export const NEGOCIO = {
  nombre: 'DeluXe Beauty Center',
  direccion: 'Av. Duarte #180, 2do nivel',
  referencia: 'Frente a Banco Popular',
  telefono: '809-354-4083',
  whatsapp: '809-354-4083',
  instagram: '@centerdeluxebeauty',
  rnc: '', // Coloca aquí el RNC si aplica (aparece en los tickets)
  logo: 'deluxe-logo.png',
  ancho_ticket: 58, // mm del papel térmico (58 u 80)
}


// Prefijos por defecto de las secuencias (editables en Configuración → Prefijos)
export const PREFIJOS_DEFAULT = {
  prefijo_caja: 'CJ',
  prefijo_gasto: 'GA',
  prefijo_pago: 'NM',
  prefijo_cita: 'CI',
  prefijo_compra: 'CM',
  prefijo_cliente: 'CL',
  prefijo_proveedor: 'PR',
  prefijo_articulo: 'AR',
}

export const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia', 'PayPal', 'Otro']

export const ITBIS_RATE = 0.18 // 18% (RD)

export const CATEGORIAS_GASTO = [
  'General',
  'Alquiler',
  'Servicios (luz, agua)',
  'Publicidad',
  'Mantenimiento',
  'Impuestos',
  'Otros',
]

export const CATEGORIAS_COMPRA = [
  'Insumos',
  'Productos de cabello',
  'Productos de uñas',
  'Equipos',
  'Mobiliario',
  'Limpieza',
  'Otros',
]
