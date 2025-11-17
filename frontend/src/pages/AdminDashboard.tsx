import { useEffect, useMemo, useState } from "react"

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

type CitaRow = { id: number; fecha: string; hora: string; paciente: string; medico: string; especialidad: string; centro: string; estado: string }

type AgendaRow = { idAgenda: number; fecha: string; horaInicio: string; horaFin: string; tipo: string; estado: string; slotsTotales: number; slotsOcupados: number }

type UsuarioRow = { id: number; nombre: string; documento: string; roles: string[]; estado: string }

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

const views = [
  { key: "dashboard", label: "Dashboard" },
  { key: "citas", label: "Citas" },
  { key: "agenda", label: "Agenda" },
  { key: "usuarios", label: "Usuarios" },
  { key: "medicos", label: "Médicos" },
  { key: "centros", label: "Centros" },
  { key: "catalogos", label: "Catálogos" }
] as const

type ViewKey = (typeof views)[number]["key"]

async function fetchJSON<T>(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

export default function AdminDashboard() {
  const [view, setView] = useState<ViewKey>("dashboard")
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Praxia</p>
          <h1 className="text-lg font-semibold">Panel de administración</h1>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          {views.map(item => (
            <button key={item.key} className={`px-3 py-1 rounded-full border ${view === item.key ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600"}`} onClick={() => setView(item.key)}>
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="p-6 space-y-6">
        {view === "dashboard" && <DashboardPanel />}
        {view === "citas" && <CitasPanel />}
        {view === "agenda" && <AgendaPanel />}
        {view === "usuarios" && <UsuariosPanel />}
        {view === "medicos" && <MedicosPanel />}
        {view === "centros" && <CentrosPanel />}
        {view === "catalogos" && <CatalogosPanel />}
      </main>
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
              <li key={idx}>• {msg}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 uppercase mt-4">Bitácora</p>
          <ul className="mt-1 text-xs text-slate-600 space-y-1">
            {data.bitacora.map((log, idx) => (
              <li key={idx}>{log.tipo} · {log.resumen}</li>
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
  useEffect(() => {
    cargar()
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
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
        <input className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Paciente / documento" value={filters.paciente} onChange={e => setFilters({ ...filters, paciente: e.target.value })} />
        <select className="rounded-lg border border-slate-200 px-3 py-2" value={filters.estado} onChange={e => setFilters({ ...filters, estado: e.target.value })}>
          <option value="">Estado</option>
          {"RESERVADA,CONFIRMADA,CANCELADA,ATENDIDA,NO_ASISTIO".split(",").map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2" value={filters.modalidad} onChange={e => setFilters({ ...filters, modalidad: e.target.value })}>
          <option value="">Modalidad</option>
          <option value="PRESENCIAL">Presencial</option>
          <option value="VIRTUAL">Virtual</option>
        </select>
      </div>
      <div className="flex gap-2 text-sm">
        <button className="rounded-full bg-primary text-white px-4 py-1" onClick={() => cargar()}>Buscar</button>
        <button className="rounded-full border border-slate-200 px-4 py-1" onClick={() => { const clean = { paciente: "", estado: "", modalidad: "" }; setFilters(clean); cargar(clean) }}>Limpiar filtros</button>
      </div>
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
                <th className="px-2 py-1">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="py-3 text-center text-slate-500">Sin resultados.</td></tr>}
              {rows.map(row => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-2 py-1">{row.fecha}</td>
                  <td className="px-2 py-1">{row.hora}</td>
                  <td className="px-2 py-1">{row.paciente}</td>
                  <td className="px-2 py-1">{row.medico}</td>
                  <td className="px-2 py-1">{row.centro}</td>
                  <td className="px-2 py-1"><Estado estado={row.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AgendaPanel() {
  const [rows, setRows] = useState<AgendaRow[]>([])
  useEffect(() => {
    fetchJSON<AgendaRow[]>(`${API_BASE}/admin/agendas`).then(setRows)
  }, [])
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-semibold mb-2">Agendas configuradas</p>
      <div className="overflow-x-auto text-sm">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="px-2 py-1">Fecha</th>
              <th className="px-2 py-1">Horario</th>
              <th className="px-2 py-1">Tipo</th>
              <th className="px-2 py-1">Estado</th>
              <th className="px-2 py-1">Slots</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="py-3 text-center text-slate-500">No hay agendas registradas.</td></tr>}
            {rows.map(row => (
              <tr key={row.idAgenda} className="border-t border-slate-100">
                <td className="px-2 py-1">{row.fecha}</td>
                <td className="px-2 py-1">{row.horaInicio} - {row.horaFin}</td>
                <td className="px-2 py-1">{row.tipo}</td>
                <td className="px-2 py-1"><Estado estado={row.estado} /></td>
                <td className="px-2 py-1">{row.slotsOcupados}/{row.slotsTotales}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UsuariosPanel() {
  const [rows, setRows] = useState<UsuarioRow[]>([])
  useEffect(() => {
    fetchJSON<UsuarioRow[]>(`${API_BASE}/admin/usuarios`).then(setRows)
  }, [])
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-semibold mb-2">Usuarios del sistema</p>
      <div className="overflow-x-auto text-sm">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="px-2 py-1">Nombre</th>
              <th className="px-2 py-1">Documento</th>
              <th className="px-2 py-1">Roles</th>
              <th className="px-2 py-1">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-2 py-1">{row.nombre}</td>
                <td className="px-2 py-1">{row.documento}</td>
                <td className="px-2 py-1 text-xs text-slate-500">{row.roles?.join(", ")}</td>
                <td className="px-2 py-1"><Estado estado={row.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
          <p className="text-xs text-slate-500">CMP: {row.cmp || "—"}</p>
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
              <strong>{param.codigo}</strong>: {param.descripcion} → <span>{param.valor ?? "—"}</span>
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
