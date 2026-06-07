import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Receipt, ShoppingCart, Wallet, Users, Scale } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { money } from '../lib/format'
import PageHeader from '../components/PageHeader'

interface Resumen {
  ingresos: number
  facturasPendientes: number
  gastos: number
  compras: number
  nomina: number
}

function mesActual(): string {
  return new Date().toISOString().slice(0, 7)
}

// Primer y último día del mes (YYYY-MM)
function rango(mes: string): { desde: string; hasta: string } {
  const [y, m] = mes.split('-').map(Number)
  const desde = `${mes}-01`
  const ultimo = new Date(y, m, 0).getDate()
  const hasta = `${mes}-${String(ultimo).padStart(2, '0')}`
  return { desde, hasta }
}

export default function Contabilidad() {
  const [mes, setMes] = useState(mesActual())
  const [r, setR] = useState<Resumen>({ ingresos: 0, facturasPendientes: 0, gastos: 0, compras: 0, nomina: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { desde, hasta } = rango(mes)
      const [fact, gas, com, nom] = await Promise.all([
        supabase.from('facturas').select('total,estado').gte('fecha', desde).lte('fecha', hasta),
        supabase.from('gastos').select('monto').gte('fecha', desde).lte('fecha', hasta),
        supabase.from('compras').select('total').gte('fecha', desde).lte('fecha', hasta),
        supabase.from('pagos_empleados').select('monto').gte('fecha', desde).lte('fecha', hasta),
      ])
      const facturas = fact.data ?? []
      setR({
        ingresos: facturas.filter((f: any) => f.estado === 'PAGADA').reduce((s: number, f: any) => s + Number(f.total), 0),
        facturasPendientes: facturas.filter((f: any) => f.estado === 'PENDIENTE').reduce((s: number, f: any) => s + Number(f.total), 0),
        gastos: (gas.data ?? []).reduce((s: number, g: any) => s + Number(g.monto), 0),
        compras: (com.data ?? []).reduce((s: number, c: any) => s + Number(c.total), 0),
        nomina: (nom.data ?? []).reduce((s: number, p: any) => s + Number(p.monto), 0),
      })
      setLoading(false)
    })()
  }, [mes])

  const egresos = r.gastos + r.compras + r.nomina
  const utilidad = r.ingresos - egresos

  const filas = [
    { label: 'Ingresos (facturas pagadas)', valor: r.ingresos, icon: Receipt, color: 'text-emerald-600 bg-emerald-50', signo: '+' },
    { label: 'Compras', valor: r.compras, icon: ShoppingCart, color: 'text-rose-600 bg-rose-50', signo: '−' },
    { label: 'Gastos', valor: r.gastos, icon: Wallet, color: 'text-rose-600 bg-rose-50', signo: '−' },
    { label: 'Pagos a empleados', valor: r.nomina, icon: Users, color: 'text-rose-600 bg-rose-50', signo: '−' },
  ]

  return (
    <div>
      <PageHeader
        title="Contabilidad"
        subtitle="Resumen de ingresos y egresos por mes"
        action={<input type="month" className="input w-auto" value={mes} onChange={(e) => setMes(e.target.value)} />}
      />

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="card">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><TrendingUp size={20} /></div>
              <p className="text-2xl font-bold text-emerald-600">{money(r.ingresos)}</p>
              <p className="text-sm text-slate-500">Ingresos del mes</p>
            </div>
            <div className="card">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><TrendingDown size={20} /></div>
              <p className="text-2xl font-bold text-rose-600">{money(egresos)}</p>
              <p className="text-sm text-slate-500">Egresos del mes</p>
            </div>
            <div className={`card ${utilidad >= 0 ? 'ring-emerald-100' : 'ring-rose-100'}`}>
              <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg ${utilidad >= 0 ? 'bg-brand-50 text-brand-600' : 'bg-rose-50 text-rose-600'}`}><Scale size={20} /></div>
              <p className={`text-2xl font-bold ${utilidad >= 0 ? 'text-brand-700' : 'text-rose-600'}`}>{money(utilidad)}</p>
              <p className="text-sm text-slate-500">Utilidad neta</p>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 font-display text-lg font-bold text-slate-800">Desglose</h2>
            <ul className="divide-y divide-slate-50">
              {filas.map((f) => (
                <li key={f.label} className="flex items-center gap-4 py-3">
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${f.color}`}><f.icon size={18} /></div>
                  <span className="flex-1 text-slate-700">{f.label}</span>
                  <span className={`font-semibold ${f.signo === '+' ? 'text-emerald-600' : 'text-rose-600'}`}>{f.signo} {money(f.valor)}</span>
                </li>
              ))}
              <li className="flex items-center gap-4 py-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Scale size={18} /></div>
                <span className="flex-1 font-semibold text-slate-800">Utilidad neta</span>
                <span className={`text-lg font-bold ${utilidad >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{money(utilidad)}</span>
              </li>
            </ul>
            {r.facturasPendientes > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                ⚠️ Hay {money(r.facturasPendientes)} en facturas <strong>pendientes</strong> de cobro este mes (no se cuentan como ingreso hasta marcarlas pagadas).
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
