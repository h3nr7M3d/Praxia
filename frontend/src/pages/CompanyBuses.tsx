import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import CompanyHeader from '../components/CompanyHeader'
import { useTheme } from '../hooks/useTheme'

export default function CompanyBuses() {
  useTheme()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ idBus:number; matricula:string; capacidad:number; estado:string }>>([])
  const [q, setQ] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<null | { idBus:number; matricula:string; capacidad:number; estado:string }>(null)
  const [matricula, setMatricula] = useState('')
  const [capacidad, setCapacidad] = useState<number | ''>('')
  const [estado, setEstado] = useState('disponible')
  const [saving, setSaving] = useState(false)
  const [asientos, setAsientos] = useState<Array<{codigo:string}>>([])
  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  useEffect(() => {
    const e = localStorage.getItem('userEmail') || ''
    setEmail(e)
    ;(async () => {
      // obtener empresa del usuario actual
      const uid = localStorage.getItem('userId')
      if (!uid) return
      try {
        const profRes = await fetch(`${API_BASE}/auth/profile?userId=${uid}`)
        if (profRes.ok) {
          const prof = await profRes.json()
          if (prof?.idEmpresa) {
            setEmpresaId(Number(prof.idEmpresa))
          }
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (!empresaId) return
    void loadBuses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId])

  async function loadBuses() {
    if (!empresaId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/buses?empresaId=${empresaId}`)
      if (!res.ok) throw new Error('No se pudo cargar buses')
      const data = await res.json()
      setItems(data as any)
    } catch (e:any) {
      setError(e.message || 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  function filteredItems() {
    return items.filter(it => {
      const okQ = q ? it.matricula.toLowerCase().includes(q.toLowerCase()) : true
      const okE = estadoFilter ? it.estado === estadoFilter : true
      return okQ && okE
    })
  }

  function onNew() {
    setEditing(null)
    setMatricula('')
    setCapacidad('')
    setEstado('disponible')
    setAsientos([]) // Reset asientos for new bus
    setShowForm(true)
  }

  async function onEdit(it: { idBus:number; matricula:string; capacidad:number; estado:string }) {
    setEditing(it)
    setMatricula(it.matricula)
    setCapacidad(it.capacidad)
    setEstado(it.estado)
    // Obtener asientos del backend
    try {
      const res = await fetch(`${API_BASE}/buses/${it.idBus}/asientos`);
      if (res.ok) {
        const lista = await res.json();
        setAsientos(Array.isArray(lista) ? lista.map(a => ({ codigo: a.codigo })) : []);
      } else {
        setAsientos([]);
      }
    } catch {
      setAsientos([]);
    }
    setShowForm(true)
  }

  async function onDelete(it: { idBus:number; matricula:string }) {
    if (!confirm(`¿Eliminar bus ${it.matricula}?`)) return
    try {
      const res = await fetch(`${API_BASE}/buses/${it.idBus}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar')
      await loadBuses()
    } catch (e:any) {
      alert(e.message || 'Error al eliminar')
    }
  }

  function onAddAsiento() {
    if (asientos.length >= (capacidad || 0)) {
      alert('No puedes agregar más asientos que la capacidad del bus');
      return;
    }
    setAsientos(a => [...a, {codigo: ''}]);
  }
  function onAsientoChange(idx: number, val: string) {
    setAsientos(a => a.map((el,i)=> i===idx ? {...el, codigo: val} : el))
  }
  function onRemoveAsiento(idx: number) {
    setAsientos(a => a.filter((_,i)=>i!==idx))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!empresaId) return
    const capacidadValue = typeof capacidad === 'number' ? capacidad : Number(capacidad);
    if (!matricula || capacidad === '' || capacidadValue <= 0 || Number.isNaN(capacidadValue)) {
      alert('Complete matrícula y capacidad válida');
      return;
    }
    if (!editing && asientos.length === 0) { alert('Agrega al menos un asiento'); return }
    if (!editing && asientos.some(a => !a.codigo)) { alert('Completa todos los códigos de los asientos'); return }
    setSaving(true)
    try {
      let body
      if (editing) {
        body = { matricula, capacidad: capacidadValue, estado };
      } else {
        body = { matricula, capacidad: capacidadValue, estado, idEmpresa: empresaId, asientos };
      }
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `${API_BASE}/buses/${editing.idBus}` : `${API_BASE}/buses`
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('No se pudo guardar')
      setShowForm(false)
      await loadBuses()
    } catch (e:any) {
      alert(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }
 
  // Generador de códigos para asientos "A1", "A2", ... "B1", "B2", etc
  function generarAsientosAutomaticos(total: number) {
    const as: Array<{codigo:string}> = [];
    let letraIdx = 0;
    let numero = 1;
    for (let i=0; i<total; ++i) {
      if (numero > 10) { letraIdx++; numero = 1; }
      const code = String.fromCharCode(65+letraIdx) + numero; // 65 = A
      as.push({codigo: code});
      numero++;
    }
    setAsientos(as);
  }
  // Cortar asientos extra si se cambia la capacidad a menor que la cantidad actual
  useEffect(() => {
    if (asientos.length > (capacidad || 0)) {
      setAsientos(asientos.slice(0, capacidad || 0));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacidad]);

  return (
    <div className="min-h-screen bg-background-light text-text-primary">
      <CompanyHeader />
      <main className="flex-1 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-5xl mb-6 flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl text-primary">Buses</h1>
          <button onClick={onNew} className="px-4 py-2 rounded-lg bg-primary text-background-light font-bold hover:bg-accent">Añadir bus</button>
        </div>
        <div className="w-full max-w-5xl mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por matrícula" className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary" />
          <select value={estadoFilter} onChange={e=>setEstadoFilter(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary">
            <option value="">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="en_ruta">En ruta</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <button onClick={loadBuses} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Refrescar</button>
        </div>

        {error && <div className="w-full max-w-5xl text-sm text-red-700 mb-3">{error}</div>}
        {loading ? (
          <div className="w-full max-w-5xl text-text-secondary">Cargando...</div>
        ) : (
          <div className="w-full max-w-5xl overflow-x-auto rounded-xl border border-border-soft bg-white/50">
            <table className="min-w-full text-sm">
              <thead className="bg-background-secondary/60">
                <tr>
                  <th className="text-left p-3">Matrícula</th>
                  <th className="text-left p-3">Capacidad</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems().map(it => (
                  <tr key={it.idBus} className="border-t border-border-soft">
                    <td className="p-3">{it.matricula}</td>
                    <td className="p-3">{it.capacidad}</td>
                    <td className="p-3 capitalize">{it.estado.replace('_',' ')}</td>
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
                    <td className="p-4 text-text-secondary" colSpan={4}>No hay buses para mostrar</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex">
            <div className="bg-black/40 flex-1" onClick={()=>setShowForm(false)}></div>
            <div className="w-full max-w-md h-full bg-white border-l border-border-soft shadow-2xl flex flex-col animate-slideInRight overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-border-soft">
                <h2 className="font-display text-xl">{editing ? 'Editar bus' : 'Nuevo bus'}</h2>
                <button onClick={()=>setShowForm(false)} className="text-text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={onSubmit} className="grid gap-4 p-6 flex-1">
                <div>
                  <label className="sr-only" htmlFor="mat">Matrícula</label>
                  <input id="mat" value={matricula} onChange={e=>setMatricula(e.target.value)} placeholder="Matrícula" className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="sr-only" htmlFor="cap">Capacidad</label>
                  <input id="cap" type="number" min={1} value={capacidad} onChange={e=>setCapacidad(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Capacidad" className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary" />
                  {!editing && Number(capacidad) > 0 && (
                    <button type="button" onClick={()=>generarAsientosAutomaticos(Number(capacidad))} className="mt-2 px-3 py-1 rounded bg-amber-500 text-white hover:bg-amber-700">
                      Generar asientos automáticamente
                    </button>
                  )}
                </div>
                <div>
                  <label className="sr-only" htmlFor="est">Estado</label>
                  <select id="est" value={estado} onChange={e=>setEstado(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary">
                    <option value="disponible">Disponible</option>
                    <option value="en_ruta">En ruta</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="border-t pt-4 mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">Asientos</h3>
                    <button type="button" onClick={onAddAsiento} className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded flex items-center gap-1" disabled={asientos.length >= (capacidad || 0)}><span className="material-symbols-outlined text-base">add</span>Agregar asiento</button>
                  </div>
                  <div className="space-y-2">
                    {asientos.length === 0 && <div className="text-sm text-text-secondary">Sin asientos agregados</div>}
                    {asientos.map((as, idx) => (
                      <div className="flex gap-2 items-center" key={idx}>
                        <input type="text" value={as.codigo} onChange={e=>onAsientoChange(idx, e.target.value)} placeholder={`Código asiento #${idx+1}`} className="w-40 rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                        <button type="button" onClick={()=>onRemoveAsiento(idx)} className="p-1 text-red-600 hover:bg-red-50 rounded"><span className="material-symbols-outlined text-base">delete</span></button>
                      </div>
                    ))}
                  </div>
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
