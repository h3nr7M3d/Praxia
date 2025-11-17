import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import UserAvatar from '../components/UserAvatar'

export default function AdminUsers() {
  useTheme()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Array<UserItem>>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<UserItem | null>(null)
  const [form, setForm] = useState<FormState>({ correo: '', contrasena: '' })
  const [saving, setSaving] = useState(false)
  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  type UserItem = { idUsuario:number; correoElectronico:string; admin:boolean; tipo?: 'admin'|'cliente'|'empresa'|'none' }
  type FormState = { correo: string; contrasena: string }

  useEffect(() => { setEmail(localStorage.getItem('userEmail') || '') }, [])

  useEffect(() => { void loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/usuarios`)
      if (!res.ok) throw new Error('No se pudo cargar usuarios')
      const data = await res.json()
      setItems(data)
    } catch (e:any) {
      setError(e.message || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  function filteredItems() {
    const qq = q.trim().toLowerCase()
    if (!qq) return items
    return items.filter(u => u.correoElectronico.toLowerCase().includes(qq))
  }

  function onNew() {
    setEditing(null)
    setForm({ correo: '', contrasena: '' })
    setShowForm(true)
  }

  function onEdit(u: UserItem) {
    setEditing(u)
    setForm({ correo: u.correoElectronico, contrasena: '' })
    setShowForm(true)
  }

  async function onDelete(u: UserItem) {
    if (!confirm(`¿Eliminar usuario ${u.correoElectronico}?`)) return
    try {
      const res = await fetch(`${API_BASE}/usuarios/${u.idUsuario}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar')
      await loadUsers()
    } catch (e:any) {
      alert(e.message || 'Error al eliminar')
    }
  }

  async function onToggleAdmin(u: UserItem) {
    try {
      const method = u.admin ? 'DELETE' : 'POST'
      const res = await fetch(`${API_BASE}/usuarios/${u.idUsuario}/admin`, { method })
      if (!res.ok) throw new Error('No se pudo actualizar rol admin')
      await loadUsers()
    } catch (e:any) {
      alert(e.message || 'Error al actualizar rol admin')
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.correo) { alert('Correo es obligatorio'); return }
    if (!editing && !form.contrasena) { alert('Contraseña es obligatoria'); return }
    setSaving(true)
    try {
      if (editing) {
        const body: any = { correoElectronico: form.correo }
        if (form.contrasena) body.contrasena = form.contrasena
        const res = await fetch(`${API_BASE}/usuarios/${editing.idUsuario}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (!res.ok) throw new Error('No se pudo actualizar usuario')
      } else {
        const body = { correoElectronico: form.correo, contrasena: form.contrasena }
        const res = await fetch(`${API_BASE}/usuarios`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (!res.ok) throw new Error('No se pudo crear usuario')
      }
      setShowForm(false)
      await loadUsers()
    } catch (e:any) {
      alert(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary">
      <header className="p-4 border-b border-border-soft bg-background-secondary">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/admin" aria-label="Inicio">
              <img src="/assets/logo/praxia_logo_sin_fondo_nombre.png" alt="Praxia" className="h-14 md:h-16 w-auto" />
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/dashboard/admin/usuarios" className="text-text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">group</span>
              Usuarios
            </Link>
            <Link to="/dashboard/admin/empleados" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">badge</span>
              Empleados
            </Link>
            <Link to="/dashboard/admin/sucursales" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">apartment</span>
              Sucursales
            </Link>
            <Link to="/dashboard/admin/estadisticas" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">monitoring</span>
              Estadísticas
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button type="button" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open} className="h-10 w-10 rounded-full border border-border-soft bg-white/50 flex items-center justify-center hover:border-primary hover:shadow-md">
                <UserAvatar size={40} />
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border-soft bg-white shadow-xl p-3 z-20">
                  <div className="text-sm text-text-secondary mb-2 truncate" title={email}>{email || 'Administrador'}</div>
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
        <div className="w-full max-w-5xl mb-6 flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl text-primary">Usuarios</h1>
          <button onClick={onNew} className="px-4 py-2 rounded-lg bg-primary text-background-light font-bold hover:bg-accent">Añadir usuario</button>
        </div>
        <div className="w-full max-w-5xl mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por correo" className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary" />
          <button onClick={loadUsers} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Refrescar</button>
        </div>

        {error && <div className="w-full max-w-5xl text-sm text-red-700 mb-3">{error}</div>}
        {loading ? (
          <div className="w-full max-w-5xl text-text-secondary">Cargando...</div>
        ) : (
          <div className="w-full max-w-5xl overflow-x-auto rounded-xl border border-border-soft bg-white/50">
            <table className="min-w-full text-sm">
              <thead className="bg-background-secondary/60">
                <tr>
                  <th className="text-left p-3">Correo</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Admin</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems().map(u => (
                  <tr key={u.idUsuario} className="border-top border-border-soft">
                    <td className="p-3">{u.correoElectronico}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${u.tipo === 'admin' ? 'bg-purple-100 text-purple-700' : u.tipo === 'cliente' ? 'bg-blue-100 text-blue-700' : u.tipo === 'empresa' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                        <span className="material-symbols-outlined text-base">
                          {u.tipo === 'admin' ? 'shield_person' : u.tipo === 'cliente' ? 'person' : u.tipo === 'empresa' ? 'business' : 'help'}
                        </span>
                        {u.tipo === 'admin' ? 'Administrador' : u.tipo === 'cliente' ? 'Cliente' : u.tipo === 'empresa' ? 'Empresa' : 'Sin rol'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${u.admin ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        <span className="material-symbols-outlined text-base">{u.admin ? 'verified' : 'close'}</span>
                        {u.admin ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2 flex-wrap">
                      <button onClick={()=>onToggleAdmin(u)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary text-xs inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">{u.admin ? 'toggle_off' : 'toggle_on'}</span>
                        {u.admin ? 'Quitar admin' : 'Hacer admin'}
                      </button>
                      <button onClick={()=>onEdit(u)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary text-xs inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">edit</span>
                        Editar
                      </button>
                      <button onClick={()=>onDelete(u)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary text-xs inline-flex items-center gap-1 text-red-600">
                        <span className="material-symbols-outlined text-base">delete</span>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredItems().length === 0 && (
                  <tr>
                    <td className="p-4 text-text-secondary" colSpan={3}>No hay usuarios para mostrar</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="w-full max-w-md rounded-xl border border-border-soft bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl">{editing ? 'Editar usuario' : 'Nuevo usuario'}</h2>
                <button onClick={()=>setShowForm(false)} className="text-text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={onSubmit} className="grid gap-4">
                <div>
                  <label className="text-sm text-text-secondary">Correo</label>
                  <input type="email" value={form.correo} onChange={e=>setForm(f=>({...f, correo: e.target.value}))} placeholder="usuario@dominio.com" className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Contraseña {editing ? '(dejar en blanco para no cambiar)' : ''}</label>
                  <input type="password" value={form.contrasena} onChange={e=>setForm(f=>({...f, contrasena: e.target.value}))} placeholder={editing ? '••••••' : 'Mínimo 6 caracteres'} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div className="flex items-center justify-end gap-2 mt-2">
                  <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cancelar</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-background-light font-bold hover:bg-accent disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
