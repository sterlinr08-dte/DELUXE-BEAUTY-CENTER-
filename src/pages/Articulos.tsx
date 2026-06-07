import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Articulo } from '../types'
import { money } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

const vacio = {
  nombre: '',
  categoria: 'General',
  descripcion: '',
  precio: 0,
  costo: 0,
  stock: 0,
  activo: true,
}

const categorias = ['Cabello', 'Uñas', 'Facial', 'Maquillaje', 'General', 'Otros']

export default function Articulos() {
  const [items, setItems] = useState<Articulo[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(vacio)
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('articulos').select('*').order('codigo')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function abrirNuevo() {
    setEditId(null)
    setForm(vacio)
    setOpen(true)
  }
  function abrirEditar(a: Articulo) {
    setEditId(a.id)
    setForm({
      nombre: a.nombre,
      categoria: a.categoria,
      descripcion: a.descripcion ?? '',
      precio: Number(a.precio),
      costo: Number(a.costo),
      stock: Number(a.stock),
      activo: a.activo,
    })
    setOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const payload = { ...form, descripcion: form.descripcion || null }
    const { error } = editId
      ? await supabase.from('articulos').update(payload).eq('id', editId)
      : await supabase.from('articulos').insert(payload)
    setSaving(false)
    if (error) return alert('Error al guardar: ' + error.message)
    setOpen(false)
    cargar()
  }

  async function eliminar(a: Articulo) {
    if (!confirm(`¿Eliminar el artículo "${a.nombre}"?`)) return
    const { error } = await supabase.from('articulos').delete().eq('id', a.id)
    if (error) return alert('Error al eliminar: ' + error.message)
    cargar()
  }

  return (
    <div>
      <PageHeader
        title="Artículos / Productos"
        subtitle="Inventario de productos del salón"
        action={
          <button className="btn-primary" onClick={abrirNuevo}>
            <Plus size={16} /> Nuevo artículo
          </button>
        }
      />

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Package className="text-brand-300" size={40} />
          <p className="text-slate-500">Aún no hay artículos.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-pink-100/70">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Artículo</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3 text-right">Costo</th>
                <th className="px-5 py-3 text-right">Precio</th>
                <th className="px-5 py-3 text-right">Stock</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((a) => (
                <tr key={a.id} className={a.activo ? '' : 'opacity-50'}>
                  <td className="px-5 py-3 font-mono font-semibold text-brand-700">#{a.codigo}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{a.nombre}</p>
                    {a.descripcion && <p className="text-xs text-slate-400">{a.descripcion}</p>}
                  </td>
                  <td className="px-5 py-3"><span className="badge bg-brand-50 text-brand-700">{a.categoria}</span></td>
                  <td className="px-5 py-3 text-right text-slate-500">{money(a.costo)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{money(a.precio)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`badge ${Number(a.stock) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{a.stock}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirEditar(a)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
                      <button onClick={() => eliminar(a)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
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
        title={editId ? 'Editar artículo' : 'Nuevo artículo'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Shampoo profesional" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {categorias.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Stock</label>
              <input type="number" min={0} className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Costo (RD$)</label>
              <input type="number" min={0} step={10} className="input" value={form.costo} onChange={(e) => setForm({ ...form, costo: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Precio de venta (RD$)</label>
              <input type="number" min={0} step={10} className="input" value={form.precio} onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            Artículo activo
          </label>
        </div>
      </Modal>
    </div>
  )
}
