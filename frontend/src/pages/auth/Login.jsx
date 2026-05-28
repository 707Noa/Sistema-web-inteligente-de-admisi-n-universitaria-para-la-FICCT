import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FiArrowLeft, FiLogIn, FiAlertCircle } from 'react-icons/fi'

const perfilLabels = {
  postulante: 'Postulantes',
  docente: 'Docentes',
  coordinador: 'Coordinador Académico',
  autoridad: 'Autoridad Académica',
  administrador: 'Administrador',
}

export default function Login() {
  const { perfil } = useParams()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ login: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.login || !form.password) {
      setError('Todos los campos son obligatorios.')
      return
    }

    setLoading(true)
    try {
      const { redirect } = await login({ ...form, perfil })
      navigate(redirect)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-topbar">
        <Link to="/" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiArrowLeft /> Volver
        </Link>
        <h2>Portal de Cursos Preuniversitarios</h2>
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-card-header">
            <h1>Inicio de sesión</h1>
            <p>{perfilLabels[perfil] || perfil}</p>
          </div>

          <div className="login-card-body">
            {error && (
              <div className="login-alert">
                <FiAlertCircle /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">CI / Código / Correo electrónico</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ingresa tu CI, código o correo"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
                {loading ? 'Ingresando...' : <><FiLogIn /> Iniciar Sesión</>}
              </button>
            </form>
          </div>

          <div className="login-card-footer">
            <Link to={`/${perfil}/forgot-password`}>¿Olvidaste tu contraseña?</Link>
            <div className="login-divider">o</div>
            <Link to="/preinscripcion">📋 Formulario de Preinscripción</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
