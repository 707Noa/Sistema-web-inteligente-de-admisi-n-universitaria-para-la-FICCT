import React, { useState } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { resetPassword } from '../../services/authService'
import { FiLock, FiCheckCircle } from 'react-icons/fi'

export default function ResetPassword() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = searchParams.get('email') || ''

  const [form, setForm] = useState({ password: '', password_confirmation: '' })
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.password_confirmation) { setError('Las contraseñas no coinciden.'); return }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    setLoading(true)
    try {
      await resetPassword({ email, token, ...form })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al restablecer contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-topbar">
        <h2 style={{ marginLeft: 12 }}>Restablecer Contraseña</h2>
      </div>
      <div className="login-container">
        <div className="login-card">
          <div className="login-card-header">
            <h1>Nueva contraseña</h1>
            <p>{email}</p>
          </div>
          <div className="login-card-body">
            {done ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <FiCheckCircle size={48} color="var(--success)" />
                <h3 style={{ margin: '16px 0 8px' }}>Contraseña actualizada correctamente</h3>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
                  Ir al inicio
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && <div className="login-alert">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Nueva contraseña</label>
                  <input className="form-input" type="password" placeholder="Mínimo 8 caracteres"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar contraseña</label>
                  <input className="form-input" type="password" placeholder="Repite la contraseña"
                    value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
                </div>
                <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : <><FiLock /> Actualizar contraseña</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
