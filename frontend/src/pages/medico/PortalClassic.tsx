import React, { useMemo, useState, useEffect } from "react";
import UserMenu from "../../components/UserMenu";
import UserDropdown from "../../components/UserDropdown";

// Utils
const pad = (n:number) => (n < 10 ? `0${n}` : `${n}`);
const toDateOnly = (d:Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addMinutes = (d:Date, mins:number) => new Date(d.getTime() + mins * 60000);
const startOfWeek = (d:Date) => { const c=new Date(d); const shift=(c.getDay()+6)%7; c.setDate(c.getDate()-shift); c.setHours(0,0,0,0); return c;};

type TabId = 'dashboard'|'agenda'|'espera'|'citas'|'pacientes';

// Catálogos mock (idénticos a los que funcionaban)
const CENTROS = [
  { id_centro_medico: 1, nombre: "San Isidro" },
  { id_centro_medico: 2, nombre: "San Miguel" },
  { id_centro_medico: 3, nombre: "Virtual" },
  { id_centro_medico: 4, nombre: "Miraflores" },
  { id_centro_medico: 5, nombre: "Surco" },
];
const ESPECIALIDADES = [
  { id_especialidad: 1, nombre: "Medicina General" },
  { id_especialidad: 2, nombre: "Pediatría" },
  { id_especialidad: 3, nombre: "Cardiología" },
  { id_especialidad: 4, nombre: "Dermatología" },
];
const MEDICOS = [
  { id_medico: 1001, nombre: "Dra. Ana Valdez" },
  { id_medico: 1002, nombre: "Dr. Bruno Rojas" },
  { id_medico: 1003, nombre: "Dra. Carmen Solís" },
  { id_medico: 1005, nombre: "Dra. Elena Matos" },
  { id_medico: 1010, nombre: "Dr. Jorge Vega" },
];
const MCES = [
  { id_mce: 1, id_medico: 1001, id_centro_medico: 1, id_especialidad: 3 },
  { id_mce: 2, id_medico: 1001, id_centro_medico: 3, id_especialidad: 3 },
  { id_mce: 3, id_medico: 1002, id_centro_medico: 2, id_especialidad: 2 },
  { id_mce: 4, id_medico: 1002, id_centro_medico: 3, id_especialidad: 2 },
  { id_mce: 5, id_medico: 1005, id_centro_medico: 2, id_especialidad: 1 },
  { id_mce: 6, id_medico: 1005, id_centro_medico: 3, id_especialidad: 1 },
  { id_mce: 7, id_medico: 1010, id_centro_medico: 5, id_especialidad: 1 },
];
let agendaCounter = 100;
const AGENDAS_INI = [
  { id_agenda: 1, id_mce: 1, tipo_agenda: "recurrente", dia_semana: 1, fecha_unica: null, hora_inicio: "09:00:00", hora_fin: "12:00:00", modalidad: "presencial", intervalo_min: 20, capacidad_slot: 1, fch_inicio_vigencia: "2025-10-01", fch_fin_vigencia: null, estado_agenda: "activo", observaciones: "Cardio Lunes" },
  { id_agenda: 2, id_mce: 3, tipo_agenda: "recurrente", dia_semana: 2, fecha_unica: null, hora_inicio: "15:00:00", hora_fin: "18:00:00", modalidad: "presencial", intervalo_min: 20, capacidad_slot: 1, fch_inicio_vigencia: "2025-10-01", fch_fin_vigencia: null, estado_agenda: "activo", observaciones: "Pedia Martes" },
];
const CITAS_INI = [
  { id_cita: 1, id_paciente: 2001, paciente: "Luis Pérez", id_medico: 1001, id_mce: 1, id_agenda: 1, id_especialidad: 3, slot_inicio: "2025-11-10T09:00:00", slot_fin: "2025-11-10T09:20:00", estado_cita: "reservada", modalidad: "presencial" },
];

const estadoPill = (estado:string) => ({
  reservada: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmada: "bg-blue-100 text-blue-800 border-blue-200",
  cancelada: "bg-red-100 text-red-800 border-red-200 line-through",
  atendida: "bg-green-100 text-green-800 border-green-200",
  no_asistio: "bg-gray-100 text-gray-700 border-gray-200",
}[estado] || "bg-slate-100 text-slate-800 border-slate-200");

const Card = ({children,className=""}:{children:React.ReactNode; className?:string}) => (
  <div className={`bg-white border rounded-2xl shadow-sm ${className}`}>{children}</div>
);

function Topbar({ current, setCurrent }:{ current:TabId; setCurrent:React.Dispatch<React.SetStateAction<TabId>> }){
  const tabs: {id:TabId; label:string}[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "agenda", label: "Agenda" },
    { id: "espera", label: "Sala de espera" },
    { id: "citas", label: "Citas" },
    { id: "pacientes", label: "Pacientes" },
  ];
  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button className="font-semibold" onClick={()=>setCurrent('dashboard')} aria-label="Inicio">
          PRAXIA · Portal Médico
        </button>
        <nav className="flex-1 flex items-center justify-center gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setCurrent(t.id)} className={`px-3 py-1.5 rounded-xl text-sm border ${current===t.id?"bg-black text-white border-black":"bg-white border-slate-300 hover:bg-slate-50"}`}>{t.label}</button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <UserDropdown />
          <UserMenu />
        </div>
      </div>
    </div>
  );
}

