import React from 'react'
import Layout from '@/layouts/Layout'
import { useAuth } from '../context/AuthContext'
import { FiUser, FiMail, FiCreditCard, FiHash, FiShield, FiCheckCircle } from 'react-icons/fi'

const ROL_LABELS = {
  administrador: 'Administrador',
  docente:       'Docente',
  coordinador:   'Coordinador Académico',
  autoridad:     'Autoridad Académica',
  postulante:    'Postulante',
}

function calcRegistro(codigo, ci) {
  if (codigo) return codigo
  if (ci) return '2026' + String(ci).split('').reverse().join('')
  return '—'
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      padding: '16px 0',
      borderBottom: '1px solid var(--gray-100)',
    }}>
      <div style={{
        width: 38, height: 38, flexShrink: 0,
        background: 'var(--info-light)',
        color: 'var(--accent)',
        borderRadius: 'var(--radius)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.73rem', color: 'var(--gray-500)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3,
        }}>
          {label}
        </div>
        <div style={{ fontSize: '0.95rem', color: 'var(--gray-800)', fontWeight: 500, wordBreak: 'break-word' }}>
          {value || <span style={{ color: 'var(--gray-300)' }}>—</span>}
        </div>
      </div>
    </div>
  )
}

export default function Perfil() {
  const { user } = useAuth()

  if (!user) return null

  const registro = calcRegistro(user.codigo, user.ci)
  const rolLabel = ROL_LABELS[user.role] || user.role || '—'

  return (
    <Layout>
      <div className="page-header">
        <h1>Mi Perfil</h1>
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

        {/* Avatar + nombre */}
        <div className="card" style={{ padding: '24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 68, height: 68, flexShrink: 0,
            borderRadius: '50%',
            background: 'var(--primary-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.7rem', color: 'white', fontWeight: 700,
          }}>
            {(user.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>
              {user.name || '—'}
            </h2>
            <span className="badge badge-info" style={{ textTransform: 'none' }}>
              {rolLabel}
            </span>
          </div>
        </div>

        {/* Datos */}
        <div className="card" style={{ padding: '4px 24px 8px' }}>
          <InfoRow icon={<FiUser />}       label="Nombre Completo"    value={user.name} />
          <InfoRow icon={<FiCreditCard />} label="CI"                 value={user.ci} />
          <InfoRow icon={<FiMail />}       label="Correo Electrónico" value={user.email} />
          <InfoRow icon={<FiHash />}       label="Registro"           value={registro} />
          <InfoRow icon={<FiShield />}     label="Rol"                value={rolLabel} />
          <InfoRow icon={<FiCheckCircle />} label="Estado"             value={user.estado} />
        </div>

      </div>
    </Layout>
  )
}
