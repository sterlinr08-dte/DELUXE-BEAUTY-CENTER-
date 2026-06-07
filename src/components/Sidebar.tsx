import { NavLink } from 'react-router-dom'
import { CalendarDays, Users, Scissors, UserCog, LayoutDashboard, Sparkles, LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'

const links = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/citas', label: 'Citas / Agenda', icon: CalendarDays },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/servicios', label: 'Servicios y precios', icon: Scissors },
  { to: '/empleados', label: 'Empleados', icon: UserCog },
]

export default function Sidebar() {
  const { session, signOut } = useAuth()
  return (
    <aside className="flex w-64 flex-col bg-gradient-to-b from-brand-900 to-brand-800 text-brand-100">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500/20 ring-1 ring-gold-400/40">
          <Sparkles className="text-gold-400" size={22} />
        </div>
        <div>
          <p className="font-display text-base font-bold leading-tight text-white">DELUXE</p>
          <p className="text-xs tracking-[0.2em] text-gold-400">BEAUTY CENTER</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-white/10 text-white ring-1 ring-white/10'
                  : 'text-brand-200 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 px-3 py-5">
        {session?.user?.email && (
          <p className="truncate px-3 text-xs text-brand-300">{session.user.email}</p>
        )}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-200 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
        <p className="px-3 text-xs text-brand-400/70">© {new Date().getFullYear()} Deluxe Beauty Center</p>
      </div>
    </aside>
  )
}
