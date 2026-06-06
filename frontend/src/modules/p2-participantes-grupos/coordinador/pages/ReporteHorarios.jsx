import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import {
  getReporteHorarios,
  exportarHorariosCsv,
  getDocentesAcademicos,
  getGrupos,
  getMaterias,
} from '../services/coordinadorService'
import { FiDownload, FiRefreshCw } from 'react-icons/fi'

const TURNOS = ['mañana', 'tarde', 'noche']

const TURNO_STYLE = {
  mañana: { bg: '#e8f5e9', text: '#2e7d32' },
  tarde:  { bg: '#fff3e0', text: '#e65100' },
  noche:  { bg: '#ede7f6', text: '#4527a0' },
}

function TurnoBadge({ turno }) {
  const t = (turno || '').toLowerCase()
  const style = TURNO_STYLE[t] || { bg: '#f0f0f0', text: '#555' }
  return (
    <span style={{
      background: style.bg,
      color: style.text,
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: '0.76rem',
      fontWeight: 600,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {turno}
    </span>
  )
}

function EstadoBadge({ estado }) {
  const asignado = estado === 'Asignado'
  return (
    <span style={{
      background: asignado ? '#e8f5e9' : '#fff8e1',
      color:      asignado ? '#2e7d32' : '#f57f17',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: '0.74rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {estado}
    </span>
  )
}

export default function ReporteHorarios() {
  const [grupos, setGrupos]         = useState([])
  const [docentes, setDocentes]     = useState([])
  const [gruposOpts, setGruposOpts] = useState([])
  const [materias, setMaterias]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [filtros, setFiltros]       = useState({
    grupo_id:        '',
    turno:           '',
    docente_user_id: '',
    materia_nombre:  '',
  })

  const fetchReporte = useCallback(async () => {
    setLoading(true)
    const params = {}
    if (filtros.grupo_id)        params.grupo_id        = filtros.grupo_id
    if (filtros.turno)           params.turno           = filtros.turno
    if (filtros.docente_user_id) params.docente_user_id = filtros.docente_user_id
    if (filtros.materia_nombre)  params.materia_nombre  = filtros.materia_nombre
    try {
      const r = await getReporteHorarios(params)
      setGrupos(r.data || [])
    } catch {
      setGrupos([])
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => { fetchReporte() }, [fetchReporte])

  useEffect(() => {
    getDocentesAcademicos().then(r => setDocentes(r.data || [])).catch(() => {})
    getGrupos().then(r => setGruposOpts(r.data || [])).catch(() => {})
    getMaterias().then(r => setMaterias(r.data || [])).catch(() => {})
  }, [])

  const handleExport = () => {
    const params = {}
    if (filtros.grupo_id)        params.grupo_id        = filtros.grupo_id
    if (filtros.turno)           params.turno           = filtros.turno
    if (filtros.docente_user_id) params.docente_user_id = filtros.docente_user_id
    if (filtros.materia_nombre)  params.materia_nombre  = filtros.materia_nombre
    exportarHorariosCsv(params)
  }

  const setFiltro = (key, val) => setFiltros(prev => ({ ...prev, [key]: val }))

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      {/* ── Encabezado ── */}
      <div className="page-header">
        <h1>Reporte de Horarios</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExport} title="Exportar CSV">
            <FiDownload /> Exportar CSV
          </button>
          <button className="btn btn-outline btn-sm" onClick={fetchReporte} title="Actualizar">
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <select
          className="form-select"
          style={{ flex: '1', minWidth: 160 }}
          value={filtros.grupo_id}
          onChange={e => setFiltro('grupo_id', e.target.value)}
        >
          <option value="">Todos los grupos</option>
          {gruposOpts.map(g => (
            <option key={g.id} value={g.id}>{g.codigo}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ flex: '1', minWidth: 140 }}
          value={filtros.turno}
          onChange={e => setFiltro('turno', e.target.value)}
        >
          <option value="">Todos los turnos</option>
          {TURNOS.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ flex: '1', minWidth: 180 }}
          value={filtros.docente_user_id}
          onChange={e => setFiltro('docente_user_id', e.target.value)}
        >
          <option value="">Todos los docentes</option>
          {docentes.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ flex: '1', minWidth: 160 }}
          value={filtros.materia_nombre}
          onChange={e => setFiltro('materia_nombre', e.target.value)}
        >
          <option value="">Todas las materias</option>
          {materias.map((m, i) => (
            <option key={m.id ?? i} value={m.nombre ?? m}>{m.nombre ?? m}</option>
          ))}
        </select>
      </div>

      {/* ── Lista de grupos ── */}
      {grupos.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 60,
          color: 'var(--gray-400)',
          fontSize: '0.95rem',
        }}>
          No hay grupos con horarios registrados
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grupos.map(grupo => (
            <div
              key={grupo.id}
              style={{
                border: '1px solid var(--gray-200, #e5e7eb)',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                background: '#fff',
              }}
            >
              {/* Cabecera del grupo */}
              <div style={{
                background: 'var(--gray-50, #f9fafb)',
                borderBottom: '1px solid var(--gray-200, #e5e7eb)',
                padding: '14px 20px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px 20px',
                alignItems: 'center',
              }}>
                <strong style={{ fontSize: '1rem', color: 'var(--gray-800, #1f2937)' }}>
                  Grupo {grupo.codigo}
                </strong>

                <TurnoBadge turno={grupo.turno} />

                <span style={{ fontSize: '0.84rem', color: 'var(--gray-600, #4b5563)' }}>
                  Horario:&nbsp;<strong>{grupo.horario_general}</strong>
                </span>

                <span style={{ fontSize: '0.84rem', color: 'var(--gray-600, #4b5563)' }}>
                  Aula:&nbsp;<strong>{grupo.aula || '-'}</strong>
                </span>

                {grupo.dias && (
                  <span style={{ fontSize: '0.84rem', color: 'var(--gray-600, #4b5563)' }}>
                    Días:&nbsp;<strong>{grupo.dias}</strong>
                  </span>
                )}

                <span style={{
                  fontSize: '0.84rem',
                  color: 'var(--gray-600, #4b5563)',
                  marginLeft: 'auto',
                }}>
                  Estudiantes:&nbsp;
                  <strong style={{
                    color: grupo.cupo_maximo > 0 && grupo.ocupacion >= grupo.cupo_maximo
                      ? '#c62828'
                      : 'var(--primary, #2563eb)',
                  }}>
                    {grupo.ocupacion} / {grupo.cupo_maximo || '-'}
                  </strong>
                </span>
              </div>

              {/* Tabla de materias */}
              {grupo.materias && grupo.materias.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem',
                  }}>
                    <thead>
                      <tr style={{
                        background: 'var(--gray-50, #f9fafb)',
                        borderBottom: '1px solid var(--gray-200, #e5e7eb)',
                      }}>
                        <th style={thStyle}>Materia</th>
                        <th style={thStyle}>Horario</th>
                        <th style={thStyle}>Docente asignado</th>
                        <th style={{ ...thStyle, textAlign: 'center', width: 120 }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.materias.map((mat, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom: '1px solid var(--gray-100, #f3f4f6)',
                            background: i % 2 === 0 ? '#fff' : 'var(--gray-50, #fafafa)',
                          }}
                        >
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 500 }}>{mat.materia_nombre}</span>
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary, #2563eb)', whiteSpace: 'nowrap' }}>
                            {mat.hora_inicio} – {mat.hora_fin}
                          </td>
                          <td style={{ ...tdStyle, color: mat.docente_name ? 'var(--gray-800, #1f2937)' : 'var(--gray-400, #9ca3af)' }}>
                            {mat.docente_name || 'Sin docente'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <EstadoBadge estado={mat.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{
                  padding: '16px 20px',
                  color: 'var(--gray-400, #9ca3af)',
                  fontSize: '0.85rem',
                }}>
                  Sin materias registradas en este grupo
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {grupos.length > 0 && (
        <p style={{
          textAlign: 'right',
          fontSize: '0.8rem',
          color: 'var(--gray-500, #6b7280)',
          marginTop: 12,
        }}>
          {grupos.length} grupo(s) mostrado(s)
        </p>
      )}
    </Layout>
  )
}

const thStyle = {
  padding: '10px 20px',
  textAlign: 'left',
  fontWeight: 600,
  color: 'var(--gray-600, #4b5563)',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 20px',
}
