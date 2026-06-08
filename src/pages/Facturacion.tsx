import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Receipt, Printer, Ban, X, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Cliente, Factura, FacturaItem, Servicio, Articulo, Empleado, EstadoFactura, TipoVenta } from '../types'
import { money, fechaCorta, hoyISO, codigoArticulo, codigoFactura } from '../lib/format'
import { ITBIS_RATE } from '../lib/constants'
import { useAuth } from '../lib/auth'
import { useNegocio } from '../lib/negocio'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface LineaTmp {
  servicio_id: string
  articulo_id: string
  descripcion: string
  cantidad: number
  precio_unit: number
  empleado_id: string
}

const lineaVacia: LineaTmp = { servicio_id: '', articulo_id: '', descripcion: '', cantidad: 1, precio_unit: 0, empleado_id: '' }

const estadoBadge: Record<EstadoFactura, string> = {
  PENDIENTE: 'bg-amber-50 text-amber-700',
  PAGADA: 'bg-emerald-50 text-emerald-700',
  ANULADA: 'bg-rose-50 text-rose-700',
}

export default function Facturacion() {
  const { puedeAccion } = useAuth()
  const { negocio } = useNegocio()
  const puedeAnular = puedeAccion('facturas.anular')
  const puedeEliminar = puedeAccion('facturas.eliminar')
  const puedeEditar = puedeAccion('facturas.editar')

  const [facturas, setFacturas] = useState<Factura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [verId, setVerId] = useState<string | null>(null)
  const [verItems, setVerItems] = useState<FacturaItem[]>([])

  // formulario de nueva factura
  const [clienteId, setClienteId] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [tipoVenta, setTipoVenta] = useState<TipoVenta>('CONTADO')
  const [aplicaItbis, setAplicaItbis] = useState(false)
  const [descuento, setDescuento] = useState(0)
  const [notas, setNotas] = useState('')
  const [lineas, setLineas] = useState<LineaTmp[]>([])
  const [buscarItem, setBuscarItem] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  // Catálogo completo (ventana de la lupa)
  const [catalogoOpen, setCatalogoOpen] = useState(false)
  const [buscarCat, setBuscarCat] = useState('')

  // Resultados del buscador (servicios + artículos)
  const q = buscarItem.trim().toLowerCase()
  const resultados = q
    ? [
        ...servicios
          .filter((s) => s.nombre.toLowerCase().includes(q) || (s.categoria ?? '').toLowerCase().includes(q))
          .map((s) => ({ tipo: 's' as const, id: s.id, nombre: s.nombre, precio: Number(s.precio), stock: null as number | null })),
        ...articulos
          .filter((a) => a.nombre.toLowerCase().includes(q) || a.categoria.toLowerCase().includes(q) || codigoArticulo(a.codigo).includes(q))
          .map((a) => ({ tipo: 'a' as const, id: a.id, nombre: a.nombre, precio: Number(a.precio), stock: Number(a.stock) })),
      ].slice(0, 8)
    : []

  // Lista completa para la ventana del catálogo (la lupa), con filtro propio
  const qc = buscarCat.trim().toLowerCase()
  const catalogo = [
    ...servicios
      .filter((s) => !qc || s.nombre.toLowerCase().includes(qc) || (s.categoria ?? '').toLowerCase().includes(qc))
      .map((s) => ({ tipo: 's' as const, id: s.id, nombre: s.nombre, precio: Number(s.precio), stock: null as number | null })),
    ...articulos
      .filter((a) => !qc || a.nombre.toLowerCase().includes(qc) || a.categoria.toLowerCase().includes(qc) || codigoArticulo(a.codigo).includes(qc))
      .map((a) => ({ tipo: 'a' as const, id: a.id, nombre: a.nombre, precio: Number(a.precio), stock: Number(a.stock) })),
  ]

  function agregarDesdeBusqueda(r: { tipo: 's' | 'a'; id: string; nombre: string; precio: number; stock?: number | null }) {
    if (r.tipo === 'a' && (r.stock ?? 0) <= 0) {
      if (!confirm(`"${r.nombre}" no tiene existencia (0). ¿Agregar de todos modos?`)) return
    }
    setLineas((prev) => {
      // Si el mismo servicio/artículo ya está, suma la cantidad en vez de duplicar
      const existe = prev.findIndex((l) =>
        r.tipo === 's' ? l.servicio_id === r.id : l.articulo_id === r.id,
      )
      if (existe >= 0) {
        return prev.map((l, idx) => (idx === existe ? { ...l, cantidad: l.cantidad + 1 } : l))
      }
      // El empleado nuevo hereda al del último ítem (lo más común es la misma persona)
      const ultimoEmpleado = [...prev].reverse().find((l) => l.empleado_id)?.empleado_id ?? ''
      const linea: LineaTmp = {
        servicio_id: r.tipo === 's' ? r.id : '',
        articulo_id: r.tipo === 'a' ? r.id : '',
        descripcion: r.nombre,
        cantidad: 1,
        precio_unit: r.precio,
        empleado_id: ultimoEmpleado,
      }
      return [...prev, linea]
    })
    setBuscarItem('')
  }

  // Agrega un concepto manual (algo que no está en el catálogo)
  function agregarManual() {
    setLineas((prev) => {
      const ultimoEmpleado = [...prev].reverse().find((l) => l.empleado_id)?.empleado_id ?? ''
      return [...prev, { ...lineaVacia, empleado_id: ultimoEmpleado }]
    })
  }

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('facturas').select('*').order('numero', { ascending: false })
    setFacturas(data ?? [])
    setLoading(false)
  }

  async function cargarCatalogos() {
    const [cl, se, ar, em] = await Promise.all([
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('servicios').select('*').eq('activo', true).order('nombre'),
      supabase.from('articulos').select('*').eq('activo', true).order('nombre'),
      supabase.from('empleados').select('*').eq('activo', true).order('nombre'),
    ])
    setClientes(cl.data ?? [])
    setServicios(se.data ?? [])
    setArticulos(ar.data ?? [])
    setEmpleados(em.data ?? [])
  }

  useEffect(() => {
    cargar()
    cargarCatalogos()
  }, [])

  const subtotal = lineas.reduce((s, l) => s + l.cantidad * l.precio_unit, 0)
  const baseImponible = Math.max(0, subtotal - descuento)
  const itbis = aplicaItbis ? baseImponible * ITBIS_RATE : 0
  const total = baseImponible + itbis

  function nuevaFactura() {
    setEditId(null)
    setClienteId('')
    setClienteNombre('')
    setFecha(hoyISO())
    setTipoVenta('CONTADO')
    setAplicaItbis(false)
    setDescuento(0)
    setNotas('')
    setLineas([])
    setBuscarItem('')
    setOpen(true)
  }

  // Editar una factura ya guardada (solo PENDIENTE y con permiso)
  async function abrirEditar(f: Factura) {
    if (f.estado !== 'PENDIENTE') return alert('Solo se pueden editar facturas pendientes (aún no cobradas).')
    const { data, error } = await supabase
      .from('factura_items')
      .select('*')
      .eq('factura_id', f.id)
      .order('id')
    if (error) return alert('Error al cargar la factura: ' + error.message)
    setEditId(f.id)
    setClienteId(f.cliente_id ?? '')
    setClienteNombre(f.cliente_nombre ?? '')
    setFecha(f.fecha)
    setTipoVenta(f.tipo_venta ?? 'CONTADO')
    setAplicaItbis(Number(f.itbis) > 0)
    setDescuento(Number(f.descuento))
    setNotas(f.notas ?? '')
    setBuscarItem('')
    setLineas(
      (data ?? []).map((it: any) => ({
        servicio_id: it.servicio_id ?? '',
        articulo_id: it.articulo_id ?? '',
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad),
        precio_unit: Number(it.precio_unit),
        empleado_id: it.empleado_id ?? '',
      })),
    )
    setOpen(true)
  }

  function setLinea(i: number, patch: Partial<LineaTmp>) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  async function guardar() {
    const items = lineas.filter((l) => l.descripcion.trim() && l.cantidad > 0)
    if (items.length === 0) return alert('Agrega al menos un ítem con descripción')
    setSaving(true)
    const datos = {
      cliente_id: clienteId || null,
      cliente_nombre: clienteId ? clientes.find((c) => c.id === clienteId)?.nombre : clienteNombre || 'Cliente de contado',
      fecha,
      tipo_venta: tipoVenta,
      subtotal,
      descuento,
      itbis,
      total,
      notas: notas || null,
    }

    let facturaId = editId
    if (editId) {
      // Editar: devolver el stock anterior, actualizar y reinsertar el detalle
      await restaurarStock(editId)
      const { error } = await supabase.from('facturas').update(datos).eq('id', editId)
      if (error) {
        setSaving(false)
        return alert('Error al actualizar factura: ' + error.message)
      }
      await supabase.from('factura_items').delete().eq('factura_id', editId)
    } else {
      const { data: factura, error } = await supabase
        .from('facturas')
        .insert({ ...datos, estado: 'PENDIENTE', metodo_pago: null })
        .select()
        .single()
      if (error || !factura) {
        setSaving(false)
        return alert('Error al crear factura: ' + error?.message)
      }
      facturaId = factura.id
    }

    const payload = items.map((l) => ({
      factura_id: facturaId,
      servicio_id: l.servicio_id || null,
      articulo_id: l.articulo_id || null,
      empleado_id: l.empleado_id || null,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precio_unit: l.precio_unit,
      importe: l.cantidad * l.precio_unit,
    }))
    const { error: e2 } = await supabase.from('factura_items').insert(payload)
    if (e2) {
      setSaving(false)
      return alert('Factura guardada pero falló el detalle: ' + e2.message)
    }
    // Descontar del stock los artículos vendidos
    for (const l of items) {
      if (l.articulo_id) {
        await supabase.rpc('ajustar_stock', { p_articulo: l.articulo_id, p_delta: -l.cantidad })
      }
    }
    setSaving(false)
    setOpen(false)
    cargar()
  }

  // Devuelve al stock los artículos de una factura
  async function restaurarStock(facturaId: string) {
    const { data } = await supabase.from('factura_items').select('articulo_id, cantidad').eq('factura_id', facturaId)
    for (const it of data ?? []) {
      if ((it as any).articulo_id) {
        await supabase.rpc('ajustar_stock', { p_articulo: (it as any).articulo_id, p_delta: Number((it as any).cantidad) })
      }
    }
  }

  async function cambiarEstado(f: Factura, estado: EstadoFactura) {
    // Al anular, devolver los artículos al inventario
    if (estado === 'ANULADA' && f.estado !== 'ANULADA') {
      await restaurarStock(f.id)
    }
    const { error } = await supabase.from('facturas').update({ estado }).eq('id', f.id)
    if (error) return alert('Error: ' + error.message)
    cargar()
  }

  async function eliminar(f: Factura) {
    if (!confirm(`¿Eliminar la factura ${codigoFactura(f)}?`)) return
    // Si no estaba anulada, devolver el stock antes de borrar
    if (f.estado !== 'ANULADA') {
      await restaurarStock(f.id)
    }
    const { error } = await supabase.from('facturas').delete().eq('id', f.id)
    if (error) return alert('Error al eliminar: ' + error.message)
    cargar()
  }

  async function verDetalle(f: Factura) {
    setVerId(f.id)
    const { data } = await supabase.from('factura_items').select('*, empleado:empleados(nombre)').eq('factura_id', f.id)
    setVerItems((data as FacturaItem[]) ?? [])
  }

  const facturaVista = facturas.find((f) => f.id === verId)

  return (
    <div>
      {!open && (<>
      <PageHeader
        title="Facturación"
        subtitle={`${facturas.length} factura(s)`}
        action={
          <button className="btn-primary" onClick={nuevaFactura}>
            <Plus size={16} /> Nueva factura
          </button>
        }
      />

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : facturas.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Receipt className="text-brand-300" size={40} />
          <p className="text-slate-500">Aún no hay facturas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto panel-3d">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="thead-3d">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {facturas.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-mono font-semibold text-slate-700">{codigoFactura(f)}</td>
                  <td className="px-5 py-3">
                    <button className="font-medium text-brand-700 hover:underline" onClick={() => verDetalle(f)}>
                      {f.cliente_nombre || 'Cliente'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{fechaCorta(f.fecha)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{money(f.total)}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${estadoBadge[f.estado]}`}>{f.estado}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {f.estado === 'PENDIENTE' && (
                        <span className="badge bg-amber-50 text-amber-600">Se cobra en Caja</span>
                      )}
                      {f.estado === 'PENDIENTE' && puedeEditar && (
                        <button title="Editar" onClick={() => abrirEditar(f)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                          <Pencil size={16} />
                        </button>
                      )}
                      {f.estado !== 'ANULADA' && puedeAnular && (
                        <button title="Anular" onClick={() => cambiarEstado(f, 'ANULADA')} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600">
                          <Ban size={16} />
                        </button>
                      )}
                      <button title="Ver / imprimir" onClick={() => verDetalle(f)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                        <Printer size={16} />
                      </button>
                      {puedeEliminar && (
                        <button title="Eliminar" onClick={() => eliminar(f)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </>)}

      {/* PANTALLA DE VENTA (a página completa, ya no es ventana emergente) */}
      {open && (
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-800">{editId ? 'Editar factura' : 'Nueva venta'}</h2>
              <p className="text-sm text-slate-400">Registra los servicios y productos a cobrar.</p>
            </div>
            <button className="btn-ghost shrink-0" onClick={() => setOpen(false)}>
              <X size={16} /> Cerrar
            </button>
          </div>
          <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cliente</label>
              <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">— De contado —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          {!clienteId && (
            <div>
              <label className="label">Nombre (cliente de contado)</label>
              <input className="input" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Opcional" />
            </div>
          )}

          <div>
            <label className="label">Tipo de venta</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoVenta('CONTADO')}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${tipoVenta === 'CONTADO' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                Contado <span className="font-mono text-xs opacity-70">CO</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoVenta('CREDITO')}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${tipoVenta === 'CREDITO' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                Crédito <span className="font-mono text-xs opacity-70">CR</span>
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">Un solo correlativo; solo cambia la letra: {tipoVenta === 'CREDITO' ? 'CR (crédito)' : 'CO (contado)'}.</p>
          </div>

          <div>
            <label className="label">Buscar servicio o artículo</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setBuscarCat(''); setCatalogoOpen(true) }}
                title="Ver todo el catálogo"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
              >
                <Search size={16} />
              </button>
              <input
                className="input pl-9"
                placeholder="Toca la lupa para ver todo, o escribe para buscar…"
                value={buscarItem}
                onChange={(e) => setBuscarItem(e.target.value)}
              />
              {q && (
                <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-pink-100 bg-white shadow-card">
                  {resultados.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-400">Sin coincidencias</p>
                  ) : (
                    resultados.map((r) => (
                      <button
                        key={`${r.tipo}:${r.id}`}
                        type="button"
                        onClick={() => agregarDesdeBusqueda(r)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-pink-50"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`badge ${r.tipo === 's' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700'}`}>
                            {r.tipo === 's' ? 'Servicio' : 'Artículo'}
                          </span>
                          <span className="truncate text-slate-700">{r.nombre}</span>
                          {r.tipo === 'a' && (
                            <span className={`text-xs ${(r.stock ?? 0) <= 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                              {(r.stock ?? 0) <= 0 ? 'sin existencia' : `existencia: ${r.stock}`}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-semibold text-slate-800">{money(r.precio)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">Lo que se cobra</label>
            {lineas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-400">
                Busca arriba y toca un servicio o producto para agregarlo aquí.
              </div>
            ) : (
              <div className="space-y-5">
                {lineas.map((l, i) => {
                  const esManual = !l.servicio_id && !l.articulo_id
                  return (
                    <div key={i} className="rounded-xl border-2 border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        {esManual ? (
                          <input
                            className="input flex-1"
                            placeholder="Concepto (ej: ajuste, recargo…)"
                            value={l.descripcion}
                            onChange={(e) => setLinea(i, { descripcion: e.target.value })}
                          />
                        ) : (
                          <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-800">
                            <span className={`badge ${l.servicio_id ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700'}`}>
                              {l.servicio_id ? 'Servicio' : 'Producto'}
                            </span>
                            <span className="truncate">{l.descripcion}</span>
                          </span>
                        )}
                        <button onClick={() => setLineas(lineas.filter((_, idx) => idx !== i))} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          <X size={16} />
                        </button>
                      </div>

                      <div className="mt-2">
                        <span className="text-xs text-slate-400">Realizado por</span>
                        <select className="input" value={l.empleado_id} onChange={(e) => setLinea(i, { empleado_id: e.target.value })}>
                          <option value="">— Sin asignar —</option>
                          {empleados.map((e) => (
                            <option key={e.id} value={e.id}>{e.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-xs text-slate-400">Cant.</span>
                          <input type="number" min={1} className="input" value={l.cantidad || ''} onChange={(e) => setLinea(i, { cantidad: Number(e.target.value) })} />
                        </div>
                        <div>
                          <span className="text-xs text-slate-400">Precio</span>
                          <input type="number" min={0} step={50} className="input" value={l.precio_unit || ''} onChange={(e) => setLinea(i, { precio_unit: Number(e.target.value) })} />
                        </div>
                        <div>
                          <span className="text-xs text-slate-400">Importe</span>
                          <input className="input bg-slate-50" value={money(l.cantidad * l.precio_unit)} readOnly />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <button className="btn-ghost mt-2" onClick={agregarManual}>
              <Plus size={14} /> Agregar artículo o servicio
            </button>
          </div>

          <div>
            <label className="label">Descuento (RD$)</label>
            <input type="number" min={0} step={50} className="input w-32" value={descuento || ''} onChange={(e) => setDescuento(Number(e.target.value))} />
            <p className="mt-1 text-xs text-slate-400">El método de pago se elige al cobrar en Caja.</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={aplicaItbis} onChange={(e) => setAplicaItbis(e.target.checked)} />
            Aplicar ITBIS (18%)
          </label>

          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            {descuento > 0 && <div className="flex justify-between text-slate-600"><span>Descuento</span><span>- {money(descuento)}</span></div>}
            {aplicaItbis && <div className="flex justify-between text-slate-600"><span>ITBIS (18%)</span><span>{money(itbis)}</span></div>}
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-800"><span>Total</span><span>{money(total)}</span></div>
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-bold text-slate-800">Total: {money(total)}</p>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar factura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VENTANA DEL CATÁLOGO (lupa): todos los servicios y artículos, cada dato separado */}
      <Modal open={catalogoOpen} title="Catálogo · servicios y artículos" onClose={() => setCatalogoOpen(false)}>
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Filtrar por nombre, categoría o código…"
              value={buscarCat}
              onChange={(e) => setBuscarCat(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Existencia</th>
                  <th className="px-3 py-2 text-right">Precio</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {catalogo.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Sin coincidencias</td></tr>
                ) : (
                  catalogo.map((r) => (
                    <tr key={`${r.tipo}:${r.id}`} className="hover:bg-pink-50/40">
                      <td className="px-3 py-2">
                        <span className={`badge ${r.tipo === 's' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700'}`}>
                          {r.tipo === 's' ? 'Servicio' : 'Artículo'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">{r.nombre}</td>
                      <td className="px-3 py-2">
                        {r.tipo === 's' ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span className={(r.stock ?? 0) <= 0 ? 'font-semibold text-rose-500' : 'text-slate-600'}>
                            {(r.stock ?? 0) <= 0 ? 'Sin existencia' : r.stock}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">{money(r.precio)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => agregarDesdeBusqueda(r)}
                          className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                        >
                          <Plus size={13} className="-mt-0.5 mr-0.5 inline" /> Agregar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">Toca «Agregar» en cada uno; puedes añadir varios y luego cerrar.</p>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => setCatalogoOpen(false)}>Listo</button>
          </div>
        </div>
      </Modal>

      {/* Modal VER / IMPRIMIR */}
      <Modal open={!!verId} title={`Factura ${facturaVista ? codigoFactura(facturaVista) : ''}`} onClose={() => setVerId(null)}>
        {facturaVista && (
          <div id="factura-print" className="print-area space-y-3">
            <div className="text-center">
              <img src={`${import.meta.env.BASE_URL}${negocio.logo}`} alt={negocio.nombre} className="mx-auto mb-2 h-20 rounded-lg bg-black object-contain" />
              <p className="font-display text-xl font-bold text-brand-800">{negocio.nombre}</p>
              {negocio.rnc && <p className="text-xs text-slate-500">RNC: {negocio.rnc}</p>}
              <p className="text-xs text-slate-500">{negocio.direccion} · {negocio.referencia}</p>
              <p className="text-xs text-slate-500">Tel {negocio.telefono} · WhatsApp {negocio.whatsapp} · {negocio.instagram}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">Factura {codigoFactura(facturaVista)} · {facturaVista.tipo_venta === 'CREDITO' ? 'Crédito' : 'Contado'} · {fechaCorta(facturaVista.fecha)}</p>
            </div>
            <div className="text-sm text-slate-600">
              <p><span className="font-medium">Cliente:</span> {facturaVista.cliente_nombre}</p>
              <p><span className="font-medium">Estado:</span> {facturaVista.estado}</p>
              <p><span className="font-medium">Pago:</span> {facturaVista.metodo_pago}</p>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-slate-400">
                <tr><th className="py-1">Descripción</th><th className="py-1 text-center">Cant.</th><th className="py-1 text-right">Importe</th></tr>
              </thead>
              <tbody>
                {verItems.map((it) => (
                  <tr key={it.id} className="border-b border-slate-50">
                    <td className="py-1">
                      {it.descripcion}
                      {(it as any).empleado?.nombre && <span className="block text-xs text-slate-400">por {(it as any).empleado.nombre}</span>}
                    </td>
                    <td className="py-1 text-center">{it.cantidad}</td>
                    <td className="py-1 text-right">{money(it.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-0.5 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(facturaVista.subtotal)}</span></div>
              {facturaVista.descuento > 0 && <div className="flex justify-between text-slate-600"><span>Descuento</span><span>- {money(facturaVista.descuento)}</span></div>}
              {facturaVista.itbis > 0 && <div className="flex justify-between text-slate-600"><span>ITBIS</span><span>{money(facturaVista.itbis)}</span></div>}
              <div className="flex justify-between border-t pt-1 text-base font-bold text-slate-800"><span>Total</span><span>{money(facturaVista.total)}</span></div>
            </div>
            <button className="btn-primary no-print w-full" onClick={() => window.print()}>
              <Printer size={16} /> Imprimir
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
