import { useState, useEffect, lazy, Suspense, ReactElement } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Cargando from './components/Cargando'
import { useAuth } from './lib/auth'
import { MODULOS } from './lib/permisos'

// División del bundle por módulo (30-ago-2026): cada página se descarga solo cuando
// se visita, en vez de ir todas juntas en un único JS de ~710KB. Login se queda con
// import normal (arriba) porque es la primera pantalla que ve cualquiera sin sesión —
// no debe depender de un Suspense/spinner extra antes de poder entrar.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Citas = lazy(() => import('./pages/Citas'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Servicios = lazy(() => import('./pages/Servicios'))
const Articulos = lazy(() => import('./pages/Articulos'))
const Mobiliario = lazy(() => import('./pages/Mobiliario'))
const Empleados = lazy(() => import('./pages/Empleados'))
const Facturacion = lazy(() => import('./pages/Facturacion'))
const Caja = lazy(() => import('./pages/Caja'))
const CuentasPorCobrar = lazy(() => import('./pages/CuentasPorCobrar'))
const Compras = lazy(() => import('./pages/Compras'))
const CuentasPorPagar = lazy(() => import('./pages/CuentasPorPagar'))
const Gastos = lazy(() => import('./pages/Gastos'))
const Nomina = lazy(() => import('./pages/Nomina'))
const Contabilidad = lazy(() => import('./pages/Contabilidad'))
const Reportes = lazy(() => import('./pages/Reportes'))
const Configuracion = lazy(() => import('./pages/Configuracion'))

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
    return <div className="flex h-full items-center justify-center"><Cargando texto="Cargando…" /></div>
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
            <Suspense fallback={<Cargando texto="Cargando…" />}>
              <Routes>
                <Route path="/" element={<Protegido modulo="panel"><Dashboard /></Protegido>} />
                <Route path="/citas" element={<Protegido modulo="citas"><Citas /></Protegido>} />
                <Route path="/clientes" element={<Protegido modulo="clientes"><Clientes /></Protegido>} />
                <Route path="/servicios" element={<Protegido modulo="servicios"><Servicios /></Protegido>} />
                <Route path="/articulos" element={<Protegido modulo="articulos"><Articulos /></Protegido>} />
                <Route path="/mobiliario" element={<Protegido modulo="mobiliario"><Mobiliario /></Protegido>} />
                <Route path="/empleados" element={<Protegido modulo="empleados"><Empleados /></Protegido>} />
                <Route path="/facturacion" element={<Protegido modulo="facturacion"><Facturacion /></Protegido>} />
                <Route path="/caja" element={<Protegido modulo="caja"><Caja /></Protegido>} />
                <Route path="/cuentas" element={<Protegido modulo="cuentas"><CuentasPorCobrar /></Protegido>} />
                <Route path="/compras" element={<Protegido modulo="compras"><Compras /></Protegido>} />
                <Route path="/por-pagar" element={<Protegido modulo="cuentas_pagar"><CuentasPorPagar /></Protegido>} />
                <Route path="/gastos" element={<Protegido modulo="gastos"><Gastos /></Protegido>} />
                <Route path="/nomina" element={<Protegido modulo="nomina"><Nomina /></Protegido>} />
                <Route path="/contabilidad" element={<Protegido modulo="contabilidad"><Contabilidad /></Protegido>} />
                <Route path="/reportes" element={<Protegido modulo="reportes"><Reportes /></Protegido>} />
                <Route path="/configuracion" element={<Protegido modulo="configuracion"><Configuracion /></Protegido>} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
