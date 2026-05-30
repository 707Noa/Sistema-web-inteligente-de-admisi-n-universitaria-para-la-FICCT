import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'

export default function RoleRoute({ children, roles = [] }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>
  if (!user) return <Navigate to="/" replace />
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
