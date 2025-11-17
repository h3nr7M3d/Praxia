import { MouseEvent, useEffect, useRef, useState } from 'react'

const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

type Msg = { role: 'user' | 'assistant'; text: string }

export default function ChatButton() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  function toggle(e: MouseEvent) {
    e.stopPropagation()
    setOpen(v => !v)
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setSending(true)
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply || '' }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'No pude responder en este momento.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error de red.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="Abrir chat"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-white shadow-xl hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-primary/30 flex items-center justify-center"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>chat</span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[min(420px,92vw)] rounded-2xl border-2 border-border-soft bg-white shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border-soft bg-background-secondary flex items-center justify-between">
            <div className="font-semibold">Asistente Praxia</div>
            <button onClick={() => setOpen(false)} className="text-text-secondary hover:text-primary" aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="max-h-[48vh] overflow-y-auto p-3 space-y-2 text-sm">
            {messages.length === 0 && (
              <div className="text-text-secondary">Hola, soy tu asistente de Praxia. Pregúntame sobre las funcionalidades de la clínica.</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-3 py-2 rounded-xl border ${m.role === 'user' ? 'bg-primary text-white border-transparent' : 'bg-white/70 text-text-primary border-border-soft'}`}>{m.text}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="p-3 border-t border-border-soft flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send() }}
              placeholder="Escribe tu pregunta sobre Praxia..."
              className="flex-1 rounded-lg border border-border-soft bg-white/70 px-3 py-2 outline-none focus:border-primary"
            />
            <button onClick={send} disabled={sending} className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:opacity-90 disabled:opacity-60">Enviar</button>
          </div>
        </div>
      )}
    </>
  )
}
