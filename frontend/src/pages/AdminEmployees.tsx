import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import UserAvatar from '../components/UserAvatar'

export default function AdminEmployees() {
  useTheme()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filterExperience, setFilterExperience] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterDisponible, setFilterDisponible] = useState('')
  const [items, setItems] = useState<Array<Empleado>>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Empleado | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null)
  const [showBreveteForm, setShowBreveteForm] = useState(false)
  const [breveteForm, setBreveteForm] = useState({ numero: '', fechaEmision: '', fechaVencimiento: '' })
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [form, setForm] = useState<FormState>({ dni: '', telefono: '', domicilio: '', nombres: '', apellidos: '', aniosExperiencia: '', fechaNacimiento: '', disponible: 'true' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean, message: string }>({ open: false, message: '' })
  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  type Brevete = {
    idBrevete: number
    numero: string
    fechaEmision: string
    fechaVencimiento: string
  }

  type Empleado = { 
    idEmpleado: number
    dni: string
    telefono: string
    domicilio: string
    nombres: string
    apellidos: string
    aniosExperiencia: number
    fechaNacimiento: string
    disponible: boolean
    tipo: string
    brevete?: Brevete
  }
  type FormState = { dni: string; telefono: string; domicilio: string; nombres: string; apellidos: string; aniosExperiencia: string; fechaNacimiento: string; disponible: string }

  useEffect(() => { setEmail(localStorage.getItem('userEmail') || '') }, [])
  useEffect(() => { void loadEmpleados() }, [])

  async function loadEmpleados() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/empleados`)
      if (!res.ok) throw new Error('No se pudo cargar empleados')
      setItems(await res.json())
    } catch (e: any) {
      setError(e.message || 'Error al cargar empleados')
    } finally {
      setLoading(false)
    }
  }

  function filteredItems() {
    let filtered = items
    const qq = q.trim().toLowerCase()
    if (qq) {
      filtered = filtered.filter(emp =>
        emp.dni.toLowerCase().includes(qq) ||
        emp.nombres.toLowerCase().includes(qq) ||
        emp.apellidos.toLowerCase().includes(qq) ||
        (emp.telefono && emp.telefono.toLowerCase().includes(qq))
      )
    }
    if (filterExperience) {
      const exp = parseInt(filterExperience)
      if (!isNaN(exp)) {
        filtered = filtered.filter(emp => emp.aniosExperiencia >= exp)
      }
    }
    if (filterTipo) {
      filtered = filtered.filter(emp => emp.tipo === filterTipo)
    }
    if (filterDisponible) {
      const disp = filterDisponible === 'true'
      filtered = filtered.filter(emp => emp.disponible === disp)
    }
    return filtered
  }

  function onNew() {
    setEditing(null)
    setForm({ dni: '', telefono: '', domicilio: '', nombres: '', apellidos: '', aniosExperiencia: '', fechaNacimiento: '', disponible: 'true' })
    setShowForm(true)
  }

  function onEdit(emp: Empleado) {
    setEditing(emp)
    setForm({ 
      dni: emp.dni, 
      telefono: emp.telefono || '', 
      domicilio: emp.domicilio || '', 
      nombres: emp.nombres, 
      apellidos: emp.apellidos, 
      aniosExperiencia: emp.aniosExperiencia?.toString() || '', 
      fechaNacimiento: emp.fechaNacimiento,
      disponible: emp.disponible?.toString() || 'true'
    })
    setShowForm(true)
  }

  function onViewDetails(emp: Empleado) {
    setSelectedEmpleado(emp)
    setShowDetails(true)
  }

  function onAgregarBrevete() {
    setBreveteForm({ numero: '', fechaEmision: '', fechaVencimiento: '' })
    setShowBreveteForm(true)
  }

  function onEditarBrevete() {
    if (selectedEmpleado?.brevete) {
      setBreveteForm({
        numero: selectedEmpleado.brevete.numero,
        fechaEmision: selectedEmpleado.brevete.fechaEmision,
        fechaVencimiento: selectedEmpleado.brevete.fechaVencimiento
      })
      setShowBreveteForm(true)
    }
  }

  function openRemoveConfirm() {
    if (!selectedEmpleado) return
    setShowRemoveConfirm(true)
  }

  async function onQuitarBrevete() {
    if (!selectedEmpleado) return
    try {
      const res = await fetch(`${API_BASE}/empleados/${selectedEmpleado.idEmpleado}/brevete`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo quitar el brevete')
      setShowRemoveConfirm(false)
      setShowDetails(false)
      await loadEmpleados()
    } catch (e: any) {
      alert(e.message || 'Error al quitar brevete')
    }
  }

  async function onSubmitBrevete(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEmpleado) return
    if (!breveteForm.numero || !breveteForm.fechaEmision || !breveteForm.fechaVencimiento) {
      alert('Todos los campos son obligatorios')
      return
    }

    setSaving(true)
    try {
      const body = {
        numero: breveteForm.numero,
        fechaEmision: breveteForm.fechaEmision,
        fechaVencimiento: breveteForm.fechaVencimiento
      }

      let res
      if (selectedEmpleado.brevete) {
        // Editar brevete existente
        res = await fetch(`${API_BASE}/brevetes/${selectedEmpleado.brevete.idBrevete}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      } else {
        // Crear nuevo brevete
        res = await fetch(`${API_BASE}/empleados/${selectedEmpleado.idEmpleado}/brevete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      }

      if (!res.ok) throw new Error('No se pudo guardar el brevete')
      
      setToast({ open: true, message: 'Brevete guardado exitosamente' })
      setShowBreveteForm(false)
      await loadEmpleados()
      setShowDetails(false)
    } catch (e: any) {
      alert(e.message || 'Error al guardar brevete')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(emp: Empleado) {
    if (!confirm(`¿Eliminar empleado ${emp.nombres} ${emp.apellidos}?`)) return
    try {
      const res = await fetch(`${API_BASE}/empleados/${emp.idEmpleado}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar')
      await loadEmpleados()
    } catch (e: any) {
      alert(e.message || 'Error al eliminar')
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.dni || !form.nombres || !form.apellidos || !form.fechaNacimiento) { 
      alert('DNI, nombres, apellidos y fecha de nacimiento son obligatorios')
      return 
    }
    if (form.dni.length !== 8) {
      alert('El DNI debe tener 8 dígitos')
      return
    }
    setSaving(true)
    try {
      const body = { 
        dni: form.dni, 
        telefono: form.telefono || null, 
        domicilio: form.domicilio || null, 
        nombres: form.nombres, 
        apellidos: form.apellidos, 
        aniosExperiencia: form.aniosExperiencia ? parseInt(form.aniosExperiencia) : null, 
        fechaNacimiento: form.fechaNacimiento,
        disponible: form.disponible === 'true'
      }
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `${API_BASE}/empleados/${editing.idEmpleado}` : `${API_BASE}/empleados`
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('No se pudo guardar')
      setShowForm(false)
      await loadEmpleados()
    } catch (e: any) {
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
            <Link to="/dashboard/admin/empleados" className="text-text-primary inline-flex items-center gap-1">
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
          <h1 className="font-display text-3xl text-primary">Empleados</h1>
          <button onClick={onNew} className="px-4 py-2 rounded-lg bg-primary text-background-light font-bold hover:bg-accent">Añadir empleado</button>
        </div>
        <div className="w-full max-w-5xl mb-4 grid grid-cols-1 md:grid-cols-6 gap-3">
          <input 
            value={q} 
            onChange={e => setQ(e.target.value)} 
            placeholder="Buscar por DNI, nombre, teléfono" 
            className="w-full md:col-span-2 rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary" 
          />
          <input 
            type="number" 
            value={filterExperience} 
            onChange={e => setFilterExperience(e.target.value)} 
            placeholder="Años exp. mínimo" 
            className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary" 
          />
          <select 
            value={filterTipo} 
            onChange={e => setFilterTipo(e.target.value)}
            className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary"
          >
            <option value="">Todos los tipos</option>
            <option value="chofer">Chofer</option>
            <option value="azafato">Azafato</option>
            <option value="ninguno">Sin asignar</option>
          </select>
          <select 
            value={filterDisponible} 
            onChange={e => setFilterDisponible(e.target.value)}
            className="w-full rounded-lg border border-border-soft bg-white/70 px-4 py-2 outline-none focus:border-primary"
          >
            <option value="">Todos</option>
            <option value="true">Disponible</option>
            <option value="false">No disponible</option>
          </select>
          <button onClick={loadEmpleados} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Refrescar</button>
        </div>

        {error && <div className="w-full max-w-5xl text-sm text-red-700 mb-3">{error}</div>}
        {loading ? (
          <div className="w-full max-w-5xl text-text-secondary">Cargando...</div>
        ) : (
          <div className="w-full max-w-5xl overflow-x-auto rounded-xl border border-border-soft bg-white/50">
            <table className="min-w-full text-sm">
              <thead className="bg-background-secondary/60">
                <tr>
                  <th className="text-left p-3">DNI</th>
                  <th className="text-left p-3">Nombres</th>
                  <th className="text-left p-3">Apellidos</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Disponibilidad</th>
                  <th className="text-left p-3">Experiencia</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems().map(emp => (
                  <tr key={emp.idEmpleado} className="border-top border-border-soft">
                    <td className="p-3 font-mono">{emp.dni}</td>
                    <td className="p-3">{emp.nombres}</td>
                    <td className="p-3">{emp.apellidos}</td>
                    <td className="p-3">
                      {emp.tipo === 'chofer' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-indigo-100 text-indigo-700">
                          <span className="material-symbols-outlined text-base">directions_car</span>
                          Chofer
                        </span>
                      ) : emp.tipo === 'azafato' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-purple-100 text-purple-700">
                          <span className="material-symbols-outlined text-base">support_agent</span>
                          Azafato
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                          <span className="material-symbols-outlined text-base">person</span>
                          Sin asignar
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {emp.disponible ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-green-100 text-green-700">
                          <span className="material-symbols-outlined text-base">check_circle</span>
                          Disponible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-red-100 text-red-700">
                          <span className="material-symbols-outlined text-base">cancel</span>
                          No disponible
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {emp.aniosExperiencia !== null && emp.aniosExperiencia !== undefined ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-700">
                          <span className="material-symbols-outlined text-base">work_history</span>
                          {emp.aniosExperiencia} años
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 flex gap-2 flex-wrap">
                      <button onClick={() => onViewDetails(emp)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary text-xs inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">visibility</span>
                        Ver detalles
                      </button>
                      <button onClick={() => onEdit(emp)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary text-xs inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">edit</span>
                        Editar
                      </button>
                      <button onClick={() => onDelete(emp)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary text-xs inline-flex items-center gap-1 text-red-600">
                        <span className="material-symbols-outlined text-base">delete</span>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredItems().length === 0 && (
                  <tr>
                    <td className="p-4 text-text-secondary" colSpan={7}>No hay empleados para mostrar</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="w-full max-w-2xl rounded-xl border border-border-soft bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl">{editing ? 'Editar empleado' : 'Nuevo empleado'}</h2>
                <button onClick={() => setShowForm(false)} className="text-text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-text-secondary">DNI *</label>
                  <input 
                    value={form.dni} 
                    onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} 
                    maxLength={8}
                    placeholder="12345678"
                    className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" 
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Teléfono</label>
                  <input 
                    value={form.telefono} 
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} 
                    placeholder="999888777"
                    className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" 
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Nombres *</label>
                  <input 
                    value={form.nombres} 
                    onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} 
                    placeholder="Juan Carlos"
                    className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" 
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Apellidos *</label>
                  <input 
                    value={form.apellidos} 
                    onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} 
                    placeholder="Pérez García"
                    className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" 
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Años de experiencia</label>
                  <input 
                    type="number"
                    value={form.aniosExperiencia} 
                    onChange={e => setForm(f => ({ ...f, aniosExperiencia: e.target.value }))} 
                    min="0"
                    placeholder="5"
                    className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" 
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Fecha de nacimiento *</label>
                  <input 
                    type="date"
                    value={form.fechaNacimiento} 
                    onChange={e => setForm(f => ({ ...f, fechaNacimiento: e.target.value }))} 
                    className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-text-secondary">Domicilio</label>
                  <input 
                    value={form.domicilio} 
                    onChange={e => setForm(f => ({ ...f, domicilio: e.target.value }))} 
                    placeholder="Av. Principal 123, Lima"
                    className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-text-secondary">Disponibilidad</label>
                  <select
                    value={form.disponible}
                    onChange={e => setForm(f => ({ ...f, disponible: e.target.value }))}
                    className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary"
                  >
                    <option value="true">Disponible</option>
                    <option value="false">No disponible</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex items-center justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cancelar</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-background-light font-bold hover:bg-accent disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetails && selectedEmpleado && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-3xl rounded-xl border border-border-soft bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl text-primary">Detalles del Empleado</h2>
                <button onClick={() => setShowDetails(false)} className="text-text-secondary hover:text-primary">
                  <span className="material-symbols-outlined text-3xl">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 bg-background-light rounded-lg p-4 border border-border-soft">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">person</span>
                    Información Personal
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-text-secondary">DNI</p>
                      <p className="font-mono font-bold">{selectedEmpleado.dni}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Teléfono</p>
                      <p className="font-semibold">{selectedEmpleado.telefono || 'No registrado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Nombres</p>
                      <p className="font-semibold">{selectedEmpleado.nombres}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Apellidos</p>
                      <p className="font-semibold">{selectedEmpleado.apellidos}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-text-secondary">Domicilio</p>
                      <p className="font-semibold">{selectedEmpleado.domicilio || 'No registrado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Fecha de Nacimiento</p>
                      <p className="font-semibold">{selectedEmpleado.fechaNacimiento}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Años de Experiencia</p>
                      <p className="font-semibold">{selectedEmpleado.aniosExperiencia || 'No especificado'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-background-light rounded-lg p-4 border border-border-soft">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">badge</span>
                    Tipo de Empleado
                  </h3>
                  {selectedEmpleado.tipo === 'chofer' ? (
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-indigo-100 text-indigo-700">
                      <span className="material-symbols-outlined text-xl">directions_car</span>
                      Chofer
                    </span>
                  ) : selectedEmpleado.tipo === 'azafato' ? (
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-purple-100 text-purple-700">
                      <span className="material-symbols-outlined text-xl">support_agent</span>
                      Azafato
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-gray-100 text-gray-700">
                      <span className="material-symbols-outlined text-xl">person</span>
                      Sin asignar
                    </span>
                  )}
                </div>

                <div className="bg-background-light rounded-lg p-4 border border-border-soft">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">event_available</span>
                    Disponibilidad
                  </h3>
                  {selectedEmpleado.disponible ? (
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-green-100 text-green-700">
                      <span className="material-symbols-outlined text-xl">check_circle</span>
                      Disponible
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-red-100 text-red-700">
                      <span className="material-symbols-outlined text-xl">cancel</span>
                      No disponible
                    </span>
                  )}
                </div>

                {selectedEmpleado.tipo === 'chofer' && (
                  <div className="md:col-span-2 bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-700">card_membership</span>
                      <span className="text-amber-900">Brevete</span>
                    </h3>
                    {selectedEmpleado.brevete ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-amber-800">Número</p>
                            <p className="font-mono font-bold text-amber-900">{selectedEmpleado.brevete.numero}</p>
                          </div>
                          <div>
                            <p className="text-sm text-amber-800">Fecha de Emisión</p>
                            <p className="font-semibold text-amber-900">{selectedEmpleado.brevete.fechaEmision}</p>
                          </div>
                          <div>
                            <p className="text-sm text-amber-800">Fecha de Vencimiento</p>
                            <p className="font-semibold text-amber-900">{selectedEmpleado.brevete.fechaVencimiento}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={onEditarBrevete} className="px-3 py-2 rounded-md border border-amber-300 bg-white hover:bg-amber-50 text-xs inline-flex items-center gap-1 text-amber-700">
                            <span className="material-symbols-outlined text-base">edit</span>
                            Editar brevete
                          </button>
                          <button onClick={openRemoveConfirm} className="px-3 py-2 rounded-md border border-amber-300 bg-white hover:bg-amber-50 text-xs inline-flex items-center gap-1 text-red-600">
                            <span className="material-symbols-outlined text-base">delete</span>
                            Quitar brevete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-amber-700 mb-3">Este chofer no tiene brevete asignado</p>
                        <button onClick={onAgregarBrevete} className="px-4 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 inline-flex items-center gap-2">
                          <span className="material-symbols-outlined">add</span>
                          Añadir brevete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowDetails(false)} className="px-6 py-2 rounded-lg bg-primary text-background-light font-bold hover:bg-accent">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {showBreveteForm && selectedEmpleado && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="w-full max-w-md rounded-xl border border-border-soft bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl">{selectedEmpleado.brevete ? 'Editar Brevete' : 'Añadir Brevete'}</h2>
                <button onClick={() => setShowBreveteForm(false)} className="text-text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={onSubmitBrevete} className="grid gap-4">
                <div>
                  <label className="text-sm text-text-secondary">Número de Brevete *</label>
                  <input
                    value={breveteForm.numero}
                    onChange={e => setBreveteForm(f => ({ ...f, numero: e.target.value }))}
                    placeholder="A12345678"
                    className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Fecha de Emisión *</label>
                  <input
                    type="date"
                    value={breveteForm.fechaEmision}
                    onChange={e => setBreveteForm(f => ({ ...f, fechaEmision: e.target.value }))}
                    className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Fecha de Vencimiento *</label>
                  <input
                    type="date"
                    value={breveteForm.fechaVencimiento}
                    onChange={e => setBreveteForm(f => ({ ...f, fechaVencimiento: e.target.value }))}
                    className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setShowBreveteForm(false)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cancelar</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-background-light font-bold hover:bg-accent disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showRemoveConfirm && selectedEmpleado && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md rounded-xl border border-border-soft bg-white p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-red-600">warning</span>
                <h3 className="font-display text-xl">Quitar brevete</h3>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                Esta acción quitará el brevete asignado al chofer <span className="font-semibold text-text-primary">{selectedEmpleado.nombres} {selectedEmpleado.apellidos}</span>.
                Podrás volver a asignar uno más adelante. ¿Deseas continuar?
              </p>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowRemoveConfirm(false)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cancelar</button>
                <button type="button" onClick={onQuitarBrevete} className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700">Quitar brevete</button>
              </div>
            </div>
          </div>
        )}
      </main>
      {toast.open && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-green-600 text-white shadow-lg animate-fadeInUp">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
            <span className="font-semibold">{toast.message}</span>
            <button onClick={() => setToast({ open: false, message: '' })} className="ml-2 hover:opacity-60">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
