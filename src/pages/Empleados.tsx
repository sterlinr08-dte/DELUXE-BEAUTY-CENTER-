import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, UserCog } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Empleado } from '../types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

const vacio = {
  nombre: '',
  puesto: 'Estilista',
  telefono: '',
  email: '',
  especialidad: '',
  color: '#d946ef',
  comision_pct: 0,
  activo: true,
}

const puestos = ['Estilista', 'Manicurista', 'Esteticista', 'Maquillista', 'Barbero', 'Recepción', 'Gerente']

export default function Empleados() {
  const [items, setItems] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(vacio)
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase.from('empleados').select('*').order('nombre')
    if (error) alert('Error al cargar empleados: ' + error.message)
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

  function abrirEditar(e: Empleado) {
    setEditId(e.id)
    setForm({
      nombre: e.nombre,
      puesto: e.puesto,
      telefono: e.telefono ?? '',
      email: e.email ?? '',
      especialidad: e.especialidad ?? '',
      color: e.color ?? '#d946ef',
      comision_pct: Number(e.comision_pct),
      activo: e.activo,
    })
    setOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    const payload = {
      ...form,
      telefono: form.telefono || null,
      email: form.email || null,
      especialidad: form.especialidad || null,
    }
    const { error } = editId
      ? await supabase.from('empleados').update(payload).eq('id', editId)
      : await supabase.from('empleados').insert(payload)
    setSaving(false)
    if (error) return alert('Error al guardar: ' + error.message)
    setOpen(false)
    cargar()
  }

  async function eliminar(e: Empleado) {
    if (!confirm(`¿Eliminar a "${e.nombre}"?`)) return
    const { error } = await supabase.from('empleados').delete().eq('id', e.id)
    if (error) return alert('Error al eliminar: ' + error.message)
    cargar()
  }

  return (
    <div>
      <PageHeader
        title="Empleados"
        subtitle="Personal del salón"
        action={
          <button className="btn-primary" onClick={abrirNuevo}>
            <Plus size={16} /> Nuevo empleado
          </button>
        }
      />

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <UserCog className="text-brand-300" size={40} />
          <p className="text-slate-500">Aún no hay empleados registrados.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <div key={e.id} className={`card ${e.activo ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: e.color ?? '#d946ef' }}
                >
                  {e.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{e.nombre}</p>
                  <p className="text-sm text-brand-600">{e.puesto}</p>
                  {e.especialidad && <p className="mt-0.5 truncate text-xs text-slate-400">{e.especialidad}</p>}
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-500">
                {e.telefono && <p>📞 {e.telefono}</p>}
                {e.email && <p className="truncate">✉️ {e.email}</p>}
                <p>💰 Comisión: {Number(e.comision_pct)}%</p>
              </div>
              <div className="mt-4 flex justify-end gap-1 border-t border-slate-50 pt-3">
                <button onClick={() => abrirEditar(e)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                  <Pencil size={16} />
                </button>
                <button onClick={() => eliminar(e)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={editId ? 'Editar empleado' : 'Nuevo empleado'}
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
            <input className="input" value={form.nombre} onChange={(ev) => setForm({ ...form, nombre: ev.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Puesto</label>
              <select className="input" value={form.puesto} onChange={(ev) => setForm({ ...form, puesto: ev.target.value })}>
                {puestos.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Comisión (%)</label>
              <input type="number" min={0} max={100} className="input" value={form.comision_pct || ''} onChange={(ev) => setForm({ ...form, comision_pct: Number(ev.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={form.telefono} onChange={(ev) => setForm({ ...form, telefono: ev.target.value })} />
            </div>
            <div>
              <label className="label">Color (agenda)</label>
              <input type="color" className="h-[42px] w-full rounded-lg border border-slate-300" value={form.color} onChange={(ev) => setForm({ ...form, color: ev.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(ev) => setForm({ ...form, email: ev.target.value })} />
          </div>
          <div>
            <label className="label">Especialidad</label>
            <input className="input" value={form.especialidad} onChange={(ev) => setForm({ ...form, especialidad: ev.target.value })} placeholder="Cortes y color" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.activo} onChange={(ev) => setForm({ ...form, activo: ev.target.checked })} />
            Empleado activo
          </label>
        </div>
      </Modal>
    </div>
  )
}
