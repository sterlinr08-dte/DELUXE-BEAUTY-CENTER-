import { useEffect, useState } from 'react'
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock, Unlock, History, Receipt, HandCoins } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CajaSesion, CajaMovimiento, Factura } from '../types'
import { money, fechaHora } from '../lib/format'
import { METODOS_PAGO } from '../lib/constants'
import { useAuth } from '../lib/auth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

// Denominaciones de pesos dominicanos (billetes y monedas) para el arqueo
const DENOMS = [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1]

export default function Caja() {
  const { perfil, puedeAccion } = useAuth()
  const usuario = perfil?.nombre || perfil?.username || 'Usuario'
  const puedeAbrir = puedeAccion('caja.abrir')
  const puedeMover = puedeAccion('caja.movimiento')
  const puedeCobrar = puedeAccion('facturas.cobrar')
  const puedeCerrarDescuadre = puedeAccion('caja.cerrar_descuadre')

  const [sesion, setSesion] = useState<CajaSesion | null>(null)
  const [movs, setMovs] = useState<CajaMovimiento[]>([])
  const [historial, setHistorial] = useState<CajaSesion[]>([])
  const [pendientes, setPendientes] = useState<Factura[]>([])
  const [cobros, setCobros] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // modales
  const [abrirOpen, setAbrirOpen] = useState(false)
  const [movOpen, setMovOpen] = useState(false)
  const [cerrarOpen, setCerrarOpen] = useState(false)
  const [cobrarFactura, setCobrarFactura] = useState<Factura | null>(null)
  const [metodoCobro, setMetodoCobro] = useState('Efectivo')

  // formularios
  const [montoInicial, setMontoInicial] = useState(0)
  const [movTipo, setMovTipo] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA')
  const [movConcepto, setMovConcepto] = useState('')
  const [movMonto, setMovMonto] = useState(0)
  const [conteo, setConteo] = useState<Record<number, number>>({})
  const [cierreNotas, setCierreNotas] = useState('')

  async function cargar() {
    setLoading(true)
    const { data: abierta } = await supabase
      .from('caja_sesiones')
      .select('*')
      .eq('estado', 'ABIERTA')
      .order('abierta_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (abierta) {
      const [{ data: m }, { data: c }] = await Promise.all([
        supabase.from('caja_movimientos').select('*').eq('caja_id', abierta.id).order('created_at', { ascending: false }),
        supabase.from('facturas').select('*').eq('caja_id', abierta.id).eq('estado', 'PAGADA'),
      ])
      setMovs(m ?? [])
      setCobros(c ?? [])
    } else {
      setMovs([])
      setCobros([])
    }
    setSesion(abierta ?? null)

    const { data: hist } = await supabase
      .from('caja_sesiones')
      .select('*')
      .eq('estado', 'CERRADA')
      .order('cerrada_at', { ascending: false })
      .limit(20)
    setHistorial(hist ?? [])

    // Facturas pendientes de cobro
    const { data: pend } = await supabase
      .from('facturas')
      .select('*')
      .eq('estado', 'PENDIENTE')
      .order('numero', { ascending: false })
    setPendientes(pend ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const entradas = movs.filter((m) => m.tipo === 'ENTRADA').reduce((s, m) => s + Number(m.monto), 0)
  const salidas = movs.filter((m) => m.tipo === 'SALIDA').reduce((s, m) => s + Number(m.monto), 0)
  // Cobros del día agrupados por método de pago
  const porMetodo = METODOS_PAGO.map((m) => ({
    metodo: m,
    cantidad: cobros.filter((f) => (f.metodo_pago ?? 'Efectivo') === m).length,
    total: cobros.filter((f) => (f.metodo_pago ?? 'Efectivo') === m).reduce((s, f) => s + Number(f.total), 0),
  })).filter((x) => x.cantidad > 0)
  const totalCobrado = cobros.reduce((s, f) => s + Number(f.total), 0)

  const esperado = (sesion ? Number(sesion.monto_inicial) : 0) + entradas - salidas
  const contado = DENOMS.reduce((s, d) => s + d * (conteo[d] || 0), 0)
  const diferencia = contado - esperado

  async function abrirCaja() {
    setSaving(true)
    const { error } = await supabase.from('caja_sesiones').insert({
      monto_inicial: montoInicial,
      abierta_por: usuario,
      estado: 'ABIERTA',
    })
    setSaving(false)
    if (error) return alert('Error al abrir caja: ' + error.message)
    setAbrirOpen(false)
    setMontoInicial(0)
    cargar()
  }

  function nuevoMov(tipo: 'ENTRADA' | 'SALIDA') {
    setMovTipo(tipo)
    setMovConcepto('')
    setMovMonto(0)
    setMovOpen(true)
  }

  async function guardarMov() {
    if (!movConcepto.trim()) return alert('Escribe el concepto')
    if (movMonto <= 0) return alert('El monto debe ser mayor que 0')
    if (!sesion) return
    setSaving(true)
    const { error } = await supabase.from('caja_movimientos').insert({
      caja_id: sesion.id,
      tipo: movTipo,
      concepto: movConcepto,
      monto: movMonto,
    })
    setSaving(false)
    if (error) return alert('Error al guardar movimiento: ' + error.message)
    setMovOpen(false)
    cargar()
  }

  function iniciarCobro(f: Factura) {
    setCobrarFactura(f)
    setMetodoCobro('Efectivo')
  }

  async function confirmarCobro() {
    if (!cobrarFactura || !sesion) return
    setSaving(true)
    // 1) Marcar la factura como pagada y vincularla a esta caja
    const { error: e1 } = await supabase
      .from('facturas')
      .update({ estado: 'PAGADA', metodo_pago: metodoCobro, caja_id: sesion.id })
      .eq('id', cobrarFactura.id)
    if (e1) {
      setSaving(false)
      return alert('Error al cobrar: ' + e1.message)
    }
    // 2) Si fue en efectivo, registrar la entrada en la caja
    if (metodoCobro === 'Efectivo') {
      await supabase.from('caja_movimientos').insert({
        caja_id: sesion.id,
        tipo: 'ENTRADA',
        concepto: `Factura #${cobrarFactura.numero} · ${cobrarFactura.cliente_nombre ?? 'Cliente'}`,
        monto: cobrarFactura.total,
        factura_id: cobrarFactura.id,
      })
    }
    setSaving(false)
    setCobrarFactura(null)
    cargar()
  }

  function abrirCierre() {
    setConteo({})
    setCierreNotas('')
    setCerrarOpen(true)
  }

  const bloqueadoPorDescuadre = diferencia !== 0 && !puedeCerrarDescuadre

  async function cerrarCaja() {
    if (!sesion) return
    if (bloqueadoPorDescuadre) {
      return alert(
        `Hay un descuadre de ${money(Math.abs(diferencia))}. No tienes permiso para cerrar la caja con diferencia. ` +
          'Cuenta de nuevo el efectivo o solicita a un supervisor/administrador que la cierre.'
      )
    }
    setSaving(true)
    const detalle = DENOMS.filter((d) => conteo[d]).map((d) => `${conteo[d]}×${d}`).join(', ')
    const notas = [detalle ? `Arqueo: ${detalle}` : '', cierreNotas].filter(Boolean).join(' · ')
    const { error } = await supabase
      .from('caja_sesiones')
      .update({
        estado: 'CERRADA',
        cerrada_at: new Date().toISOString(),
        cerrada_por: usuario,
        monto_contado: contado,
        diferencia: contado - esperado,
        notas: notas || null,
      })
      .eq('id', sesion.id)
    setSaving(false)
    if (error) return alert('Error al cerrar caja: ' + error.message)
    setCerrarOpen(false)
    cargar()
  }

  return (
    <div>
      <PageHeader
        title="Caja"
        subtitle="Control de efectivo: apertura, movimientos y cierre"
        action={
          !puedeAbrir ? null : sesion ? (
            <button className="btn-danger" onClick={abrirCierre}>
              <Lock size={16} /> Cerrar caja
            </button>
          ) : (
            <button className="btn-primary" onClick={() => setAbrirOpen(true)}>
              <Unlock size={16} /> Abrir caja
            </button>
          )
        }
      />

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : !sesion ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Wallet className="text-brand-300" size={40} />
          <p className="text-slate-500">No hay una caja abierta.</p>
          {puedeAbrir ? (
            <button className="btn-primary" onClick={() => setAbrirOpen(true)}>
              <Unlock size={16} /> Abrir caja
            </button>
          ) : (
            <p className="text-xs text-slate-400">No tienes permiso para abrir la caja.</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <p className="text-sm text-slate-500">Fondo inicial</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{money(sesion.monto_inicial)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-slate-500">Entradas</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{money(entradas)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-slate-500">Salidas</p>
              <p className="mt-1 text-2xl font-bold text-rose-600">{money(salidas)}</p>
            </div>
            <div className="card bg-gradient-to-br from-brand-600 to-brand-500 !ring-brand-400/30">
              <p className="text-sm text-white/80">Efectivo esperado</p>
              <p className="mt-1 text-2xl font-bold text-white">{money(esperado)}</p>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Caja #{sesion.numero} · abierta por {sesion.abierta_por} · {fechaHora(sesion.abierta_at)}
          </p>

          {/* Resumen de cobros por método de pago */}
          <div className="panel-3d p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-800">
                <HandCoins size={18} /> Cobros de esta caja
              </h2>
              <div className="text-right">
                <p className="text-xs text-slate-400">{cobros.length} factura(s)</p>
                <p className="text-lg font-bold text-brand-700">{money(totalCobrado)}</p>
              </div>
            </div>
            {porMetodo.length === 0 ? (
              <p className="py-3 text-center text-slate-400">Aún no se ha cobrado ninguna factura en esta caja.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {porMetodo.map((x) => (
                  <div key={x.metodo} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{x.metodo}</p>
                      <p className="text-xs text-slate-400">{x.cantidad} factura(s)</p>
                    </div>
                    <p className="font-bold text-slate-800">{money(x.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Facturas por cobrar */}
          {puedeCobrar && (
            <div className="panel-3d p-5">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-800">
                <Receipt size={18} /> Facturas por cobrar
                {pendientes.length > 0 && <span className="badge bg-amber-50 text-amber-700">{pendientes.length}</span>}
              </h2>
              {pendientes.length === 0 ? (
                <p className="py-4 text-center text-slate-400">No hay facturas pendientes de cobro.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {pendientes.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 py-3">
                      <span className="font-mono font-semibold text-slate-500">#{f.numero}</span>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{f.cliente_nombre ?? 'Cliente'}</p>
                        <p className="text-xs text-slate-400">{fechaHora(f.created_at)}</p>
                      </div>
                      <span className="font-semibold text-slate-800">{money(f.total)}</span>
                      <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => iniciarCobro(f)}>
                        <HandCoins size={14} /> Cobrar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Movimientos */}
          <div className="panel-3d p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-slate-800">Movimientos</h2>
              {puedeMover && (
                <div className="flex gap-2">
                  <button className="btn-ghost !text-emerald-700" onClick={() => nuevoMov('ENTRADA')}>
                    <ArrowDownCircle size={16} /> Entrada
                  </button>
                  <button className="btn-ghost !text-rose-700" onClick={() => nuevoMov('SALIDA')}>
                    <ArrowUpCircle size={16} /> Salida
                  </button>
                </div>
              )}
            </div>
            {movs.length === 0 ? (
              <p className="py-6 text-center text-slate-400">Aún no hay movimientos en esta caja.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {movs.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    {m.tipo === 'ENTRADA' ? (
                      <ArrowDownCircle className="text-emerald-500" size={20} />
                    ) : (
                      <ArrowUpCircle className="text-rose-500" size={20} />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{m.concepto}</p>
                      <p className="text-xs text-slate-400">{fechaHora(m.created_at)}</p>
                    </div>
                    <span className={`font-semibold ${m.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.tipo === 'ENTRADA' ? '+' : '−'}{money(m.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Historial de cierres */}
      {historial.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-slate-800">
            <History size={18} /> Cierres anteriores
          </h2>
          <div className="overflow-x-auto panel-3d">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="thead-3d">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Cerrada</th>
                  <th className="px-5 py-3 text-right">Inicial</th>
                  <th className="px-5 py-3 text-right">Esperado</th>
                  <th className="px-5 py-3 text-right">Contado</th>
                  <th className="px-5 py-3 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historial.map((s) => {
                  const esp = s.monto_contado != null && s.diferencia != null ? Number(s.monto_contado) - Number(s.diferencia) : null
                  const dif = Number(s.diferencia ?? 0)
                  return (
                    <tr key={s.id}>
                      <td className="px-5 py-3 font-mono font-semibold text-brand-700">#{s.numero}</td>
                      <td className="px-5 py-3 text-slate-600">{fechaHora(s.cerrada_at)}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{money(s.monto_inicial)}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{esp != null ? money(esp) : '—'}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800">{money(s.monto_contado)}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`badge ${dif === 0 ? 'bg-emerald-50 text-emerald-700' : dif > 0 ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'}`}>
                          {dif > 0 ? '+' : ''}{money(dif)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal abrir caja */}
      <Modal
        open={abrirOpen}
        title="Abrir caja"
        onClose={() => setAbrirOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setAbrirOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={abrirCaja} disabled={saving}>{saving ? 'Abriendo…' : 'Abrir caja'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Indica el efectivo con el que inicia la caja (fondo).</p>
          <div>
            <label className="label">Fondo inicial (RD$)</label>
            <input type="number" min={0} step={100} className="input" value={montoInicial} onChange={(e) => setMontoInicial(Number(e.target.value))} />
          </div>
        </div>
      </Modal>

      {/* Modal movimiento */}
      <Modal
        open={movOpen}
        title={movTipo === 'ENTRADA' ? 'Registrar entrada de efectivo' : 'Registrar salida de efectivo'}
        onClose={() => setMovOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setMovOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardarMov} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Concepto</label>
            <input className="input" value={movConcepto} onChange={(e) => setMovConcepto(e.target.value)} placeholder={movTipo === 'ENTRADA' ? 'Venta en efectivo, abono…' : 'Compra, retiro, propina…'} />
          </div>
          <div>
            <label className="label">Monto (RD$)</label>
            <input type="number" min={0} step={50} className="input" value={movMonto} onChange={(e) => setMovMonto(Number(e.target.value))} />
          </div>
        </div>
      </Modal>

      {/* Modal cobrar factura */}
      <Modal
        open={!!cobrarFactura}
        title={`Cobrar factura #${cobrarFactura?.numero ?? ''}`}
        onClose={() => setCobrarFactura(null)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setCobrarFactura(null)}>Cancelar</button>
            <button className="btn-primary" onClick={confirmarCobro} disabled={saving}>{saving ? 'Cobrando…' : `Cobrar ${money(cobrarFactura?.total)}`}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between py-1"><span className="text-slate-500">Cliente</span><span className="font-medium">{cobrarFactura?.cliente_nombre ?? 'Cliente'}</span></div>
            <div className="flex justify-between py-1"><span className="text-slate-500">Total a cobrar</span><span className="font-bold text-slate-900">{money(cobrarFactura?.total)}</span></div>
          </div>
          <div>
            <label className="label">Método de pago</label>
            <select className="input" value={metodoCobro} onChange={(e) => setMetodoCobro(e.target.value)}>
              {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              {metodoCobro === 'Efectivo'
                ? 'Se registrará como entrada de efectivo en esta caja.'
                : 'Pago no en efectivo: se marca la factura como pagada sin afectar el efectivo de la caja.'}
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal cerrar caja / arqueo */}
      <Modal
        open={cerrarOpen}
        title="Arqueo y cierre de caja"
        onClose={() => setCerrarOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setCerrarOpen(false)}>Cancelar</button>
            <button className="btn-danger" onClick={cerrarCaja} disabled={saving || bloqueadoPorDescuadre} title={bloqueadoPorDescuadre ? 'No puedes cerrar con descuadre' : ''}>
              {saving ? 'Cerrando…' : 'Cerrar caja'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between py-1"><span className="text-slate-500">Fondo inicial</span><span className="font-medium">{money(sesion?.monto_inicial)}</span></div>
            <div className="flex justify-between py-1"><span className="text-slate-500">Entradas</span><span className="font-medium text-emerald-600">+{money(entradas)}</span></div>
            <div className="flex justify-between py-1"><span className="text-slate-500">Salidas</span><span className="font-medium text-rose-600">−{money(salidas)}</span></div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-2"><span className="font-semibold text-slate-700">Efectivo esperado</span><span className="font-bold text-slate-900">{money(esperado)}</span></div>
          </div>
          <div>
            <label className="label">Arqueo de caja — cuenta los billetes y monedas</label>
            <div className="grid grid-cols-2 gap-2">
              {DENOMS.map((d) => (
                <div key={d} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                  <span className="w-16 shrink-0 text-right text-xs font-semibold text-slate-600">RD${d}</span>
                  <span className="text-slate-300">×</span>
                  <input
                    type="number"
                    min={0}
                    className="input !py-1 !px-2 text-sm"
                    value={conteo[d] || 0}
                    onChange={(e) => setConteo({ ...conteo, [d]: Math.max(0, Number(e.target.value)) })}
                  />
                  <span className="w-20 shrink-0 text-right text-xs text-slate-500">{money(d * (conteo[d] || 0))}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between rounded-xl bg-slate-100 px-4 py-2.5 text-sm">
            <span className="font-semibold text-slate-700">Total contado</span>
            <span className="font-bold text-slate-900">{money(contado)}</span>
          </div>
          <div className={`rounded-xl p-3 text-center text-sm font-semibold ${diferencia === 0 ? 'bg-emerald-50 text-emerald-700' : diferencia > 0 ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'}`}>
            {diferencia === 0 ? 'Caja cuadrada ✓' : diferencia > 0 ? `Sobrante: ${money(diferencia)}` : `Faltante: ${money(Math.abs(diferencia))}`}
          </div>
          {bloqueadoPorDescuadre && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-medium text-rose-700">
              ⚠️ Hay un descuadre. No tienes permiso para cerrar la caja con diferencia.
              Vuelve a contar el efectivo o pide a un supervisor/administrador que la cierre.
            </div>
          )}
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input" rows={2} value={cierreNotas} onChange={(e) => setCierreNotas(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
