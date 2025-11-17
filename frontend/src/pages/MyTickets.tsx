import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UserAvatar from '../components/UserAvatar'

type TicketRow = {
  id: number
  origen: string
  destino: string
  fecha: string
  hora: string
  fechaLlegada?: string
  horaLlegada?: string
  // detalle
  empresaNombre?: string
  empresaNumero?: string
  busMatricula?: string
  seatCode?: string
  choferes?: string[]
  azafatos?: string[]
  sucursalOrigen?: { nombre: string; provincia: string; direccion: string }
  sucursalDestino?: { nombre: string; provincia: string; direccion: string }
}

export default function MyTickets() {
  const [rows, setRows] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<TicketRow | null>(null)
  const [open, setOpen] = useState(false)
  const [emailLabel, setEmailLabel] = useState('')
  const [pendingCancel, setPendingCancel] = useState<TicketRow | null>(null)
  const [refund, setRefund] = useState<{ precio: string; refund: string; percent: number } | null>(null)
  const [fOrigen, setFOrigen] = useState('')
  const [fDestino, setFDestino] = useState('')
  const [fFechaDesde, setFFechaDesde] = useState('')
  const [fFechaHasta, setFFechaHasta] = useState('')
  const [fHoraDesde, setFHoraDesde] = useState('')
  const [fHoraHasta, setFHoraHasta] = useState('')

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
        // Endpoint esperado: listar pasajes del cliente
        // Ajustar cuando el backend esté listo
        const res = await fetch(`${API_BASE}/pasajes/cliente/${p.idCliente}`)
        if (!res.ok) { 
          console.error('Error al cargar pasajes:', res.status, res.statusText)
          setError('No se pudieron cargar tus pasajes'); 
          return 
        }
        const items = await res.json()
        console.log('Pasajes recibidos:', items)
        const mapped: TicketRow[] = (items || []).map((it: any) => ({
          id: it.idPasaje ?? it.id ?? 0,
          origen: it.origenProvincia ?? it.origen ?? '-',
          destino: it.destinoProvincia ?? it.destino ?? '-',
          fecha: it.fecha ?? '-',
          hora: it.hora ?? '-',
          fechaLlegada: it.fechaLlegada,
          horaLlegada: it.horaLlegada,
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

  useEffect(() => {
    const loadRefund = async () => {
      if (!pendingCancel) { setRefund(null); return }
      try {
        const res = await fetch(`${API_BASE}/pasajes/${pendingCancel.id}/refund`)
        if (!res.ok) { setRefund(null); return }
        const info = await res.json()
        setRefund(info)
      } catch {
        setRefund(null)
      }
    }
    loadRefund()
  }, [pendingCancel])

  async function cancelTicket(id: number) {
    try {
      const res = await fetch(`${API_BASE}/pasajes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRows(prev => prev.filter(r => r.id !== id))
        setPendingCancel(null)
      } else {
        alert('No se pudo cancelar el pasaje')
      }
    } catch {
      alert('Error de red al cancelar')
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
      {pendingCancel && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-background-secondary border-2 border-border-soft shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border-soft">
              <h2 className="font-display text-xl">Confirmar cancelación</h2>
              <button onClick={() => setPendingCancel(null)} className="text-text-secondary hover:text-primary" aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-600">warning</span>
                <div>
                  <p className="text-sm md:text-base">¿Deseas cancelar este pasaje?</p>
                  <p className="text-text-secondary text-sm mt-1">Esta acción marcará el carrito como cancelado.</p>
                  {refund && (
                    <p className="text-sm mt-2">
                      Reembolso estimado: <span className="font-semibold">S/ {Number(refund.refund).toFixed(2)}</span>
                      {' '}(<span className="font-semibold">{refund.percent}%</span> de S/ {Number(refund.precio).toFixed(2)})
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-border-soft bg-white/50 p-3 text-sm">
                <div><span className="font-bold">Origen:</span> {pendingCancel.origen}</div>
                <div><span className="font-bold">Destino:</span> {pendingCancel.destino}</div>
                <div><span className="font-bold">Fecha:</span> {pendingCancel.fecha} <span className="font-bold ml-3">Hora:</span> {pendingCancel.hora}</div>
              </div>
            </div>
            <div className="p-4 border-t border-border-soft flex justify-end gap-2">
              <button onClick={() => setPendingCancel(null)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">No, volver</button>
              <button onClick={() => cancelTicket(pendingCancel.id)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Sí, cancelar</button>
            </div>
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
      </header>
      <div className="p-6">
      <h1 className="font-display text-2xl text-primary mb-4 text-center">Mis pasajes</h1>

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
              const llegadaStr = r.fechaLlegada && r.horaLlegada ? `${r.fechaLlegada}T${r.horaLlegada}` : null
              const llegada = llegadaStr ? new Date(llegadaStr) : null
              const notFinalizado = llegada ? new Date() <= llegada : true
              return passOrigen && passDestino && passFechaDesde && passFechaHasta && passHoraDesde && passHoraHasta && notFinalizado
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
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(r => {
                            const llegadaStr = r.fechaLlegada && r.horaLlegada ? `${r.fechaLlegada}T${r.horaLlegada}` : null
                            const llegada = llegadaStr ? new Date(llegadaStr) : null
                            const isFinalizado = llegada ? new Date() > llegada : false
                            return (
                            <tr key={r.id} className={`border-t border-border-soft ${isFinalizado ? 'bg-green-50' : ''}`}>
                              <td className="px-4 py-3">{r.origen}</td>
                              <td className="px-4 py-3">{r.destino}</td>
                              <td className="px-4 py-3">{r.fecha}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 justify-between">
                                  <span>{r.hora}</span>
                                  {isFinalizado && (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-green-200 text-green-800">Ya finalizó</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setDetail(r)} className="px-3 py-1 rounded-md border border-border-soft hover:border-primary">Ver detalle</button>
                                  <button onClick={() => setPendingCancel(r)} className="px-3 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50">Cancelar</button>
                                </div>
                              </td>
                            </tr>
                          )})}
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
              <h2 className="font-display text-xl">Detalle de pasaje</h2>
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
      </div>
    </div>
  )
}
