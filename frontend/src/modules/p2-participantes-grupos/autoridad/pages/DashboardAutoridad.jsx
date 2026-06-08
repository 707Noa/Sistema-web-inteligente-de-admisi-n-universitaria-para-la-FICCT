import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getDashboard } from '../services/autoridadService'
import {
  FiUsers, FiGrid, FiBook, FiClock, FiLayers, FiCheckSquare,
  FiAward, FiXCircle, FiUserPlus, FiRefreshCw, FiAlertOctagon,
  FiBarChart2, FiList
} from 'react-icons/fi'
import { Link } from 'react-router-dom'

export default function DashboardAutoridad() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)
      const res = await getDashboard()
      setData(res.data)
    } catch (e) {
      console.error('Error al cargar dashboard autoridad:', e)
      setError(e.response?.data?.message || e.message || 'Error al cargar indicadores.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData(false)
  }, [fetchData])

  if (loading) return <Layout><Loading /></Layout>

  if (error && !data) {
    return (
      <Layout>
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--danger)' }}>
          <FiAlertOctagon style={{ fontSize: '2.5rem', marginBottom: 12 }} />
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Error al cargar el Dashboard</h2>
          <p style={{ fontSize: '0.9rem', margin: '0 0 16px 0', color: 'var(--gray-600)' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => fetchData(false)}>
            <FiRefreshCw style={{ marginRight: 6 }} /> Reintentar
          </button>
        </div>
      </Layout>
    )
  }

  const stats = [
    { label: 'Total Postulantes Inscritos', value: data?.total_inscritos, icon: <FiUsers />, color: 'blue' },
    { label: 'Total Grupos Habilitados', value: data?.total_grupos, icon: <FiGrid />, color: 'green' },
    { label: 'Total Docentes Activos', value: data?.total_docentes, icon: <FiBook />, color: 'info' },
    { label: 'Total Horarios Registrados', value: data?.total_horarios, icon: <FiClock />, color: 'yellow' },
    { label: 'Carreras con Grupos Activos', value: data?.total_carreras, icon: <FiLayers />, color: 'purple' },
    { label: 'Estudiantes Asignados a Grupos', value: data?.total_asignados, icon: <FiCheckSquare />, color: 'green' },
    { label: 'Aprobados', value: data?.total_aprobados, icon: <FiAward />, color: 'green' },
    { label: 'Reprobados', value: data?.total_reprobados, icon: <FiXCircle />, color: 'red' },
    { label: 'Admitidos', value: data?.total_admitidos, icon: <FiUserPlus />, color: 'purple' },
    { label: 'Asignaciones Académicas', value: data?.total_asignaciones, icon: <FiList />, color: 'info' },
  ]

  const postulantesPorCarrera = data?.postulantes_por_carrera || []
  const gruposRecientes = data?.grupos_recientes || []

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Dashboard Académico</h1>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>
            Panel de consulta — Autoridad Académica
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 130 }}
        >
          <FiRefreshCw style={{
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
          }} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Error banner with stale data */}
      {error && data && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5',
          padding: '10px 16px', borderRadius: 'var(--radius)', color: '#991b1b',
          fontSize: '0.875rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <FiAlertOctagon />
          <span>{error} — Mostrando datos de la última carga exitosa.</span>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="stat-grid">
        {stats.map((s, idx) => (
          <div key={idx} className="stat-card" style={{ animationDelay: `${idx * 0.04}s` }}>
            <div className={`stat-card-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-card-info">
              <h3>{s.value ?? 0}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column tables */}
      <div className="chart-grid" style={{ marginTop: 24 }}>
        {/* Postulantes por Carrera */}
        <div className="chart-card">
          <div className="chart-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><FiBarChart2 style={{ marginRight: 6 }} />Postulantes por Carrera</span>
            <Link to="/autoridad/estadisticas" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Ver estadísticas</Link>
          </div>
          <div className="table-container">
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Carrera</th>
                  <th style={{ textAlign: 'right' }}>Total Postulantes</th>
                </tr>
              </thead>
              <tbody>
                {postulantesPorCarrera.map((c, idx) => (
                  <tr key={idx}>
                    <td><strong>{c.carrera || 'Sin especificar'}</strong></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge badge-info" style={{ textTransform: 'none' }}>{c.total}</span>
                    </td>
                  </tr>
                ))}
                {postulantesPorCarrera.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: 20, color: 'var(--gray-400)' }}>
                      No hay datos de postulantes por carrera.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grupos Recientes */}
        <div className="chart-card">
          <div className="chart-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><FiGrid style={{ marginRight: 6 }} />Grupos Habilitados Recientes</span>
            <Link to="/autoridad/grupos" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Ver todos</Link>
          </div>
          <div className="table-container">
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Carrera</th>
                  <th>Turno</th>
                  <th>Aula</th>
                  <th>Ocupación</th>
                </tr>
              </thead>
              <tbody>
                {gruposRecientes.map(g => (
                  <tr key={g.id}>
                    <td><strong>{g.codigo}</strong></td>
                    <td>{g.carrera}</td>
                    <td style={{ textTransform: 'capitalize' }}>{g.turno}</td>
                    <td>{g.aula}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600 }}>{g.ocupacion} / {g.cupo_maximo}</span>
                        <div style={{
                          width: 48, height: 6,
                          background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(100, g.cupo_maximo > 0 ? (g.ocupacion / g.cupo_maximo) * 100 : 0)}%`,
                            height: '100%',
                            background: g.ocupacion >= g.cupo_maximo ? 'var(--danger)' : g.ocupacion >= g.cupo_maximo * 0.8 ? 'var(--warning)' : 'var(--success)'
                          }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {gruposRecientes.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--gray-400)' }}>
                      No hay grupos habilitados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">Consultas Rápidas</span>
        </div>
        <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link to="/autoridad/grupos" className="btn btn-outline btn-sm">Grupos Habilitados</Link>
          <Link to="/autoridad/docentes" className="btn btn-outline btn-sm">Docentes Asignados</Link>
          <Link to="/autoridad/horarios" className="btn btn-outline btn-sm">Horarios</Link>
          <Link to="/autoridad/estadisticas" className="btn btn-outline btn-sm">Estadísticas Generales</Link>
        </div>
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  )
}
