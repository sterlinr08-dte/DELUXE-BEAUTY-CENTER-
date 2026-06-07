import { Routes, Route } from 'react-router-dom'
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">Cargando…</div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
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
  )
}
