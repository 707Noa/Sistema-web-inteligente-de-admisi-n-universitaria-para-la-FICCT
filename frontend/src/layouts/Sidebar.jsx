import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'
import { FiHome, FiUsers, FiUserCheck, FiX, FiUser } from 'react-icons/fi'

const menuItems = {
  // ── Administrador (sin cambios) ──
  administrador: [
    { label: 'Dashboard',              path: '/admin/dashboard',   icon: <FiHome /> },
    { label: 'Gestión de Usuarios',    path: '/admin/usuarios',    icon: <FiUsers /> },
    { label: 'Gestión de Postulantes', path: '/admin/postulantes', icon: <FiUserCheck /> },
  ],
  // ── Resto de roles: solo Perfil ──
  coordinador: [{ label: 'Perfil', path: '/perfil', icon: <FiUser /> }],
  autoridad:   [{ label: 'Perfil', path: '/perfil', icon: <FiUser /> }],
  docente:     [{ label: 'Perfil', path: '/perfil', icon: <FiUser /> }],
  postulante:  [{ label: 'Perfil', path: '/perfil', icon: <FiUser /> }],
}

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const items = menuItems[user?.role] || []

  const handleNavigate = (path) => {
    navigate(path)
    onClose()
  }

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <div className="sidebar-logo-text">
            <h2>CUP-FICCT</h2>
            <p>Portal Preuniversitario</p>
          </div>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Cerrar menú">
          <FiX />
        </button>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-title">Menú Principal</div>
          {items.map((item) => (
            <button
              key={item.path}
              className={`sidebar-link${location.pathname === item.path ? ' active' : ''}`}
              onClick={() => handleNavigate(item.path)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </aside>
  )
}
