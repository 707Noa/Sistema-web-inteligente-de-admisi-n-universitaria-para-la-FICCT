import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getDashboard } from '../services/coordinadorService'
import {
  FiUsers, FiGrid, FiBook, FiCheckCircle, FiAlertTriangle,
  FiClock, FiAlertOctagon, FiRefreshCw, FiHome, FiMap,
  FiUserCheck, FiUserX, FiAward, FiSlash, FiLayers, FiFileText
} from 'react-icons/fi'
import { Link } from 'react-router-dom'

export default function CoordinadorDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setErrorMsg(null)
      const res = await getDashboard()
      setData(res.data)
    } catch (err) {
      console.error('Error al cargar dashboard:', err)
      setErrorMsg(
        err.response?.data?.message ||
        'Error al cargar la información del dashboard. Verifique la conexión con el servidor.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData(false)
  }, [fetchData])

  const handleRefresh = () => {
    fetchData(true)
  }

  if (loading) return <Layout><Loading /></Layout>

  if (errorMsg && !data) {
    return (
      <Layout>
        <div style={{
          padding: 32,
          textAlign: 'center',
          color: 'var(--danger)',
        }}>
          <FiAlertOctagon style={{ fontSize: '2.5rem', marginBottom: 12 }} />
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Error al cargar el Dashboard</h2>
          <p style={{ fontSize: '0.9rem', margin: '0 0 16px 0', color: 'var(--gray-600)' }}>{errorMsg}</p>
          <button className="btn btn-primary" onClick={() => fetchData(false)}>
            <FiRefreshCw style={{ marginRight: 6 }} /> Reintentar
          </button>
        </div>
      </Layout>
    )
  }

  if (!data) return <Layout><p style={{ padding: 20 }}>Sin datos disponibles</p></Layout>

  const resumen = data.resumen || {}
  const gruposRecientes = data.grupos_recientes || []
  const docentesCarga = data.docentes_carga || []
  const alertas = data.alertas || []

  const statCards = [
    { label: 'Total Inscritos', value: resumen.total_inscritos, icon: <FiUsers />, color: 'blue' },
    { label: 'Grupos Habilitados', value: resumen.total_grupos_habilitados, icon: <FiGrid />, color: 'green' },
    { label: 'Docentes Activos', value: resumen.total_docentes_activos, icon: <FiBook />, color: 'yellow' },
    { label: 'Asignaciones Académicas', value: resumen.total_asignaciones_academicas, icon: <FiCheckCircle />, color: 'purple' },
    { label: 'Grupos sin Docente', value: resumen.grupos_sin_docente, icon: <FiAlertTriangle />, color: 'red' },
    { label: 'Horarios Registrados', value: resumen.horarios_registrados, icon: <FiClock />, color: 'info' },
    { label: 'Postulantes Asignados', value: resumen.postulantes_asignados, icon: <FiUserCheck />, color: 'green' },
    { label: 'Postulantes sin Grupo', value: resumen.postulantes_sin_grupo, icon: <FiUserX />, color: 'red' },
    { label: 'Grupos sin Aula', value: resumen.grupos_sin_aula, icon: <FiHome />, color: 'red' },
    { label: 'Aulas Asignadas', value: resumen.aulas_asignadas, icon: <FiMap />, color: 'info' },
    { label: 'Notas Pendientes', value: resumen.notas_pendientes, icon: <FiFileText />, color: 'yellow' },
    { label: 'Aprobados', value: resumen.aprobados, icon: <FiAward />, color: 'green' },
    { label: 'Admitidos', value: resumen.admitidos, icon: <FiLayers />, color: 'purple' },
  ]

  const getAlertStyle = (tipo) => {
    switch (tipo) {
      case 'grupo_sin_docente':
        return { bg: 'var(--danger-light, #fef2f2)', color: '#991b1b', border: '1px solid #fca5a5', iconColor: 'var(--danger)' }
      case 'grupo_sin_aula':
        return { bg: '#fff7ed', color: '#9a3412', border: '1px solid #fdba74', iconColor: '#ea580c' }
      case 'docente_limite':
        return { bg: 'var(--warning-light, #fffbeb)', color: '#92400e', border: '1px solid #fde047', iconColor: 'var(--warning)' }
      case 'grupo_lleno':
        return { bg: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', iconColor: '#d97706' }
      case 'postulantes_sin_grupo':
        return { bg: '#eff6ff', color: '#1e40af', border: '1px solid #93c5fd', iconColor: '#3b82f6' }
      case 'notas_pendientes':
        return { bg: '#fefce8', color: '#854d0e', border: '1px solid #fde047', iconColor: '#eab308' }
      case 'cupos_no_configurados':
        return { bg: '#fdf2f8', color: '#9d174d', border: '1px solid #f9a8d4', iconColor: '#ec4899' }
      default:
        return { bg: 'var(--gray-50)', color: 'var(--gray-800)', border: '1px solid var(--gray-200)', iconColor: 'var(--gray-500)' }
    }
  }

  const getAlertLink = (tipo) => {
    switch (tipo) {
      case 'grupo_sin_docente': return { to: '/coordinador/asignacion', label: 'Asignar Docente' }
      case 'grupo_sin_aula': return { to: '/coordinador/grupos', label: 'Ver Grupos' }
      case 'grupo_lleno': return { to: '/coordinador/grupos', label: 'Ver Grupo' }
      case 'postulantes_sin_grupo': return { to: '/coordinador/asignacion', label: 'Asignar Grupo' }
      case 'notas_pendientes': return { to: '/coordinador/grupos', label: 'Ver Grupos' }
      case 'cupos_no_configurados': return { to: '/coordinador/cupos-carrera', label: 'Configurar Cupos' }
      default: return null
    }
  }

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Dashboard Académico</h1>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 500 }}>
            Gestión del Curso Preuniversitario (CUP) — Datos en tiempo real
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 130 }}
        >
          <FiRefreshCw style={{
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
          }} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Show error banner but keep showing stale data */}
      {errorMsg && data && (
        <div style={{
          background: 'var(--danger-light, #fef2f2)',
          border: '1px solid #fca5a5',
          padding: '10px 16px',
          borderRadius: 'var(--radius)',
          color: '#991b1b',
          fontSize: '0.875rem',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <FiAlertTriangle />
          <span>{errorMsg} — Mostrando datos de la última carga exitosa.</span>
        </div>
      )}

      {/* Tarjetas Estadísticas */}
      <div className="stat-grid">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.04}s` }}>
            <div className={`stat-card-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-card-info">
              <h3>{s.value ?? 0}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sección de Alertas Académicas */}
      <div className="card" style={{ marginTop: 24, borderLeft: '4px solid var(--warning)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FiAlertOctagon style={{ color: 'var(--warning)', fontSize: '1.25rem' }} />
          <span className="card-title" style={{ margin: 0 }}>Alertas Académicas y de Monitoreo</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 500 }}>
            {alertas.length} alerta(s)
          </span>
        </div>
        <div style={{ padding: '0 20px 20px 20px' }}>
          {alertas.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#065f46', background: 'var(--success-light, #ecfdf5)', padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}>
              <FiCheckCircle />
              <span>No se registran alertas académicas. Todos los indicadores se encuentran en estado normal.</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {alertas.map((al, idx) => {
                const style = getAlertStyle(al.tipo)
                const link = getAlertLink(al.tipo)

                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius)',
                    background: style.bg,
                    color: style.color,
                    border: style.border,
                    fontSize: '0.875rem',
                    animation: 'fadeIn 0.3s ease',
                    gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <FiAlertTriangle style={{ color: style.iconColor, flexShrink: 0, fontSize: '1.1rem' }} />
                      <span>{al.mensaje}</span>
                    </div>
                    {link && (
                      <Link to={link.to} className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem', textTransform: 'none', whiteSpace: 'nowrap' }}>
                        {link.label}
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
                  <th>Aula</th>
                  <th>Capacidad</th>
                </tr>
              </thead>
              <tbody>
                {gruposRecientes.map(g => (
                  <tr key={g.id}>
                    <td><strong>{g.codigo}</strong></td>
                    <td>{g.carrera_nombre}</td>
                    <td style={{ textTransform: 'capitalize' }}>{g.turno}</td>
                    <td>{g.aula}</td>
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
                      No hay grupos habilitados en el sistema.
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
                  <th>Materias</th>
                  <th>Grupos Asignados</th>
                </tr>
              </thead>
              <tbody>
                {docentesCarga.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{d.email}</td>
                    <td style={{ textAlign: 'center' }}>{d.materias ?? 0}</td>
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
                    <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--gray-400)' }}>
                      No hay docentes activos en el sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">Accesos Rápidos</span>
        </div>
        <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link to="/coordinador/postulantes" className="btn btn-outline btn-sm">Postulantes</Link>
          <Link to="/coordinador/grupos" className="btn btn-outline btn-sm">Grupos</Link>
          <Link to="/coordinador/asignacion" className="btn btn-outline btn-sm">Asignaciones</Link>
          <Link to="/coordinador/docentes" className="btn btn-outline btn-sm">Docentes</Link>
          <Link to="/coordinador/cupos-carrera" className="btn btn-outline btn-sm">Cupos por Carrera</Link>
          <Link to="/coordinador/admision-final" className="btn btn-outline btn-sm">Admisión Final</Link>
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
