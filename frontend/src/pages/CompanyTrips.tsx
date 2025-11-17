import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import CompanyHeader from '../components/CompanyHeader'
import { useTheme } from '../hooks/useTheme'

export default function CompanyTrips() {
  useTheme()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Array<Trip>>([])
  const [rutas, setRutas] = useState<Array<RutaOption>>([])
  const [buses, setBuses] = useState<Array<BusOption>>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [form, setForm] = useState<FormState>({ idRuta: '', idBus: '', fPartida: '', hPartida: '', fLlegada: '', hLlegada: '' })
  const [saving, setSaving] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [detailsFor, setDetailsFor] = useState<Trip | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [details, setDetails] = useState<TripDetails | null>(null)
  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  type Trip = { idViaje:number; idRuta:number|null; origen:string|null; destino:string|null; idBus:number|null; busMatricula:string|null; fechaPartida:string|null; horaPartida:string|null; fechaLlegada:string|null; horaLlegada:string|null }
  type RutaOption = { idRuta:number; origen:string|null; destino:string|null; precio:number }
  type BusOption = { idBus:number; matricula:string }
  type FormState = { idRuta: string|number; idBus: string|number; fPartida: string; hPartida: string; fLlegada: string; hLlegada: string }
  type TripDetails = { choferes:string[]; azafatos:string[]; asientos:Array<{ idAsiento:number; codigo:string; disponibilidad:string|null }>; totalAsientos:number; disponibles:number; vendidos:number }

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
      const [vRes, rRes, bRes] = await Promise.all([
        fetch(`${API_BASE}/viajes?empresaId=${empresaId}`),
        fetch(`${API_BASE}/rutas?empresaId=${empresaId}`),
        fetch(`${API_BASE}/buses?empresaId=${empresaId}`)
      ])
      if (vRes.ok) setItems(await vRes.json())
      if (rRes.ok) setRutas(await rRes.json())
      if (bRes.ok) {
        const list = await bRes.json()
        setBuses(list.map((x:any)=>({ idBus: x.idBus, matricula: x.matricula })))
      }
    } catch (e:any) {
      setError(e.message || 'Error al cargar viajes')
    } finally {
      setLoading(false)
    }
  }

  function filteredItems() {
    const qq = q.trim().toLowerCase()
    if (!qq) return items
    return items.filter(it =>
      (it.origen||'').toLowerCase().includes(qq) ||
      (it.destino||'').toLowerCase().includes(qq) ||
      (it.busMatricula||'').toLowerCase().includes(qq)
    )
  }

  function onNew() {
    setEditing(null)
    setForm({ idRuta: '', idBus: '', fPartida: '', hPartida: '', fLlegada: '', hLlegada: '' })
    setShowForm(true)
  }

  function onEdit(it: Trip) {
    setEditing(it)
    setForm({
      idRuta: it.idRuta || '',
      idBus: it.idBus || '',
      fPartida: it.fechaPartida || '',
      hPartida: (it.horaPartida||'').slice(0,5),
      fLlegada: it.fechaLlegada || '',
      hLlegada: (it.horaLlegada||'').slice(0,5),
    })
    setShowForm(true)
  }

  async function onDelete(it: Trip) {
    if (!confirm('¿Eliminar el viaje seleccionado?')) return
    try {
      const res = await fetch(`${API_BASE}/viajes/${it.idViaje}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar')
      await loadAll()
    } catch (e:any) {
      alert(e.message || 'Error al eliminar')
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.idRuta || !form.idBus || !form.fPartida || !form.hPartida || !form.fLlegada || !form.hLlegada) {
      alert('Completa todos los campos'); return
    }
    setSaving(true)
    try {
      const body = {
        idRuta: Number(form.idRuta),
        idBus: Number(form.idBus),
        fechaPartida: form.fPartida,
        horaPartida: form.hPartida,
        fechaLlegada: form.fLlegada,
        horaLlegada: form.hLlegada,
      }
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `${API_BASE}/viajes/${editing.idViaje}` : `${API_BASE}/viajes`
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

  async function onViewDetails(it: Trip) {
    setDetailsFor(it)
    setShowDetails(true)
    setDetailsLoading(true)
    setDetailsError(null)
    setDetails(null)
    try {
      const res = await fetch(`${API_BASE}/viajes/${it.idViaje}/detalles`)
      if (!res.ok) throw new Error('No se pudo cargar detalles')
      const data = await res.json()
      setDetails(data)
    } catch (e:any) {
      setDetailsError(e.message || 'Error al cargar detalles')
    } finally {
      setDetailsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary">
      <CompanyHeader />
      <main className="flex-1 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-5xl mb-6 flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl text-primary">Viajes</h1>
          <button onClick={onNew} className="px-4 py-2 rounded-lg bg-primary text-background-light font-bold hover:bg-accent">Añadir viaje</button>
        </div>
        <div className="w-full max-w-5xl mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por origen, destino o bus" className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary" />
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
                  <th className="text-left p-3">Fecha Partida</th>
                  <th className="text-left p-3">Hora Partida</th>
                  <th className="text-left p-3">Fecha Llegada</th>
                  <th className="text-left p-3">Hora Llegada</th>
                  <th className="text-left p-3">Bus</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems().map(it => (
                  <tr key={it.idViaje} className="border-top border-border-soft">
                    <td className="p-3">{it.origen || '-'}</td>
                    <td className="p-3">{it.destino || '-'}</td>
                    <td className="p-3">{it.fechaPartida || '-'}</td>
                    <td className="p-3">{(it.horaPartida||'').slice(0,5) || '-'}</td>
                    <td className="p-3">{it.fechaLlegada || '-'}</td>
                    <td className="p-3">{(it.horaLlegada||'').slice(0,5) || '-'}</td>
                    <td className="p-3">{it.busMatricula || '-'}</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={()=>onViewDetails(it)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary text-xs inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">visibility</span>
                        Ver detalles
                      </button>
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
                    <td className="p-4 text-text-secondary" colSpan={8}>No hay viajes para mostrar</td>
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
                <h2 className="font-display text-xl">{editing ? 'Editar viaje' : 'Nuevo viaje'}</h2>
                <button onClick={()=>setShowForm(false)} className="text-text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-1">
                  <label className="text-sm text-text-secondary">Ruta</label>
                  <select value={form.idRuta} onChange={e=>setForm(f=>({...f, idRuta: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary">
                    <option value="">Selecciona una ruta</option>
                    {rutas.map(r => (
                      <option key={r.idRuta} value={r.idRuta}>{r.origen} - {r.destino}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="text-sm text-text-secondary">Bus</label>
                  <select value={form.idBus} onChange={e=>setForm(f=>({...f, idBus: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary">
                    <option value="">Selecciona un bus</option>
                    {buses.map(b => (
                      <option key={b.idBus} value={b.idBus}>{b.matricula}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Fecha partida</label>
                  <input type="date" value={form.fPartida} onChange={e=>setForm(f=>({...f, fPartida: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Hora partida</label>
                  <input type="time" value={form.hPartida} onChange={e=>setForm(f=>({...f, hPartida: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Fecha llegada</label>
                  <input type="date" value={form.fLlegada} onChange={e=>setForm(f=>({...f, fLlegada: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Hora llegada</label>
                  <input type="time" value={form.hLlegada} onChange={e=>setForm(f=>({...f, hLlegada: e.target.value}))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div className="md:col-span-2 flex items-center justify-end gap-2 mt-2">
                  <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cancelar</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-background-light font-bold hover:bg-accent disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetails && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="w-full max-w-3xl rounded-xl border border-border-soft bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl">Detalles del viaje {detailsFor ? `${detailsFor.origen || ''} - ${detailsFor.destino || ''}` : ''}</h2>
                <button onClick={()=>setShowDetails(false)} className="text-text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              {detailsLoading && <div className="text-text-secondary">Cargando detalles...</div>}
              {detailsError && <div className="text-red-700 text-sm mb-3">{detailsError}</div>}
              {(!detailsLoading && details) && (
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg border border-border-soft bg-white/60 p-3">
                      <div className="text-sm text-text-secondary mb-1">Choferes</div>
                      <ul className="text-sm list-disc pl-5">
                        {details.choferes.length ? details.choferes.map((c,i)=>(<li key={i}>{c}</li>)) : <li className="list-none text-text-secondary">Sin choferes</li>}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-border-soft bg-white/60 p-3">
                      <div className="text-sm text-text-secondary mb-1">Azafatos</div>
                      <ul className="text-sm list-disc pl-5">
                        {details.azafatos.length ? details.azafatos.map((c,i)=>(<li key={i}>{c}</li>)) : <li className="list-none text-text-secondary">Sin azafatos</li>}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-border-soft bg-white/60 p-3">
                      <div className="text-sm text-text-secondary">Pasajes vendidos</div>
                      <div className="text-2xl font-bold">{details.vendidos}</div>
                      <div className="text-sm text-text-secondary">Disponibles: {details.disponibles} / {details.totalAsientos}</div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-soft bg-white/60 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display text-lg">Mapa de asientos</h3>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-500"></span>Disponible</span>
                        <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-red-500"></span>Ocupado</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {details.asientos.map(seat => {
                        const ocupado = seat.disponibilidad && seat.disponibilidad.toLowerCase() !== 'disponible'
                        return (
                          <div key={seat.idAsiento} className={`h-10 rounded-md border text-xs flex items-center justify-center select-none ${ocupado ? 'bg-red-500 text-white border-red-600' : 'bg-green-500/90 text-white border-green-600'}`} title={`Asiento ${seat.codigo} - ${ocupado ? 'Ocupado' : 'Disponible'}`}>
                            {seat.codigo}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
