import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"

type DashboardPayload = {
  fecha: string
  resumen: { citasHoy: number; citasAyer: number; noAsistioHoy: number; noAsistioAyer: number }
  ocupacion: { slotsTotales: number; slotsOcupados: number; medicosActivos: number }
  alertas: { consentimientosPendientes: number; notificaciones: string[] }
  agendaDestacada?: { medico: string; centro: string; horaInicio: string; horaFin: string; slotsTotales: number; slotsReservados: number }
  citasHoy: Array<{ id: number; hora: string; paciente: string; medico: string; especialidad: string; centro: string; estado: string }>
  bitacora: Array<{ tipo: string; resumen: string; fecha: string }>
}

type CitaRow = {
  id: number
  fecha: string
  hora: string
  horaInicio?: string
  horaFin?: string
  paciente: string
  pacienteId?: number | null
  medico: string
  medicoId?: number | null
  especialidad: string
  centro: string
  centroId?: number | null
  estado: string
  estadoPago?: string
  modalidad?: string
  motivo?: string
  slotId?: number | null
  agendaId?: number | null
}

type SlotOption = {
  id: number
  agendaId: number
  fecha: string
  horaInicio: string
  horaFin: string
  tipo: string
  medico: string
  centro: string
  especialidad: string
  disponibles: number
}

type CitaOptions = {
  pacientes: Array<{ id: number; nombre: string; documento: string }>
  estados: string[]
  slots: SlotOption[]
}

type CitaFormState = { pacienteId: string; slotId: string; motivo: string; estado: string }

type AgendaRow = {
  idAgenda: number
  fecha: string
  horaInicio: string
  horaFin: string
  tipo: string
  estado: string
  slotsTotales: number
  slotsOcupados: number
  medico?: string
  medicoId?: number
  centro?: string
  centroId?: number
}

type UsuarioRow = {
  id: number
  nombre: string
  documento: string
  correo?: string
  telefono?: string
  roles: string[]
  estado: string
  tipo: string[]
  correoVerificado?: boolean
  telefonoVerificado?: boolean
  fch_registro_usuario?: string
}

type MedicoRow = { id: number; nombre: string; cmp: string; perfil: string; estado: string }

type CentroRow = { id: number; nombre: string; distrito: string; provincia: string; departamento: string; estado: string }

type CatalogoResumen = {
  documentos: string[]
  estadoUsuario: string[]
  parentesco: string[]
  monedas: string[]
  especialidades: string[]
  estadosCita: string[]
  parametros: { codigo: string; valor: string | number; descripcion: string }[]
}

type UsuarioOpciones = {
  documentos: Array<{ id: number; nombre: string }>
  paises: Array<{ id: number; nombre: string }>
  roles: Array<{ id: number; nombre: string }>
  estados: string[]
}

type UsuarioDetail = {
  usuario: {
    id: number
    nombre: string
    apellido: string
    sexo?: string
    numeroDocumento?: string
    fechaNacimiento?: string
    correo?: string
    telefono?: string
    tipoDocumento?: string
    idDocumento: number
    idPais: number
    pais?: string
    estado: string
  }
  roles: string[]
  verificaciones: Array<{ canal: string; destino: string; fchEmitido?: string; fchExpira?: string; usado: boolean }>
  consentimiento?: { finalidad?: string; otorgado?: string; fchEvento?: string }
  vinculos: { esPaciente: boolean; esMedico: boolean }
}

type UsuarioListResponse = { items: UsuarioRow[]; total: number; page: number; pageSize: number }

type UsuarioFormState = {
  id?: number
  nombre: string
  apellido: string
  sexo: string
  idDocumento: string
  numeroDocumento: string
  fechaNacimiento: string
  correo: string
  telefono: string
  idPais: string
  estado: string
  roles: string[]
  password: string
}

type AgendaOptions = {
  medicos: Array<{ id: number; nombre: string }>
  centros: Array<{ id: number; nombre: string }>
  estados: string[]
  tipos: string[]
  vinculos: Array<{ id: number; medicoId: number; medico: string; centroId: number; centro: string; especialidad: string }>
  defaults?: { intervaloMin?: number; capacidadSlot?: number; duracionRealMin?: number }
}

type AgendaDetail = {
  agenda: {
    idAgenda: number
    fecha: string
    horaInicio: string
    horaFin: string
    tipo: string
    estado: string
    observaciones?: string
    intervalo?: number
    capacidadSlot?: number
    duracionReal?: number
    vinculoId?: number
    medico: string
    centro: string
    especialidad: string
  }
  slots: Array<{ idSlot: number; horaInicio: string; horaFin: string; capacidad: number; ocupados: number; estado: string; citas: number }>
}

type AgendaFormState = {
  vinculoId: string
  fecha: string
  horaInicio: string
  horaFin: string
  tipo: string
  estado: string
  intervalo: string
  capacidad: string
  duracion: string
  observaciones: string
}

const viewConfig = {
  dashboard: { label: "Dashboard" },
  citas: { label: "Gestión de citas" },
  agenda: { label: "Agenda médica" },
  usuarios: { label: "Usuarios y roles" },
  medicos: { label: "Médicos y especialidades" },
  centros: { label: "Centros médicos" },
  catalogos: { label: "Catálogos generales" }
} as const

type ViewKey = keyof typeof viewConfig

const navSections: { title: string; items: ViewKey[] }[] = [
  { title: "Operación", items: ["dashboard", "citas", "agenda"] },
  { title: "Maestros", items: ["usuarios", "medicos", "centros", "catalogos"] }
]

