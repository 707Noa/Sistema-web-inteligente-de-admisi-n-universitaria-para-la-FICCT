import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'
import { FiHome, FiUsers, FiUserCheck, FiBook, FiLayers, FiFileText, FiBarChart2, FiShield, FiClipboard, FiGrid } from 'react-icons/fi'

const menuItems = {
  administrador: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <FiHome /> },
    { label: 'Gestión de Usuarios', path: '/admin/usuarios', icon: <FiUsers /> },
  ],
  coordinador: [
    { label: 'Dashboard', path: '/coordinador/dashboard', icon: <FiHome /> },
    { label: 'Gestión de Usuarios', path: '/admin/usuarios', icon: <FiUsers /> },
  ],
  autoridad: [
    { label: 'Dashboard', path: '/autoridad/dashboard', icon: <FiHome /> },
  ],
  docente: [
    { label: 'Inicio', path: '/docente/inicio', icon: <FiHome /> },
  ],
  postulante: [
    { label: 'Inicio', path: '/postulante/inicio', icon: <FiHome /> },
  ],
}

export default function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const items = menuItems[user?.role] || []

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <div className="sidebar-logo-text">
            <h2>CUP-FICCT</h2>
            <p>Portal Preuniversitario</p>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-title">Menú Principal</div>
          {items.map((item) => (
            <button
              key={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
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
