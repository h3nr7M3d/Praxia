import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import UserAvatar from '../components/UserAvatar'

export default function AdminBranches() {
  useTheme()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Array<Sucursal>>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Sucursal | null>(null)
  const [form, setForm] = useState<FormState>({ nombre: '', departamento: '', provincia: '', direccion: '' })
  const [saving, setSaving] = useState(false)
  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  type Sucursal = { idSucursal:number; nombre:string; departamento:string; provincia:string; direccion:string }
  type FormState = { nombre: string; departamento: string; provincia: string; direccion: string }

  useEffect(() => { setEmail(localStorage.getItem('userEmail') || '') }, [])
  useEffect(() => { void loadSucursales() }, [])

  async function loadSucursales() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/sucursales`)
      if (!res.ok) throw new Error('No se pudo cargar sucursales')
      setItems(await res.json())
    } catch (e:any) {
      setError(e.message || 'Error al cargar sucursales')
    } finally {
      setLoading(false)
    }
  }

  function filteredItems() {
    const qq = q.trim().toLowerCase()
    if (!qq) return items
    return items.filter(s =>
      s.nombre.toLowerCase().includes(qq) ||
      s.departamento.toLowerCase().includes(qq) ||
      s.provincia.toLowerCase().includes(qq)
    )
  }

  function onNew() {
    setEditing(null)
    setForm({ nombre: '', departamento: '', provincia: '', direccion: '' })
    setShowForm(true)
  }

  function onEdit(s: Sucursal) {
    setEditing(s)
    setForm({ nombre: s.nombre, departamento: s.departamento, provincia: s.provincia, direccion: s.direccion })
    setShowForm(true)
  }

  async function onDelete(s: Sucursal) {
    if (!confirm(`¿Eliminar la sucursal "${s.nombre}"?`)) return
    try {
      const res = await fetch(`${API_BASE}/sucursales/${s.idSucursal}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar')
      await loadSucursales()
    } catch (e:any) {
      alert(e.message || 'Error al eliminar')
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.departamento || !form.provincia || !form.direccion) { alert('Completa todos los campos'); return }
    setSaving(true)
    try {
      const body = { nombre: form.nombre, departamento: form.departamento, provincia: form.provincia, direccion: form.direccion }
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `${API_BASE}/sucursales/${editing.idSucursal}` : `${API_BASE}/sucursales`
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('No se pudo guardar')
      setShowForm(false)
      await loadSucursales()
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
            <Link to="/dashboard/admin/usuarios" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">group</span>
              Usuarios
            </Link>
            <Link to="/dashboard/admin/empleados" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">badge</span>
              Empleados
            </Link>
            <Link to="/dashboard/admin/sucursales" className="text-text-primary inline-flex items-center gap-1">
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
          <h1 className="font-display text-3xl text-primary">Sucursales</h1>
          <button onClick={onNew} className="px-4 py-2 rounded-lg bg-primary text-background-light font-bold hover:bg-accent">Añadir sucursal</button>
        </div>
        <div className="w-full max-w-5xl mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre, departamento o provincia" className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary" />
          <button onClick={loadSucursales} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Refrescar</button>
        </div>

        {error && <div className="w-full max-w-5xl text-sm text-red-700 mb-3">{error}</div>}
        {loading ? (
          <div className="w-full max-w-5xl text-text-secondary">Cargando...</div>
        ) : (
          <div className="w-full max-w-5xl overflow-x-auto rounded-xl border border-border-soft bg-white/50">
            <table className="min-w-full text-sm">
              <thead className="bg-background-secondary/60">
                <tr>
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-left p-3">Departamento</th>
                  <th className="text-left p-3">Provincia</th>
                  <th className="text-left p-3">Dirección</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems().map(s => (
                  <tr key={s.idSucursal} className="border-top border-border-soft">
                    <td className="p-3">{s.nombre}</td>
                    <td className="p-3">{s.departamento}</td>
                    <td className="p-3">{s.provincia}</td>
                    <td className="p-3">{s.direccion}</td>
                    <td className="p-3 flex gap-2 flex-wrap">
                      <button onClick={()=>onEdit(s)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary text-xs inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">edit</span>
                        Editar
                      </button>
                      <button onClick={()=>onDelete(s)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary text-xs inline-flex items-center gap-1 text-red-600">
                        <span className="material-symbols-outlined text-base">delete</span>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredItems().length === 0 && (
                  <tr>
                    <td className="p-4 text-text-secondary" colSpan={5}>No hay sucursales para mostrar</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="w-full max-w-xl rounded-xl border border-border-soft bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl">{editing ? 'Editar sucursal' : 'Nueva sucursal'}</h2>
                <button onClick={()=>setShowForm(false)} className="text-text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-text-secondary">Nombre</label>
                  <input value={form.nombre} onChange={e=>setForm(f=>({...f, nombre: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Departamento</label>
                  <input value={form.departamento} onChange={e=>setForm(f=>({...f, departamento: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Provincia</label>
                  <input value={form.provincia} onChange={e=>setForm(f=>({...f, provincia: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-text-secondary">Dirección</label>
                  <input value={form.direccion} onChange={e=>setForm(f=>({...f, direccion: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div className="md:col-span-2 flex items-center justify-end gap-2 mt-2">
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
