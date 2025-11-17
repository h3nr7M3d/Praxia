import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, User as UserIcon, LogOut } from 'lucide-react'

// Utils (solo helpers basicos)
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const toDateOnly = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addMinutes = (d: Date, mins: number) => new Date(d.getTime() + mins * 60000)

type TabId = 'dashboard' | 'agenda' | 'espera' | 'citas' | 'pacientes'

// Catalogos mock estables
const brand = {
  primary: '#6B2FB3',      // violeta PRAXIA
  primarySoft: '#F2EAFE',  // fondo suave
  borderSoft: '#E6D7FA',
  accentBlue: '#3B82F6',   // igual a Home paciente
  accentTeal: '#2DD4BF',
  accentAmber: '#F59E0B',
  ink: '#1F1633',
}
const CENTROS = [
  { id_centro_medico: 1, nombre: 'San Isidro' },
  { id_centro_medico: 2, nombre: 'San Miguel' },
  { id_centro_medico: 3, nombre: 'Virtual' },
]
const ESPECIALIDADES = [
  { id_especialidad: 1, nombre: 'Medicina General' },
  { id_especialidad: 2, nombre: 'Pediatria' },
  { id_especialidad: 3, nombre: 'Cardiologia' },
]
const MEDICOS = [
  { id_medico: 1001, nombre: 'Dra. Ana Valdez' },
  { id_medico: 1002, nombre: 'Dr. Bruno Rojas' },
]
const MCES = [
  { id_mce: 1, id_medico: 1001, id_centro_medico: 1, id_especialidad: 3 },
  { id_mce: 2, id_medico: 1001, id_centro_medico: 3, id_especialidad: 3 },
  { id_mce: 3, id_medico: 1002, id_centro_medico: 2, id_especialidad: 2 },
]

let agendaCounter = 100
const AGENDAS_INI = [
  { id_agenda: 1, id_mce: 1, tipo_agenda: 'recurrente' as const, dia_semana: 1, fecha_unica: null as string | null, hora_inicio: '09:00:00', hora_fin: '12:00:00', modalidad: 'presencial' as const, intervalo_min: 20, capacidad_slot: 1, fch_inicio_vigencia: '2025-10-01', fch_fin_vigencia: null as string | null, estado_agenda: 'activo', observaciones: '' },
]

const CITAS_INI = [
  { id_cita: 1, id_paciente: 2001, paciente: 'Luis Perez', id_medico: 1001, id_mce: 1, id_agenda: 1, id_especialidad: 3, slot_inicio: '2025-11-10T09:00:00', slot_fin: '2025-11-10T09:20:00', estado_cita: 'reservada', modalidad: 'presencial' },
]

const PACIENTES = [
  { id_paciente: 2001, nombre: 'Luis Perez', doc: 'DNI 60000001' },
  { id_paciente: 2011, nombre: 'Lucia Navarro', doc: 'DNI 60000011' },
]

const estadoPill = (estado: string) => ({
  reservada: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmada: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelada: 'bg-red-100 text-red-800 border-red-200 line-through',
  atendida: 'bg-green-100 text-green-800 border-green-200',
  no_asistio: 'bg-gray-100 text-gray-700 border-gray-200',
}[estado] || 'bg-slate-100 text-slate-800 border-slate-200')

const SlotPill = ({ s }: { s: any }) => {
  const inicio = s.hora_inicio || s.slot_inicio || s.inicio || s.hora_inicio_slot
  const fin = s.hora_fin || s.slot_fin || s.fin || s.hora_fin_slot
  const label = inicio && fin ? `${String(inicio).slice(0, 5)} - ${String(fin).slice(0, 5)}` : 'Slot'
  const estado = (s.estado || s.estado_slot || '').toString().toLowerCase()
  const pillClass = estado === 'ocupado' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return (
    <div className={`flex items-center justify-between px-3 py-1 rounded-full border text-xs ${pillClass}`}>
      <span>{label}</span>
      {estado && <span className="uppercase text-[10px] tracking-wide">{estado}</span>}
    </div>
  )
}

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border rounded-2xl shadow-sm ${className}`}>{children}</div>
)

// Perfil de médico desde storage (fallback demo)
type MedicoInfo = { id?: number; nombre?: string; apellido?: string; sexo?: 'M'|'F'|'O' }
function useMedicoInfo(): MedicoInfo {
  const [info, setInfo] = useState<MedicoInfo>({ nombre: 'Ana', apellido: 'Valdez', sexo: 'F' })
  useEffect(() => {
    const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
    const uid = localStorage.getItem('userId')
    const load = async () => {
      // 1) Intento API perfil
      if (uid) {
        try {
          const res = await fetch(`${API_BASE}/auth/profile?userId=${uid}`)
          if (res.ok) {
            const p = await res.json()
            const nombre = p?.nombre || p?.nombres || p?.firstName || p?.displayName?.split(' ')?.[0]
            const apellido = p?.apellido || p?.apellidos || p?.lastName || p?.displayName?.split(' ')?.slice(-1)?.[0]
            const sexo = p?.sexo as 'M'|'F'|'O' | undefined
            const id = p?.id_medico ?? p?.id ?? p?.userId
            if (nombre || apellido || id) { setInfo({ id, nombre, apellido, sexo }); return }
          }
        } catch {}
      }
      // 2) Fallback: objetos posibles en localStorage
      try {
        const keys = ['doctor', 'medico', 'user', 'profile', 'usuario']
        for (const k of keys) {
          const raw = localStorage.getItem(k)
          if (!raw) continue
          const obj = JSON.parse(raw)
          const nombre = obj?.nombre || obj?.nombres || obj?.firstName || obj?.displayName?.split(' ')?.[0]
          const apellido = obj?.apellido || obj?.apellidos || obj?.lastName || obj?.displayName?.split(' ')?.slice(-1)?.[0]
          const sexo = obj?.sexo as 'M'|'F'|'O' | undefined
          const id = obj?.id_medico ?? obj?.id ?? obj?.userId
          if (nombre || apellido || id) { setInfo({ id, nombre, apellido, sexo }); break }
        }
      } catch {}
    }
    load()
  }, [])
  return info
}

function getEffectiveMedicoId(): string {
  const ls = localStorage.getItem('userId')
  if (ls) return String(ls)
  try {
    for (const k of ['medico','doctor','user','profile','usuario']){
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const obj = JSON.parse(raw)
      const id = obj?.id_medico ?? obj?.id ?? obj?.userId
      if (id) return String(id)
    }
  } catch {}
  return ''
}

function initialsFrom(nombre?: string, apellido?: string) {
  const a = (nombre?.trim()?.[0] || '').toUpperCase()
  const b = (apellido?.trim()?.[0] || '').toUpperCase()
  return (a + b) || 'MD'
}

function HeaderTabs({ tab, setTab }: { tab: string; setTab: (v: string) => void }) {
  const navigate = useNavigate()
  const medico = useMedicoInfo()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!(e.target instanceof Node)) return
      if (!menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])
  const tabs: { id: TabId; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'espera', label: 'Sala de espera' },
    { id: 'citas', label: 'Citas' },
    { id: 'pacientes', label: 'Pacientes' },
  ]
  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button className="font-semibold" onClick={() => setTab('dashboard')} style={{ color: brand.ink }}>PRAXIA · Portal Medico</button>
        <nav className="flex-1 flex items-center justify-center gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-sm border ${tab === t.id ? 'text-white' : ''} bg-white`}
              style={tab === t.id ? { backgroundColor: brand.primary, borderColor: brand.primary } : { borderColor: brand.borderSoft }}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white text-xl" style={{ borderColor: brand.borderSoft }}>🔔</span>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white text-xl" style={{ borderColor: brand.borderSoft }}>👤</span>
        </div>
      </div>
    </div>
  )
}

