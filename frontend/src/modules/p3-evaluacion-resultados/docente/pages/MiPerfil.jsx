import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getDocentePerfil } from '../services/docenteAcademicoService'
import { FiUser, FiMail, FiCreditCard, FiHash, FiShield, FiBook } from 'react-icons/fi'

function InfoRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '16px 0', borderBottom: '1px solid var(--gray-100)',
    }}>
      <div style={{
        width: 38, height: 38, flexShrink: 0,
        background: 'var(--info-light)', color: 'var(--accent)',
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

export default function MiPerfil() {
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocentePerfil()
      .then(r => setPerfil(r.data))
      .catch(() => setPerfil(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><Loading /></Layout>

  if (!perfil) return (
    <Layout>
      <div className="page-header"><h1>Mi Perfil</h1></div>
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
        No se pudo cargar el perfil.
      </div>
    </Layout>
  )

  const registro = perfil.codigo || (perfil.ci ? '2026' + String(perfil.ci).split('').reverse().join('') : '—')

  return (
    <Layout>
      <div className="page-header"><h1>Mi Perfil</h1></div>

      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        {/* Avatar + nombre */}
        <div className="card" style={{ padding: '24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 68, height: 68, flexShrink: 0,
            borderRadius: '50%', background: 'var(--primary-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.7rem', color: 'white', fontWeight: 700,
          }}>
            {(perfil.name || 'D')[0].toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>
              {perfil.name || '—'}
            </h2>
            <span className="badge badge-info" style={{ textTransform: 'none' }}>Docente</span>
          </div>
        </div>

        {/* Datos */}
        <div className="card" style={{ padding: '4px 24px 8px' }}>
          <InfoRow icon={<FiUser />}       label="Nombre Completo"    value={perfil.name} />
          <InfoRow icon={<FiCreditCard />} label="CI"                 value={perfil.ci} />
          <InfoRow icon={<FiMail />}       label="Correo Electrónico" value={perfil.email} />
          <InfoRow icon={<FiHash />}       label="Registro"           value={registro} />
          <InfoRow icon={<FiShield />}     label="Rol"                value="Docente" />
          <InfoRow
            icon={<FiBook />}
            label="Materia Asignada"
            value={
              perfil.materia
                ? <span className="badge badge-info" style={{ textTransform: 'none' }}>{perfil.materia}</span>
                : <span style={{ color: 'var(--gray-400)' }}>Sin materia asignada</span>
            }
          />
        </div>
      </div>
    </Layout>
  )
}
