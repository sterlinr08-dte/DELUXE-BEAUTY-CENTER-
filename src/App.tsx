import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Citas from './pages/Citas'
import Clientes from './pages/Clientes'
import Servicios from './pages/Servicios'
import Empleados from './pages/Empleados'

export default function App() {
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
          </Routes>
        </div>
      </main>
    </div>
  )
}
