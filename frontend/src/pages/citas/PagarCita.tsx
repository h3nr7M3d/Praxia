import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CitasLayout from '../../components/CitasLayout'
import CitasStepper from '../../components/CitasStepper'
import {
  readPendingPaymentSession,
  clearPendingPaymentSession,
  saveConfirmedCitaMessage,
  type PendingPaymentSession,
  type CitaResumenPreview
} from '../../shared/citaDraft'

const paymentOptions = [
  { value: 'TARJETA', label: 'Tarjeta crédito / débito', detalle: 'Visa · Mastercard · Amex', badges: ['Visa', 'Mastercard', 'Amex'] },
  { value: 'BILLETERA', label: 'Billetera digital', detalle: 'Yape · Plin', badges: ['Yape', 'Plin'] },
  { value: 'EFECTIVO', label: 'Efectivo en clínica', detalle: 'Pagarás al llegar a la sede', badges: [] },
]

export default function PagarCita() {
  const navigate = useNavigate()
  const loc = useLocation()
  const params = new URLSearchParams(loc.search)
  const queryId = params.get('id')
  const labels = ['Especialidad', 'Centro médico', 'Médico', 'Fecha y Hora', 'Confirmar']
  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  const [pending, setPending] = useState<PendingPaymentSession | null>(() => readPendingPaymentSession())
  const [summary, setSummary] = useState<CitaResumenPreview | null>(() => readPendingPaymentSession()?.resumen ?? null)
  const [method, setMethod] = useState('TARJETA')
  const [terms, setTerms] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() => (readPendingPaymentSession()?.ttlMinutos ?? Number(params.get('ttl') || 20)) * 60)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!pending && queryId) {
      // intentar cargar resumen desde backend para permitir reanudar
      fetch(`${API_BASE}/citas/${queryId}/resumen`).then(async res => {
        if (res.ok) {
          const data = await res.json()
          const resumen: CitaResumenPreview = {
            especialidad: data.especialidad,
            centro: data.centro,
            direccion: data.centro_direccion,
            distrito: data.distrito,
            provincia: data.provincia,
            departamento: data.departamento,
            medico: data.medico,
            fecha: data.fecha,
            horaInicio: data.hora_inicio?.substring(0, 5),
            horaFin: data.hora_fin?.substring(0, 5),
            costoMonto: Number(data.monto ?? data.tarifa ?? 0),
            moneda: data.moneda || data.cod_moneda || 'PEN',
            motivo: data.motivo,
          }
          const recovered: PendingPaymentSession = {
            idCita: Number(queryId),
            ttlMinutos: Number(params.get('ttl') || 10),
            resumen
          }
          setPending(recovered)
          setSummary(resumen)
        }
      }).catch(() => {})
    }
  }, [pending, queryId, params, API_BASE])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => setSecondsLeft(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  const countdown = useMemo(() => {
    const minutes = Math.max(0, Math.floor(secondsLeft / 60))
    const seconds = Math.max(0, secondsLeft % 60)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [secondsLeft])

  const costoTexto = summary?.costoMonto ? `S/ ${summary.costoMonto.toFixed(2)} ${summary.moneda || 'PEN'}` : 'S/ 0.00'

  async function handlePay() {
    if (!pending || !summary) {
      navigate('/citas')
      return
    }
    if (!terms) {
      setMessage('Debes aceptar los términos y condiciones')
      return
    }
    if (secondsLeft <= 0) {
      setMessage('El tiempo de reserva expiró')
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const body = {
        idCita: pending.idCita,
        monto: summary.costoMonto,
        moneda: summary.moneda || 'PEN',
        metodoPago: method,
        usuarioId: Number(localStorage.getItem('userId') || 0),
        aceptaTerminos: true,
        referencia: method === 'EFECTIVO' ? 'CAJA' : 'WEB'
      }
      const res = await fetch(`${API_BASE}/citas/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const text = await res.text().catch(() => 'No se pudo confirmar el pago')
        setMessage(text || 'No se pudo confirmar el pago')
        return
      }
      const data = await res.json()
      clearPendingPaymentSession()
      saveConfirmedCitaMessage({
        resumen: summary,
        pago: { metodo: method, estado: data.std_pago || (method === 'EFECTIVO' ? 'PENDIENTE' : 'PAGADO'), monto: summary.costoMonto, moneda: summary.moneda },
        timestamp: new Date().toISOString()
      })
      navigate('/home', { replace: true })
    } catch (error) {
      setMessage('Error de conexión al procesar el pago')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    clearPendingPaymentSession()
    navigate('/citas')
  }

  if (!pending || !summary) {
    return (
      <CitasLayout>
        <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 text-center">
          <p className="text-lg font-semibold text-text-primary">No hay una reserva pendiente</p>
          <p className="text-sm text-text-secondary">Vuelve al flujo de citas para iniciar un nuevo registro.</p>
          <button className="mt-4 rounded-full bg-primary px-5 py-2 text-sm text-white" onClick={() => navigate('/citas')}>
            Agendar cita
          </button>
        </div>
      </CitasLayout>
    )
  }

  return (
    <CitasLayout>
      <div className="mx-auto max-w-4xl space-y-5">
        <CitasStepper current={4} labels={labels} />
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">Confirmar cita</p>
              <p className="text-xl font-semibold text-text-primary">{summary.especialidad} · {summary.medico}</p>
              <p className="text-sm text-text-secondary">{summary.fecha} · {summary.horaInicio} - {summary.horaFin}</p>
            </div>
            <div className="grid place-content-center rounded-2xl bg-emerald-50 px-4 py-3 text-center">
              <p className="text-xs text-emerald-700">Tiempo restante</p>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums">{countdown}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-background-light/60 p-4 text-sm text-text-secondary">
            <p className="font-semibold text-text-primary">{summary.centro}</p>
            <p>{summary.direccion}</p>
            {summary.distrito && <p>{summary.distrito}</p>}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">Método de pago</p>
          <div className="mt-4 space-y-3">
            {paymentOptions.map(opt => (
              <label key={opt.value} className={`block rounded-2xl border px-4 py-3 transition hover:border-primary ${method === opt.value ? 'border-primary bg-primary/5' : ''}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <input type="radio" checked={method === opt.value} onChange={() => setMethod(opt.value)} className="h-4 w-4" />
                      <span className="font-semibold text-text-primary">{opt.label}</span>
                    </div>
                    <p className="text-xs text-text-secondary">{opt.detalle}</p>
                  </div>
                  {opt.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {opt.badges.map(b => (
                        <span key={b} className="rounded-full bg-white/80 px-2 py-1 text-xs text-text-secondary shadow">{b}</span>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm text-sm text-text-secondary">
          <div className="flex items-center justify-between font-semibold text-text-primary">
            <span>Total a pagar</span>
            <span>{costoTexto}</span>
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm text-text-secondary">
          <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />
          <span>Acepto los términos de cancelación y la política de privacidad</span>
        </label>

        {message && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{message}</div>}

        <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:justify-end">
          <button type="button" className="rounded-full border px-6 py-2 text-sm" onClick={handleCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={loading || secondsLeft <= 0}
            onClick={handlePay}
          >
            {loading ? 'Procesando…' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </CitasLayout>
  )
}
