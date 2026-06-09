import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getAlertas } from '../services/autoridadService'
import { FiAlertTriangle, FiAlertCircle, FiInfo, FiRefreshCw, FiCheckCircle } from 'react-icons/fi'

const NIVEL_CONFIG = {
  danger: {
    bg: '#fef2f2',
    border: '#fca5a5',
    text: '#991b1b',
    icon: <FiAlertCircle />,
    badgeBg: '#fee2e2',
    label: 'Crítico',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fcd34d',
    text: '#92400e',
    icon: <FiAlertTriangle />,
    badgeBg: '#fef3c7',
    label: 'Advertencia',
  },
  info: {
    bg: '#eff6ff',
    border: '#93c5fd',
    text: '#1e40af',
    icon: <FiInfo />,
    badgeBg: '#dbeafe',
    label: 'Información',
  },
}

const TIPO_LABELS = {
  sin_docente: 'Sin Docente',
  sin_aula: 'Sin Aula',
  sin_horario: 'Sin Horario',
  cupo_lleno: 'Cupo Lleno',
  baja_ocupacion: 'Baja Ocupación',
  postulantes_sin_grupo: 'Postulantes sin Grupo',
}

export default function AlertasAutoridad() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [filtroNivel, setFiltroNivel] = useState('todos')

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)
      const res = await getAlertas()
      setData(res.data)
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Error al cargar alertas.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData(false) }, [fetchData])

  if (loading) return <Layout><Loading /></Layout>

  const alertas = data?.alertas || []
  const resumen = data?.resumen || { danger: 0, warning: 0, info: 0, total: 0 }

  const filtered = filtroNivel === 'todos' ? alertas : alertas.filter(a => a.nivel === filtroNivel)

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Alertas Académicas</h1>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>
            Supervisión y control — Autoridad Académica
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 130 }}
        >
          <FiRefreshCw style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div style={{ padding: 16, color: '#991b1b', background: '#fee2e2', borderRadius: 'var(--radius)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Resumen cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { nivel: 'todos', label: 'Total alertas', value: resumen.total, bg: '#f8fafc', border: 'var(--gray-200)', color: 'var(--gray-700)', icon: <FiAlertTriangle /> },
          { nivel: 'danger', label: 'Críticas', value: resumen.danger, bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: <FiAlertCircle /> },
          { nivel: 'warning', label: 'Advertencias', value: resumen.warning, bg: '#fffbeb', border: '#fcd34d', color: '#92400e', icon: <FiAlertTriangle /> },
          { nivel: 'info', label: 'Informativas', value: resumen.info, bg: '#eff6ff', border: '#93c5fd', color: '#1e40af', icon: <FiInfo /> },
        ].map(card => (
          <button
            key={card.nivel}
            onClick={() => setFiltroNivel(card.nivel)}
            style={{
              background: card.bg,
              border: `2px solid ${filtroNivel === card.nivel ? card.color : card.border}`,
              borderRadius: 10,
              padding: '16px 18px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: card.color, fontSize: '1.1rem' }}>
              {card.icon}
              <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{card.value}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: card.color, fontWeight: 500 }}>{card.label}</div>
          </button>
        ))}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 10, padding: '32px 24px',
          textAlign: 'center', color: '#166534',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <FiCheckCircle style={{ fontSize: '2rem' }} />
          <div style={{ fontWeight: 600, fontSize: '1rem' }}>
            {filtroNivel === 'todos' ? 'Sin alertas activas' : `Sin alertas de tipo "${NIVEL_CONFIG[filtroNivel]?.label}"`}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#166534' }}>Todo el sistema académico está en orden.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((alerta, idx) => {
            const cfg = NIVEL_CONFIG[alerta.nivel] || NIVEL_CONFIG.info
            return (
              <div key={idx} style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderLeft: `4px solid ${cfg.border}`,
                borderRadius: 8,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}>
                <span style={{ color: cfg.text, fontSize: '1.1rem', marginTop: 1, flexShrink: 0 }}>
                  {cfg.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px',
                      background: cfg.badgeBg, color: cfg.text, borderRadius: 10,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {TIPO_LABELS[alerta.tipo] ?? alerta.tipo}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: cfg.text, fontWeight: 500 }}>
                    {alerta.mensaje}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  )
}
