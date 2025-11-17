export default function CitasSidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-16 md:w-60 shrink-0 p-3 md:p-4 gap-3 sticky top-0 h-screen" style={{ backgroundColor: '#6B2FB3' }}>
      <div className="flex items-center justify-center md:justify-start gap-2 px-1 py-2">
        <div className="h-8 w-8 rounded-full bg-white/90 grid place-items-center">
          <span className="text-xl font-bold" style={{ color: '#6B2FB3' }}>?</span>
        </div>
        <span className="hidden md:block text-white font-semibold tracking-wide">PRAXIA</span>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <a href="/home" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors text-white/90 hover:bg-white/80">
          <span className="material-symbols-outlined text-lg" aria-hidden>cottage</span>
          <span className="text-white">Inicio</span>
        </a>
        <a href="/citas" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors bg-white/90 font-medium">
          <span className="material-symbols-outlined text-lg" style={{ color: '#6B2FB3' }} aria-hidden>calendar_month</span>
          <span className="text-primary">Solicitar cita</span>
        </a>
      </div>
      <div className="mt-auto">
        <a href="/micuenta" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors text-white/90 hover:bg-white/80">
          <span className="material-symbols-outlined text-lg" aria-hidden>person</span>
          <span className="text-white">Mi cuenta</span>
        </a>
      </div>
    </aside>
  )
}

