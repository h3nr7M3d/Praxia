import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

type PM = {
  idMetodoPago: number
  nombre: string
  tipo?: string
  descripcion?: string
  estado?: string
  comision?: number
}

type CartRow = {
  idCarrito: number
  origenProvincia?: string
  destinoProvincia?: string
  fecha?: string
  hora?: string
  empresaNombre?: string
  empresaNumero?: string
  busMatricula?: string
  seatCode?: string
  precio?: number | string
}

export default function PaymentSelect() {
  const navigate = useNavigate()
  const [methods, setMethods] = useState<PM[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [emailLabel, setEmailLabel] = useState('')
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null)
  const [cards, setCards] = useState<{ idTarjeta: number; numeroMasked: string; fechaCaducidad?: string; marca?: string }[]>([])
  const [cartRows, setCartRows] = useState<CartRow[]>([])
  const [qrData, setQrData] = useState<{ open: boolean; metodoId: number; metodoNombre: string; bruto: number; comision: number; neto: number; img: string } | null>(null)
  const [bankData, setBankData] = useState<{ open: boolean; metodoId: number; metodoNombre: string; numero: string; bruto: number; comision: number; neto: number } | null>(null)
  const [successData, setSuccessData] = useState<{
    totalBruto: number;
    totalNeto: number;
    comision: number;
    metodo: string;
    fecha: string;
    hora: string;
    items: CartRow[];
  } | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const em = localStorage.getItem('userEmail') || ''
        setEmailLabel(em)
        const [res, profRes] = await Promise.all([
          fetch(`${API_BASE}/metodos-pago`),
          fetch(`${API_BASE}/auth/profile?userId=${localStorage.getItem('userId') || ''}`)
        ])
        if (!res.ok) { setError('No se pudieron cargar los métodos de pago'); return }
        const items = await res.json()
        const mapped: PM[] = (items || []).map((m: any) => ({
          idMetodoPago: m.idMetodoPago,
          nombre: m.nombre,
          tipo: m.tipo,
          descripcion: m.descripcion,
          estado: m.estado,
          comision: m.comision != null ? Number(m.comision) : undefined,
        }))
        setMethods(mapped)
        if (profRes.ok) {
          const p = await profRes.json()
          if (p?.tipo === 'cliente' && p?.idCliente) {
            const [cardsRes, cartsRes] = await Promise.all([
              fetch(`${API_BASE}/tarjetas/cliente/${p.idCliente}`),
              fetch(`${API_BASE}/carritos/cliente/${p.idCliente}`),
            ])
            if (cardsRes.ok) {
              const cs = await cardsRes.json(); setCards(cs || [])
            }
            if (cartsRes.ok) {
              const c = await cartsRes.json(); setCartRows(c || [])
            }
          }
        }
      } catch {
        setError('Error de red')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredCards = (() => [])()

  function makeRandomQR() {
    const samples = [
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent('PRAXIA-' + Math.random().toString(36).slice(2))}`,
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent('PAY-' + Date.now())}`,
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent('ORD-' + Math.floor(Math.random()*1e6))}`,
    ]
    return samples[Math.floor(Math.random()*samples.length)]
  }

  function openYapePlin(m: PM) {
    const name = (m.nombre || '').toLowerCase()
    if (!(name.includes('yape') || name.includes('plin'))) return
    const bruto = (cartRows || []).reduce((sum, r) => sum + (r.precio != null ? Number(r.precio) : 0), 0)
    const comision = m.comision != null ? Number(m.comision) : 0
    const neto = bruto * (1 + comision / 100)
    const staticPath = name.includes('yape') ? '/assets/qr-yape.png' : '/assets/qr-plin.png'
    const img = staticPath
    setQrData({ open: true, metodoId: m.idMetodoPago, metodoNombre: m.nombre, bruto, comision, neto, img })
  }

  function openBank(m: PM) {
    const name = (m.nombre || '').toLowerCase()
    if (!(name.includes('interbank') || name.includes('bcp'))) return
    const bruto = (cartRows || []).reduce((sum, r) => sum + (r.precio != null ? Number(r.precio) : 0), 0)
    const comision = m.comision != null ? Number(m.comision) : 0
    const neto = bruto * (1 + comision / 100)
    const prefix = name.includes('interbank') ? 'IBK' : 'BCP'
    const numero12 = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('')
    const numero = `${prefix}-${numero12}`
    setBankData({ open: true, metodoId: m.idMetodoPago, metodoNombre: m.nombre, numero, bruto, comision, neto })
  }

  async function confirmPaymentCash() {
    try {
      if (!qrData) return
      const userId = localStorage.getItem('userId')
      if (!userId) { setToast({ type: 'error', message: 'No hay sesión' }); return }
      const prof = await fetch(`${API_BASE}/auth/profile?userId=${userId}`)
      if (!prof.ok) { setToast({ type: 'error', message: 'No se pudo obtener perfil' }); return }
      const p = await prof.json()
      if (p?.tipo !== 'cliente' || !p?.idCliente) { setToast({ type: 'error', message: 'No es cliente' }); return }
      const res = await fetch(`${API_BASE}/metodos-pago/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCliente: p.idCliente, idMetodoPago: qrData.metodoId, idTarjeta: null })
      })
      if (res.ok) {
        const now = new Date()
        setSuccessData({
          totalBruto: qrData.bruto,
          totalNeto: qrData.neto,
          comision: qrData.comision,
          metodo: qrData.metodoNombre,
          fecha: now.toLocaleDateString(),
          hora: now.toLocaleTimeString(),
          items: cartRows || [],
        })
        setQrData(null)
      } else {
        const msg = await res.text(); setToast({ type: 'error', message: msg || 'No se pudo completar el pago' })
      }
    } catch {
      setToast({ type: 'error', message: 'Error de red al confirmar pago' })
    }
  }

  async function confirmPaymentBank() {
    try {
      if (!bankData) return
      const userId = localStorage.getItem('userId')
      if (!userId) { setToast({ type: 'error', message: 'No hay sesión' }); return }
      const prof = await fetch(`${API_BASE}/auth/profile?userId=${userId}`)
      if (!prof.ok) { setToast({ type: 'error', message: 'No se pudo obtener perfil' }); return }
      const p = await prof.json()
      if (p?.tipo !== 'cliente' || !p?.idCliente) { setToast({ type: 'error', message: 'No es cliente' }); return }
      const res = await fetch(`${API_BASE}/metodos-pago/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCliente: p.idCliente, idMetodoPago: bankData.metodoId, idTarjeta: null })
      })
      if (res.ok) {
        const now = new Date()
        setSuccessData({
          totalBruto: bankData.bruto,
          totalNeto: bankData.neto,
          comision: bankData.comision,
          metodo: `${bankData.metodoNombre} (${bankData.numero})`,
          fecha: now.toLocaleDateString(),
          hora: now.toLocaleTimeString(),
          items: cartRows || [],
        })
        setBankData(null)
      } else {
        const msg = await res.text(); setToast({ type: 'error', message: msg || 'No se pudo completar el pago' })
      }
    } catch {
      setToast({ type: 'error', message: 'Error de red al confirmar pago' })
    }
  }

  function downloadReceipt() {
    if (!successData) return
    const w = window.open('', '_blank'); if (!w) return
    const styles = `
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial; color: #0f172a; }
      .card { max-width: 720px; margin: 24px auto; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; background: #ffffff; }
      .row { display: flex; justify-content: space-between; margin: 6px 0; }
      .muted { color: #64748b; }
      .title { font-size: 20px; color: #2563eb; font-weight: 700; margin: 0 0 12px; text-align: center; }
      .logo { height: 56px; }
      .hr { height: 2px; background: #f1f5f9; border: 0; margin: 12px 0; }
      .badge { display: inline-block; padding: 2px 8px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 9999px; color: #1d4ed8; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; text-align: left; }
      th { background: #f8fafc; }
    `
    const items = (successData.items || [])
    const rowsHtml = items.map(it => (
      `<tr>
         <td>${it.origenProvincia ?? '-'}</td>
         <td>${it.destinoProvincia ?? '-'}</td>
         <td>${it.fecha ?? '-'}</td>
         <td>${it.hora ?? '-'}</td>
         <td>${it.empresaNombre ?? '-'}</td>
         <td>${it.busMatricula ?? '-'}</td>
         <td>${it.seatCode ?? '-'}</td>
         <td>S/ ${Number(it.precio ?? 0).toFixed(2)}</td>
       </tr>`
    )).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Boleta - Praxia</title><style>${styles}</style></head><body>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <img class="logo" src="${location.origin}/assets/logo/praxia_logo_sin_fondo_nombre.png" alt="Praxia"/>
          <div class="badge">Pago satisfactorio</div>
        </div>
        <h1 class="title">Boleta de compra</h1>
        <div class="row"><div class="muted">Fecha</div><div>${successData.fecha}</div></div>
        <div class="row"><div class="muted">Hora</div><div>${successData.hora}</div></div>
        <hr class="hr"/>
        <div class="row"><div class="muted">Método de pago</div><div>${successData.metodo}</div></div>
        <hr class="hr"/>
        <div class="muted" style="margin: 6px 0;">Detalle de pasajes</div>
        <table>
          <thead>
            <tr>
              <th>Origen</th>
              <th>Destino</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Empresa</th>
              <th>Bus</th>
              <th>Asiento</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <hr class="hr"/>
        <div class="row"><div>Total bruto</div><div>S/ ${successData.totalBruto.toFixed(2)}</div></div>
        <div class="row"><div>Comisión (${successData.comision}%)</div><div>S/ ${(successData.totalBruto * (successData.comision/100)).toFixed(2)}</div></div>
        <div class="row" style="font-weight:700;"><div>Total pagado</div><div>S/ ${successData.totalNeto.toFixed(2)}</div></div>
        <p class="muted" style="margin-top:12px;">Gracias por su compra.</p>
      </div>
      <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); }<\/script>
    </body></html>`
    w.document.open(); w.document.write(html); w.document.close();
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
      {bankData && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-background-secondary border-2 border-border-soft shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border-soft">
              <h2 className="font-display text-xl">{bankData.metodoNombre}</h2>
              <button onClick={() => setBankData(null)} className="text-text-secondary hover:text-primary" aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 text-sm">
              <div className="rounded-lg border border-border-soft bg-white/50 p-3">
                <div className="text-center mb-2 text-xs text-text-secondary">Usa el siguiente número de pago</div>
                <div className="text-center text-2xl font-mono tracking-wide mb-3">{bankData.numero}</div>
                <div className="flex justify-between"><span>Total bruto</span><span>S/ {bankData.bruto.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Comisión ({bankData.comision}%)</span><span>S/ {(bankData.bruto * (bankData.comision/100)).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold mt-1"><span>Total a pagar</span><span>S/ {bankData.neto.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="p-4 border-t border-border-soft flex justify-end gap-2">
              <button onClick={() => setBankData(null)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cancelar</button>
              <button onClick={confirmPaymentBank} className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90">Continuar</button>
            </div>
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <h1 className="font-display text-2xl text-primary mb-4 text-center">Selecciona un método de pago</h1>
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
          methods.length === 0 ? (
            <div className="text-text-secondary">No hay métodos de pago disponibles.</div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
                {methods.map(m => (
                  <div key={m.idMetodoPago} className="rounded-xl border border-border-soft bg-background-secondary p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-lg">{m.nombre}</div>
                      <div className="text-xs px-2 py-0.5 rounded-md bg-white/70 text-text-secondary">{m.tipo}</div>
                    </div>
                    {m.descripcion && <div className="text-sm text-text-secondary mt-2">{m.descripcion}</div>}
                    <div className="mt-3 text-sm text-text-secondary flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">payments</span>
                      <span>Comisión: {m.comision != null ? `${m.comision}%` : '0%'}</span>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button onClick={() => {
                        const brand = (m.nombre || '').toLowerCase()
                        if (brand.includes('yape') || brand.includes('plin')) {
                          openYapePlin(m)
                        } else if (brand.includes('interbank') || brand.includes('bcp')) {
                          openBank(m)
                        } else {
                          navigate(`/dashboard/cliente/pago/tarjetas/${brand}`)
                        }
                      }} className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90">Usar este método</button>
                    </div>
                  </div>
                ))}
              </div>
              
            </>
          )
        )}
      </div>
      {qrData && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-background-secondary border-2 border-border-soft shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border-soft">
              <h2 className="font-display text-xl">{qrData.metodoNombre}</h2>
              <button onClick={() => setQrData(null)} className="text-text-secondary hover:text-primary" aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 text-sm">
              <div className="flex flex-col items-center gap-3">
                <img src={qrData.img} alt="QR" className="w-56 h-56 rounded-lg border border-border-soft bg-white" onError={(e) => { (e.currentTarget as HTMLImageElement).onerror = null; (e.currentTarget as HTMLImageElement).src = makeRandomQR(); }} />
                <div className="text-center text-xs text-text-secondary">
                  Escanea este código con tu app <span className="font-medium">{qrData.metodoNombre}</span> y realiza el pago.
                  <br/>Cuando termines, presiona <span className="font-medium">Continuar</span> para confirmar.
                </div>
                <div className="rounded-lg border border-border-soft bg-white/50 p-3 w-full">
                  <div className="flex justify-between"><span>Total bruto</span><span>S/ {qrData.bruto.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Comisión ({qrData.comision}%)</span><span>S/ {(qrData.bruto * (qrData.comision/100)).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold mt-1"><span>Total a pagar</span><span>S/ {qrData.neto.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border-soft flex justify-end gap-2">
              <button onClick={() => setQrData(null)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cancelar</button>
              <button onClick={confirmPaymentCash} className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90">Continuar</button>
            </div>
          </div>
        </div>
      )}
      {successData && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-background-secondary border-2 border-border-soft shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border-soft">
              <h2 className="font-display text-xl">Pago exitoso</h2>
              <button onClick={() => setSuccessData(null)} className="text-text-secondary hover:text-primary" aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 text-sm">
              <div className="rounded-lg border border-border-soft bg-white/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-primary">Pago satisfactorio</div>
                  <img src="/assets/logo/praxia_logo_sin_fondo_nombre.png" alt="Praxia" className="h-10" />
                </div>
                <div className="mt-3 flex justify-between"><span>Fecha</span><span>{successData.fecha}</span></div>
                <div className="flex justify-between"><span>Hora</span><span>{successData.hora}</span></div>
                <div className="mt-2 flex justify-between"><span>Método</span><span>{successData.metodo}</span></div>
                <div className="mt-3">
                  <div className="font-semibold mb-1">Detalle</div>
                  <div className="space-y-1 max-h-48 overflow-auto pr-1">
                    {(successData.items || []).map((it) => (
                      <div key={it.idCarrito} className="flex items-center justify-between text-xs">
                        <div className="text-text-secondary">
                          {it.origenProvincia} → {it.destinoProvincia} • {it.fecha} {it.hora} • Asiento {it.seatCode}
                        </div>
                        <div>S/ {Number(it.precio ?? 0).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex justify-between"><span>Total pagado</span><span>S/ {successData.totalNeto.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="p-4 border-t border-border-soft flex justify-end gap-2">
              <button onClick={downloadReceipt} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary inline-flex items-center gap-2">
                <span className="material-symbols-outlined">download</span>
                Descargar boleta (PDF)
              </button>
              <button onClick={() => { setSuccessData(null); navigate('/dashboard/cliente'); }} className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90">Continuar</button>
            </div>
          </div>
        </div>
      )}
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
