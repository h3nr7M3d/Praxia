import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import UserMenu from '../components/UserMenu'
import { readConfirmedCitaMessage, clearConfirmedCitaMessage } from '../shared/citaDraft'

const brand = {
  primary: '#6B2FB3',
  primarySoft: '#F2EAFE',
  accentBlue: '#3B82F6',
  accentTeal: '#2DD4BF',
  accentAmber: '#F59E0B',
  ink: '#1F1633'
}

type SidebarItemProps = {
  icon: string
  label: string
  active?: boolean
  href?: string
}

function SidebarItem({ icon, label, active = false, href = '#' }: SidebarItemProps) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-white/80 ${active ? 'bg-white/90 font-medium' : 'text-white/90'}`}
    >
      <span className="material-symbols-outlined text-lg" style={{ color: active ? brand.primary : '#ffffff' }} aria-hidden>
        {icon}
      </span>
      <span className={active ? 'text-primary' : 'text-white'}>{label}</span>
    </a>
  )
}

function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-16 md:w-60 shrink-0 p-3 md:p-4 gap-3 sticky top-0 h-screen" style={{ backgroundColor: brand.primary }}>
      <div className="flex items-center justify-center md:justify-start gap-2 px-1 py-2">
        <div className="h-8 w-8 rounded-full bg-white/90 grid place-items-center">
          <span className="text-xl font-bold" style={{ color: brand.primary }}>
            Ψ
          </span>
        </div>
        <span className="hidden md:block text-white font-semibold tracking-wide">PRAXIA</span>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <SidebarItem icon="cottage" label="Inicio" active />
        <SidebarItem icon="calendar_month" label="Solicitar cita" />
        <SidebarItem icon="assignment" label="Mis citas" />
      </div>

      <div className="mt-auto">
        <SidebarItem icon="logout" label="Salir" />
      </div>
    </aside>
  )
}

type HeroCardProps = {
  title: string
  subtitle: string
  color: string
  cta?: string
  href?: string
}

function HeroCard({ title, subtitle, color, cta, href }: HeroCardProps) {
  return (
    <div className="h-full rounded-2xl overflow-hidden shadow-lg" style={{ backgroundColor: color }}>
      <div className="p-5 md:p-7 text-white">
        <div className="max-w-sm space-y-3">
          <h3 className="text-lg md:text-xl font-semibold leading-tight">{title}</h3>
          <p className="text-sm md:text-base text-white/90">{subtitle}</p>
          {cta && (
            <a
              href={href || '#'}
              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition"
            >
              {cta}
              <span className="material-symbols-outlined text-base" aria-hidden>
                arrow_outward
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

type QuickActionProps = {
  icon: string
  title: string
  desc: string
  href: string
  bg: string
}

function QuickAction({ icon, title, desc, href, bg }: QuickActionProps) {
  return (
    <a
      href={href}
      className="block rounded-2xl border border-transparent shadow-sm hover:shadow-lg transition-shadow"
      style={{ backgroundColor: bg }}
    >
      <div className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl grid place-items-center bg-black/5 text-primary">
          <span className="material-symbols-outlined text-lg" aria-hidden>
            {icon}
          </span>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="text-xs text-gray-700/80">{desc}</div>
        </div>
      </div>
    </a>
  )
}

export default function PraxiaHome() {
  const storedName = (localStorage.getItem('userName') || '').trim()
  const storedEmail = (localStorage.getItem('userEmail') || '').trim()
  const userName = storedName || (storedEmail ? storedEmail.split('@')[0] : 'Usuario')
  const navigate = useNavigate()
  const [confirmedBanner, setConfirmedBanner] = React.useState(() => readConfirmedCitaMessage())

  React.useEffect(() => {
    if (!confirmedBanner) return
    const timer = window.setTimeout(() => {
      clearConfirmedCitaMessage()
      setConfirmedBanner(null)
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [confirmedBanner])

  const closeBanner = () => {
    clearConfirmedCitaMessage()
    setConfirmedBanner(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold" style={{ color: brand.ink }}>
                ¡Hola, {userName}!
              </h1>
              <p className="text-sm text-gray-600 mt-1">Praxia cuida de ti</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <input
                  type="search"
                  placeholder="Buscar servicios, médicos, especialidades…"
                  className="w-[260px] rounded-full border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button className="relative rounded-full p-2 bg-white shadow hover:shadow-md transition" aria-label="Notificaciones">
                <span className="material-symbols-outlined text-xl" aria-hidden>
                  notifications
                </span>
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: brand.accentAmber }} />
              </button>
              <UserMenu />
            </div>
          </div>

          {confirmedBanner && (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-emerald-600 font-semibold">
                    <span className="text-xl">🎉</span> ¡Cita confirmada!
                  </p>
                  <p className="text-sm text-emerald-700">Hemos enviado el comprobante a tu correo</p>
                </div>
                <button className="text-sm text-emerald-700 underline" onClick={closeBanner}>Cerrar</button>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-emerald-800 md:grid-cols-2">
                <div>
                  <p className="font-semibold">{confirmedBanner?.resumen.especialidad}</p>
                  <p>{confirmedBanner?.resumen.medico}</p>
                </div>
                <div>
                  <p className="font-semibold">{confirmedBanner?.resumen.fecha}</p>
                  <p>{confirmedBanner?.resumen.horaInicio} - {confirmedBanner?.resumen.horaFin}</p>
                </div>
                <div>
                  <p className="font-semibold">Lugar</p>
                  <p>{confirmedBanner?.resumen.centro}</p>
                  <p>{confirmedBanner?.resumen.direccion}</p>
                </div>
                <div>
                  <p className="font-semibold">Pago</p>
                  <p>
                    {confirmedBanner?.pago.estado === 'PENDIENTE' ? 'Por pagar en sede' : 'Pagado'} · {confirmedBanner?.resumen.costoMonto ? `S/ ${confirmedBanner?.resumen.costoMonto.toFixed(2)} ${confirmedBanner?.resumen.moneda || 'PEN'}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-emerald-800">
                <span className="rounded-full bg-white/80 px-3 py-1">Revisa tu email con los detalles</span>
                <span className="rounded-full bg-white/80 px-3 py-1">Agrega la cita a tu calendario</span>
                <span className="rounded-full bg-white/80 px-3 py-1">Llega 15 minutos antes</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-emerald-700 shadow" onClick={() => navigate('/citas/mis-citas')}>Ver detalles de cita</button>
                <button className="rounded-full border border-emerald-300 px-5 py-2 text-sm text-emerald-700" onClick={() => navigate('/citas')}>Agendar nueva cita</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-6">
            <HeroCard title="Con Vida PRAXIA" subtitle="Asegura tu salud y la de tu familia" color={brand.accentBlue} cta="Conocer más" href="#" />
            <HeroCard title="Planes de salud PRAXIA" subtitle="Flexibles, transparentes y a tu medida" color={brand.accentTeal} cta="Ver planes" href="#" />
          </div>

          <div className="mt-8">
            <h2 className="text-base font-semibold mb-3" style={{ color: brand.ink }}>
              ¿En qué podemos ayudarte?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickAction icon="calendar_month" title="Solicitar citas" desc="Reserva presencial o virtual" href="/citas/programar" bg="#EAF5FF" />
              <QuickAction icon="assignment" title="Mis citas" desc="Próximas y pasado" href="/citas/mis-citas" bg="#EAFBF2" />
              <QuickAction icon="folder" title="Mis exámenes" desc="Órdenes y resultados" href="#/examenes" bg="#F5F1FF" />
              <QuickAction icon="healing" title="Especialistas" desc="Encuentra tu médico" href="#/especialistas" bg="#FFF3E6" />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="border border-transparent shadow-sm rounded-2xl bg-white lg:col-span-2">
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl" style={{ color: brand.primary }} aria-hidden>
                    dashboard
                  </span>
                  <h3 className="font-medium" style={{ color: brand.ink }}>
                    Recordatorios
                  </h3>
                </div>
                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                  <li>Confirma tus citas dentro de los primeros 20 minutos para evitar cancelación automática.</li>
                  <li>Consulta cobertura de tu seguro antes de agendar chequeos.</li>
                  <li>Teleconsulta disponible para síntomas leves.</li>
                </ul>
              </div>
            </div>

            <div className="border border-transparent shadow-sm rounded-2xl bg-white">
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl" style={{ color: brand.primary }} aria-hidden>
                    stethoscope
                  </span>
                  <h3 className="font-medium" style={{ color: brand.ink }}>
                    Tu próxima acción
                  </h3>
                </div>
                <p className="text-sm text-gray-700">¿Buscas pediatría o medicina general? Empieza por solicitar una cita.</p>
                <a
                  href="/citas/programar"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90 transition"
                  style={{ backgroundColor: brand.primary }}
                >
                  Solicitar cita
                  <span className="material-symbols-outlined text-base" aria-hidden>
                    arrow_forward
                  </span>
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

