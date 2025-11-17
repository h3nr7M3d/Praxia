import { useNavigate } from 'react-router-dom'
import { Building2, CalendarDays, Check, ChevronRight } from 'lucide-react'
import { setDraft, resetDraft } from '../../shared/citaDraft'

function ListOption({ title, subtitle, icon, onClick }: { title: string; subtitle?: string; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl border bg-white p-4 text-left shadow-sm transition hover:bg-accent">
      <div className="flex items-center gap-3">
        <div className="text-emerald-600">{icon}</div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="grid h-8 w-8 place-items-center rounded-full border border-emerald-200 text-emerald-600">
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  )
}

import CitasLayout from '../../components/CitasLayout'

export default function SelectTipo() {
  const navigate = useNavigate()
  const go = (tipo: 'presencial' | 'virtual' | 'chequeo') => {
    resetDraft()
    setDraft({ tipo })
    navigate('/citas/paciente')
  }
  return (
    <CitasLayout>
    <div className="mx-auto max-w-3xl">
      <h1 className="text-center text-2xl font-semibold">Programa una cita virtual o presencial en nuestra red de clínicas y centros clínicos.</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">Selecciona el tipo de atención de tu preferencia.</p>
      <div className="mx-auto mt-8 max-w-xl space-y-3">
        <ListOption title="Cita presencial" subtitle="Agenda una cita con un especialista" icon={<Building2 className="h-5 w-5" />} onClick={() => go('presencial')} />
        <ListOption title="Cita virtual" subtitle="Teleconsulta" icon={<CalendarDays className="h-5 w-5" />} onClick={() => go('virtual')} />
        <ListOption title="Chequeo médico" subtitle="Según cobertura" icon={<Check className="h-5 w-5" />} onClick={() => go('chequeo')} />
      </div>
    </div>
    </CitasLayout>
  )
}
