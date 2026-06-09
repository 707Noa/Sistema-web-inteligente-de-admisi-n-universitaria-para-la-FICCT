import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getEstadisticas } from '../services/autoridadService'
import { FiUsers, FiBook, FiPieChart, FiTrendingUp, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function EstadisticasAutoridad() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getEstadisticas()
      .then(r => setData(r.data))
      .catch(e => setError(e.message || 'Error al cargar estadísticas.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><Loading /></Layout>

  const getPercent = (val, max) => {
    if (!max || max <= 0) return 0
    return Math.min(100, Math.round((val / max) * 100))
  }

  // Line chart for grupos por gestión
  const gestionLabels = (data?.grupos_gestion || []).map(g => g.gestion)
  const gestionData = (data?.grupos_gestion || []).map(g => g.cantidad)

  const lineChartData = {
    labels: gestionLabels,
    datasets: [
      {
        label: 'Grupos habilitados',
        data: gestionData,
        borderColor: 'var(--primary, #2563eb)',
        backgroundColor: 'rgba(37,99,235,0.08)',
        borderWidth: 2,
        pointRadius: 5,
        pointBackgroundColor: 'var(--primary, #2563eb)',
        tension: 0.3,
        fill: true,
      },
    ],
  }

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, precision: 0 },
      },
    },
  }

  const supervisoryStats = [
    {
      label: 'Grupos sin docente',
      value: data?.grupos_sin_docente ?? 0,
      color: data?.grupos_sin_docente > 0 ? '#dc2626' : '#16a34a',
      icon: data?.grupos_sin_docente > 0 ? <FiAlertCircle /> : <FiCheckCircle />,
    },
    {
      label: 'Grupos sin aula',
      value: data?.grupos_sin_aula ?? 0,
      color: data?.grupos_sin_aula > 0 ? '#d97706' : '#16a34a',
      icon: data?.grupos_sin_aula > 0 ? <FiAlertCircle /> : <FiCheckCircle />,
    },
    {
      label: 'Grupos sin horario',
      value: data?.grupos_sin_horario ?? 0,
      color: data?.grupos_sin_horario > 0 ? '#d97706' : '#16a34a',
      icon: data?.grupos_sin_horario > 0 ? <FiAlertCircle /> : <FiCheckCircle />,
    },
    {
      label: 'Postulantes sin grupo',
      value: data?.postulantes_sin_grupo ?? 0,
      color: data?.postulantes_sin_grupo > 0 ? '#d97706' : '#16a34a',
      icon: data?.postulantes_sin_grupo > 0 ? <FiAlertCircle /> : <FiCheckCircle />,
    },
    {
      label: 'Grupos con cupo lleno',
      value: data?.grupos_cupo_lleno ?? 0,
      color: '#6366f1',
      icon: <FiPieChart />,
    },
    {
      label: 'Total grupos activos',
      value: data?.total_grupos ?? 0,
      color: '#2563eb',
      icon: <FiCheckCircle />,
    },
  ]

  return (
    <Layout>
      <div className="page-header">
        <h1>Estadísticas Generales</h1>
      </div>

      {error && (
        <div style={{ padding: 16, color: '#991b1b', background: '#fee2e2', borderRadius: 'var(--radius)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Supervisory metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        {supervisoryStats.map((s, i) => (
          <div key={i} style={{
            background: '#fff',
            border: '1px solid var(--gray-200)',
            borderRadius: 10,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.color, fontSize: '1.1rem' }}>
              {s.icon}
              <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{s.value}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 24 }}>

        {/* Grupos por Gestión — line chart */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiTrendingUp style={{ color: 'var(--primary)' }} /> Grupos por Gestión
          </h2>
          {gestionLabels.length > 0 ? (
            <Line data={lineChartData} options={lineChartOptions} />
          ) : (
            <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>Sin datos de gestiones registradas</p>
          )}
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
              <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>Sin datos registrados</p>
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
              <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>Sin datos registrados</p>
            )}
          </div>
        </div>

        {/* Ocupación y Cupos por Grupo */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiPieChart style={{ color: '#8b5cf6' }} /> Ocupación y Cupos por Grupo
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
              <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>Sin datos registrados</p>
            )}
          </div>
        </div>

      </div>
    </Layout>
  )
}
