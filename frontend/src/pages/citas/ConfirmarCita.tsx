import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CitasStepper from '../../components/CitasStepper'
import CitasLayout from '../../components/CitasLayout'
import { getDraft, resetDraft, savePendingPaymentSession } from '../../shared/citaDraft'

export default function ConfirmarCita() {
  const navigate = useNavigate()
  const labels = ['Especialidad', 'Centro médico', 'Médico', 'Fecha y Hora', 'Confirmar']
  const draft = getDraft()
  const [motivo, setMotivo] = useState('Consulta general')
  const [loading, setLoading] = useState(false)
  const [resumenSlot, setResumenSlot] = useState<any>(null)
  const [alerta, setAlerta] = useState<string | null>(null)
  const [modal, setModal] = useState<{ idCita: number; ttl: number; resumen: any } | null>(null)

  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  useEffect(() => {
    async function loadResumen() {
      if (!draft.slotId) return
      try {
        const res = await fetch(`${API_BASE}/citas/slots/${draft.slotId}/resumen`)
        if (res.ok) {
          setResumenSlot(await res.json())
        }
      } catch (e) {
        console.error('No se pudo cargar el resumen', e)
      }
    }
    loadResumen()
  }, [draft.slotId, API_BASE])

  const resumenLocal = useMemo(() => {
    const fecha = draft.slotFecha ? new Date(`${draft.slotFecha}T00:00:00`) : null
    const fechaTexto = fecha ? fecha.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : draft.slotFecha
    return {
      especialidad: draft.especialidadNombre,
      centro: draft.centroNombre,
      direccion: resumenSlot?.direccion || draft.centroDireccion,
      distrito: resumenSlot?.distrito || draft.centroUbicacion,
      medico: draft.medicoNombre,
      fecha: fechaTexto,
      fechaIso: draft.slotFecha,
      horaInicio: draft.slotHoraInicio?.substring(0, 5),
      horaFin: draft.slotHoraFin?.substring(0, 5),
      costoMonto: draft.costoMonto,
      moneda: draft.costoMoneda,
      motivo,
      telefono: draft.centroTelefono,
    }
  }, [draft, resumenSlot, motivo])

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    if (!draft.slotId || !draft.pacienteId) {
      setAlerta('Completa los pasos previos antes de confirmar la reserva')
      return
    }
    setLoading(true)
    setAlerta(null)
    try {
      const body = {
        pacienteId: draft.pacienteId,
        usuarioId: Number(localStorage.getItem('userId') || 0),
        motivo,
      }
      const res = await fetch(`${API_BASE}/citas/slots/${draft.slotId}/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => 'No se pudo reservar el horario')
        setAlerta(txt || 'No se pudo reservar el horario')
        return
      }
      const data = await res.json()
      const resumen = {
        especialidad: data.resumen?.especialidad || resumenLocal.especialidad,
        centro: data.resumen?.centro || resumenLocal.centro,
        direccion: data.resumen?.centro_direccion || resumenLocal.direccion,
        distrito: data.resumen?.distrito || resumenLocal.distrito,
        provincia: data.resumen?.provincia,
        departamento: data.resumen?.departamento,
        medico: data.resumen?.medico || resumenLocal.medico,
        fecha: data.resumen?.fecha || resumenLocal.fecha,
        fechaIso: data.resumen?.fecha || resumenLocal.fechaIso,
        horaInicio: (data.resumen?.hora_inicio || resumenLocal.horaInicio || '').substring(0, 5),
        horaFin: (data.resumen?.hora_fin || resumenLocal.horaFin || '').substring(0, 5),
        costoMonto: Number(data.monto ?? resumenLocal.costoMonto ?? 0),
        moneda: data.moneda || resumenLocal.moneda || 'PEN',
        motivo,
        telefono: data.resumen?.telefono || resumenLocal.telefono,
      }
      savePendingPaymentSession({ idCita: data.id_cita, ttlMinutos: data.ttl_minutos ?? 20, resumen })
      setModal({ idCita: data.id_cita, ttl: data.ttl_minutos ?? 20, resumen })
    } catch (error) {
      setAlerta('Error de conexión al reservar la cita')
    } finally {
      setLoading(false)
    }
  }

  const instrucciones = ['Llegar 15 minutos antes', 'Traer DNI y seguro médico', 'Cancelar con 24 horas de anticipación']

  const handleIrPago = () => {
    if (modal) {
      resetDraft()
      navigate(`/citas/pago?id=${modal.idCita}`)
    }
  }

  const handleIrInicio = () => {
    resetDraft()
    navigate('/home')
  }

  return (
    <CitasLayout>
      <form className="mx-auto max-w-5xl space-y-5" onSubmit={confirmar}>
        <CitasStepper current={4} labels={labels} />
        <header className="text-center">
          <p className="text-sm text-text-secondary">Paso final · Revisa tus datos</p>
          <h2 className="text-2xl font-semibold">Confirma tu cita</h2>
        </header>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">Resumen de cita</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <p className="text-text-secondary">Especialidad</p>
              <p className="font-semibold text-text-primary">{resumenLocal.especialidad}</p>
            </div>
            <div>
              <p className="text-text-secondary">Médico</p>
              <p className="font-semibold text-text-primary">{resumenLocal.medico}</p>
            </div>
            <div>
              <p className="text-text-secondary">Fecha</p>
              <p className="font-semibold text-text-primary">{resumenLocal.fecha}</p>
            </div>
            <div>
              <p className="text-text-secondary">Horario</p>
              <p className="font-semibold text-text-primary">{resumenLocal.horaInicio} - {resumenLocal.horaFin}</p>
            </div>
            <div>
              <p className="text-text-secondary">Costo</p>
              <p className="font-semibold text-text-primary">S/ {resumenLocal.costoMonto?.toFixed(2)} {resumenLocal.moneda}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-background-light/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">Dirección</p>
          <p className="mt-2 font-semibold text-text-primary">{resumenLocal.centro}</p>
          <p className="text-sm text-text-secondary">{resumenLocal.direccion}</p>
          <p className="text-sm text-text-secondary">{resumenLocal.distrito}</p>
          {resumenLocal.telefono && <p className="text-sm text-text-secondary">Tel: {resumenLocal.telefono}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">Motivo de consulta</label>
          <textarea
            className="mt-2 w-full rounded-2xl border bg-white/70 px-4 py-3 text-sm"
            rows={3}
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
          />
        </div>

        <div className="rounded-3xl border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">Instrucciones</p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-text-secondary">
            {instrucciones.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {alerta && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{alerta}</div>}

        <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
          <button type="button" className="rounded-full border px-6 py-2 text-sm" onClick={() => navigate('/citas/horario')}>
            Volver
          </button>
          <button type="submit" className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={loading}>
            {loading ? 'Reservando…' : 'Reservar cita'}
          </button>
        </div>
      </form>

      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-600">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-emerald-600">Cita reservada correctamente</p>
                <p className="text-xs text-text-secondary">ID #{modal.idCita} · recuerda confirmar el pago antes de {modal.ttl} min</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-semibold text-text-primary">{modal.resumen.especialidad}</p>
              <p className="text-text-secondary">{modal.resumen.centro}</p>
              <p className="text-text-secondary">{modal.resumen.fecha} · {modal.resumen.horaInicio} - {modal.resumen.horaFin}</p>
              <p className="text-text-secondary">Médico: {modal.resumen.medico}</p>
              <p className="text-text-secondary">Costo: S/ {modal.resumen.costoMonto?.toFixed(2)} {modal.resumen.moneda}</p>
              <div className="rounded-2xl bg-background-light/60 p-3 text-xs text-text-secondary">
                <p>{modal.resumen.direccion}</p>
                {modal.resumen.distrito && <p>{modal.resumen.distrito}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">Motivo</p>
                <p className="text-sm text-text-primary">{modal.resumen.motivo}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-xs text-text-secondary">
                <p>• Llega 15 minutos antes</p>
                <p>• Lleva tu documento y seguro</p>
                <p>• Puedes cancelar sin costo hasta 24h antes</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button className="rounded-full border px-5 py-2 text-sm" onClick={handleIrInicio}>Volver al inicio</button>
              <button className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white" onClick={handleIrPago}>
                Pagar y confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </CitasLayout>
  )
}
