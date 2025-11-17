import { useNavigate } from 'react-router-dom'
import { Stethoscope, User, ChevronRight } from 'lucide-react'
import { setDraft } from '../../shared/citaDraft'
import CitasLayout from '../../components/CitasLayout'

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

export default function ModoBusqueda() {
  const navigate = useNavigate()
  return (
    <CitasLayout>
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-1 text-center text-xl font-semibold">¿Cómo deseas agendar?</h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">Busca disponibilidad</p>
      <div className="mx-auto max-w-xl space-y-3">
        <ListOption title="Búsqueda por especialidad" subtitle="Si deseas ver la lista de especialistas" icon={<Stethoscope className="h-5 w-5" />} onClick={() => { setDraft({ modo: 'especialidad' }); navigate('/citas/especialidad') }} />
        <ListOption title="Búsqueda por médico" subtitle="Si conoces el nombre de tu doctor" icon={<User className="h-5 w-5" />} onClick={() => { setDraft({ modo: 'medico' }); navigate('/citas/medico') }} />
      </div>
    </div>
    </CitasLayout>
  )
}
