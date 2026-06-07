import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Scissors } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Servicio } from '../types'
import { money } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

const vacio = {
  nombre: '',
  categoria: 'Cabello',
  descripcion: '',
  duracion_min: 30,
  precio: 0,
  activo: true,
}

const categorias = ['Cabello', 'Uñas', 'Facial', 'Maquillaje', 'Depilación', 'General']

export default function Servicios() {
  const [items, setItems] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(vacio)
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase.from('servicios').select('*').order('categoria').order('nombre')
    if (error) alert('Error al cargar servicios: ' + error.message)
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

  function abrirEditar(s: Servicio) {
    setEditId(s.id)
    setForm({
      nombre: s.nombre,
      categoria: s.categoria,
      descripcion: s.descripcion ?? '',
      duracion_min: s.duracion_min,
      precio: Number(s.precio),
      activo: s.activo,
    })
    setOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const payload = { ...form, descripcion: form.descripcion || null }
    const { error } = editId
      ? await supabase.from('servicios').update(payload).eq('id', editId)
      : await supabase.from('servicios').insert(payload)
    setSaving(false)
    if (error) return alert('Error al guardar: ' + error.message)
    setOpen(false)
    cargar()
  }

  async function eliminar(s: Servicio) {
    if (!confirm(`¿Eliminar el servicio "${s.nombre}"?`)) return
    const { error } = await supabase.from('servicios').delete().eq('id', s.id)
    if (error) return alert('Error al eliminar: ' + error.message)
    cargar()
  }

  return (
    <div>
      <PageHeader
        title="Servicios y precios"
        subtitle="Catálogo de servicios del salón"
        action={
          <button className="btn-primary" onClick={abrirNuevo}>
            <Plus size={16} /> Nuevo servicio
          </button>
        }
      />

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Scissors className="text-brand-300" size={40} />
          <p className="text-slate-500">Aún no hay servicios. Agrega el primero.</p>
        </div>
      ) : (
        <div className="overflow-x-auto panel-3d">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="thead-3d">
              <tr>
                <th className="px-5 py-3">Servicio</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Duración</th>
                <th className="px-5 py-3 text-right">Precio</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((s) => (
                <tr key={s.id} className={s.activo ? '' : 'opacity-50'}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{s.nombre}</p>
                    {s.descripcion && <p className="text-xs text-slate-400">{s.descripcion}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="badge bg-brand-50 text-brand-700">{s.categoria}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{s.duracion_min} min</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{money(s.precio)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirEditar(s)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => eliminar(s)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={16} />
                      </button>
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
        title={editId ? 'Editar servicio' : 'Nuevo servicio'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardar} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Corte de cabello" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {categorias.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Duración (min)</label>
              <input type="number" min={5} step={5} className="input" value={form.duracion_min} onChange={(e) => setForm({ ...form, duracion_min: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">Precio (RD$)</label>
            <input type="number" min={0} step={50} className="input" value={form.precio} onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            Servicio activo
          </label>
        </div>
      </Modal>
    </div>
  )
}
