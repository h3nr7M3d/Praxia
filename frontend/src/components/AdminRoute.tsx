import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

export default function AdminRoute() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking')
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

  useEffect(() => {
    if (!userId) {
      setStatus('denied')
      return
    }

    const localRole = (localStorage.getItem('role') || '').toLowerCase()
    if (localRole === 'admin') {
      setStatus('allowed')
      return
    }

    const controller = new AbortController()
    fetch(`${API_BASE}/auth/check-admin?userId=${userId}`, { signal: controller.signal })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => {
        setStatus(data?.admin ? 'allowed' : 'denied')
      })
      .catch(() => setStatus('denied'))

    return () => controller.abort()
  }, [API_BASE, userId])

  if (status === 'checking') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-secondary">
        Verificando permisos de administrador...
      </div>
    )
  }

  return status === 'allowed' ? <Outlet /> : <Navigate to="/home" replace />
}
