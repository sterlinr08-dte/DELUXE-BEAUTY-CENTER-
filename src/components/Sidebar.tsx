import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  Users,
  Scissors,
  UserCog,
  LayoutDashboard,
  Sparkles,
  LogOut,
  Receipt,
  ShoppingCart,
  Wallet,
  Calculator,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/auth'

const grupos: { titulo: string; links: { to: string; label: string; icon: typeof Users; end?: boolean }[] }[] = [
  {
    titulo: 'Facturación y contabilidad',
    links: [
      { to: '/facturacion', label: 'Facturación', icon: Receipt },
      { to: '/compras', label: 'Compras', icon: ShoppingCart },
      { to: '/gastos', label: 'Gastos', icon: Wallet },
      { to: '/nomina', label: 'Pagos a empleados', icon: Users },
      { to: '/contabilidad', label: 'Contabilidad', icon: Calculator },
    ],
  },
  {
    titulo: 'Operación',
    links: [
      { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
      { to: '/citas', label: 'Citas / Agenda', icon: CalendarDays },
      { to: '/clientes', label: 'Clientes', icon: Users },
      { to: '/servicios', label: 'Servicios y precios', icon: Scissors },
      { to: '/empleados', label: 'Empleados', icon: UserCog },
    ],
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { session, signOut } = useAuth()

  return (
    <>
      {/* Fondo oscuro al abrir el menú en móvil */}
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-gradient-to-b from-brand-900 to-brand-800 text-brand-100 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500/20 ring-1 ring-gold-400/40">
              <Sparkles className="text-gold-400" size={22} />
            </div>
            <div>
              <p className="font-display text-base font-bold leading-tight text-white">DELUXE</p>
              <p className="text-xs tracking-[0.2em] text-gold-400">BEAUTY CENTER</p>
            </div>
          </div>
          {/* Botón cerrar (solo móvil) */}
          <button onClick={onClose} className="rounded-lg p-1 text-brand-200 hover:bg-white/10 lg:hidden">
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
          {grupos.map((g) => (
            <div key={g.titulo}>
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-400">{g.titulo}</p>
              <div className="space-y-1">
                {g.links.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
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
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/10 px-3 py-4">
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
        </div>
      </aside>
    </>
  )
}
