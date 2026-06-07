import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Menu, Sparkles } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Citas from './pages/Citas'
import Clientes from './pages/Clientes'
import Servicios from './pages/Servicios'
import Empleados from './pages/Empleados'
import Facturacion from './pages/Facturacion'
import Compras from './pages/Compras'
import Gastos from './pages/Gastos'
import Nomina from './pages/Nomina'
import Contabilidad from './pages/Contabilidad'
import Login from './pages/Login'
import { useAuth } from './lib/auth'

export default function App() {
  const { session, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-400">Cargando…</div>
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="flex h-full">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (solo móvil/tablet) */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="text-brand-600" size={18} />
            <span className="font-display font-bold text-brand-800">DeluXe Beauty Center</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/citas" element={<Citas />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/servicios" element={<Servicios />} />
              <Route path="/empleados" element={<Empleados />} />
              <Route path="/facturacion" element={<Facturacion />} />
              <Route path="/compras" element={<Compras />} />
              <Route path="/gastos" element={<Gastos />} />
              <Route path="/nomina" element={<Nomina />} />
              <Route path="/contabilidad" element={<Contabilidad />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}
