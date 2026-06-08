import { useEffect, useState } from 'react'
import { Search, HandCoins, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Factura, FacturaAbono } from '../types'
import { money, fechaCorta, hoyISO, codigoFactura } from '../lib/format'
import { METODOS_PAGO } from '../lib/constants'
import { useAuth } from '../lib/auth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface FilaCobro extends Factura {
  abonado: number
  saldo: number
}

export default function CuentasPorCobrar() {
  const { perfil, puedeAccion } = useAuth()
  const puedeCobrar = puedeAccion('creditos.cobrar')

  const [filas, setFilas] = useState<FilaCobro[]>([])
  const [abonosByFactura, setAbonosByFactura] = useState<Record<string, FacturaAbono[]>>({})
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [verSaldadas, setVerSaldadas] = useState(false)

  // modal de abono
  const [abonoFactura, setAbonoFactura] = useState<FilaCobro | null>(null)
  const [abonoMonto, setAbonoMonto] = useState(0)
  const [abonoMetodo, setAbonoMetodo] = useState('Efectivo')
  const [abonoNotas, setAbonoNotas] = useState('')
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data: facts } = await supabase
      .from('facturas')
      .select('*')
      .eq('tipo_venta', 'CREDITO')
      .neq('estado', 'ANULADA')
      .order('fecha', { ascending: false })
    const lista = (facts ?? []) as Factura[]
    const ids = lista.map((f) => f.id)
    let abonos: FacturaAbono[] = []
    if (ids.length) {
      const { data } = await supabase.from('factura_abonos').select('*').in('factura_id', ids).order('created_at')
      abonos = (data ?? []) as FacturaAbono[]
    }
    const porFactura: Record<string, FacturaAbono[]> = {}
    for (const a of abonos) (porFactura[a.factura_id] ??= []).push(a)
    setAbonosByFactura(porFactura)
    setFilas(
      lista.map((f) => {
        const abonado = (porFactura[f.id] ?? []).reduce((s, a) => s + Number(a.monto), 0)
        return { ...f, abonado, saldo: Math.max(0, Number(f.total) - abonado) }
      }),
    )
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function abrirAbono(f: FilaCobro) {
    setAbonoFactura(f)
    setAbonoMonto(f.saldo)
    setAbonoMetodo('Efectivo')
    setAbonoNotas('')
  }

  async function guardarAbono() {
    if (!abonoFactura) return
    if (abonoMonto <= 0) return alert('El abono debe ser mayor que 0')
    if (abonoMonto > abonoFactura.saldo + 0.01) return alert(`El abono no puede ser mayor que el saldo (${money(abonoFactura.saldo)})`)
    setSaving(true)
    const { error } = await supabase.from('factura_abonos').insert({
      factura_id: abonoFactura.id,
      fecha: hoyISO(),
      monto: abonoMonto,
      metodo_pago: abonoMetodo,
      registrado_por: perfil?.nombre || perfil?.username || null,
      notas: abonoNotas || null,
    })
    if (error) {
      setSaving(false)
      return alert('Error al registrar el abono: ' + error.message)
    }
    // Si el abono salda la deuda, marcar la factura como PAGADA
    const nuevoSaldo = abonoFactura.saldo - abonoMonto
    if (nuevoSaldo <= 0.01) {
      await supabase.from('facturas').update({ estado: 'PAGADA' }).eq('id', abonoFactura.id)
    }
    setSaving(false)
    setAbonoFactura(null)
    cargar()
  }

  const q = busqueda.trim().toLowerCase()
  const visibles = filas
    .filter((f) => (verSaldadas ? true : f.saldo > 0.01))
    .filter((f) => !q || codigoFactura(f).toLowerCase().includes(q) || (f.cliente_nombre ?? '').toLowerCase().includes(q) || f.fecha.includes(q))

  const totalAdeudado = filas.reduce((s, f) => s + f.saldo, 0)
  const clientesConDeuda = new Set(filas.filter((f) => f.saldo > 0.01).map((f) => f.cliente_nombre ?? f.id)).size

  return (
    <div>
      <PageHeader title="Cuentas por cobrar" subtitle="Ventas a crédito y abonos" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Wallet size={20} /></div>
          <div>
            <p className="text-xs text-slate-400">Total por cobrar</p>
            <p className="text-xl font-bold text-slate-800">{money(totalAdeudado)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><HandCoins size={20} /></div>
          <div>
            <p className="text-xs text-slate-400">Clientes que deben</p>
            <p className="text-xl font-bold text-slate-800">{clientesConDeuda}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar por cliente, código o fecha…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={verSaldadas} onChange={(e) => setVerSaldadas(e.target.checked)} />
          Mostrar también las saldadas
        </label>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : visibles.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <HandCoins className="text-brand-300" size={40} />
          <p className="text-slate-500">{filas.length === 0 ? 'No hay ventas a crédito.' : 'No hay cuentas pendientes. ¡Todo cobrado!'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto panel-3d">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="thead-3d">
              <tr>
                <th className="px-5 py-3"># Factura</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Abonado</th>
                <th className="px-5 py-3 text-right">Saldo</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.map((f) => (
                <tr key={f.id}>
                  <td className="px-5 py-3 font-mono font-semibold text-slate-700">{codigoFactura(f)}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{f.cliente_nombre || 'Cliente'}</td>
                  <td className="px-5 py-3 text-slate-500">{fechaCorta(f.fecha)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{money(f.total)}</td>
                  <td className="px-5 py-3 text-right text-emerald-600">{money(f.abonado)}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-800">{money(f.saldo)}</td>
                  <td className="px-5 py-3 text-right">
                    {f.saldo > 0.01 ? (
                      puedeCobrar ? (
                        <button onClick={() => abrirAbono(f)} className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                          <HandCoins size={13} className="-mt-0.5 mr-0.5 inline" /> Registrar abono
                        </button>
                      ) : (
                        <span className="badge bg-amber-50 text-amber-700">Pendiente</span>
                      )
                    ) : (
                      <span className="badge bg-emerald-50 text-emerald-700">Saldada</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL ABONO */}
      <Modal
        open={!!abonoFactura}
        title={`Registrar abono · ${abonoFactura ? codigoFactura(abonoFactura) : ''}`}
        onClose={() => setAbonoFactura(null)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setAbonoFactura(null)}>Cancelar</button>
            <button className="btn-primary" onClick={guardarAbono} disabled={saving}>{saving ? 'Guardando…' : 'Registrar abono'}</button>
          </>
        }
      >
        {abonoFactura && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex justify-between text-slate-600"><span>Cliente</span><span className="font-medium text-slate-800">{abonoFactura.cliente_nombre || 'Cliente'}</span></div>
              <div className="flex justify-between text-slate-600"><span>Total</span><span>{money(abonoFactura.total)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Abonado</span><span className="text-emerald-600">{money(abonoFactura.abonado)}</span></div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-800"><span>Saldo</span><span>{money(abonoFactura.saldo)}</span></div>
            </div>
            <div>
              <label className="label">Monto del abono (RD$)</label>
              <input type="number" min={0} step={50} className="input" value={abonoMonto || ''} onChange={(e) => setAbonoMonto(Number(e.target.value))} />
              <button type="button" className="mt-1 text-xs font-semibold text-brand-600 hover:underline" onClick={() => setAbonoMonto(abonoFactura.saldo)}>Pagar todo el saldo ({money(abonoFactura.saldo)})</button>
            </div>
            <div>
              <label className="label">Método de pago</label>
              <select className="input" value={abonoMetodo} onChange={(e) => setAbonoMetodo(e.target.value)}>
                {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea className="input" rows={2} value={abonoNotas} onChange={(e) => setAbonoNotas(e.target.value)} />
            </div>
            {(abonosByFactura[abonoFactura.id]?.length ?? 0) > 0 && (
              <div>
                <p className="label">Abonos anteriores</p>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 text-sm">
                  {abonosByFactura[abonoFactura.id].map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-slate-500">{fechaCorta(a.fecha)} · {a.metodo_pago || '—'}</span>
                      <span className="font-semibold text-slate-700">{money(a.monto)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
