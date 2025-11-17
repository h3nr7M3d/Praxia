import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function RegisterCustomer() {
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [domicilio, setDomicilio] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [ok, setOk] = useState<boolean | null>(null)
  const navigate = useNavigate()

  function validate(): string | null {
    if (!nombres) return 'Nombres es obligatorio'
    if (!apellidos) return 'Apellidos es obligatorio'
    if (!domicilio) return 'Domicilio es obligatorio'
    if (!/^\d{8}$/.test(dni)) return 'DNI debe tener 8 dígitos'
    if (telefono && !/^[0-9+\-()\s]{7,15}$/.test(telefono)) return 'Teléfono inválido'
    return null
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const err = validate()
    if (err) { setOk(false); setMsg(err); return }
    setLoading(true)
    setMsg(null)
    setOk(null)
    const payload = { tipo: 'cliente', nombres, apellidos, domicilio, dni, telefono }
    sessionStorage.setItem('register_pending', JSON.stringify(payload))
    setLoading(false)
    navigate('/register/paso-3')
  }

  return (
    <div className="bg-background-light dark:bg-background-dark-optional min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light">
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-8 space-y-6 bg-background-secondary rounded-xl shadow-2xl border-2 border-border-soft">
            <div className="text-center">
              <img
                alt="Logo"
                className="mx-auto h-24 md:h-28 w-auto"
                src="/assets/logo/praxia_logo_sin_fondo_nombre.png"
              />
              <div className="mt-5">
                <h1 className="text-primary text-4xl font-bold font-display tracking-wider">REGISTRO CLIENTE</h1>
              </div>
            </div>

            {msg && (
              <div className={`text-sm ${ok ? 'text-green-700' : 'text-red-700'}`}>{msg}</div>
            )}

            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nombres" className="sr-only">Nombres</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">person</span>
                    <input id="nombres" name="nombres" type="text" required placeholder="Nombres" value={nombres} onChange={(e)=>setNombres(e.target.value)} className="form-input appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-border-soft placeholder-text-secondary/70 text-text-primary bg-background-light focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm font-body" />
                  </div>
                </div>
                <div>
                  <label htmlFor="apellidos" className="sr-only">Apellidos</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">person</span>
                    <input id="apellidos" name="apellidos" type="text" required placeholder="Apellidos" value={apellidos} onChange={(e)=>setApellidos(e.target.value)} className="form-input appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-border-soft placeholder-text-secondary/70 text-text-primary bg-background-light focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm font-body" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="domicilio" className="sr-only">Domicilio</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">home</span>
                  <input id="domicilio" name="domicilio" type="text" required placeholder="Domicilio" value={domicilio} onChange={(e)=>setDomicilio(e.target.value)} className="form-input appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-border-soft placeholder-text-secondary/70 text-text-primary bg-background-light focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm font-body" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dni" className="sr-only">DNI</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">badge</span>
                    <input id="dni" name="dni" type="text" required placeholder="DNI" value={dni} onChange={(e)=>setDni(e.target.value)} className="form-input appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-border-soft placeholder-text-secondary/70 text-text-primary bg-background-light focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm font-body" />
                  </div>
                </div>
                <div>
                  <label htmlFor="telefono" className="sr-only">Teléfono</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">phone</span>
                    <input id="telefono" name="telefono" type="tel" placeholder="Teléfono" value={telefono} onChange={(e)=>setTelefono(e.target.value)} className="form-input appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-border-soft placeholder-text-secondary/70 text-text-primary bg-background-light focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm font-body" />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-primary hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-display tracking-widest transition duration-150 ease-in-out">
                  {loading ? 'ENVIANDO...' : 'CONTINUAR'}
                </button>
              </div>
            </form>

            <div className="text-center">
              <p className="text-sm text-text-secondary font-body">
                ¿Ya tienes una cuenta? <Link to="/login" className="font-medium text-accent hover:text-primary">Inicia sesión aquí</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

