import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getPostulantePerfil } from '../services/postulanteService'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'
import { changePassword } from '@/modules/p1-seguridad-administracion/auth/services/authService'
import { FiAlertCircle } from 'react-icons/fi'

const TRAMITE_ESTILO = {
  PREINSCRITO:    { bg: '#fff3e0', text: '#e65100', label: 'Preinscrito' },
  INSCRITO:       { bg: '#e8f5e9', text: '#2e7d32', label: 'Inscrito' },
  PENDIENTE_PAGO: { bg: '#fce4ec', text: '#c62828', label: 'Pendiente de pago' },
}

export default function PostulanteMiPerfil() {
  const { user, checkAuth } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [formPass, setFormPass] = useState({ new_password: '', new_password_confirmation: '' })
  const [passError, setPassError] = useState('')
  const [passSaving, setPassSaving] = useState(false)

  useEffect(() => {
    getPostulantePerfil()
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><Loading /></Layout>

  if (error || !data) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)', fontSize: '0.95rem' }}>
          No se pudo cargar el perfil. Intente nuevamente.
        </div>
      </Layout>
    )
  }

  const nombreCompleto = `${data.nombres ?? ''} ${data.apellidos ?? ''}`.trim()
  const est = TRAMITE_ESTILO[data.estado_tramite] || { bg: '#f0f0f0', text: '#555', label: data.estado_tramite || '—' }

  // Mostrar segunda carrera solo si difiere de la primera
  const segundaCarrera = data.carrera && data.carrera !== data.carrera_postulada
    ? data.carrera
    : null

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPassError('')
    if (formPass.new_password.length < 8) {
      setPassError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (formPass.new_password !== formPass.new_password_confirmation) {
      setPassError('Las contraseñas de confirmación no coinciden.')
      return
    }

    setPassSaving(true)
    try {
      await changePassword(formPass)
      alert('Contraseña actualizada correctamente.')
      setShowPasswordModal(false)
      setFormPass({ new_password: '', new_password_confirmation: '' })
      await checkAuth()
    } catch (err) {
      setPassError(err.response?.data?.message || 'Error al cambiar la contraseña.')
    } finally {
      setPassSaving(false)
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Mi Perfil</h1>
      </div>

      <div className="card" style={{ maxWidth: 720, padding: '24px 28px' }}>
        <SectionTitle>Datos Personales</SectionTitle>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '16px 32px',
        }}>
          <Campo label="Nombre completo"   valor={nombreCompleto || null} />
          <Campo label="CI"                valor={data.ci} />
          <Campo label="Correo electrónico" valor={data.email} />
          <Campo label="Teléfono"          valor={data.celular} />
          <Campo label="Registro"          valor={data.codigo_usuario} mono />
          <Campo label="Ciudad"            valor={data.ciudad} />
          <Campo label="Primera carrera"   valor={data.carrera_postulada} />
          <Campo label="Segunda carrera"   valor={segundaCarrera} />
          <Campo label="Unidad educativa"  valor={data.colegio_procedencia} />

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: 5 }}>
              Estado
            </div>
            <span style={{
              background: est.bg, color: est.text,
              padding: '3px 14px', borderRadius: 20,
              fontSize: '0.8rem', fontWeight: 600,
            }}>
              {est.label}
            </span>
          </div>
        </div>

        {/* Botón obligatorio si must_change_password es true */}
        {user?.must_change_password && (
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--gray-100)', paddingTop: '20px' }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowPasswordModal(true)}
              style={{
                backgroundColor: '#f59e0b',
                borderColor: '#f59e0b',
                color: '#fff',
                fontWeight: 'bold',
                padding: '10px 24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
              }}
            >
              ⚠️ Actualizar datos (Obligatorio)
            </button>
          </div>
        )}
      </div>

      {/* Modal Cambio de Contraseña */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Actualizar datos de acceso</span>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-body">
                <div style={{
                  background: 'var(--warning-light, #fffbeb)',
                  border: '1px solid #fef3c7',
                  color: '#b45309',
                  padding: '14px',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  marginBottom: '16px'
                }}>
                  <strong>Por seguridad, debes actualizar tus datos de acceso.</strong>
                  <br />
                  A partir de ahora, tu usuario será tu número de registro:
                  <div style={{ fontWeight: 'bold', margin: '6px 0', fontFamily: 'monospace', fontSize: '1rem', color: '#78350f' }}>
                    Usuario: {data?.codigo_usuario || '—'}
                  </div>
                  Luego cambia tu contraseña inicial.
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', marginBottom: '8px', fontWeight: 600 }}>
                  Requisitos para la nueva contraseña:
                </p>
                <ul style={{ fontSize: '0.78rem', color: 'var(--gray-500)', paddingLeft: '20px', margin: '0 0 16px', lineHeight: 1.5 }}>
                  <li>Mínimo 8 caracteres de longitud</li>
                  <li>Al menos una letra minúscula</li>
                  <li>Al menos una letra mayúscula</li>
                  <li>Al menos un carácter especial (ej: @, $, !, %, *, #, -, _)</li>
                </ul>

                {passError && (
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    background: 'var(--danger-light)', color: '#991b1b',
                    padding: '10px 14px', borderRadius: 'var(--radius)',
                    marginBottom: 16, fontSize: '0.875rem',
                  }}>
                    <FiAlertCircle style={{ flexShrink: 0 }} /> {passError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nueva contraseña</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Mínimo 8 caracteres"
                    value={formPass.new_password}
                    onChange={e => setFormPass({ ...formPass, new_password: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Repita la nueva contraseña"
                    value={formPass.new_password_confirmation}
                    onChange={e => setFormPass({ ...formPass, new_password_confirmation: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPasswordModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={passSaving} style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}>
                  {passSaving ? 'Guardando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: '0.9rem', fontWeight: 700,
      color: '#1565c0', marginBottom: 20,
      borderBottom: '2px solid #e3f2fd', paddingBottom: 8,
      textTransform: 'uppercase', letterSpacing: '0.3px',
    }}>
      {children}
    </h2>
  )
}

function Campo({ label, valor, mono }) {
  const vacio = valor === null || valor === undefined || valor === ''
  return (
    <div>
      <div style={{ fontSize: '0.77rem', color: 'var(--gray-500)', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{
        fontWeight: 500,
        color: vacio ? 'var(--gray-400)' : 'var(--gray-800)',
        fontFamily: mono ? 'monospace' : undefined,
        fontSize: mono ? '0.93rem' : '0.88rem',
      }}>
        {vacio ? '—' : valor}
      </div>
    </div>
  )
}
