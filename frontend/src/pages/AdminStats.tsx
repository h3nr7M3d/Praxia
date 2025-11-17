import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import UserAvatar from '../components/UserAvatar'

export default function AdminStats() {
  useTheme()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [month, setMonth] = useState<string>(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [kpis, setKpis] = useState({ ingresos: 0, tickets: 0, empresasActivas: 0, busesActivos: 0 })
  const [ventasSerie, setVentasSerie] = useState<Array<{ x: string; y: number }>>([])
  const [ventasEmpresas, setVentasEmpresas] = useState<Array<{ label: string; value: number }>>([])
  const [topRutas, setTopRutas] = useState<Array<{ label: string; value: number }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  useEffect(() => { setEmail(localStorage.getItem('userEmail') || '') }, [])

  useEffect(() => { void loadAll() }, [range, month])

  function computeFromTo(): { from: string; to: string } {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    const end = new Date()
    const start = new Date(); start.setDate(end.getDate() - (days - 1))
    return { from: end.toISOString().slice(0,10), to: end.toISOString().slice(0,10) } // daily series usa from en endpoint específico
  }

  function computeFromToFull(): { from: string; to: string } {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    const end = new Date()
    const start = new Date(); start.setDate(end.getDate() - (days - 1))
    return { from: start.toISOString().slice(0,10), to: end.toISOString().slice(0,10) }
  }

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const { from, to } = computeFromToFull()
      const [kRes, dRes, cRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/admin-stats/kpis?from=${from}&to=${to}`),
        fetch(`${API_BASE}/admin-stats/sales-daily?from=${from}&to=${to}`),
        fetch(`${API_BASE}/admin-stats/sales-by-company?from=${from}&to=${to}`),
        fetch(`${API_BASE}/admin-stats/top-routes?from=${from}&to=${to}`)
      ])
      if (kRes.ok) {
        const k = await kRes.json()
        setKpis({ ingresos: Number(k.ingresos ?? 0), tickets: Number(k.tickets ?? 0), empresasActivas: Number(k.empresasActivas ?? 0), busesActivos: Number(k.busesActivos ?? 0) })
      }
      if (dRes.ok) {
        const s = await dRes.json()
        const series = (s.points||[]).map((p:any)=>({ x: formatDateLabel(p.date), y: Number(p.total ?? 0) }))
        setVentasSerie(series)
      }
      if (cRes.ok) {
        const c = await cRes.json()
        const items = (c.items||[]).map((it:any)=>({ label: it.empresa, value: Number(it.total ?? 0) }))
        setVentasEmpresas(items)
      }
      if (rRes.ok) {
        const r = await rRes.json()
        const items = (r.items||[]).map((it:any)=>({ label: it.ruta, value: Number(it.vendidos ?? 0) }))
        setTopRutas(items)
      }
    } catch (e:any) {
      setError(e.message || 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  function formatMoney(n: number) { return n.toLocaleString('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }) }
  function formatDateLabel(d: string) { if (/^\d{4}-\d{2}-\d{2}$/.test(d)) { const [y,m,dd]=d.split('-'); return `${m}/${dd}` } return d }

  return (
    <div className="min-h-screen bg-background-light text-text-primary">
      <header className="p-4 border-b border-border-soft bg-background-secondary">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/admin" aria-label="Inicio">
              <img src="/assets/logo/praxia_logo_sin_fondo_nombre.png" alt="Praxia" className="h-14 md:h-16 w-auto" />
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/dashboard/admin/usuarios" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">group</span>
              Usuarios
            </Link>
            <Link to="/dashboard/admin/empleados" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">badge</span>
              Empleados
            </Link>
            <Link to="/dashboard/admin/sucursales" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">apartment</span>
              Sucursales
            </Link>
            <Link to="/dashboard/admin/estadisticas" className="text-text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">monitoring</span>
              Estadísticas
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button type="button" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open} className="h-10 w-10 rounded-full border border-border-soft bg-white/50 flex items-center justify-center hover:border-primary hover:shadow-md">
                <UserAvatar size={40} />
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border-soft bg-white shadow-xl p-3 z-20">
                  <div className="text-sm text-text-secondary mb-2 truncate" title={email}>{email || 'Administrador'}</div>
                  <div className="flex flex-col gap-1">
                    <Link to="/micuenta" className="px-3 py-2 rounded-md hover:bg-background-light text-text-primary">Mi cuenta</Link>
                    <Link to="/login" className="px-3 py-2 rounded-md hover:bg-background-light text-red-600">Cerrar sesión</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-5xl mb-6 flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl text-primary">Estadísticas Administrativas</h1>
          <div className="flex items-center gap-2">
            <select value={range} onChange={e=>setRange(e.target.value as any)} className="rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary">
              <option value="7d">7 días</option>
              <option value="30d">30 días</option>
              <option value="90d">90 días</option>
            </select>
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
          </div>
        </div>

        {error && <div className="w-full max-w-5xl text-sm text-red-700 mb-4">{error}</div>}

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KPI title="Ingresos" value={formatMoney(kpis.ingresos)} icon="payments" />
          <KPI title="Tickets" value={kpis.tickets.toLocaleString()} icon="confirmation_number" />
          <KPI title="Empresas activas" value={kpis.empresasActivas.toString()} icon="business" />
          <KPI title="Buses activos" value={kpis.busesActivos.toString()} icon="directions_bus" />
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-border-soft bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-lg">Ventas diarias</h2>
              <span className="text-text-secondary text-sm">{range}{loading ? ' · cargando...' : ''}</span>
            </div>
            <LineChart data={ventasSerie} height={220} color="#3b82f6" />
          </div>

          <div className="rounded-xl border border-border-soft bg-white p-4 lg:col-span-3">
            <h2 className="font-display text-lg mb-2">Ventas por empresa</h2>
            <BarChart data={ventasEmpresas} height={260} color="#8b5cf6" prefix="S/ " />
          </div>

          <div className="rounded-xl border border-border-soft bg-white p-4 lg:col-span-3">
            <h2 className="font-display text-lg mb-2">Rutas más solicitadas</h2>
            <BarChart data={topRutas} height={260} color="#22c55e" suffix=" tickets" />
          </div>
        </div>
      </main>
    </div>
  )
}

function KPI({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl border border-border-soft bg-white/70 p-4 flex items-center gap-3">
      <span className="material-symbols-outlined text-primary" style={{ fontSize: 36 }}>{icon}</span>
      <div>
        <div className="text-text-secondary text-sm">{title}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  )
}

function LineChart({ data, height = 200, color = '#3b82f6' }: { data: Array<{ x: string; y: number }>, height?: number, color?: string }) {
  const padding = { left: 36, right: 12, top: 10, bottom: 26 }
  const width = 720
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const ys = data.map(d=>d.y)
  const maxY = Math.max(10, ...ys, 1)
  const minY = 0
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW
  const points = data.map((d, i) => {
    const x = padding.left + i * stepX
    const y = padding.top + innerH - ((d.y - minY) / (maxY - minY)) * innerH
    return `${x},${y}`
  }).join(' ')
  const ticks = 4
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxY / ticks) * i))
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <rect x={0} y={0} width={width} height={height} fill="transparent" />
      {yTicks.map((t, i) => {
        const y = padding.top + innerH - (t / maxY) * innerH
        return <g key={i}>
          <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#eef2f7" />
          <text x={4} y={y+4} fontSize={10} fill="#64748b">{t}</text>
        </g>
      })}
      <polyline fill="none" stroke={color} strokeWidth={2} points={points} />
      {data.map((d,i)=>{
        const x = padding.left + i * stepX
        const y = padding.top + innerH - ((d.y - minY) / (maxY - minY)) * innerH
        return <circle key={i} cx={x} cy={y} r={2.5} fill={color} />
      })}
      {data.map((d,i)=> i%Math.ceil(data.length/6)===0 ? (
        <text key={i} x={padding.left + i*stepX} y={height-6} fontSize={10} fill="#64748b" textAnchor="middle">{d.x}</text>
      ) : null)}
    </svg>
  )
}

function BarChart({ data, height = 240, color = '#22c55e', suffix = '', prefix = '' }: { data: Array<{ label: string; value: number }>, height?: number, color?: string, suffix?: string, prefix?: string }) {
  const padding = { left: 140, right: 12, top: 10, bottom: 10 }
  const width = 720
  const innerW = width - padding.left - padding.right
  const barH = Math.max(18, Math.floor((height - padding.top - padding.bottom) / Math.max(data.length,1)) - 8)
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      {data.map((d, i) => {
        const y = padding.top + i*(barH+8)
        const w = (d.value / max) * innerW
        return (
          <g key={d.label}>
            <text x={8} y={y + barH/2 + 4} fontSize={11} fill="#334155">{d.label}</text>
            <rect x={padding.left} y={y} width={w} height={barH} rx={6} fill={color} opacity={0.85} />
            <text x={padding.left + w + 6} y={y + barH/2 + 4} fontSize={11} fill="#64748b">{prefix}{d.value.toLocaleString()} {suffix}</text>
          </g>
        )
      })}
    </svg>
  )
}
