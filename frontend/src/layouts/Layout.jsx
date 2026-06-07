import React, { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'
import { changePassword } from '@/modules/p1-seguridad-administracion/auth/services/authService'
import { FiLock, FiCheckCircle, FiXCircle, FiAlertTriangle, FiEye, FiEyeOff } from 'react-icons/fi'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, checkAuth } = useAuth()

  // Password change modal states
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

  // Real-time validations
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
      setModalError('La contraseÃ±a no cumple con todos los requisitos de seguridad.')
      return
    }

    setModalLoading(true)
    try {
      await changePassword({
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      })
      setModalSuccess('Â¡ContraseÃ±a actualizada con Ã©xito!')
      // Refresh user auth state after a brief delay
      setTimeout(async () => {
        await checkAuth()
      }, 1500)
    } catch (err) {
      setModalError(err.response?.data?.message || 'Error al cambiar la contraseÃ±a.')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDismissModal = () => {
    sessionStorage.setItem('temp_hide_password_modal', 'true')
    setModalDismissed(true)
  }

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

      {/* Mandatory Password Change Modal */}
      {user && user.must_change_password && !modalDismissed && (
        <div className="mandatory-modal-overlay">
          <div className="mandatory-modal-card" style={{ maxWidth: '440px' }}>
            <div className="mandatory-modal-header" style={{ padding: '18px 24px' }}>
              <button
                type="button"
                onClick={handleDismissModal}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  opacity: 0.8,
                  transition: 'opacity 0.2s',
                  lineHeight: 1,
                  padding: 0
                }}
                onMouseEnter={(e) => e.target.style.opacity = 1}
                onMouseLeave={(e) => e.target.style.opacity = 0.8}
              >
                &times;
              </button>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Actualizar datos de acceso</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>Por seguridad debes cambiar tu contraseÃ±a inicial</p>
            </div>

            <div className="mandatory-modal-body" style={{ padding: '20px' }}>
              <div className="info-alert-box" style={{ padding: '12px 14px', marginBottom: '16px', fontSize: '0.82rem', gap: '4px' }}>
                <span className="info-alert-title" style={{ fontSize: '0.85rem' }}>Â¡Importante!</span>
                <p style={{ margin: 0 }}>Tu nuevo usuario para iniciar sesiÃ³n serÃ¡ tu cÃ³digo de usuario:</p>
                <p style={{ fontWeight: 'bold', margin: '4px 0', fontSize: '0.92rem', color: 'var(--primary-dark)' }}>
                  Usuario: {user?.codigo}
                </p>
                <p style={{ margin: 0, opacity: 0.9 }}>
                  El acceso mediante tu correo electrÃ³nico inicial ya no estarÃ¡ disponible una vez que realices esta actualizaciÃ³n.
                </p>
              </div>

              {modalError && (
                <div className="login-alert" style={{ marginBottom: '16px', background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <FiXCircle style={{ flexShrink: 0, fontSize: '1rem' }} />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="login-alert" style={{ marginBottom: '16px', background: 'var(--success-light)', color: 'var(--success)', padding: '10px 12px', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <FiCheckCircle style={{ flexShrink: 0, fontSize: '1rem' }} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChangeSubmit}>
                <div className="form-group" style={{ position: 'relative', marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Nueva ContraseÃ±a</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Ingresa tu nueva contraseÃ±a"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={modalLoading}
                      style={{ paddingRight: '40px', fontSize: '0.85rem', padding: '8px 12px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', display: 'flex', alignItems: 'center' }}
                    >
                      {showPass ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ position: 'relative', marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Confirmar ContraseÃ±a</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Confirma tu nueva contraseÃ±a"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={modalLoading}
                      style={{ paddingRight: '40px', fontSize: '0.85rem', padding: '8px 12px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', display: 'flex', alignItems: 'center' }}
                    >
                      {showConfirmPass ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="password-requirements" style={{ padding: '10px 12px', marginTop: '12px' }}>
                  <div className="requirements-title" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>Requisitos de seguridad:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
                    <div className={`requirement-item ${hasMinLength ? 'met' : 'unmet'}`} style={{ fontSize: '0.72rem', marginBottom: 0 }}>
                      <span className="requirement-icon" style={{ fontSize: '0.8rem' }}>
                        {hasMinLength ? <FiCheckCircle /> : <FiXCircle />}
                      </span>
                      <span>MÃ­nimo 8 caracteres</span>
                    </div>

                    <div className={`requirement-item ${hasLowercase ? 'met' : 'unmet'}`} style={{ fontSize: '0.72rem', marginBottom: 0 }}>
                      <span className="requirement-icon" style={{ fontSize: '0.8rem' }}>
                        {hasLowercase ? <FiCheckCircle /> : <FiXCircle />}
                      </span>
                      <span>Al menos una minÃºscula</span>
                    </div>

                    <div className={`requirement-item ${hasUppercase ? 'met' : 'unmet'}`} style={{ fontSize: '0.72rem', marginBottom: 0 }}>
                      <span className="requirement-icon" style={{ fontSize: '0.8rem' }}>
                        {hasUppercase ? <FiCheckCircle /> : <FiXCircle />}
                      </span>
                      <span>Al menos una mayÃºscula</span>
                    </div>

                    <div className={`requirement-item ${hasSpecialChar ? 'met' : 'unmet'}`} style={{ fontSize: '0.72rem', marginBottom: 0 }}>
                      <span className="requirement-icon" style={{ fontSize: '0.8rem' }}>
                        {hasSpecialChar ? <FiCheckCircle /> : <FiXCircle />}
                      </span>
                      <span>Un carÃ¡cter especial</span>
                    </div>

                    <div className={`requirement-item ${passwordsMatch ? 'met' : 'unmet'}`} style={{ fontSize: '0.72rem', marginBottom: 0, gridColumn: 'span 2' }}>
                      <span className="requirement-icon" style={{ fontSize: '0.8rem' }}>
                        {passwordsMatch ? <FiCheckCircle /> : <FiXCircle />}
                      </span>
                      <span>Las contraseÃ±as coinciden</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '8px 16px', fontSize: '0.85rem' }}
                    onClick={handleDismissModal}
                    disabled={modalLoading}
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 2, padding: '8px 16px', fontSize: '0.85rem' }}
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