function SelectBox({ label, value, onChange, options }:{ label:string; value:any; onChange:(v:any)=>void; options:{value:any; label:string}[]}){
  return (
    <label className="text-sm">
      <div className="mb-1 text-slate-600">{label}</div>
      <select className="w-full border rounded-md px-3 py-2 bg-white" value={value} onChange={(e)=>onChange(Number((e.target as HTMLSelectElement).value))}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function VistaSelector({ view, setView }:{ view:'dia'|'semana'; setView:(v:'dia'|'semana')=>void }){
  return (
    <div className="inline-flex rounded-md border overflow-hidden">
      <button className={`px-3 py-1 text-sm ${view==='dia'?'bg-slate-900 text-white':'bg-white'}`} onClick={()=>setView('dia')}>Día</button>
      <button className={`px-3 py-1 text-sm ${view==='semana'?'bg-slate-900 text-white':'bg-white'}`} onClick={()=>setView('semana')}>Semana</button>
    </div>
  );
}

function SlotPill({ s }:{ s:any }){
  const fmt = (d:Date)=> `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const color = s.estado==='libre' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s.estado==='parcial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <div className={`flex items-center justify-between border rounded-lg px-2 py-1 ${color}`}>
      <div className="text-sm font-medium">{fmt(s.inicio)}–{fmt(s.fin)}</div>
      <div className="text-xs">{s.ocupados}/{s.capacidad}</div>
    </div>
  );
}

function AgendaCalendar({ dias, agendas, generarSlotsParaDia }:{ dias:Date[]; agendas:any[]; generarSlotsParaDia:(a:any,d:string)=>any[] }){
  const labelDia = (d:Date) => d.toLocaleDateString(undefined, { weekday:'short', day:'2-digit', month:'short' });
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {dias.map((d, idx) => {
          const slots = agendas.flatMap(a => generarSlotsParaDia(a, toDateOnly(d)));
          return (
            <div key={idx} className="border rounded-xl p-3">
              <div className="text-sm font-medium mb-2">{labelDia(d)}</div>
              <div className="space-y-2">
                {slots.map((s, i) => <SlotPill key={i} s={s} />)}
                {slots.length===0 && <div className="text-xs text-slate-400">Sin horarios</div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center"><span className="w-3 h-3 rounded-full inline-block mr-2 bg-emerald-500"></span>Libre</span>
        <span className="inline-flex items-center"><span className="w-3 h-3 rounded-full inline-block mr-2 bg-amber-500"></span>Parcial</span>
        <span className="inline-flex items-center"><span className="w-3 h-3 rounded-full inline-block mr-2 bg-rose-500"></span>Lleno</span>
      </div>
    </Card>
  );
}

function Agenda({ agendas, setAgendas, citas }:{agendas:any[]; setAgendas:(fn:any)=>void; citas:any[]}){
  const [centroId, setCentroId] = useState(1);
  const [espId, setEspId] = useState(3);
  const mces = useMemo(() => MCES.filter(m => m.id_centro_medico===centroId && m.id_especialidad===espId), [centroId, espId]);
  const [mceId, setMceId] = useState(mces[0]?.id_mce || 1);
  useEffect(()=>{ if (mces.length) setMceId(mces[0].id_mce); }, [centroId, espId]);

  const [view, setView] = useState<'dia'|'semana'>("semana");
  const [fechaBase, setFechaBase] = useState("2025-11-10");
  const agendasCtx = useMemo(() => agendas.filter(a => a.id_mce === mceId && a.estado_agenda === "activo"), [agendas, mceId]);

  function generarSlotsParaDia(agenda:any, dateISO:string){
    const d = new Date(dateISO+"T00:00:00");
    const f0 = new Date(agenda.fch_inicio_vigencia+"T00:00:00");
    const f1 = agenda.fch_fin_vigencia ? new Date(agenda.fch_fin_vigencia+"T00:00:00") : null;
    if (d < f0) return [];
    if (f1 && d >= f1) return [];
    const dow = ((d.getDay()+6)%7)+1;
    if (agenda.tipo_agenda==='recurrente' && agenda.dia_semana !== dow) return [];
    if (agenda.tipo_agenda==='puntual' && agenda.fecha_unica !== dateISO) return [];
    const [hiH, hiM] = agenda.hora_inicio.split(":").map(Number);
    const [hfH, hfM] = agenda.hora_fin.split(":").map(Number);
    const start = new Date(`${dateISO}T${pad(hiH)}:${pad(hiM)}:00`);
    const end   = new Date(`${dateISO}T${pad(hfH)}:${pad(hfM)}:00`);
    const slots:any[] = [];
    for (let t=new Date(start); t<end; t=addMinutes(t, agenda.intervalo_min)){
      const inicio = new Date(t);
      const fin = addMinutes(inicio, agenda.intervalo_min);
      const ocupados = citas.filter(c => c.id_agenda===agenda.id_agenda && +new Date(c.slot_inicio)>=+inicio && +new Date(c.slot_inicio)<+fin && c.estado_cita!=="cancelada").length;
      const cap = agenda.capacidad_slot;
      const estado = ocupados >= cap ? "lleno" : ocupados>0 ? "parcial" : "libre";
      slots.push({ inicio, fin, capacidad: cap, ocupados, estado });
    }
    return slots;
  }

  const fechaRef = new Date(fechaBase+"T00:00:00");
  const dias = useMemo(()=> view==='dia' ? [fechaRef] : Array.from({length:7}, (_,i)=> new Date(startOfWeek(fechaRef).getTime()+i*86400000)), [view, fechaBase]);

  function crearEjemplo(){ setAgendas((prev:any[]) => [...prev, { id_agenda: ++agendaCounter, id_mce:mceId, tipo_agenda:'recurrente', dia_semana:1, fecha_unica:null, hora_inicio:'09:00:00', hora_fin:'12:00:00', modalidad:'presencial', intervalo_min:20, capacidad_slot:1, fch_inicio_vigencia:toDateOnly(new Date()), fch_fin_vigencia:null, estado_agenda:'activo', observaciones:'' }]) }

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-4 lg:col-span-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <SelectBox label="Centro" value={centroId} onChange={setCentroId} options={CENTROS.map(c=>({value:c.id_centro_medico,label:c.nombre}))} />
          <SelectBox label="Especialidad" value={espId} onChange={setEspId} options={ESPECIALIDADES.map(e=>({value:e.id_especialidad,label:e.nombre}))} />
          <SelectBox label="MCE" value={mceId} onChange={setMceId} options={MCES.filter(m=>m.id_centro_medico===centroId && m.id_especialidad===espId).map(m=>({ value:m.id_mce, label: MEDICOS.find(x=>x.id_medico===m.id_medico)?.nombre || `MCE ${m.id_mce}` }))} />
          <div className="flex gap-2"><VistaSelector view={view} setView={setView} /><input type="date" value={fechaBase} onChange={(e)=>setFechaBase((e.target as HTMLInputElement).value)} className="border rounded-md px-3 py-2 text-sm" /></div>
          <div className="text-xs text-slate-600">Contexto MCE: #{mceId}</div>
        </div>
      </Card>

      <Card className="p-4 lg:col-span-2"><AgendaCalendar dias={dias} agendas={agendasCtx} generarSlotsParaDia={generarSlotsParaDia} /></Card>

      <Card className="p-4"><h3 className="text-base font-semibold mb-2">Agregar horario</h3><button className="w-full rounded-md bg-slate-900 text-white py-2 hover:bg-slate-800" onClick={crearEjemplo}>Agregar ejemplo</button></Card>
    </div>
  );
}

function Dashboard({ citas }:{ citas:any[] }){
  const upcoming = useMemo(() => [...citas].sort((a,b)=> +new Date(a.slot_inicio)-+new Date(b.slot_inicio)).slice(0,6), [citas]);
  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-4">
        <h3 className="text-base font-semibold mb-2">Próximas citas</h3>
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
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-base font-semibold mb-2">Accesos rápidos</h3>
        <div className="grid grid-cols-2 gap-3">
          {["Crear agenda","Bloquear franja","Ver sala","Reporte semanal"].map(a => (
            <button key={a} className="border rounded-xl px-3 py-3 text-sm hover:bg-slate-50 text-left">{a}</button>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function MedicoPortal(){
  const [tab, setTab] = useState<'dashboard'|'agenda'|'espera'|'citas'|'pacientes'>('dashboard');
  const [agendas, setAgendas] = useState<any[]>(AGENDAS_INI);
  const [citas] = useState<any[]>(CITAS_INI);
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Topbar current={tab} setCurrent={setTab} />
      <div className="max-w-7xl mx-auto px-4 flex gap-4">
        <aside className="hidden md:block w-56 shrink-0 py-6">
          <nav className="flex flex-col gap-2">
            <a className={`px-3 py-2 rounded-lg border text-sm ${tab==='dashboard'?'bg-black text-white border-black':'bg-white border-slate-300 hover:bg-slate-50'}`} onClick={()=>setTab('dashboard')}>Inicio</a>
            <a className={`px-3 py-2 rounded-lg border text-sm ${tab==='agenda'?'bg-black text-white border-black':'bg-white border-slate-300 hover:bg-slate-50'}`} onClick={()=>setTab('agenda')}>Agenda</a>
            <a className={`px-3 py-2 rounded-lg border text-sm ${tab==='espera'?'bg-black text-white border-black':'bg-white border-slate-300 hover:bg-slate-50'}`} onClick={()=>setTab('espera')}>Sala de espera</a>
            <a className={`px-3 py-2 rounded-lg border text-sm ${tab==='citas'?'bg-black text-white border-black':'bg-white border-slate-300 hover:bg-slate-50'}`} onClick={()=>setTab('citas')}>Citas</a>
            <a className={`px-3 py-2 rounded-lg border text-sm ${tab==='pacientes'?'bg-black text-white border-black':'bg-white border-slate-300 hover:bg-slate-50'}`} onClick={()=>setTab('pacientes')}>Pacientes</a>
          </nav>
        </aside>
        <main className="flex-1 py-6">
          {tab==='dashboard' && <Dashboard citas={citas} />}
          {tab==='agenda' && <Agenda agendas={agendas} setAgendas={setAgendas} citas={citas} />}
          {tab==='espera' && <div className="max-w-7xl mx-auto"><Card className="p-4">Selecciona Agenda para ver sala de espera (demo)</Card></div>}
          {tab==='citas' && <div className="max-w-7xl mx-auto"><Card className="p-4">Citas (demo)</Card></div>}
          {tab==='pacientes' && <div className="max-w-7xl mx-auto"><Card className="p-4">Pacientes (demo)</Card></div>}
        </main>
      </div>
    </div>
  );
}
