import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CitasStepper from '../../components/CitasStepper'
import CitasLayout from '../../components/CitasLayout'
import { getDraft, setDraft } from '../../shared/citaDraft'

type EspecialidadItem = {
  id: number
  nombre: string
  descripcion?: string
  medicos_disponibles: number
}

export default function SelectEspecialidad() {
  const navigate = useNavigate()
  const labels = ['Especialidad', 'Centro médico', 'Médico', 'Fecha y Hora', 'Confirmar']
  const [q, setQ] = useState('')
  const [items, setItems] = useState<EspecialidadItem[]>([])
  const draft = getDraft()

  useEffect(() => {
    const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
    const ctrl = new AbortController()
    async function load() {
      try {
        const url = new URL('/citas/especialidades', API_BASE)
        if (q) url.searchParams.set('q', q)
        const res = await fetch(url.toString(), { signal: ctrl.signal })
        if (res.ok) {
          const data = await res.json() as EspecialidadItem[]
          setItems(data)
          return
        }
      } catch (err) {
        console.error('Error consultando especialidades:', err)
      }
      setItems([])
    }
    load()
    return () => ctrl.abort()
  }, [q])

  function handleChoose(item: EspecialidadItem) {
    if (item.medicos_disponibles <= 0) {
      const proceed = window.confirm('No hay médicos disponibles para esta especialidad en este momento. ¿Deseas continuar?')
      if (!proceed) return
    }
    setDraft({ especialidadId: item.id, especialidadNombre: item.nombre, especialidadDescripcion: item.descripcion })
    navigate('/citas/centro')
  }

  return (
    <CitasLayout>
      <div className="mx-auto max-w-3xl">
        <CitasStepper current={0} labels={labels} />
        <h2 className="mb-4 text-center text-xl font-semibold">¿Qué especialidad necesitas?</h2>
        <div className="space-y-3">
          <input
            className="w-full rounded-md border bg-white/60 px-3 py-2"
            placeholder="Buscar especialidad"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <div className="grid gap-3">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => handleChoose(item)}
                className="rounded-xl border p-4 text-left hover:border-primary"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.nombre}</p>
                    {item.descripcion && <p className="text-xs text-text-secondary">{item.descripcion}</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.medicos_disponibles > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {item.medicos_disponibles > 0 ? `${item.medicos_disponibles} médicos` : 'Sin médicos activos'}
                  </span>
                </div>
              </button>
            ))}
            {items.length === 0 && (
              <div className="rounded-xl border p-6 text-center text-sm text-text-secondary">Sin resultados</div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <button
            className="rounded-md bg-primary px-4 py-2 text-white disabled:opacity-60"
            onClick={() => draft.especialidadId && navigate('/citas/centro')}
            disabled={!draft.especialidadId}
          >
            Siguiente paso
          </button>
        </div>
      </div>
    </CitasLayout>
  )
}
