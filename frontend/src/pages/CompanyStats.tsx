import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import CompanyHeader from '../components/CompanyHeader'
import { useTheme } from '../hooks/useTheme'

export default function CompanyStats() {
  useTheme()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [month, setMonth] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [kpis, setKpis] = useState({ ingresos: 0, tickets: 0, ocupacion: 0, busesActivos: 0 })
  const [ventasSerie, setVentasSerie] = useState<Array<{ x: string; y: number }>>([])
  const [ocupacionRutas, setOcupacionRutas] = useState<Array<{ label: string; value: number }>>([])
  const [estadoBuses, setEstadoBuses] = useState<Array<{ label: string; value: number; color: string }>>([])
  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  useEffect(() => {
    const e = localStorage.getItem('userEmail') || ''
    setEmail(e)
    ;(async () => {
      const uid = localStorage.getItem('userId')
      if (!uid) return
      try {
        const profRes = await fetch(`${API_BASE}/auth/profile?userId=${uid}`)
        if (profRes.ok) {
          const prof = await profRes.json()
          if (prof?.idEmpresa) setEmpresaId(Number(prof.idEmpresa))
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (!empresaId) return
    void loadAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, range, month])

  function computeFromTo(): { from: string; to: string } {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    const end = new Date()
    const start = new Date(); start.setDate(end.getDate() - (days - 1))
    const to = end.toISOString().slice(0,10)
    const from = start.toISOString().slice(0,10)
    return { from, to }
  }

  async function loadAll() {
    if (!empresaId) return
    setLoading(true)
    setError(null)
    try {
      const { from, to } = computeFromTo()
      const [kpisRes, salesRes, statesRes, occRes] = await Promise.all([
        fetch(`${API_BASE}/stats/kpis?empresaId=${empresaId}&from=${from}&to=${to}`),
        fetch(`${API_BASE}/stats/sales-daily?empresaId=${empresaId}&from=${from}&to=${to}`),
        fetch(`${API_BASE}/stats/bus-states?empresaId=${empresaId}`),
        fetch(`${API_BASE}/stats/occupancy?empresaId=${empresaId}&from=${from}&to=${to}`)
      ])
      if (kpisRes.ok) {
        const k = await kpisRes.json()
        setKpis({ ingresos: Number(k.ingresos ?? 0), tickets: Number(k.tickets ?? 0), ocupacion: Number(k.ocupacionPromedio ?? 0), busesActivos: Number(k.busesActivos ?? 0) })
      }
      if (salesRes.ok) {
        const s = await salesRes.json()
        const series = (s.points || []).map((p: any) => ({ x: formatDateLabel(p.date), y: Number(p.total ?? 0) }))
        setVentasSerie(series)
      }
      if (statesRes.ok) {
        const s = await statesRes.json()
        const mapColor: Record<string,string> = { 'Disponible': '#22c55e', 'En ruta': '#3b82f6', 'Mantenimiento': '#f59e0b', 'Inactivo': '#ef4444' }
        setEstadoBuses((s.states||[]).map((it: any) => ({ label: it.label, value: Number(it.value ?? 0), color: mapColor[it.label] || '#94a3b8' })))
      }
      if (occRes.ok) {
        const o = await occRes.json()
        setOcupacionRutas((o.items||[]).map((it: any) => ({ label: it.route, value: Number(it.percent ?? 0) })))
      }
    } catch (e:any) {
      setError(e.message || 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  function formatMoney(n: number) {
    return n.toLocaleString('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
  }
  function formatDateLabel(d: string) {
    // espera YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y,m,dd] = d.split('-')
      return `${m}/${dd}`
    }
    return d
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary">
      <CompanyHeader />
      <main className="flex-1 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-5xl mb-6 flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl text-primary">Estadísticas</h1>
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
          <KPI title="Ocupación" value={`${kpis.ocupacion}%`} icon="event_seat" />
          <KPI title="Buses activos" value={kpis.busesActivos.toString()} icon="directions_bus" />
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-border-soft bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-lg">Ventas por día</h2>
              <span className="text-text-secondary text-sm">{range}{loading ? ' · cargando...' : ''}</span>
            </div>
            <LineChart data={ventasSerie} height={220} color="#3b82f6" />
          </div>

          <div className="rounded-xl border border-border-soft bg-white p-4">
            <h2 className="font-display text-lg mb-2">Estado de buses</h2>
            <DonutChart data={estadoBuses} size={220} thickness={28} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {estadoBuses.map(s => (
                <div key={s.label} className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }}></span>{s.label}: <span className="ml-auto font-semibold">{s.value}</span></div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border-soft bg-white p-4 lg:col-span-3">
            <h2 className="font-display text-lg mb-2">Ocupación promedio por ruta</h2>
            <BarChart data={ocupacionRutas} height={260} color="#22c55e" suffix="%" />
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
  const maxY = Math.max(10, ...ys)
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

function BarChart({ data, height = 240, color = '#22c55e', suffix = '' }: { data: Array<{ label: string; value: number }>, height?: number, color?: string, suffix?: string }) {
  const padding = { left: 120, right: 12, top: 10, bottom: 10 }
  const width = 720
  const innerW = width - padding.left - padding.right
  const barH = Math.max(18, Math.floor((height - padding.top - padding.bottom) / data.length) - 8)
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
            <text x={padding.left + w + 6} y={y + barH/2 + 4} fontSize={11} fill="#64748b">{d.value}{suffix}</text>
          </g>
        )
      })}
    </svg>
  )
}

function DonutChart({ data, size = 220, thickness = 26 }: { data: Array<{ label: string; value: number; color: string }>, size?: number, thickness?: number }) {
  const total = data.reduce((a,b)=>a+b.value,0) || 1
  const r = (size - thickness) / 2
  const c = size / 2
  let acc = 0
  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#eef2f7" strokeWidth={thickness} />
      {data.map((s, i) => {
        const portion = s.value / total
        const dash = 2 * Math.PI * r * portion
        const gap = 2 * Math.PI * r * 0.02
        const dashArray = `${dash} ${2 * Math.PI * r - dash}`
        const rot = (acc / total) * 360
        acc += s.value
        return (
          <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={dashArray} transform={`rotate(${rot} ${c} ${c})`} strokeLinecap="butt" />
        )
      })}
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fontSize={18} fill="#0f172a" fontWeight={700}>{total}</text>
      <text x={c} y={c+18} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#64748b">Total buses</text>
    </svg>
  )
}
