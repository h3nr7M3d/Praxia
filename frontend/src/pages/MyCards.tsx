import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import UserAvatar from '../components/UserAvatar'

type CardItem = {
  idTarjeta: number
  numeroMasked: string
  fechaCaducidad?: string
  marca?: string
  metodoPago?: string
}

export default function MyCards() {
  const [cards, setCards] = useState<CardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [emailLabel, setEmailLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<CardItem | null>(null)
  const [pmList, setPmList] = useState<{ idMetodoPago: number; nombre: string }[]>([])
  const [tipoList, setTipoList] = useState<{ idTipoTarjeta: number; nombre: string }[]>([])
  const [form, setForm] = useState<{ idMetodoPago: string; idTipoTarjeta: string; numero: string; fechaCaducidad: string; cvv: string }>({ idMetodoPago: '', idTipoTarjeta: '', numero: '', fechaCaducidad: '', cvv: '' })

  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  async function loadCards() {
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
      const res = await fetch(`${API_BASE}/tarjetas/cliente/${p.idCliente}`)
      if (!res.ok) { setError('No se pudieron cargar tus tarjetas'); return }
      const items = await res.json()
      setCards(items || [])
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        await loadCards()
      } catch {
        setError('Error de red')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function openAddCard() {
    setAdding(true)
    try {
      const [pmRes, tipoRes] = await Promise.all([
        fetch(`${API_BASE}/metodos-pago`),
        fetch(`${API_BASE}/tipos-tarjeta`),
      ])
      const pm = pmRes.ok ? await pmRes.json() : []
      const tipos = tipoRes.ok ? await tipoRes.json() : []
      const onlyCardBrands = (pm as any[]).filter(x => {
        const n = (x?.nombre || '').toString().toLowerCase()
        return n === 'visa' || n === 'mastercard'
      }).map(x => ({ idMetodoPago: x.idMetodoPago, nombre: x.nombre }))
      setPmList(onlyCardBrands)
      setTipoList(tipos.map((t: any) => ({ idTipoTarjeta: t.idTipoTarjeta, nombre: t.nombre })))
    } catch {
      // silently fail, form will be empty
    }
  }

  async function createCard() {
    try {
      const userId = localStorage.getItem('userId')
      if (!userId) { alert('No hay sesión'); return }
      const prof = await fetch(`${API_BASE}/auth/profile?userId=${userId}`)
      if (!prof.ok) { alert('No se pudo obtener perfil'); return }
      const p = await prof.json()
      if (p?.tipo !== 'cliente' || !p?.idCliente) { alert('No es cliente'); return }
      const body = {
        idCliente: p.idCliente,
        idMetodoPago: form.idMetodoPago ? Number(form.idMetodoPago) : null,
        idTipoTarjeta: form.idTipoTarjeta ? Number(form.idTipoTarjeta) : null,
        numero: form.numero,
        fechaCaducidad: form.fechaCaducidad,
        cvv: form.cvv,
      }
      const res = await fetch(`${API_BASE}/tarjetas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      if (res.ok) {
        setAdding(false)
        setForm({ idMetodoPago: '', idTipoTarjeta: '', numero: '', fechaCaducidad: '', cvv: '' })
        await loadCards()
      } else {
        const msg = await res.text(); alert(msg || 'No se pudo registrar la tarjeta')
      }
    } catch {
      alert('Error de red al registrar')
    }
  }

  async function deleteCard(id: number) {
    try {
      const res = await fetch(`${API_BASE}/tarjetas/${id}`, { method: 'DELETE' })
      if (res.status === 204) {
        setCards(prev => prev.filter(c => c.idTarjeta !== id))
        setPendingDelete(null)
      } else {
        const msg = await res.text(); alert(msg || 'No se pudo eliminar')
      }
    } catch {
      alert('Error de red al eliminar')
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
        <h1 className="font-display text-2xl text-primary mb-6 text-center">Mis tarjetas</h1>
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
          cards.length === 0 ? (
            <div className="text-text-secondary text-center">No tienes tarjetas registradas.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {cards.map(c => (
                <div key={c.idTarjeta} className="rounded-xl border border-border-soft bg-background-secondary p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-3xl text-primary">credit_card</span>
                      <div className="font-bold">{c.marca || 'Tarjeta'}</div>
                    </div>
                    {c.metodoPago && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white/70 text-text-secondary">{c.metodoPago}</span>
                    )}
                  </div>
                  <div className="mt-4 text-lg tracking-widest">{c.numeroMasked}</div>
                  <div className="mt-2 text-sm text-text-secondary">Vence: {c.fechaCaducidad || '-'}</div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setPendingDelete(c)} className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        <div className="mt-6 flex justify-end max-w-6xl mx-auto">
          <button onClick={() => { setAdding(true); openAddCard(); }} className="px-5 py-2 rounded-lg bg-primary text-white hover:opacity-90 inline-flex items-center gap-2">
            <span className="material-symbols-outlined">add_card</span>
            Añadir tarjeta
          </button>
        </div>
      </div>

      {adding && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-background-secondary border-2 border-border-soft shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border-soft">
              <h2 className="font-display text-xl">Registrar tarjeta</h2>
              <button onClick={() => setAdding(false)} className="text-text-secondary hover:text-primary" aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 grid gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Método de pago</label>
                {pmList.length === 0 ? (
                  <div className="text-sm text-text-secondary">No hay métodos de tarjeta (Visa/Mastercard) disponibles.</div>
                ) : (
                  <div className="inline-flex rounded-full border border-border-soft bg-white/70 p-1">
                    {pmList.map(p => {
                      const selected = form.idMetodoPago === String(p.idMetodoPago)
                      return (
                        <button
                          key={p.idMetodoPago}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, idMetodoPago: String(p.idMetodoPago) }))}
                          className={`px-4 py-1 rounded-full text-sm ${selected ? 'bg-primary text-white' : 'text-text-primary hover:bg-background-secondary'}`}
                        >
                          {p.nombre}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Tipo de tarjeta</label>
                <select value={form.idTipoTarjeta} onChange={e => setForm(f => ({ ...f, idTipoTarjeta: e.target.value }))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary">
                  <option value="">Seleccione</option>
                  {tipoList.map(t => (<option key={t.idTipoTarjeta} value={t.idTipoTarjeta}>{t.nombre}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Número</label>
                <input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="1234123412341234" className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Fecha caducidad</label>
                  <input type="date" value={form.fechaCaducidad} onChange={e => setForm(f => ({ ...f, fechaCaducidad: e.target.value }))} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">CVV</label>
                  <input type="password" value={form.cvv} onChange={e => setForm(f => ({ ...f, cvv: e.target.value }))} maxLength={3} className="w-full rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border-soft flex justify-end gap-2">
              <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">Cancelar</button>
              <button onClick={createCard} className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-background-secondary border-2 border-border-soft shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border-soft">
              <h2 className="font-display text-xl">Eliminar tarjeta</h2>
              <button onClick={() => setPendingDelete(null)} className="text-text-secondary hover:text-primary" aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-600">warning</span>
                <div>
                  <p className="text-sm md:text-base">¿Deseas eliminar esta tarjeta?</p>
                  <p className="text-text-secondary text-sm mt-1">Se eliminará permanentemente.</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-border-soft bg-white/50 p-3 text-sm">
                <div><span className="font-bold">Tarjeta:</span> {pendingDelete.numeroMasked}</div>
                <div><span className="font-bold">Marca:</span> {pendingDelete.marca || '-'}</div>
              </div>
            </div>
            <div className="p-4 border-t border-border-soft flex justify-end gap-2">
              <button onClick={() => setPendingDelete(null)} className="px-4 py-2 rounded-lg border border-border-soft hover:border-primary">No, volver</button>
              <button onClick={() => deleteCard(pendingDelete.idTarjeta)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
