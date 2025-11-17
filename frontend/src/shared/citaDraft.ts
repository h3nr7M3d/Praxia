export type CitaDraft = {
  tipo?: 'presencial' | 'virtual' | 'chequeo'
  pacienteId?: number
  pacienteNombre?: string
  modo?: 'especialidad' | 'medico'
  especialidadId?: number
  especialidadNombre?: string
  centroId?: number
  centroNombre?: string
  centroDireccion?: string
  centroTelefono?: string
  centroUbicacion?: string
  medicoId?: number
  medicoNombre?: string
  medicoCmp?: string
  medicoPerfil?: string
  medicoTarifa?: number
  medicoMoneda?: string
  mceId?: number
  especialidadDescripcion?: string
  costoMonto?: number
  costoMoneda?: string
  slotId?: number
  slotFecha?: string
  slotHoraInicio?: string
  slotHoraFin?: string
  idAgenda?: number
}

const KEY = 'praxia.citaDraft'

export function getDraft(): CitaDraft {
  try { return JSON.parse(sessionStorage.getItem(KEY) || '{}') } catch { return {} }
}
export function setDraft(patch: Partial<CitaDraft>) {
  const next = { ...getDraft(), ...patch }
  sessionStorage.setItem(KEY, JSON.stringify(next))
  return next
}
export function resetDraft() { sessionStorage.removeItem(KEY) }

export type CitaResumenPreview = {
  especialidad?: string
  centro?: string
  direccion?: string
  distrito?: string
  provincia?: string
  departamento?: string
  medico?: string
  fecha?: string
  horaInicio?: string
  horaFin?: string
  costoMonto?: number
  moneda?: string
  motivo?: string
  telefono?: string
}

export type PendingPaymentSession = {
  idCita: number
  ttlMinutos: number
  resumen: CitaResumenPreview
}

const PENDING_PAYMENT_KEY = 'praxia.pendingPayment'

export function savePendingPaymentSession(data: PendingPaymentSession) {
  sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(data))
}

export function readPendingPaymentSession(): PendingPaymentSession | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PAYMENT_KEY)
    return raw ? (JSON.parse(raw) as PendingPaymentSession) : null
  } catch {
    return null
  }
}

export function clearPendingPaymentSession() {
  sessionStorage.removeItem(PENDING_PAYMENT_KEY)
}

export type ConfirmedCitaMessage = {
  resumen: CitaResumenPreview
  pago: { metodo: string; estado: string; monto?: number; moneda?: string }
  timestamp: string
}

const CONFIRMED_CITA_KEY = 'praxia.lastConfirmedCita'

export function saveConfirmedCitaMessage(data: ConfirmedCitaMessage) {
  localStorage.setItem(CONFIRMED_CITA_KEY, JSON.stringify(data))
}

export function readConfirmedCitaMessage(): ConfirmedCitaMessage | null {
  try {
    const raw = localStorage.getItem(CONFIRMED_CITA_KEY)
    return raw ? (JSON.parse(raw) as ConfirmedCitaMessage) : null
  } catch {
    return null
  }
}

export function clearConfirmedCitaMessage() {
  localStorage.removeItem(CONFIRMED_CITA_KEY)
}
