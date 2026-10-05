import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import './Modal.css'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export default function Modal({ open, title, onClose, children, footer }: ModalProps) {
  // Esc cierra la ventana (respeta a quien ya haya manejado la tecla, p. ej. un
  // buscador o un menú abierto que hace preventDefault).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Hundido en pointer-down (iOS :active no basta) y cancelar si se arrastra fuera.
  function onPressStart(e: React.PointerEvent<HTMLButtonElement>) {
    const el = e.currentTarget
    el.classList.add('is-pressing')
    const clear = () => el.classList.remove('is-pressing')
    el.addEventListener('pointerup', clear, { once: true })
    el.addEventListener('pointerleave', clear, { once: true })
    el.addEventListener('pointercancel', clear, { once: true })
  }

  if (!open) return null
  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-panel w-full max-w-lg rounded-2xl bg-gradient-to-b from-white to-pink-50/40 ring-1 ring-pink-100/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_30px_60px_-15px_rgba(236,72,153,0.45)]"
      >
        <div className="flex items-center gap-2 border-b border-pink-100/70 px-5 py-4">
          {/* Espaciador del tamaño del botón para que el título quede centrado */}
          <span aria-hidden="true" className="w-11 shrink-0 sm:w-9" />
          <h2 className="min-w-0 flex-1 truncate text-center font-display text-lg font-bold uppercase text-slate-800">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            onPointerDown={onPressStart}
            aria-label="Cerrar"
            title="Cerrar (Esc)"
            className="modal-x"
          >
            <span className="modal-x-ico">
              <X size={20} />
            </span>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}
