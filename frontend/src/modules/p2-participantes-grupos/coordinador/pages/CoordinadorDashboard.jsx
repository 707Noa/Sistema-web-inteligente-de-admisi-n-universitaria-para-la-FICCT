import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getDashboard } from '../services/coordinadorService'
import { FiUsers, FiGrid, FiBook, FiCheckCircle, FiAlertTriangle, FiClock, FiAlertOctagon, FiList, FiSliders, FiUserPlus, FiUserCheck } from 'react-icons/fi'
import { Link } from 'react-router-dom'

export default function CoordinadorDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await getDashboard()
      setData(res.data)
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al cargar la información del dashboard.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Layout><Loading /></Layout>
  if (errorMsg) return <Layout><div style={{ padding: 20, color: 'var(--danger)', fontWeight: 600 }}>{errorMsg}</div></Layout>
  if (!data) return <Layout><p>Sin datos disponibles</p></Layout>

  const resumen = data.resumen || {}
  const gruposRecientes = data.grupos_recientes || []
  const docentesCarga = data.docentes_carga || []
  const alertas = data.alertas || []

  const statCards = [
    { label: 'Total Inscritos', value: resumen.total_inscritos || 0, icon: <FiUsers />, color: 'blue' },
    { label: 'Grupos Habilitados', value: resumen.total_grupos_habilitados || 0, icon: <FiGrid />, color: 'green' },
    { label: 'Docentes Activos', value: resumen.total_docentes_activos || 0, icon: <FiBook />, color: 'yellow' },
    { label: 'Asignaciones Académicas', value: resumen.total_asignaciones_academicas || 0, icon: <FiCheckCircle />, color: 'purple' },
    { label: 'Grupos sin Docente', value: resumen.grupos_sin_docente || 0, icon: <FiAlertTriangle />, color: 'red' },
    { label: 'Horarios Registrados', value: resumen.horarios_registrados || 0, icon: <FiClock />, color: 'info' }
  ]

  return (
    <Layout>
      <div className="page-header">
        <h1>Dashboard Académico</h1>
        <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>
          Gestión del Curso Preuniversitario (CUP)
        </div>
      </div>

      {/* Tarjetas Estadísticas */}
      <div className="stat-grid">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`stat-card-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-card-info">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Accesos Rápidos */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">Accesos Rápidos</span>
        </div>
        <div style={{ padding: '0 20px 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'Postulantes',      path: '/coordinador/postulantes',    icon: <FiUserCheck />, color: 'var(--primary)' },
            { label: 'Grupos',           path: '/coordinador/grupos',         icon: <FiGrid />,      color: '#0891b2' },
            { label: 'Asignaciones',     path: '/coordinador/asignacion',     icon: <FiList />,      color: '#7c3aed' },
            { label: 'Docentes',         path: '/coordinador/docentes',       icon: <FiBook />,      color: '#059669' },
            { label: 'Cupos por Carrera',path: '/coordinador/cupos-carrera',  icon: <FiSliders />,   color: '#d97706' },
            { label: 'Admisión Final',   path: '/coordinador/admision-final', icon: <FiUserPlus />,  color: '#dc2626' },
          ].map(({ label, path, icon, color }) => (
            <Link
              key={path}
              to={path}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '16px 12px', borderRadius: 'var(--radius)',
                border: `1px solid var(--gray-200)`, background: 'var(--gray-50)',
                textDecoration: 'none', color: 'var(--gray-800)', fontWeight: 600,
                fontSize: '0.85rem', textAlign: 'center', transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = color }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--gray-50)'; e.currentTarget.style.color = 'var(--gray-800)'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}
            >
              <span style={{ fontSize: '1.5rem' }}>{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Sección de Alertas Académicas */}
      <div className="card" style={{ marginTop: 24, borderLeft: '4px solid var(--warning)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FiAlertOctagon style={{ color: 'var(--warning)', fontSize: '1.25rem' }} />
          <span className="card-title" style={{ margin: 0 }}>Alertas Académicas y de Monitoreo</span>
        </div>
        <div style={{ padding: '0 20px 20px 20px' }}>
          {alertas.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#065f46', background: 'var(--success-light)', padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}>
              <FiCheckCircle />
              <span>No se registran alertas académicas. Todos los grupos cuentan con docentes y se encuentran en límites saludables de aforo.</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {alertas.map((al, idx) => {
                let bg = 'var(--gray-50)';
                let color = 'var(--gray-800)';
                let border = '1px solid var(--gray-200)';
                let iconColor = 'var(--gray-500)';

                if (al.tipo === 'grupo_sin_docente') {
                  bg = 'var(--danger-light)';
                  color = '#991b1b';
                  border = '1px solid #fca5a5';
                  iconColor = 'var(--danger)';
                } else if (al.tipo === 'docente_limite') {
                  bg = 'var(--warning-light)';
                  color = '#92400e';
                  border = '1px solid #fde047';
                  iconColor = 'var(--warning)';
                } else if (al.tipo === 'grupo_lleno') {
                  bg = '#fef3c7'; // Amber 100
                  color = '#92400e';
                  border = '1px solid #fcd34d';
                  iconColor = '#d97706';
                }

                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius)',
                    background: bg,
                    color: color,
                    border: border,
                    fontSize: '0.875rem',
                    animation: 'fadeIn 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FiAlertTriangle style={{ color: iconColor, flexShrink: 0, fontSize: '1.1rem' }} />
                      <span>{al.mensaje}</span>
                    </div>
                    {al.tipo === 'grupo_sin_docente' && (
                      <Link to="/coordinador/asignacion" className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem', textTransform: 'none' }}>
                        Asignar Docente
                      </Link>
                    )}
                    {al.tipo === 'grupo_lleno' && (
                      <Link to="/coordinador/grupos" className="btn btn-outline btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem', textTransform: 'none' }}>
                        Ver Grupo
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tablas de Información Reciente / Carga */}
      <div className="chart-grid" style={{ marginTop: 24 }}>
        {/* Grupos Recientes */}
        <div className="chart-card">
          <div className="chart-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Grupos Habilitados Recientes</span>
            <Link to="/coordinador/grupos" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Ver todos</Link>
          </div>
          <div className="table-container">
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Carrera</th>
                  <th>Turno</th>
                  <th>Capacidad</th>
                </tr>
              </thead>
              <tbody>
                {gruposRecientes.map(g => (
                  <tr key={g.id}>
                    <td><strong>{g.codigo}</strong></td>
                    <td>{g.carrera_nombre}</td>
                    <td style={{ textTransform: 'capitalize' }}>{g.turno}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600 }}>{g.ocupacion} / {g.cupo_maximo}</span>
                        <div style={{
                          width: 48,
                          height: 6,
                          background: 'var(--gray-200)',
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(100, (g.ocupacion / g.cupo_maximo) * 100)}%`,
                            height: '100%',
                            background: g.ocupacion >= g.cupo_maximo ? 'var(--danger)' : g.ocupacion >= 60 ? 'var(--warning)' : 'var(--success)'
                          }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {gruposRecientes.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--gray-400)' }}>
                      Sin grupos habilitados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Docentes con Carga */}
        <div className="chart-card">
          <div className="chart-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Docentes con Mayor Carga Académica</span>
            <Link to="/coordinador/docentes" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Ver docentes</Link>
          </div>
          <div className="table-container">
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Correo</th>
                  <th>Grupos Asignados</th>
                </tr>
              </thead>
              <tbody>
                {docentesCarga.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{d.email}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${d.carga_grupos >= 4 ? 'badge-danger' : d.carga_grupos > 0 ? 'badge-info' : 'badge-gray'}`} style={{ textTransform: 'none' }}>
                          {d.carga_grupos} / 4 grupos
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {docentesCarga.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--gray-400)' }}>
                      Sin docentes asignados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
