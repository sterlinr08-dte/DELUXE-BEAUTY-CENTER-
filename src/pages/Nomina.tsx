import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Empleado, PagoEmpleado, TipoPagoEmpleado } from '../types'
import { money, fechaCorta, hoyISO } from '../lib/format'
import { METODOS_PAGO } from '../lib/constants'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

const tipos: TipoPagoEmpleado[] = ['SALARIO', 'COMISION', 'ADELANTO', 'BONO']

const tipoBadge: Record<TipoPagoEmpleado, string> = {
  SALARIO: 'bg-sky-50 text-sky-700',
  COMISION: 'bg-emerald-50 text-emerald-700',
  ADELANTO: 'bg-amber-50 text-amber-700',
  BONO: 'bg-fuchsia-50 text-fuchsia-700',
}

const vacio = {
  empleado_id: '',
  fecha: hoyISO(),
  periodo: '',
  tipo: 'SALARIO' as TipoPagoEmpleado,
  monto: 0,
  metodo_pago: 'Efectivo',
  notas: '',
}

export default function Nomina() {
  const [items, setItems] = useState<PagoEmpleado[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(vacio)
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('pagos_empleados').select('*').order('fecha', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  async function cargarEmpleados() {
    const { data } = await supabase.from('empleados').select('*').order('nombre')
    setEmpleados(data ?? [])
  }

  useEffect(() => {
    cargar()
    cargarEmpleados()
  }, [])

  const totalMes = items
    .filter((p) => p.fecha.slice(0, 7) === hoyISO().slice(0, 7))
    .reduce((s, p) => s + Number(p.monto), 0)

  function abrirNuevo() {
    setEditId(null)
    setForm(vacio)
    setOpen(true)
  }

  function abrirEditar(p: PagoEmpleado) {
    setEditId(p.id)
    setForm({
      empleado_id: p.empleado_id ?? '',
      fecha: p.fecha,
      periodo: p.periodo ?? '',
      tipo: p.tipo,
      monto: Number(p.monto),
      metodo_pago: p.metodo_pago ?? 'Efectivo',
      notas: p.notas ?? '',
    })
    setOpen(true)
  }

  async function guardar() {
    if (!form.empleado_id) return alert('Selecciona un empleado')
    if (form.monto <= 0) return alert('El monto debe ser mayor que 0')
    setSaving(true)
    const emp = empleados.find((e) => e.id === form.empleado_id)
    const payload = {
      empleado_id: form.empleado_id,
      empleado_nombre: emp?.nombre ?? null,
      fecha: form.fecha,
      periodo: form.periodo || null,
      tipo: form.tipo,
      monto: form.monto,
      metodo_pago: form.metodo_pago,
      notas: form.notas || null,
    }
    const { error } = editId
      ? await supabase.from('pagos_empleados').update(payload).eq('id', editId)
      : await supabase.from('pagos_empleados').insert(payload)
    setSaving(false)
    if (error) return alert('Error al guardar: ' + error.message)
    setOpen(false)
    cargar()
  }

  async function eliminar(p: PagoEmpleado) {
    if (!confirm('¿Eliminar este pago?')) return
    const { error } = await supabase.from('pagos_empleados').delete().eq('id', p.id)
    if (error) return alert('Error al eliminar: ' + error.message)
    cargar()
  }

  return (
    <div>
      <PageHeader
        title="Pagos a empleados"
        subtitle={`Pagado este mes: ${money(totalMes)}`}
        action={
          <button className="btn-primary" onClick={abrirNuevo}>
            <Plus size={16} /> Nuevo pago
          </button>
        }
      />

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Users className="text-brand-300" size={40} />
          <p className="text-slate-500">Aún no hay pagos registrados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-pink-100/70">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Empleado</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Periodo</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 text-slate-600">{fechaCorta(p.fecha)}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{p.empleado_nombre || '—'}</td>
                  <td className="px-5 py-3"><span className={`badge ${tipoBadge[p.tipo]}`}>{p.tipo}</span></td>
                  <td className="px-5 py-3 text-slate-600">{p.periodo || '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{money(p.monto)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirEditar(p)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
                      <button onClick={() => eliminar(p)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
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
        title={editId ? 'Editar pago' : 'Nuevo pago a empleado'}
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
            <label className="label">Empleado</label>
            <select className="input" value={form.empleado_id} onChange={(e) => setForm({ ...form, empleado_id: e.target.value })}>
              <option value="">— Selecciona —</option>
              {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre} ({e.puesto})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoPagoEmpleado })}>
                {tipos.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Monto (RD$)</label>
              <input type="number" min={0} step={50} className="input" value={form.monto} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div>
              <label className="label">Periodo</label>
              <input className="input" value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} placeholder="Ej: 1ra quincena junio" />
            </div>
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
