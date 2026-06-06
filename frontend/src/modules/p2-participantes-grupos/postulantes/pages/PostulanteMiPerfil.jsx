import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getPostulantePerfil } from '../services/postulanteService'

const TRAMITE_ESTILO = {
  PREINSCRITO:    { bg: '#fff3e0', text: '#e65100', label: 'Preinscrito' },
  INSCRITO:       { bg: '#e8f5e9', text: '#2e7d32', label: 'Inscrito' },
  PENDIENTE_PAGO: { bg: '#fce4ec', text: '#c62828', label: 'Pendiente de pago' },
}

export default function PostulanteMiPerfil() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

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
      </div>
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
