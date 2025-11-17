import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CitasStepper from '../../components/CitasStepper'
import CitasLayout from '../../components/CitasLayout'
import { getDraft, setDraft } from '../../shared/citaDraft'

type MedicoItem = {
  id_medico: number
  nombre: string
  cmp: string
  perfil: string
  id_medico_centro_especialidad: number
  tarifa: number
  cod_moneda: string
  moneda: string
  agendas_disponibles: number
}

export default function SelectMedico() {
  const navigate = useNavigate()
  const labels = ['Especialidad', 'Centro médico', 'Médico', 'Fecha y Hora', 'Confirmar']
  const draft = getDraft()
  const [items, setItems] = useState<MedicoItem[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    async function load() {
      if (!draft.especialidadId || !draft.centroId) { setItems([]); return }
      const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
      const url = new URL('/citas/medicos', API_BASE)
      url.searchParams.set('especialidadId', String(draft.especialidadId))
      url.searchParams.set('centroId', String(draft.centroId))
      if (q) url.searchParams.set('q', q)
      try {
        const res = await fetch(url.toString())
        if (res.ok) {
          const data = await res.json() as MedicoItem[]
          setItems(data)
          return
        }
      } catch (e) {
        console.error('Error cargando médicos', e)
      }
      setItems([])
    }
    load()
  }, [draft.especialidadId, draft.centroId, q])

  function handleChoose(item: MedicoItem) {
    setDraft({
      medicoId: item.id_medico,
      medicoNombre: item.nombre,
      medicoCmp: item.cmp,
      medicoPerfil: item.perfil,
      medicoTarifa: Number(item.tarifa),
      medicoMoneda: item.cod_moneda,
      mceId: item.id_medico_centro_especialidad,
      costoMonto: Number(item.tarifa),
      costoMoneda: item.cod_moneda,
    })
    navigate('/citas/horario')
  }

  return (
    <CitasLayout>
      <div className="mx-auto max-w-4xl">
        <CitasStepper current={2} labels={labels} />
        <h2 className="mb-4 text-center text-xl font-semibold">¿Con quién deseas atenderte?</h2>
        <input className="mb-4 w-full rounded-md border bg-white/60 px-3 py-2" placeholder="Buscar médico" value={q} onChange={e => setQ(e.target.value)} />
        <div className="grid gap-4">
          {items.map(item => (
            <button key={item.id_medico} onClick={() => handleChoose(item)} className="rounded-2xl border p-4 text-left hover:border-primary">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.nombre}</p>
                  <p className="text-xs text-text-secondary">CMP {item.cmp || '—'}</p>
                  {item.perfil && <p className="text-xs text-text-secondary">{item.perfil}</p>}
                  <p className="text-xs text-text-secondary">Tarifa: {item.tarifa?.toFixed(2)} {item.cod_moneda}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">{item.agendas_disponibles} agendas</span>
              </div>
            </button>
          ))}
          {items.length === 0 && <div className="rounded-xl border p-6 text-center text-sm text-text-secondary">Selecciona primero un centro.</div>}
        </div>
        <div className="mt-6 flex justify-center">
          <button className="rounded-md bg-primary px-4 py-2 text-white disabled:opacity-50" onClick={() => draft.mceId && navigate('/citas/horario')} disabled={!draft.mceId}>Siguiente paso</button>
        </div>
      </div>
    </CitasLayout>
  )
}
