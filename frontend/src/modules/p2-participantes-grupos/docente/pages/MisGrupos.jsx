import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getMisGrupos } from '../services/docenteService'
import { FiGrid, FiClock, FiMapPin, FiLayers } from 'react-icons/fi'

export default function MisGrupos() {
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMisGrupos()
      .then(r => setGrupos(r.data || []))
      .catch(e => setError(e.message || 'Error al cargar grupos.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Mis Grupos Asignados</h1>
      </div>

      {error && (
        <div style={{ padding: 16, color: '#991b1b', background: '#fee2e2', borderRadius: 'var(--radius)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {grupos.map(g => (
          <div key={g.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', borderTop: '4px solid var(--primary)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{g.codigo}</span>
                <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{g.turno}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', color: 'var(--gray-600)', marginBottom: 8 }}>
                <FiLayers /> <strong>Carrera:</strong> {g.carrera || 'Sin carrera'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', color: 'var(--gray-600)', marginBottom: 8 }}>
                <FiMapPin /> <strong>Aula:</strong> {g.aula || 'Sin aula'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', color: 'var(--gray-600)', marginBottom: 12 }}>
                <strong>Estudiantes asignados:</strong> {g.ocupacion} / {g.cupo_maximo}
              </div>

              {g.materias && g.materias.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>Materias:</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {g.materias.map((m, idx) => (
                      <span key={idx} className="badge badge-success" style={{ textTransform: 'none', fontSize: '0.75rem' }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 12, marginTop: 12 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FiClock /> Horarios de clases:
              </span>
              {g.horarios && g.horarios.length > 0 ? (
                <div style={{ marginTop: 6 }}>
                  {g.horarios.map((h, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--gray-700)', padding: '2px 0' }}>
                      <span style={{ textTransform: 'capitalize' }}>{h.dia}:</span>
                      <span style={{ fontWeight: 600 }}>{h.hora_inicio} - {h.hora_fin}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', margin: 0 }}>Sin horarios registrados</p>
              )}
            </div>
          </div>
        ))}

        {grupos.length === 0 && (
          <div className="card" style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
            No tienes grupos asignados actualmente.
          </div>
        )}
      </div>
    </Layout>
  )
}
