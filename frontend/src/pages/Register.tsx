import { FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import tipoDocumentoOptions from "../shared/tipoDocumentoOptions"

type StepKey = "datos" | "ubicacion" | "contacto" | "verificacion"

type Documento = { id: number; nombre: string; codigo: string }
type Pais = { id: number; nombre: string; codigo: string }
type Departamento = { id: number; nombre: string; idPais: number }
type Provincia = { id: number; nombre: string; idDepartamento: number }
type Distrito = { id: number; nombre: string; idProvincia: number }
type TipoSeguro = { codigo: string; nombre: string; descripcion: string }

type AlertState = { type: "success" | "error" | "info"; message: string }

type RegisterForm = {
  nombres: string
  apellidos: string
  sexo: "F" | "M" | "X"
  documentoId: number | null
  documentoNumero: string
  fechaNacimiento: string
  paisId: number | null
  departamentoId: number | null
  provinciaId: number | null
  distritoId: number | null
  correo: string
  telefono: string
  password: string
  passwordConfirm: string
  domicilio: string
  referencia: string
  tipoSeguro: string
  aceptaTratamiento: boolean
  aceptaCondiciones: boolean
}

const stepOrder: StepKey[] = ["datos", "ubicacion", "contacto", "verificacion"]

const steps: Record<StepKey, { label: string; helper: string }> = {
  datos: { label: "1 - DATOS PERSONALES", helper: "Identidad y documento" },
  ubicacion: { label: "2 - UBICACION Y SEGURO", helper: "Direccion y cobertura" },
  contacto: { label: "3 - CONTACTO", helper: "Correo y contrasena" },
  verificacion: { label: "4 - VERIFICACION", helper: "Consentimientos y codigo" },
}

const inputClass =
  "w-full rounded-2xl border border-border-soft bg-white px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
const labelClass = "text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary"
const fieldWrapper = "flex flex-col gap-2"
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState<StepKey>("datos")
  const [form, setForm] = useState<RegisterForm>({
    nombres: "",
    apellidos: "",
    sexo: "M",
    documentoId: null,
    documentoNumero: "",
    fechaNacimiento: "",
    paisId: null,
    departamentoId: null,
    provinciaId: null,
    distritoId: null,
    correo: "",
    telefono: "",
    password: "",
    passwordConfirm: "",
    domicilio: "",
    referencia: "",
    tipoSeguro: "",
    aceptaTratamiento: false,
    aceptaCondiciones: false,
  })

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [paises, setPaises] = useState<Pais[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [distritos, setDistritos] = useState<Distrito[]>([])
  const [tiposSeguro, setTiposSeguro] = useState<TipoSeguro[]>([])

  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false)
  const [loadingProvincias, setLoadingProvincias] = useState(false)
  const [loadingDistritos, setLoadingDistritos] = useState(false)

  const [alert, setAlert] = useState<AlertState | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [userId, setUserId] = useState<number | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [codeSending, setCodeSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [emailConfirmed, setEmailConfirmed] = useState(false)
  useEffect(() => {
    async function loadDocumentos() {
      try {
        const res = await fetch(`${API_BASE}/catalogos/documentos`)
        if (!res.ok) throw new Error()
        const data: Documento[] = await res.json()
        setDocumentos(data)
        setForm(prev => (prev.documentoId ? prev : { ...prev, documentoId: data[0]?.id ?? null }))
      } catch {
        const fallback = tipoDocumentoOptions.map((opt, idx) => ({ id: idx + 1, nombre: opt.nombre, codigo: opt.codigo }))
        setDocumentos(fallback)
        setForm(prev => (prev.documentoId ? prev : { ...prev, documentoId: fallback[0]?.id ?? null }))
        setAlert({ type: "info", message: "Mostrando documentos locales." })
      }
    }

    async function loadPaises() {
      try {
        const res = await fetch(`${API_BASE}/catalogos/paises`)
        if (!res.ok) throw new Error()
        const data: Pais[] = await res.json()
        setPaises(data)
        setForm(prev => {
          if (prev.paisId) return prev
          const defaultPais = data.find(p => p.nombre.toLowerCase().includes("per")) ?? data[0]
          return { ...prev, paisId: defaultPais?.id ?? null }
        })
      } catch {
        setAlert({ type: "error", message: "No pudimos cargar la lista de paises." })
      }
    }

    async function loadSeguros() {
      try {
        const res = await fetch(`${API_BASE}/catalogos/tipos-seguro`)
        if (!res.ok) throw new Error()
        const data: TipoSeguro[] = await res.json()
        setTiposSeguro(data)
        setForm(prev => (prev.tipoSeguro ? prev : { ...prev, tipoSeguro: data[0]?.codigo ?? "" }))
      } catch {
        setAlert({ type: "error", message: "No pudimos cargar los tipos de seguro." })
      }
    }

    loadDocumentos()
    loadPaises()
    loadSeguros()
  }, [])
  useEffect(() => {
    if (!form.paisId) {
      setDepartamentos([])
      setForm(prev => ({ ...prev, departamentoId: null, provinciaId: null, distritoId: null }))
      return
    }
    let cancel = false
    setLoadingDepartamentos(true)
    fetch(`${API_BASE}/catalogos/departamentos?paisId=${form.paisId}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then((data: Departamento[]) => {
        if (cancel) return
        setDepartamentos(data)
        setForm(prev => {
          const exists = data.some(dep => dep.id === prev.departamentoId)
          return {
            ...prev,
            departamentoId: exists ? prev.departamentoId : data[0]?.id ?? null,
            provinciaId: exists ? prev.provinciaId : null,
            distritoId: exists ? prev.distritoId : null,
          }
        })
      })
      .catch(() => setAlert({ type: "error", message: "Error cargando departamentos." }))
      .finally(() => setLoadingDepartamentos(false))
    return () => {
      cancel = true
    }
  }, [form.paisId])

  useEffect(() => {
    if (!form.departamentoId) {
      setProvincias([])
      setForm(prev => ({ ...prev, provinciaId: null, distritoId: null }))
      return
    }
    let cancel = false
    setLoadingProvincias(true)
    fetch(`${API_BASE}/catalogos/provincias?departamentoId=${form.departamentoId}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then((data: Provincia[]) => {
        if (cancel) return
        setProvincias(data)
        setForm(prev => {
          const exists = data.some(prov => prov.id === prev.provinciaId)
          return {
            ...prev,
            provinciaId: exists ? prev.provinciaId : data[0]?.id ?? null,
            distritoId: exists ? prev.distritoId : null,
          }
        })
      })
      .catch(() => setAlert({ type: "error", message: "Error cargando provincias." }))
      .finally(() => setLoadingProvincias(false))
    return () => {
      cancel = true
    }
  }, [form.departamentoId])

  useEffect(() => {
    if (!form.provinciaId) {
      setDistritos([])
      setForm(prev => ({ ...prev, distritoId: null }))
      return
    }
    let cancel = false
    setLoadingDistritos(true)
    fetch(`${API_BASE}/catalogos/distritos?provinciaId=${form.provinciaId}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then((data: Distrito[]) => {
        if (cancel) return
        setDistritos(data)
        setForm(prev => ({
          ...prev,
          distritoId: data.some(dist => dist.id === prev.distritoId) ? prev.distritoId : data[0]?.id ?? null,
        }))
      })
      .catch(() => setAlert({ type: "error", message: "Error cargando distritos." }))
      .finally(() => setLoadingDistritos(false))
    return () => {
      cancel = true
    }
  }, [form.provinciaId])
  const departamentoActual = useMemo(() => departamentos.find(dep => dep.id === form.departamentoId), [departamentos, form.departamentoId])
  const provinciaActual = useMemo(() => provincias.find(prov => prov.id === form.provinciaId), [provincias, form.provinciaId])
  const distritoActual = useMemo(() => distritos.find(dist => dist.id === form.distritoId), [distritos, form.distritoId])
  const documentoActual = useMemo(() => documentos.find(doc => doc.id === form.documentoId), [documentos, form.documentoId])
  const tipoSeguroActual = useMemo(() => tiposSeguro.find(seg => seg.codigo === form.tipoSeguro), [tiposSeguro, form.tipoSeguro])

  const summary = useMemo(() => ({
    nombre: `${form.nombres} ${form.apellidos}`.trim(),
    documento: documentoActual ? `${documentoActual.codigo} ${form.documentoNumero}` : form.documentoNumero,
    correo: form.correo,
    telefono: form.telefono,
    ubicacion: [departamentoActual?.nombre, provinciaActual?.nombre, distritoActual?.nombre].filter(Boolean).join(" - "),
    direccion: form.domicilio,
    seguro: tipoSeguroActual?.nombre ?? form.tipoSeguro,
  }), [
    form.nombres,
    form.apellidos,
    form.documentoNumero,
    form.correo,
    form.telefono,
    form.domicilio,
    form.tipoSeguro,
    documentoActual,
    tipoSeguroActual,
    departamentoActual,
    provinciaActual,
    distritoActual,
  ])

  function updateField<K extends keyof RegisterForm>(field: K, value: RegisterForm[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      if (!prev[field as string]) return prev
      const copy = { ...prev }
      delete copy[field as string]
      return copy
    })
  }

  function validateStep(stepToValidate: StepKey) {
    const newErrors: Record<string, string> = {}
    const pushError = (field: keyof RegisterForm | "verificationCode", message: string) => {
      newErrors[field] = message
    }

    if (stepToValidate === "datos") {
      if (!form.nombres.trim()) pushError("nombres", "Ingresa tus nombres")
      if (!form.apellidos.trim()) pushError("apellidos", "Ingresa tus apellidos")
      if (!form.documentoId) pushError("documentoId", "Selecciona un documento")
      if (!form.documentoNumero.trim()) pushError("documentoNumero", "Ingresa el numero")
      if (!form.fechaNacimiento) pushError("fechaNacimiento", "Selecciona tu fecha de nacimiento")
      else if (calcularEdad(form.fechaNacimiento) < 18) pushError("fechaNacimiento", "Debes ser mayor de edad")
      if (!form.paisId) pushError("paisId", "Selecciona tu pais")
    }

    if (stepToValidate === "ubicacion") {
      if (!form.departamentoId) pushError("departamentoId", "Selecciona un departamento")
      if (!form.provinciaId) pushError("provinciaId", "Selecciona una provincia")
      if (!form.distritoId) pushError("distritoId", "Selecciona un distrito")
      if (!form.domicilio.trim()) pushError("domicilio", "Ingresa tu direccion")
      if (!form.tipoSeguro) pushError("tipoSeguro", "Selecciona un tipo de seguro")
    }

    if (stepToValidate === "contacto") {
      if (!form.correo.trim()) pushError("correo", "Ingresa tu correo")
      else if (!/\S+@\S+\.\S+/.test(form.correo.trim())) pushError("correo", "Correo invalido")
      if (!form.telefono.trim()) pushError("telefono", "Ingresa tu telefono")
      if (!form.password) pushError("password", "Ingresa una contrasena")
      else if (form.password.length < 8) pushError("password", "Minimo 8 caracteres")
      if (form.passwordConfirm !== form.password) pushError("passwordConfirm", "No coincide la confirmacion")
    }

    if (stepToValidate === "verificacion") {
      if (!form.aceptaCondiciones) pushError("aceptaCondiciones", "Debes aceptar los terminos")
      if (!form.aceptaTratamiento) pushError("aceptaTratamiento", "Debes autorizar el tratamiento de datos")
      if (verificationCode.trim().length !== 6) pushError("verificationCode", "Ingresa el codigo de 6 digitos")
    }

    setErrors(prev => ({ ...prev, ...newErrors }))
    return Object.keys(newErrors).length === 0
  }
  async function handleNext() {
    const currentValid = validateStep(step)
    if (!currentValid) return
    const idx = stepOrder.indexOf(step)
    const nextStep = stepOrder[idx + 1]
    if (!nextStep) return

    if (nextStep === "verificacion" && !userId) {
      const ok = await preRegistrar()
      if (!ok) return
    }

    setStep(nextStep)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleBack() {
    const idx = stepOrder.indexOf(step)
    if (idx === 0) return
    setStep(stepOrder[idx - 1])
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function preRegistrar() {
    try {
      setSubmitting(true)
      const res = await fetch(`${API_BASE}/auth/registro/pre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: {
            nombre: form.nombres.trim(),
            apellido: form.apellidos.trim(),
            sexo: form.sexo,
            nr_documento: form.documentoNumero.trim(),
            fch_nacimiento: form.fechaNacimiento,
            correo: form.correo.trim(),
            telefono: form.telefono.trim(),
            contrasenia: form.password,
            id_documento: form.documentoId,
            id_pais: form.paisId,
          },
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        setAlert({ type: "error", message: text || "No se pudo guardar tu registro." })
        return false
      }
      const data = await res.json()
      setUserId(data.userId)
      setCodeSent(false)
      setVerificationCode("")
      setEmailConfirmed(false)
      setAlert({ type: "success", message: "Datos guardados. Verifica tu correo." })
      return true
    } catch {
      setAlert({ type: "error", message: "No pudimos conectar con el servidor." })
      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendCode() {
    if (!userId) {
      setAlert({ type: "error", message: "Genera tu registro antes de enviar el codigo." })
      return
    }
    setCodeSending(true)
    try {
      const res = await fetch(`${API_BASE}/auth/verify/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "No pudimos enviar el codigo")
      }
      setCodeSent(true)
      setAlert({ type: "success", message: `Enviamos un codigo a ${form.correo}. Revisa tu bandeja.` })
    } catch (error) {
      setAlert({ type: "error", message: error instanceof Error ? error.message : "No pudimos enviar el codigo." })
    } finally {
      setCodeSending(false)
    }
  }

  async function confirmarCodigo() {
    if (!userId) throw new Error("Falta userId")
    const res = await fetch(`${API_BASE}/auth/verify/email/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code: verificationCode.trim() }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || "El codigo ingresado es invalido")
    }
    setEmailConfirmed(true)
  }

  async function completarRegistro() {
    if (!userId) return
    const res = await fetch(`${API_BASE}/auth/registro/completar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        paciente: {
          id_distrito: form.distritoId,
          nmb_tipo_seguro: form.tipoSeguro,
          domicilio: form.domicilio.trim(),
          ref_domicilio: form.referencia.trim() || "SIN REFERENCIA",
        },
        consentimiento: {
          finalidad: "Tratamiento de datos",
          otorgado: form.aceptaTratamiento,
          ip_remota: null,
        },
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || "No se pudo completar el registro")
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (step !== "verificacion") {
      await handleNext()
      return
    }
    const valid = validateStep("verificacion")
    if (!valid) return
    if (!userId) {
      setAlert({ type: "error", message: "Falta tu pre-registro. Regresa y guarda tus datos." })
      return
    }
    setSubmitting(true)
    try {
      if (!emailConfirmed) {
        await confirmarCodigo()
        setAlert({ type: "success", message: "Correo verificado correctamente." })
      }
      await completarRegistro()
      setAlert({ type: "success", message: "Cuenta creada. Te llevaremos al inicio de sesion." })
      setTimeout(() => navigate("/login"), 1500)
    } catch (error) {
      setAlert({ type: "error", message: error instanceof Error ? error.message : "No se pudo completar el registro." })
    } finally {
      setSubmitting(false)
    }
  }

  const renderError = (field: keyof RegisterForm | "verificationCode") =>
    errors[field] ? <p className="text-xs text-red-500">{errors[field]}</p> : null
  return (
    <div className="min-h-screen bg-background-light px-4 py-10 text-text-primary">
      <div className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-8 shadow-2xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary-600">Registro de paciente</p>
          <h1 className="mt-2 text-2xl font-bold">Completa tu cuenta Praxia</h1>
          <p className="text-sm text-text-secondary">Ingresa tus datos en cuatro pasos claros.</p>
        </header>
        <div className="mt-6 border-b border-border-soft">
          <div className="flex flex-wrap text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
            {stepOrder.map(key => (
              <div
                key={key}
                className={`flex-1 border-b-2 px-2 py-3 text-center ${
                  step === key ? "border-primary-600 text-primary-600" : "border-transparent"
                } ${stepOrder.indexOf(key) < stepOrder.indexOf(step) ? "text-primary-500" : ""}`}
              >
                <div>{steps[key].label}</div>
                <span className="text-[0.65rem] font-normal normal-case tracking-normal text-text-secondary">
                  {steps[key].helper}
                </span>
              </div>
            ))}
          </div>
        </div>

        {alert && (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              alert.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : alert.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-primary-200 bg-primary-50 text-primary-700"
            }`}
          >
            {alert.message}
          </div>
        )}

        <form className="mt-8 flex flex-col gap-6" onSubmit={handleSubmit}>
          {step === "datos" && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Paso 1. Datos personales e identidad</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={fieldWrapper}>
                  <label className={labelClass}>Nombres</label>
                  <input className={inputClass} value={form.nombres} onChange={e => updateField("nombres", e.target.value)} />
                  {renderError("nombres")}
                </div>
                <div className={fieldWrapper}>
                  <label className={labelClass}>Apellidos</label>
                  <input className={inputClass} value={form.apellidos} onChange={e => updateField("apellidos", e.target.value)} />
                  {renderError("apellidos")}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={fieldWrapper}>
                  <label className={labelClass}>Tipo de documento</label>
                  <select
                    className={inputClass}
                    value={form.documentoId ?? ""}
                    onChange={e => updateField("documentoId", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Selecciona</option>
                    {documentos.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.nombre}
                      </option>
                    ))}
                  </select>
                  {renderError("documentoId")}
                </div>
                <div className={fieldWrapper}>
                  <label className={labelClass}>Numero</label>
                  <input className={inputClass} value={form.documentoNumero} onChange={e => updateField("documentoNumero", e.target.value)} />
                  {renderError("documentoNumero")}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={fieldWrapper}>
                  <label className={labelClass}>Sexo</label>
                  <div className="flex gap-4 text-sm">
                    {[
                      { label: "Femenino", value: "F" },
                      { label: "Masculino", value: "M" },
                      { label: "Otro", value: "X" },
                    ].map(item => (
                      <label key={item.value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="sexo"
                          value={item.value}
                          checked={form.sexo === item.value}
                          onChange={() => updateField("sexo", item.value as RegisterForm["sexo"])}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className={fieldWrapper}>
                  <label className={labelClass}>Fecha de nacimiento</label>
                  <input type="date" className={inputClass} value={form.fechaNacimiento} onChange={e => updateField("fechaNacimiento", e.target.value)} />
                  {renderError("fechaNacimiento")}
                </div>
              </div>
              <div className={fieldWrapper}>
                <label className={labelClass}>Pais</label>
                <select className={inputClass} value={form.paisId ?? ""} onChange={e => updateField("paisId", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Selecciona</option>
                  {paises.map(pais => (
                    <option key={pais.id} value={pais.id}>
                      {pais.nombre}
                    </option>
                  ))}
                </select>
                {renderError("paisId")}
              </div>
            </section>
          )}
          {step === "ubicacion" && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Paso 2. Ubicacion y seguro</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={fieldWrapper}>
                  <label className={labelClass}>Departamento</label>
                  <select
                    className={`${inputClass} ${loadingDepartamentos ? "opacity-60" : ""}`}
                    value={form.departamentoId ?? ""}
                    disabled={loadingDepartamentos || !departamentos.length}
                    onChange={e => updateField("departamentoId", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Selecciona</option>
                    {departamentos.map(dep => (
                      <option key={dep.id} value={dep.id}>
                        {dep.nombre}
                      </option>
                    ))}
                  </select>
                  {renderError("departamentoId")}
                </div>
                <div className={fieldWrapper}>
                  <label className={labelClass}>Provincia</label>
                  <select
                    className={`${inputClass} ${loadingProvincias ? "opacity-60" : ""}`}
                    value={form.provinciaId ?? ""}
                    disabled={loadingProvincias || !provincias.length}
                    onChange={e => updateField("provinciaId", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Selecciona</option>
                    {provincias.map(prov => (
                      <option key={prov.id} value={prov.id}>
                        {prov.nombre}
                      </option>
                    ))}
                  </select>
                  {renderError("provinciaId")}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={fieldWrapper}>
                  <label className={labelClass}>Distrito</label>
                  <select
                    className={`${inputClass} ${loadingDistritos ? "opacity-60" : ""}`}
                    value={form.distritoId ?? ""}
                    disabled={loadingDistritos || !distritos.length}
                    onChange={e => updateField("distritoId", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Selecciona</option>
                    {distritos.map(dist => (
                      <option key={dist.id} value={dist.id}>
                        {dist.nombre}
                      </option>
                    ))}
                  </select>
                  {renderError("distritoId")}
                </div>
                <div className={fieldWrapper}>
                  <label className={labelClass}>Tipo de seguro</label>
                  <select className={inputClass} value={form.tipoSeguro} onChange={e => updateField("tipoSeguro", e.target.value)}>
                    <option value="">Selecciona</option>
                    {tiposSeguro.map(seg => (
                      <option key={seg.codigo} value={seg.codigo}>
                        {seg.nombre}
                      </option>
                    ))}
                  </select>
                  {renderError("tipoSeguro")}
                </div>
              </div>
              <div className={fieldWrapper}>
                <label className={labelClass}>Direccion</label>
                <input className={inputClass} value={form.domicilio} onChange={e => updateField("domicilio", e.target.value)} />
                {renderError("domicilio")}
              </div>
              <div className={fieldWrapper}>
                <label className={labelClass}>Referencia (opcional)</label>
                <input className={inputClass} value={form.referencia} onChange={e => updateField("referencia", e.target.value)} />
              </div>
            </section>
          )}
          {step === "contacto" && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Paso 3. Contacto y contrasena</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={fieldWrapper}>
                  <label className={labelClass}>Correo electronico</label>
                  <input type="email" className={inputClass} value={form.correo} onChange={e => updateField("correo", e.target.value)} />
                  {renderError("correo")}
                </div>
                <div className={fieldWrapper}>
                  <label className={labelClass}>Telefono movil</label>
                  <input className={inputClass} value={form.telefono} onChange={e => updateField("telefono", e.target.value)} />
                  {renderError("telefono")}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={fieldWrapper}>
                  <label className={labelClass}>Contrasena</label>
                  <input type="password" className={inputClass} value={form.password} onChange={e => updateField("password", e.target.value)} />
                  {renderError("password")}
                </div>
                <div className={fieldWrapper}>
                  <label className={labelClass}>Confirmar contrasena</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={form.passwordConfirm}
                    onChange={e => updateField("passwordConfirm", e.target.value)}
                  />
                  {renderError("passwordConfirm")}
                </div>
              </div>
            </section>
          )}
          {step === "verificacion" && (
            <section className="flex flex-col gap-5">
              <h2 className="text-lg font-semibold">Paso 4. Verificacion y consentimiento</h2>
              <div className="rounded-2xl bg-background-secondary/60 p-4">
                <p className="text-sm font-semibold">Resumen</p>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs text-text-secondary">Usuario</p>
                    <p className="font-medium">{summary.nombre || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Documento</p>
                    <p className="font-medium">{summary.documento || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Contacto</p>
                    <p className="font-medium">{summary.correo}</p>
                    <p className="text-xs text-text-secondary">{summary.telefono}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Ubicacion</p>
                    <p className="font-medium">{summary.ubicacion || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Direccion</p>
                    <p className="font-medium">{summary.direccion || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Seguro</p>
                    <p className="font-medium">{summary.seguro || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm">
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={form.aceptaCondiciones} onChange={e => updateField("aceptaCondiciones", e.target.checked)} />
                  <span>Acepto los Terminos y Condiciones del servicio</span>
                </label>
                {renderError("aceptaCondiciones")}
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={form.aceptaTratamiento} onChange={e => updateField("aceptaTratamiento", e.target.checked)} />
                  <span>Autorizo el tratamiento de mis datos personales segun la Ley 29733</span>
                </label>
                {renderError("aceptaTratamiento")}
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm text-text-secondary">
                  Enviaremos el codigo al correo <span className="font-semibold text-text-primary">{form.correo || "que registraste"}</span>
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="rounded-2xl border border-primary-500 px-5 py-2 text-sm font-semibold text-primary-600 disabled:opacity-60"
                    onClick={handleSendCode}
                    disabled={codeSending || !userId}
                  >
                    {codeSent ? "Reenviar codigo" : "Enviar codigo"}
                  </button>
                  {codeSent && <span className="text-xs text-text-secondary">Revisa tu bandeja o spam.</span>}
                </div>
                <div className={fieldWrapper}>
                  <label className={labelClass}>Codigo de verificacion</label>
                  <input
                    className={`${inputClass} text-center tracking-[0.4em]`}
                    value={verificationCode}
                    maxLength={6}
                    onChange={e => {
                      const value = e.target.value.replace(/[^0-9]/g, "")
                      setVerificationCode(value)
                      setErrors(prev => {
                        if (!prev.verificationCode) return prev
                        const copy = { ...prev }
                        delete copy.verificationCode
                        return copy
                      })
                    }}
                  />
                  {renderError("verificationCode")}
                </div>
              </div>
            </section>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === "datos"}
              className="rounded-2xl border border-border-soft px-6 py-2 text-sm font-semibold text-text-secondary disabled:opacity-40"
            >
              Volver
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-primary-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={submitting}
            >
              {step === "verificacion" ? "Crear cuenta" : "Siguiente"}
            </button>
          </div>

        </form>

        <p className="mt-8 text-center text-sm text-text-secondary">
          Ya tienes una cuenta? <Link to="/login" className="font-semibold text-primary-600">Inicia sesion aqui</Link>
        </p>
      </div>
    </div>
  )
}

function calcularEdad(fecha: string) {
  const birth = new Date(fecha)
  const today = new Date()
  let edad = today.getFullYear() - birth.getFullYear()
  const month = today.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
    edad--
  }
  return edad
}
