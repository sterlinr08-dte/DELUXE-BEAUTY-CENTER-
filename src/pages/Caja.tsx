import { useEffect, useState } from 'react'
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock, Unlock, History } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CajaSesion, CajaMovimiento } from '../types'
import { money, fechaHora } from '../lib/format'
import { useAuth } from '../lib/auth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

// Denominaciones de pesos dominicanos (billetes y monedas) para el arqueo
const DENOMS = [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1]

export default function Caja() {
  const { perfil } = useAuth()
  const usuario = perfil?.nombre || perfil?.username || 'Usuario'

  const [sesion, setSesion] = useState<CajaSesion | null>(null)
  const [movs, setMovs] = useState<CajaMovimiento[]>([])
  const [historial, setHistorial] = useState<CajaSesion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // modales
  const [abrirOpen, setAbrirOpen] = useState(false)
  const [movOpen, setMovOpen] = useState(false)
  const [cerrarOpen, setCerrarOpen] = useState(false)

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
      const { data: m } = await supabase
        .from('caja_movimientos')
        .select('*')
        .eq('caja_id', abierta.id)
        .order('created_at', { ascending: false })
      setMovs(m ?? [])
    } else {
      setMovs([])
    }
    setSesion(abierta ?? null)

    const { data: hist } = await supabase
      .from('caja_sesiones')
      .select('*')
      .eq('estado', 'CERRADA')
      .order('cerrada_at', { ascending: false })
      .limit(20)
    setHistorial(hist ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const entradas = movs.filter((m) => m.tipo === 'ENTRADA').reduce((s, m) => s + Number(m.monto), 0)
  const salidas = movs.filter((m) => m.tipo === 'SALIDA').reduce((s, m) => s + Number(m.monto), 0)
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

  function abrirCierre() {
    setConteo({})
    setCierreNotas('')
    setCerrarOpen(true)
  }

  async function cerrarCaja() {
    if (!sesion) return
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
          sesion ? (
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
          <button className="btn-primary" onClick={() => setAbrirOpen(true)}>
            <Unlock size={16} /> Abrir caja
          </button>
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

          {/* Movimientos */}
          <div className="panel-3d p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-slate-800">Movimientos</h2>
              <div className="flex gap-2">
                <button className="btn-ghost !text-emerald-700" onClick={() => nuevoMov('ENTRADA')}>
                  <ArrowDownCircle size={16} /> Entrada
                </button>
                <button className="btn-ghost !text-rose-700" onClick={() => nuevoMov('SALIDA')}>
                  <ArrowUpCircle size={16} /> Salida
                </button>
              </div>
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

      {/* Modal cerrar caja */}
      <Modal
        open={cerrarOpen}
        title="Cerrar caja"
        onClose={() => setCerrarOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setCerrarOpen(false)}>Cancelar</button>
            <button className="btn-danger" onClick={cerrarCaja} disabled={saving}>{saving ? 'Cerrando…' : 'Cerrar caja'}</button>
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
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input" rows={2} value={cierreNotas} onChange={(e) => setCierreNotas(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
