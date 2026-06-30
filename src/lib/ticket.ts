// Generador del ticket térmico de la factura (HTML autónomo para imprimir por QZ Tray).
// Lo usan Facturación (reimprimir) y Caja (cobrar e imprimir), para que el recibo
// se vea EXACTAMENTE igual desde cualquier lado.
import { Factura, FacturaItem } from '../types'
import { Negocio } from './negocio'
import { money, codigoFactura, fechaCorta, horaCorta } from './format'

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))

const fila = (a: string, b: string, bold = false) =>
  `<div class="row"${bold ? ' style="font-weight:700;font-size:12.5px;border-top:1px solid #000;padding-top:4px;margin-top:3px"' : ''}><span>${a}</span><span>${b}</span></div>`

export function construirTicketFactura(p: {
  negocio: Negocio
  factura: Factura
  items: FacturaItem[]
  cliente?: string   // texto ya formateado (código · nombre); si falta, usa cliente_nombre
  devuelto?: number  // total de notas de crédito (devoluciones de mercancía)
}): string {
  const { negocio, factura: f, items: its } = p
  const cliente = p.cliente ?? (f.cliente_nombre ?? '')
  const devuelto = p.devuelto ?? 0
  const filas = its
    .map(
      (it) => `
      <tr>
        <td style="text-align:left;padding:1px 0;vertical-align:top">${esc(it.descripcion)}${(it as any).empleado?.nombre ? `<div style="font-size:9px">por ${esc((it as any).empleado.nombre)}</div>` : ''}</td>
        <td style="text-align:center;padding:1px 2px;vertical-align:top">${esc(it.cantidad)}</td>
        <td style="text-align:right;padding:1px 0;vertical-align:top">${esc(money(it.importe))}</td>
      </tr>`,
    )
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
      *{margin:0;padding:0;box-sizing:border-box;color:#000;text-transform:uppercase}
      body{font-family:'Inter',Arial,sans-serif;font-size:10px;line-height:1.4;padding:3mm 4mm;font-variant-numeric:tabular-nums}
      .marca{font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-weight:800;font-size:17px;text-align:center;line-height:1.1;letter-spacing:.6px}
      .c{text-align:center}.muted{font-size:9px;letter-spacing:.2px}.b{font-weight:700}
      table{width:100%;border-collapse:collapse;table-layout:fixed}
      th,td{font-size:9.5px;padding:2px 0;vertical-align:top;word-break:break-word;overflow-wrap:anywhere}
      .row{display:flex;justify-content:space-between;font-size:10px;margin:1.5px 0}
      .sep{border-bottom:1px dotted #000;margin:4px 0}
    </style></head><body>
      <div class="marca">${esc(negocio.nombre)}</div>
      ${negocio.rnc ? `<div class="c muted">RNC: ${esc(negocio.rnc)}</div>` : ''}
      <div class="c muted">${esc(negocio.direccion)}${negocio.referencia ? ' · ' + esc(negocio.referencia) : ''}</div>
      <div class="c muted">Tel ${esc(negocio.telefono)}${negocio.whatsapp ? ' · WhatsApp ' + esc(negocio.whatsapp) : ''}</div>
      ${negocio.instagram ? `<div class="c muted">${esc(negocio.instagram)}</div>` : ''}
      <div class="c muted" style="margin-top:4px">Factura ${esc(codigoFactura(f))} · ${f.tipo_venta === 'CREDITO' ? 'Crédito' : 'Contado'}</div>
      <div class="c muted">${esc(fechaCorta(f.fecha))}${f.created_at ? ' · ' + esc(horaCorta(f.created_at)) : ''}</div>
      <div class="sep"></div>
      <div class="muted">Cliente: ${esc(cliente)}</div>
      <div class="muted">Estado: ${esc(f.estado)}</div>
      ${f.metodo_pago ? `<div class="muted">Pago: ${esc(f.metodo_pago)}</div>` : ''}
      <div class="sep"></div>
      <table>
        <colgroup><col style="width:56%"><col style="width:14%"><col style="width:30%"></colgroup>
        <thead><tr>
          <th class="b" style="text-align:left;border-bottom:1px dotted #000;padding-bottom:3px">Descripción</th>
          <th class="b" style="text-align:center;border-bottom:1px dotted #000;padding-bottom:3px">Cant.</th>
          <th class="b" style="text-align:right;border-bottom:1px dotted #000;padding-bottom:3px">Importe</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <div class="sep"></div>
      ${fila('Subtotal', money(f.subtotal))}
      ${f.descuento > 0 ? fila('Descuento', '- ' + money(f.descuento)) : ''}
      ${f.itbis > 0 ? fila('ITBIS', money(f.itbis)) : ''}
      ${fila('Total', money(f.total), true)}
      ${f.efectivo_recibido != null ? fila('Paga con', money(f.efectivo_recibido)) : ''}
      ${f.efectivo_recibido != null ? fila('Devuelta', money(f.devuelta ?? 0)) : ''}
      ${devuelto > 0 ? fila('Devuelto (mercancía)', '- ' + money(devuelto)) : ''}
      <div class="c muted" style="margin-top:10px">¡Gracias por su compra!</div>
    </body></html>`
}
