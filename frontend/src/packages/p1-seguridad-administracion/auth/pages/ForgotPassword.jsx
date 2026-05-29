import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { forgotPassword } from '../services/authService'
import { FiArrowLeft, FiMail, FiCheckCircle } from 'react-icons/fi'

export default function ForgotPassword() {
  const { perfil } = useParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Ingresa tu correo electrónico.'); return }
    setLoading(true)
    try {
      await forgotPassword({ email })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar correo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-topbar">
        <Link to={`/${perfil}/login`} style={{ color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiArrowLeft /> Volver al login
        </Link>
        <h2>Recuperar Contraseña</h2>
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-card-header">
            <h1>Recuperar contraseña</h1>
            <p>Te enviaremos un enlace a tu correo</p>
          </div>

          <div className="login-card-body">
            {sent ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <FiCheckCircle size={48} color="var(--success)" />
                <h3 style={{ margin: '16px 0 8px' }}>Correo enviado correctamente</h3>
                <p style={{ color: 'var(--gray-500)' }}>Revisa tu bandeja de entrada y sigue las instrucciones.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && <div className="login-alert">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Correo electrónico</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
                  {loading ? 'Enviando...' : <><FiMail /> Enviar enlace</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
