import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import UserAvatar from '../components/UserAvatar'
import CompanyHeader from '../components/CompanyHeader'

type Sexo = 'M' | 'F' | 'O'

type AccountData = {
  nombre: string
  apellido: string
  sexo: Sexo
  id_documento: number
  nr_documento: string
  fch_nacimiento: string
  correo?: string | null
  cod_pais?: string | null
  telefono?: string | null
  avatarUrl?: string | null
  pais: string
  departamento: string
  provincia: string
  distrito: string
  domicilio: string
  ref_domicilio?: string | null
  id_tipo_seguro: number | null
  emailVerificado: boolean
  telefonoVerificado: boolean
  tfaHabilitado: boolean
  consentimientos: Record<string, boolean>
}

const DEFAULTS: AccountData = {
  nombre: '',
  apellido: '',
  sexo: 'O',
  id_documento: 1,
  nr_documento: '',
  fch_nacimiento: '',
  correo: '',
  cod_pais: '+51',
  telefono: '',
  avatarUrl: null,
  pais: '',
  departamento: '',
  provincia: '',
  distrito: '',
  domicilio: '',
  ref_domicilio: '',
  id_tipo_seguro: null,
  emailVerificado: false,
  telefonoVerificado: false,
  tfaHabilitado: false,
  consentimientos: {},
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-soft bg-white/50 shadow-sm">
      <div className="px-5 py-4 border-b border-border-soft">
        <h3 className="font-medium text-text-primary">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function MyAccountV2() {
  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
  const navigate = useNavigate()
  const location = useLocation()
  const [userId, setUserId] = useState<string | null>(null)
  const [tipo, setTipo] = useState<'cliente' | 'empresa' | 'admin' | 'none'>('none')
  const [emailLabel, setEmailLabel] = useState('')
  const [state, setState] = useState<AccountData>(DEFAULTS)
  const [tab, setTab] = useState<'perfil' | 'seguridad' | 'verificacion'>('perfil')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    const uid = localStorage.getItem('userId')
    setUserId(uid)
    const load = async () => {
      if (!uid) return
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/auth/profile?userId=${uid}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        if (!res.ok) throw new Error('Perfil no disponible')
        const profile = await res.json()
        setTipo(profile?.tipo || 'none')
        setEmailLabel(profile?.email || '')
        // map básico de perfil → state (campos que existan)
        setState(s => ({
          ...s,
          nombre: profile.nombres || '',
          apellido: profile.apellidos || '',
          sexo: (profile.sexo || 'O') as Sexo,
          id_documento: profile.tipoDocumentoId || 1,
          nr_documento: profile.dni || '',
          fch_nacimiento: profile.fechaNacimiento || '',
          correo: profile.email || '',
          cod_pais: profile.codPais || s.cod_pais,
          telefono: profile.telefono || '',
          // Datos de paciente (si existen)
          pais: profile.pais || s.pais,
          departamento: profile.departamento || s.departamento,
          provincia: profile.provincia || s.provincia,
          distrito: profile.distrito || s.distrito,
          domicilio: profile.domicilio || s.domicilio,
          ref_domicilio: profile.refDomicilio ?? s.ref_domicilio,
          id_tipo_seguro: profile.idTipoSeguro ?? s.id_tipo_seguro,
          consentimientos: { ...(profile.consentimientos || s.consentimientos) }
        }))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [API_BASE])

  // acciones
  async function saveProfile(section: 'usuario' | 'paciente') {
    if (!userId) return
    try {
      setOk(null)
      setMsg(null)
      const payload: Record<string, any> = {}
      if (section === 'usuario') {
        payload.usuario = {
          nombre: state.nombre,
          apellido: state.apellido,
          sexo: state.sexo,
          id_documento: state.id_documento ?? 1,
          nr_documento: state.nr_documento,
          fch_nacimiento: state.fch_nacimiento,
          correo: state.correo,
          cod_pais: state.cod_pais,
          telefono: state.telefono,
        }
      } else if (section === 'paciente') {
        payload.paciente = {
          pais: state.pais,
          departamento: state.departamento,
          provincia: state.provincia,
          distrito: state.distrito,
          domicilio: state.domicilio,
          ref_domicilio: state.ref_domicilio,
          id_tipo_seguro: state.id_tipo_seguro ?? null,
        }
      }
      const res = await fetch(`${API_BASE}/auth/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) throw new Error(data?.message || 'No se pudo actualizar la información')
      if (section === 'usuario') {
        const full = [state.nombre, state.apellido].filter(Boolean).join(' ').trim()
        if (full) localStorage.setItem('userName', full)
        if (state.correo) localStorage.setItem('userEmail', state.correo)
      }
      setOk(true)
      setMsg(section === 'usuario' ? 'Datos de usuario actualizados' : 'Datos del paciente actualizados')
    } catch (e: any) {
      setOk(false)
      setMsg(e?.message || 'Error al actualizar datos')
    }
  }

  const [pwdActual, setPwdActual] = useState('')
  const [pwdNueva, setPwdNueva] = useState('')
  const [pwdConfirma, setPwdConfirma] = useState('')
  async function changePassword() {
    if (!userId) return
    if (!pwdNueva || pwdNueva !== pwdConfirma) { setOk(false); setMsg('La confirmación no coincide'); return }
    try {
      const res = await fetch(`${API_BASE}/auth/profile/${userId}/password`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwdActual, newPassword: pwdNueva })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Error al actualizar contraseña')
      setOk(true); setMsg('Contraseña actualizada'); setPwdActual(''); setPwdNueva(''); setPwdConfirma('')
    } catch (e: any) { setOk(false); setMsg(e.message || 'Error') }
  }

  // UI helpers
  const TabButton = ({ value, label }: { value: typeof tab; label: string }) => (
    <button
      onClick={() => setTab(value)}
      className={`px-3 py-1.5 rounded-full border text-sm transition ${tab === value ? 'bg-primary text-white border-primary' : 'bg-white/70 border-border-soft hover:border-primary/60'}`}
    >
      {label}
    </button>
  )

  const HeaderByTipo = useMemo(() => {
    if (tipo === 'empresa') return <CompanyHeader />
    if (tipo === 'admin') {
      return (
        <header className="p-4 border-b border-border-soft bg-background-secondary">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Link to="/dashboard/admin" aria-label="Inicio">
                <img src="/assets/logo/praxia_logo_sin_fondo_nombre.png" alt="Logo Praxia" className="h-14 md:h-16 w-auto" />
              </Link>
            </div>
            <nav className="flex items-center gap-4 text-sm">
              <Link to="/dashboard/admin/usuarios" className="text-text-secondary hover:text-primary inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">group</span> Usuarios</Link>
              <Link to="/dashboard/admin/empleados" className="text-text-secondary hover:text-primary inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">badge</span> Empleados</Link>
              <Link to="/dashboard/admin/sucursales" className="text-text-secondary hover:text-primary inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">apartment</span> Sucursales</Link>
              <Link to="/dashboard/admin/estadisticas" className="text-text-secondary hover:text-primary inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">monitoring</span> Estadísticas</Link>
            </nav>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border border-border-soft bg-white/50 flex items-center justify-center"><UserAvatar size={40} /></div>
            </div>
          </div>
        </header>
      )
    }
    return (
      <header className="p-4 border-b border-border-soft bg-background-secondary">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link to="/home" aria-label="Inicio">
              <img src="/assets/logo/praxia_logo_sin_fondo_nombre.png" alt="Logo Praxia" className="h-14 md:h-16 w-auto" />
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/citas/programar" className="text-text-secondary hover:text-primary inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">calendar_month</span> Solicitar cita</Link>
            <Link to="/home" className="text-text-secondary hover:text-primary inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">assignment</span> Mis citas</Link>
            <Link to="/home" className="text-text-secondary hover:text-primary inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">folder</span> Mis exámenes</Link>
            <Link to="/home" className="text-text-secondary hover:text-primary inline-flex items-center gap-1"><span className="material-symbols-outlined text-base">stethoscope</span> Especialistas</Link>
          </nav>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border border-border-soft bg-white/50 flex items-center justify-center"><UserAvatar size={40} /></div>
          </div>
        </div>
      </header>
    )
  }, [tipo])

  // Volver según origen (from=medico → /medico, else /home)
  const returnTo = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search)
      const from = params.get('from') || ''
      if (from === 'medico') return '/medico'
      const stored = localStorage.getItem('returnAfterAccount')
      if (stored) return stored
      const role = localStorage.getItem('role')
      if (role === 'medico') return '/medico'
    } catch {}
    return '/home'
  }, [location.search])

  return (
    <div className="min-h-screen bg-background-light text-text-primary">
      {HeaderByTipo}

      <main className="flex-1 flex flex-col items-center py-8 px-4">
        <div className="w-full max-w-5xl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-white/70 border border-border-soft flex items-center justify-center">
                <UserAvatar size={48} />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Mi cuenta</h1>
                <p className="text-sm text-text-secondary">{(localStorage.getItem('userName') || `${state.nombre || ''} ${state.apellido || ''}`).trim() || 'Gestiona tu perfil, seguridad y preferencias'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(returnTo)} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-white">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Volver
              </button>
              {msg && (
                <div className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <TabButton value="perfil" label="Perfil" />
            <TabButton value="seguridad" label="Seguridad" />
            <TabButton value="verificacion" label="Verificación" />
          </div>

          {tab === 'perfil' && (
            <>
            <SectionCard title="Datos de usuario">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-text-secondary">Nombre</label>
                  <input className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.nombre} onChange={e=>setState({...state, nombre:e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Apellido</label>
                  <input className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.apellido} onChange={e=>setState({...state, apellido:e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Sexo</label>
                  <select className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.sexo} onChange={e=>setState({...state, sexo: e.target.value as Sexo})}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Fecha de nacimiento</label>
                  <input type="date" className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.fch_nacimiento} onChange={e=>setState({...state, fch_nacimiento:e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Tipo de documento</label>
                  <select className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={String(state.id_documento)} onChange={e=>setState({...state, id_documento:Number(e.target.value)})}>
                    <option value="1">DNI</option>
                    <option value="2">CE</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Número de documento</label>
                  <input className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.nr_documento} onChange={e=>setState({...state, nr_documento:e.target.value})} />
                </div>
                <div className="sm:col-span-2 h-px bg-border-soft my-2" />
                <div>
                  <label className="text-sm text-text-secondary">Correo electrónico</label>
                  <input type="email" className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.correo ?? ''} onChange={e=>setState({...state, correo:e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Teléfono</label>
                  <div className="mt-1 flex gap-2">
                    <input className="w-28 rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.cod_pais ?? ''} onChange={e=>setState({...state, cod_pais:e.target.value})} />
                    <input className="flex-1 rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.telefono ?? ''} onChange={e=>setState({...state, telefono:e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90" onClick={() => saveProfile('usuario')}>
                  Guardar cambios
                </button>
              </div>
            </SectionCard>

            <div className="h-4" />

            <SectionCard title="Datos de paciente">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-text-secondary">País</label>
                  <input className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.pais} onChange={e=>setState({...state, pais:e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Departamento</label>
                  <input className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.departamento} onChange={e=>setState({...state, departamento:e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Provincia</label>
                  <input className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.provincia} onChange={e=>setState({...state, provincia:e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Distrito</label>
                  <input className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.distrito} onChange={e=>setState({...state, distrito:e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-text-secondary">Domicilio</label>
                  <input className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.domicilio} onChange={e=>setState({...state, domicilio:e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-text-secondary">Referencia de domicilio</label>
                  <textarea className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={state.ref_domicilio ?? ''} onChange={e=>setState({...state, ref_domicilio:e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-text-secondary">Tipo de seguro</label>
                  <select className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={String(state.id_tipo_seguro ?? '')} onChange={e=>setState({...state, id_tipo_seguro: e.target.value ? Number(e.target.value) : null})}>
                    <option value="">Selecciona</option>
                    <option value="1">Particular</option>
                    <option value="2">EPS Pacífico</option>
                    <option value="3">SCTR</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90" onClick={() => saveProfile('paciente')}>
                  Guardar cambios
                </button>
              </div>
            </SectionCard>
            </>
          )}

          {tab === 'seguridad' && (
            <SectionCard title="Cambiar contraseña">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-text-secondary">Contraseña actual</label>
                  <input type="password" className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={pwdActual} onChange={e=>setPwdActual(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Nueva contraseña</label>
                  <input type="password" className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={pwdNueva} onChange={e=>setPwdNueva(e.target.value)} />
                  <p className="mt-1 text-xs text-text-secondary">Mín. 6 caracteres</p>
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Confirmar contraseña</label>
                  <input type="password" className="mt-1 w-full rounded-md border border-border-soft bg-white/50 px-3 py-2" value={pwdConfirma} onChange={e=>setPwdConfirma(e.target.value)} />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90" onClick={changePassword}>Actualizar</button>
              </div>
            </SectionCard>
          )}

          {tab === 'verificacion' && (
            <SectionCard title="Verificación de contacto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border border-border-soft p-3">
                  <p className="text-sm font-medium">Correo verificado</p>
                  <p className="text-xs text-text-secondary">{state.correo || 'Sin correo'}</p>
                  <div className="mt-2">
                    <button className="rounded-md border border-border-soft bg-white/50 px-3 py-1.5 text-sm hover:border-primary/60" onClick={async ()=>{
                      if (!userId) return
                      try {
                        const res = await fetch(`${API_BASE}/auth/verify/email/send`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: Number(userId) }) })
                        const t = await res.text().catch(()=> '')
                        setOk(res.ok); setMsg(res.ok ? 'Código enviado a tu correo' : (t || 'No se pudo enviar'))
                        setTimeout(()=> setMsg(null), 4000)
                      } catch { setOk(false); setMsg('Error de conexión') }
                    }}>Enviar código</button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input className="flex-1 rounded-md border border-border-soft bg-white/50 px-3 py-1.5 text-sm" placeholder="Código 6 dígitos" value={code} onChange={e=>setCode(e.target.value)} />
                    <button className="rounded-md bg-primary px-3 py-1.5 text-sm text-white" onClick={async ()=>{
                      if (!userId || !code) { setOk(false); setMsg('Ingresa el código'); return }
                      try {
                        const res = await fetch(`${API_BASE}/auth/verify/email/confirm`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: Number(userId), code }) })
                        const t = await res.text().catch(()=> '')
                        setOk(res.ok); setMsg(res.ok ? 'Correo verificado' : (t || 'Código inválido'))
                        if (res.ok) setCode('')
                        setTimeout(()=> setMsg(null), 4000)
                      } catch { setOk(false); setMsg('Error de conexión') }
                    }}>Confirmar</button>
                  </div>
                  {msg && (
                    <div className={`mt-2 text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</div>
                  )}
                </div>
                <div className="rounded-md border border-border-soft p-3">
                  <p className="text-sm font-medium">Teléfono verificado</p>
                  <p className="text-xs text-text-secondary">{state.cod_pais} {state.telefono}</p>
                  <div className="mt-2">
                    <button className="rounded-md border border-border-soft bg-white/50 px-3 py-1.5 text-sm hover:border-primary/60">Enviar SMS</button>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Consentimientos y Dirección/Seguro se ocultaron por solicitud */}

          {loading && (
            <div className="mt-4 text-sm text-text-secondary">Cargando perfil…</div>
          )}
        </div>
      </main>
    </div>
  )
}
