import React, { useEffect, useMemo, useState } from "react";
import { Plus, CalendarClock, Video, MapPin, User2, ChevronDown, Loader2, Filter, History, CalendarDays } from "lucide-react";

export default function MyAppointments() {
  const [tab, setTab] = useState<"proximas" | "historial">("proximas");
  const [loading, setLoading] = useState(true);
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<"all" | "presencial" | "virtual">("all");
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [p, a] = await Promise.all([fetchPatients(), fetchAppointments()]);
      if (!mounted) return;
      setPatients([{ id: "all", label: "Todas las citas" }, ...p]);
      setAppointments(a);
      setLoading(false);
    })();
    return () => { mounted = false };
  }, []);

  const filtered = useMemo(() => {
    return appointments
      .filter(a => (tab === "proximas" ? a.isUpcoming : !a.isUpcoming))
      .filter(a => (patientFilter === "all" ? true : a.patientId === patientFilter))
      .filter(a => (modeFilter === "all" ? true : a.modality === modeFilter))
      .sort((x, y) => new Date(x.start).getTime() - new Date(y.start).getTime());
  }, [appointments, tab, patientFilter, modeFilter]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex">
        <aside className="hidden md:flex h-screen w-14 flex-col items-center gap-6 border-r bg-white pt-6">
          <div className="h-9 w-9 rounded-xl bg-emerald-100 grid place-content-center">
            <span className="text-emerald-600 font-bold text-lg">+</span>
          </div>
          <NavIcon title="Inicio" icon={<CalendarDays size={20} />} />
          <NavIcon title="Historial" icon={<History size={20} />} />
          <NavIcon title="Pacientes" icon={<User2 size={20} />} />
        </aside>

        <main className="flex-1">
          <header className="flex items-center justify-between px-6 py-5">
            <h1 className="text-xl md:text-2xl font-semibold">Mis citas</h1>
            <a href="/citas" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700 active:scale-[.99]">
              <Plus size={18} />
              <span className="hidden sm:inline">Sacar cita</span>
            </a>
          </header>

          <section className="px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
              <div className="inline-flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Paciente</span>
                <Dropdown value={patientFilter} onChange={setPatientFilter} options={patients} />
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Filtro</span>
                <Pill active={modeFilter === "all"} onClick={() => setModeFilter("all")}>Todo</Pill>
                <Pill active={modeFilter === "presencial"} onClick={() => setModeFilter("presencial")}>Presencial</Pill>
                <Pill active={modeFilter === "virtual"} onClick={() => setModeFilter("virtual")}>Virtual</Pill>
              </div>
            </div>
          </section>

          <nav className="mt-6 border-b px-6">
            <button className={`mr-6 pb-3 text-sm font-medium ${tab === "proximas" ? "border-b-2 border-emerald-500 text-emerald-700" : "text-slate-500 hover:text-slate-700"}`} onClick={() => setTab("proximas")}>PRÓXIMAS</button>
            <button className={`pb-3 text-sm font-medium ${tab === "historial" ? "border-b-2 border-emerald-500 text-emerald-700" : "text-slate-500 hover:text-slate-700"}`} onClick={() => setTab("historial")}>HISTORIAL</button>
          </nav>

          <section className="px-6 py-6">
            {loading ? (
              <div className="grid place-content-center py-24 text-slate-500">
                <Loader2 className="mx-auto mb-3 animate-spin" />
                Cargando...
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState mode={modeFilter} tab={tab} />
            ) : (
              <div className="grid gap-4">
                {filtered.map(a => (
                  <AppointmentCard key={a.id} appt={a} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function NavIcon({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="group" title={title}>
      <div className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">{icon}</div>
    </div>
  );
}

function Pill({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>{children}</button>
  );
}

function Dropdown({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: PatientOption[] }) {
  return (
    <div className="relative inline-flex">
      <select className="appearance-none rounded-lg border bg-white px-3 py-2 pr-8 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(opt => (<option key={opt.id} value={opt.id}>{opt.label}</option>))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
    </div>
  );
}

function StatusBadge({ status }: { status: AppointmentDTO["status"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    reservada: { label: "Reservada", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
    confirmada: { label: "Confirmada", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    cancelada: { label: "Cancelada", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
    atendida: { label: "Atendida", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
    no_asistio: { label: "No asistió", cls: "bg-slate-100 text-slate-700 ring-slate-300" }
  } as const;
  const s = map[status];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${s.cls}`}>{s.label}</span>;
}

function AppointmentCard({ appt }: { appt: AppointmentDTO }) {
  const d = new Date(appt.start);
  const hh = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const day = d.toLocaleDateString([], { weekday: "long", day: "2-digit", month: "short" });

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-content-center rounded-xl bg-indigo-50 text-indigo-600"><CalendarClock size={20} /></div>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <strong>{appt.doctor}</strong>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">{appt.specialty}</span>
            <span className="text-slate-400">•</span>
            <StatusBadge status={appt.status} />
          </div>
          <div className="mt-1 text-sm text-slate-600">{day} · {hh} ({appt.duration} min)</div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><MapPin size={14} /> {appt.center}</span>
            {appt.modality === "virtual" ? (
              <span className="inline-flex items-center gap-1"><Video size={14} /> Virtual</span>
            ) : (
              <span className="inline-flex items-center gap-1"><Filter size={14} /> Presencial</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {appt.isUpcoming && (<button className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">Reprogramar</button>)}
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800">Detalle</button>
      </div>
    </div>
  );
}

function EmptyState({ mode, tab }: { mode: string; tab: string }) {
  return (
    <div className="grid place-content-center rounded-xl border border-dashed bg-white p-10 text-center text-slate-500">
      <p className="mb-2 font-medium">No hay citas {tab === "proximas" ? "próximas" : "en el historial"} para el filtro seleccionado.</p>
      <p className="text-sm">Modo: {mode}</p>
    </div>
  );
}

type AppointmentDTO = {
  id: string;
  patientId: string;
  patientName: string;
  doctor: string;
  specialty: string;
  center: string;
  modality: "presencial" | "virtual";
  status: "reservada" | "confirmada" | "cancelada" | "atendida" | "no_asistio";
  start: string;
  duration: number;
  isUpcoming: boolean;
};

type PatientOption = { id: string; label: string };

async function fetchPatients(): Promise<PatientOption[]> {
  await sleep(200);
  return [
    { id: "p2", label: "Juan Pérez" },
    { id: "p3", label: "Luis Pérez" },
    { id: "p7", label: "María Díaz" },
  ];
}

async function fetchAppointments(): Promise<AppointmentDTO[]> {
  await sleep(300);
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const addMin = (m: number) => new Date(now.getTime() + m * 60_000);
  return [
    { id: "1", patientId: "p2", patientName: "Juan Pérez", doctor: "Dra. Ana Valdez", specialty: "Cardiología", center: "Sede San Isidro", modality: "presencial", status: "reservada", start: iso(addMin(60)), duration: 20, isUpcoming: true },
    { id: "2", patientId: "p2", patientName: "Juan Pérez", doctor: "Dr. Bruno Rojas", specialty: "Pediatría", center: "Sede San Miguel", modality: "virtual", status: "confirmada", start: iso(addMin(240)), duration: 20, isUpcoming: true },
    { id: "3", patientId: "p3", patientName: "Luis Pérez", doctor: "Dra. Ana Valdez", specialty: "Cardiología", center: "Sede San Isidro", modality: "presencial", status: "cancelada", start: iso(addMin(-60 * 24)), duration: 20, isUpcoming: false },
    { id: "4", patientId: "p7", patientName: "María Díaz", doctor: "Dr. Bruno Rojas", specialty: "Pediatría", center: "Centro Virtual", modality: "virtual", status: "atendida", start: iso(addMin(-60 * 48)), duration: 20, isUpcoming: false },
  ];
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

