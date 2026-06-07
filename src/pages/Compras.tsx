import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ShoppingCart, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Compra, Articulo } from '../types'
import { money, fechaCorta, hoyISO, codigoArticulo } from '../lib/format'
import { METODOS_PAGO, CATEGORIAS_COMPRA, ITBIS_RATE } from '../lib/constants'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

const vacio = {
  fecha: hoyISO(),
  proveedor: '',
  descripcion: '',
  categoria: 'Insumos',
  subtotal: 0,
  aplicaItbis: false,
  metodo_pago: 'Efectivo',
  articulo_id: '',
  cantidad: 0,
  costo_unit: 0,
  notas: '',
}

export default function Compras() {
  const [items, setItems] = useState<Compra[]>([])
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(vacio)
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const [{ data }, { data: arts }] = await Promise.all([
      supabase.from('compras').select('*').order('fecha', { ascending: false }),
      supabase.from('articulos').select('*').eq('activo', true).order('nombre'),
    ])
    setItems(data ?? [])
    setArticulos(arts ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const totalMes = items
    .filter((c) => c.fecha.slice(0, 7) === hoyISO().slice(0, 7))
    .reduce((s, c) => s + Number(c.total), 0)

  const q = busqueda.trim().toLowerCase()
  const visibles = q
    ? items.filter((c) =>
        c.descripcion.toLowerCase().includes(q) ||
        (c.proveedor ?? '').toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q) ||
        String(c.numero).includes(q) ||
        c.fecha.includes(q),
      )
    : items

  // Si hay artículo + cantidad + costo, el subtotal se calcula (cantidad × costo); si no, es manual
  const vinculaArticulo = !!form.articulo_id && form.cantidad > 0
  const subtotal = vinculaArticulo ? form.cantidad * form.costo_unit : form.subtotal
  const itbis = form.aplicaItbis ? subtotal * ITBIS_RATE : 0
  const total = subtotal + itbis

  function abrirNuevo() {
    setEditId(null)
    setForm(vacio)
    setOpen(true)
  }

  function abrirEditar(c: Compra) {
    setEditId(c.id)
    const cant = Number(c.cantidad ?? 0)
    setForm({
      fecha: c.fecha,
      proveedor: c.proveedor ?? '',
      descripcion: c.descripcion,
      categoria: c.categoria,
      subtotal: Number(c.subtotal),
      aplicaItbis: Number(c.itbis) > 0,
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

  async function guardar() {
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
      metodo_pago: form.metodo_pago,
      articulo_id: vinculaArticulo ? form.articulo_id : null,
      cantidad: vinculaArticulo ? form.cantidad : null,
      notas: form.notas || null,
    }
    const { error } = editId
      ? await supabase.from('compras').update(payload).eq('id', editId)
      : await supabase.from('compras').insert(payload)
    if (error) {
      setSaving(false)
      return alert('Error al guardar: ' + error.message)
    }
    // Al registrar una compra nueva vinculada a un artículo: sumar al stock y actualizar su costo
    if (!editId && vinculaArticulo) {
      await supabase.rpc('ajustar_stock', { p_articulo: form.articulo_id, p_delta: form.cantidad })
      await supabase.from('articulos').update({ costo: form.costo_unit }).eq('id', form.articulo_id)
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
      <PageHeader
        title="Compras"
        subtitle={`Compras de este mes: ${money(totalMes)}`}
        action={
          <button className="btn-primary" onClick={abrirNuevo}>
            <Plus size={16} /> Nueva compra
          </button>
        }
      />

      {items.length > 0 && (
        <div className="relative mb-4 max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por descripción, proveedor, categoría, # o fecha…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <ShoppingCart className="text-brand-300" size={40} />
          <p className="text-slate-500">Aún no hay compras registradas.</p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Search className="text-brand-300" size={40} />
          <p className="text-slate-500">No hay compras que coincidan con «{busqueda}».</p>
        </div>
      ) : (
        <div className="overflow-x-auto panel-3d">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="thead-3d">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Descripción</th>
                <th className="px-5 py-3">Proveedor</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 font-mono font-semibold text-brand-700">#{c.numero}</td>
                  <td className="px-5 py-3 text-slate-600">{fechaCorta(c.fecha)}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{c.descripcion}</td>
                  <td className="px-5 py-3 text-slate-600">{c.proveedor || '—'}</td>
                  <td className="px-5 py-3"><span className="badge bg-slate-100 text-slate-600">{c.categoria}</span></td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{money(c.total)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirEditar(c)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
                      <button onClick={() => eliminar(c)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
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
        title={editId ? 'Editar compra' : 'Nueva compra'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : `Guardar (${money(total)})`}</button>
          </>
        }
      >
        <div className="space-y-4">
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
            <input className="input" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
          </div>

          {/* Compra de un artículo de inventario: artículo + cantidad + costo */}
          <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-3">
            <label className="label">Artículo de inventario {editId ? '' : '(suma al stock)'}</label>
            <select className="input" value={form.articulo_id} onChange={(e) => elegirArticulo(e.target.value)} disabled={!!editId}>
              <option value="">— Compra sin inventario —</option>
              {articulos.map((a) => <option key={a.id} value={a.id}>#{codigoArticulo(a.codigo)} {a.nombre} (stock {a.stock})</option>)}
            </select>
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
    </div>
  )
}
