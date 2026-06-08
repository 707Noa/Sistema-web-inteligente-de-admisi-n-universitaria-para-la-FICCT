import React, { useState, useEffect } from 'react'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import {
  FiLogOut, FiMenu, FiX, FiSun, FiMoon, FiSearch, FiHelpCircle,
  FiCalendar, FiBell, FiChevronDown, FiUser, FiCreditCard, FiMail,
  FiHash, FiCheckCircle, FiXCircle, FiKey, FiLock, FiAlertCircle, FiEye, FiEyeOff
} from 'react-icons/fi'
import { useTheme } from '@/shared/context/ThemeContext'
import { getPostulantePerfil } from '@/modules/p2-participantes-grupos/postulantes/services/postulanteService'
import { changePassword } from '@/modules/p1-seguridad-administracion/auth/services/authService'

const ROL_LABELS = {
  administrador: 'Administrador',
  docente: 'Docente',
  coordinador: 'Coordinador Académico',
  autoridad: 'Autoridad Académica',
  postulante: 'Postulante',
}

function calcRegistro(codigo, ci) {
  if (codigo) return codigo
  if (ci) return '2026' + String(ci).split('').reverse().join('')
  return '—'
}

function DropdownInfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--gray-400)', display: 'flex', alignItems: 'center' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--gray-500)', marginRight: '4px' }}>{label}:</span>
        <strong style={{ color: 'var(--gray-700)', fontWeight: 600 }}>{value || '—'}</strong>
      </div>
    </div>
  )
}

