import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CitasStepper from '../../components/CitasStepper'
import CitasLayout from '../../components/CitasLayout'
import { getDraft, setDraft } from '../../shared/citaDraft'

type CentroItem = {
  id: number
  nombre: string
  direccion: string
  telefono: string
  distrito: string
  provincia: string
  departamento: string
  medicos_en_centro: number
}

export default function SelectCentro() {
  const navigate = useNavigate()
  const labels = ['Especialidad', 'Centro médico', 'Médico', 'Fecha y Hora', 'Confirmar']
  const draft = getDraft()
  const [items, setItems] = useState<CentroItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!draft.especialidadId) {
        setItems([])
        return
      }
      const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_BASE}/citas/centros?especialidadId=${draft.especialidadId}`)
        if (res.ok) {
          const data = await res.json() as CentroItem[]
          setItems(data)
          setLoading(false)
          return
        }
        setError('No pudimos cargar los centros.')
      } catch (e) {
        console.error('Error cargando centros', e)
        setError('No pudimos cargar los centros. Intenta nuevamente.')
      }
      setItems([])
      setLoading(false)
    }
    load()
  }, [draft.especialidadId])

  function handleChoose(item: CentroItem) {
    setDraft({
      centroId: item.id,
      centroNombre: item.nombre,
      centroDireccion: item.direccion,
      centroTelefono: item.telefono,
      centroUbicacion: `${item.distrito}, ${item.provincia}`
    })
    navigate('/citas/medico')
  }

  return (
    <CitasLayout>
      <div className="mx-auto max-w-4xl">
        <CitasStepper current={1} labels={labels} />
        <h2 className="mb-4 text-center text-xl font-semibold">¿Dónde deseas atenderte?</h2>
        <div className="grid gap-4">
          {items.map(item => (
            <button key={item.id} onClick={() => handleChoose(item)} className="rounded-2xl border p-4 text-left hover:border-primary">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.nombre}</p>
                  <p className="text-xs text-text-secondary">{item.direccion}</p>
                  <p className="text-xs text-text-secondary">{item.distrito}, {item.provincia}</p>
                  <p className="text-xs text-text-secondary">Tel. {item.telefono || '-'}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.medicos_en_centro > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                  {item.medicos_en_centro > 0 ? `${item.medicos_en_centro} médicos` : 'Sin médicos activos'}
                </span>
              </div>
            </button>
          ))}
          {items.length === 0 && (
            <div className="rounded-xl border p-6 text-center text-sm text-text-secondary">
              {loading
                ? 'Cargando centros...'
                : draft.especialidadId
                ? (error ?? 'Aún no hay centros con disponibilidad para esta especialidad.')
                : 'Selecciona primero una especialidad.'}
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-center">
          <button className="rounded-md bg-primary px-4 py-2 text-white disabled:opacity-50" onClick={() => draft.centroId && navigate('/citas/medico')} disabled={!draft.centroId}>Siguiente paso</button>
        </div>
      </div>
    </CitasLayout>
  )
}
