import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { useTheme } from '../hooks/useTheme'
import UserAvatar from '../components/UserAvatar'

export default function CompanyDashboard() {
  useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const e = localStorage.getItem('userEmail') || ''
    setEmail(e)
    
    // Cerrar el menú al hacer clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  return (
    <div className="min-h-screen bg-background-light text-text-primary">
      <header className="p-4 border-b border-border-soft bg-background-secondary">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/empresa" aria-label="Inicio">
              <img src="/assets/logo/praxia_logo_sin_fondo_nombre.png" alt="Praxia" className="h-14 md:h-16 w-auto" />
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/dashboard/empresa/buses" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">directions_bus</span>
              Buses
            </Link>
            <Link to="/dashboard/empresa/viajes" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">route</span>
              Viajes
            </Link>
            <Link to="/dashboard/empresa/rutas" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">signpost</span>
              Rutas
            </Link>
            <Link to="/dashboard/empresa/ventas" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">point_of_sale</span>
              Ventas
            </Link>
            <Link to="/dashboard/empresa/estadisticas" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">monitoring</span>
              Estadísticas
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button 
                type="button" 
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(v => !v);
                }} 
                aria-haspopup="menu" 
                aria-expanded={open} 
                className="flex items-center gap-2 rounded-full hover:bg-gray-100 p-1 transition-colors"
              >
                <UserAvatar size={40} />
                <span className="hidden md:inline text-sm font-medium text-gray-700">
                  {email?.split('@')[0] || 'Usuario'}
                </span>
              </button>
              
              {open && (
                <div 
                  className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-gray-100">
                    <div className="text-sm font-medium text-gray-900 truncate">{email || 'usuario@ejemplo.com'}</div>
                    <div className="text-xs text-gray-500">Empresa</div>
                  </div>
                  <div className="py-1">
                    <Link 
                      to="/micuenta" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setOpen(false)}
                    >
                      Mi perfil
                    </Link>
                    <Link 
                      to="/configuracion" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setOpen(false)}
                    >
                      Configuración
                    </Link>
                  </div>
                  <div className="border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        // Limpiar el almacenamiento local
                        localStorage.removeItem('token');
                        localStorage.removeItem('userEmail');
                        localStorage.removeItem('userName');
                        localStorage.removeItem('userId');
                        // Forzar recarga completa para limpiar el estado
                        window.location.href = '/login';
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-5xl mb-6">
          <h1 className="font-display text-3xl text-primary text-center">Panel de Empresa</h1>
        </div>
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <Link to="/dashboard/empresa/buses" className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border-soft bg-white/50 p-8 text-center transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 64 }} aria-hidden>
                  directions_bus
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">Buses</h2>
                <p className="text-text-secondary text-sm">Administra tu flota y unidades.</p>
              </div>
            </Link>

            <Link to="/dashboard/empresa/viajes" className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border-soft bg-white/50 p-8 text-center transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 64 }} aria-hidden>
                  route
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">Viajes</h2>
                <p className="text-text-secondary text-sm">Crea y gestiona rutas y horarios.</p>
              </div>
            </Link>

            <Link to="/dashboard/empresa/rutas" className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border-soft bg-white/50 p-8 text-center transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 64 }} aria-hidden>
                  signpost
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">Rutas</h2>
                <p className="text-text-secondary text-sm">Gestiona rutas (origen/destino, precios).</p>
              </div>
            </Link>

            <Link to="/dashboard/empresa/ventas" className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border-soft bg-white/50 p-8 text-center transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 64 }} aria-hidden>
                  point_of_sale
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">Ventas</h2>
                <p className="text-text-secondary text-sm">Consulta ventas y reportes.</p>
              </div>
            </Link>

            <Link to="/dashboard/empresa/estadisticas" className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border-soft bg-white/50 p-8 text-center transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 64 }} aria-hidden>
                  monitoring
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">Estadísticas</h2>
                <p className="text-text-secondary text-sm">Analiza ventas y ocupación.</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
