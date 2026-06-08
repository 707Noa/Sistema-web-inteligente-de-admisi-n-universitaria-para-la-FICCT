import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getPostulanteHorario } from '../services/postulanteService'
import { FiRefreshCw } from 'react-icons/fi'

// ── Constantes ────────────────────────────────────────────────────────────────

const DIAS_SEMANA   = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
const DIAS_ETIQUETA = {
  lunes:     'Lunes',
  martes:    'Martes',
  miercoles: 'Miércoles',
  jueves:    'Jueves',
  viernes:   'Viernes',
  sabado:    'Sábado',
}

// Colores diferenciadores para materias (minimalista: solo el texto es coloreado)
const MATERIA_COLORES = ['#1565c0', '#c62828', '#1b5e20', '#6a1b9a', '#bf360c']

const TURNO_ESTILO = {
  mañana: { bg: '#e3f2fd', text: '#1565c0' },
  tarde:  { bg: '#fff3e0', text: '#e65100' },
  noche:  { bg: '#ede7f6', text: '#4527a0' },
}

const capitalizeFirstLetter = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

const formatHour = (timeStr) => (timeStr || '').substring(0, 5)

// ── Componente principal ──────────────────────────────────────────────────────

export default function PostulanteMiHorario() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = () => {
    setLoading(true)
    getPostulanteHorario()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <Layout><Loading /></Layout>

  const grupo = data?.grupo || null

  const getHoursForTurno = (turno) => {
    const t = (turno || '').toLowerCase()
    if (t === 'mañana' || t === 'manana') {
      return ['08:00', '09:00', '10:00', '11:00']
    } else if (t === 'tarde') {
      return ['13:00', '14:00', '15:00']
    } else if (t === 'noche') {
      return ['16:00', '17:00', '18:00', '19:00']
    }
    return []
  }

  const getCellDataForPostulante = (dia, hora) => {
    const asig = (data?.asignaciones || []).find(a => 
      (a.dia || '').toLowerCase() === dia.toLowerCase() && 
      (a.hora_inicio || '').substring(0, 5) === hora
    )
    if (!asig) return null
    return {
      materia: asig.materia,
      docente: asig.docente || 'Por asignar',
      aula: grupo?.aula || '-'
    }
  }

  const turnoKey = (grupo?.turno || '').toLowerCase()
  const ts = TURNO_ESTILO[turnoKey] || { bg: '#f0f4f8', text: '#555' }

  return (
    <Layout>
      <div className="page-header">
        <h1>Mi Horario</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchData} title="Actualizar">
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {!grupo ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-500)', fontSize: '0.95rem' }}>
          Aún no tienes grupo asignado.
        </div>
      ) : (
        <>
          {/* ── Barra del grupo ── */}
          <div style={{
            background: '#1565c0', color: '#fff',
            borderRadius: 10, padding: '14px 22px',
            marginBottom: 24,
            display: 'flex', flexWrap: 'wrap', gap: '6px 32px', alignItems: 'center',
          }}>
            <MetaItem label="Grupo" value={grupo.codigo} />
            <MetaItem label="Turno"
              value={
                <span style={{
                  background: ts.bg, color: ts.text,
                  padding: '2px 10px', borderRadius: 20,
                  fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
                }}>
                  {grupo.turno}
                </span>
              }
            />
            <MetaItem label="Aula" value={grupo.aula || '—'} />
          </div>

          {/* ── Grid Horario Calendario ── */}
          {!data.asignaciones || data.asignaciones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
              El horario aún no fue generado.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Cuadrícula visual */}
              <div className="card" style={{ padding: '20px', borderRadius: 10, border: '1px solid #bbdefb', boxShadow: '0 2px 8px rgba(21,101,192,0.07)', overflowX: 'auto' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1565c0', marginBottom: 14 }}>
                  Horario detallado — {grupo.codigo} {(grupo.turno || '').toLowerCase()}
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: '#1565c0', color: 'white' }}>
                      <th style={{ padding: '10px', border: '1px solid #bbdefb', width: '100px', fontWeight: 600 }}>Hora</th>
                      <th style={{ padding: '10px', border: '1px solid #bbdefb', fontWeight: 600 }}>Lunes</th>
                      <th style={{ padding: '10px', border: '1px solid #bbdefb', fontWeight: 600 }}>Martes</th>
                      <th style={{ padding: '10px', border: '1px solid #bbdefb', fontWeight: 600 }}>Miércoles</th>
                      <th style={{ padding: '10px', border: '1px solid #bbdefb', fontWeight: 600 }}>Jueves</th>
                      <th style={{ padding: '10px', border: '1px solid #bbdefb', fontWeight: 600 }}>Viernes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getHoursForTurno(grupo.turno).map(h => {
                      const nextHourNum = parseInt(h.split(':')[0], 10) + 1
                      const nextHour = `${nextHourNum < 10 ? '0' : ''}${nextHourNum}:00`
                      return (
                        <tr key={h} style={{ borderBottom: '1px solid #bbdefb' }}>
                          <td style={{ padding: '10px', fontWeight: 'bold', border: '1px solid #bbdefb', background: '#f5f9ff', fontSize: '0.78rem' }}>
                            {h} - {nextHour}
                          </td>
                          {['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].map(dia => {
                            const cell = getCellDataForPostulante(dia, h)
                            return (
                              <td key={dia} style={{ padding: '6px', border: '1px solid #bbdefb', verticalAlign: 'middle', height: '75px', width: '18%' }}>
                                {cell ? (
                                  <div style={{
                                    background: '#e3f2fd',
                                    border: '1px solid #90caf9',
                                    borderRadius: '8px',
                                    padding: '6px',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    color: '#0d47a1',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                  }}
                                  title={`Docente: ${cell.docente}\nAula: ${cell.aula}`}
                                  >
                                    <strong style={{ color: '#1565c0', fontSize: '0.78rem', marginBottom: '2px', display: 'block' }}>
                                      {cell.materia}
                                    </strong>
                                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#1e88e5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      Docente: {cell.docente}
                                    </span>
                                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#1e88e5' }}>
                                      Aula: {cell.aula}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ color: '#90caf9', opacity: 0.5, fontSize: '0.8rem' }}>—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumen Detallado al Final */}
              <div className="card" style={{ padding: '20px', borderRadius: 10, border: '1px solid #e0e0e0', background: '#fafafa' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Resumen Detallado del Horario
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(data.asignaciones || []).map((a, idx) => {
                    const diaFormatted = capitalizeFirstLetter(a.dia);
                    const horaInicioFormatted = formatHour(a.hora_inicio);
                    const horaFinFormatted = formatHour(a.hora_fin);
                    return (
                      <div key={idx} style={{
                        padding: '12px 16px',
                        background: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: 'var(--gray-700)',
                        lineHeight: 1.6,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}>
                        Materia: <strong>{a.materia}</strong> | Grupo: <strong>{grupo.codigo}</strong> | Docente: <strong>{a.docente || 'Por asignar'}</strong> | Aula: <strong>{grupo.aula || 'Aula asignada'}</strong> | Horario: <strong>{diaFormatted} {horaInicioFormatted} - {horaFinFormatted}</strong>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </Layout>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function MetaItem({ label, value }) {
  return (
    <span style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>
      <span style={{ opacity: 0.72 }}>{label}: </span>
      <strong>{value}</strong>
    </span>
  )
}

// ── Estilos base de tabla ─────────────────────────────────────────────────────

const thBase = {
  padding: '10px 14px',
  textAlign: 'center',
  fontWeight: 600,
  fontSize: '0.8rem',
  letterSpacing: '0.3px',
  borderRight: '1px solid rgba(255,255,255,0.15)',
}

const tdBase = {
  padding: '10px 10px',
  textAlign: 'center',
  border: '1px solid #e8f1fb',
  verticalAlign: 'middle',
}
