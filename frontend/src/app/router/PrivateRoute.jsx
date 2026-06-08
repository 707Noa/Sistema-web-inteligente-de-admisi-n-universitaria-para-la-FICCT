import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'

// Rutas permitidas por rol (además de /perfil que aplica a todos)
const ALLOWED_PATHS = {
  coordinador: ['/perfil', '/coordinador/'],
  autoridad:   ['/perfil', '/autoridad/'],
  docente:     ['/perfil', '/docente/'],
  postulante:  ['/perfil', '/postulante/'],
  // administrador: sin restricción
}

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>
  if (!user) return <Navigate to="/" replace />

  const allowed = ALLOWED_PATHS[user.role]
  if (allowed) {
    const canAccess = allowed.some(p => location.pathname.startsWith(p))
    if (!canAccess) return <Navigate to="/perfil" replace />
  }

  return children
}
