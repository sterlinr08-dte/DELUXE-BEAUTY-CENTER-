import { useState, useEffect, ReactElement } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Citas from './pages/Citas'
import Clientes from './pages/Clientes'
import Servicios from './pages/Servicios'
import Articulos from './pages/Articulos'
import Empleados from './pages/Empleados'
import Facturacion from './pages/Facturacion'
import Caja from './pages/Caja'
import Compras from './pages/Compras'
import Gastos from './pages/Gastos'
import Nomina from './pages/Nomina'
import Contabilidad from './pages/Contabilidad'
import Configuracion from './pages/Configuracion'
import Login from './pages/Login'
import { useAuth } from './lib/auth'
import { MODULOS } from './lib/permisos'

function Protegido({ modulo, children }: { modulo: string; children: ReactElement }) {
  const { puede, permisos } = useAuth()
  if (puede(modulo)) return children
  const primero = MODULOS.find((m) => permisos.includes(m.key))
  if (primero && primero.key !== modulo) return <Navigate to={primero.path} replace />
  return (
    <div className="card text-center text-slate-500">
      No tienes acceso a este módulo. Contacta al administrador.
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // Al enfocar un campo numérico, seleccionar su contenido para que el "0"
  // se reemplace al escribir (evita tener que borrarlo manualmente).
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLInputElement
      if (t instanceof HTMLInputElement && t.type === 'number') {
        requestAnimationFrame(() => t.select())
      }
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [])

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
        <header className="flex items-center gap-3 border-b border-pink-100 bg-gradient-to-r from-[#0b0710] to-[#160a15] px-4 py-2.5 lg:hidden">
          <button onClick={() => setMenuOpen(true)} className="rounded-lg p-1.5 text-pink-200 hover:bg-white/10" aria-label="Abrir menú">
            <Menu size={24} />
          </button>
          <img
            src={`${import.meta.env.BASE_URL}deluxe-logo.png`}
            alt="DeluXe Beauty Center"
            className="h-10 rounded-lg ring-1 ring-pink-500/20"
          />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <Routes>
              <Route path="/" element={<Protegido modulo="panel"><Dashboard /></Protegido>} />
              <Route path="/citas" element={<Protegido modulo="citas"><Citas /></Protegido>} />
              <Route path="/clientes" element={<Protegido modulo="clientes"><Clientes /></Protegido>} />
              <Route path="/servicios" element={<Protegido modulo="servicios"><Servicios /></Protegido>} />
              <Route path="/articulos" element={<Protegido modulo="articulos"><Articulos /></Protegido>} />
              <Route path="/empleados" element={<Protegido modulo="empleados"><Empleados /></Protegido>} />
              <Route path="/facturacion" element={<Protegido modulo="facturacion"><Facturacion /></Protegido>} />
              <Route path="/caja" element={<Protegido modulo="caja"><Caja /></Protegido>} />
              <Route path="/compras" element={<Protegido modulo="compras"><Compras /></Protegido>} />
              <Route path="/gastos" element={<Protegido modulo="gastos"><Gastos /></Protegido>} />
              <Route path="/nomina" element={<Protegido modulo="nomina"><Nomina /></Protegido>} />
              <Route path="/contabilidad" element={<Protegido modulo="contabilidad"><Contabilidad /></Protegido>} />
              <Route path="/configuracion" element={<Protegido modulo="configuracion"><Configuracion /></Protegido>} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}
