// Utilidades de formato (moneda RD$, fechas y horas)

export function money(value: number | null | undefined): string {
  const n = Number(value ?? 0)
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(n)
}

export function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function hora(h: string | null): string {
  if (!h) return ''
  const [hh, mm] = h.split(':')
  let hour = parseInt(hh, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${mm} ${ampm}`
}

export function fechaHora(ts: string | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleString('es-DO', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function hoyISO(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

// Código de artículo a 4 dígitos con ceros a la izquierda: 0000, 0001, …
export function codigoArticulo(n: number | null | undefined): string {
  return String(n ?? 0).padStart(4, '0')
}
