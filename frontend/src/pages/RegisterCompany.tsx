import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function RegisterCompany() {
  const [nombre, setNombre] = useState('')
  const [ruc, setRuc] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [ok, setOk] = useState<boolean | null>(null)
  const navigate = useNavigate()

  function validate(): string | null {
    if (!nombre) return 'Nombre es obligatorio'
    if (!ruc) return 'RUC es obligatorio'
    if (!/^\d{11}$/.test(ruc)) return 'RUC debe tener 11 dígitos'
    if (!razonSocial) return 'Razón social es obligatoria'
    return null
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const err = validate()
    if (err) { setOk(false); setMsg(err); return }
    setLoading(true)
    setMsg(null)
    setOk(null)
    // guardar en sessionStorage y navegar al paso 3
    const payload = { tipo: 'empresa', nombre, ruc, razonSocial }
    sessionStorage.setItem('register_pending', JSON.stringify(payload))
    setLoading(false)
    navigate('/register/paso-3')
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
              <div className="mt-5">
                <h1 className="text-primary text-4xl font-bold font-display tracking-wider">REGISTRO EMPRESA</h1>
              </div>
            </div>

            <form className="mt-8 space-y-6" onSubmit={onSubmit}>
              <div className="rounded-md shadow-sm space-y-4">
                <div>
                  <label htmlFor="nombre" className="sr-only">Nombre</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">person</span>
                    <input
                      id="nombre"
                      name="nombre"
                      type="text"
                      required
                      placeholder="Nombre de la empresa"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="form-input appearance-none rounded-lg relative block w-full px-3 py-4 pl-10 border border-border-soft placeholder-text-secondary/70 text-text-primary bg-background-light focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm font-body"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="ruc" className="sr-only">RUC</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">badge</span>
                    <input
                      id="ruc"
                      name="ruc"
                      type="text"
                      required
                      placeholder="RUC"
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value)}
                      className="form-input appearance-none rounded-lg relative block w-full px-3 py-4 pl-10 border border-border-soft placeholder-text-secondary/70 text-text-primary bg-background-light focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm font-body"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="razon-social" className="sr-only">Razón Social</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">business</span>
                    <input
                      id="razon-social"
                      name="razon-social"
                      type="text"
                      required
                      placeholder="Razón Social"
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(e.target.value)}
                      className="form-input appearance-none rounded-lg relative block w-full px-3 py-4 pl-10 border border-border-soft placeholder-text-secondary/70 text-text-primary bg-background-light focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm font-body"
                    />
                  </div>
                </div>
              </div>
              <div>
                {msg && (
                  <div className={`text-sm ${ok ? 'text-green-700' : 'text-red-700'}`}>{msg}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-primary hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-display tracking-widest transition duration-150 ease-in-out"
                >
                  {loading ? 'ENVIANDO...' : 'CONTINUAR'}
                </button>
              </div>
            </form>

            <div className="text-center">
              <p className="text-sm text-text-secondary font-body">
                ¿Ya tienes una cuenta?{' '}
                <Link to="/login" className="font-medium text-accent hover:text-primary">Inicia sesión aquí</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

