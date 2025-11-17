import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import CompanyHeader from '../components/CompanyHeader'
import { useTheme } from '../hooks/useTheme'

export default function CompanyRoutes() {
  useTheme()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Array<RutaItem>>([])
  const [sucursales, setSucursales] = useState<Array<SucursalItem>>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<RutaItem | null>(null)
  const [form, setForm] = useState<FormState>({ idOrigen: '', idDestino: '', precio: '' })
  const [saving, setSaving] = useState(false)
  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  type RutaItem = { idRuta:number; origen:string|null; destino:string|null; precio:number }
  type SucursalItem = { idSucursal:number; nombre:string; departamento:string; provincia:string; direccion:string }
  type FormState = { idOrigen: string|number; idDestino: string|number; precio: string|number }

  useEffect(() => {
    const e = localStorage.getItem('userEmail') || ''
    setEmail(e)
    ;(async () => {
      const uid = localStorage.getItem('userId')
      if (!uid) return
      try {
        const profRes = await fetch(`${API_BASE}/auth/profile?userId=${uid}`)
        if (profRes.ok) {
          const prof = await profRes.json()
          if (prof?.idEmpresa) setEmpresaId(Number(prof.idEmpresa))
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (!empresaId) return
    void loadAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [rRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/rutas?empresaId=${empresaId}`),
        fetch(`${API_BASE}/sucursales`)
      ])
      if (rRes.ok) setItems(await rRes.json())
      if (sRes.ok) setSucursales(await sRes.json())
    } catch (e:any) {
      setError(e.message || 'Error al cargar rutas')
    } finally {
      setLoading(false)
    }
  }

  function filteredItems() {
    const qq = q.trim().toLowerCase()
    if (!qq) return items
    return items.filter(it =>
      (it.origen||'').toLowerCase().includes(qq) ||
      (it.destino||'').toLowerCase().includes(qq)
    )
  }

  function onNew() {
    setEditing(null)
    setForm({ idOrigen: '', idDestino: '', precio: '' })
    setShowForm(true)
  }

  function onEdit(it: RutaItem) {
    setEditing(it)
    // Encontrar sucursales por nombre/provincia no es fiable; la API no retorna IDs de origen/destino en RutaResponse.
    // En este CRUD permitimos cambiar a cualquiera; el valor inicial queda vacío para que el usuario seleccione.
    setForm({ idOrigen: '', idDestino: '', precio: it.precio })
    setShowForm(true)
  }

  async function onDelete(it: RutaItem) {
    if (!confirm('¿Eliminar la ruta seleccionada?')) return
    try {
      const res = await fetch(`${API_BASE}/rutas/${it.idRuta}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar')
      await loadAll()
    } catch (e:any) {
      alert(e.message || 'Error al eliminar')
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!empresaId) { alert('Empresa no detectada'); return }
    if (!form.idOrigen || !form.idDestino || !form.precio) { alert('Completa todos los campos'); return }
    if (String(form.idOrigen) === String(form.idDestino)) { alert('Origen y destino no pueden ser iguales'); return }
    setSaving(true)
    try {
      const body = {
        idEmpresa: empresaId,
        idSucursalOrigen: Number(form.idOrigen),
        idSucursalDestino: Number(form.idDestino),
        precio: Number(form.precio)
      }
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `${API_BASE}/rutas/${editing.idRuta}` : `${API_BASE}/rutas`
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('No se pudo guardar')
      setShowForm(false)
      await loadAll()
    } catch (e:any) {
      alert(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary">
      <CompanyHeader />
      <main className="flex-1 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-5xl mb-6 flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl text-primary">Rutas</h1>
          <button onClick={onNew} className="px-4 py-2 rounded-lg bg-primary text-background-light font-bold hover:bg-accent">Añadir ruta</button>
        </div>
        <div className="w-full max-w-5xl mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por origen o destino" className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary" />
          <button onClick={loadAll} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Refrescar</button>
        </div>

        {error && <div className="w-full max-w-5xl text-sm text-red-700 mb-3">{error}</div>}
        {loading ? (
          <div className="w-full max-w-5xl text-text-secondary">Cargando...</div>
        ) : (
          <div className="w-full max-w-5xl overflow-x-auto rounded-xl border border-border-soft bg-white/50">
            <table className="min-w-full text-sm">
              <thead className="bg-background-secondary/60">
                <tr>
                  <th className="text-left p-3">Origen</th>
                  <th className="text-left p-3">Destino</th>
                  <th className="text-left p-3">Precio</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems().map(it => (
                  <tr key={it.idRuta} className="border-top border-border-soft">
                    <td className="p-3">{it.origen || '-'}</td>
                    <td className="p-3">{it.destino || '-'}</td>
                    <td className="p-3">S/ {Number(it.precio).toFixed(2)}</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={()=>onEdit(it)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary text-xs inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">edit</span>
                        Editar
                      </button>
                      <button onClick={()=>onDelete(it)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary text-xs inline-flex items-center gap-1 text-red-600">
                        <span className="material-symbols-outlined text-base">delete</span>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredItems().length === 0 && (
                  <tr>
                    <td className="p-4 text-text-secondary" colSpan={4}>No hay rutas para mostrar</td>
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
                <h2 className="font-display text-xl">{editing ? 'Editar ruta' : 'Nueva ruta'}</h2>
                <button onClick={()=>setShowForm(false)} className="text-text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-text-secondary">Origen</label>
                  <select value={form.idOrigen} onChange={e=>setForm(f=>({...f, idOrigen: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary">
                    <option value="">Selecciona origen</option>
                    {sucursales.map(s => (
                      <option key={s.idSucursal} value={s.idSucursal}>{s.provincia} - {s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Destino</label>
                  <select value={form.idDestino} onChange={e=>setForm(f=>({...f, idDestino: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary">
                    <option value="">Selecciona destino</option>
                    {sucursales.map(s => (
                      <option key={s.idSucursal} value={s.idSucursal}>{s.provincia} - {s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-text-secondary">Precio (PEN)</label>
                  <input type="number" step="0.01" value={form.precio} onChange={e=>setForm(f=>({...f, precio: e.target.value === '' ? '' : Number(e.target.value)}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
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
