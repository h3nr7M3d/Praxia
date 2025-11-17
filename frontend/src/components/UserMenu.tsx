import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserAvatar from './UserAvatar'

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  const userNameStored = (localStorage.getItem('userName') || '').trim()
  const userEmailStored = (localStorage.getItem('userEmail') || '').trim()
  const displayName = userNameStored || userEmailStored || 'Usuario'
  const initials = (() => {
    const name = userNameStored.trim()
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean)
      const first = parts[0]?.[0] || ''
      const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
      const res = (first + last).toUpperCase()
      return res || (name[0] || 'U').toUpperCase()
    }
    const email = userEmailStored.trim()
    if (email) {
      const user = email.split('@')[0] || ''
      const a = user[0] || 'U'
      const b = user[1] || ''
      return (a + b).toUpperCase()
    }
    return 'US'
  })()

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!(e.target instanceof Node)) return
      if (!menuRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    localStorage.removeItem('userId')
    window.location.replace('/login')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-2 rounded-full border border-border-soft bg-white px-2 py-1 shadow hover:shadow-md transition"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserAvatar size={32} />
        <span className="hidden md:inline-block text-sm font-medium text-gray-700" aria-label="Iniciales del usuario">{initials}</span>
        <span className="material-symbols-outlined text-base text-gray-600" aria-hidden>
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border bg-white py-1 shadow-lg">
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-700"
            onClick={() => { setOpen(false); navigate('/micuenta') }}
          >
            Mi cuenta
          </button>
          <div className="my-1 h-px bg-gray-100" />
          <button
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
