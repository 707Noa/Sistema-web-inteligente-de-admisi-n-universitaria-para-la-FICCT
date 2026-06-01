import React from 'react'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { FiLogOut, FiMenu, FiX } from 'react-icons/fi'

const ROL_LABELS = {
  administrador: 'Administrador',
  docente:       'Docente',
  coordinador:   'Coordinador Académico',
  autoridad:     'Autoridad Académica',
  postulante:    'Postulante',
}

export default function Navbar({ onMenuToggle, isOpen }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button
          className="hamburger-btn"
          onClick={onMenuToggle}
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {isOpen ? <FiX /> : <FiMenu />}
        </button>
        <div className="navbar-brand">
          <div className="navbar-brand-icon">🎓</div>
          <span>CUP-FICCT</span>
        </div>
      </div>

      <div className="navbar-user">
        <div className="navbar-user-info">
          <div className="navbar-user-name">{user?.name || 'Usuario'}</div>
          <div className="navbar-user-role">{ROL_LABELS[user?.role] || user?.role || ''}</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleLogout} title="Cerrar sesión">
          <FiLogOut /> Salir
        </button>
      </div>
    </nav>
  )
}