export default function Navbar({ onMenuToggle, isOpen }) {
  const { user, logout, checkAuth } = useAuth()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const [mostrarConfirmacionSalir, setMostrarConfirmacionSalir] = useState(false)
  const [cerrandoSesion, setCerrandoSesion] = useState(false)
  const [mostrarMenuPerfil, setMostrarMenuPerfil] = useState(false)
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [profileData, setProfileData] = useState(null)

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [formPass, setFormPass] = useState({ new_password: '', new_password_confirmation: '' })
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')
  const [passSaving, setPassSaving] = useState(false)
  const [showPassField, setShowPassField] = useState(false)
  const [showConfirmPassField, setShowConfirmPassField] = useState(false)

  const passHasMinLength = formPass.new_password.length >= 8
  const passHasLowercase = /[a-z]/.test(formPass.new_password)
  const passHasUppercase = /[A-Z]/.test(formPass.new_password)
  const passHasSpecialChar = /[!@#$%^&*(),.?":{}|<>_+\-=\[\]]/.test(formPass.new_password)
  const passPasswordsMatch = formPass.new_password === formPass.new_password_confirmation && formPass.new_password_confirmation !== ''
  const passFormValid = passHasMinLength && passHasLowercase && passHasUppercase && passHasSpecialChar && passPasswordsMatch

  useEffect(() => {
    if (user && user.role === 'postulante') {
      getPostulantePerfil()
        .then(r => setProfileData(r.data))
        .catch(() => { })
    }
  }, [user])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.navbar-profile-trigger') && !e.target.closest('.navbar-profile-dropdown')) {
        setMostrarMenuPerfil(false)
      }
      if (!e.target.closest('.navbar-calendar-trigger') && !e.target.closest('.navbar-calendar-dropdown')) {
        setMostrarCalendario(false)
      }
      if (!e.target.closest('.navbar-notifications-trigger') && !e.target.closest('.navbar-notifications-dropdown')) {
        setMostrarNotificaciones(false)
      }
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPassError('')
    setPassSuccess('')

    if (!passFormValid) {
      setPassError('La contraseña no cumple con todos los requisitos de seguridad.')
      return
    }

    setPassSaving(true)
    try {
      await changePassword(formPass)
      setPassSuccess('¡Contraseña actualizada correctamente!')
      setTimeout(async () => {
        await checkAuth()
        setShowPasswordModal(false)
        setFormPass({ new_password: '', new_password_confirmation: '' })
        setPassSuccess('')
      }, 1500)
    } catch (err) {
      setPassError(err.response?.data?.message || 'Error al cambiar la contraseña.')
    } finally {
      setPassSaving(false)
    }
  }

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false)
    setFormPass({ new_password: '', new_password_confirmation: '' })
    setPassError('')
    setPassSuccess('')
    setShowPassField(false)
    setShowConfirmPassField(false)
  }

  const userInitial = (user?.name || 'U')[0].toUpperCase()

  const renderCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    let firstDayIndex = new Date(year, month, 1).getDay()
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1

    const days = []
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} style={{ width: '30px', height: '30px' }}></div>)
    }
    const today = new Date()
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year
      days.push(
        <div
          key={`day-${d}`}
          style={{
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            fontSize: '0.78rem',
            fontWeight: isToday ? 'bold' : 'normal',
            background: isToday ? 'var(--primary-gradient)' : 'transparent',
            color: isToday ? 'white' : 'var(--gray-700)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          onClick={(e) => {
            e.stopPropagation()
          }}
          onMouseEnter={(e) => {
            if (!isToday) e.currentTarget.style.background = 'var(--gray-100)'
          }}
          onMouseLeave={(e) => {
            if (!isToday) e.currentTarget.style.background = 'transparent'
          }}
        >
          {d}
        </div>
      )
    }

    return (
      <div style={{ padding: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setCurrentDate(new Date(year, month - 1, 1))
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', fontWeight: 'bold', fontSize: '1rem', padding: '0 4px' }}
          >
            &lt;
          </button>
          <strong style={{ fontSize: '0.85rem', color: 'var(--gray-800)' }}>
            {monthNames[month]} {year}
          </strong>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setCurrentDate(new Date(year, month + 1, 1))
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', fontWeight: 'bold', fontSize: '1rem', padding: '0 4px' }}
          >
            &gt;
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.7rem', color: 'var(--gray-400)', marginBottom: '4px' }}>
          <div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div><div>D</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {days}
        </div>
      </div>
    )
  }

  return (
    <>
      <nav className="navbar" style={{ position: 'relative' }}>
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

        <div className="navbar-user" style={{ position: 'relative' }}>
          <button
            className="hamburger-btn navbar-calendar-trigger"
            title="Calendario"
            style={{ fontSize: '1.1rem', background: mostrarCalendario ? 'var(--gray-100)' : 'transparent' }}
            onClick={(e) => {
              e.stopPropagation()
              setMostrarCalendario(!mostrarCalendario)
              setMostrarNotificaciones(false)
              setMostrarMenuPerfil(false)
            }}
          >
            <FiCalendar />
          </button>
          <button
            className="hamburger-btn navbar-notifications-trigger"
            title="Notificaciones"
            style={{ fontSize: '1.1rem', background: mostrarNotificaciones ? 'var(--gray-100)' : 'transparent' }}
            onClick={(e) => {
              e.stopPropagation()
              setMostrarNotificaciones(!mostrarNotificaciones)
              setMostrarCalendario(false)
              setMostrarMenuPerfil(false)
            }}
          >
            <FiBell />
          </button>

          <button
            className="hamburger-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            style={{ marginRight: 8, fontSize: '1.1rem' }}
          >
            {theme === 'light' ? <FiMoon /> : <FiSun />}
          </button>

          {/* Clickable User Section */}
          <div
            className="navbar-profile-trigger"
            onClick={() => {
              setMostrarMenuPerfil(!mostrarMenuPerfil)
              setMostrarCalendario(false)
              setMostrarNotificaciones(false)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 'var(--radius)',
              transition: 'var(--transition)',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--primary-gradient)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.95rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {userInitial}
            </div>
            <div className="navbar-user-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              <div className="navbar-user-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {user?.name || 'Usuario'} <FiChevronDown style={{ fontSize: '0.8rem', color: 'var(--gray-50)' }} />
              </div>
              <div className="navbar-user-role">{ROL_LABELS[user?.role] || user?.role || ''}</div>
            </div>
          </div>

          {/* Calendar Dropdown Panel */}
          {mostrarCalendario && (
            <div
              className="navbar-calendar-dropdown"
              style={{
                position: 'absolute',
                top: 50,
                right: 140,
                width: 260,
                background: 'white',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--gray-200)',
                boxShadow: 'var(--shadow-lg)',
                padding: '12px',
                zIndex: 100,
                color: '#1e293b',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              {renderCalendar()}
            </div>
          )}

          {/* Notifications Dropdown Panel */}
          {mostrarNotificaciones && (
            <div
              className="navbar-notifications-dropdown"
              style={{
                position: 'absolute',
                top: 50,
                right: 90,
                width: 290,
                background: 'white',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--gray-200)',
                boxShadow: 'var(--shadow-lg)',
                padding: '16px',
                zIndex: 100,
                animation: 'fadeIn 0.2s ease',
                color: '#1e293b'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '8px', marginBottom: '12px' }}>
                <FiBell style={{ color: 'var(--primary)' }} />
                <strong style={{ fontSize: '0.9rem' }}>Notificaciones</strong>
              </div>
              {user?.must_change_password ? (
                <div style={{ display: 'flex', gap: '10px', background: 'var(--danger-light)', color: '#991b1b', padding: '12px', borderRadius: 'var(--radius)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <FiAlertCircle style={{ flexShrink: 0, fontSize: '1.1rem', marginTop: '2px' }} />
                  <div>
                    <strong>Contraseña inicial activa:</strong> Debes cambiar tu contraseña inicial. Esta opción se encuentra en tu perfil.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--gray-500)', fontSize: '0.82rem', padding: '8px 0' }}>
                  <FiCheckCircle style={{ color: 'var(--success)' }} />
                  <span>No tienes notificaciones pendientes</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Dropdown Panel */}
        {mostrarMenuPerfil && (
          <div
            className="navbar-profile-dropdown"
            style={{
              position: 'absolute',
              top: 68,
              right: 20,
              width: 320,
              background: 'white',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--gray-200)',
              boxShadow: 'var(--shadow-lg)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 100,
              color: '#1e293b',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '12px' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--primary-gradient)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '1.2rem'
              }}>
                {userInitial}
              </div>
              <div style={{ minWidth: 0 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || 'Usuario'}
                </h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {ROL_LABELS[user?.role] || user?.role || ''}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <DropdownInfoRow icon={<FiUser />} label="Nombre completo" value={user?.name} />
              <DropdownInfoRow icon={<FiCreditCard />} label="CI" value={user?.ci} />
              <DropdownInfoRow icon={<FiMail />} label="Correo electrónico" value={user?.email} />
              {user?.role === 'postulante' && (
                <>
                  <DropdownInfoRow icon={<FiHash />} label="Registro" value={profileData?.codigo_usuario || calcRegistro(user?.codigo, user?.ci)} />
                  <DropdownInfoRow icon={<FiCheckCircle />} label="Estado Trámite" value={profileData?.estado_tramite || user?.estado} />
                </>
              )}
              {user?.role !== 'postulante' && (
                <>
                  <DropdownInfoRow icon={<FiHash />} label="Código" value={user?.codigo} />
                  <DropdownInfoRow icon={<FiCheckCircle />} label="Estado" value={user?.estado} />
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--gray-100)', paddingTop: '12px', marginTop: '4px' }}>
              <button
                className="btn btn-outline btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', border: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}
                onClick={() => {
                  setMostrarMenuPerfil(false)
                  setShowPasswordModal(true)
                }}
              >
                <FiKey /> Actualizar contraseña
              </button>
              <button
                className="btn btn-outline btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', color: '#b91c1c', borderColor: '#fee2e2', background: '#fef2f2' }}
                onClick={() => {
                  setMostrarMenuPerfil(false)
                  setMostrarConfirmacionSalir(true)
                }}
              >
                <FiLogOut /> Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Confirm Sign Out Modal */}
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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" style={{ zIndex: 9998 }} onClick={handleClosePasswordModal}>
          <div className="modal" style={{ maxWidth: 460, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{
              background: 'var(--primary-gradient)',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiKey /> Actualizar datos de acceso
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
                  Por seguridad debes cambiar tu contraseña inicial.
                </p>
              </div>
              <button
                className="modal-close"
                onClick={handleClosePasswordModal}
                style={{ color: 'white', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 28, height: 28 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-body">
                {/* Usuario actual */}
                <div style={{
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  borderRadius: 'var(--radius)', padding: '10px 14px',
                  marginBottom: '16px', display: 'flex', alignItems: 'center',
                  gap: '10px', fontSize: '0.83rem'
                }}>
                  <FiUser style={{ color: '#2563eb', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--gray-600)' }}>Usuario actual: </span>
                    <strong style={{ color: '#1e40af', fontFamily: 'monospace' }}>
                      {user?.role === 'postulante'
                        ? (profileData?.codigo_usuario || calcRegistro(user?.codigo, user?.ci))
                        : (user?.codigo || user?.ci || user?.email || '—')
                      }
                    </strong>
                  </div>
                </div>

                {passError && (
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    background: 'var(--danger-light)', color: '#991b1b',
                    padding: '10px 12px', borderRadius: 'var(--radius)',
                    marginBottom: 12, fontSize: '0.82rem',
                  }}>
                    <FiAlertCircle style={{ flexShrink: 0 }} /> {passError}
                  </div>
                )}

                {passSuccess && (
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    background: 'var(--success-light)', color: 'var(--success)',
                    padding: '10px 12px', borderRadius: 'var(--radius)',
                    marginBottom: 12, fontSize: '0.82rem',
                  }}>
                    <FiCheckCircle style={{ flexShrink: 0 }} /> {passSuccess}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Nueva contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassField ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Mínimo 8 caracteres"
                      value={formPass.new_password}
                      onChange={e => setFormPass({ ...formPass, new_password: e.target.value })}
                      disabled={passSaving}
                      style={{ paddingRight: '40px' }}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassField(!showPassField)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer',
                        color: 'var(--gray-500)', display: 'flex', alignItems: 'center'
                      }}
                    >
                      {showPassField ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Confirmar nueva contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassField ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Repite la nueva contraseña"
                      value={formPass.new_password_confirmation}
                      onChange={e => setFormPass({ ...formPass, new_password_confirmation: e.target.value })}
                      disabled={passSaving}
                      style={{ paddingRight: '40px' }}
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassField(!showConfirmPassField)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer',
                        color: 'var(--gray-500)', display: 'flex', alignItems: 'center'
                      }}
                    >
                      {showConfirmPassField ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                {/* Requisitos de seguridad en tiempo real */}
                <div style={{
                  background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius)', padding: '12px'
                }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px' }}>
                    Requisitos de seguridad:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px' }}>
                    {[
                      { met: passHasMinLength, label: 'Mínimo 8 caracteres' },
                      { met: passHasLowercase, label: 'Al menos una minúscula' },
                      { met: passHasUppercase, label: 'Al menos una mayúscula' },
                      { met: passHasSpecialChar, label: 'Un carácter especial' },
                    ].map(({ met, label }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem', color: met ? '#16a34a' : 'var(--gray-400)' }}>
                        {met ? <FiCheckCircle style={{ flexShrink: 0 }} /> : <FiXCircle style={{ flexShrink: 0 }} />}
                        {label}
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem', color: passPasswordsMatch ? '#16a34a' : 'var(--gray-400)', gridColumn: 'span 2' }}>
                      {passPasswordsMatch ? <FiCheckCircle style={{ flexShrink: 0 }} /> : <FiXCircle style={{ flexShrink: 0 }} />}
                      Las contraseñas coinciden
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={handleClosePasswordModal} disabled={passSaving}>
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!passFormValid || passSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {passSaving ? 'Guardando...' : <><FiLock /> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
