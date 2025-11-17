import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CitasStepper from '../../components/CitasStepper'
import CitasLayout from '../../components/CitasLayout'
import { getDraft, setDraft } from '../../shared/citaDraft'

type AgendaItem = {
  id_agenda: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  slots_disponibles: number
}

type SlotItem = {
  id_slot: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  disponibles: number
  std_slot: string
}

const formatTime = (time?: string) => (time ? time.substring(0, 5) : '')
const formatDate = (fecha: string) => {
  const d = new Date(`${fecha}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short' })
}

export default function SelectHorario() {
  const navigate = useNavigate()
  const labels = ['Especialidad', 'Centro médico', 'Médico', 'Fecha y Hora', 'Confirmar']
  const draft = getDraft()
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [slots, setSlots] = useState<SlotItem[]>([])
  const [agendaSel, setAgendaSel] = useState<AgendaItem | null>(null)
  const [slotSel, setSlotSel] = useState<SlotItem | null>(null)

  useEffect(() => {
    async function loadAgendas() {
      if (!draft.mceId) { setAgendas([]); return }
      const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
      try {
        const res = await fetch(`${API_BASE}/citas/mce/${draft.mceId}/agendas`)
        if (res.ok) {
          const data = await res.json() as AgendaItem[]
          setAgendas(data)
          return
        }
      } catch (e) {
        console.error('Error cargando agendas', e)
      }
      setAgendas([])
    }
    loadAgendas()
  }, [draft.mceId])

  async function selectAgenda(item: AgendaItem) {
    setAgendaSel(item)
    setSlotSel(null)
    if (!item) { setSlots([]); return }
    const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
    try {
      const url = new URL(`/citas/agendas/${item.id_agenda}/slots`, API_BASE)
      url.searchParams.set('fecha', item.fecha)
      const res = await fetch(url.toString())
      if (res.ok) {
        const data = await res.json() as SlotItem[]
        setSlots(data)
        return
      }
    } catch (e) {
      console.error('Error cargando slots', e)
    }
    setSlots([])
  }

  function selectSlot(slot: SlotItem) {
    setSlotSel(slot)
    setDraft({
      idAgenda: agendaSel?.id_agenda,
      slotId: slot.id_slot,
      slotFecha: slot.fecha,
      slotHoraInicio: slot.hora_inicio,
      slotHoraFin: slot.hora_fin,
    })
  }

  return (
    <CitasLayout>
      <div className="mx-auto max-w-5xl">
        <CitasStepper current={3} labels={labels} />
        <h2 className="mb-4 text-center text-xl font-semibold">Selecciona fecha y hora</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">Fechas disponibles</p>
            <div className="space-y-2">
              {agendas.map(item => (
                <button
                  key={item.id_agenda}
                  onClick={() => selectAgenda(item)}
                  className={`w-full rounded-xl border p-3 text-left text-sm capitalize ${agendaSel?.id_agenda === item.id_agenda ? 'border-primary bg-primary/5' : ''}`}
                >
                  <p className="font-semibold">{formatDate(item.fecha)}</p>
                  <p className="text-xs text-text-secondary">{item.slots_disponibles} horarios</p>
                </button>
              ))}
              {agendas.length === 0 && <div className="rounded-xl border p-4 text-center text-xs text-text-secondary">No hay agendas habilitadas</div>}
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">Horarios</p>
            {agendaSel ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {slots.map(slot => (
                  <button
                    key={slot.id_slot}
                    disabled={slot.disponibles <= 0}
                    onClick={() => selectSlot(slot)}
                    className={`rounded-xl border px-4 py-3 text-sm ${slotSel?.id_slot === slot.id_slot ? 'border-primary bg-primary/10' : ''} ${slot.disponibles <= 0 ? 'cursor-not-allowed opacity-40' : 'hover:border-primary'}`}
                  >
                    <p className="font-semibold">{formatTime(slot.hora_inicio)}</p>
                    <p className="text-xs text-text-secondary">Disponibles: {slot.disponibles}</p>
                  </button>
                ))}
                {slots.length === 0 && <div className="rounded-xl border p-4 text-center text-xs text-text-secondary">Selecciona una fecha</div>}
              </div>
            ) : (
              <div className="rounded-xl border p-6 text-center text-sm text-text-secondary">Elige primero una fecha</div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <button className="rounded-md bg-primary px-4 py-2 text-white disabled:opacity-50" onClick={() => slotSel && navigate('/citas/confirmar')} disabled={!slotSel}>Siguiente paso</button>
        </div>
      </div>
    </CitasLayout>
  )
}
