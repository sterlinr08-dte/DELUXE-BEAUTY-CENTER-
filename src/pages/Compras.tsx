import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Compra, Articulo, Proveedor } from '../types'
import { money, fechaCorta, fechaHora, hoyISO, codigoArticulo } from '../lib/format'
import { METODOS_PAGO, CATEGORIAS_COMPRA, ITBIS_RATE } from '../lib/constants'
import { useAuth } from '../lib/auth'
import { useNegocio } from '../lib/negocio'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'

interface ReciboCompra { numero: number | null; proveedor: string; descripcion: string; categoria: string; fecha: string; subtotal: number; itbis: number; total: number; metodo: string; hora: string }

const vacio = {
  fecha: hoyISO(),
  proveedor: '',
  descripcion: '',
  categoria: 'Insumos',
  subtotal: 0,
  aplicaItbis: false,
  tipo_pago: 'CONTADO' as 'CONTADO' | 'CREDITO',
  metodo_pago: 'Efectivo',
  articulo_id: '',
  cantidad: 0,
  costo_unit: 0,
  notas: '',
}

export default function Compras() {
  const { puedeAccion } = useAuth()
  const { negocio } = useNegocio()
  const puedeEliminar = puedeAccion('compras.eliminar')
  const [editCompra, setEditCompra] = useState<Compra | null>(null)
  const [recibo, setRecibo] = useState<ReciboCompra | null>(null)
  const [items, setItems] = useState<Compra[]>([])
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(vacio)
  const [saving, setSaving] = useState(false)
  // catálogo de artículos / historial de compras (lupa)
  const [catalogoOpen, setCatalogoOpen] = useState(false)
  const [catTab, setCatTab] = useState<'articulos' | 'historial'>('articulos')
  const [buscarCat, setBuscarCat] = useState('')

  async function cargar() {
    setLoading(true)
    const [{ data }, { data: arts }, { data: provs }] = await Promise.all([
      supabase.from('compras').select('*').order('fecha', { ascending: false }),
      supabase.from('articulos').select('*').eq('activo', true).order('nombre'),
      supabase.from('proveedores').select('*').eq('activo', true).order('nombre'),
    ])
    setItems(data ?? [])
    setArticulos(arts ?? [])
    setProveedores(provs ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const totalMes = items
    .filter((c) => c.fecha.slice(0, 7) === hoyISO().slice(0, 7))
    .reduce((s, c) => s + Number(c.total), 0)

  // Si hay artículo + cantidad + costo, el subtotal se calcula (cantidad × costo); si no, es manual
  const vinculaArticulo = !!form.articulo_id && form.cantidad > 0
  const subtotal = vinculaArticulo ? form.cantidad * form.costo_unit : form.subtotal
  const itbis = form.aplicaItbis ? subtotal * ITBIS_RATE : 0
  const total = subtotal + itbis

  function abrirNuevo() {
    setEditId(null)
    setEditCompra(null)
    setForm(vacio)
    setOpen(true)
  }

  function abrirEditar(c: Compra) {
    setEditId(c.id)
    setEditCompra(c)
    const cant = Number(c.cantidad ?? 0)
    setForm({
      fecha: c.fecha,
      proveedor: c.proveedor ?? '',
      descripcion: c.descripcion,
      categoria: c.categoria,
      subtotal: Number(c.subtotal),
      aplicaItbis: Number(c.itbis) > 0,
      tipo_pago: c.tipo_pago ?? 'CONTADO',
      metodo_pago: c.metodo_pago ?? 'Efectivo',
      articulo_id: c.articulo_id ?? '',
      cantidad: cant,
      costo_unit: cant > 0 ? Number(c.subtotal) / cant : 0,
      notas: c.notas ?? '',
    })
    setOpen(true)
  }

  // Al elegir un artículo, precarga su costo y nombre como descripción
  function elegirArticulo(id: string) {
    const a = articulos.find((x) => x.id === id)
    setForm((f) => ({
      ...f,
      articulo_id: id,
      costo_unit: a ? Number(a.costo) || f.costo_unit : f.costo_unit,
      descripcion: f.descripcion.trim() || (a ? a.nombre : ''),
    }))
  }

  async function guardar(imprimir = false) {
    if (form.articulo_id && form.cantidad <= 0) return alert('Indica la cantidad comprada')
    if (vinculaArticulo && form.costo_unit <= 0) return alert('Indica el costo unitario')
    if (!form.descripcion.trim()) return alert('La descripción es obligatoria')
    if (subtotal <= 0) return alert('El monto debe ser mayor que 0')
    setSaving(true)
    const payload = {
      fecha: form.fecha,
      proveedor: form.proveedor || null,
      descripcion: form.descripcion,
      categoria: form.categoria,
      subtotal,
      itbis,
      total,
      tipo_pago: form.tipo_pago,
      metodo_pago: form.metodo_pago,
      articulo_id: vinculaArticulo ? form.articulo_id : null,
      cantidad: vinculaArticulo ? form.cantidad : null,
      notas: form.notas || null,
    }
    let numero: number | null = editCompra?.numero ?? null
    if (editId) {
      const { error } = await supabase.from('compras').update(payload).eq('id', editId)
      if (error) { setSaving(false); return alert('Error al guardar: ' + error.message) }
    } else {
      const { data, error } = await supabase.from('compras').insert(payload).select().single()
      if (error) { setSaving(false); return alert('Error al guardar: ' + error.message) }
      numero = (data as any)?.numero ?? null
      // Compra nueva vinculada a un artículo: sumar a la existencia y actualizar su costo
      if (vinculaArticulo) {
        await supabase.rpc('ajustar_stock', { p_articulo: form.articulo_id, p_delta: form.cantidad })
        await supabase.from('articulos').update({ costo: form.costo_unit }).eq('id', form.articulo_id)
      }
    }
    if (imprimir) {
      setRecibo({ numero, proveedor: form.proveedor || 'Sin proveedor', descripcion: form.descripcion, categoria: form.categoria, fecha: form.fecha, subtotal, itbis, total, metodo: form.metodo_pago, hora: new Date().toISOString() })
      setTimeout(() => window.print(), 400)
    }
    setSaving(false)
    setOpen(false)
    cargar()
  }

  async function eliminar(c: Compra) {
    if (!confirm(`¿Eliminar la compra "${c.descripcion}"?`)) return
    // Si sumaba stock, descontarlo al eliminar
    if (c.articulo_id && c.cantidad) {
      await supabase.rpc('ajustar_stock', { p_articulo: c.articulo_id, p_delta: -Number(c.cantidad) })
    }
    const { error } = await supabase.from('compras').delete().eq('id', c.id)
    if (error) return alert('Error al eliminar: ' + error.message)
    cargar()
  }

  return (
    <div>
      {!open && (<>
      <PageHeader
        title="Compras"
        subtitle={`Compras de este mes: ${money(totalMes)}`}
        action={
          <button className="btn-primary" onClick={abrirNuevo}>
            <Plus size={16} /> Nueva compra
          </button>
        }
      />

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : (
        <DataTable
          rows={items}
          rowKey={(c) => c.id}
          searchText={(c) => `${c.descripcion} ${c.proveedor ?? ''} ${c.categoria} ${c.numero} ${c.fecha}`}
          searchPlaceholder="Buscar por descripción, proveedor, categoría, # o fecha…"
          emptyText={items.length === 0 ? 'Aún no hay compras registradas.' : 'No hay compras que coincidan.'}
          columns={[
            { header: '#', cell: (c) => <span className="font-mono font-semibold text-brand-700">#{c.numero}</span>, sortValue: (c) => c.numero },
            { header: 'Fecha', cell: (c) => <span className="text-slate-600">{fechaCorta(c.fecha)}</span>, sortValue: (c) => c.fecha },
            { header: 'Descripción', cell: (c) => <span className="font-medium text-slate-800">{c.descripcion}</span>, sortValue: (c) => c.descripcion },
            { header: 'Proveedor', cell: (c) => <span className="text-slate-600">{c.proveedor || '—'}</span>, sortValue: (c) => c.proveedor ?? '' },
            { header: 'Categoría', cell: (c) => <span className="badge bg-slate-100 text-slate-600">{c.categoria}</span>, sortValue: (c) => c.categoria },
            { header: 'Total', align: 'right', cell: (c) => <span className="font-semibold text-slate-800">{money(c.total)}</span>, sortValue: (c) => c.total },
            {
              header: '', align: 'right', cell: (c) => (
                <div className="flex justify-end gap-1">
                  <button onClick={() => abrirEditar(c)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
                  {puedeEliminar && (
                    <button onClick={() => eliminar(c)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
      </>)}

      {/* PANTALLA DE COMPRA (a página completa, ya no es ventana emergente) */}
      {open && (
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-800">{editId ? 'Editar compra' : 'Nueva compra'}</h2>
              <p className="text-sm text-slate-400">Registra la compra y, si aplica, súmala al inventario.</p>
            </div>
            <button className="btn-ghost shrink-0" onClick={() => setOpen(false)}>
              <X size={16} /> Cerrar
            </button>
          </div>
          <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS_COMPRA.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Proveedor</label>
            <select className="input" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })}>
              <option value="">— Sin proveedor —</option>
              {proveedores.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
              {/* Si la compra guardada tiene un proveedor que ya no está en la lista, lo mostramos igual */}
              {form.proveedor && !proveedores.some((p) => p.nombre === form.proveedor) && (
                <option value={form.proveedor}>{form.proveedor}</option>
              )}
            </select>
            {proveedores.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No hay proveedores. Créalos en Configuración → Proveedores.</p>
            )}
          </div>

          {/* Compra de un artículo de inventario: artículo + cantidad + costo */}
          <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-3">
            <label className="label">Artículo de inventario {editId ? '' : '(suma a la existencia)'}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => { setBuscarCat(''); setCatTab('articulos'); setCatalogoOpen(true) }}
                  title="Ver artículos e historial de compras"
                  disabled={!!editId}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-40"
                >
                  <Search size={16} />
                </button>
                <select className="input pl-9" value={form.articulo_id} onChange={(e) => elegirArticulo(e.target.value)} disabled={!!editId}>
                  <option value="">— Compra sin inventario —</option>
                  {articulos.map((a) => <option key={a.id} value={a.id}>#{codigoArticulo(a.codigo)} {a.nombre} (existencia {a.stock})</option>)}
                </select>
              </div>
            </div>
            {form.articulo_id && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Cantidad</label>
                  <input type="number" min={0} className="input" placeholder="Cantidad" value={form.cantidad || ''} onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} disabled={!!editId} />
                </div>
                <div>
                  <label className="label">Costo unitario (RD$)</label>
                  <input type="number" min={0} step={5} className="input" placeholder="Costo c/u" value={form.costo_unit || ''} onChange={(e) => setForm({ ...form, costo_unit: Number(e.target.value) })} disabled={!!editId} />
                </div>
              </div>
            )}
            {form.articulo_id && !editId && <p className="mt-1 text-xs text-slate-400">Subtotal = cantidad × costo. Se suma al stock y se actualiza el costo del artículo.</p>}
          </div>

          <div>
            <label className="label">Descripción</label>
            <input className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Esmaltes, tintes…" />
          </div>

          {!vinculaArticulo && (
            <div>
              <label className="label">Subtotal (RD$)</label>
              <input type="number" min={0} step={50} className="input" value={form.subtotal || ''} onChange={(e) => setForm({ ...form, subtotal: Number(e.target.value) })} />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.aplicaItbis} onChange={(e) => setForm({ ...form, aplicaItbis: e.target.checked })} />
            Incluir ITBIS (18%)
          </label>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            {vinculaArticulo && <div className="flex justify-between text-slate-500"><span>{form.cantidad} × {money(form.costo_unit)}</span><span></span></div>}
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            {form.aplicaItbis && <div className="flex justify-between text-slate-600"><span>ITBIS</span><span>{money(itbis)}</span></div>}
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-800"><span>Total</span><span>{money(total)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de pago</label>
              <select className="input" value={form.tipo_pago} onChange={(e) => setForm({ ...form, tipo_pago: e.target.value as 'CONTADO' | 'CREDITO' })}>
                <option value="CONTADO">Contado (pagada)</option>
                <option value="CREDITO">Crédito (queda por pagar)</option>
              </select>
            </div>
            <div>
              <label className="label">Método de pago</label>
              <select className="input" value={form.metodo_pago} onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}>
                {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {form.tipo_pago === 'CREDITO' && (
            <p className="-mt-2 text-xs text-amber-600">Esta compra quedará en <b>Cuentas por pagar</b> hasta saldarla.</p>
          )}
          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-bold text-slate-800">Total: {money(total)}</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-ghost" onClick={() => guardar(false)} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
              <button className="btn-primary" onClick={() => guardar(true)} disabled={saving}><Printer size={16} /> Guardar e imprimir</button>
            </div>
          </div>
        </div>
      )}

      {/* COMPROBANTE DE COMPRA (imprimible) */}
      <Modal open={!!recibo} title="Comprobante de compra" onClose={() => setRecibo(null)}>
        {recibo && (
          <div className="space-y-3">
            <div id="recibo-compra" className="print-area space-y-2 rounded-xl border border-slate-100 p-3 text-sm">
              <div className="text-center">
                <img src={`${import.meta.env.BASE_URL}${negocio.logo}`} alt={negocio.nombre} className="mx-auto mb-1 h-14 rounded-lg bg-black object-contain" />
                <p className="font-display text-base font-bold text-brand-800">{negocio.nombre}</p>
                {negocio.rnc && <p className="text-xs text-slate-500">RNC: {negocio.rnc}</p>}
                <p className="mt-1 text-xs font-semibold text-slate-600">COMPROBANTE DE COMPRA</p>
                <p className="text-xs text-slate-400">{recibo.numero != null ? `Compra #${recibo.numero} · ` : ''}{fechaHora(recibo.hora)}</p>
              </div>
              <p className="text-slate-600"><span className="font-medium">Proveedor:</span> {recibo.proveedor}</p>
              <p className="text-slate-600"><span className="font-medium">Categoría:</span> {recibo.categoria}</p>
              <p className="text-slate-600"><span className="font-medium">Detalle:</span> {recibo.descripcion}</p>
              <div className="space-y-0.5 border-t pt-1">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(recibo.subtotal)}</span></div>
                {recibo.itbis > 0 && <div className="flex justify-between text-slate-600"><span>ITBIS</span><span>{money(recibo.itbis)}</span></div>}
                <div className="flex justify-between text-base font-bold text-slate-800"><span>Total</span><span>{money(recibo.total)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Método</span><span>{recibo.metodo}</span></div>
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

      {/* VENTANA DE LA LUPA: artículos del inventario e historial de compras */}
      <Modal open={catalogoOpen} title="Buscar" onClose={() => setCatalogoOpen(false)}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCatTab('articulos')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${catTab === 'articulos' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              Artículos
            </button>
            <button
              type="button"
              onClick={() => setCatTab('historial')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${catTab === 'historial' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              Historial de compras
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={catTab === 'articulos' ? 'Filtrar por nombre, categoría o código…' : 'Filtrar por #, descripción, proveedor o fecha…'}
              value={buscarCat}
              onChange={(e) => setBuscarCat(e.target.value)}
              autoFocus
            />
          </div>

          {catTab === 'articulos' ? (
            <>
              <div className="max-h-[55vh] divide-y divide-slate-50 overflow-y-auto rounded-xl border border-slate-100">
                {articulos.length === 0 ? (
                  <p className="px-3 py-6 text-center text-slate-400">No hay artículos en el inventario.</p>
                ) : (
                  articulos.filter((a) => {
                    const f = buscarCat.trim().toLowerCase()
                    return !f || a.nombre.toLowerCase().includes(f) || a.categoria.toLowerCase().includes(f) || codigoArticulo(a.codigo).includes(f)
                  }).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { elegirArticulo(a.id); setCatalogoOpen(false) }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-pink-50"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-400">#{codigoArticulo(a.codigo)}</span>
                          <span className="truncate font-medium text-slate-800">{a.nombre}</span>
                        </span>
                        <span className={`mt-0.5 text-xs ${Number(a.stock) <= 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {Number(a.stock) <= 0 ? 'Sin existencia' : `Existencia: ${a.stock}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-slate-600">{money(a.costo)}</span>
                    </button>
                  ))
                )}
              </div>
              <p className="text-xs text-slate-400">Toca un artículo para elegirlo en la compra.</p>
            </>
          ) : (
            <div className="max-h-[55vh] divide-y divide-slate-50 overflow-y-auto rounded-xl border border-slate-100">
              {(() => {
                const f = buscarCat.trim().toLowerCase()
                const lista = items.filter((c) =>
                  !f || String(c.numero).includes(f) || c.descripcion.toLowerCase().includes(f) || (c.proveedor ?? '').toLowerCase().includes(f) || c.categoria.toLowerCase().includes(f) || c.fecha.includes(f),
                )
                if (lista.length === 0) {
                  return <p className="px-3 py-6 text-center text-slate-400">Sin compras que coincidan</p>
                }
                return lista.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-brand-700">#{c.numero}</span>
                        <span className="truncate font-medium text-slate-800">{c.descripcion}</span>
                      </span>
                      <span className="mt-0.5 text-xs text-slate-400">{fechaCorta(c.fecha)} · {c.proveedor || 'Sin proveedor'} · {c.categoria}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-slate-800">{money(c.total)}</span>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
