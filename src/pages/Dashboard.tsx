import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Users, Scissors, UserCog, TrendingUp, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CitaConRelaciones } from '../types'
import { hora, money, hoyISO, fechaLarga } from '../lib/format'
import { NEGOCIO } from '../lib/constants'

interface Stats {
  clientes: number
  empleados: number
  servicios: number
  citasHoy: number
  ingresosHoy: number
}

const SELECT = `*,
  cliente:clientes(id,nombre,telefono),
  empleado:empleados(id,nombre,color),
  servicio:servicios(id,nombre,precio,duracion_min)`

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ clientes: 0, empleados: 0, servicios: 0, citasHoy: 0, ingresosHoy: 0 })
  const [agenda, setAgenda] = useState<CitaConRelaciones[]>([])
  const [loading, setLoading] = useState(true)
  const hoy = hoyISO()

  useEffect(() => {
    ;(async () => {
      const [cl, em, se, citas] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('empleados').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('servicios').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('citas').select(SELECT).eq('fecha', hoy).order('hora_inicio'),
      ])
      const lista = (citas.data as CitaConRelaciones[]) ?? []
      const ingresos = lista
        .filter((c) => c.estado === 'COMPLETADA')
        .reduce((sum, c) => sum + Number(c.precio), 0)
      setStats({
        clientes: cl.count ?? 0,
        empleados: em.count ?? 0,
        servicios: se.count ?? 0,
        citasHoy: lista.length,
        ingresosHoy: ingresos,
      })
      setAgenda(lista)
      setLoading(false)
    })()
  }, [hoy])

  const tarjetas = [
    { label: 'Citas hoy', valor: stats.citasHoy, icon: CalendarDays, to: '/citas', color: 'text-brand-600 bg-brand-50' },
    { label: 'Ingresos hoy', valor: money(stats.ingresosHoy), icon: TrendingUp, to: '/citas', color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Clientes', valor: stats.clientes, icon: Users, to: '/clientes', color: 'text-sky-600 bg-sky-50' },
    { label: 'Servicios', valor: stats.servicios, icon: Scissors, to: '/servicios', color: 'text-amber-600 bg-amber-50' },
    { label: 'Empleados', valor: stats.empleados, icon: UserCog, to: '/empleados', color: 'text-fuchsia-600 bg-fuchsia-50' },
  ]

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-800 to-brand-600 px-7 py-8 text-white shadow-lg">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-gold-400">{NEGOCIO.nombre}</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Bienvenida 💅</h1>
          <p className="mt-2 text-brand-100">{fechaLarga(hoy)}</p>
        </div>
        <div className="text-sm text-brand-100">
          <p>📍 {NEGOCIO.direccion}</p>
          <p>📱 {NEGOCIO.whatsapp}</p>
          <p>📷 {NEGOCIO.instagram}</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tarjetas.map((t) => (
          <Link key={t.label} to={t.to} className="card transition hover:shadow-md">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${t.color}`}>
              <t.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{loading ? '…' : t.valor}</p>
            <p className="text-sm text-slate-500">{t.label}</p>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-800">Agenda de hoy</h2>
          <Link to="/citas" className="text-sm font-semibold text-brand-600 hover:underline">Ver todo →</Link>
        </div>
        {loading ? (
          <p className="text-slate-500">Cargando…</p>
        ) : agenda.length === 0 ? (
          <p className="py-6 text-center text-slate-400">No hay citas agendadas para hoy.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {agenda.map((c) => (
              <li key={c.id} className="flex items-center gap-4 py-3">
                <span className="flex items-center gap-1 text-sm font-semibold text-brand-600">
                  <Clock size={14} /> {hora(c.hora_inicio)}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{c.cliente?.nombre ?? 'Cliente'}</p>
                  <p className="text-xs text-slate-400">{c.servicio?.nombre}</p>
                </div>
                <span className="text-sm font-semibold text-slate-700">{money(c.precio)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
