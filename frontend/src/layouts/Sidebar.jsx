import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'
import { FiHome, FiUsers, FiUserCheck, FiX, FiUser, FiBook, FiGrid, FiList, FiBarChart2 } from 'react-icons/fi'

const menuItems = {
  // ── Administrador (sin cambios) ──
  administrador: [
    { label: 'Dashboard',              path: '/admin/dashboard',   icon: <FiHome /> },
    { label: 'Gestión de Usuarios',    path: '/admin/usuarios',    icon: <FiUsers /> },
    { label: 'Gestión de Postulantes', path: '/admin/postulantes', icon: <FiUserCheck /> },
  ],
  // ── Coordinador Académico ──
  coordinador: [
    { label: 'Dashboard',            path: '/coordinador/dashboard',        icon: <FiHome /> },
    { label: 'Perfil',               path: '/coordinador/perfil',           icon: <FiUser /> },
    { label: 'Gestión de postulantes', path: '/coordinador/postulantes',     icon: <FiUserCheck /> },
    { label: 'Gestión de docentes',  path: '/coordinador/docentes',         icon: <FiBook /> },
    { label: 'Gestión de grupos',    path: '/coordinador/grupos',           icon: <FiGrid /> },
    { label: 'Asignación académica', path: '/coordinador/asignacion',       icon: <FiList /> },
    { label: 'Reporte de horarios',  path: '/coordinador/reporte-horarios', icon: <FiBarChart2 /> },
  ],
  // ── Demás roles ──
  autoridad: [
    { label: 'Perfil',               path: '/perfil',                 icon: <FiUser /> },
    { label: 'Dashboard académico',  path: '/autoridad/dashboard',    icon: <FiHome /> },
    { label: 'Grupos habilitados',   path: '/autoridad/grupos',       icon: <FiGrid /> },
    { label: 'Docentes asignados',   path: '/autoridad/docentes',     icon: <FiBook /> },
    { label: 'Horarios',             path: '/autoridad/horarios',     icon: <FiList /> },
    { label: 'Estadísticas generales',path: '/autoridad/estadisticas',  icon: <FiBarChart2 /> },
  ],
  docente: [
    { label: 'Perfil',               path: '/perfil',                 icon: <FiUser /> },
    { label: 'Mis grupos',           path: '/docente/mis-grupos',     icon: <FiGrid /> },
    { label: 'Mis materias',         path: '/docente/mis-materias',   icon: <FiBook /> },
    { label: 'Mis estudiantes',      path: '/docente/mis-estudiantes',icon: <FiUsers /> },
    { label: 'Registro de notas',    path: '/docente/registro-notas', icon: <FiList /> },
  ],
  postulante: [{ label: 'Perfil', path: '/perfil', icon: <FiUser /> }],
}

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const items = menuItems[user?.role] || []

  const handleNavigate = (path) => { navigate(path); onClose() }

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
