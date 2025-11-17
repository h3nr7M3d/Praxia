import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Clock, CheckCircle, AlertTriangle, User as UserIcon } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { twMerge } from 'tailwind-merge';
import './UserDropdown.css';

// Función para combinar clases de Tailwind
export function cn(...inputs: any[]) {
  return twMerge(inputs.filter(Boolean).join(' '));
}

// Componente de Avatar simple
const Avatar = ({ src, alt, fallback, className }: { src?: string; alt?: string; fallback: string; className?: string }) => {
  return (
    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full bg-gray-100', className)}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="text-sm font-medium text-gray-700">
          {fallback}
        </span>
      )}
    </div>
  );
};

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'success' | 'warning' | 'info';
}

interface UserDropdownProps {
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  className?: string;
  trigger?: React.ReactNode;
}

const UserDropdown = ({
  userName = 'Usuario',
  userEmail,
  onLogout,
  className,
  trigger,
}: UserDropdownProps) => {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'

  React.useEffect(() => {
  const samples: NotificationItem[] = [
    { id:"s1", title:"Cita pr�xima", message:"10:00 � P�rez, Luis � Cardiolog�a", time:new Date().toLocaleString(), read:false, type:"info" },
    { id:"s2", title:"Nueva cita registrada", message:"11:40 � Garc�a, Ana � Teleconsulta", time:new Date().toLocaleString(), read:true, type:"success" },
    { id:"s3", title:"Pago pendiente", message:"Cita #12345 � confirmar copago", time:new Date().toLocaleString(), read:false, type:"warning" },
  ]
  const uid = localStorage.getItem('userId')
  const load = async () => {
    try {
      if (!uid) { setNotifications(samples); setUnreadCount(samples.filter(x=>!x.read).length); return }
      const res = await fetch(`${API_BASE}/notificaciones/mias?userId=${uid}&limit=10`)
      if (!res.ok) { setNotifications(samples); setUnreadCount(samples.filter(x=>!x.read).length); return }
      const data = await res.json() as any[]
      const mapped: NotificationItem[] = data.map((n, idx) => ({
        id: String(n.id_notif ?? idx),
        title: n.asunto_render || (n.plantilla_cod === 'CITA_RESERVADA' ? 'Cita reservada' : n.plantilla_cod || 'Notificaci�n'),
        message: n.cuerpo_render || '',
        time: new Date(n.programada_para || Date.now()).toLocaleString(),
        read: n.estado === 'enviado',
        type: n.plantilla_cod === 'CITA_ESTADO' ? 'warning' : (n.plantilla_cod?.includes('REMINDER') ? 'info' : 'success')
      }))
      const finalList = mapped.length>0 ? mapped : samples
      setNotifications(finalList)
      setUnreadCount(finalList.filter(x => !x.read).length)
    } catch {
      setNotifications(samples)
      setUnreadCount(samples.filter(x=>!x.read).length)
    }
  }
  load()
}, [])
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          {trigger || (
            <button
              className={cn(
                'relative rounded-full p-2 bg-white shadow hover:shadow-md transition',
                className
              )}
              aria-label="Notificaciones"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span 
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-yellow-500"
                />
              )}
            </button>
          )}
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
            sideOffset={10}
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {unreadCount} sin leer
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenu.Item key={notification.id} asChild>
                    <div 
                      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {notification.time}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  </DropdownMenu.Item>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  No hay notificaciones
                </div>
              )}
            </div>

            <div className="p-2 border-t border-gray-100 text-center">
              <div className="flex flex-col">
                <button 
                  className="w-full flex items-center justify-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded outline-none"
                  onClick={() => { setUnreadCount(0); setNotifications(n=> n.map(x=> ({...x, read:true}))) }}
                >
                  Marcar todas como leídas
                </button>
                <DropdownMenu.Item asChild>
                  <Link
                    to="/micuenta"
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded outline-none mt-1"
                  >
                    <UserIcon className="w-4 h-4 text-gray-600" />
                    Mi cuenta
                  </Link>
                </DropdownMenu.Item>
                <button 
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded outline-none mt-1 border-t border-gray-100 pt-2"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onLogout) {
                      onLogout();
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

export default UserDropdown;

