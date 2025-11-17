import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import UserAvatar from '../components/UserAvatar'

type CardItem = {
  idTarjeta: number
  numeroMasked: string
  fechaCaducidad?: string
  marca?: string
  metodoPago?: string
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

export default function PaymentCards() {
  const { brand } = useParams()
  const navigate = useNavigate()
  const [cards, setCards] = useState<CardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [emailLabel, setEmailLabel] = useState('')
  const [methods, setMethods] = useState<{ idMetodoPago: number; nombre: string; comision?: number }[]>([])
  const [cartRows, setCartRows] = useState<CartRow[]>([])
  const [confirmData, setConfirmData] = useState<{ cardId: number; bruto: number; comision: number; neto: number; metodoId: number } | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [successData, setSuccessData] = useState<{
    totalBruto: number;
    totalNeto: number;
    comision: number;
    metodo: string;
    tarjetaMasked?: string;
    fecha: string;
    hora: string;
    items: CartRow[];
  } | null>(null)

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
        if (p?.tipo !== 'cliente' || !p?.idCliente) { setCards([]); return }
        const [cardsRes, methRes, cartsRes] = await Promise.all([
          fetch(`${API_BASE}/tarjetas/cliente/${p.idCliente}`),
          fetch(`${API_BASE}/metodos-pago`),
          fetch(`${API_BASE}/carritos/cliente/${p.idCliente}`),
        ])
        if (!cardsRes.ok) { setError('No se pudieron cargar tus tarjetas'); return }
        const items = await cardsRes.json()
        setCards(items || [])
        if (methRes.ok) {
          const m = await methRes.json()
          setMethods((m || []).map((x: any) => ({ idMetodoPago: x.idMetodoPago, nombre: x.nombre, comision: x.comision != null ? Number(x.comision) : 0 })))
        }
        if (cartsRes.ok) {
          const c = await cartsRes.json()
          setCartRows(c || [])
        }
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

  const brandName = useMemo(() => {
    const b = (brand || '').toString().toLowerCase()
    if (b === 'visa') return 'Visa'
    if (b === 'mastercard') return 'Mastercard'
    return brand || ''
  }, [brand])

  const filtered = useMemo(() => {
    const b = (brand || '').toString().toLowerCase()
    return cards.filter(c => (c.metodoPago || '').toLowerCase().includes(b))
  }, [cards, brand])

  function openConfirm(cardId: number) {
    const b = (brand || '').toString().toLowerCase()
    const method = methods.find(m => (m.nombre || '').toLowerCase().includes(b))
    const bruto = (cartRows || []).reduce((sum, r) => sum + (r.precio != null ? Number(r.precio) : 0), 0)
    const comision = method?.comision != null ? Number(method.comision) : 0
    const neto = bruto * (1 + comision / 100)
    if (method) setConfirmData({ cardId, bruto, comision, neto, metodoId: method.idMetodoPago })
  }

  async function confirmPayment() {
    try {
      if (!confirmData) return
      const userId = localStorage.getItem('userId')
      if (!userId) { setToast({ type: 'error', message: 'No hay sesión' }); return }
      const prof = await fetch(`${API_BASE}/auth/profile?userId=${userId}`)
      if (!prof.ok) { setToast({ type: 'error', message: 'No se pudo obtener perfil' }); return }
      const p = await prof.json()
      if (p?.tipo !== 'cliente' || !p?.idCliente) { setToast({ type: 'error', message: 'No es cliente' }); return }
      const res = await fetch(`${API_BASE}/metodos-pago/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCliente: p.idCliente, idMetodoPago: confirmData.metodoId, idTarjeta: confirmData.cardId })
      })
      if (res.ok) {
        // Preparar datos para boleta y mostrar modal de éxito
        const now = new Date()
        const m = methods.find(x => x.idMetodoPago === confirmData.metodoId)?.nombre || brandName
        const cardMasked = (filtered.find(c => c.idTarjeta === confirmData.cardId)?.numeroMasked) || undefined
        setSuccessData({
          totalBruto: confirmData.bruto,
          totalNeto: confirmData.neto,
          comision: confirmData.comision,
          metodo: m,
          tarjetaMasked: cardMasked,
          fecha: now.toLocaleDateString(),
          hora: now.toLocaleTimeString(),
          items: cartRows || [],
        })
        setConfirmData(null)
      } else {
        const msg = await res.text(); setToast({ type: 'error', message: msg || 'No se pudo completar el pago' })
      }
    } catch {
      setToast({ type: 'error', message: 'Error de red al confirmar pago' })
    }
  }

  function downloadReceipt() {
    if (!successData) return
    const w = window.open('', '_blank')
    if (!w) return
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
        ${successData.tarjetaMasked ? `<div class="row"><div class="muted">Tarjeta</div><div>${successData.tarjetaMasked}</div></div>` : ''}
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
            {successData.tarjetaMasked && (
              <div className="flex justify-between"><span>Tarjeta</span><span>{successData.tarjetaMasked}</span></div>
            )}
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
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <h1 className="font-display text-2xl text-primary mb-6 text-center">Tarjetas {brandName}</h1>
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
          filtered.length === 0 ? (
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="text-text-secondary">No tienes tarjetas {brandName} registradas.</div>
              <button onClick={() => navigate('/dashboard/cliente/tarjetas')} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary inline-flex items-center gap-2">
                <span className="material-symbols-outlined">add_card</span>
                Ir a Tarjetas
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {filtered.map(c => (
                <div key={c.idTarjeta} className="rounded-xl border border-border-soft bg-background-secondary p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-3xl text-primary">credit_card</span>
                      <div className="font-bold">{c.metodoPago || brandName}</div>
                    </div>
                    {c.metodoPago && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white/70 text-text-secondary">{c.metodoPago}</span>
                    )}
                  </div>
                  <div className="mt-4 text-lg tracking-widest">{c.numeroMasked}</div>
                  <div className="mt-2 text-sm text-text-secondary">Vence: {c.fechaCaducidad || '-'}</div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => openConfirm(c.idTarjeta)} className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90">Usar esta tarjeta</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
      {confirmData && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-background-secondary border-2 border-border-soft shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border-soft">
              <h2 className="font-display text-xl">Confirmar pago</h2>
              <button onClick={() => setConfirmData(null)} className="text-text-secondary hover:text-primary" aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 text-sm">
              <div className="rounded-lg border border-border-soft bg-white/50 p-3">
                <div className="flex justify-between"><span>Total bruto:</span><span>S/ {confirmData.bruto.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Comisión ({confirmData.comision}%):</span><span>S/ {(confirmData.bruto * (confirmData.comision/100)).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold mt-2"><span>Total a pagar:</span><span>S/ {confirmData.neto.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="p-4 border-t border-border-soft flex justify-end gap-2">
              <button onClick={() => setConfirmData(null)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cancelar</button>
              <button onClick={confirmPayment} className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90">Confirmar pago</button>
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
