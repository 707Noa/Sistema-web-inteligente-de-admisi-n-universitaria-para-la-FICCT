import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getDashboard } from '../services/autoridadService'
import { FiUsers, FiGrid, FiBook, FiClock, FiLayers, FiCheckSquare } from 'react-icons/fi'

export default function DashboardAutoridad() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data))
      .catch(e => setError(e.message || 'Error al cargar indicadores.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><Loading /></Layout>

  const stats = [
    { label: 'Total Postulantes Inscritos', value: data?.total_inscritos, icon: <FiUsers />, color: 'var(--primary)' },
    { label: 'Total Grupos Habilitados', value: data?.total_grupos, icon: <FiGrid />, color: 'var(--success)' },
    { label: 'Total Docentes Activos', value: data?.total_docentes, icon: <FiBook />, color: 'var(--info)' },
    { label: 'Total Horarios Registrados', value: data?.total_horarios, icon: <FiClock />, color: 'var(--warning)' },
    { label: 'Carreras con Grupos Activos', value: data?.total_carreras, icon: <FiLayers />, color: 'var(--accent)' },
    { label: 'Estudiantes Asignados a Grupos', value: data?.total_asignados, icon: <FiCheckSquare />, color: '#8b5cf6' },
  ]

  return (
    <Layout>
      <div className="page-header">
        <h1>Dashboard Académico</h1>
      </div>

      {error && (
        <div style={{ padding: 16, color: '#991b1b', background: '#fee2e2', borderRadius: 'var(--radius)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {stats.map((s, idx) => (
          <div key={idx} className="card" style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 'var(--radius)',
              background: 'var(--gray-50)', color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', border: `1.5px solid ${s.color}22`
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1 }}>
                {s.value ?? 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 4, fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
