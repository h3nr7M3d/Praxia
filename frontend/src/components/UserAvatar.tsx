import { useEffect, useState } from 'react'

type Props = {
  size?: number
  className?: string
}

export default function UserAvatar({ size = 40, className = '' }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [emailLabel, setEmailLabel] = useState('')
  const [nameLabel, setNameLabel] = useState('')

  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  useEffect(() => {
    const uid = localStorage.getItem('userId')
    const em = localStorage.getItem('userEmail') || ''
    const nm = localStorage.getItem('userName') || ''
    setEmailLabel(em)
    setNameLabel(nm)
    if (!uid) return
    const url = `${API_BASE}/usuarios/${uid}/logo`
    fetch(url).then(res => {
      if (res.ok) setAvatarUrl(`${url}?ts=${Date.now()}`)
    }).catch(() => {})
  }, [])

  const style = { width: size, height: size }

  return (
    <div className={`rounded-full border border-border-soft bg-white/50 overflow-hidden flex items-center justify-center ${className}`} style={style}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-text-primary font-bold" style={{ fontSize: Math.floor(size * 0.45), lineHeight: 1 }}>
            {(() => {
              const name = nameLabel.trim()
              if (name) {
                const parts = name.split(/\s+/).filter(Boolean)
                const a = parts[0]?.[0] || ''
                const b = parts.length > 1 ? parts[parts.length - 1][0] : ''
                const res = (a + b).toUpperCase()
                return res || (name[0] || '?').toUpperCase()
              }
              const user = (emailLabel || '').split('@')[0] || ''
              const a = user[0] || '?'
              const b = user[1] || ''
              return (a + b).toUpperCase()
            })()}
          </span>
        </div>
      )}
    </div>
  )
}
