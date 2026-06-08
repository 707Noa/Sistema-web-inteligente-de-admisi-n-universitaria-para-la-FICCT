import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { changePassword } from '../services/authService'
import { FiLock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

export default function ChangePassword() {
  const { user, checkAuth } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ new_password: '', new_password_confirmation: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectPath = {
    postulante:    '/postulante/inicio',
    docente:       '/docente/grupos',
    coordinador:   '/coordinador/dashboard',
    autoridad:     '/autoridad/dashboard',
    administrador: '/admin/dashboard',
  }[user?.role] || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.new_password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (form.new_password !== form.new_password_confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await changePassword(form)
      await checkAuth()
      navigate(redirectPath, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>🎓</span>
          <h2>Portal de Cursos Preuniversitarios — CUP-FICCT</h2>
        </div>
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-card-header">
            <h1>Cambio de contraseña</h1>
            <p>Por seguridad debes cambiar tu contraseña inicial</p>
          </div>

          <div className="login-card-body">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--info-light)', color: '#1e40af', padding: '12px 16px', borderRadius: 'var(--radius)', marginBottom: 20, fontSize: '0.875rem' }}>
              <FiAlertCircle style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Esta es tu primera sesión. Debes establecer una nueva contraseña antes de continuar. La contraseña debe tener al menos 6 caracteres.</span>
            </div>

            {error && (
              <div className="login-alert">
                <FiAlertCircle /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nueva contraseña</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={form.new_password}
                  onChange={e => setForm({ ...form, new_password: e.target.value })}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirmar nueva contraseña</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Repite la nueva contraseña"
                  value={form.new_password_confirmation}
                  onChange={e => setForm({ ...form, new_password_confirmation: e.target.value })}
                  required
                />
              </div>

              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
                {loading ? 'Guardando...' : <><FiCheckCircle /> Guardar y continuar</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
