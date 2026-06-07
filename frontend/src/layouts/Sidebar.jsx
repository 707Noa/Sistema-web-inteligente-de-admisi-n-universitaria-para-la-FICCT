import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'
import { FiHome, FiUsers, FiUserCheck, FiX, FiUser, FiBook, FiGrid, FiList, FiBarChart2, FiClock, FiCheckSquare, FiAward, FiFileText, FiSliders, FiUserPlus } from 'react-icons/fi'

const menuItems = {
  // ── Administrador (sin cambios) ──
  administrador: [
    { label: 'Dashboard',              path: '/admin/dashboard',   icon: <FiHome /> },
    { label: 'Gestión de Usuarios',    path: '/admin/usuarios',    icon: <FiUsers /> },
    { label: 'Gestión de Postulantes', path: '/admin/postulantes', icon: <FiUserCheck /> },
  ],
  // ── Coordinador Académico ──
  coordinador: [
    { label: 'Dashboard',              path: '/coordinador/dashboard',        icon: <FiHome /> },
    { label: 'Gestión de postulantes', path: '/coordinador/postulantes',      icon: <FiUserCheck /> },
    { label: 'Gestión de docentes',    path: '/coordinador/docentes',         icon: <FiBook /> },
    { label: 'Gestión de grupos',      path: '/coordinador/grupos',           icon: <FiGrid /> },
    { label: 'Asignación académica',   path: '/coordinador/asignacion',       icon: <FiList /> },
    { label: 'Reporte de horarios',    path: '/coordinador/reporte-horarios', icon: <FiBarChart2 /> },
    { label: 'Cupos por carrera',      path: '/coordinador/cupos-carrera',     icon: <FiSliders /> },
    { label: 'Admisión final',         path: '/coordinador/admision-final',    icon: <FiUserPlus /> },
  ],
  // ── Autoridad Académica ──
  autoridad: [
    { label: 'Dashboard académico',    path: '/autoridad/dashboard',    icon: <FiHome /> },
    { label: 'Grupos habilitados',     path: '/autoridad/grupos',       icon: <FiGrid /> },
    { label: 'Docentes asignados',     path: '/autoridad/docentes',     icon: <FiBook /> },
    { label: 'Horarios',               path: '/autoridad/horarios',     icon: <FiList /> },
    { label: 'Estadísticas generales', path: '/autoridad/estadisticas',  icon: <FiBarChart2 /> },
  ],
  // ── Docente ──
  docente: [
    { label: 'Mis Grupos',             path: '/docente/grupos',         icon: <FiGrid /> },
    { label: 'Asistencia',             path: '/docente/asistencia',     icon: <FiCheckSquare /> },
    { label: 'Calificaciones',         path: '/docente/calificaciones', icon: <FiAward /> },
    { label: 'Reportes',               path: '/docente/reportes',       icon: <FiFileText /> },
    { label: 'Mis materias',           path: '/docente/mis-materias',   icon: <FiBook /> },
    { label: 'Mis estudiantes',        path: '/docente/mis-estudiantes',icon: <FiUsers /> },
  ],
  // ── Postulante ──
  postulante: [
    { label: 'Panel General',          path: '/perfil',                    icon: <FiHome /> },
    { label: 'Mi Horario',             path: '/postulante/horario',        icon: <FiClock /> },
    { label: 'Mis Calificaciones',     path: '/postulante/calificaciones', icon: <FiAward /> },
  ],
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
