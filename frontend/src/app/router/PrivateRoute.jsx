import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'

const NON_ADMIN_ROLES = ['docente', 'coordinador', 'autoridad', 'postulante']

// Rutas permitidas para usuarios no-administrador
const NON_ADMIN_ALLOWED = ['/perfil']

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>
  if (!user) return <Navigate to="/" replace />

  // Usuarios no-administrador solo pueden acceder a /perfil
  if (NON_ADMIN_ROLES.includes(user.role)) {
    const allowed = NON_ADMIN_ALLOWED.some(p => location.pathname.startsWith(p))
    if (!allowed) return <Navigate to="/perfil" replace />
  }

  return children
}
