import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, CalendarDays, Clock, Receipt } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CitaConRelaciones, Cliente, Empleado, EstadoCita, Servicio } from '../types'
import { hora, money, fechaLarga, hoyISO, codigoFactura } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

const SELECT = `*,
  cliente:clientes(id,nombre,telefono),
  empleado:empleados(id,nombre,color),
  servicio:servicios(id,nombre,precio,duracion_min)`

const estados: { value: EstadoCita; label: string; clase: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente', clase: 'bg-amber-50 text-amber-700' },
  { value: 'CONFIRMADA', label: 'Confirmada', clase: 'bg-sky-50 text-sky-700' },
  { value: 'COMPLETADA', label: 'Completada', clase: 'bg-emerald-50 text-emerald-700' },
  { value: 'CANCELADA', label: 'Cancelada', clase: 'bg-rose-50 text-rose-700' },
]

function badgeEstado(e: EstadoCita) {
  return estados.find((x) => x.value === e)?.clase ?? 'bg-slate-100 text-slate-600'
}

function sumarMinutos(h: string, min: number): string {
  const [hh, mm] = h.split(':').map(Number)
  const total = hh * 60 + mm + min
  const nh = Math.floor((total % 1440) / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

const vacio = {
  cliente_id: '',
  empleado_id: '',
  servicio_id: '',
  fecha: hoyISO(),
  hora_inicio: '09:00',
  estado: 'PENDIENTE' as EstadoCita,
  precio: 0,
  notas: '',
}

export default function Citas() {
  const [items, setItems] = useState<CitaConRelaciones[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [fecha, setFecha] = useState(hoyISO())
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(vacio)
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('citas')
      .select(SELECT)
      .eq('fecha', fecha)
      .order('hora_inicio')
    if (error) alert('Error al cargar citas: ' + error.message)
    setItems((data as CitaConRelaciones[]) ?? [])
    setLoading(false)
  }

  async function cargarCatalogos() {
    const [cl, em, se] = await Promise.all([
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('empleados').select('*').eq('activo', true).order('nombre'),
      supabase.from('servicios').select('*').eq('activo', true).order('nombre'),
    ])
    setClientes(cl.data ?? [])
    setEmpleados(em.data ?? [])
    setServicios(se.data ?? [])
  }

  useEffect(() => {
    cargarCatalogos()
  }, [])

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha])

  function abrirNuevo() {
    setEditId(null)
    setForm({ ...vacio, fecha })
    setOpen(true)
  }

  function abrirEditar(c: CitaConRelaciones) {
    setEditId(c.id)
    setForm({
      cliente_id: c.cliente_id ?? '',
      empleado_id: c.empleado_id ?? '',
      servicio_id: c.servicio_id ?? '',
      fecha: c.fecha,
      hora_inicio: c.hora_inicio.slice(0, 5),
      estado: c.estado,
      precio: Number(c.precio),
      notas: c.notas ?? '',
    })
    setOpen(true)
  }

  function elegirServicio(id: string) {
    const s = servicios.find((x) => x.id === id)
    setForm((f) => ({ ...f, servicio_id: id, precio: s ? Number(s.precio) : f.precio }))
  }

  async function guardar() {
    if (!form.cliente_id) return alert('Selecciona un cliente')
    if (!form.servicio_id) return alert('Selecciona un servicio')
    setSaving(true)
    const serv = servicios.find((s) => s.id === form.servicio_id)
    const payload = {
      cliente_id: form.cliente_id,
      empleado_id: form.empleado_id || null,
      servicio_id: form.servicio_id,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      hora_fin: serv ? sumarMinutos(form.hora_inicio, serv.duracion_min) : null,
      estado: form.estado,
      precio: form.precio,
      notas: form.notas || null,
    }
    const { error } = editId
      ? await supabase.from('citas').update(payload).eq('id', editId)
      : await supabase.from('citas').insert(payload)
    setSaving(false)
    if (error) return alert('Error al guardar: ' + error.message)
    setOpen(false)
    if (form.fecha !== fecha) setFecha(form.fecha)
    else cargar()
  }

  async function cambiarEstado(c: CitaConRelaciones, estado: EstadoCita) {
    const { error } = await supabase.from('citas').update({ estado }).eq('id', c.id)
    if (error) return alert('Error: ' + error.message)
    cargar()
  }

  async function eliminar(c: CitaConRelaciones) {
    if (!confirm('¿Eliminar esta cita?')) return
    const { error } = await supabase.from('citas').delete().eq('id', c.id)
    if (error) return alert('Error al eliminar: ' + error.message)
    cargar()
  }

  // Genera una factura (PENDIENTE) a partir de la cita, lista para cobrar en Caja
  async function facturar(c: CitaConRelaciones) {
    // Evitar doble facturación
    const { data: existente } = await supabase.from('facturas').select('id,numero,tipo_venta,serie').eq('cita_id', c.id).maybeSingle()
    if (existente) return alert(`Esta cita ya tiene la factura ${codigoFactura(existente as any)}. Cóbrala en Caja.`)
    if (!confirm(`¿Generar factura de ${money(c.precio)} para ${c.cliente?.nombre ?? 'el cliente'}? Luego se cobra en Caja.`)) return

    const { data: factura, error } = await supabase
      .from('facturas')
      .insert({
        cliente_id: c.cliente_id,
        cliente_nombre: c.cliente?.nombre ?? 'Cliente',
        cita_id: c.id,
        fecha: hoyISO(),
        subtotal: c.precio,
        descuento: 0,
        itbis: 0,
        total: c.precio,
        estado: 'PENDIENTE',
        metodo_pago: null,
      })
      .select()
      .single()
    if (error || !factura) return alert('Error al facturar: ' + error?.message)

    await supabase.from('factura_items').insert({
      factura_id: factura.id,
      servicio_id: c.servicio_id,
      empleado_id: c.empleado_id || null,
      descripcion: c.servicio?.nombre ?? 'Servicio',
      cantidad: 1,
      precio_unit: c.precio,
      importe: c.precio,
    })
    // Marcar la cita como completada
    if (c.estado !== 'COMPLETADA') await supabase.from('citas').update({ estado: 'COMPLETADA' }).eq('id', c.id)
    alert(`Factura ${codigoFactura(factura)} generada. Ahora cóbrala en Caja.`)
    cargar()
  }

  return (
    <div>
      <PageHeader
        title="Citas / Agenda"
        subtitle={fechaLarga(fecha)}
        action={
          <div className="flex items-center gap-2">
            <input type="date" className="input w-auto" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <button className="btn-primary" onClick={abrirNuevo}>
              <Plus size={16} /> Nueva cita
            </button>
          </div>
        }
      />

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <CalendarDays className="text-brand-300" size={40} />
          <p className="text-slate-500">No hay citas para este día.</p>
          <button className="btn-primary" onClick={abrirNuevo}>
            <Plus size={16} /> Agendar cita
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center gap-4">
              <div className="flex w-24 shrink-0 flex-col items-center rounded-lg bg-brand-50 py-2 text-brand-700">
                <Clock size={16} />
                <span className="mt-1 text-sm font-semibold">{hora(c.hora_inicio)}</span>
                {c.hora_fin && <span className="text-xs text-brand-400">{hora(c.hora_fin)}</span>}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">{c.cliente?.nombre ?? 'Cliente eliminado'}</p>
                <p className="text-sm text-slate-500">
                  {c.servicio?.nombre ?? 'Servicio'} · {money(c.precio)}
                </p>
                {c.empleado && (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.empleado.color ?? '#d946ef' }} />
                    {c.empleado.nombre}
                  </span>
                )}
              </div>

              <select
                className={`badge cursor-pointer border-0 ${badgeEstado(c.estado)}`}
                value={c.estado}
                onChange={(e) => cambiarEstado(c, e.target.value as EstadoCita)}
              >
                {estados.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-1">
                {c.estado !== 'CANCELADA' && (
                  <button onClick={() => facturar(c)} title="Generar factura" className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600">
                    <Receipt size={16} />
                  </button>
                )}
                <button onClick={() => abrirEditar(c)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                  <Pencil size={16} />
                </button>
                <button onClick={() => eliminar(c)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={editId ? 'Editar cita' : 'Nueva cita'}
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
            <label className="label">Cliente</label>
            <select className="input" value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
              <option value="">— Selecciona —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Servicio</label>
            <select className="input" value={form.servicio_id} onChange={(e) => elegirServicio(e.target.value)}>
              <option value="">— Selecciona —</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre} · {money(s.precio)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Empleado</label>
            <select className="input" value={form.empleado_id} onChange={(e) => setForm({ ...form, empleado_id: e.target.value })}>
              <option value="">— Sin asignar —</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre} ({e.puesto})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div>
              <label className="label">Hora</label>
              <input type="time" className="input" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
            </div>
            <div>
              <label className="label">Precio</label>
              <input type="number" min={0} step={50} className="input" value={form.precio || ''} onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoCita })}>
              {estados.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
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
