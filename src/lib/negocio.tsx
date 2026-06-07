import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { supabase } from './supabase'
import { NEGOCIO } from './constants'

export interface Negocio {
  nombre: string
  direccion: string
  referencia: string
  telefono: string
  whatsapp: string
  instagram: string
  rnc: string
  logo: string
}

const DEFAULTS: Negocio = { ...NEGOCIO }

interface NegocioContextValue {
  negocio: Negocio
  recargarNegocio: () => Promise<void>
}

const NegocioContext = createContext<NegocioContextValue>({
  negocio: DEFAULTS,
  recargarNegocio: async () => {},
})

export function NegocioProvider({ children }: { children: ReactNode }) {
  const [negocio, setNegocio] = useState<Negocio>(DEFAULTS)

  const recargarNegocio = useCallback(async () => {
    const { data } = await supabase.from('ajustes_negocio').select('*').maybeSingle()
    if (data) {
      setNegocio({
        nombre: data.nombre || DEFAULTS.nombre,
        direccion: data.direccion ?? '',
        referencia: data.referencia ?? '',
        telefono: data.telefono ?? '',
        whatsapp: data.whatsapp ?? '',
        instagram: data.instagram ?? '',
        rnc: data.rnc ?? '',
        logo: DEFAULTS.logo,
      })
    }
  }, [])

  useEffect(() => {
    recargarNegocio()
  }, [recargarNegocio])

  return <NegocioContext.Provider value={{ negocio, recargarNegocio }}>{children}</NegocioContext.Provider>
}

export function useNegocio() {
  return useContext(NegocioContext)
}
