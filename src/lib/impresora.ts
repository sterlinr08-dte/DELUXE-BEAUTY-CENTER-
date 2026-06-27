// Impresión directa por QZ Tray (sin cuadros de diálogo).
// - Si QZ Tray está instalado y configurado en la PC -> imprime directo.
// - Si no, el llamador usa el respaldo del navegador (window.print).
// La firma de seguridad se hace en una función de Supabase (la llave privada
// NUNCA está en la app). El certificado público de abajo debe coincidir con el
// override.crt instalado en la PC (lo hace el instalador).
import qz from 'qz-tray'

const CERTIFICADO = `-----BEGIN CERTIFICATE-----
MIIDdzCCAl+gAwIBAgIUMNCbe8MyfqGe7TUKN1NDW4XFQeMwDQYJKoZIhvcNAQEN
BQAwSzEdMBsGA1UEAwwURGVsdVhlIEJlYXV0eSBDZW50ZXIxHTAbBgNVBAoMFERl
bHVYZSBCZWF1dHkgQ2VudGVyMQswCQYDVQQGEwJETzAeFw0yNjA2MjcxNTIyMDNa
Fw0zNjA2MjQxNTIyMDNaMEsxHTAbBgNVBAMMFERlbHVYZSBCZWF1dHkgQ2VudGVy
MR0wGwYDVQQKDBREZWx1WGUgQmVhdXR5IENlbnRlcjELMAkGA1UEBhMCRE8wggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCWhXEl5m6ZFGP6SwiYLoG6uSRt
Iw+UpR31OxbV9GOmuZUxx9vUwpe7icLJ0uCdBYBvtbHuYILzKAmc3i5WzLEjdvCY
EpRbujeALkdfIAErSwjp+3IVF94IWeNRMga0iwyEGCj1PPNZic7bFN0YgPLBUKSl
D99HKoHglAaRMpWGr29ZMgN7N72i3Bu/K5CdLLrNOVbHS+z6BzADUYyaknWYVeap
2BOf9r0me3Z340dK42vFvuwQJtQm/TiYdfOQCjPlT6dMKOOuwro+LYiQ7PpTKnGv
3ktA2JUseFgaOsljmuRwP1cnHoggdlS5jLGemhWMRuUcb/g+PAYbwcjcnZLVAgMB
AAGjUzBRMB0GA1UdDgQWBBSQwKgRuud73etaQef+JMiH/aUvEjAfBgNVHSMEGDAW
gBSQwKgRuud73etaQef+JMiH/aUvEjAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3
DQEBDQUAA4IBAQB08pswNHWpWPWZ1dQI8TaGEz2tGo77U/L+2QaWOpNGP850YulS
+L0OzbS0ScLrHPUhC9QtCluOgB1AGLy3fOnfrwsXE3Lv1fTWjheA25QaGP2wXyUR
ev1M8ALfsGNP61CIxWf0ekx7DnGgXeLPHVhGjVtmYsfpyYqIADx7hSut4RIuWPjm
LYVqNLpaWrD7Von6544RoGilBWg1j+CEV+IR2PNVpmT+6oZw8hqIw/aRqDj6tm2P
Y4P+ZHfFms9wsReD1tgKRD/+KpH/gS5/ZHEvXntlxyQeZI6Be+sRkk1apdi+Kxgv
mRE8AaX1E4PXADswB/oTpBm1YofoJoroKQ9H
-----END CERTIFICATE-----`

const FIRMA_URL = 'https://mrtqkhachhvsczltwakt.supabase.co/functions/v1/qz-firmar'

let seguridadLista = false
function configurarSeguridad() {
  if (seguridadLista) return
  seguridadLista = true
  qz.security.setCertificatePromise((resolve: (c: string) => void) => resolve(CERTIFICADO))
  qz.security.setSignatureAlgorithm('SHA512')
  qz.security.setSignaturePromise((toSign: string) => (resolve: (s: string) => void, reject: (e: unknown) => void) => {
    fetch(`${FIRMA_URL}?request=${encodeURIComponent(toSign)}`)
      .then((r) => r.text())
      .then(resolve)
      .catch(reject)
  })
}

// Intenta conectar con QZ Tray. Devuelve true si está disponible.
export async function conectarQZ(): Promise<boolean> {
  configurarSeguridad()
  try {
    if (qz.websocket.isActive()) return true
    await qz.websocket.connect()
    return true
  } catch {
    return false
  }
}

export function qzActivo(): boolean {
  try {
    return qz.websocket.isActive()
  } catch {
    return false
  }
}

// Imprime un HTML en la impresora predeterminada vía QZ Tray (ancho del papel en mm).
export async function imprimirHTML(html: string, anchoMm: number): Promise<void> {
  const ok = await conectarQZ()
  if (!ok) throw new Error('QZ Tray no está disponible (¿instalado y abierto?)')
  const printer = await qz.printers.getDefault()
  if (!printer) throw new Error('No hay una impresora predeterminada en Windows')
  const config = qz.configs.create(printer, {
    units: 'mm',
    size: { width: anchoMm, height: null },
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  })
  await qz.print(config, [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }])
}
