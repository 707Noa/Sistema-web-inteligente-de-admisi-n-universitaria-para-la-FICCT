import React from 'react'
import { useAuth } from '@/packages/p1-seguridad-administracion/auth/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { FiLogOut, FiUser } from 'react-icons/fi'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-brand-icon">🎓</div>
        <span>CUP-FICCT</span>
      </div>
      <div className="navbar-user">
        <div className="navbar-user-info">
          <div className="navbar-user-name">{user?.name || 'Usuario'}</div>
          <div className="navbar-user-role">{user?.role || ''}</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleLogout} title="Cerrar sesión">
          <FiLogOut /> Salir
        </button>
      </div>
    </nav>
  )
}
