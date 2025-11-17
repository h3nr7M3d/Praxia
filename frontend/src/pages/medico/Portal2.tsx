import React, { useMemo, useState, useEffect } from 'react'

// Helpers
const pad = (n:number) => (n<10?`0${n}`:`${n}`)
const toDateOnly = (d:Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
const addMinutes = (d:Date, m:number) => new Date(d.getTime()+m*60000)
const startOfWeek = (d:Date) => { const c=new Date(d); const shift=(c.getDay()+6)%7; c.setDate(c.getDate()-shift); c.setHours(0,0,0,0); return c }

// Catálogos (mock breves)
const CENTROS = [ { id_centro_medico:1,nombre:'San Isidro' }, { id_centro_medico:2,nombre:'San Miguel' }, { id_centro_medico:3,nombre:'Virtual' } ]
const ESPECIALIDADES = [ { id_especialidad:1,nombre:'Medicina General' }, { id_especialidad:2,nombre:'Pediatría' }, { id_especialidad:3,nombre:'Cardiología' } ]
const MEDICOS = [ { id_medico:1001,nombre:'Dra. Ana Valdez' }, { id_medico:1002,nombre:'Dr. Bruno Rojas' } ]
const MCES = [ { id_mce:1,id_medico:1001,id_centro_medico:1,id_especialidad:3 }, { id_mce:2,id_medico:1001,id_centro_medico:3,id_especialidad:3 }, { id_mce:3,id_medico:1002,id_centro_medico:2,id_especialidad:2 } ]
const CENTROS_DEFAULT = [...CENTROS]
const ESPECIALIDADES_DEFAULT = [...ESPECIALIDADES]
const MEDICOS_DEFAULT = [...MEDICOS]
const MCES_DEFAULT = [...MCES]
let agendaCounter = 100
const AGENDAS_INI = [ { id_agenda:1,id_mce:1,tipo_agenda:'recurrente',dia_semana:1,fecha_unica:null,hora_inicio:'09:00:00',hora_fin:'12:00:00',modalidad:'presencial',intervalo_min:20,capacidad_slot:1,fch_inicio_vigencia:'2025-10-01',fch_fin_vigencia:null,estado_agenda:'activo',observaciones:'' } ]
const CITAS_INI = [ { id_cita:1,id_paciente:2001,paciente:'Luis Pérez',id_medico:1001,id_mce:1,id_agenda:1,id_especialidad:3,slot_inicio:'2025-11-10T09:00:00',slot_fin:'2025-11-10T09:20:00',estado_cita:'reservada',modalidad:'presencial' } ]

const estadoPill = (s:string)=>({reservada:'bg-yellow-100 text-yellow-800 border-yellow-200',confirmada:'bg-blue-100 text-blue-800 border-blue-200',cancelada:'bg-red-100 text-red-800 border-red-200 line-through',atendida:'bg-green-100 text-green-800 border-green-200',no_asistio:'bg-gray-100 text-gray-700 border-gray-200'}[s]||'bg-slate-100 text-slate-800 border-slate-200')
const Card = ({children,className=''}:{children:React.ReactNode;className?:string})=> <div className={`bg-white border rounded-2xl shadow-sm ${className}`}>{children}</div>
const Topbar = ({current,setCurrent}:{current:string;setCurrent:React.Dispatch<React.SetStateAction<string>>})=>{
  const tabs=[{id:'dashboard',label:'Dashboard'},{id:'agenda',label:'Agenda'},{id:'espera',label:'Sala de espera'},{id:'citas',label:'Citas'},{id:'pacientes',label:'Pacientes'}]
  return (<div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b"><div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between"><div className="font-semibold">PRAXIA · Portal Médico</div><nav className="flex gap-1">{tabs.map(t=>(<button key={t.id} onClick={()=>setCurrent(t.id)} className={`px-3 py-1.5 rounded-xl text-sm border ${current===t.id?'bg-black text-white border-black':'bg-white border-slate-300 hover:bg-slate-50'}`}>{t.label}</button>))}</nav></div></div>)}
const Dashboard = ({citas}:{citas:any[]})=>{const upcoming=useMemo(()=>[...citas].sort((a,b)=>+new Date(a.slot_inicio)-+new Date(b.slot_inicio)).slice(0,6),[citas]);return(<div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6"><Card className="p-4"><h3 className="text-base font-semibold mb-2">Próximas citas</h3><div className="divide-y">{upcoming.map(c=>(<div key={c.id_cita} className="py-3 flex items-center justify-between"><div><div className="font-medium">{c.paciente}</div><div className="text-xs text-slate-600">{new Date(c.slot_inicio).toLocaleString()}</div></div><span className={`px-2 py-1 rounded-full border text-xs ${estadoPill(c.estado_cita)}`}>{c.estado_cita}</span></div>))}</div></Card><Card className="p-4"><h3 className="text-base font-semibold mb-2">Accesos rápidos</h3><div className="grid grid-cols-2 gap-3">{['Crear agenda','Bloquear franja','Ver sala','Reporte semanal'].map(a=>(<button key={a} className="border rounded-xl px-3 py-3 text-sm hover:bg-slate-50 text-left">{a}</button>))}</div></Card></div>)}


const SlotPill = ({ s }:{ s:any }) => {
  const inicio = s.hora_inicio || s.slot_inicio || s.inicio || s.hora_inicio_slot
  const fin = s.hora_fin || s.slot_fin || s.fin || s.hora_fin_slot
  const label = inicio && fin ? `${String(inicio).slice(0,5)} - ${String(fin).slice(0,5)}` : 'Slot'
  const estado = (s.estado || s.estado_slot || '').toString().toLowerCase()
  const isOcupado = estado === 'ocupado'
  const pillClass = isOcupado ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return (
    <div className={`flex items-center justify-between px-3 py-1 rounded-full border text-xs ${pillClass}`}>
      <span>{label}</span>
      {estado && <span className="uppercase text-[10px] tracking-wide">{estado}</span>}
    </div>
  )
}

function SelectBox({ label, value, onChange, options }:{ label:string; value:any; onChange:(v:any)=>void; options:{value:any; label:string}[]}){
  return (
    <label className="text-sm">
      <div className="mb-1 text-slate-600">{label}</div>
      <select className="w-full border rounded-md px-3 py-2 bg-white" value={value} onChange={(e)=>onChange(Number((e.target as HTMLSelectElement).value))}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function VistaSelector({ view, setView }:{ view:'dia'|'semana'; setView:(v:'dia'|'semana')=>void }){
  return (
    <div className="inline-flex rounded-md border overflow-hidden">
      <button className={`px-3 py-1 text-sm ${view==='dia'?'bg-slate-900 text-white':'bg-white'}`} onClick={()=>setView('dia')}>Día</button>
      <button className={`px-3 py-1 text-sm ${view==='semana'?'bg-slate-900 text-white':'bg-white'}`} onClick={()=>setView('semana')}>Semana</button>
    </div>
  )
}

function Agenda({ agendas, setAgendas, citas }:{agendas:any[]; setAgendas:(fn:any)=>void; citas:any[]}){
  const [centroId, setCentroId] = useState(1)
  const [espId, setEspId] = useState(3)
  const mces = useMemo(()=> MCES.filter(m=> m.id_centro_medico===Number(centroId) && m.id_especialidad===Number(espId)), [centroId, espId])
  const [mceId, setMceId] = useState(mces[0]?.id_mce || 1)
  useEffect(()=>{ if(mces.length) setMceId(mces[0].id_mce) }, [centroId, espId])

  const [view, setView] = useState<'dia'|'semana'>('semana')
  const [fechaBase, setFechaBase] = useState('2025-11-10')
  const agendasCtx = useMemo(()=> agendas.filter(a=> a.id_mce===mceId && a.estado_agenda==='activo'), [agendas, mceId])

  function generarSlotsParaDia(agenda:any, dateISO:string){
    const d = new Date(dateISO+"T00:00:00")
    const f0 = new Date(agenda.fch_inicio_vigencia+"T00:00:00")
    const f1 = agenda.fch_fin_vigencia ? new Date(agenda.fch_fin_vigencia+"T00:00:00") : null
    if (d < f0) return []
    if (f1 && d >= f1) return []
    const dow = ((d.getDay()+6)%7)+1
    if (agenda.tipo_agenda==='recurrente' && agenda.dia_semana !== dow) return []
    if (agenda.tipo_agenda==='puntual' && agenda.fecha_unica !== dateISO) return []
    const [hiH, hiM] = agenda.hora_inicio.split(":").map(Number)
    const [hfH, hfM] = agenda.hora_fin.split(":").map(Number)
    const start = new Date(`${dateISO}T${pad(hiH)}:${pad(hiM)}:00`)
    const end   = new Date(`${dateISO}T${pad(hfH)}:${pad(hfM)}:00`)
    const slots:any[] = []
    for (let t=new Date(start); t<end; t=addMinutes(t, agenda.intervalo_min)){
      const inicio = new Date(t)
      const fin = addMinutes(inicio, agenda.intervalo_min)
      const ocupados = citas.filter(c => c.id_agenda===agenda.id_agenda && +new Date(c.slot_inicio)>=+inicio && +new Date(c.slot_inicio)<+fin && c.estado_cita!=='cancelada').length
      const cap = agenda.capacidad_slot
      const estado = ocupados >= cap ? 'lleno' : ocupados>0 ? 'parcial' : 'libre'
      slots.push({ inicio, fin, capacidad: cap, ocupados, estado })
    }
    return slots
  }

  const fechaRef = new Date(fechaBase+"T00:00:00")
  const dias = useMemo(()=> view==='dia' ? [fechaRef] : Array.from({length:7}, (_,i)=> new Date(startOfWeek(fechaRef).getTime()+i*86400000)), [view, fechaBase])

  function crearEjemplo(){ setAgendas((prev:any[]) => [...prev, { id_agenda: ++agendaCounter, id_mce:mceId, tipo_agenda:'recurrente', dia_semana:1, fecha_unica:null, hora_inicio:'09:00:00', hora_fin:'12:00:00', modalidad:'presencial', intervalo_min:20, capacidad_slot:1, fch_inicio_vigencia:toDateOnly(new Date()), fch_fin_vigencia:null, estado_agenda:'activo', observaciones:'' }]) }

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-4 lg:col-span-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <SelectBox label="Centro" value={centroId} onChange={setCentroId} options={CENTROS.map(c=>({value:c.id_centro_medico,label:c.nombre}))} />
          <SelectBox label="Especialidad" value={espId} onChange={setEspId} options={ESPECIALIDADES.map(e=>({value:e.id_especialidad,label:e.nombre}))} />
          <SelectBox label="MCE" value={mceId} onChange={(v)=>setMceId(Number(v))} options={MCES.filter(m=>m.id_centro_medico===Number(centroId) && m.id_especialidad===Number(espId)).map(m=>({ value:m.id_mce, label: MEDICOS.find(x=>x.id_medico===m.id_medico)?.nombre || `MCE ${m.id_mce}` }))} />
          <div className="flex gap-2"><VistaSelector view={view} setView={setView} /><input type="date" value={fechaBase} onChange={(e)=>setFechaBase((e.target as HTMLInputElement).value)} className="border rounded-md px-3 py-2 text-sm" /></div>
          <div className="text-xs text-slate-600">Contexto MCE: #{mceId}</div>
        </div>
      </Card>

      <Card className="p-4 lg:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {dias.map((d, idx) => {
            const slots = agendasCtx.flatMap(a => generarSlotsParaDia(a, toDateOnly(d)));
            const label = d.toLocaleDateString(undefined,{weekday:'short',day:'2-digit',month:'short'})
            return (
              <div key={idx} className="border rounded-xl p-3"><div className="text-sm font-medium mb-2">{label}</div><div className="space-y-2">{slots.map((s,i)=>(<SlotPill key={i} s={s}/>))}{slots.length===0 && <div className="text-xs text-slate-400">Sin horarios</div>}</div></div>
            )
          })}
        </div>
      </Card>

      <Card className="p-4"><h3 className="text-base font-semibold mb-2">Agregar horario</h3><button className="w-full rounded-md bg-slate-900 text-white py-2 hover:bg-slate-800" onClick={crearEjemplo}>Agregar ejemplo</button></Card>
    </div>
  )
}

function SalaEspera({ citas }:{ citas:any[] }){
  const hoyISO = new Date().toISOString().slice(0,10)
  const fmtTime = (d:string|Date) => new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  const NOMBRE_ESP = (id:number) => ESPECIALIDADES.find(e=>e.id_especialidad===id)?.nombre || id
  const NOMBRE_MED = (id:number) => MEDICOS.find(m=>m.id_medico===id)?.nombre || id
  const NOMBRE_CENTRO = (id:number|undefined) => CENTROS.find(c=>c.id_centro_medico===id)?.nombre || id || '—'
  const delDia = useMemo(()=> citas.filter(c=> String(c.slot_inicio).startsWith(hoyISO) && c.estado_cita!=='cancelada').sort((a,b)=>+new Date(a.slot_inicio)-+new Date(b.slot_inicio)), [citas])
  return (
    <div className="max-w-7xl mx-auto p-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Sala de espera · {new Date(hoyISO).toLocaleDateString()}</h3>
          <div className="text-xs text-slate-600">Actualiza para sincronizar</div>
        </div>
        {delDia.length===0 && <div className="text-sm text-slate-500 py-8 text-center">No hay pacientes en espera.</div>}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {delDia.map((c:any)=>(
            <div key={c.id_cita} className="border rounded-2xl p-3 bg-white/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.paciente}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{fmtTime(c.slot_inicio)} · {NOMBRE_MED(c.id_medico)} · {NOMBRE_ESP(c.id_especialidad)}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full border text-[11px] ${estadoPill(c.estado_cita)}`}>{c.estado_cita}</span>
              </div>
              <div className="text-xs text-slate-600 mt-1">{NOMBRE_CENTRO(MCES.find(m=>m.id_mce===c.id_mce)?.id_centro_medico)}</div>
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50">Marcar en sala</button>
                {c.modalidad==='virtual' && <button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50">Entrar a teleconsulta</button>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Citas({ citas }:{ citas:any[] }){
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'proximas'|'historial'>('proximas')
  const [estado, setEstado] = useState<'todos'|'reservada'|'confirmada'|'cancelada'|'atendida'|'no_asistio'>('todos')
  const [modalidad, setModalidad] = useState<'todas'|'presencial'|'virtual'>('todas')
  const [centroId, setCentroId] = useState<string>('')
  const [desde, setDesde] = useState<string>('')
  const [hasta, setHasta] = useState<string>('')
  const now = new Date()
  const NOMBRE_ESP = (id:number) => ESPECIALIDADES.find(e=>e.id_especialidad===id)?.nombre || id
  const NOMBRE_MED = (id:number) => MEDICOS.find(m=>m.id_medico===id)?.nombre || id
  const NOMBRE_CENTRO = (id:number|undefined) => CENTROS.find(c=>c.id_centro_medico===id)?.nombre || id || '—'
  const fmtDate = (d:string|Date) => new Date(d).toLocaleDateString()
  const fmtTime = (d:string|Date) => new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})

  const data = useMemo(()=>{
    let base = citas.filter((c:any)=> (c.paciente||'').toLowerCase().includes(q.toLowerCase()) || String(c.id_cita).includes(q))
    if (estado!=='todos') base = base.filter((c:any)=> c.estado_cita===estado)
    if (modalidad!=='todas') base = base.filter((c:any)=> c.modalidad===modalidad)
    if (centroId) base = base.filter((c:any)=> String(MCES.find(m=>m.id_mce===c.id_mce)?.id_centro_medico||'')===centroId)
    if (desde) base = base.filter((c:any)=> new Date(c.slot_inicio) >= new Date(`${desde}T00:00:00`))
    if (hasta) base = base.filter((c:any)=> new Date(c.slot_inicio) <= new Date(`${hasta}T23:59:59`))
    if (mode==='proximas') return base.filter(c=> new Date(c.slot_inicio)>=now).sort((a,b)=> +new Date(a.slot_inicio)-+new Date(b.slot_inicio))
    return base.filter(c=> new Date(c.slot_inicio)<now).sort((a,b)=> +new Date(b.slot_inicio)-+new Date(a.slot_inicio))
  }, [citas, q, estado, modalidad, centroId, desde, hasta, mode])

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-semibold">Citas</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-md border overflow-hidden shrink-0">
              <button className={`px-3 py-1 text-sm ${mode==='proximas'?'bg-slate-900 text-white':'bg-white'}`} onClick={()=>setMode('proximas')}>Próximas</button>
              <button className={`px-3 py-1 text-sm ${mode==='historial'?'bg-slate-900 text-white':'bg-white'}`} onClick={()=>setMode('historial')}>Historial</button>
            </div>
            <select className="border rounded-md px-2 py-1.5 text-sm" value={estado} onChange={(e)=>setEstado(e.target.value as any)}>
              <option value="todos">Todos</option>
              <option value="reservada">Reservada</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
              <option value="atendida">Atendida</option>
              <option value="no_asistio">No asistió</option>
            </select>
            <select className="border rounded-md px-2 py-1.5 text-sm" value={modalidad} onChange={(e)=>setModalidad(e.target.value as any)}>
              <option value="todas">Todas</option>
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
            </select>
            <select className="border rounded-md px-2 py-1.5 text-sm" value={centroId} onChange={(e)=>setCentroId(e.target.value)}>
              <option value="">Todos los centros</option>
              {CENTROS.map(c=> (<option key={c.id_centro_medico} value={String(c.id_centro_medico)}>{c.nombre}</option>))}
            </select>
            <input type="date" className="border rounded-md px-2 py-1.5 text-sm" value={desde} onChange={(e)=>setDesde(e.target.value)} />
            <input type="date" className="border rounded-md px-2 py-1.5 text-sm" value={hasta} onChange={(e)=>setHasta(e.target.value)} />
            <input className="border rounded-lg px-3 py-2 text-sm w-[220px]" placeholder="Buscar por paciente o ID" value={q} onChange={(e)=>setQ(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Hora</th>
                <th className="py-2 pr-4">Paciente</th>
                <th className="py-2 pr-4">Médico</th>
                <th className="py-2 pr-4">Especialidad</th>
                <th className="py-2 pr-4">Centro</th>
                <th className="py-2 pr-4">Modalidad</th>
                <th className="py-2 pr-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c:any)=> (
                <tr key={c.id_cita} className="border-t">
                  <td className="py-2 pr-4">{c.id_cita}</td>
                  <td className="py-2 pr-4">{fmtDate(c.slot_inicio)}</td>
                  <td className="py-2 pr-4">{fmtTime(c.slot_inicio)}–{fmtTime(c.slot_fin)}</td>
                  <td className="py-2 pr-4">{c.paciente}</td>
                  <td className="py-2 pr-4">{NOMBRE_MED(c.id_medico)}</td>
                  <td className="py-2 pr-4">{NOMBRE_ESP(c.id_especialidad)}</td>
                  <td className="py-2 pr-4">{NOMBRE_CENTRO(MCES.find(m=>m.id_mce===c.id_mce)?.id_centro_medico)}</td>
                  <td className="py-2 pr-4">{c.modalidad}</td>
                  <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-full border ${estadoPill(c.estado_cita)}`}>{c.estado_cita}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length===0 && <div className="text-sm text-slate-500 py-8 text-center">Sin resultados.</div>}
        </div>
      </Card>
    </div>
  )
}

function Pacientes({ citas }:{ citas:any[] }){
  const [q, setQ] = useState('')
  const resumen = useMemo(()=>{
    const map = new Map<string, any>()
    citas.forEach((c:any)=>{
      const key = String(c.id_paciente ?? c.paciente)
      const prev = map.get(key) || { id_paciente:c.id_paciente, paciente:c.paciente, total:0, atendidas:0, ultima:null as Date|null }
      prev.total++
      if(c.estado_cita==='atendida') prev.atendidas++
      const t = new Date(c.slot_inicio)
      if(!prev.ultima || t>prev.ultima) prev.ultima=t
      map.set(key, prev)
    })
    return Array.from(map.values()).sort((a,b)=> (b.ultima?.getTime()||0)-(a.ultima?.getTime()||0))
  }, [citas])
  const data = useMemo(()=> resumen.filter((p:any)=> (p.paciente||'').toLowerCase().includes(q.toLowerCase())), [q, resumen])
  const historialDe = (p:any) => citas.filter((c:any)=> c.id_paciente===p.id_paciente || c.paciente===p.paciente).sort((a,b)=> +new Date(b.slot_inicio)-+new Date(a.slot_inicio))
  const [openId, setOpenId] = useState<string|null>(null)

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h3 className="text-base font-semibold">Mis pacientes</h3>
          <input className="border rounded-lg px-3 py-2 text-sm w-[240px]" placeholder="Buscar por nombre" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Paciente</th>
                <th className="py-2 pr-4">Última atención</th>
                <th className="py-2 pr-4">Citas</th>
                <th className="py-2 pr-4">Atendidas</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p:any)=>(
                <React.Fragment key={p.paciente}>
                  <tr className="border-t">
                    <td className="py-2 pr-4 font-medium">{p.paciente}</td>
                    <td className="py-2 pr-4">{p.ultima ? new Date(p.ultima).toLocaleString() : '-'}</td>
                    <td className="py-2 pr-4">{p.total}</td>
                    <td className="py-2 pr-4">{p.atendidas}</td>
                    <td className="py-2 pr-4"><button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50" onClick={()=>setOpenId(openId===p.paciente?null:p.paciente)}>{openId===p.paciente?'Ocultar':'Ver historial'}</button></td>
                  </tr>
                  {openId===p.paciente && (
                    <tr className="bg-white/50">
                      <td colSpan={5} className="p-3">
                        <div className="text-xs text-slate-600 mb-1">Últimas 10 atenciones</div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {historialDe(p).slice(0,10).map((c:any)=>(
                            <div key={c.id_cita} className="border rounded-lg p-2 text-sm">
                              <div className="font-medium">{new Date(c.slot_inicio).toLocaleString()}</div>
                              <div className="text-xs text-slate-600">Estado: <span className={`px-1.5 py-0.5 rounded-full border ${estadoPill(c.estado_cita)}`}>{c.estado_cita}</span></div>
                              <div className="text-xs text-slate-600">Especialidad: {ESPECIALIDADES.find(e=>e.id_especialidad===c.id_especialidad)?.nombre || c.id_especialidad}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {data.length===0 && <div className="text-sm text-slate-500 py-8 text-center">Sin pacientes.</div>}
        </div>
      </Card>
    </div>
  )
}

const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

export default function MedicoPortal(){
  const [tab, setTab] = useState('dashboard')
  const [centros, setCentros] = useState<any[]>(CENTROS_DEFAULT)
  const [especialidades, setEspecialidades] = useState<any[]>(ESPECIALIDADES_DEFAULT)
  const [medicos, setMedicos] = useState<any[]>(MEDICOS_DEFAULT)
  const [mces, setMces] = useState<any[]>(MCES_DEFAULT)
  const [agendas, setAgendas] = useState(AGENDAS_INI)
  const [citas, setCitas] = useState(CITAS_INI)

  useEffect(()=>{
    const uid = Number(localStorage.getItem('userId')||'0')
    const tryFetch = async (urls:string[]) => { for(const u of urls){ try{ const r=await fetch(u); if(r.ok) return await r.json() }catch{} } return null }
    ;(async()=>{
      const cts = await tryFetch([`${API_BASE}/centros`, `${API_BASE}/catalogos/centros`]); if(Array.isArray(cts)) setCentros(cts)
      const esps = await tryFetch([`${API_BASE}/especialidades`, `${API_BASE}/catalogos/especialidades`]); if(Array.isArray(esps)) setEspecialidades(esps)
      const m = await tryFetch([`${API_BASE}/medicos`, `${API_BASE}/medico/list`]); if(Array.isArray(m)) setMedicos(m)
      const mce = await tryFetch([`${API_BASE}/mce?medicoId=${uid}`, `${API_BASE}/medico/${uid}/mce`]); if(Array.isArray(mce)) setMces(mce)
      const ag = await tryFetch([`${API_BASE}/agendas?medicoId=${uid}`, `${API_BASE}/agenda/medico/${uid}`]); if(Array.isArray(ag)) setAgendas(ag)
      const ci = await tryFetch([`${API_BASE}/citas/medico?medicoId=${uid}`, `${API_BASE}/citas/mias?medicoId=${uid}`]); if(Array.isArray(ci)) setCitas(ci)
    })()
  },[])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Topbar current={tab} setCurrent={setTab} />
      {tab==='dashboard' && <Dashboard citas={citas} />}
      {tab==='agenda' && <Agenda agendas={agendas} setAgendas={setAgendas} citas={citas} />}
      {tab==='espera' && <SalaEspera citas={citas} />}
      {tab==='citas' && <Citas citas={citas} />}
      {tab==='pacientes' && <Pacientes citas={citas} />}
    </div>
  )
}
