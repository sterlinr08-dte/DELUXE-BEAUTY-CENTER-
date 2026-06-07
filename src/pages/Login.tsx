import { FormEvent, useState } from 'react'
import { LogIn, MapPin, Phone, Instagram } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { usuarioAEmail } from '../lib/constants'
import { useNegocio } from '../lib/negocio'

export default function Login() {
  const { signIn } = useAuth()
  const { negocio } = useNegocio()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(usuarioAEmail(usuario), password)
    setLoading(false)
    if (error) setError('Usuario o contraseña incorrectos. Verifica e intenta de nuevo.')
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={`${import.meta.env.BASE_URL}${negocio.logo}`}
            alt={negocio.nombre}
            className="mb-3 w-60 max-w-full rounded-2xl bg-black object-contain shadow-md"
          />
          <p className="mt-1 text-sm text-slate-500">Inicia sesión para administrar el salón</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Usuario</label>
            <input
              type="text"
              className="input lowercase"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="usuario"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            <LogIn size={16} />
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 space-y-1 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
          <p className="flex items-center justify-center gap-1"><MapPin size={12} /> {negocio.direccion} · {negocio.referencia}</p>
          <p className="flex items-center justify-center gap-1"><Phone size={12} /> {negocio.whatsapp}</p>
          <p className="flex items-center justify-center gap-1"><Instagram size={12} /> {negocio.instagram}</p>
        </div>
      </div>
    </div>
  )
}
