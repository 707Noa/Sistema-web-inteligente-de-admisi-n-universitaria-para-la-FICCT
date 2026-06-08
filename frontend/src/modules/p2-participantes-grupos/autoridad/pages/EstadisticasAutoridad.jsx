import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getEstadisticas } from '../services/autoridadService'
import { FiLayers, FiUsers, FiBook, FiPieChart } from 'react-icons/fi'

export default function EstadisticasAutoridad() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getEstadisticas()
      .then(r => setData(r.data))
      .catch(e => setError(e.message || 'Error al cargar estadÃ­sticas.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><Loading /></Layout>

  // Helper for progress bar percentage
  const getPercent = (val, max) => {
    if (!max || max <= 0) return 0
    return Math.min(100, Math.round((val / max) * 100))
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>EstadÃ­sticas Generales</h1>
      </div>

      {error && (
        <div style={{ padding: 16, color: '#991b1b', background: '#fee2e2', borderRadius: 'var(--radius)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 24 }}>

        {/* Grupos por Carrera */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiLayers style={{ color: 'var(--primary)' }} /> Grupos por Carrera
          </h2>
          <div>
            {(data?.grupos_carrera || []).map((item, idx) => (
              <div key={idx} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                  <span>{item.carrera}</span>
                  <span style={{ fontWeight: 'bold' }}>{item.cantidad} grupo(s)</span>
                </div>
                <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${getPercent(item.cantidad, 10)}%`, height: '100%', background: 'var(--primary)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
            {(!data?.grupos_carrera || data.grupos_carrera.length === 0) && (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>Sin datos registradas</p>
            )}
          </div>
        </div>

        {/* Estudiantes por Carrera */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiUsers style={{ color: 'var(--success)' }} /> Estudiantes Inscritos por Carrera
          </h2>
          <div>
            {(data?.estudiantes_carrera || []).map((item, idx) => (
              <div key={idx} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                  <span>{item.carrera}</span>
                  <span style={{ fontWeight: 'bold' }}>{item.cantidad} estudiante(s)</span>
                </div>
                <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${getPercent(item.cantidad, 200)}%`, height: '100%', background: 'var(--success)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
            {(!data?.estudiantes_carrera || data.estudiantes_carrera.length === 0) && (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>Sin datos registradas</p>
            )}
          </div>
        </div>

        {/* Docentes por Materia */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiBook style={{ color: 'var(--info)' }} /> Docentes Activos por Materia
          </h2>
          <div>
            {(data?.docentes_materia || []).map((item, idx) => (
              <div key={idx} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                  <span>{item.materia}</span>
                  <span style={{ fontWeight: 'bold' }}>{item.cantidad} docente(s)</span>
                </div>
                <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${getPercent(item.cantidad, 5)}%`, height: '100%', background: 'var(--info)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
            {(!data?.docentes_materia || data.docentes_materia.length === 0) && (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>Sin datos registradas</p>
            )}
          </div>
        </div>

        {/* Cupos Ocupados por Grupo */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiPieChart style={{ color: '#8b5cf6' }} /> OcupaciÃ³n y Cupos por Grupo
          </h2>
          <div>
            {(data?.cupos_grupo || []).map((item, idx) => {
              const pct = getPercent(item.ocupacion, item.cupo_maximo)
              return (
                <div key={idx} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span>Grupo {item.grupo}</span>
                    <span style={{ fontWeight: 'bold' }}>{item.ocupacion} / {item.cupo_maximo} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--warning)' : '#8b5cf6',
                      borderRadius: 4
                    }} />
                  </div>
                </div>
              )
            })}
            {(!data?.cupos_grupo || data.cupos_grupo.length === 0) && (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>Sin datos registradas</p>
            )}
          </div>
        </div>

      </div>
    </Layout>
  )
}
