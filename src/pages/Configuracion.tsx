import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, UserPlus, ShieldCheck, Users as UsersIcon, Store, Tags, Truck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { MODULOS, ACCIONES, etiquetaPermiso, Rol } from '../lib/permisos'
import { Empleado, Proveedor } from '../types'
import { useAuth } from '../lib/auth'
import { useNegocio } from '../lib/negocio'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface UsuarioRow {
  id: string
  nombre: string | null
  username: string | null
  email: string | null
  rol_key: string | null
  empleado_id: string | null
  activo: boolean
  roles: { nombre: string } | null
}

export default function Configuracion() {
  const { perfil, recargarPerfil } = useAuth()
  const { recargarNegocio } = useNegocio()
  const [tab, setTab] = useState<'usuarios' | 'roles' | 'proveedores' | 'negocio' | 'categorias'>('usuarios')
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)

  // proveedores
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [openP, setOpenP] = useState(false)
  const [editP, setEditP] = useState<Proveedor | null>(null)
  const [formP, setFormP] = useState({ nombre: '', telefono: '', contacto: '', notas: '', activo: true })
  const [savingP, setSavingP] = useState(false)

  // datos del negocio
  const [formNeg, setFormNeg] = useState({ nombre: '', direccion: '', referencia: '', telefono: '', whatsapp: '', instagram: '', rnc: '' })
  const [savingNeg, setSavingNeg] = useState(false)

  // categorías
  const [categorias, setCategorias] = useState<{ id: string; nombre: string; tipo: string }[]>([])
  const [catNombre, setCatNombre] = useState('')
  const [catTipo, setCatTipo] = useState<'articulo' | 'servicio'>('articulo')

  // modal usuario
  const [openU, setOpenU] = useState(false)
  const [editU, setEditU] = useState<UsuarioRow | null>(null)
  const [formU, setFormU] = useState({ nombre: '', usuario: '', password: '', rol_key: '', empleado_id: '', activo: true })
  const [savingU, setSavingU] = useState(false)

  // modal rol
  const [openR, setOpenR] = useState(false)
  const [editR, setEditR] = useState<Rol | null>(null)
  const [formR, setFormR] = useState<{ key: string; nombre: string; permisos: string[] }>({ key: '', nombre: '', permisos: [] })
  const [savingR, setSavingR] = useState(false)

  async function cargar() {
    setLoading(true)
    const [u, r, e] = await Promise.all([
      supabase.from('perfiles').select('id,nombre,username,email,rol_key,empleado_id,activo, roles(nombre)').order('nombre'),
      supabase.from('roles').select('*').order('nombre'),
      supabase.from('empleados').select('*').eq('activo', true).order('nombre'),
    ])
    setUsuarios((u.data as any) ?? [])
    setRoles((r.data as any) ?? [])
    setEmpleados((e.data as any) ?? [])
    const { data: neg } = await supabase.from('ajustes_negocio').select('*').maybeSingle()
    if (neg) setFormNeg({
      nombre: neg.nombre ?? '', direccion: neg.direccion ?? '', referencia: neg.referencia ?? '',
      telefono: neg.telefono ?? '', whatsapp: neg.whatsapp ?? '', instagram: neg.instagram ?? '', rnc: neg.rnc ?? '',
    })
    const { data: cats } = await supabase.from('categorias').select('id,nombre,tipo').order('tipo').order('nombre')
    setCategorias((cats as any) ?? [])
    const { data: prov } = await supabase.from('proveedores').select('*').order('nombre')
    setProveedores((prov as any) ?? [])
    setLoading(false)
  }

  // ---------- PROVEEDORES ----------
  function nuevoProveedor() {
    setEditP(null)
    setFormP({ nombre: '', telefono: '', contacto: '', notas: '', activo: true })
    setOpenP(true)
  }
  function editarProveedor(p: Proveedor) {
    setEditP(p)
    setFormP({ nombre: p.nombre, telefono: p.telefono ?? '', contacto: p.contacto ?? '', notas: p.notas ?? '', activo: p.activo })
    setOpenP(true)
  }
  async function guardarProveedor() {
    if (!formP.nombre.trim()) return alert('El nombre del proveedor es obligatorio')
    setSavingP(true)
    const payload = {
      nombre: formP.nombre.trim(),
      telefono: formP.telefono || null,
      contacto: formP.contacto || null,
      notas: formP.notas || null,
      activo: formP.activo,
    }
    const { error } = editP
      ? await supabase.from('proveedores').update(payload).eq('id', editP.id)
      : await supabase.from('proveedores').insert(payload)
    setSavingP(false)
    if (error) return alert('Error: ' + error.message)
    setOpenP(false)
    cargar()
  }
  async function eliminarProveedor(p: Proveedor) {
    if (!confirm(`¿Eliminar al proveedor "${p.nombre}"? Las compras ya registradas no cambian.`)) return
    const { error } = await supabase.from('proveedores').delete().eq('id', p.id)
    if (error) return alert('Error: ' + error.message)
    cargar()
  }

  async function agregarCategoria() {
    if (!catNombre.trim()) return alert('Escribe el nombre de la categoría')
    const { error } = await supabase.from('categorias').insert({ nombre: catNombre.trim(), tipo: catTipo })
    if (error) return alert(error.message.includes('duplicate') ? 'Esa categoría ya existe' : 'Error: ' + error.message)
    setCatNombre('')
    cargar()
  }

  async function eliminarCategoria(id: string) {
    if (!confirm('¿Eliminar esta categoría? Los registros que ya la usan no cambian.')) return
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) return alert('Error: ' + error.message)
    cargar()
  }

  async function guardarNegocio() {
    if (!formNeg.nombre.trim()) return alert('El nombre del negocio es obligatorio')
    setSavingNeg(true)
    const { error } = await supabase.from('ajustes_negocio').update({ ...formNeg, updated_at: new Date().toISOString() }).eq('id', true)
    setSavingNeg(false)
    if (error) return alert('Error: ' + error.message)
    await recargarNegocio()
    alert('Datos del negocio actualizados ✓')
  }

  useEffect(() => {
    cargar()
  }, [])

  // ---------- USUARIOS ----------
  function nuevoUsuario() {
    setEditU(null)
    setFormU({ nombre: '', usuario: '', password: '', rol_key: roles[0]?.key ?? '', empleado_id: '', activo: true })
    setOpenU(true)
  }
  function editarUsuario(u: UsuarioRow) {
    setEditU(u)
    setFormU({ nombre: u.nombre ?? '', usuario: u.username ?? '', password: '', rol_key: u.rol_key ?? '', empleado_id: u.empleado_id ?? '', activo: u.activo })
    setOpenU(true)
  }

  function elegirEmpleado(id: string) {
    const emp = empleados.find((e) => e.id === id)
    setFormU((f) => ({ ...f, empleado_id: id, nombre: emp ? emp.nombre : f.nombre }))
  }

  async function guardarUsuario() {
    if (!editU && !formU.empleado_id) return alert('Selecciona el empleado')
    if (!editU && (!formU.usuario || !formU.password)) return alert('Usuario y contraseña son obligatorios')
    if (!editU && formU.password.length < 6) return alert('La contraseña debe tener al menos 6 caracteres')
    setSavingU(true)
    const accion = editU ? 'actualizar' : 'crear'
    const payload: any = editU
      ? { accion, id: editU.id, nombre: formU.nombre, rol_key: formU.rol_key, empleado_id: formU.empleado_id || null, activo: formU.activo }
      : { accion, username: formU.usuario, password: formU.password, nombre: formU.nombre, rol_key: formU.rol_key, empleado_id: formU.empleado_id || null }
    if (editU && formU.password) payload.password = formU.password
    const { data, error } = await supabase.functions.invoke('gestionar-usuarios', { body: payload })
    setSavingU(false)
    if (error || (data as any)?.error) return alert('Error: ' + (((data as any)?.error) || error?.message))
    setOpenU(false)
    cargar()
    if (editU?.id === perfil?.id) recargarPerfil()
  }

  async function eliminarUsuario(u: UsuarioRow) {
    if (u.id === perfil?.id) return alert('No puedes eliminar tu propio usuario')
    if (!confirm(`¿Eliminar al usuario "${u.nombre || u.email}"? No podrá iniciar sesión.`)) return
    const { data, error } = await supabase.functions.invoke('gestionar-usuarios', { body: { accion: 'eliminar', id: u.id } })
    if (error || (data as any)?.error) return alert('Error: ' + (((data as any)?.error) || error?.message))
    cargar()
  }

  // ---------- ROLES ----------
  function nuevoRol() {
    setEditR(null)
    setFormR({ key: '', nombre: '', permisos: ['panel'] })
    setOpenR(true)
  }
  function editarRol(r: Rol) {
    setEditR(r)
    setFormR({ key: r.key, nombre: r.nombre, permisos: r.permisos ?? [] })
    setOpenR(true)
  }
  function toggleModulo(m: string) {
    setFormR((f) => ({
      ...f,
      permisos: f.permisos.includes(m) ? f.permisos.filter((x) => x !== m) : [...f.permisos, m],
    }))
  }

  async function guardarRol() {
    if (!formR.nombre.trim()) return alert('El nombre del rol es obligatorio')
    setSavingR(true)
    let error
    if (editR) {
      ;({ error } = await supabase.from('roles').update({ nombre: formR.nombre, permisos: formR.permisos }).eq('key', editR.key))
    } else {
      const key = formR.nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      ;({ error } = await supabase.from('roles').insert({ key, nombre: formR.nombre, permisos: formR.permisos }))
    }
    setSavingR(false)
    if (error) return alert('Error: ' + error.message)
    setOpenR(false)
    cargar()
    recargarPerfil()
  }

  async function eliminarRol(r: Rol) {
    if (r.protegido) return alert('Este rol no se puede eliminar')
    if (!confirm(`¿Eliminar el rol "${r.nombre}"?`)) return
    const { error } = await supabase.from('roles').delete().eq('key', r.key)
    if (error) return alert('Error: ' + error.message)
    cargar()
  }

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Usuarios, roles y niveles de acceso" />

      <div className="mb-5 flex gap-2">
        <button onClick={() => setTab('usuarios')} className={tab === 'usuarios' ? 'btn-primary' : 'btn-ghost'}>
          <UsersIcon size={16} /> Usuarios
        </button>
        <button onClick={() => setTab('roles')} className={tab === 'roles' ? 'btn-primary' : 'btn-ghost'}>
          <ShieldCheck size={16} /> Roles y permisos
        </button>
        <button onClick={() => setTab('proveedores')} className={tab === 'proveedores' ? 'btn-primary' : 'btn-ghost'}>
          <Truck size={16} /> Proveedores
        </button>
        <button onClick={() => setTab('negocio')} className={tab === 'negocio' ? 'btn-primary' : 'btn-ghost'}>
          <Store size={16} /> Negocio
        </button>
        <button onClick={() => setTab('categorias')} className={tab === 'categorias' ? 'btn-primary' : 'btn-ghost'}>
          <Tags size={16} /> Categorías
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : tab === 'usuarios' ? (
        <div>
          <div className="mb-4 flex justify-end">
            <button className="btn-primary" onClick={nuevoUsuario}>
              <UserPlus size={16} /> Nuevo usuario
            </button>
          </div>
          <div className="overflow-x-auto panel-3d">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="thead-3d">
                <tr>
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3 font-medium text-slate-800">{u.nombre || '—'}</td>
                    <td className="px-5 py-3 font-mono text-slate-600">{u.username || '—'}</td>
                    <td className="px-5 py-3"><span className="badge bg-brand-50 text-brand-700">{u.roles?.nombre || u.rol_key || '—'}</span></td>
                    <td className="px-5 py-3">
                      <span className={`badge ${u.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => editarUsuario(u)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
                        <button onClick={() => eliminarUsuario(u)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'roles' ? (
        <div>
          <div className="mb-4 flex justify-end">
            <button className="btn-primary" onClick={nuevoRol}>
              <Plus size={16} /> Nuevo rol
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map((r) => (
              <div key={r.key} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{r.nombre}</p>
                    {r.es_admin && <span className="badge mt-1 bg-gold-400/20 text-gold-600">Acceso total</span>}
                  </div>
                  <div className="flex gap-1">
                    {!r.es_admin && (
                      <button onClick={() => editarRol(r)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
                    )}
                    {!r.protegido && (
                      <button onClick={() => eliminarRol(r)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(r.es_admin ? MODULOS.map((m) => m.key) : r.permisos).map((m) => (
                    <span key={m} className="badge bg-slate-100 text-slate-600">{etiquetaPermiso(m)}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'proveedores' ? (
        <div>
          <div className="mb-4 flex justify-end">
            <button className="btn-primary" onClick={nuevoProveedor}>
              <Plus size={16} /> Nuevo proveedor
            </button>
          </div>
          {proveedores.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 py-12 text-center">
              <Truck className="text-brand-300" size={40} />
              <p className="text-slate-500">Aún no hay proveedores. Crea el primero para elegirlo en Compras.</p>
            </div>
          ) : (
            <div className="overflow-x-auto panel-3d">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="thead-3d">
                  <tr>
                    <th className="px-5 py-3">Proveedor</th>
                    <th className="px-5 py-3">Teléfono</th>
                    <th className="px-5 py-3">Contacto</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {proveedores.map((p) => (
                    <tr key={p.id} className={p.activo ? '' : 'opacity-60'}>
                      <td className="px-5 py-3 font-medium text-slate-800">{p.nombre}</td>
                      <td className="px-5 py-3 text-slate-600">{p.telefono || '—'}</td>
                      <td className="px-5 py-3 text-slate-600">{p.contacto || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`badge ${p.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => editarProveedor(p)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button>
                          <button onClick={() => eliminarProveedor(p)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tab === 'negocio' ? (
        <div className="max-w-2xl">
          <div className="card space-y-4">
            <div>
              <label className="label">Nombre del negocio</label>
              <input className="input" value={formNeg.nombre} onChange={(e) => setFormNeg({ ...formNeg, nombre: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">RNC</label>
                <input className="input" value={formNeg.rnc} onChange={(e) => setFormNeg({ ...formNeg, rnc: e.target.value })} placeholder="Aparece en los tickets" />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={formNeg.telefono} onChange={(e) => setFormNeg({ ...formNeg, telefono: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">WhatsApp</label>
                <input className="input" value={formNeg.whatsapp} onChange={(e) => setFormNeg({ ...formNeg, whatsapp: e.target.value })} />
              </div>
              <div>
                <label className="label">Instagram</label>
                <input className="input" value={formNeg.instagram} onChange={(e) => setFormNeg({ ...formNeg, instagram: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Dirección</label>
              <input className="input" value={formNeg.direccion} onChange={(e) => setFormNeg({ ...formNeg, direccion: e.target.value })} />
            </div>
            <div>
              <label className="label">Referencia</label>
              <input className="input" value={formNeg.referencia} onChange={(e) => setFormNeg({ ...formNeg, referencia: e.target.value })} placeholder="Ej: Frente a Banco Popular" />
            </div>
            <p className="text-xs text-slate-400">Estos datos aparecen en los tickets de cobro, facturas, comprobantes de cierre, el panel y el inicio de sesión.</p>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={guardarNegocio} disabled={savingNeg}>{savingNeg ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          <div className="card space-y-3">
            <label className="label">Nueva categoría</label>
            <div className="flex flex-wrap gap-2">
              <input className="input flex-1" placeholder="Ej: Bebidas, Spa, Barbería…" value={catNombre} onChange={(e) => setCatNombre(e.target.value)} />
              <select className="input w-auto" value={catTipo} onChange={(e) => setCatTipo(e.target.value as 'articulo' | 'servicio')}>
                <option value="articulo">Artículo</option>
                <option value="servicio">Servicio</option>
              </select>
              <button className="btn-primary" onClick={agregarCategoria}><Plus size={16} /> Agregar</button>
            </div>
          </div>
          {(['articulo', 'servicio'] as const).map((t) => (
            <div key={t} className="card">
              <h3 className="mb-3 font-display font-bold text-slate-800">{t === 'articulo' ? 'Categorías de artículos' : 'Categorías de servicios'}</h3>
              <div className="flex flex-wrap gap-2">
                {categorias.filter((c) => c.tipo === t).map((c) => (
                  <span key={c.id} className="badge flex items-center gap-1 bg-slate-100 text-slate-600">
                    {c.nombre}
                    <button onClick={() => eliminarCategoria(c.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={12} /></button>
                  </span>
                ))}
                {categorias.filter((c) => c.tipo === t).length === 0 && <p className="text-sm text-slate-400">Sin categorías.</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL USUARIO */}
      <Modal
        open={openU}
        title={editU ? 'Editar usuario' : 'Nuevo usuario'}
        onClose={() => setOpenU(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpenU(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardarUsuario} disabled={savingU}>{savingU ? 'Guardando…' : 'Guardar'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Empleado</label>
            <select className="input" value={formU.empleado_id} onChange={(e) => elegirEmpleado(e.target.value)}>
              <option value="">— Selecciona el empleado —</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.nombre}{emp.puesto ? ` (${emp.puesto})` : ''}</option>
              ))}
            </select>
            {empleados.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No hay empleados activos. Agrégalos primero en el módulo Empleados.</p>
            )}
          </div>
          <div>
            <label className="label">Usuario (para iniciar sesión)</label>
            <input type="text" className="input lowercase disabled:bg-slate-100" value={formU.usuario} disabled={!!editU} autoCapitalize="none" autoCorrect="off" onChange={(e) => setFormU({ ...formU, usuario: e.target.value })} placeholder="ej: maria" />
            {editU ? <p className="mt-1 text-xs text-slate-400">El usuario no se puede cambiar.</p> : <p className="mt-1 text-xs text-slate-400">Sin espacios. No importa mayúsculas/minúsculas.</p>}
          </div>
          <div>
            <label className="label">{editU ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
            <input type="text" className="input" value={formU.password} onChange={(e) => setFormU({ ...formU, password: e.target.value })} placeholder={editU ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'} />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={formU.rol_key} onChange={(e) => setFormU({ ...formU, rol_key: e.target.value })}>
              <option value="">— Sin rol —</option>
              {roles.map((r) => <option key={r.key} value={r.key}>{r.nombre}</option>)}
            </select>
          </div>
          {editU && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={formU.activo} onChange={(e) => setFormU({ ...formU, activo: e.target.checked })} />
              Usuario activo (puede iniciar sesión)
            </label>
          )}
        </div>
      </Modal>

      {/* MODAL ROL */}
      <Modal
        open={openR}
        title={editR ? `Editar rol: ${editR.nombre}` : 'Nuevo rol'}
        onClose={() => setOpenR(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpenR(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardarRol} disabled={savingR}>{savingR ? 'Guardando…' : 'Guardar'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre del rol</label>
            <input className="input" value={formR.nombre} onChange={(e) => setFormR({ ...formR, nombre: e.target.value })} placeholder="Ej: Cajera" />
          </div>
          <div>
            <label className="label">Módulos a los que tiene acceso</label>
            <div className="grid grid-cols-2 gap-2">
              {MODULOS.map((m) => (
                <label key={m.key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  <input type="checkbox" checked={formR.permisos.includes(m.key)} onChange={() => toggleModulo(m.key)} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Funciones permitidas (control de acciones)</label>
            <p className="mb-2 text-xs text-slate-400">Activa solo lo que este rol está autorizado a hacer. Lo demás queda bloqueado.</p>
            <div className="space-y-2">
              {ACCIONES.map((a) => (
                <label key={a.key} className="flex items-center gap-2 rounded-lg border border-pink-100 bg-pink-50/30 px-3 py-2 text-sm text-slate-600">
                  <input type="checkbox" checked={formR.permisos.includes(a.key)} onChange={() => toggleModulo(a.key)} />
                  <span>{a.label}</span>
                  <span className="ml-auto badge bg-slate-100 text-slate-500">{etiquetaPermiso(a.modulo)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL PROVEEDOR */}
      <Modal
        open={openP}
        title={editP ? 'Editar proveedor' : 'Nuevo proveedor'}
        onClose={() => setOpenP(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpenP(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardarProveedor} disabled={savingP}>{savingP ? 'Guardando…' : 'Guardar'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre del proveedor</label>
            <input className="input" value={formP.nombre} onChange={(e) => setFormP({ ...formP, nombre: e.target.value })} placeholder="Ej: Distribuidora Bella" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={formP.telefono} onChange={(e) => setFormP({ ...formP, telefono: e.target.value })} />
            </div>
            <div>
              <label className="label">Contacto</label>
              <input className="input" value={formP.contacto} onChange={(e) => setFormP({ ...formP, contacto: e.target.value })} placeholder="Persona / vendedor" />
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={formP.notas} onChange={(e) => setFormP({ ...formP, notas: e.target.value })} />
          </div>
          {editP && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={formP.activo} onChange={(e) => setFormP({ ...formP, activo: e.target.checked })} />
              Proveedor activo
            </label>
          )}
        </div>
      </Modal>
    </div>
  )
}
