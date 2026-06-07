import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Cliente } from '../types'
import { fechaCorta } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

const vacio = {
  nombre: '',
  telefono: '',
  email: '',
  fecha_nacimiento: '',
  notas: '',
}

export default function Clientes() {
  const [items, setItems] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(vacio)
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase.from('clientes').select('*').order('nombre')
    if (error) alert('Error al cargar clientes: ' + error.message)
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.telefono ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    )
  }, [items, busqueda])

  function abrirNuevo() {
    setEditId(null)
    setForm(vacio)
    setOpen(true)
  }

  function abrirEditar(c: Cliente) {
    setEditId(c.id)
    setForm({
      nombre: c.nombre,
      telefono: c.telefono ?? '',
      email: c.email ?? '',
      fecha_nacimiento: c.fecha_nacimiento ?? '',
      notas: c.notas ?? '',
    })
    setOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const payload = {
      nombre: form.nombre,
      telefono: form.telefono || null,
      email: form.email || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      notas: form.notas || null,
    }
    const { error } = editId
      ? await supabase.from('clientes').update(payload).eq('id', editId)
      : await supabase.from('clientes').insert(payload)
    setSaving(false)
    if (error) return alert('Error al guardar: ' + error.message)
    setOpen(false)
    cargar()
  }

  async function eliminar(c: Cliente) {
    if (!confirm(`¿Eliminar a "${c.nombre}"?`)) return
    const { error } = await supabase.from('clientes').delete().eq('id', c.id)
    if (error) return alert('Error al eliminar: ' + error.message)
    cargar()
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${items.length} cliente(s) registrados`}
        action={
          <button className="btn-primary" onClick={abrirNuevo}>
            <Plus size={16} /> Nuevo cliente
          </button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por nombre, teléfono o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Users className="text-brand-300" size={40} />
          <p className="text-slate-500">No hay clientes que coincidan.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Teléfono</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Nacimiento</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 font-medium text-slate-800">{c.nombre}</td>
                  <td className="px-5 py-3 text-slate-600">{c.telefono || '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{c.email || '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{c.fecha_nacimiento ? fechaCorta(c.fecha_nacimiento) : '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirEditar(c)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => eliminar(c)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
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
        title={editId ? 'Editar cliente' : 'Nuevo cliente'}
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
            <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha de nacimiento</label>
              <input type="date" className="input" value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Preferencias, alergias, etc." />
          </div>
        </div>
      </Modal>
    </div>
  )
}
