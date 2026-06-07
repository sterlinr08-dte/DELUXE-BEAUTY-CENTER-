import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, UserPlus, ShieldCheck, Users as UsersIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { MODULOS, Rol } from '../lib/permisos'
import { useAuth } from '../lib/auth'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface UsuarioRow {
  id: string
  nombre: string | null
  username: string | null
  email: string | null
  rol_key: string | null
  activo: boolean
  roles: { nombre: string } | null
}

export default function Configuracion() {
  const { perfil, recargarPerfil } = useAuth()
  const [tab, setTab] = useState<'usuarios' | 'roles'>('usuarios')
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [loading, setLoading] = useState(true)

  // modal usuario
  const [openU, setOpenU] = useState(false)
  const [editU, setEditU] = useState<UsuarioRow | null>(null)
  const [formU, setFormU] = useState({ nombre: '', usuario: '', password: '', rol_key: '', activo: true })
  const [savingU, setSavingU] = useState(false)

  // modal rol
  const [openR, setOpenR] = useState(false)
  const [editR, setEditR] = useState<Rol | null>(null)
  const [formR, setFormR] = useState<{ key: string; nombre: string; permisos: string[] }>({ key: '', nombre: '', permisos: [] })
  const [savingR, setSavingR] = useState(false)

  async function cargar() {
    setLoading(true)
    const [u, r] = await Promise.all([
      supabase.from('perfiles').select('id,nombre,username,email,rol_key,activo, roles(nombre)').order('nombre'),
      supabase.from('roles').select('*').order('nombre'),
    ])
    setUsuarios((u.data as any) ?? [])
    setRoles((r.data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  // ---------- USUARIOS ----------
  function nuevoUsuario() {
    setEditU(null)
    setFormU({ nombre: '', usuario: '', password: '', rol_key: roles[0]?.key ?? '', activo: true })
    setOpenU(true)
  }
  function editarUsuario(u: UsuarioRow) {
    setEditU(u)
    setFormU({ nombre: u.nombre ?? '', usuario: u.username ?? '', password: '', rol_key: u.rol_key ?? '', activo: u.activo })
    setOpenU(true)
  }

  async function guardarUsuario() {
    if (!editU && (!formU.usuario || !formU.password)) return alert('Usuario y contraseña son obligatorios')
    if (!editU && formU.password.length < 6) return alert('La contraseña debe tener al menos 6 caracteres')
    setSavingU(true)
    const accion = editU ? 'actualizar' : 'crear'
    const payload: any = editU
      ? { accion, id: editU.id, nombre: formU.nombre, rol_key: formU.rol_key, activo: formU.activo }
      : { accion, username: formU.usuario, password: formU.password, nombre: formU.nombre, rol_key: formU.rol_key }
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
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
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
      ) : (
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
                    <span key={m} className="badge bg-slate-100 text-slate-600">{MODULOS.find((x) => x.key === m)?.label ?? m}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
            <label className="label">Nombre</label>
            <input className="input" value={formU.nombre} onChange={(e) => setFormU({ ...formU, nombre: e.target.value })} />
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
        </div>
      </Modal>
    </div>
  )
}
