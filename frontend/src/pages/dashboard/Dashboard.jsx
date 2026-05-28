import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import Loading from '../../components/Loading'
import { getDashboard } from '../../services/dashboardService'
import { FiUsers, FiCheckCircle, FiXCircle, FiGrid, FiBook, FiClock } from 'react-icons/fi'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const res = await getDashboard()
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Layout><Loading /></Layout>
  if (!data) return <Layout><p>Error al cargar dashboard</p></Layout>

  const stats = data.stats || {}

  const statCards = [
    { label: 'Total Inscritos', value: stats.total_inscritos || 0, icon: <FiUsers />, color: 'blue' },
    { label: 'Aprobados', value: stats.total_aprobados || 0, icon: <FiCheckCircle />, color: 'green' },
    { label: 'Reprobados', value: stats.total_reprobados || 0, icon: <FiXCircle />, color: 'red' },
    { label: 'Grupos Habilitados', value: stats.total_grupos || 0, icon: <FiGrid />, color: 'blue' },
    { label: 'Docentes Activos', value: stats.total_docentes || 0, icon: <FiBook />, color: 'green' },
    { label: 'Pendientes', value: stats.total_pendientes || 0, icon: <FiClock />, color: 'yellow' },
  ]

  const porCarreraData = {
    labels: (data.porCarrera || []).map(c => c.carrera_postulada),
    datasets: [{ label: 'Postulantes', data: (data.porCarrera || []).map(c => c.total), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }],
  }

  const avr = data.aprobadosVsReprobados || {}
  const donutData = {
    labels: ['Aprobados', 'Reprobados', 'Pendientes'],
    datasets: [{ data: [avr.aprobados || 0, avr.reprobados || 0, avr.pendientes || 0], backgroundColor: ['#10b981', '#ef4444', '#f59e0b'] }],
  }

  const fechaData = {
    labels: (data.inscripcionesPorFecha || []).map(f => f.fecha),
    datasets: [{ label: 'Inscripciones', data: (data.inscripcionesPorFecha || []).map(f => f.total), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 }],
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stat-grid">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className={`stat-card-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-card-info">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <div className="chart-card-title">Postulantes por Carrera</div>
          <Bar data={porCarreraData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="chart-card">
          <div className="chart-card-title">Aprobados vs Reprobados</div>
          <Doughnut data={donutData} options={{ responsive: true }} />
        </div>
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div className="chart-card-title">Inscripciones por Fecha (últimos 30 días)</div>
          <Line data={fechaData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
      </div>

      {data.auditoriaReciente && data.auditoriaReciente.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header"><span className="card-title">Auditoría Reciente</span></div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Fecha</th><th>Hora</th><th>IP</th></tr></thead>
              <tbody>
                {data.auditoriaReciente.map((a) => (
                  <tr key={a.id}>
                    <td>{a.user?.name || 'Sistema'}</td>
                    <td>{a.accion}</td>
                    <td>{a.modulo}</td>
                    <td>{a.fecha}</td>
                    <td>{a.hora}</td>
                    <td>{a.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}
