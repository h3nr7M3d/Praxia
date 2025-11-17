import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function RegisterStep3() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [ok, setOk] = useState<boolean | null>(null)
  const [hasPending, setHasPending] = useState(false)

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  const navigate = useNavigate()

  useEffect(() => {
    const pending = sessionStorage.getItem('register_pending')
    setHasPending(!!pending)
  }, [])

  function validate(): string | null {
    if (!hasPending) return 'No hay datos de registro pendientes. Vuelve a seleccionar el tipo de cuenta.'
    if (!email) return 'El correo es obligatorio'
    const re = /[^@\s]+@[^@\s]+\.[^@\s]+/
    if (!re.test(email)) return 'Formato de correo inválido'
    if (!password) return 'La contraseña es obligatoria'
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres'
    if (password !== confirm) return 'Las contraseñas no coinciden'
    return null
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const err = validate()
    if (err) { setOk(false); setMsg(err); return }

    const pendingStr = sessionStorage.getItem('register_pending')
    if (!pendingStr) { setOk(false); setMsg('No hay datos de registro pendientes'); return }
    const pending = JSON.parse(pendingStr) as any

    setLoading(true)
    setMsg(null)
    setOk(null)
    try {
      // 1) Crear usuario
      const resUser = await fetch(`${API_BASE}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correoElectronico: email, contrasena: password })
      })
      if (!resUser.ok) {
        const t = await resUser.text()
        throw new Error(t || 'Error creando usuario')
      }
      const userIdText = await resUser.text()
      const userId = Number(userIdText)
      if (!userId) throw new Error('ID de usuario inválido')

      // 2) Crear entidad según tipo
      if (pending.tipo === 'empresa') {
        const payload = { nombre: pending.nombre, ruc: pending.ruc, razonSocial: pending.razonSocial, idUsuario: userId }
        const resEmp = await fetch(`${API_BASE}/empresas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!resEmp.ok) {
          const t = await resEmp.text()
          throw new Error(t || 'Error registrando empresa')
        }
      } else if (pending.tipo === 'cliente') {
        const payload = { nombres: pending.nombres, apellidos: pending.apellidos, domicilio: pending.domicilio, dni: pending.dni, telefono: pending.telefono || null, idUsuario: userId }
        const resCli = await fetch(`${API_BASE}/clientes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!resCli.ok) {
          const t = await resCli.text()
          throw new Error(t || 'Error registrando cliente')
        }
      } else {
        throw new Error('Tipo de registro desconocido')
      }

      // éxito
      sessionStorage.removeItem('register_pending')
      setOk(true)
      setMsg('Registro completado correctamente. Ahora puedes iniciar sesión.')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err: any) {
      setOk(false)
      setMsg(err?.message || 'Error en el registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background-light dark:bg-background-dark-optional min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light">
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 space-y-6 bg-background-secondary rounded-xl shadow-2xl border-2 border-border-soft">
            <div className="text-center">
              <img
                alt="Logo"
                className="mx-auto h-24 md:h-28 w-auto"
                src="/assets/logo/praxia_logo_sin_fondo_nombre.png"
              />
              <div className="mt-4">
                <h1 className="text-primary text-3xl font-bold font-display tracking-wider">CREA TU CUENTA</h1>
                <p className="mt-2 text-sm text-text-secondary font-body">Datos de acceso</p>
              </div>
            </div>

            {msg && (
              <div className={`text-sm ${ok ? 'text-green-700' : 'text-red-700'}`}>{msg}</div>
            )}

            <form className="mt-6 space-y-6" onSubmit={onSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="sr-only" htmlFor="email-address">Correo electrónico</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">mail</span>
                    <input
                      id="email-address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Correo Electrónico"
                      required
                      value={email}
                      onChange={(e)=>setEmail(e.target.value)}
                      className="form-input appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-border-soft placeholder-text-secondary/70 text-text-primary bg-background-light focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm font-body"
                    />
                  </div>
                </div>
                <div>
                  <label className="sr-only" htmlFor="password">Contraseña</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">lock</span>
                    <input
                      id="password"
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Contraseña"
                      required
                      value={password}
                      onChange={(e)=>setPassword(e.target.value)}
                      className="form-input appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-border-soft placeholder-text-secondary/70 text-text-primary bg-background-light focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm font-body"
                    />
                    <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5" onClick={()=>setShowPwd(v=>!v)}>
                      <span className="material-symbols-outlined text-text-secondary/70">{showPwd ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="sr-only" htmlFor="confirm-password">Confirmar Contraseña</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">lock</span>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Confirmar Contraseña"
                      required
                      value={confirm}
                      onChange={(e)=>setConfirm(e.target.value)}
                      className="form-input appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-border-soft placeholder-text-secondary/70 text-text-primary bg-background-light focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm font-body"
                    />
                    <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5" onClick={()=>setShowConfirm(v=>!v)}>
                      <span className="material-symbols-outlined text-text-secondary/70">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-primary hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-display tracking-widest transition duration-150 ease-in-out">
                  {loading ? 'ENVIANDO...' : 'FINALIZAR REGISTRO'}
                </button>
              </div>
            </form>

            <div className="text-center">
              <p className="text-sm text-text-secondary font-body">
                ¿Ya tienes una cuenta? <Link className="font-medium text-accent hover:text-primary" to="/login">Inicia sesión aquí</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

