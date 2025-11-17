// Mock data and helpers for appointment flow
export type Especialidad = { id: number; nombre: string }
export type Centro = { id: number; nombre: string; distrito: string }
export type Medico = { id: number; nombre: string; especialidades: number[]; centros: number[] }
export type Agenda = {
  id: number
  id_medico: number
  id_centro?: number | null
  modalidad: 'presencial' | 'virtual'
  dia_semana?: number | null
  fecha_unica?: string | null
  hora_inicio: string
  hora_fin: string
  intervalo_min: number
  capacidad_slot: number
}
export type Slot = { agendaId: number; inicio: string; fin: string; capacidad: number; ocupados: number }

export const ESPECIALIDADES: Especialidad[] = [
  { id: 1, nombre: 'Odontología' },
  { id: 2, nombre: 'Pediatría' },
  { id: 3, nombre: 'Medicina Interna' },
]

export const CENTROS: Centro[] = [
  { id: 10, nombre: 'Clínica San Juan de Lurigancho (I-2)', distrito: 'SJL' },
  { id: 11, nombre: 'Clínica Primavera Surco', distrito: 'Surco' },
  { id: 12, nombre: 'Consulta Virtual (Telemedicina)', distrito: 'Online' },
]

export const MEDICOS: Medico[] = [
  { id: 100, nombre: 'Díaz Mercado, Christian', especialidades: [1], centros: [10, 11] },
  { id: 101, nombre: 'Valdivia Cámara, Lineth', especialidades: [1], centros: [11] },
  { id: 102, nombre: 'Rosa Alcalá Mendez', especialidades: [3, 2], centros: [10, 12] },
]

export const AGENDAS: Agenda[] = [
  { id: 500, id_medico: 100, id_centro: 10, modalidad: 'presencial', dia_semana: 5, hora_inicio: '09:00', hora_fin: '12:00', intervalo_min: 20, capacidad_slot: 1 },
  { id: 501, id_medico: 100, id_centro: 11, modalidad: 'presencial', dia_semana: 6, hora_inicio: '10:00', hora_fin: '13:00', intervalo_min: 20, capacidad_slot: 1 },
  { id: 502, id_medico: 101, id_centro: 11, modalidad: 'presencial', dia_semana: 5, hora_inicio: '08:30', hora_fin: '11:30', intervalo_min: 20, capacidad_slot: 1 },
  { id: 503, id_medico: 102, id_centro: 12, modalidad: 'virtual', dia_semana: 2, hora_inicio: '15:00', hora_fin: '17:00', intervalo_min: 20, capacidad_slot: 1 },
]

function pad(n: number) { return String(n).padStart(2, '0') }

export function nextDateForWeekday(weekday: number): string {
  const base = new Date();
  const current = base.getDay() === 0 ? 7 : base.getDay();
  const diff = (weekday - current + 7) % 7;
  base.setDate(base.getDate() + diff);
  base.setHours(0, 0, 0, 0);
  return base.toISOString();
}

export function generateSlotsFromAgenda(a: Agenda): Slot[] {
  const daysToGenerate = 14;
  const out: Slot[] = [];
  for (let i = 0; i < daysToGenerate; i++) {
    let dateISO: string | null = null;
    if (a.fecha_unica) {
      const d0 = new Date(a.fecha_unica); d0.setHours(0, 0, 0, 0); dateISO = d0.toISOString();
    } else if (a.dia_semana) {
      if (i === 0) dateISO = nextDateForWeekday(a.dia_semana);
      else {
        const first = new Date(nextDateForWeekday(a.dia_semana));
        first.setDate(first.getDate() + 7 * Math.floor(i / 7));
        dateISO = first.toISOString();
      }
    }
    if (!dateISO) continue;
    const [hIni, mIni] = a.hora_inicio.split(':').map(Number);
    const [hFin, mFin] = a.hora_fin.split(':').map(Number);
    const start = new Date(dateISO); start.setHours(hIni, mIni, 0, 0);
    const end = new Date(dateISO); end.setHours(hFin, mFin, 0, 0);
    for (let t = new Date(start); t < end; t.setMinutes(t.getMinutes() + a.intervalo_min)) {
      const t2 = new Date(t); t2.setMinutes(t2.getMinutes() + a.intervalo_min);
      out.push({ agendaId: a.id, inicio: t.toISOString(), fin: t2.toISOString(), capacidad: a.capacidad_slot, ocupados: 0 });
    }
  }
  return out;
}

export async function fetchEspecialidades(q?: string) {
  if (!q) return ESPECIALIDADES;
  return ESPECIALIDADES.filter(e => e.nombre.toLowerCase().includes(q.toLowerCase()));
}
export async function fetchCentrosPorEspecialidad(idEsp: number) {
  const centrosIds = new Set<number>();
  MEDICOS.forEach(m => { if (m.especialidades.includes(idEsp)) m.centros.forEach(c => centrosIds.add(c)); });
  return CENTROS.filter(c => centrosIds.has(c.id));
}
export async function fetchMedicos(params: { idEspecialidad?: number; idCentro?: number; q?: string }) {
  let arr = MEDICOS.slice();
  if (params.idEspecialidad) arr = arr.filter(m => m.especialidades.includes(params.idEspecialidad!));
  if (params.idCentro) arr = arr.filter(m => m.centros.includes(params.idCentro!));
  const query = params.q ? params.q.toLowerCase() : '';
  if (query) arr = arr.filter(m => m.nombre.toLowerCase().includes(query));
  return arr;
}
export async function fetchSlots(params: { idMedico: number; idCentro?: number | null; modalidad: 'presencial' | 'virtual' }) {
  const agendas = AGENDAS.filter(a => a.id_medico === params.idMedico && a.modalidad === params.modalidad && (params.idCentro ? a.id_centro === params.idCentro : true));
  return agendas.flatMap(a => generateSlotsFromAgenda(a));
}

export function groupSlotsByDate(slots: Slot[]) {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const d = new Date(s.inicio); d.setHours(0,0,0,0);
    const key = d.toISOString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  for (const arr of map.values()) arr.sort((a,b)=> +new Date(a.inicio) - +new Date(b.inicio));
  return Array.from(map.entries()).sort((a,b)=> +new Date(a[0]) - +new Date(b[0]));
}

export function formatTime(iso: string) {
  const d = new Date(iso); const hh = String(d.getHours()).padStart(2,'0'); const mm = String(d.getMinutes()).padStart(2,'0');
  return `${hh}:${mm}`;
}
