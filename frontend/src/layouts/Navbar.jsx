import React, { useState } from 'react'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { FiLogOut, FiMenu, FiX, FiSun, FiMoon } from 'react-icons/fi'
import { useTheme } from '@/shared/context/ThemeContext'

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
  const { theme, toggleTheme } = useTheme()

  const [mostrarConfirmacionSalir, setMostrarConfirmacionSalir] = useState(false)
  const [cerrandoSesion, setCerrandoSesion] = useState(false)

  const handleLogout = () => {
    setMostrarConfirmacionSalir(true)
  }

  const confirmarSalir = async () => {
    setCerrandoSesion(true)
    try {
      await logout()
      navigate('/')
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    } finally {
      setCerrandoSesion(false)
      setMostrarConfirmacionSalir(false)
    }
  }

  return (
    <>
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
          <button
            className="hamburger-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            style={{ marginRight: 4 }}
          >
            {theme === 'light' ? <FiMoon /> : <FiSun />}
          </button>
          <div className="navbar-user-info">
            <div className="navbar-user-name">{user?.name || 'Usuario'}</div>
            <div className="navbar-user-role">{ROL_LABELS[user?.role] || user?.role || ''}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout} title="Cerrar sesión">
            <FiLogOut /> Salir
          </button>
        </div>
      </nav>

      {mostrarConfirmacionSalir && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: 400, padding: 24, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                margin: '0 auto'
              }}>
                ⚠️
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>
              ¿Está seguro de salir?
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 24 }}>
              Está saliendo de su perfil. ¿Desea continuar?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn btn-outline"
                onClick={() => setMostrarConfirmacionSalir(false)}
                disabled={cerrandoSesion}
                style={{ flex: 1 }}
              >
                No
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmarSalir}
                disabled={cerrandoSesion}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {cerrandoSesion ? 'Saliendo...' : 'Sí'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
