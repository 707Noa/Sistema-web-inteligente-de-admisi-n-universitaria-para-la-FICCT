import { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'
import { changePassword } from '@/modules/p1-seguridad-administracion/auth/services/authService'
import { FiLock, FiCheckCircle, FiXCircle, FiEye, FiEyeOff, FiUser } from 'react-icons/fi'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, checkAuth } = useAuth()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')
  const [modalDismissed, setModalDismissed] = useState(
    sessionStorage.getItem('temp_hide_password_modal') === 'true'
  )

  const closeSidebar = () => setSidebarOpen(false)
  const toggleSidebar = () => setSidebarOpen(prev => !prev)

  const hasMinLength = newPassword.length >= 8
  const hasLowercase = /[a-z]/.test(newPassword)
  const hasUppercase = /[A-Z]/.test(newPassword)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_+\-=\[\]]/.test(newPassword)
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== ''

  const isFormValid = hasMinLength && hasLowercase && hasUppercase && hasSpecialChar && passwordsMatch

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault()
    setModalError('')
    setModalSuccess('')

    if (!isFormValid) {
      setModalError('La contraseña no cumple con todos los requisitos de seguridad.')
      return
    }

    setModalLoading(true)
    try {
      await changePassword({
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      })
      setModalSuccess('¡Contraseña actualizada con éxito!')
      setTimeout(async () => {
        await checkAuth()
      }, 1500)
    } catch (err) {
      setModalError(err.response?.data?.message || 'Error al cambiar la contraseña.')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDismissModal = () => {
    sessionStorage.setItem('temp_hide_password_modal', 'true')
    setModalDismissed(true)
  }

  const userDisplay = user?.codigo || user?.ci || user?.email || '—'

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />
      )}
      <div className="app-content">
        <Navbar onMenuToggle={toggleSidebar} isOpen={sidebarOpen} />
        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Modal de cambio de contraseña obligatorio al iniciar sesión */}
      {user && user.must_change_password && !modalDismissed && (
        <div className="modal-overlay" style={{ zIndex: 9997 }}>
          <div
            className="modal"
            style={{ maxWidth: '480px', width: '90%', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div style={{
              background: 'var(--primary-gradient)',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700
                }}>
                  <FiLock />
                  Actualizar datos de acceso
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
                  Por seguridad debes cambiar tu contraseña inicial.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismissModal}
                title="Cerrar"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  lineHeight: 1,
                  padding: 0,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* Usuario actual */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.83rem'
              }}>
                <FiUser style={{ color: '#2563eb', flexShrink: 0 }} />
                <div>
                  <span style={{ color: 'var(--gray-600)' }}>Usuario actual: </span>
                  <strong style={{ color: '#1e40af', fontFamily: 'monospace' }}>{userDisplay}</strong>
                </div>
              </div>

              {modalError && (
                <div style={{
                  display: 'flex', gap: '8px', alignItems: 'center',
                  background: 'var(--danger-light)', color: '#991b1b',
                  padding: '10px 12px', borderRadius: 'var(--radius)',
                  marginBottom: '12px', fontSize: '0.82rem'
                }}>
                  <FiXCircle style={{ flexShrink: 0 }} />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div style={{
                  display: 'flex', gap: '8px', alignItems: 'center',
                  background: 'var(--success-light)', color: 'var(--success)',
                  padding: '10px 12px', borderRadius: 'var(--radius)',
                  marginBottom: '12px', fontSize: '0.82rem'
                }}>
                  <FiCheckCircle style={{ flexShrink: 0 }} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChangeSubmit}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Nueva contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Ingresa tu nueva contraseña"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      disabled={modalLoading}
                      style={{ paddingRight: '40px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer',
                        color: 'var(--gray-500)', display: 'flex', alignItems: 'center'
                      }}
                    >
                      {showPass ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Confirmar contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Confirma tu nueva contraseña"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      disabled={modalLoading}
                      style={{ paddingRight: '40px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer',
                        color: 'var(--gray-500)', display: 'flex', alignItems: 'center'
                      }}
                    >
                      {showConfirmPass ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                {/* Requisitos de seguridad */}
                <div style={{
                  background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius)',
                  padding: '12px',
                  marginBottom: '20px'
                }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px' }}>
                    Requisitos de seguridad:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px' }}>
                    {[
                      { met: hasMinLength, label: 'Mínimo 8 caracteres' },
                      { met: hasLowercase, label: 'Al menos una minúscula' },
                      { met: hasUppercase, label: 'Al menos una mayúscula' },
                      { met: hasSpecialChar, label: 'Un carácter especial' },
                    ].map(({ met, label }) => (
                      <div
                        key={label}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          fontSize: '0.73rem',
                          color: met ? '#16a34a' : 'var(--gray-400)'
                        }}
                      >
                        {met
                          ? <FiCheckCircle style={{ flexShrink: 0 }} />
                          : <FiXCircle style={{ flexShrink: 0 }} />
                        }
                        {label}
                      </div>
                    ))}
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '0.73rem',
                        color: passwordsMatch ? '#16a34a' : 'var(--gray-400)',
                        gridColumn: 'span 2'
                      }}
                    >
                      {passwordsMatch
                        ? <FiCheckCircle style={{ flexShrink: 0 }} />
                        : <FiXCircle style={{ flexShrink: 0 }} />
                      }
                      Las contraseñas coinciden
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={handleDismissModal}
                    disabled={modalLoading}
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    disabled={!isFormValid || modalLoading}
                  >
                    {modalLoading ? 'Actualizando...' : <><FiLock /> Guardar</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
