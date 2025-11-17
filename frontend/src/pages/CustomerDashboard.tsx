import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import UserAvatar from '../components/UserAvatar'

export default function CustomerDashboard() {
  useTheme()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  useEffect(() => {
    const e = localStorage.getItem('userEmail') || ''
    setEmail(e)
  }, [])
  return (
    <div className="min-h-screen bg-background-light text-text-primary">
      <header className="p-4 border-b border-border-soft bg-background-secondary">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link to="/citas/programar" aria-label="Inicio">
              <img src="/assets/logo/praxia_logo_sin_fondo_nombre.png" alt="Logo Praxia" className="h-14 md:h-16 w-auto" />
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/citas/programar" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">calendar_month</span>
              Solicitar cita
            </Link>
            <Link to="/citas/mis-citas" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">`r`n              <span className="material-symbols-outlined text-base">assignment</span>
              Mis citas
            </Link>
            <Link to="/citas/programar" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">folder</span>
              Mis exámenes
            </Link>
            <Link to="/citas/programar" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">stethoscope</span>
              Especialistas
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/dashboard/cliente/carrito" className="h-10 w-10 rounded-full border border-border-soft bg-white/50 flex items-center justify-center hover:border-primary hover:shadow-md" aria-label="Carrito">
              <span className="material-symbols-outlined">shopping_cart</span>
            </Link>
            <div className="relative">
              <button type="button" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open} className="h-10 w-10 rounded-full border border-border-soft bg-white/50 flex items-center justify-center hover:border-primary hover:shadow-md">
                <UserAvatar size={40} />
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border-soft bg-white shadow-xl p-3 z-20">
                  <div className="text-sm text-text-secondary mb-2 truncate" title={email}>{email || 'Usuario'}</div>
                  <div className="flex flex-col gap-1">
                    <Link to="/micuenta" className="px-3 py-2 rounded-md hover:bg-background-light text-text-primary">Mi cuenta</Link>
                    <Link to="/login" className="px-3 py-2 rounded-md hover:bg-background-light text-red-600">Cerrar sesión</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-5xl mb-6">
          <h1 className="font-display text-3xl text-primary text-center">Panel del Cliente</h1>
        </div>
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/dashboard/cliente/pasajes" className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border-soft bg-white/50 p-8 text-center transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 64 }} aria-hidden>
                  confirmation_number
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">Mis Pasajes</h2>
                <p className="text-text-secondary text-sm">Visualiza y gestiona tus viajes comprados.</p>
              </div>
            </Link>

            <Link to="/dashboard/cliente/comprar" className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border-soft bg-white/50 p-8 text-center transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 64 }} aria-hidden>
                  directions_bus
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">Catálogo</h2>
                <p className="text-text-secondary text-sm">Explora rutas y elige tus destinos.</p>
              </div>
            </Link>

            <Link to="/dashboard/cliente/movimientos" className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border-soft bg-white/50 p-8 text-center transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 64 }} aria-hidden>
                  receipt_long
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">Mis Movimientos</h2>
                <p className="text-text-secondary text-sm">Revisa tu historial de compras y transacciones.</p>
              </div>
            </Link>

            <Link to="/dashboard/cliente/tarjetas" className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border-soft bg-white/50 p-8 text-center transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 64 }} aria-hidden>
                  credit_card
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">Mis Tarjetas</h2>
                <p className="text-text-secondary text-sm">Administra tus métodos de pago guardados.</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

