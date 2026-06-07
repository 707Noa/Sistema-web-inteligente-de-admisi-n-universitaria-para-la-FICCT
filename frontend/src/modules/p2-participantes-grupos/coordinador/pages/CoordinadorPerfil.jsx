import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getPerfil } from '../services/coordinadorService'
import { FiUser, FiMail, FiCreditCard, FiHash, FiShield, FiCheckCircle } from 'react-icons/fi'

const ROL_LABELS = {
  coordinador: 'Coordinador Académico',
  administrador: 'Administrador',
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

export default function CoordinadorPerfil() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await getPerfil()
      setProfile(res.data)
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al cargar la información de perfil.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Layout><Loading /></Layout>
  if (errorMsg) return <Layout><div style={{ padding: 20, color: 'var(--danger)', fontWeight: 600 }}>{errorMsg}</div></Layout>
  if (!profile) return <Layout><p>Sin perfil disponible</p></Layout>

  const rolLabel = ROL_LABELS[profile.role] || profile.role || 'Coordinador Académico'

  return (
    <Layout>
      <div className="page-header">
        <h1>Mi Perfil</h1>
        <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>
          Datos de la cuenta autenticada
        </div>
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
            {(profile.name || 'C')[0].toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>
              {profile.name || '—'}
            </h2>
            <span className="badge badge-info" style={{ textTransform: 'none' }}>
              {rolLabel}
            </span>
          </div>
        </div>

        {/* Datos */}
        <div className="card" style={{ padding: '4px 24px 8px' }}>
          <InfoRow icon={<FiUser />}       label="Nombre Completo"    value={profile.name} />
          <InfoRow icon={<FiCreditCard />} label="CI"                 value={profile.ci} />
          <InfoRow icon={<FiMail />}       label="Correo Electrónico" value={profile.email} />
          <InfoRow icon={<FiHash />}       label="Código de Registro" value={profile.codigo} />
          <InfoRow icon={<FiShield />}     label="Rol de Usuario"     value={rolLabel} />
          <InfoRow icon={<FiCheckCircle />} label="Estado de Cuenta"  value={profile.estado} />
        </div>

      </div>
    </Layout>
  )
}
