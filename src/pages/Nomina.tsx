import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Empleado, PagoEmpleado, TipoPagoEmpleado } from '../types'
import { money, fechaCorta, fechaHora, hoyISO, codigoFactura } from '../lib/format'
import { METODOS_PAGO } from '../lib/constants'
import { useNegocio } from '../lib/negocio'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface ReciboPago { empleado: string; tipo: string; periodo: string; monto: number; metodo: string; fecha: string; hora: string }

const tipos: TipoPagoEmpleado[] = ['SALARIO', 'COMISION', 'ADELANTO', 'BONO']

const tipoBadge: Record<TipoPagoEmpleado, string> = {
  SALARIO: 'bg-sky-50 text-sky-700',
  COMISION: 'bg-emerald-50 text-emerald-700',
  ADELANTO: 'bg-amber-50 text-amber-700',
  BONO: 'bg-fuchsia-50 text-fuchsia-700',
}

const vacio = {
  empleado_id: '',
  fecha: hoyISO(),
  periodo: '',
  tipo: 'SALARIO' as TipoPagoEmpleado,
  monto: 0,
  metodo_pago: 'Efectivo',
  notas: '',
}

export default function Nomina() {
  const { negocio } = useNegocio()
  const [recibo, setRecibo] = useState<ReciboPago | null>(null)
  const [items, setItems] = useState<PagoEmpleado[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(vacio)
  const [saving, setSaving] = useState(false)

  // Resumen de comisión: servicios/facturas realizados por el empleado en un rango
  const [comDesde, setComDesde] = useState(hoyISO().slice(0, 7) + '-01')
  const [comHasta, setComHasta] = useState(hoyISO())
  const [comItems, setComItems] = useState<any[]>([])
  const [comLoading, setComLoading] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('pagos_empleados').select('*').order('fecha', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  async function cargarEmpleados() {
    const { data } = await supabase.from('empleados').select('*').order('nombre')
    setEmpleados(data ?? [])
  }

  useEffect(() => {
    cargar()
    cargarEmpleados()
  }, [])

  // Carga los servicios realizados por el empleado (facturas pagadas) en el rango
  useEffect(() => {
    if (!open || !form.empleado_id) {
      setComItems([])
      return
    }
    let cancel = false
    ;(async () => {
      setComLoading(true)
      const { data } = await supabase
        .from('factura_items')
        .select('descripcion,cantidad,importe, facturas!inner(numero,tipo_venta,serie,fecha,estado)')
        .eq('empleado_id', form.empleado_id)
        .eq('facturas.estado', 'PAGADA')
        .gte('facturas.fecha', comDesde)
        .lte('facturas.fecha', comHasta)
        .order('fecha', { foreignTable: 'facturas', ascending: true })
      if (!cancel) {
        setComItems(data ?? [])
        setComLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [open, form.empleado_id, comDesde, comHasta])

  const empSel = empleados.find((e) => e.id === form.empleado_id)
  const comTotal = comItems.reduce((s, it) => s + Number(it.importe), 0)
  const comPct = Number(empSel?.comision_pct ?? 0)
  const comMonto = Math.round((comTotal * comPct) / 100)

  const totalMes = items
    .filter((p) => p.fecha.slice(0, 7) === hoyISO().slice(0, 7))
    .reduce((s, p) => s + Number(p.monto), 0)

  function abrirNuevo() {
    setEditId(null)
    setForm(vacio)
    setOpen(true)
  }

  function abrirEditar(p: PagoEmpleado) {
    setEditId(p.id)
    setForm({
      empleado_id: p.empleado_id ?? '',
      fecha: p.fecha,
      periodo: p.periodo ?? '',
      tipo: p.tipo,
      monto: Number(p.monto),
      metodo_pago: p.metodo_pago ?? 'Efectivo',
      notas: p.notas ?? '',
    })
    setOpen(true)
  }

  async function guardar(imprimir = false) {
    if (!form.empleado_id) return alert('Selecciona un empleado')
    if (form.monto <= 0) return alert('El monto debe ser mayor que 0')
    setSaving(true)
    const emp = empleados.find((e) => e.id === form.empleado_id)
    const payload = {
      empleado_id: form.empleado_id,
      empleado_nombre: emp?.nombre ?? null,
      fecha: form.fecha,
      periodo: form.periodo || null,
      tipo: form.tipo,
      monto: form.monto,
      metodo_pago: form.metodo_pago,
      notas: form.notas || null,
    }
    const { error } = editId
      ? await supabase.from('pagos_empleados').update(payload).eq('id', editId)
      : await supabase.from('pagos_empleados').insert(payload)
    setSaving(false)
    if (error) return alert('Error al guardar: ' + error.message)
    if (imprimir) {
      setRecibo({ empleado: emp?.nombre ?? 'Empleado', tipo: form.tipo, periodo: form.periodo, monto: form.monto, metodo: form.metodo_pago, fecha: form.fecha, hora: new Date().toISOString() })
      setTimeout(() => window.print(), 400)
    }
    setOpen(false)
    cargar()
  }

  async function eliminar(p: PagoEmpleado) {
    if (!confirm('¿Eliminar este pago?')) return
    const { error } = await supabase.from('pagos_empleados').delete().eq('id', p.id)
    if (error) return alert('Error al eliminar: ' + error.message)
    cargar()
  }

  return (
    <div>
      <PageHeader
        title="Pagos a empleados"
        subtitle={`Pagado este mes: ${money(totalMes)}`}
        action={
          <button className="btn-primary" onClick={abrirNuevo}>
            <Plus size={16} /> Nuevo pago
          </button>
        }
      />

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Users className="text-brand-300" size={40} />
          <p className="text-slate-500">Aún no hay pagos registrados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto panel-3d">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="thead-3d">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Empleado</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Periodo</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 text-slate-600">{fechaCorta(p.fecha)}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{p.empleado_nombre || '—'}</td>
                  <td className="px-5 py-3"><span className={`badge ${tipoBadge[p.tipo]}`}>{p.tipo}</span></td>
                  <td className="px-5 py-3 text-slate-600">{p.periodo || '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{money(p.monto)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirEditar(p)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
                      <button onClick={() => eliminar(p)} className="rounded-lg p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        title={editId ? 'Editar pago' : 'Nuevo pago a empleado'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn-ghost" onClick={() => guardar(false)} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
            <button className="btn-primary" onClick={() => guardar(true)} disabled={saving}><Printer size={16} /> Guardar e imprimir</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Empleado</label>
            <select className="input" value={form.empleado_id} onChange={(e) => setForm({ ...form, empleado_id: e.target.value })}>
              <option value="">— Selecciona —</option>
              {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre} ({e.puesto})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoPagoEmpleado })}>
                {tipos.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Monto (RD$)</label>
              <input type="number" min={0} step={50} className="input" value={form.monto || ''} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div>
              <label className="label">Periodo</label>
              <input className="input" value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} placeholder="Ej: 1ra quincena junio" />
            </div>
          </div>
          {form.empleado_id && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <label className="label !mb-0">Servicios realizados (para comisión)</label>
                <span className="text-xs text-slate-500">Comisión: {comPct}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-600">Desde</span>
                  <input type="date" className="input" value={comDesde} onChange={(e) => setComDesde(e.target.value)} />
                </div>
                <div>
                  <span className="text-xs text-slate-600">Hasta</span>
                  <input type="date" className="input" value={comHasta} onChange={(e) => setComHasta(e.target.value)} />
                </div>
              </div>

              {comLoading ? (
                <p className="mt-2 text-sm text-slate-500">Calculando…</p>
              ) : comItems.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No realizó servicios pagados en este rango.</p>
              ) : (
                <>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-white/70">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-100">
                        {comItems.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-1 text-slate-600">{fechaCorta(it.facturas?.fecha)} · {it.facturas ? codigoFactura(it.facturas) : ''}</td>
                            <td className="px-2 py-1 text-slate-700">{it.descripcion}{it.cantidad > 1 ? ` ×${it.cantidad}` : ''}</td>
                            <td className="px-2 py-1 text-right font-medium text-slate-700">{money(it.importe)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 space-y-0.5 text-sm">
                    <div className="flex justify-between text-slate-600"><span>{comItems.length} servicio(s) · ventas</span><span>{money(comTotal)}</span></div>
                    <div className="flex justify-between font-semibold text-emerald-700"><span>Comisión ({comPct}%)</span><span>{money(comMonto)}</span></div>
                  </div>
                  <button
                    className="btn-ghost mt-2 w-full"
                    onClick={() => setForm((f) => ({ ...f, tipo: 'COMISION', monto: comMonto, periodo: f.periodo || `${comDesde} a ${comHasta}` }))}
                  >
                    Usar comisión como monto ({money(comMonto)})
                  </button>
                  <p className="mt-1 text-xs text-slate-600">Para un incentivo/bono extra, cambia el tipo a BONO y ajusta el monto.</p>
                </>
              )}
            </div>
          )}

          <div>
            <label className="label">Método de pago</label>
            <select className="input" value={form.metodo_pago} onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}>
              {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* RECIBO DE PAGO A EMPLEADO (imprimible) */}
      <Modal open={!!recibo} title="Recibo de pago" onClose={() => setRecibo(null)}>
        {recibo && (
          <div className="space-y-3">
            <div id="recibo-pago" className="print-area space-y-2 rounded-xl border border-slate-100 p-3 text-sm">
              <div className="text-center">
                <img src={`${import.meta.env.BASE_URL}${negocio.logo}`} alt={negocio.nombre} className="mx-auto mb-1 h-14 rounded-lg bg-black object-contain" />
                <p className="font-display text-base font-bold text-brand-800">{negocio.nombre}</p>
                {negocio.rnc && <p className="text-xs text-slate-500">RNC: {negocio.rnc}</p>}
                <p className="mt-1 text-xs font-semibold text-slate-600">RECIBO DE PAGO</p>
                <p className="text-xs text-slate-600">{fechaHora(recibo.hora)}</p>
              </div>
              <p className="text-slate-600"><span className="font-medium">Empleado:</span> {recibo.empleado}</p>
              <p className="text-slate-600"><span className="font-medium">Concepto:</span> {recibo.tipo}{recibo.periodo ? ` · ${recibo.periodo}` : ''}</p>
              <div className="space-y-0.5 border-t pt-1">
                <div className="flex justify-between text-base font-bold text-slate-800"><span>Monto pagado</span><span>{money(recibo.monto)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Método</span><span>{recibo.metodo}</span></div>
                <div className="flex justify-between text-slate-600"><span>Fecha</span><span>{fechaCorta(recibo.fecha)}</span></div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 text-center text-xs text-slate-500">
                <div className="border-t border-slate-300 pt-1">Firma empleado</div>
                <div className="border-t border-slate-300 pt-1">Firma autoriza</div>
              </div>
              <div className="border-t pt-1 text-center text-xs text-slate-500">
                <p>{negocio.direccion} · {negocio.referencia}</p>
              </div>
            </div>
            <div className="flex gap-2 no-print">
              <button className="btn-ghost flex-1" onClick={() => setRecibo(null)}>Cerrar</button>
              <button className="btn-primary flex-1" onClick={() => window.print()}><Printer size={16} /> Imprimir</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
