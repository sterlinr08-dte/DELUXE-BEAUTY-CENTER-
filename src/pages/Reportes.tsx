import { useEffect, useMemo, useState } from 'react'
import { Boxes, ClipboardList, Receipt, ShoppingCart, Wallet, FileSpreadsheet, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Articulo, Compra, Factura } from '../types'
import { money, fechaCorta, fechaHora, hoyISO, codigoArticulo, codigoFactura } from '../lib/format'
import { useNegocio } from '../lib/negocio'
import { descargarCSV, imprimirTabla } from '../lib/reportes'
import PageHeader from '../components/PageHeader'

type Tab = 'inventario' | 'fisico' | 'ventas' | 'compras' | 'cuadres'

const tabs: { key: Tab; label: string; icon: typeof Boxes; rango: boolean }[] = [
  { key: 'inventario', label: 'Inventario', icon: Boxes, rango: false },
  { key: 'fisico', label: 'Inventario físico', icon: ClipboardList, rango: false },
  { key: 'ventas', label: 'Ventas', icon: Receipt, rango: true },
  { key: 'compras', label: 'Compras', icon: ShoppingCart, rango: true },
  { key: 'cuadres', label: 'Cuadres de caja', icon: Wallet, rango: true },
]

export default function Reportes() {
  const { negocio } = useNegocio()
  const [tab, setTab] = useState<Tab>('inventario')
  const [desde, setDesde] = useState(hoyISO().slice(0, 8) + '01')
  const [hasta, setHasta] = useState(hoyISO())
  const [loading, setLoading] = useState(false)

  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [cuadres, setCuadres] = useState<any[]>([])

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true)
      if (tab === 'inventario' || tab === 'fisico') {
        const { data } = await supabase.from('articulos').select('*').order('codigo')
        if (!cancel) setArticulos(data ?? [])
      } else if (tab === 'ventas') {
        const { data } = await supabase.from('facturas').select('*').gte('fecha', desde).lte('fecha', hasta).order('numero')
        if (!cancel) setFacturas(data ?? [])
      } else if (tab === 'compras') {
        const { data } = await supabase.from('compras').select('*').gte('fecha', desde).lte('fecha', hasta).order('numero')
        if (!cancel) setCompras(data ?? [])
      } else if (tab === 'cuadres') {
        const { data } = await supabase.from('caja_sesiones').select('*').eq('estado', 'CERRADA').order('cerrada_at', { ascending: false })
        const enRango = (data ?? []).filter((s: any) => {
          const d = (s.cerrada_at ?? '').slice(0, 10)
          return d >= desde && d <= hasta
        })
        if (!cancel) setCuadres(enRango)
      }
      if (!cancel) setLoading(false)
    })()
    return () => {
      cancel = true
    }
  }, [tab, desde, hasta])

  const periodo = `Del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`

  // Construye la definición de cada reporte (mismas columnas/filas para pantalla, Excel y PDF)
  const rep = useMemo(() => {
    if (tab === 'inventario') {
      const filas = articulos.map((a) => {
        const valor = Number(a.stock) * Number(a.costo)
        return {
          ver: [`#${codigoArticulo(a.codigo)}`, a.nombre, a.categoria, a.stock, money(a.costo), money(a.precio), money(valor)],
          csv: [codigoArticulo(a.codigo), a.nombre, a.categoria, Number(a.stock), Number(a.costo), Number(a.precio), valor],
        }
      })
      const totalValor = articulos.reduce((s, a) => s + Number(a.stock) * Number(a.costo), 0)
      const totalUnidades = articulos.reduce((s, a) => s + Number(a.stock), 0)
      return {
        titulo: 'Reporte de inventario (valorizado)',
        subtitulo: `${articulos.length} artículo(s) · ${totalUnidades} unidades · Valor: ${money(totalValor)}`,
        columnas: [
          { label: 'Código' }, { label: 'Artículo' }, { label: 'Categoría' },
          { label: 'Existencia', align: 'right' as const }, { label: 'Costo', align: 'right' as const },
          { label: 'Precio', align: 'right' as const }, { label: 'Valor', align: 'right' as const },
        ],
        filas,
        pie: ['', '', 'TOTALES', totalUnidades, '', '', money(totalValor)] as (string | number)[],
        pieCsv: ['', '', 'TOTALES', totalUnidades, '', '', totalValor] as (string | number)[],
        orientacion: 'portrait' as const,
      }
    }
    if (tab === 'fisico') {
      const filas = articulos.map((a) => ({
        ver: [`#${codigoArticulo(a.codigo)}`, a.nombre, a.categoria, a.stock, '', ''],
        csv: [codigoArticulo(a.codigo), a.nombre, a.categoria, Number(a.stock), '', ''],
      }))
      return {
        titulo: 'Hoja de inventario físico (conteo)',
        subtitulo: `${articulos.length} artículo(s) · Anota el conteo físico y la diferencia se calcula al final`,
        columnas: [
          { label: 'Código' }, { label: 'Artículo' }, { label: 'Categoría' },
          { label: 'Existencia sistema', align: 'right' as const },
          { label: 'Conteo físico', align: 'center' as const },
          { label: 'Diferencia', align: 'center' as const },
        ],
        filas,
        pie: undefined,
        pieCsv: undefined,
        orientacion: 'portrait' as const,
      }
    }
    if (tab === 'ventas') {
      const filas = facturas.map((f) => ({
        ver: [codigoFactura(f), fechaCorta(f.fecha), f.cliente_nombre || 'Cliente', f.tipo_venta === 'CREDITO' ? 'Crédito' : 'Contado', f.estado, money(f.total)],
        csv: [codigoFactura(f), f.fecha, f.cliente_nombre || 'Cliente', f.tipo_venta === 'CREDITO' ? 'Crédito' : 'Contado', f.estado, Number(f.total)],
      }))
      const total = facturas.reduce((s, f) => s + Number(f.total), 0)
      const pagadas = facturas.filter((f) => f.estado === 'PAGADA').reduce((s, f) => s + Number(f.total), 0)
      const pendientes = facturas.filter((f) => f.estado === 'PENDIENTE').reduce((s, f) => s + Number(f.total), 0)
      return {
        titulo: 'Reporte de ventas',
        subtitulo: `${periodo} · ${facturas.length} factura(s) · Pagado: ${money(pagadas)} · Pendiente: ${money(pendientes)}`,
        columnas: [
          { label: '# Factura' }, { label: 'Fecha' }, { label: 'Cliente' },
          { label: 'Tipo' }, { label: 'Estado' }, { label: 'Total', align: 'right' as const },
        ],
        filas,
        pie: ['', '', '', '', 'TOTAL', money(total)] as (string | number)[],
        pieCsv: ['', '', '', '', 'TOTAL', total] as (string | number)[],
        orientacion: 'portrait' as const,
      }
    }
    if (tab === 'compras') {
      const filas = compras.map((c) => ({
        ver: [`#${c.numero}`, fechaCorta(c.fecha), c.proveedor || '—', c.categoria, c.tipo_pago === 'CREDITO' ? 'Crédito' : 'Contado', money(c.total)],
        csv: [c.numero, c.fecha, c.proveedor || '', c.categoria, c.tipo_pago === 'CREDITO' ? 'Crédito' : 'Contado', Number(c.total)],
      }))
      const total = compras.reduce((s, c) => s + Number(c.total), 0)
      return {
        titulo: 'Reporte de compras',
        subtitulo: `${periodo} · ${compras.length} compra(s) · Total: ${money(total)}`,
        columnas: [
          { label: '#' }, { label: 'Fecha' }, { label: 'Proveedor' },
          { label: 'Categoría' }, { label: 'Pago' }, { label: 'Total', align: 'right' as const },
        ],
        filas,
        pie: ['', '', '', '', 'TOTAL', money(total)] as (string | number)[],
        pieCsv: ['', '', '', '', 'TOTAL', total] as (string | number)[],
        orientacion: 'portrait' as const,
      }
    }
    // cuadres
    const filas = cuadres.map((s) => {
      const esperado = s.monto_contado != null && s.diferencia != null ? Number(s.monto_contado) - Number(s.diferencia) : null
      const dif = Number(s.diferencia ?? 0)
      const estado = dif === 0 ? 'Cuadrada' : dif > 0 ? 'Sobrante' : 'Faltante'
      return {
        ver: [`#${s.numero}`, fechaHora(s.cerrada_at), s.cerrada_por || '—', money(s.monto_inicial), esperado != null ? money(esperado) : '—', money(s.monto_contado), `${estado} ${dif !== 0 ? money(Math.abs(dif)) : ''}`],
        csv: [s.numero, fechaHora(s.cerrada_at), s.cerrada_por || '', Number(s.monto_inicial), esperado ?? '', Number(s.monto_contado ?? 0), dif],
      }
    })
    const totalDif = cuadres.reduce((s, x) => s + Number(x.diferencia ?? 0), 0)
    return {
      titulo: 'Reporte de cuadres de caja',
      subtitulo: `${periodo} · ${cuadres.length} cierre(s) · Diferencia acumulada: ${money(totalDif)}`,
      columnas: [
        { label: '#' }, { label: 'Cerrada' }, { label: 'Cerró' },
        { label: 'Inicial', align: 'right' as const }, { label: 'Esperado', align: 'right' as const },
        { label: 'Contado', align: 'right' as const }, { label: 'Resultado', align: 'right' as const },
      ],
      filas,
      pie: undefined,
      pieCsv: undefined,
      orientacion: 'landscape' as const,
    }
  }, [tab, articulos, facturas, compras, cuadres, periodo])

  function exportarExcel() {
    const enc = rep.columnas.map((c) => c.label)
    const filasCsv = rep.filas.map((f) => f.csv)
    if (rep.pieCsv) filasCsv.push(rep.pieCsv)
    descargarCSV(rep.titulo, enc, filasCsv)
  }

  function exportarPDF() {
    imprimirTabla({
      negocio,
      titulo: rep.titulo,
      subtitulo: rep.subtitulo,
      columnas: rep.columnas,
      filas: rep.filas.map((f) => f.ver),
      pie: rep.pie,
      orientacion: rep.orientacion,
    })
  }

  const tabActual = tabs.find((t) => t.key === tab)!

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Inventario, ventas, compras y cuadres" />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? 'btn-primary' : 'btn-ghost'}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        {tabActual.rango && (
          <>
            <div>
              <label className="label">Desde</label>
              <input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
          </>
        )}
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost" onClick={exportarExcel}><FileSpreadsheet size={16} /> Excel</button>
          <button className="btn-primary" onClick={exportarPDF}><Printer size={16} /> Imprimir / PDF</button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-bold text-slate-800">{rep.titulo}</h2>
        <p className="mb-3 text-sm text-slate-400">{rep.subtitulo}</p>
        {loading ? (
          <p className="py-8 text-center text-slate-400">Cargando…</p>
        ) : rep.filas.length === 0 ? (
          <p className="py-8 text-center text-slate-400">Sin datos para este reporte.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  {rep.columnas.map((c, i) => (
                    <th key={i} className={`px-4 py-2 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rep.filas.map((f, ri) => (
                  <tr key={ri}>
                    {f.ver.map((v, ci) => (
                      <td key={ci} className={`px-4 py-2 ${rep.columnas[ci]?.align === 'right' ? 'text-right' : rep.columnas[ci]?.align === 'center' ? 'text-center text-slate-300' : 'text-slate-700'}`}>
                        {v === '' && rep.columnas[ci]?.align === 'center' ? '—' : v}
                      </td>
                    ))}
                  </tr>
                ))}
                {rep.pie && (
                  <tr className="bg-slate-50 font-bold text-slate-800">
                    {rep.pie.map((v, ci) => (
                      <td key={ci} className={`px-4 py-2 ${rep.columnas[ci]?.align === 'right' ? 'text-right' : ''}`}>{v}</td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
