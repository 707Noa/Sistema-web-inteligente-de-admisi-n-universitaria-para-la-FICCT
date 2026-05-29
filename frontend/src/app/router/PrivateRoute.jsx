import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/packages/p1-seguridad-administracion/auth/hooks/useAuth'

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>
  if (!user) return <Navigate to="/" replace />

  return children
}
