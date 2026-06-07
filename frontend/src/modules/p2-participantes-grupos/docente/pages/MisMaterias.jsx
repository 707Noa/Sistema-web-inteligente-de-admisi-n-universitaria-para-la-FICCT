import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getMisMaterias } from '../services/docenteService'
import { FiBook, FiInfo } from 'react-icons/fi'

export default function MisMaterias() {
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMisMaterias()
      .then(r => setMaterias(r.data || []))
      .catch(e => setError(e.message || 'Error al cargar materias.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Mis Materias</h1>
      </div>

      {error && (
        <div style={{ padding: 16, color: '#991b1b', background: '#fee2e2', borderRadius: 'var(--radius)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
        {materias.map(m => (
          <div key={m.id} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 'var(--radius)',
              background: 'var(--primary-gradient)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem'
            }}>
              <FiBook />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>
                {m.nombre}
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Código: {m.codigo}</span>
                <span className={`badge ${m.estado === 'activo' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                  {m.estado}
                </span>
              </div>
            </div>
          </div>
        ))}

        {materias.length === 0 && (
          <div className="card" style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
            No tienes materias asignadas actualmente.
          </div>
        )}
      </div>
    </Layout>
  )
}
