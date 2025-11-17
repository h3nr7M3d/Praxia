import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import UserAvatar from '../components/UserAvatar'

type Movimiento = {
  tipo: 'COMPRA' | 'CANCELACION'
  fecha: string
  hora: string
  origen?: string
  destino?: string
  fechaSalida?: string
  horaSalida?: string
  empresa?: string
  busMatricula?: string
  metodoPago?: string
  tarjetaMasked?: string
  bruto?: number
  comisionPct?: number
  comisionMonto?: number
  neto?: number
  estadoCarrito?: string
  originalNeto?: number
  originalBruto?: number
}

export default function MyTransactions() {
  const [rows, setRows] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [emailLabel, setEmailLabel] = useState('')
  const [pmList, setPmList] = useState<{ idMetodoPago: number; nombre: string }[]>([])

  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fMetodo, setFMetodo] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [fRuta, setFRuta] = useState('')

  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const em = localStorage.getItem('userEmail') || ''
        setEmailLabel(em)
        const userId = localStorage.getItem('userId')
        if (!userId) { setError('No hay sesión'); return }
        const prof = await fetch(`${API_BASE}/auth/profile?userId=${userId}`)
        if (!prof.ok) { setError('No se pudo obtener el perfil'); return }
        const p = await prof.json()
        if (p?.tipo !== 'cliente' || !p?.idCliente) { setRows([]); return }
        const [res, pmRes] = await Promise.all([
          fetch(`${API_BASE}/movimientos/cliente/${p.idCliente}`),
          fetch(`${API_BASE}/metodos-pago`),
        ])
        if (!res.ok) { setError('No se pudieron cargar los movimientos'); return }
        const items = await res.json()
        setRows(items || [])
        if (pmRes.ok) {
          const ms = await pmRes.json()
          setPmList((ms || []).map((m: any) => ({ idMetodoPago: m.idMetodoPago, nombre: m.nombre })))
        }
      } catch {
        setError('Error de red')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return (rows || []).filter(r => {
      const passTipo = !fTipo || r.tipo === fTipo
      const passMetodo = !fMetodo || (r.metodoPago || '').toLowerCase() === fMetodo.toLowerCase()
      const passEstado = !fEstado || (r.estadoCarrito || '').toLowerCase() === fEstado.toLowerCase()
      const passDesde = !fDesde || (r.fecha >= fDesde)
      const passHasta = !fHasta || (r.fecha <= fHasta)
      const passRuta = !fRuta || ((r.origen || '').toLowerCase().includes(fRuta.toLowerCase()) || (r.destino || '').toLowerCase().includes(fRuta.toLowerCase()))
      return passTipo && passMetodo && passEstado && passDesde && passHasta && passRuta
    })
  }, [rows, fTipo, fMetodo, fEstado, fDesde, fHasta, fRuta])

  const kpis = useMemo(() => {
    const compras = filtered.filter(r => r.tipo === 'COMPRA')
    const cancels = filtered.filter(r => r.tipo === 'CANCELACION')
    const sum = (xs: number[]) => xs.reduce((a, b) => a + (isFinite(b) ? b : 0), 0)
    const comprasBruto = sum(compras.map(r => r.bruto || 0))
    const comprasComi = sum(compras.map(r => r.comisionMonto || 0))
    const comprasNeto = sum(compras.map(r => r.neto || 0))
    const cancelsNeto = sum(cancels.map(r => r.neto || 0)) // negativo
    return { comprasBruto, comprasComi, comprasNeto, cancelsCount: cancels.length, cancelsNeto }
  }, [filtered])

  return (
    <div className="min-h-screen bg-background-light text-text-primary">
      <header className="p-4 border-b border-border-soft bg-background-secondary">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/cliente" aria-label="Inicio">
              <img src="/assets/logo/praxia_logo_sin_fondo_nombre.png" alt="Praxia" className="h-14 md:h-16 w-auto" />
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/dashboard/cliente/pasajes" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">confirmation_number</span>
              Mis pasajes
            </Link>
            <Link to="/dashboard/cliente/comprar" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">directions_bus</span>
              Catalogo
            </Link>
            <Link to="/dashboard/cliente/movimientos" className="text-text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">receipt_long</span>
              Movimientos
            </Link>
            <Link to="/dashboard/cliente/tarjetas" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">credit_card</span>
              Tarjetas
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/dashboard/cliente/carrito" className="h-10 w-10 rounded-full border border-border-soft bg-white/50 flex items-center justify-center hover:border-primary hover:shadow-md" aria-label="Carrito">
              <span className="material-symbols-outlined">shopping_cart</span>
            </Link>
            <div className="relative">
              <button type="button" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open} className="h-10 w-10 rounded-full border border-border-soft bg-white/50 flex items-center justify-center hover:border-primary hover:shadow-md">
                <UserAvatar size={40} />
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border-soft bg-white shadow-xl p-3 z-20">
                  <div className="text-sm text-text-secondary mb-2 truncate" title={emailLabel}>{emailLabel || 'Usuario'}</div>
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

      <div className="p-6">
        <h1 className="font-display text-2xl text-primary mb-6 text-center">Mis movimientos</h1>
        {loading && <div className="text-text-secondary">Cargando...</div>}
        {error && (
          <div className="flex justify-center my-6">
            <div className="inline-flex items-center gap-2 text-red-700 text-xl md:text-2xl">
              <span className="material-symbols-outlined">wifi_off</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid md:grid-cols-5 gap-4 max-w-6xl mx-auto mb-4">
              <div className="rounded-xl border border-border-soft bg-background-secondary p-4">
                <div className="text-xs text-text-secondary">Compras (bruto)</div>
                <div className="text-xl font-bold">S/ {kpis.comprasBruto.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-border-soft bg-background-secondary p-4">
                <div className="text-xs text-text-secondary">Comisiones</div>
                <div className="text-xl font-bold">S/ {kpis.comprasComi.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-border-soft bg-background-secondary p-4">
                <div className="text-xs text-text-secondary">Compras (neto)</div>
                <div className="text-xl font-bold">S/ {kpis.comprasNeto.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-border-soft bg-background-secondary p-4">
                <div className="text-xs text-text-secondary">Cancelaciones</div>
                <div className="text-xl font-bold">{kpis.cancelsCount}</div>
              </div>
              <div className="rounded-xl border border-border-soft bg-background-secondary p-4">
                <div className="text-xs text-text-secondary">Reembolsos</div>
                <div className="text-xl font-bold">S/ {kpis.cancelsNeto.toFixed(2)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-border-soft bg-background-secondary p-4 mb-4 max-w-6xl mx-auto">
              <div className="grid md:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Fecha desde</label>
                  <input type="date" value={fDesde} onChange={e => setFDesde(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Fecha hasta</label>
                  <input type="date" value={fHasta} onChange={e => setFHasta(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Tipo</label>
                  <select value={fTipo} onChange={e => setFTipo(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary">
                    <option value="">Todos</option>
                    <option value="COMPRA">Compra</option>
                    <option value="CANCELACION">Cancelación</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Método</label>
                  <select value={fMetodo} onChange={e => setFMetodo(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary">
                    <option value="">Todos</option>
                    {pmList.map(pm => (
                      <option key={pm.idMetodoPago} value={pm.nombre}>{pm.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Estado</label>
                  <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary">
                    <option value="">Todos</option>
                    <option value="pagado">Pagado</option>
                    <option value="completado">Completado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Origen/Destino</label>
                  <input value={fRuta} onChange={e => setFRuta(e.target.value)} placeholder="Provincia" className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <button onClick={() => { setFDesde(''); setFHasta(''); setFTipo(''); setFMetodo(''); setFEstado(''); setFRuta('') }} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Limpiar filtros</button>
                </div>
                <div className="md:col-span-3 flex items-end justify-end text-sm text-text-secondary">{filtered.length} resultado{filtered.length === 1 ? '' : 's'}</div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-text-secondary max-w-6xl mx-auto">No hay movimientos con los filtros aplicados.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 max-w-6xl mx-auto">
                {filtered.map((m, idx) => (
                  <div key={idx} className={`rounded-xl border p-4 shadow-sm ${m.tipo === 'COMPRA' ? 'border-border-soft bg-background-secondary' : 'border-border-soft bg-background-secondary'}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-bold">{m.tipo === 'COMPRA' ? 'Compra' : 'Cancelación'}</div>
                      <div className="text-xs text-text-secondary">{m.fecha} {m.hora?.substring(0,5)}</div>
                    </div>
                    <div className="mt-2 text-sm text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">route</span>{m.origen} → {m.destino}</span>
                      <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">event</span>{m.fechaSalida} {m.horaSalida}</span>
                      <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">apartment</span>{m.empresa}</span>
                      <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">directions_bus</span>{m.busMatricula}</span>
                    </div>
                    <div className="mt-3 text-sm flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">payments</span>{m.metodoPago}</span>
                      <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">credit_card</span>{m.tarjetaMasked}</span>
                      <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">info</span>Estado: {m.estadoCarrito}</span>
                    </div>
                    {m.tipo === 'COMPRA' ? (
                      <div className="mt-3 rounded-lg border border-border-soft bg-white/50 p-3 text-sm">
                        <div className="flex justify-between"><span>Bruto</span><span>S/ {(m.bruto || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Comisión {m.comisionPct != null ? `(${m.comisionPct}%)` : ''}</span><span>S/ {(m.comisionMonto || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold mt-2"><span>Total pagado</span><span>S/ {(m.neto || 0).toFixed(2)}</span></div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg border border-border-soft bg-white/50 p-3 text-sm">
                        <div className="font-semibold mb-1">Original</div>
                        <div className="flex justify-between"><span>Bruto</span><span>S/ {(m.originalBruto || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Comisión</span><span>S/ {(((m.originalNeto || 0) - (m.originalBruto || 0))).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Neto pagado</span><span>S/ {(m.originalNeto || 0).toFixed(2)}</span></div>
                        <div className="font-semibold mt-3 mb-1">Reembolso (1/3)</div>
                        <div className="flex justify-between"><span>Bruto</span><span>S/ {(m.bruto || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Comisión</span><span>S/ {(m.comisionMonto || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold mt-2"><span>Total reembolsado</span><span>S/ {(m.neto || 0).toFixed(2)}</span></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
