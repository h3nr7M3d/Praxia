import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import UserDropdown from './UserDropdown'
import UserMenu from './UserMenu'

export default function CompanyHeader() {
  const [userEmail, setUserEmail] = useState<string>('')
  const [userName, setUserName] = useState<string>('Empresa')
  
  const handleLogout = () => {
    // Limpiar el almacenamiento local
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    localStorage.removeItem('userId')
    
    // Forzar recarga completa y redirigir a la página de login
    window.location.replace('/login')
    
    // Forzar un recargue completo para limpiar el estado de la aplicación
    window.location.reload()
    
    return false
  }
  
  useEffect(() => {
    const email = localStorage.getItem('userEmail') || ''
    const name = localStorage.getItem('userName') || 'Empresa'
    setUserEmail(email)
    setUserName(name)
  }, [])
  return (
    <header className="p-4 border-b border-border-soft bg-background-secondary">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Link to="/home" aria-label="Inicio">
            <img src="/assets/logo/praxia_logo_sin_fondo_nombre.png" alt="Logo Praxia" className="h-14 md:h-16 w-auto" />
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
        <div className="flex items-center gap-4">
          {/* Botón de notificaciones con menú desplegable */}
          <UserDropdown 
            userName={userName}
            userEmail={userEmail}
            onLogout={handleLogout}
            trigger={
              <button 
                className="relative rounded-full p-2 bg-white shadow hover:shadow-md transition" 
                aria-label="Notificaciones"
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">notifications</span>
                <span 
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" 
                  style={{ backgroundColor: 'rgb(245, 158, 11)' }}
                ></span>
              </button>
            }
          />
          
          {/* Menú del usuario (avatar + opciones) */}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
