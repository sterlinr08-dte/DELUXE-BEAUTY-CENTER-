import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { supabase } from './supabase'
import { NEGOCIO, PREFIJOS_DEFAULT } from './constants'

export interface Negocio {
  nombre: string
  direccion: string
  referencia: string
  telefono: string
  whatsapp: string
  instagram: string
  rnc: string
  logo: string
  // Prefijos configurables de las secuencias
  prefijo_caja: string
  prefijo_gasto: string
  prefijo_pago: string
  prefijo_cita: string
  prefijo_compra: string
  prefijo_cliente: string
  prefijo_proveedor: string
  prefijo_articulo: string
}

const DEFAULTS: Negocio = { ...NEGOCIO, ...PREFIJOS_DEFAULT }

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
        prefijo_caja: data.prefijo_caja ?? DEFAULTS.prefijo_caja,
        prefijo_gasto: data.prefijo_gasto ?? DEFAULTS.prefijo_gasto,
        prefijo_pago: data.prefijo_pago ?? DEFAULTS.prefijo_pago,
        prefijo_cita: data.prefijo_cita ?? DEFAULTS.prefijo_cita,
        prefijo_compra: data.prefijo_compra ?? DEFAULTS.prefijo_compra,
        prefijo_cliente: data.prefijo_cliente ?? DEFAULTS.prefijo_cliente,
        prefijo_proveedor: data.prefijo_proveedor ?? DEFAULTS.prefijo_proveedor,
        prefijo_articulo: data.prefijo_articulo ?? DEFAULTS.prefijo_articulo,
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
