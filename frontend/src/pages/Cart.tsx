import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

type CartRow = {
  id: number
  origen: string
  destino: string
  fecha: string
  hora: string
  precio?: number
  empresaNombre?: string
  empresaNumero?: string
  busMatricula?: string
  seatCode?: string
  choferes?: string[]
  azafatos?: string[]
  sucursalOrigen?: { nombre: string; provincia: string; direccion: string }
  sucursalDestino?: { nombre: string; provincia: string; direccion: string }
}

export default function Cart() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<CartRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<CartRow | null>(null)
  const [open, setOpen] = useState(false)
  const [emailLabel, setEmailLabel] = useState('')
  const [fOrigen, setFOrigen] = useState('')
  const [fDestino, setFDestino] = useState('')
  const [fFechaDesde, setFFechaDesde] = useState('')
  const [fFechaHasta, setFFechaHasta] = useState('')
  const [fHoraDesde, setFHoraDesde] = useState('')
  const [fHoraHasta, setFHoraHasta] = useState('')
  const [pendingRemove, setPendingRemove] = useState<CartRow | null>(null)

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
        const res = await fetch(`${API_BASE}/carritos/cliente/${p.idCliente}`)
        if (!res.ok) { setError('No se pudieron cargar tus carritos'); return }
        const items = await res.json()
        const mapped: CartRow[] = (items || []).map((it: any) => ({
          id: it.idCarrito ?? it.id ?? 0,
          origen: it.origenProvincia ?? it.origen ?? '-',
          destino: it.destinoProvincia ?? it.destino ?? '-',
          fecha: it.fecha ?? '-',
          hora: it.hora ?? '-',
          precio: it.precio != null ? Number(it.precio) : undefined,
          empresaNombre: it.empresaNombre,
          empresaNumero: it.empresaNumero,
          busMatricula: it.busMatricula,
          seatCode: it.seatCode,
          choferes: it.choferes,
          azafatos: it.azafatos,
          sucursalOrigen: it.sucursalOrigen,
          sucursalDestino: it.sucursalDestino,
        }))
        setRows(mapped)
      } catch {
        setError('Error de red')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function removeFromCart(id: number) {
    try {
      const res = await fetch(`${API_BASE}/carritos/${id}`, { method: 'DELETE' })
      if (res.status === 204) {
        setRows(prev => prev.filter(r => r.id !== id))
        setPendingRemove(null)
      } else {
        const msg = await res.text()
        alert(msg || 'No se pudo quitar del carrito')
      }
    } catch {
      alert('Error de red al quitar del carrito')
    }
  }

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
            <Link to="/dashboard/cliente/movimientos" className="text-text-secondary hover:text-primary inline-flex items-center gap-1">
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
                <span className="material-symbols-outlined">person</span>
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
        <h1 className="font-display text-2xl text-primary mb-4 text-center">Carrito</h1>

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
          (() => {
            const filtered = rows.filter(r => {
              const passOrigen = !fOrigen || r.origen.toLowerCase().includes(fOrigen.toLowerCase())
              const passDestino = !fDestino || r.destino.toLowerCase().includes(fDestino.toLowerCase())
              const passFechaDesde = !fFechaDesde || (r.fecha && r.fecha >= fFechaDesde)
              const passFechaHasta = !fFechaHasta || (r.fecha && r.fecha <= fFechaHasta)
              const passHoraDesde = !fHoraDesde || (r.hora && r.hora >= fHoraDesde)
              const passHoraHasta = !fHoraHasta || (r.hora && r.hora <= fHoraHasta)
              return passOrigen && passDestino && passFechaDesde && passFechaHasta && passHoraDesde && passHoraHasta
            })
            const count = filtered.length
            return (
              <>
                <div className="rounded-xl border border-border-soft bg-background-secondary p-4 mb-4">
                  <div className="grid md:grid-cols-6 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-text-secondary mb-1">Origen</label>
                      <input value={fOrigen} onChange={e => setFOrigen(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" placeholder="Provincia origen" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-text-secondary mb-1">Destino</label>
                      <input value={fDestino} onChange={e => setFDestino(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" placeholder="Provincia destino" />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Fecha desde</label>
                      <input type="date" value={fFechaDesde} onChange={e => setFFechaDesde(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Fecha hasta</label>
                      <input type="date" value={fFechaHasta} onChange={e => setFFechaHasta(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Hora desde</label>
                      <input type="time" value={fHoraDesde} onChange={e => setFHoraDesde(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Hora hasta</label>
                      <input type="time" value={fHoraHasta} onChange={e => setFHoraHasta(e.target.value)} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <button onClick={() => { setFOrigen(''); setFDestino(''); setFFechaDesde(''); setFFechaHasta(''); setFHoraDesde(''); setFHoraHasta('') }} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Limpiar filtros</button>
                    </div>
                    <div className="md:col-span-3 flex items-end justify-end text-sm text-text-secondary">{count} resultado{count === 1 ? '' : 's'}</div>
                  </div>
                </div>
                {
                  count === 0 ? (
                    <div className="text-text-secondary">No hay resultados con los filtros aplicados.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border-soft bg-background-secondary">
                      <table className="min-w-full text-sm">
                        <thead className="bg-white/50">
                          <tr className="text-left">
                            <th className="px-4 py-3">Origen</th>
                            <th className="px-4 py-3">Destino</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Hora</th>
                            <th className="px-4 py-3">Precio</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(r => {
                            const salidaStr = r.fecha && r.hora ? `${r.fecha}T${r.hora}` : null
                            const salida = salidaStr ? new Date(salidaStr) : null
                            const yaInicio = salida ? new Date() >= salida : false
                            return (
                              <tr key={r.id} className={`border-t border-border-soft ${yaInicio ? 'bg-red-50' : ''}`}>
                                <td className="px-4 py-3">{r.origen}</td>
                                <td className="px-4 py-3">{r.destino}</td>
                                <td className="px-4 py-3">{r.fecha}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2 justify-between">
                                    <span>{r.hora}</span>
                                    {yaInicio && (
                                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-red-200 text-red-800">Ya inició</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">{r.precio != null ? `S/ ${r.precio.toFixed(2)}` : '-'}</td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setDetail(r)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary">Ver detalle</button>
                                    <button onClick={() => setPendingRemove(r)} className="px-3 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50">Quitar</button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => navigate('/dashboard/cliente/pago')} className="px-5 py-2 rounded-lg bg-primary text-white hover:opacity-90">Realizar compra</button>
                  </div>
              </>
            )
          })()
        )}

        {detail && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
            <div className="w-full max-w-2xl rounded-xl bg-background-secondary border-2 border-border-soft shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-border-soft">
                <h2 className="font-display text-xl">Detalle de carrito</h2>
                <button onClick={() => setDetail(null)} className="text-text-secondary hover:text-primary">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-4 grid md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-border-soft p-3 bg-white/50">
                  <div className="font-bold mb-1">Origen</div>
                  <div>{detail.sucursalOrigen?.nombre}</div>
                  <div className="text-text-secondary">{detail.sucursalOrigen?.provincia}</div>
                  <div className="text-text-secondary">{detail.sucursalOrigen?.direccion}</div>
                </div>
                <div className="rounded-lg border border-border-soft p-3 bg-white/50">
                  <div className="font-bold mb-1">Destino</div>
                  <div>{detail.sucursalDestino?.nombre}</div>
                  <div className="text-text-secondary">{detail.sucursalDestino?.provincia}</div>
                  <div className="text-text-secondary">{detail.sucursalDestino?.direccion}</div>
                </div>
                <div className="rounded-lg border border-border-soft p-3 bg-white/50">
                  <div className="font-bold mb-1">Empresa</div>
                  <div>{detail.empresaNombre ?? '-'}</div>
                  <div className="text-text-secondary">Número: {detail.empresaNumero ?? '-'}</div>
                </div>
                <div className="rounded-lg border border-border-soft p-3 bg-white/50">
                  <div className="font-bold mb-1">Bus</div>
                  <div>Matrícula: {detail.busMatricula ?? '-'}</div>
                  <div className="text-text-secondary">Asiento: {detail.seatCode ?? '-'}</div>
                  <div className="mt-2 font-bold">Choferes</div>
                  <ul className="list-disc pl-5 text-text-secondary">
                    {(detail.choferes ?? []).map((c, idx) => (<li key={idx}>{c}</li>))}
                  </ul>
                  <div className="mt-2 font-bold">Azafatos</div>
                  <ul className="list-disc pl-5 text-text-secondary">
                    {(detail.azafatos ?? []).map((a, idx) => (<li key={idx}>{a}</li>))}
                  </ul>
                </div>
              </div>
              <div className="p-4 border-t border-border-soft flex justify-end">
                <button onClick={() => setDetail(null)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cerrar</button>
              </div>
            </div>
          </div>
        )}
        {pendingRemove && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-xl bg-background-secondary border-2 border-border-soft shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-border-soft">
                <h2 className="font-display text-xl">Quitar del carrito</h2>
                <button onClick={() => setPendingRemove(null)} className="text-text-secondary hover:text-primary" aria-label="Cerrar">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600">warning</span>
                  <div>
                    <p className="text-sm md:text-base">¿Deseas quitar este item del carrito?</p>
                    <p className="text-text-secondary text-sm mt-1">Se liberará el asiento reservado.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-border-soft bg-white/50 p-3 text-sm">
                  <div><span className="font-bold">Origen:</span> {pendingRemove.origen}</div>
                  <div><span className="font-bold">Destino:</span> {pendingRemove.destino}</div>
                  <div><span className="font-bold">Fecha:</span> {pendingRemove.fecha} <span className="font-bold ml-3">Hora:</span> {pendingRemove.hora}</div>
                </div>
              </div>
              <div className="p-4 border-t border-border-soft flex justify-end gap-2">
                <button onClick={() => setPendingRemove(null)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">No, volver</button>
                <button onClick={() => removeFromCart(pendingRemove.id)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Sí, quitar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
