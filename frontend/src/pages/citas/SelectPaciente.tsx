import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
import { getDraft, setDraft } from '../../shared/citaDraft'
import CitasLayout from '../../components/CitasLayout'

export default function SelectPaciente() {
  const navigate = useNavigate()
  const draft = getDraft()
  const [loading, setLoading] = useState(false)
  const [displayName, setDisplayName] = useState<string>('')

  // Cargar el paciente del usuario logueado desde /auth/profile
  useEffect(() => {
    const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
    const uid = localStorage.getItem('userId')
    if (!uid) return
    const ctrl = new AbortController()
    setLoading(true)
    fetch(`${API_BASE}/auth/profile?userId=${uid}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('perfil')
        const p = await res.json()
        const full = [p.nombres, p.apellidos].filter(Boolean).join(' ').trim() || p.email || 'Paciente'
        setDisplayName(full)
        // Preseleccionar paciente en el borrador
        setDraft({ pacienteId: Number(uid), pacienteNombre: full })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])
  const choose = (id: number, nombre: string) => {
    setDraft({ pacienteId: id, pacienteNombre: nombre })
    navigate('/citas/agendar')
  }
  return (
    <CitasLayout>
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-center text-xl font-semibold">¿Para quién es esta cita?</h2>
      <div className="flex items-center justify-center gap-6">
        <button onClick={() => choose(Number(localStorage.getItem('userId')||'0'), displayName || 'Paciente')} className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm hover:bg-accent" disabled={!displayName && loading}>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-muted"><User className="h-5 w-5 text-muted-foreground" /></div>
          <span className="text-sm font-medium">{displayName || 'Cargando…'}</span>
        </button>
        <button onClick={() => alert('Agregar nuevo paciente (demo)')} className="text-emerald-700 text-sm font-medium hover:underline">+ Agregar nuevo paciente</button>
      </div>
      <div className="mt-8 text-center text-xs text-muted-foreground">Tipo seleccionado: {draft.tipo || '—'}</div>
    </div>
    </CitasLayout>
  )
}