async function fetchJSON<T>(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

export default function AdminDashboard() {
  const [view, setView] = useState<ViewKey>("dashboard")
  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="text-sm font-semibold">PRAXIA</div>
          <p className="text-xs text-slate-400">Panel de administración</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navSections.map(section => (
            <div key={section.title}>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 mb-2">{section.title}</p>
              <div className="space-y-1">
                {section.items.map(item => (
                  <button
                    key={item}
                    onClick={() => setView(item)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      view === item ? "bg-white/15 text-white font-semibold" : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {viewConfig[item].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 text-xs text-slate-400">
          Admin<br />
          Sesión segura · Ley 29733
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Dashboard de administración</p>
            <h1 className="text-lg font-semibold">{viewConfig[view].label}</h1>
            <p className="text-sm text-slate-500">Resumen operativo de hoy y accesos rápidos.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              Sistemas en línea
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Admin Sistema</p>
              <p className="text-sm font-semibold">Rol: ADMIN</p>
            </div>
            <div className="h-11 w-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
              AS
            </div>
          </div>
        </header>
        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          {view === "dashboard" && <DashboardPanel />}
          {view === "citas" && <CitasPanel />}
          {view === "agenda" && <AgendaPanel />}
          {view === "usuarios" && <UsuariosPanel />}
          {view === "medicos" && <MedicosPanel />}
          {view === "centros" && <CentrosPanel />}
          {view === "catalogos" && <CatalogosPanel />}
        </main>
      </div>
    </div>
  )
}

function DashboardPanel() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetchJSON<DashboardPayload>(`${API_BASE}/admin/dashboard`).then(setData).catch(err => setError(err.message))
  }, [])
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <p className="text-sm text-slate-500">Cargando...</p>
  const ocupacion = data.ocupacion.slotsTotales ? Math.round((data.ocupacion.slotsOcupados / data.ocupacion.slotsTotales) * 100) : 0
  const variacion = data.resumen.citasAyer ? Math.round(((data.resumen.citasHoy - data.resumen.citasAyer) / data.resumen.citasAyer) * 100) : 0
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard title="Citas de hoy" value={data.resumen.citasHoy} foot={`${variacion >= 0 ? "+" : ""}${variacion}% vs ayer`} />
        <KpiCard title="Ocupación de agenda" value={`${ocupacion}%`} foot={`Médicos activos: ${data.ocupacion.medicosActivos}`} />
        <KpiCard title="No asistieron" value={data.resumen.noAsistioHoy} foot={`Ayer: ${data.resumen.noAsistioAyer}`} />
      </div>
      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold">Agenda destacada</p>
        {data.agendaDestacada ? (
          <div className="mt-2 text-sm">
            <p className="font-semibold text-slate-900">{data.agendaDestacada.medico}</p>
            <p className="text-slate-500">{data.agendaDestacada.centro}</p>
            <p>{data.agendaDestacada.horaInicio} - {data.agendaDestacada.horaFin}</p>
            <p>Slots: {data.agendaDestacada.slotsReservados}/{data.agendaDestacada.slotsTotales}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No hay agendas activas hoy.</p>
        )}
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold mb-2">Citas del día</p>
          <div className="overflow-x-auto text-sm">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] uppercase text-slate-400">
                  <th className="px-2 py-1">Hora</th>
                  <th className="px-2 py-1">Paciente</th>
                <th className="px-2 py-1">Médico</th>
                  <th className="px-2 py-1">Centro</th>
                  <th className="px-2 py-1">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.citasHoy.length === 0 && <tr><td colSpan={5} className="text-center text-slate-500 py-3">Sin citas registradas.</td></tr>}
                {data.citasHoy.map(cita => (
                  <tr key={cita.id} className="border-t border-slate-100">
                    <td className="px-2 py-1">{cita.hora}</td>
                    <td className="px-2 py-1">{cita.paciente}</td>
                    <td className="px-2 py-1">{cita.medico}</td>
                    <td className="px-2 py-1">{cita.centro}</td>
                    <td className="px-2 py-1"><Estado estado={cita.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold">Alertas y bitácora</p>
          <ul className="text-sm text-slate-600 mt-2 space-y-1">
            <li>Consentimientos pendientes: {data.alertas.consentimientosPendientes}</li>
            {data.alertas.notificaciones.map((msg, idx) => (
              <li key={idx}>"  {msg}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 uppercase mt-4">Bitácora</p>
          <ul className="mt-1 text-xs text-slate-600 space-y-1">
            {data.bitacora.map((log, idx) => (
              <li key={idx}>{log.tipo} • {log.resumen}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

function CitasPanel() {
  const [rows, setRows] = useState<CitaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ paciente: "", estado: "", modalidad: "" })
  const [options, setOptions] = useState<CitaOptions | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<CitaFormState>({ pacienteId: "", slotId: "", motivo: "", estado: "RESERVADA" })
  const [editing, setEditing] = useState<CitaRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    cargar()
    cargarOpciones()
  }, [])

  function cargar(custom?: typeof filters) {
    setLoading(true)
    const data = custom || filters
    const params = new URLSearchParams()
    Object.entries(data).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    fetchJSON<CitaRow[]>(`${API_BASE}/admin/citas?${params.toString()}`)
      .then(setRows)
      .finally(() => setLoading(false))
    if (custom) setFilters(custom)
  }

  function cargarOpciones() {
    fetchJSON<CitaOptions>(`${API_BASE}/admin/citas/opciones`)
      .then(setOptions)
      .catch(() => setOptions(null))
  }

  const estadosDisponibles = options?.estados?.length ? options.estados : ["RESERVADA", "CONFIRMADA", "CANCELADA", "ATENDIDA", "NO_ASISTIO"]

  const slotOptions = useMemo(() => {
    let base = options?.slots ? [...options.slots] : []
    if (editing?.slotId && base.every(slot => slot.id !== editing.slotId)) {
      base.push({
        id: editing.slotId,
        agendaId: editing.agendaId || 0,
        fecha: editing.fecha,
        horaInicio: editing.horaInicio || "",
        horaFin: editing.horaFin || "",
        tipo: editing.modalidad || "",
        medico: editing.medico,
        centro: editing.centro,
        especialidad: editing.especialidad,
        disponibles: 0
      })
    }
    return base.sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`))
  }, [options, editing])

  function abrirNuevo() {
    setEditing(null)
    setForm({ pacienteId: "", slotId: "", motivo: "", estado: estadosDisponibles[0] || "RESERVADA" })
    setError(null)
    setModalOpen(true)
  }

  function abrirEdicion(row: CitaRow) {
    setEditing(row)
    setForm({
      pacienteId: row.pacienteId ? String(row.pacienteId) : "",
      slotId: row.slotId ? String(row.slotId) : "",
      motivo: row.motivo || "",
      estado: row.estado
    })
    setError(null)
    setModalOpen(true)
  }

  function cerrarModal() {
    setModalOpen(false)
    setEditing(null)
    setForm({ pacienteId: "", slotId: "", motivo: "", estado: estadosDisponibles[0] || "RESERVADA" })
    setError(null)
  }

  async function guardarCita(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.pacienteId || !form.slotId) {
      setError("Selecciona paciente y horario.")
      return
    }
    const usuarioId = typeof window !== "undefined" ? Number(localStorage.getItem("userId") || "0") : 0
    if (!usuarioId) {
      setError("No se encontró usuario autenticado.")
      return
    }
    setSaving(true)
    const payload = {
      pacienteId: Number(form.pacienteId),
      slotId: Number(form.slotId),
      motivo: form.motivo,
      estado: form.estado,
      usuarioId
    }
    const url = editing ? `${API_BASE}/admin/citas/${editing.id}` : `${API_BASE}/admin/citas`
    const method = editing ? "PUT" : "POST"
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "No se pudo guardar la cita")
      }
      setMessage(editing ? "Cita actualizada" : "Cita creada")
      cerrarModal()
      cargar()
      cargarOpciones()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la cita")
    } finally {
      setSaving(false)
    }
  }

  async function eliminarCita(row: CitaRow) {
    const usuarioId = typeof window !== "undefined" ? Number(localStorage.getItem("userId") || "0") : 0
    if (!usuarioId) {
      setMessage("No se encontró usuario autenticado.")
      return
    }
    if (!window.confirm(`¿Eliminar la cita de ${row.paciente}?`)) return
    try {
      const res = await fetch(`${API_BASE}/admin/citas/${row.id}?usuarioId=${usuarioId}`, { method: "DELETE" })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "No se pudo eliminar la cita")
      }
      setMessage("Cita cancelada")
      cargar()
      cargarOpciones()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al eliminar la cita")
    }
  }

  const selectedSlot = slotOptions.find(slot => slot.id === Number(form.slotId))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
        <input className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Paciente / documento" value={filters.paciente} onChange={e => setFilters({ ...filters, paciente: e.target.value })} />
        <select className="rounded-lg border border-slate-200 px-3 py-2" value={filters.estado} onChange={e => setFilters({ ...filters, estado: e.target.value })}>
          <option value="">Estado</option>
          {estadosDisponibles.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2" value={filters.modalidad} onChange={e => setFilters({ ...filters, modalidad: e.target.value })}>
          <option value="">Modalidad</option>
          <option value="PRESENCIAL">Presencial</option>
          <option value="VIRTUAL">Virtual</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex gap-2">
          <button className="rounded-full bg-primary text-white px-4 py-1" onClick={() => cargar()}>Buscar</button>
          <button className="rounded-full border border-slate-200 px-4 py-1" onClick={() => { const clean = { paciente: "", estado: "", modalidad: "" }; setFilters(clean); cargar(clean) }}>Limpiar filtros</button>
        </div>
        <button className="rounded-full bg-emerald-600 text-white px-4 py-1" onClick={abrirNuevo}>
          Nueva cita
        </button>
      </div>
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">Buscando citas...</p>
      ) : (
        <div className="overflow-x-auto text-sm">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-400">
                <th className="px-2 py-1">Fecha</th>
                <th className="px-2 py-1">Hora</th>
                <th className="px-2 py-1">Paciente</th>
                <th className="px-2 py-1">Médico</th>
                <th className="px-2 py-1">Centro</th>
                <th className="px-2 py-1">Modalidad</th>
                <th className="px-2 py-1">Pago</th>
                <th className="px-2 py-1">Estado</th>
                <th className="px-2 py-1">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9} className="py-3 text-center text-slate-500">Sin resultados.</td></tr>}
              {rows.map(row => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-2 py-1">{row.fecha}</td>
                  <td className="px-2 py-1">{row.hora}</td>
                  <td className="px-2 py-1">{row.paciente}</td>
                  <td className="px-2 py-1">{row.medico}</td>
                  <td className="px-2 py-1">{row.centro}</td>
                  <td className="px-2 py-1">{row.modalidad || "—"}</td>
                  <td className="px-2 py-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      row.estadoPago === "PAGADO" ? "bg-emerald-50 text-emerald-700" : row.estadoPago === "REEMBOLSADO" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {row.estadoPago || "PENDIENTE"}
                    </span>
                  </td>
                  <td className="px-2 py-1"><Estado estado={row.estado} /></td>
                  <td className="px-2 py-1 space-x-2">
                    <button className="text-xs text-primary font-semibold" onClick={() => abrirEdicion(row)}>Editar</button>
                    <button className="text-xs text-rose-600 font-semibold" onClick={() => eliminarCita(row)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">{editing ? "Editar cita" : "Nueva cita"}</p>
              <button className="text-slate-500 hover:text-slate-700" onClick={cerrarModal} type="button">×</button>
            </div>
            <form className="space-y-3 text-sm" onSubmit={guardarCita}>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Paciente</label>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.pacienteId} onChange={e => setForm({ ...form, pacienteId: e.target.value })}>
                  <option value="">Selecciona paciente</option>
                  {options?.pacientes?.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} · {p.documento}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Horario</label>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.slotId} onChange={e => setForm({ ...form, slotId: e.target.value })}>
                  <option value="">Selecciona horario</option>
                  {slotOptions.map(slot => (
                    <option key={slot.id} value={slot.id}>
                      {slot.fecha} · {slot.horaInicio}-{slot.horaFin} · {slot.medico}
                    </option>
                  ))}
                </select>
                {selectedSlot && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-600">
                    <p>{selectedSlot.fecha} · {selectedSlot.horaInicio} - {selectedSlot.horaFin}</p>
                    <p>{selectedSlot.medico} · {selectedSlot.centro}</p>
                    <p>{selectedSlot.especialidad} · Cupos disponibles: {selectedSlot.disponibles}</p>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Motivo</label>
                <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2" rows={2} value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} placeholder="Motivo u observación" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Estado</label>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                  {estadosDisponibles.map(est => (
                    <option key={est} value={est}>{est}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-full border border-slate-200 px-4 py-1" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="rounded-full bg-primary text-white px-4 py-1 disabled:opacity-50" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cita"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function AgendaPanel() {
  const [rows, setRows] = useState<AgendaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ medicoId: "", centroId: "", estado: "", tipo: "", desde: "", hasta: "" })
  const [options, setOptions] = useState<AgendaOptions | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [agendaModalOpen, setAgendaModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detail, setDetail] = useState<AgendaDetail | null>(null)
  const [form, setForm] = useState<AgendaFormState>({
    vinculoId: "",
    fecha: "",
    horaInicio: "",
    horaFin: "",
    tipo: "",
    estado: "",
    intervalo: "",
    capacidad: "",
    duracion: "",
    observaciones: ""
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    cargarAgendas()
    fetchJSON<AgendaOptions>(`${API_BASE}/admin/agendas/opciones`).then(setOptions).catch(() => setOptions(null))
  }, [])

  useEffect(() => {
    if (!agendaModalOpen && options && !form.vinculoId && !form.fecha && !form.horaInicio) {
      setForm(buildDefaultForm())
    }
  }, [options, agendaModalOpen])

  function cargarAgendas(custom?: typeof filters) {
    const data = custom || filters
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(data).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const query = params.toString()
    const url = query ? `${API_BASE}/admin/agendas?${query}` : `${API_BASE}/admin/agendas`
    fetchJSON<AgendaRow[]>(url)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
    if (custom) setFilters(custom)
  }

  function buildDefaultForm(): AgendaFormState {
    return {
      vinculoId: "",
      fecha: "",
      horaInicio: "",
      horaFin: "",
      tipo: options?.tipos?.[0] || "",
      estado: options?.estados?.[0] || "PLANIFICADA",
      intervalo: String(options?.defaults?.intervaloMin ?? 20),
      capacidad: String(options?.defaults?.capacidadSlot ?? 1),
      duracion: String(options?.defaults?.duracionRealMin ?? 20),
      observaciones: ""
    }
  }

  function abrirNuevaAgenda() {
    setEditingId(null)
    setForm(buildDefaultForm())
    setFormError(null)
    setAgendaModalOpen(true)
  }

  async function abrirEdicion(row: AgendaRow) {
    try {
      const data = await fetchJSON<AgendaDetail>(`${API_BASE}/admin/agendas/${row.idAgenda}`)
      const ag = data.agenda
      setForm({
        vinculoId: ag.vinculoId ? String(ag.vinculoId) : "",
        fecha: ag.fecha || "",
        horaInicio: ag.horaInicio || "",
        horaFin: ag.horaFin || "",
        tipo: ag.tipo || "",
        estado: ag.estado || "",
        intervalo: ag.intervalo != null ? String(ag.intervalo) : String(options?.defaults?.intervaloMin ?? 20),
        capacidad: ag.capacidadSlot != null ? String(ag.capacidadSlot) : String(options?.defaults?.capacidadSlot ?? 1),
        duracion: ag.duracionReal != null ? String(ag.duracionReal) : String(options?.defaults?.duracionRealMin ?? 20),
        observaciones: ag.observaciones || ""
      })
      setEditingId(row.idAgenda)
      setFormError(null)
      setAgendaModalOpen(true)
    } catch (err) {
      setMessage("No se pudo cargar la agenda para edición")
    }
  }

  async function verDetalle(row: AgendaRow) {
    setDetail(null)
    setDetailModalOpen(true)
    try {
      const det = await fetchJSON<AgendaDetail>(`${API_BASE}/admin/agendas/${row.idAgenda}`)
      setDetail(det)
    } catch (err) {
      setMessage("No se pudo cargar el detalle de la agenda")
      setDetailModalOpen(false)
    }
  }

  async function guardarAgenda(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    if (!form.vinculoId || !form.fecha || !form.horaInicio || !form.horaFin) {
      setFormError("Completa los campos obligatorios.")
      return
    }
    const usuarioId = typeof window !== "undefined" ? Number(localStorage.getItem("userId") || "0") : 0
    if (!usuarioId) {
      setFormError("No se encontró el usuario autenticado.")
      return
    }
    setSaving(true)
    const payload: Record<string, unknown> = {
      vinculoId: Number(form.vinculoId),
      fecha: form.fecha,
      horaInicio: form.horaInicio,
      horaFin: form.horaFin,
      tipoAgenda: form.tipo,
      estadoAgenda: form.estado,
      intervaloMin: form.intervalo ? Number(form.intervalo) : undefined,
      capacidadSlot: form.capacidad ? Number(form.capacidad) : undefined,
      duracionRealMin: form.duracion ? Number(form.duracion) : undefined,
      observaciones: form.observaciones,
      usuarioId
    }
    const url = editingId ? `${API_BASE}/admin/agendas/${editingId}` : `${API_BASE}/admin/agendas`
    const method = editingId ? "PUT" : "POST"
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "No se pudo guardar la agenda")
      }
      setMessage(editingId ? "Agenda actualizada" : "Agenda creada")
      cerrarAgendaModal()
      cargarAgendas()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar la agenda")
    } finally {
      setSaving(false)
    }
  }

  function cerrarAgendaModal() {
    setAgendaModalOpen(false)
    setEditingId(null)
    setForm(buildDefaultForm())
  }

  async function handleGenerateSlots(row: AgendaRow) {
    const usuarioId = typeof window !== "undefined" ? Number(localStorage.getItem("userId") || "0") : 0
    if (!usuarioId) {
      setMessage("No se encontró el usuario autenticado.")
      return
    }
    if (!window.confirm(`¿Generar slots para la agenda del ${row.fecha}?`)) return
    try {
      const res = await fetch(`${API_BASE}/admin/agendas/${row.idAgenda}/generar-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, nuevoEstado: row.estado === "PLANIFICADA" ? "ACTIVA" : row.estado })
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "No se pudo generar los slots")
      }
      setMessage("Slots generados correctamente")
      cargarAgendas()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al generar los slots")
    }
  }

  async function handleChangeEstado(row: AgendaRow, nuevoEstado: string) {
    const usuarioId = typeof window !== "undefined" ? Number(localStorage.getItem("userId") || "0") : 0
    if (!usuarioId) {
      setMessage("No se encontró el usuario autenticado.")
      return
    }
    if (!window.confirm(`¿Cambiar el estado de la agenda a ${nuevoEstado}?`)) return
    try {
      const res = await fetch(`${API_BASE}/admin/agendas/${row.idAgenda}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nuevoEstado, usuarioId })
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "No se pudo actualizar el estado")
      }
      setMessage(`Agenda ${nuevoEstado.toLowerCase()}`)
      cargarAgendas()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al cambiar el estado de la agenda")
    }
  }

  const estadosDisponibles = options?.estados || ["PLANIFICADA", "ACTIVA", "INHABILITADA"]
  const tiposDisponibles = options?.tipos || ["PUNTUAL", "RECURRENTE"]

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
        <select className="rounded-lg border border-slate-200 px-3 py-2" value={filters.medicoId} onChange={e => setFilters({ ...filters, medicoId: e.target.value })}>
          <option value="">Médico</option>
          {options?.medicos?.map(m => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2" value={filters.centroId} onChange={e => setFilters({ ...filters, centroId: e.target.value })}>
          <option value="">Centro</option>
          {options?.centros?.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2" value={filters.estado} onChange={e => setFilters({ ...filters, estado: e.target.value })}>
          <option value="">Estado</option>
          {estadosDisponibles.map(est => (
            <option key={est} value={est}>{est}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
        <select className="rounded-lg border border-slate-200 px-3 py-2" value={filters.tipo} onChange={e => setFilters({ ...filters, tipo: e.target.value })}>
          <option value="">Tipo</option>
          {tiposDisponibles.map(tp => (
            <option key={tp} value={tp}>{tp}</option>
          ))}
        </select>
        <input type="date" className="rounded-lg border border-slate-200 px-3 py-2" value={filters.desde} onChange={e => setFilters({ ...filters, desde: e.target.value })} />
        <input type="date" className="rounded-lg border border-slate-200 px-3 py-2" value={filters.hasta} onChange={e => setFilters({ ...filters, hasta: e.target.value })} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex gap-2">
          <button className="rounded-full bg-primary text-white px-4 py-1" onClick={() => cargarAgendas()}>Buscar</button>
          <button className="rounded-full border border-slate-200 px-4 py-1" onClick={() => { const clean = { medicoId: "", centroId: "", estado: "", tipo: "", desde: "", hasta: "" }; setFilters(clean); cargarAgendas(clean) }}>Limpiar</button>
        </div>
        <button className="rounded-full bg-emerald-600 text-white px-4 py-1" onClick={abrirNuevaAgenda}>
          Nueva agenda
        </button>
      </div>
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">Cargando agendas...</p>
      ) : (
        <div className="overflow-x-auto text-sm">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-400">
                <th className="px-2 py-1">Fecha</th>
                <th className="px-2 py-1">Horario</th>
                <th className="px-2 py-1">Médico</th>
                <th className="px-2 py-1">Centro</th>
                <th className="px-2 py-1">Tipo</th>
                <th className="px-2 py-1">Estado</th>
                <th className="px-2 py-1">Slots</th>
                <th className="px-2 py-1">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="py-3 text-center text-slate-500">No hay agendas registradas.</td></tr>}
              {rows.map(row => (
                <tr key={row.idAgenda} className="border-t border-slate-100">
                  <td className="px-2 py-1">{row.fecha}</td>
                  <td className="px-2 py-1">{row.horaInicio} - {row.horaFin}</td>
                  <td className="px-2 py-1">{row.medico || "—"}</td>
                  <td className="px-2 py-1">{row.centro || "—"}</td>
                  <td className="px-2 py-1">{row.tipo}</td>
                  <td className="px-2 py-1"><Estado estado={row.estado} /></td>
                  <td className="px-2 py-1">{row.slotsOcupados}/{row.slotsTotales}</td>
                  <td className="px-2 py-1 space-x-2">
                    <button className="text-xs text-primary font-semibold" onClick={() => verDetalle(row)}>Ver</button>
                    <button className="text-xs text-slate-600 font-semibold" onClick={() => abrirEdicion(row)}>Editar</button>
                    {row.slotsTotales === 0 && (
                      <button className="text-xs text-emerald-700 font-semibold" onClick={() => handleGenerateSlots(row)}>Generar slots</button>
                    )}
                    {row.estado === "INHABILITADA" ? (
                      <button className="text-xs text-emerald-600 font-semibold" onClick={() => handleChangeEstado(row, "ACTIVA")}>Reactivar</button>
                    ) : (
                      <button className="text-xs text-rose-600 font-semibold" onClick={() => handleChangeEstado(row, "INHABILITADA")}>Inhabilitar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {agendaModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">{editingId ? "Editar agenda" : "Nueva agenda"}</p>
              <button className="text-slate-500 hover:text-slate-700" onClick={cerrarAgendaModal} type="button">×</button>
            </div>
            <form className="space-y-3" onSubmit={guardarAgenda}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Vínculo médico-centro</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.vinculoId} onChange={e => setForm({ ...form, vinculoId: e.target.value })}>
                    <option value="">Selecciona una opción</option>
                    {options?.vinculos?.map(v => (
                      <option key={v.id} value={v.id}>{v.medico} · {v.centro} · {v.especialidad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Fecha</label>
                  <input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Hora inicio</label>
                  <input type="time" className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.horaInicio} onChange={e => setForm({ ...form, horaInicio: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Hora fin</label>
                  <input type="time" className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.horaFin} onChange={e => setForm({ ...form, horaFin: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Tipo</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    {tiposDisponibles.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Estado</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    {estadosDisponibles.map(est => <option key={est} value={est}>{est}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Intervalo (min)</label>
                  <input type="number" min={5} className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.intervalo} onChange={e => setForm({ ...form, intervalo: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Capacidad por slot</label>
                  <input type="number" min={1} className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.capacidad} onChange={e => setForm({ ...form, capacidad: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Duración real (min)</label>
                  <input type="number" min={5} className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.duracion} onChange={e => setForm({ ...form, duracion: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Observaciones</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="(Opcional)" />
                </div>
              </div>
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-full border border-slate-200 px-4 py-1" onClick={cerrarAgendaModal}>Cancelar</button>
                <button type="submit" className="rounded-full bg-primary text-white px-4 py-1 disabled:opacity-50" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar agenda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">Detalle de agenda</p>
              <button className="text-slate-500 hover:text-slate-700" onClick={() => { setDetailModalOpen(false); setDetail(null) }} type="button">×</button>
            </div>
            {detail ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Médico</p>
                    <p className="font-semibold text-slate-900">{detail.agenda.medico}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Centro</p>
                    <p className="font-semibold text-slate-900">{detail.agenda.centro}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Especialidad</p>
                    <p className="font-semibold text-slate-900">{detail.agenda.especialidad}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Horario</p>
                    <p className="font-semibold text-slate-900">{detail.agenda.fecha} · {detail.agenda.horaInicio} - {detail.agenda.horaFin}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">Intervalo: {detail.agenda.intervalo ?? "-"} min · Capacidad: {detail.agenda.capacidadSlot ?? "-"} pacientes</p>
                <p className="text-xs text-slate-500">Observaciones: {detail.agenda.observaciones || "—"}</p>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[10px] uppercase text-slate-400">
                        <th className="px-2 py-1">Slot</th>
                        <th className="px-2 py-1">Capacidad</th>
                        <th className="px-2 py-1">Ocupados</th>
                        <th className="px-2 py-1">Estado</th>
                        <th className="px-2 py-1">Citas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.slots.length === 0 && <tr><td colSpan={5} className="text-center py-3 text-slate-500">Aún no se generan slots.</td></tr>}
                      {detail.slots.map(slot => (
                        <tr key={slot.idSlot} className="border-t border-slate-100">
                          <td className="px-2 py-1">{slot.horaInicio} - {slot.horaFin}</td>
                          <td className="px-2 py-1">{slot.capacidad}</td>
                          <td className="px-2 py-1">{slot.ocupados}</td>
                          <td className="px-2 py-1"><Estado estado={slot.estado} /></td>
                          <td className="px-2 py-1">{slot.citas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Cargando detalle...</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function UsuariosPanel() {
  const [rows, setRows] = useState<UsuarioRow[]>([])
  const [filters, setFilters] = useState({ q: "", estado: "", rol: "", tipo: "" })
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, size: 10, total: 0 })
  const [options, setOptions] = useState<UsuarioOpciones | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [form, setForm] = useState<UsuarioFormState>({
    nombre: "",
    apellido: "",
    sexo: "M",
    idDocumento: "",
    numeroDocumento: "",
    fechaNacimiento: "",
    correo: "",
    telefono: "",
    idPais: "",
    estado: "",
    roles: [],
    password: ""
  })
  const [detail, setDetail] = useState<UsuarioDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchUsuarios(1)
    fetchJSON<UsuarioOpciones>(`${API_BASE}/admin/usuarios/opciones`).then(setOptions).catch(() => setOptions(null))
  }, [])

  function fetchUsuarios(page = pagination.page) {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.q) params.set("q", filters.q)
    if (filters.estado) params.set("estado", filters.estado)
    if (filters.rol) params.set("rol", filters.rol)
    if (filters.tipo) params.set("tipo", filters.tipo)
    params.set("page", String(page))
    params.set("size", String(pagination.size))
    fetchJSON<UsuarioListResponse>(`${API_BASE}/admin/usuarios?${params.toString()}`)
      .then(res => {
        setRows(res.items as UsuarioRow[])
        setPagination({ page: res.page, size: res.pageSize, total: res.total })
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  function openCreate() {
    setModalMode("create")
    setForm({
      nombre: "",
      apellido: "",
      sexo: "M",
      idDocumento: options?.documentos?.[0]?.id ? String(options.documentos[0].id) : "",
      numeroDocumento: "",
      fechaNacimiento: "",
      correo: "",
      telefono: "",
      idPais: options?.paises?.[0]?.id ? String(options.paises[0].id) : "",
      estado: options?.estados?.[0] || "ACTIVO",
      roles: [],
      password: ""
    })
    setDetail(null)
    setShowModal(true)
  }

  async function openDetail(id: number) {
    setModalMode("edit")
    setDetail(null)
    setShowModal(true)
    setDetailLoading(true)
    try {
      const data = await fetchJSON<UsuarioDetail>(`${API_BASE}/admin/usuarios/${id}`)
      setDetail(data)
      setForm({
        id,
        nombre: data.usuario.nombre || "",
        apellido: data.usuario.apellido || "",
        sexo: data.usuario.sexo || "M",
        idDocumento: data.usuario.idDocumento ? String(data.usuario.idDocumento) : "",
        numeroDocumento: data.usuario.numeroDocumento || "",
        fechaNacimiento: data.usuario.fechaNacimiento || "",
        correo: data.usuario.correo || "",
        telefono: data.usuario.telefono || "",
        idPais: data.usuario.idPais ? String(data.usuario.idPais) : "",
        estado: data.usuario.estado || "",
        roles: data.roles || [],
        password: ""
      })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo cargar el usuario")
      setShowModal(false)
    } finally {
      setDetailLoading(false)
    }
  }

  async function guardarUsuario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const adminId = typeof window !== "undefined" ? Number(localStorage.getItem("userId") || "0") : 0
    if (!adminId) {
      setMessage("No se encontró la sesión del administrador.")
      return
    }
    const payload = {
      nombre: form.nombre,
      apellido: form.apellido,
      sexo: form.sexo || null,
      idDocumento: form.idDocumento ? Number(form.idDocumento) : null,
      numeroDocumento: form.numeroDocumento,
      fechaNacimiento: form.fechaNacimiento || null,
      correo: form.correo,
      telefono: form.telefono,
      idPais: form.idPais ? Number(form.idPais) : null,
      estado: form.estado,
      roles: form.roles,
      password: form.password,
      adminId
    }
    try {
      if (modalMode === "create") {
        await fetch(`${API_BASE}/admin/usuarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).then(res => {
          if (!res.ok) throw new Error(res.statusText)
          return res.json()
        })
      } else if (form.id) {
        const { roles, password, ...rest } = payload
        await fetch(`${API_BASE}/admin/usuarios/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rest)
        }).then(res => { if (!res.ok) throw new Error(res.statusText) })
        await fetch(`${API_BASE}/admin/usuarios/${form.id}/roles`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: form.roles, adminId })
        }).then(res => { if (!res.ok) throw new Error(res.statusText) })
      }
      setMessage("Usuario guardado correctamente.")
      setShowModal(false)
      fetchUsuarios()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo guardar el usuario")
    }
  }

  async function cambiarEstado(newState: string) {
    if (!form.id) return
    const adminId = typeof window !== "undefined" ? Number(localStorage.getItem("userId") || "0") : 0
    if (!adminId) return
    try {
      await fetch(`${API_BASE}/admin/usuarios/${form.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nuevoEstado: newState, adminId })
      }).then(res => { if (!res.ok) throw new Error(res.statusText) })
      setForm(prev => ({ ...prev, estado: newState }))
      setMessage("Estado actualizado")
      fetchUsuarios(pagination.page)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo actualizar el estado")
    }
  }

  async function resetPassword() {
    if (!form.id) return
    const adminId = typeof window !== "undefined" ? Number(localStorage.getItem("userId") || "0") : 0
    try {
      const res = await fetch(`${API_BASE}/admin/usuarios/${form.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setMessage(`Contraseña temporal: ${data.tempPassword}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al restablecer la contraseña")
    }
  }

  function closeModal() {
    setShowModal(false)
    setDetail(null)
    setForm(prev => ({ ...prev, password: "" }))
  }

  const pageCount = Math.ceil(pagination.total / pagination.size)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="text-sm font-semibold">Usuarios del sistema</p>
        <button className="rounded-full bg-primary text-white px-4 py-1 text-sm" onClick={openCreate}>Nuevo usuario</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
        <input className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Buscar nombre, documento, correo" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} />
        <select className="rounded-lg border border-slate-200 px-3 py-2" value={filters.rol} onChange={e => setFilters({ ...filters, rol: e.target.value })}>
          <option value="">Rol</option>
          {options?.roles?.map(rol => <option key={rol.id} value={rol.nombre}>{rol.nombre}</option>)}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2" value={filters.estado} onChange={e => setFilters({ ...filters, estado: e.target.value })}>
          <option value="">Estado</option>
          {options?.estados?.map(est => <option key={est} value={est}>{est}</option>)}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2" value={filters.tipo} onChange={e => setFilters({ ...filters, tipo: e.target.value })}>
          <option value="">Tipo</option>
          <option value="PACIENTE">Paciente</option>
          <option value="MEDICO">Médico</option>
        </select>
      </div>
      <div className="flex gap-2 text-sm">
        <button className="rounded-full bg-primary text-white px-4 py-1" onClick={() => fetchUsuarios(1)}>Buscar</button>
        <button className="rounded-full border border-slate-200 px-4 py-1" onClick={() => { const clean = { q: "", estado: "", rol: "", tipo: "" }; setFilters(clean); fetchUsuarios(1) }}>Limpiar</button>
      </div>
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      <div className="overflow-x-auto text-sm">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="px-2 py-1">Nombre</th>
              <th className="px-2 py-1">Documento</th>
              <th className="px-2 py-1">Correo</th>
              <th className="px-2 py-1">Roles</th>
              <th className="px-2 py-1">Tipo</th>
              <th className="px-2 py-1">Verificación</th>
              <th className="px-2 py-1">Estado</th>
              <th className="px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-3 text-slate-500">{loading ? "Cargando usuarios..." : "No hay usuarios"}</td></tr>
            )}
            {rows.map(row => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-2 py-1">
                  <p className="font-medium">{row.nombre}</p>
                  <p className="text-xs text-slate-500">{row.telefono || ""}</p>
                </td>
                <td className="px-2 py-1">{row.documento}</td>
                <td className="px-2 py-1">{row.correo}</td>
                <td className="px-2 py-1 text-xs text-slate-500">{row.roles?.join(", ") || "—"}</td>
                <td className="px-2 py-1 text-xs text-slate-600">{row.tipo?.length ? row.tipo.join(" / ") : "—"}</td>
                <td className="px-2 py-1 text-xs text-slate-500 space-y-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${row.correoVerificado ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>Correo {row.correoVerificado ? "✓" : "•"}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${row.telefonoVerificado ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>Teléfono {row.telefonoVerificado ? "✓" : "•"}</span>
                </td>
                <td className="px-2 py-1"><Estado estado={row.estado} /></td>
                <td className="px-2 py-1 space-x-2">
                  <button className="text-xs text-primary font-semibold" onClick={() => openDetail(row.id)}>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-3 text-xs text-slate-500">
          <span>Página {pagination.page} de {pageCount}</span>
          <div className="space-x-2">
            <button className="px-2 py-1 border rounded-lg" disabled={pagination.page === 1} onClick={() => fetchUsuarios(pagination.page - 1)}>Anterior</button>
            <button className="px-2 py-1 border rounded-lg" disabled={pagination.page === pageCount} onClick={() => fetchUsuarios(pagination.page + 1)}>Siguiente</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">{modalMode === "create" ? "Nuevo usuario" : "Editar usuario"}</p>
              <button className="text-slate-500 hover:text-slate-700" onClick={closeModal}>×</button>
            </div>
            <form className="space-y-4" onSubmit={guardarUsuario}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Nombre</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Apellido</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Sexo</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.sexo} onChange={e => setForm({ ...form, sexo: e.target.value })}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="X">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Tipo documento</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.idDocumento} onChange={e => setForm({ ...form, idDocumento: e.target.value })}>
                    {options?.documentos?.map(doc => <option key={doc.id} value={doc.id}>{doc.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">N° documento</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.numeroDocumento} onChange={e => setForm({ ...form, numeroDocumento: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Fecha nacimiento</label>
                  <input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.fechaNacimiento} onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Correo</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Teléfono</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">País</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.idPais} onChange={e => setForm({ ...form, idPais: e.target.value })}>
                    {options?.paises?.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Estado</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    {options?.estados?.map(est => <option key={est} value={est}>{est}</option>)}
                  </select>
                </div>
                {modalMode === "create" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Contraseña temporal</label>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Genera una contraseña temporal" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {options?.roles?.map(role => {
                    const checked = form.roles.includes(role.nombre)
                    return (
                      <label key={role.id} className={`px-3 py-1 rounded-full border text-xs cursor-pointer ${checked ? "bg-primary text-white border-primary" : "text-slate-600 border-slate-200"}`}>
                        <input type="checkbox" className="hidden" checked={checked} onChange={() => {
                          setForm(prev => ({
                            ...prev,
                            roles: checked ? prev.roles.filter(r => r !== role.nombre) : [...prev.roles, role.nombre]
                          }))
                        }} />
                        {role.nombre}
                      </label>
                    )
                  })}
                </div>
              </div>
              {modalMode === "edit" && detail && (
                <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600 space-y-2">
                  <div className="flex gap-3">
                    <span>Paciente: {detail.vinculos.esPaciente ? "Sí" : "No"}</span>
                    <span>Médico: {detail.vinculos.esMedico ? "Sí" : "No"}</span>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Verificaciones recientes</p>
                    <ul className="space-y-1">
                      {detail.verificaciones && detail.verificaciones.length > 0 ? (
                        detail.verificaciones.map((v, idx) => (
                          <li key={idx}>{v.canal}: {v.destino} · {v.usado ? "Usado" : "Pendiente"} · {v.fchEmitido || "—"}</li>
                        ))
                      ) : (
                        <li>No hay verificaciones registradas.</li>
                      )}
                    </ul>
                  </div>
                  {detail.consentimiento && (
                    <div>
                      <p className="font-semibold mb-1">Consentimiento</p>
                      <p>{detail.consentimiento.otorgado} · {detail.consentimiento.finalidad} · {detail.consentimiento.fchEvento}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between items-center">
                {modalMode === "edit" && (
                  <div className="flex gap-2">
                    <select className="rounded-lg border border-slate-200 px-3 py-2 text-xs" value={form.estado} onChange={e => cambiarEstado(e.target.value)}>
                      {options?.estados?.map(est => <option key={est} value={est}>{est}</option>)}
                    </select>
                    <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs" onClick={resetPassword}>Resetear contraseña</button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" className="rounded-full border border-slate-200 px-4 py-1" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="rounded-full bg-primary text-white px-4 py-1">{modalMode === "create" ? "Crear" : "Guardar"}</button>
                </div>
              </div>
            </form>
            {detailLoading && <p className="text-xs text-slate-500">Cargando información...</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function MedicosPanel() {
  const [rows, setRows] = useState<MedicoRow[]>([])
  useEffect(() => {
    fetchJSON<MedicoRow[]>(`${API_BASE}/admin/medicos`).then(setRows)
  }, [])
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {rows.map(row => (
        <div key={row.id} className="bg-white rounded-xl border border-slate-200 p-4 text-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">{row.nombre}</p>
            <Estado estado={row.estado} />
          </div>
          <p className="text-xs text-slate-500">CMP: {row.cmp || " "}</p>
          <p className="text-xs text-slate-500">{row.perfil || "Sin perfil"}</p>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-slate-500">No hay médicos registrados.</p>}
    </div>
  )
}

function CentrosPanel() {
  const [rows, setRows] = useState<CentroRow[]>([])
  useEffect(() => {
    fetchJSON<CentroRow[]>(`${API_BASE}/admin/centros`).then(setRows)
  }, [])
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-semibold mb-2">Centros médicos</p>
      <div className="overflow-x-auto text-sm">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="px-2 py-1">Centro</th>
              <th className="px-2 py-1">Distrito</th>
              <th className="px-2 py-1">Provincia</th>
              <th className="px-2 py-1">Departamento</th>
              <th className="px-2 py-1">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-2 py-1">{row.nombre}</td>
                <td className="px-2 py-1">{row.distrito}</td>
                <td className="px-2 py-1">{row.provincia}</td>
                <td className="px-2 py-1">{row.departamento}</td>
                <td className="px-2 py-1"><Estado estado={row.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CatalogosPanel() {
  const [data, setData] = useState<CatalogoResumen | null>(null)
  useEffect(() => {
    fetchJSON<CatalogoResumen>(`${API_BASE}/admin/catalogos/resumen`).then(setData)
  }, [])
  if (!data) return <p className="text-sm text-slate-500">Cargando catálogos...</p>
  const bloques = [
    { label: "Documento", value: data.documentos.join(", ") },
    { label: "Estado usuario", value: data.estadoUsuario.join(", ") },
    { label: "Parentesco", value: data.parentesco.join(", ") },
    { label: "Monedas", value: data.monedas.join(", ") },
    { label: "Especialidades", value: data.especialidades.join(", ") },
    { label: "Estados de cita", value: data.estadosCita.join(", ") }
  ]
  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold mb-2">Catálogos principales</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {bloques.map(item => (
            <div key={item.label} className="border border-slate-200 rounded-lg p-3">
              <p className="font-semibold text-slate-700">{item.label}</p>
              <p className="text-slate-500">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold mb-2">Parámetros de negocio</p>
        <ul className="text-xs text-slate-600 list-disc ml-5 space-y-1">
          {data.parametros.map(param => (
            <li key={param.codigo}>
              <strong>{param.codigo}</strong>: {param.descripcion} – <span>{param.valor ?? "-"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function KpiCard({ title, value, foot }: { title: string; value: number | string; foot: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{title}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-2">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{foot}</p>
    </div>
  )
}

function Estado({ estado }: { estado: string }) {
  const palette: Record<string, string> = {
    RESERVADA: "bg-amber-50 text-amber-700",
    CONFIRMADA: "bg-emerald-50 text-emerald-700",
    CANCELADA: "bg-rose-50 text-rose-700",
    ATENDIDA: "bg-slate-100 text-slate-700"
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${palette[estado] || "bg-slate-100 text-slate-600"}`}>{estado}</span>
}


