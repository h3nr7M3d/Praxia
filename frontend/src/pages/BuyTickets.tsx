import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UserAvatar from '../components/UserAvatar'

type OptionRow = {
  idAsignacionRuta: number
  origen: string
  destino: string
  fecha: string
  hora: string
  precio: number
  disponibles?: number
  total?: number
  empresaNombre?: string
  empresaNumero?: string
  busMatricula?: string
  choferes?: string[]
  azafatos?: string[]
  sucursalOrigen?: { nombre: string; provincia: string; direccion: string }
  sucursalDestino?: { nombre: string; provincia: string; direccion: string }
}

export default function BuyTickets() {
  const [rows, setRows] = useState<OptionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<OptionRow | null>(null)
  const [open, setOpen] = useState(false)
  const [emailLabel, setEmailLabel] = useState('')
  const [adding, setAdding] = useState<number | null>(null)
  const [seatPicker, setSeatPicker] = useState<{ idAsignacionRuta: number; seats: { idAsiento: number; codigo: string; disponibilidad: string }[]; loading: boolean; selectedIds: number[] } | null>(null)
  const [fOrigen, setFOrigen] = useState('')
  const [fDestino, setFDestino] = useState('')
  const [fFechaDesde, setFFechaDesde] = useState('')
  const [fFechaHasta, setFFechaHasta] = useState('')
  const [fHoraDesde, setFHoraDesde] = useState('')
  const [fHoraHasta, setFHoraHasta] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const em = localStorage.getItem('userEmail') || ''
        setEmailLabel(em)
        const res = await fetch(`${API_BASE}/compras/opciones`)
        if (!res.ok) { setError('No se pudieron cargar opciones'); return }
        const items = await res.json()
        const mapped: OptionRow[] = (items || []).map((it: any) => ({
          idAsignacionRuta: it.idAsignacionRuta,
          origen: it.origenProvincia ?? '-',
          destino: it.destinoProvincia ?? '-',
          fecha: it.fecha ?? '-',
          hora: it.hora ?? '-',
          precio: Number(it.precio ?? 0),
          disponibles: it.disponibles != null ? Number(it.disponibles) : undefined,
          total: it.total != null ? Number(it.total) : undefined,
          empresaNombre: it.empresaNombre,
          empresaNumero: it.empresaNumero,
          busMatricula: it.busMatricula,
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

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function addToCartDirect(idAsignacionRuta: number, idAsiento?: number) {
    try {
      setAdding(idAsignacionRuta)
      const userId = localStorage.getItem('userId')
      if (!userId) { setToast({ type: 'error', message: 'No hay sesión' }); return }
      const prof = await fetch(`${API_BASE}/auth/profile?userId=${userId}`)
      if (!prof.ok) { setToast({ type: 'error', message: 'No se pudo obtener perfil' }); return }
      const p = await prof.json()
      if (p?.tipo !== 'cliente' || !p?.idCliente) { setToast({ type: 'error', message: 'No es cliente' }); return }
      const res = await fetch(`${API_BASE}/compras/carrito`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCliente: p.idCliente, idAsignacionRuta, idAsiento: idAsiento ?? null }),
      })
      if (res.ok) {
        setToast({ type: 'success', message: 'Añadido al carrito' })
      } else {
        const msg = await res.text()
        setToast({ type: 'error', message: msg || 'No se pudo añadir al carrito' })
      }
    } catch {
      setToast({ type: 'error', message: 'Error de red' })
    } finally {
      setAdding(null)
    }
  }

  async function openSeatPicker(idAsignacionRuta: number) {
    setSeatPicker({ idAsignacionRuta, seats: [], loading: true, selectedIds: [] })
    try {
      const res = await fetch(`${API_BASE}/compras/asientos/${idAsignacionRuta}`)
      if (!res.ok) { setSeatPicker(null); setToast({ type: 'error', message: 'No se pudieron cargar los asientos' }); return }
      const seats = await res.json()
      setSeatPicker({ idAsignacionRuta, seats, loading: false, selectedIds: [] })
    } catch {
      setSeatPicker(null)
      setToast({ type: 'error', message: 'Error de red al cargar asientos' })
    }
  }

  async function confirmSelectedSeats() {
    if (!seatPicker || seatPicker.selectedIds.length === 0) return
    const ids = [...seatPicker.selectedIds]
    setAdding(seatPicker.idAsignacionRuta)
    try {
      // Añadir todos los asientos seleccionados (una solicitud por asiento)
      for (const sid of ids) {
        await addToCartDirect(seatPicker.idAsignacionRuta, sid)
      }
      setToast({ type: 'success', message: `Añadidos ${ids.length} asientos al carrito` })
    } catch {
      setToast({ type: 'error', message: 'Error al añadir asientos seleccionados' })
    } finally {
      setAdding(null)
      setSeatPicker(null)
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
        <h1 className="font-display text-2xl text-primary mb-4 text-center">Comprar pasajes</h1>

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
                    <th className="px-4 py-3">Disponibilidad</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.idAsignacionRuta} className="border-t border-border-soft">
                      <td className="px-4 py-3">{r.origen}</td>
                      <td className="px-4 py-3">{r.destino}</td>
                      <td className="px-4 py-3">{r.fecha}</td>
                      <td className="px-4 py-3">{r.hora}</td>
                      <td className="px-4 py-3">S/ {r.precio.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {(() => {
                          const total = r.total ?? 0
                          const disp = r.disponibles ?? 0
                          if (total === 0 || disp === 0) {
                            return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-red-100 text-red-700 border border-red-200">Agotado</span>
                          }
                          const cls = disp < 5 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-green-100 text-green-800 border-green-200'
                          return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${cls}`}>{disp}/{total}</span>
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setDetail(r)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary">Ver detalle</button>
                          <button disabled={adding === r.idAsignacionRuta} onClick={() => openSeatPicker(r.idAsignacionRuta)} className="px-3 py-1 rounded-md border border-primary text-white bg-primary hover:opacity-90 disabled:opacity-60">Añadir al carrito</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
                  )}
              </>
            )
          })()
        )}

        {detail && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
            <div className="w-full max-w-2xl rounded-xl bg-background-secondary border-2 border-border-soft shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-border-soft">
                <h2 className="font-display text-xl">Detalle de ruta</h2>
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
                  <div className="mt-2 font-bold">Choferes</div>
                  <ul className="list-disc pl-5 text-text-secondary">
                    {(detail.choferes ?? []).map((c, idx) => (<li key={idx}>{c}</li>))}
                  </ul>
                  <div className="mt-2 font-bold">Azafatos</div>
                  <ul className="list-disc pl-5 text-text-secondary">
                    {(detail.azafatos ?? []).map((a, idx) => (<li key={idx}>{a}</li>))}
                  </ul>
                </div>
                <div className="rounded-lg border border-border-soft p-3 bg-white/50 md:col-span-2">
                  <div className="font-bold mb-1">Precio</div>
                  <div>S/ {detail.precio.toFixed(2)}</div>
                </div>
              </div>
              <div className="p-4 border-t border-border-soft flex justify-end">
                <button onClick={() => setDetail(null)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cerrar</button>
              </div>
            </div>
          </div>
        )}
        {seatPicker && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
            <div className="w-full max-w-3xl rounded-xl bg-background-secondary border-2 border-border-soft shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-border-soft">
                <h2 className="font-display text-xl">Selecciona tu asiento</h2>
                <button onClick={() => setSeatPicker(null)} className="text-text-secondary hover:text-primary" aria-label="Cerrar">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-4">
                {seatPicker.loading ? (
                  <div className="text-text-secondary">Cargando asientos...</div>
                ) : (
                  <>
                    <div className="mb-3 text-sm text-text-secondary">Toque un asiento disponible para seleccionarlo.</div>
                    <div className="text-center text-xs font-semibold text-text-secondary mb-2">
                      <span className="material-symbols-outlined align-middle mr-1" aria-hidden>
                        directions_bus
                      </span>
                      Frente
                    </div>
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const rows: { idAsiento: number; codigo: string; disponibilidad: string }[][] = []
                        for (let i = 0; i < seatPicker.seats.length; i += 4) {
                          rows.push(seatPicker.seats.slice(i, i + 4))
                        }
                        return rows.map((row, rIdx) => (
                          <div key={rIdx} className="grid grid-cols-5 gap-2 items-center">
                            {/* Izquierda (2) */}
                            {row.slice(0, 2).map(s => {
                              const disp = (s.disponibilidad || '').toLowerCase()
                              const isSelected = seatPicker.selectedIds.includes(s.idAsiento)
                              let cls = 'bg-green-500'
                              if (disp === 'mantenimiento') cls = 'bg-yellow-400'
                              if (disp === 'ocupado') cls = 'bg-red-500'
                              if (isSelected) cls = 'bg-blue-600'
                              const clickable = disp === 'disponible'
                              return (
                                <button
                                  key={s.idAsiento}
                                  onClick={() => clickable && setSeatPicker(prev => {
                                    if (!prev) return prev
                                    const sel = prev.selectedIds
                                    const exists = sel.includes(s.idAsiento)
                                    const next = exists ? sel.filter(x => x !== s.idAsiento) : [...sel, s.idAsiento]
                                    return { ...prev, selectedIds: next }
                                  })}
                                  className={`h-10 rounded-md text-white text-xs font-medium flex items-center justify-center ${cls} ${clickable ? 'hover:opacity-90' : 'opacity-70 cursor-not-allowed'}`}
                                  title={`Asiento ${s.codigo} - ${s.disponibilidad}`}
                                >
                                  {s.codigo}
                                </button>
                              )
                            })}
                            {/* Pasillo */}
                            <div className="w-full h-8 rounded-sm bg-border-soft/70" aria-hidden />
                            {/* Derecha (2) */}
                            {row.slice(2, 4).map(s => {
                              const disp = (s.disponibilidad || '').toLowerCase()
                              const isSelected = seatPicker.selectedIds.includes(s.idAsiento)
                              let cls = 'bg-green-500'
                              if (disp === 'mantenimiento') cls = 'bg-yellow-400'
                              if (disp === 'ocupado') cls = 'bg-red-500'
                              if (isSelected) cls = 'bg-blue-600'
                              const clickable = disp === 'disponible'
                              return (
                                <button
                                  key={s.idAsiento}
                                  onClick={() => clickable && setSeatPicker(prev => {
                                    if (!prev) return prev
                                    const sel = prev.selectedIds
                                    const exists = sel.includes(s.idAsiento)
                                    const next = exists ? sel.filter(x => x !== s.idAsiento) : [...sel, s.idAsiento]
                                    return { ...prev, selectedIds: next }
                                  })}
                                  className={`h-10 rounded-md text-white text-xs font-medium flex items-center justify-center ${cls} ${clickable ? 'hover:opacity-90' : 'opacity-70 cursor-not-allowed'}`}
                                  title={`Asiento ${s.codigo} - ${s.disponibilidad}`}
                                >
                                  {s.codigo}
                                </button>
                              )
                            })}
                          </div>
                        ))
                      })()}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-green-500 rounded-sm"></span> Disponible</div>
                      <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-yellow-400 rounded-sm"></span> Mantenimiento</div>
                      <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-red-500 rounded-sm"></span> Ocupado</div>
                      <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-blue-600 rounded-sm"></span> Seleccionado</div>
                    </div>
                  </>
                )}
              </div>
              <div className="p-4 border-t border-border-soft flex justify-end gap-2">
                <button onClick={() => setSeatPicker(null)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cancelar</button>
                <button disabled={!seatPicker.selectedIds.length || adding === seatPicker.idAsignacionRuta} onClick={confirmSelectedSeats} className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-60">Confirmar ({seatPicker.selectedIds.length || 0})</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <div className={`min-w-[260px] max-w-sm rounded-xl border-2 shadow-2xl p-3 flex items-start gap-2 ${toast.type === 'success' ? 'bg-background-secondary border-border-soft' : 'bg-white border-red-200'}`}>
            <span className={`material-symbols-outlined ${toast.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {toast.type === 'success' ? 'check_circle' : 'error' }
            </span>
            <div className="flex-1 text-sm text-text-primary">{toast.message}</div>
            <button onClick={() => setToast(null)} className="text-text-secondary hover:text-primary" aria-label="Cerrar">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
