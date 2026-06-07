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
  Settings,
  Package,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/auth'

type Link = { to: string; label: string; icon: typeof Users; modulo: string; end?: boolean }

const grupos: { titulo: string; links: Link[] }[] = [
  {
    titulo: 'Facturación y contabilidad',
    links: [
      { to: '/facturacion', label: 'Facturación', icon: Receipt, modulo: 'facturacion' },
      { to: '/compras', label: 'Compras', icon: ShoppingCart, modulo: 'compras' },
      { to: '/gastos', label: 'Gastos', icon: Wallet, modulo: 'gastos' },
      { to: '/nomina', label: 'Pagos a empleados', icon: Users, modulo: 'nomina' },
      { to: '/contabilidad', label: 'Contabilidad', icon: Calculator, modulo: 'contabilidad' },
    ],
  },
  {
    titulo: 'Operación',
    links: [
      { to: '/', label: 'Panel', icon: LayoutDashboard, modulo: 'panel', end: true },
      { to: '/citas', label: 'Citas / Agenda', icon: CalendarDays, modulo: 'citas' },
      { to: '/clientes', label: 'Clientes', icon: Users, modulo: 'clientes' },
      { to: '/servicios', label: 'Servicios y precios', icon: Scissors, modulo: 'servicios' },
      { to: '/articulos', label: 'Artículos / Productos', icon: Package, modulo: 'articulos' },
      { to: '/empleados', label: 'Empleados', icon: UserCog, modulo: 'empleados' },
    ],
  },
  {
    titulo: 'Sistema',
    links: [{ to: '/configuracion', label: 'Configuración', icon: Settings, modulo: 'configuracion' }],
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { perfil, signOut, puede } = useAuth()
  const visibles = grupos
    .map((g) => ({ ...g, links: g.links.filter((l) => puede(l.modulo)) }))
    .filter((g) => g.links.length > 0)

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-gradient-to-b from-[#0b0710] via-[#160a15] to-[#0b0710] text-brand-100 shadow-[8px_0_30px_-12px_rgba(236,72,153,0.35)] ring-1 ring-pink-500/10 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400/30 to-gold-600/10 ring-1 ring-gold-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_18px_-6px_rgba(212,175,55,0.5)]">
              <Sparkles className="text-gold-400" size={22} />
            </div>
            <div>
              <p className="font-display text-base font-bold leading-tight text-white">DELUXE</p>
              <p className="text-xs tracking-[0.2em] text-gold-400">BEAUTY CENTER</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-brand-200 hover:bg-white/10 lg:hidden">
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
          {visibles.map((g) => (
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
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white ring-1 ring-pink-300/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_18px_-6px_rgba(236,72,153,0.65)]'
                          : 'text-brand-200 hover:bg-white/5 hover:text-white hover:translate-x-0.5'
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

        <div className="space-y-2 border-t border-white/10 px-3 py-4">
          {perfil?.rol_nombre && (
            <p className="px-3 text-xs font-semibold text-gold-400">{perfil.rol_nombre}</p>
          )}
          {(perfil?.username || perfil?.nombre) && (
            <p className="truncate px-3 text-xs text-brand-300">{perfil?.nombre || perfil?.username}{perfil?.username ? ` · ${perfil.username}` : ''}</p>
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