// Nuevo header con logo + notificaciones + menú de usuario (iniciales)
function HeaderTabsNew({ tab, setTab }: { tab: TabId; setTab: React.Dispatch<React.SetStateAction<TabId>> }) {
  const navigate = useNavigate()
  const medico = useMedicoInfo()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!(e.target instanceof Node)) return
      if (!menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])
  const tabs: { id: TabId; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'espera', label: 'Sala de espera' },
    { id: 'citas', label: 'Citas' },
    { id: 'pacientes', label: 'Pacientes' },
  ]
  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button className="font-semibold flex items-center gap-2" onClick={() => setTab('dashboard')} style={{ color: brand.ink }}>
          <img src="/assets/logo/praxia_logo_sin_fondo_nombre.png" alt="PRAXIA" className="h-10 md:h-12" />
          <span className="hidden sm:inline">Portal Médico</span>
        </button>
        <nav className="flex-1 flex items-center justify-center gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-sm border ${tab === t.id ? 'text-white' : ''} bg-white`}
              style={tab === t.id ? { backgroundColor: brand.primary, borderColor: brand.primary } : { borderColor: brand.borderSoft }}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3" ref={menuRef}>
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white hover:bg-slate-50" style={{ borderColor: brand.borderSoft }} title="Notificaciones">
            <Bell className="h-6 w-6" color={brand.ink} />
          </button>
          <button onClick={() => setOpen(v => !v)} className="inline-flex h-11 px-2 items-center gap-2 rounded-full border bg-white hover:bg-slate-50" style={{ borderColor: brand.borderSoft }}>
            <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">
              {initialsFrom(medico.nombre, medico.apellido)}
            </div>
            <span className="hidden sm:inline text-sm" style={{ color: brand.ink }}>{[medico.nombre, medico.apellido].filter(Boolean).join(' ') || 'Médico'}</span>
          </button>
          {open && (
            <div className="absolute right-4 top-14 z-30 w-56 rounded-xl border bg-white shadow-lg p-1">
              <DropdownItem icon={<UserIcon className="h-4 w-4" />} onClick={() => { try { localStorage.setItem('returnAfterAccount','/medico') } catch {}; setOpen(false); navigate('/micuenta?from=medico') }}>Mi cuenta</DropdownItem>
              <DropdownItem icon={<LogOut className="h-4 w-4" />} onClick={() => { setOpen(false); navigate('/login') }}>Salir</DropdownItem>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DropdownItem({ icon, children, onClick }:{ icon?: React.ReactNode; children: React.ReactNode; onClick?: ()=>void }){
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">
      {icon}
      <span>{children}</span>
    </button>
  )
}

function Sidebar({ tab, setTab }: { tab: TabId; setTab: React.Dispatch<React.SetStateAction<TabId>> }) {
  const items: { id: TabId; label: string }[] = [
    { id: 'dashboard', label: 'Inicio' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'espera', label: 'Sala de espera' },
    { id: 'citas', label: 'Citas' },
    { id: 'pacientes', label: 'Pacientes' },
  ]
  return (
    <aside className="hidden md:block w-56 shrink-0 py-6 px-3" style={{ backgroundColor: brand.primary }}>
      <nav className="flex flex-col gap-2">
        {items.map(i => (
          <button
            key={i.id}
            onClick={() => setTab(i.id)}
            className={`px-3 py-2 rounded-lg border text-sm text-left ${tab === i.id ? 'font-medium' : 'hover:bg-white/10'}`}
            style={
              tab === i.id
                ? { backgroundColor: '#ffffff', color: brand.primary, borderColor: 'transparent' }
                : { backgroundColor: 'transparent', color: '#ffffff', borderColor: 'transparent' }
            }
          >
            {i.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

function Dashboard({ citas, onGo }: { citas: any[]; onGo: (tab: 'dashboard'|'agenda'|'espera'|'citas'|'pacientes')=>void }) {
  const uid = (typeof window !== 'undefined' ? getEffectiveMedicoId() : '')
  const now = new Date()
  const upcoming = useMemo(() => (
    [...citas]
      .filter(c => !uid || String(c.id_medico) === String(uid))
      .filter(c => ['reservada','confirmada'].includes(String(c.estado_cita).toLowerCase()))
      .filter(c => { const when = new Date(c.slot_inicio); return isFinite(when.getTime()) && when >= now })
      .sort((a, b) => +new Date(a.slot_inicio) - +new Date(b.slot_inicio))
      .slice(0, 6)
  ), [citas, uid])
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <WelcomeBar />
      <Card className="p-4">
        <h3 className="text-base font-semibold mb-2">Proximas citas</h3>
        <div className="divide-y">
          {upcoming.map(c => (
            <div key={c.id_cita} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.paciente}</div>
                <div className="text-xs text-slate-600">{new Date(c.slot_inicio).toLocaleString()}</div>
              </div>
              <span className={`px-2 py-1 rounded-full border text-xs ${estadoPill(c.estado_cita)}`}>{c.estado_cita}</span>
            </div>
          ))}
          {upcoming.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">Sin proximas citas</div>}
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-base font-semibold mb-2">Accesos rapidos</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="border rounded-xl px-3 py-3 text-sm hover:bg-slate-50 text-left" onClick={() => onGo('agenda')}>Crear agenda</button>
          <button className="border rounded-xl px-3 py-3 text-sm hover:bg-slate-50 text-left" onClick={() => onGo('agenda')}>Bloquear franja</button>
          <button className="border rounded-xl px-3 py-3 text-sm hover:bg-slate-50 text-left" onClick={() => onGo('espera')}>Ver sala</button>
          <button className="border rounded-xl px-3 py-3 text-sm hover:bg-slate-50 text-left" onClick={() => onGo('citas')}>Reporte semanal</button>
        </div>
      </Card>
    </div>
  )
}

function WelcomeBar(){
  const medico = useMedicoInfo()
  const prefijo = medico.sexo === 'F' ? 'Dra.' : medico.sexo === 'M' ? 'Dr.' : ''
  const nombre = [medico.nombre, medico.apellido].filter(Boolean).join(' ')
  return (
    <Card className="p-4 lg:col-span-2" >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">Bienvenido(a)</div>
          <div className="text-lg font-semibold" style={{ color: brand.ink }}>{[prefijo, nombre].filter(Boolean).join(' ')}</div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">{initialsFrom(medico.nombre, medico.apellido)}</div>
        </div>
      </div>
    </Card>
  )
}

function Agenda({ agendas, setAgendas, citas, cat }: { agendas: any[]; setAgendas: (fn: any)=>void; citas: any[]; cat: { CENTROS: any[]; ESPECIALIDADES: any[]; MEDICOS: any[]; MCES: any[] } }) {
  const [centroId, setCentroId] = useState<number>(cat.CENTROS?.[0]?.id_centro_medico || 1)
  const [espId, setEspId] = useState<number>(cat.ESPECIALIDADES?.[0]?.id_especialidad || 1)
  const mces = cat.MCES.filter(m => Number(m.id_centro_medico) === Number(centroId) && Number(m.id_especialidad) === Number(espId))
  const [mceId, setMceId] = useState<number>(mces[0]?.id_mce || 1)
  useEffect(() => {
    const list = cat.MCES.filter(m => Number(m.id_centro_medico) === Number(centroId) && Number(m.id_especialidad) === Number(espId))
    if (!list.find(x => Number(x.id_mce) === Number(mceId))) {
      if (list[0]?.id_mce) setMceId(Number(list[0].id_mce))
    }
  }, [centroId, espId, cat.MCES])

  const [view, setView] = useState<'dia' | 'semana'>('semana')
  const [fechaBase, setFechaBase] = useState('2025-11-10')
  const agendasCentro = useMemo(() => {
    const idsMce = new Set(cat.MCES.filter((m:any)=> Number(m.id_centro_medico)===Number(centroId)).map((m:any)=> Number(m.id_mce)))
    return agendas.filter((a:any)=> idsMce.has(Number(a.id_mce)))
  }, [agendas, cat, centroId])
  const agendasCtx = agendas.filter(a => Number(a.id_mce) === Number(mceId))

  function generarSlotsParaDia(agenda: any, dateISO: string) {
    const [hiH, hiM] = agenda.hora_inicio.split(':').map(Number)
    const [hfH, hfM] = agenda.hora_fin.split(':').map(Number)
    const start = new Date(`${dateISO}T${pad(hiH)}:${pad(hiM)}:00`)
    const end = new Date(`${dateISO}T${pad(hfH)}:${pad(hfM)}:00`)
    const slots: any[] = []
    for (let t = new Date(start); t < end; t = addMinutes(t, agenda.intervalo_min)) {
      const inicio = new Date(t)
      const fin = addMinutes(inicio, agenda.intervalo_min)
      const ocupados = citas.filter(c => c.id_agenda === agenda.id_agenda && +new Date(c.slot_inicio) >= +inicio && +new Date(c.slot_inicio) < +fin && c.estado_cita !== 'cancelada').length
      const cap = agenda.capacidad_slot
      const estado = ocupados >= cap ? 'lleno' : ocupados > 0 ? 'parcial' : 'libre'
      slots.push({ inicio, fin, capacidad: cap, ocupados, estado })
    }
    return slots
  }

  const fechaRef = new Date(fechaBase + 'T00:00:00')
  const dias = useMemo(() => (view === 'dia' ? [fechaRef] : Array.from({ length: 7 }, (_, i) => new Date(new Date(fechaRef).getTime() + i * 86400000))), [view, fechaBase])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-4 lg:col-span-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <Select label="Centro" value={centroId} onChange={(v)=>setCentroId(Number(v))} options={cat.CENTROS.map(c => ({ value: c.id_centro_medico, label: c.nombre }))} />
          <Select label="Especialidad" value={espId} onChange={(v)=>setEspId(Number(v))} options={cat.ESPECIALIDADES.map(e => ({ value: e.id_especialidad, label: e.nombre }))} />
          <Select label="MCE" value={mceId} onChange={(v)=>setMceId(Number(v))} options={cat.MCES.filter(m => Number(m.id_centro_medico) === Number(centroId) && Number(m.id_especialidad) === Number(espId)).map(m => ({ value: m.id_mce, label: cat.MEDICOS.find(x => Number(x.id_medico) === Number(m.id_medico))?.nombre || `MCE ${m.id_mce}` }))} />
          <div className="flex gap-2">
            <div className="inline-flex rounded-md border overflow-hidden">
              <button className={`px-3 py-1 text-sm ${view === 'dia' ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={() => setView('dia')}>Dia</button>
              <button className={`px-3 py-1 text-sm ${view === 'semana' ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={() => setView('semana')}>Semana</button>
            </div>
            <input type="date" value={fechaBase} onChange={(e) => setFechaBase((e.target as HTMLInputElement).value)} className="border rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="text-xs text-slate-600">Contexto MCE: #{mceId}</div>
        </div>
      </Card>

      <Card className="p-4 lg:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {dias.map((d, idx) => {
            const slots = agendasCtx.flatMap(a => generarSlotsParaDia(a, toDateOnly(d)))
            const label = d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })
            return (
              <div key={idx} className="border rounded-xl p-3">
                <div className="text-sm font-medium mb-2">{label}</div>
                <div className="space-y-2">
                  {slots.map((s, i) => <SlotPill key={i} s={s} />)}
                  {slots.length === 0 && <div className="text-xs text-slate-400">Sin horarios</div>}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-base font-semibold mb-2">Agendas del centro</h3>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 pr-2">ID</th>
              <th className="py-2 pr-2">Especialidad</th>
              <th className="py-2 pr-2">Tipo</th>
              <th className="py-2 pr-2">Día/Fecha</th>
              <th className="py-2 pr-2">Horario</th>
              <th className="py-2 pr-2">Modalidad</th>
              <th className="py-2 pr-2">Vigencia</th>
              <th className="py-2 pr-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {agendasCentro
              .sort((a:any,b:any)=> String(b.tipo_agenda).localeCompare(String(a.tipo_agenda)) || String(a.fecha_unica||'').localeCompare(String(b.fecha_unica||'')) || (a.dia_semana||0)-(b.dia_semana||0) || String(a.hora_inicio).localeCompare(String(b.hora_inicio)))
              .map((a:any)=>(
              <tr key={a.id_agenda} className="border-t">
                <td className="py-2 pr-2">{a.id_agenda}</td>
                <td className="py-2 pr-2">{(() => { const idEsp = cat.MCES.find((m:any)=> Number(m.id_mce)===Number(a.id_mce))?.id_especialidad; return cat.ESPECIALIDADES.find((e:any)=> Number(e.id_especialidad)===Number(idEsp))?.nombre || '—'})()}</td>
                <td className="py-2 pr-2">{a.tipo_agenda}</td>
                <td className="py-2 pr-2">{a.tipo_agenda==='puntual' ? (a.fecha_unica||'—') : ['','Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][a.dia_semana||0]}</td>
                <td className="py-2 pr-2">{String(a.hora_inicio).slice(0,5)}–{String(a.hora_fin).slice(0,5)}</td>
                <td className="py-2 pr-2">{a.modalidad}</td>
                <td className="py-2 pr-2">{a.fch_inicio_vigencia}{a.fch_fin_vigencia?` → ${a.fch_fin_vigencia}`:''}</td>
                <td className="py-2 pr-2">{a.estado_agenda}</td>
              </tr>
            ))}
            {agendasCentro.length===0 && (
              <tr><td colSpan={8} className="py-6 text-center text-slate-500">Sin agendas en este centro.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <h3 className="text-base font-semibold mb-2">Agregar agenda</h3>
        <AgendaCreateForm centroId={centroId} cat={cat} mceId={mceId} setMceId={setMceId} onCreate={async (payload:any)=>{
          const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
          const post = async (p:string, body:any) => {
            try { const r = await fetch(`${API_BASE}${p}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); if(r.ok){ const j = await r.json().catch(()=>({})); return j?.id_agenda || true } } catch {}
            return false
          }
          const ok = await (post('/agendas', payload) || post('/agenda', payload) || post('/agenda/crear', payload))
          const next = { id_agenda: (ok!==true && ok)|| (Math.max(0, ...agendas.map((x:any)=>Number(x.id_agenda)||0))+1), ...payload, estado_agenda: payload.estado_agenda||'activo' }
          setAgendas((prev:any[]) => [...prev, next])
        }} />
      </Card>
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: any; onChange: (v: any) => void; options: { value: any; label: string }[] }) {
  return (
    <label className="text-sm">
      <div className="mb-1 text-slate-600">{label}</div>
      <select className="w-full border rounded-md px-3 py-2 bg-white" value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function AgendaCreateForm({ centroId, cat, mceId, setMceId, onCreate }:{ centroId:number; cat:any; mceId:number; setMceId:(v:number)=>void; onCreate:(payload:any)=>void }){
  const [tipo, setTipo] = useState<'recurrente'|'puntual'>('recurrente')
  const [dia, setDia] = useState<number>(1)
  const [fecha, setFecha] = useState<string>('')
  const [hi, setHi] = useState<string>('09:00')
  const [hf, setHf] = useState<string>('12:00')
  const [modalidad, setModalidad] = useState<'presencial'|'virtual'>('presencial')
  const [intervalo, setIntervalo] = useState<number>(20)
  const [cap, setCap] = useState<number>(1)
  const [vigIni, setVigIni] = useState<string>(toDateOnly(new Date()))
  const [vigFin, setVigFin] = useState<string>('')
  const [obs, setObs] = useState<string>('')

  const mcesCentro = cat.MCES.filter((m:any)=> Number(m.id_centro_medico)===Number(centroId))
  useEffect(()=>{ if(!mcesCentro.find((m:any)=> Number(m.id_mce)===Number(mceId)) && mcesCentro[0]) setMceId(Number(mcesCentro[0].id_mce)) }, [centroId])

  const submit = (e:any)=>{
    e.preventDefault()
    const payload = {
      id_mce: Number(mceId),
      tipo_agenda: tipo,
      dia_semana: tipo==='recurrente' ? Number(dia) : null,
      fecha_unica: tipo==='puntual' ? (fecha||null) : null,
      hora_inicio: `${hi}:00`,
      hora_fin: `${hf}:00`,
      modalidad,
      intervalo_min: Number(intervalo),
      capacidad_slot: Number(cap),
      fch_inicio_vigencia: vigIni,
      fch_fin_vigencia: vigFin || null,
      estado_agenda: 'activo',
      observaciones: obs,
    }
    onCreate(payload)
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      <label>Especialidad (MCE)
        <select className="w-full border rounded px-2 py-1" value={mceId} onChange={e=>setMceId(Number((e.target as HTMLSelectElement).value))}>
          {mcesCentro.map((m:any)=>{
            const esp = cat.ESPECIALIDADES.find((e:any)=> Number(e.id_especialidad)===Number(m.id_especialidad))?.nombre || m.id_especialidad
            return <option key={m.id_mce} value={m.id_mce}>{esp}</option>
          })}
        </select>
      </label>
      <label>Tipo
        <select className="w-full border rounded px-2 py-1" value={tipo} onChange={e=>setTipo((e.target as HTMLSelectElement).value as any)}>
          <option value="recurrente">Recurrente</option>
          <option value="puntual">Puntual</option>
        </select>
      </label>
      {tipo==='recurrente' ? (
        <label>Día
          <select className="w-full border rounded px-2 py-1" value={dia} onChange={e=>setDia(Number((e.target as HTMLSelectElement).value))}>
            {[[1,'Lun'],[2,'Mar'],[3,'Mié'],[4,'Jue'],[5,'Vie'],[6,'Sáb'],[7,'Dom']].map(([v,l])=> <option key={v} value={v as number}>{l as string}</option>)}
          </select>
        </label>
      ) : (
        <label>Fecha
          <input type="date" className="w-full border rounded px-2 py-1" value={fecha} onChange={e=>setFecha((e.target as HTMLInputElement).value)} />
        </label>
      )}
      <label>Inicio
        <input type="time" className="w-full border rounded px-2 py-1" value={hi} onChange={e=>setHi((e.target as HTMLInputElement).value)} />
      </label>
      <label>Fin
        <input type="time" className="w-full border rounded px-2 py-1" value={hf} onChange={e=>setHf((e.target as HTMLInputElement).value)} />
      </label>
      <label>Modalidad
        <select className="w-full border rounded px-2 py-1" value={modalidad} onChange={e=>setModalidad((e.target as HTMLSelectElement).value as any)}>
          <option value="presencial">Presencial</option>
          <option value="virtual">Virtual</option>
        </select>
      </label>
      <label>Intervalo
        <input type="number" className="w-full border rounded px-2 py-1" value={intervalo} onChange={e=>setIntervalo(Number((e.target as HTMLInputElement).value))} />
      </label>
      <label>Capacidad/slot
        <input type="number" className="w-full border rounded px-2 py-1" value={cap} onChange={e=>setCap(Number((e.target as HTMLInputElement).value))} />
      </label>
      <label>Vigencia desde
        <input type="date" className="w-full border rounded px-2 py-1" value={vigIni} onChange={e=>setVigIni((e.target as HTMLInputElement).value)} />
      </label>
      <label>Vigencia hasta
        <input type="date" className="w-full border rounded px-2 py-1" value={vigFin} onChange={e=>setVigFin((e.target as HTMLInputElement).value)} />
      </label>
      <label className="md:col-span-4">Observaciones
        <input className="w-full border rounded px-2 py-1" value={obs} onChange={e=>setObs((e.target as HTMLInputElement).value)} />
      </label>
      <div className="md:col-span-4">
        <button className="rounded-md bg-slate-900 text-white px-4 py-2">Agregar</button>
      </div>
    </form>
  )
}

function Citas({ citas, agendas, cat }: { citas: any[]; agendas: any[]; cat: { CENTROS:any[]; MCES:any[] } }) {
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState<'todos'|'reservada'|'confirmada'|'cancelada'|'atendida'|'no_asistio'>('todos')
  const today = new Date()
  const defaultDesde = new Date(today); defaultDesde.setDate(defaultDesde.getDate()-60)
  const defaultHasta = new Date(today); defaultHasta.setDate(defaultHasta.getDate()+60)
  const [desde, setDesde] = useState<string>(defaultDesde.toISOString().slice(0,10))
  const [hasta, setHasta] = useState<string>(defaultHasta.toISOString().slice(0,10))
  const uid = (typeof window !== 'undefined' ? getEffectiveMedicoId() : '')

  const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString()
  const fmtTime = (d: string | Date) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const inRange = (iso: string) => {
    const x = new Date(iso)
    if (!isFinite(x.getTime())) return true
    const a = new Date(desde+"T00:00:00")
    const b = new Date(hasta+"T23:59:59")
    return x >= a && x <= b
  }
  const data = useMemo(() => (
    citas
      .filter(c => !uid || String(c.id_medico) === String(uid))
      .filter(c => inRange(c.slot_inicio))
      .filter(c => estado==='todos' ? true : String(c.estado_cita).toLowerCase()===estado)
      .filter(c => (c.paciente || '').toLowerCase().includes(q.toLowerCase()) || String(c.id_cita).includes(q))
      .sort((a,b)=> +new Date(b.slot_inicio) - +new Date(a.slot_inicio)) // historial (recientes primero)
  ), [q, citas, estado, desde, hasta, uid])

  const centroDe = (c:any) => {
    if (c.centro) return c.centro
    const ag = agendas.find((a:any) => Number(a.id_agenda) === Number(c.id_agenda))
    const idMce = ag?.id_mce ?? c.id_mce
    const idCentro = cat.MCES.find((m:any)=> Number(m.id_mce) === Number(idMce))?.id_centro_medico
    return cat.CENTROS.find((x:any)=> Number(x.id_centro_medico) === Number(idCentro))?.nombre || '—'
  }
  const grupos = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const c of data){
      const key = centroDe(c)
      if(!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return Array.from(map.entries())
  }, [data, agendas, cat])
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Citas</h3>
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Buscar por paciente o ID" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} />
      </div>
      <div className="mt-3 overflow-auto">
        <div className="flex items-center gap-2 mb-2 text-sm">
          <label>Desde <input type="date" value={desde} onChange={e=>setDesde((e.target as HTMLInputElement).value)} className="border rounded px-2 py-1" /></label>
          <label>Hasta <input type="date" value={hasta} onChange={e=>setHasta((e.target as HTMLInputElement).value)} className="border rounded px-2 py-1" /></label>
          <label>Estado
            <select value={estado} onChange={e=>setEstado((e.target as HTMLSelectElement).value as any)} className="ml-2 border rounded px-2 py-1">
              {['todos','reservada','confirmada','cancelada','atendida','no_asistio'].map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <span className="text-slate-500">{data.length} resultados</span>
        </div>
        {grupos.map(([centro, items]) => (
          <div key={centro} className="mb-6">
            <div className="text-sm font-semibold text-slate-700 mb-2">Centro: {centro}</div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Hora</th>
                  <th className="py-2 pr-4">Paciente</th>
                  <th className="py-2 pr-4">Modalidad</th>
                  <th className="py-2 pr-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c:any) => (
                  <tr key={c.id_cita} className="border-t">
                    <td className="py-2 pr-4">{c.id_cita}</td>
                    <td className="py-2 pr-4">{fmtDate(c.slot_inicio)}</td>
                    <td className="py-2 pr-4">{fmtTime(c.slot_inicio)}–{fmtTime(c.slot_fin)}</td>
                    <td className="py-2 pr-4">{c.paciente}</td>
                    <td className="py-2 pr-4">{c.modalidad}</td>
                    <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-full border ${estadoPill(c.estado_cita)}`}>{c.estado_cita}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {data.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">Sin resultados</div>}
      </div>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────────────────────────
// Sala de espera (citas del día del médico)
// ────────────────────────────────────────────────────────────────────────────────
function SalaEspera({ citas, onCheckIn }:{ citas:any[]; onCheckIn:(id:number)=>Promise<void>|void }){
  const uid = (typeof window !== 'undefined' ? getEffectiveMedicoId() : '')
  const hoyISO = toDateOnly(new Date())
  const delDia = useMemo(() => (
    citas
      .filter(c => !uid || String(c.id_medico) === String(uid))
      .filter(c => (typeof c.slot_inicio === 'string' ? c.slot_inicio.startsWith(hoyISO) : toDateOnly(new Date(c.slot_inicio)) === hoyISO))
      .filter(c => String(c.estado_cita).toLowerCase() !== 'cancelada')
      .sort((a,b)=> +new Date(a.slot_inicio) - +new Date(b.slot_inicio))
  ), [citas, uid])

  const fmtTime = (d:string|Date) => new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Sala de espera · {new Date().toLocaleDateString()}</h3>
        <div className="text-xs text-slate-500">{delDia.length} pacientes</div>
      </div>
      {delDia.length===0 && <div className="text-sm text-slate-500">Sin citas para hoy.</div>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {delDia.map(c => (
          <div key={c.id_cita} className="border rounded-xl p-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="font-medium">{c.paciente || `Paciente #${c.id_paciente||''}`}</div>
              <span className={`px-2 py-0.5 rounded-full border text-[11px] ${estadoPill(c.estado_cita)}`}>{c.estado_cita}</span>
            </div>
            <div className="text-xs text-slate-600 mt-1">{fmtTime(c.slot_inicio)} – {c.modalidad}</div>
            <div className="flex gap-2 mt-3">
              <button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50" onClick={()=>onCheckIn(Number(c.id_cita))}>{c.en_sala? 'En sala' : 'Marcar en sala'}</button>
              {String(c.modalidad).toLowerCase()==='virtual' && (
                <button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50">Entrar a teleconsulta</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Pacientes() {
  const [q, setQ] = useState('')
  const data = useMemo(() => PACIENTES.filter(p => p.nombre.toLowerCase().includes(q.toLowerCase()) || p.doc.includes(q)), [q])
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Mis pacientes</h3>
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Buscar por nombre o documento" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map(p => (
          <div key={p.id_paciente} className="border rounded-xl p-3">
            <div className="font-medium">{p.nombre}</div>
            <div className="text-xs text-slate-600">{p.doc}</div>
            <div className="flex gap-2 mt-3">
              <button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50">Historial</button>
              <button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50">Agendar</button>
            </div>
          </div>
        ))}
        {data.length === 0 && <div className="text-sm text-slate-500">No hay coincidencias</div>}
      </div>
    </Card>
  )
}

export default function PortalStable() {
  const [tab, setTab] = useState<'dashboard' | 'agenda' | 'espera' | 'citas' | 'pacientes'>('dashboard')
  const [agendas, setAgendas] = useState<any[]>(AGENDAS_INI)
  const [citas, setCitas] = useState<any[]>(CITAS_INI)
  const [cat, setCat] = useState({ CENTROS, ESPECIALIDADES, MEDICOS, MCES })

  // Carga desde API con fallback seguro a mocks
  useEffect(() => {
    const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
    const uid = (typeof window !== 'undefined' ? getEffectiveMedicoId() : '')
    const url = (p: string) => (p.startsWith('http') ? p : `${API_BASE}${p}`)
    const tryFetch = async (candidates: string[]) => {
      for (const c of candidates) {
        try {
          const res = await fetch(url(c))
          if (res.ok) return await res.json()
        } catch {}
      }
      return null
    }

    // Rango sugerido para historial (±60 ds)
    const df = new Date(); df.setDate(df.getDate()-60); const desdeQ = df.toISOString().slice(0,10)
    const dh = new Date(); dh.setDate(dh.getDate()+60); const hastaQ = dh.toISOString().slice(0,10)

    const mapCentros = (xs: any[]) => xs.map((x: any) => ({ id_centro_medico: x.id_centro_medico ?? x.id ?? x.centroId ?? x.id_centro ?? x.cod_centro, nombre: x.nombre ?? x.nmb_centro_medico ?? x.nmb ?? x.descripcion ?? 'Centro' }))
    const mapEsp = (xs: any[]) => xs.map((x: any) => ({ id_especialidad: x.id_especialidad ?? x.id ?? x.especialidadId, nombre: x.nombre ?? x.nmb_especialidad ?? x.descripcion ?? 'Especialidad' }))
    const mapMed = (xs: any[]) => xs.map((x: any) => ({
      id_medico: x.id_medico ?? x.id ?? x.medicoId,
      nombre: x.nombre ?? (([x.nombres, x.apellido, x.apellidos].filter(Boolean).join(' ')) || x.displayName) ?? 'Médico'
    }))
    const mapMce = (xs: any[]) => xs.map((x: any, i: number) => ({ id_mce: x.id_mce ?? x.id ?? x.id_mce_centro ?? (i + 1), id_medico: x.id_medico ?? x.medicoId ?? x.id_medico_fk, id_centro_medico: x.id_centro_medico ?? x.centroId ?? x.id_centro, id_especialidad: x.id_especialidad ?? x.especialidadId ?? x.id_especialidad_fk }))
    const mapAgenda = (xs: any[]) => xs.map((a: any, i: number) => ({
      id_agenda: a.id_agenda ?? a.id ?? (i + 1),
      id_mce: a.id_mce ?? a.id_mce_fk ?? a.mce_id ?? null,
      id_medico_centro: a.id_medico_centro ?? a.id_mc ?? a.medico_centro_id ?? null,
      tipo_agenda: (a.tipo_agenda ?? a.tipo ?? 'recurrente'),
      dia_semana: a.dia_semana ?? a.dia ?? null,
      fecha_unica: a.fecha_unica ?? a.fecha ?? null,
      hora_inicio: a.hora_inicio ?? a.horaIni ?? '09:00:00',
      hora_fin: a.hora_fin ?? a.horaFin ?? '12:00:00',
      modalidad: a.modalidad ?? 'presencial',
      intervalo_min: a.intervalo_min ?? a.intervalo ?? 20,
      capacidad_slot: a.capacidad_slot ?? a.capacidad ?? 1,
      fch_inicio_vigencia: a.fch_inicio_vigencia ?? a.vigencia_ini ?? '2025-01-01',
      fch_fin_vigencia: a.fch_fin_vigencia ?? a.vigencia_fin ?? null,
      estado_agenda: a.estado_agenda ?? a.estado ?? 'activo',
      observaciones: a.observaciones ?? a.obs ?? ''
    }))
    const mapCita = (xs: any[]) => xs.map((c: any, i: number) => ({
      id_cita: c.id_cita ?? c.id ?? (i + 1),
      id_paciente: c.id_paciente ?? c.pacienteId ?? null,
      paciente: c.paciente ?? c.paciente_nombre ?? c.nombre_paciente ?? '',
      id_medico: c.id_medico ?? c.medicoId ?? null,
      id_medico_centro: c.id_medico_centro ?? c.medico_centro_id ?? null,
      id_mce: c.id_mce ?? c.mceId ?? null,
      id_agenda: c.id_agenda ?? c.agendaId ?? null,
      id_especialidad: c.id_especialidad ?? c.especialidadId ?? null,
      slot_inicio: c.slot_inicio ?? c.inicio ?? c.hora_inicio ?? c.fecha_inicio ?? c.fecha_hora_inicio ?? '',
      slot_fin: c.slot_fin ?? c.fin ?? c.hora_fin ?? c.fecha_fin ?? c.fecha_hora_fin ?? '',
      estado_cita: c.estado_cita ?? c.estado ?? 'reservada',
      modalidad: c.modalidad ?? 'presencial',
      centro: c.centro ?? c.centro_nombre ?? c.nmb_centro_medico
    }))

    ;(async () => {
      async function enrichCitas(lst: any[]) {
        const ids = Array.from(new Set(lst.map(c => c.id_paciente).filter(Boolean))) as Array<string|number>
        const cache = new Map<string|number, string>()
        const fetchNombre = async (id: string|number) => {
          if (cache.has(id)) return cache.get(id) as string
          const candidates = [
            `/pacientes/${id}`,
            `/paciente/${id}`,
            `/usuarios/${id}`,
            `/usuario/${id}`
          ]
          for (const p of candidates) {
            try {
              const res = await fetch(url(p))
              if (!res.ok) continue
              const d = await res.json()
              const nombre = d?.nombre || (([d?.nombres, d?.apellido, d?.apellidos].filter(Boolean).join(' ')) || d?.displayName) || ''
              if (nombre) { cache.set(id, nombre); return nombre }
            } catch {}
          }
          cache.set(id, '')
          return ''
        }
        const out: any[] = []
        for (const c of lst) {
          if (!c.paciente && c.id_paciente) {
            const nom = await fetchNombre(c.id_paciente)
            out.push({ ...c, paciente: nom || c.paciente })
          } else {
            out.push(c)
          }
        }
        return out
      }
      try {
        const [centros, especialidades, medicos, mces, agendasSrv, citasSrv] = await Promise.all([
          tryFetch(['/centros', '/catalogos/centros']),
          tryFetch(['/especialidades', '/catalogos/especialidades']),
          tryFetch(['/medicos', '/medico/list']),
          tryFetch(uid ? [`/mce?medicoId=${uid}`, `/medico/${uid}/mce`] : ['/mce', '/medico/list']),
          tryFetch(uid ? [`/agendas?medicoId=${uid}`, `/agenda/medico/${uid}`] : ['/agendas', '/agenda/list']),
          tryFetch([
            uid ? `/citas/medico?medicoId=${uid}&desde=${desdeQ}&hasta=${hastaQ}` : `/citas?desde=${desdeQ}&hasta=${hastaQ}`,
            uid ? `/citas/historial?medicoId=${uid}&desde=${desdeQ}&hasta=${hastaQ}` : `/citas/historial?desde=${desdeQ}&hasta=${hastaQ}`,
            uid ? `/citas/medico/${uid}/historial?desde=${desdeQ}&hasta=${hastaQ}` : `/citas/medico/historial?desde=${desdeQ}&hasta=${hastaQ}`,
            uid ? `/citas/mias?medicoId=${uid}&desde=${desdeQ}&hasta=${hastaQ}` : `/citas/mias?desde=${desdeQ}&hasta=${hastaQ}`,
            `/citas?desde=${desdeQ}&hasta=${hastaQ}`,
            `/cita?desde=${desdeQ}&hasta=${hastaQ}`
          ])
        ])
        const nextCat = {
          CENTROS: Array.isArray(centros) ? mapCentros(centros) : CENTROS,
          ESPECIALIDADES: Array.isArray(especialidades) ? mapEsp(especialidades) : ESPECIALIDADES,
          MEDICOS: Array.isArray(medicos) ? mapMed(medicos) : MEDICOS,
          MCES: Array.isArray(mces) ? mapMce(mces) : MCES,
        }
        setCat(nextCat)
        if (Array.isArray(agendasSrv)) setAgendas(mapAgenda(agendasSrv))
        if (Array.isArray(citasSrv)) {
          const baseAll = mapCita(citasSrv)
          const base = uid ? baseAll.filter((c: any) => String(c.id_medico) === String(uid)) : baseAll
          const enriched = await enrichCitas(base)
          setCitas(enriched)
        }
      } catch {
        // silencio: se mantienen mocks
      }
    })()
  }, [])
  return (
    <div className="min-h-screen text-slate-900" style={{ backgroundColor: brand.primarySoft }}>
      <HeaderTabsNew tab={tab} setTab={setTab} />
      <div className="max-w-7xl mx-auto px-4 flex gap-4">
        <Sidebar tab={tab} setTab={setTab} />
        <main className="flex-1 py-6 space-y-6">
          {tab === 'dashboard' && <Dashboard citas={citas} onGo={(t)=>setTab(t)} />}
          {tab === 'agenda' && <Agenda agendas={agendas} setAgendas={setAgendas} citas={citas} cat={cat} />}
          {tab === 'espera' && <SalaEspera citas={citas} onCheckIn={async (id:number)=>{
            const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
            const tryCall = async (method: 'POST'|'PUT', path: string) => {
              try { const res = await fetch(`${API_BASE}${path}`, { method, headers: { 'Content-Type':'application/json' } }); return res.ok } catch { return false }
            }
            const ok = await (async ()=>{
              if (await tryCall('PUT', `/citas/${id}/checkin`)) return true
              if (await tryCall('PUT', `/citas/${id}/espera`)) return true
              if (await tryCall('PUT', `/citas/${id}/confirmar`)) return true
              if (await tryCall('POST', `/citas/${id}/checkin`)) return true
              return false
            })()
            setCitas(prev => prev.map(c => c.id_cita===id ? { ...c, estado_cita: 'confirmada', en_sala: true } : c))
            if (!ok) { /* fallback local ya aplicado */ }
          }} />}
          {tab === 'citas' && <Citas citas={citas} agendas={agendas} cat={cat} />}
          {tab === 'pacientes' && <Pacientes />}
        </main>
      </div>
    </div>
  )
}
