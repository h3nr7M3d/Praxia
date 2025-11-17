import { ReactNode, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CitasSidebar from './CitasSidebar'
import { getDraft } from '../shared/citaDraft'

function canGoNext(path: string) {
  const d = getDraft()
  switch (path) {
    case '/citas': return !!d.tipo
    case '/citas/paciente': return !!d.pacienteId
    case '/citas/agendar': return !!d.modo
    case '/citas/especialidad': return !!d.especialidadId
    case '/citas/centro': return d.tipo === 'virtual' ? true : !!d.centroId
    case '/citas/medico': return !!d.mceId
    case '/citas/horario': return !!d.slotId
    default: return false
  }
}

export default function CitasLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname
  const draft = getDraft()

  const seq = useMemo(() => {
    if (draft.modo === 'medico') return ['/citas', '/citas/paciente', '/citas/agendar', '/citas/medico', '/citas/horario', '/citas/confirmar']
    return ['/citas', '/citas/paciente', '/citas/agendar', '/citas/especialidad', '/citas/centro', '/citas/medico', '/citas/horario', '/citas/confirmar']
  }, [draft.modo])

  const idx = seq.indexOf(path)
  const prev = idx > 0 ? seq[idx - 1] : null
  const next = idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null
  const nextDisabled = !next || !canGoNext(path)

  return (
    <div className="min-h-screen bg-background-light text-text-primary">
      <div className="flex">
        <CitasSidebar />
        <main className="flex-1 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-text-secondary">Flujo de citas</div>
            <div className="flex gap-2">
              <button className="rounded-md border px-3 py-1.5 text-sm" onClick={() => prev && navigate(prev)} disabled={!prev}>Atrás</button>
              <button className="rounded-md bg-primary px-3 py-1.5 text-sm text-white disabled:opacity-50" onClick={() => next && navigate(next)} disabled={nextDisabled}>Siguiente</button>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
