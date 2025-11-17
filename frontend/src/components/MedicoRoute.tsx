import { Navigate, Outlet } from 'react-router-dom'

export default function MedicoRoute() {
  const authed = !!(localStorage.getItem('token') || localStorage.getItem('userId'))
  const role = (localStorage.getItem('role') || '').toLowerCase()
  if (!authed) return <Navigate to="/login" replace />
  if (role !== 'medico') return <Navigate to="/home" replace />
  return <Outlet />
}

