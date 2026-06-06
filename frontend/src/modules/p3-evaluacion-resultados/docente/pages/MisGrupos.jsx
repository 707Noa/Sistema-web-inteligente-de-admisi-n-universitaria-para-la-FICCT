import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getMisGrupos } from '../services/docenteAcademicoService'
import { FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi'

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

const GRUPO_COLORES = [
  '#1565c0',
  '#c62828',
  '#283593',
  '#ad1457',
  '#00695c',
  '#6a1b9a',
]

const TURNO_ESTILO = {
  mañana: { bg: '#e3f2fd', text: '#1565c0' },
  tarde:  { bg: '#fff3e0', text: '#e65100' },
  noche:  { bg: '#ede7f6', text: '#4527a0' },
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MisGrupos() {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [horarioVisible, setHorarioVisible] = useState(false)

  const fetchData = () => {
    setLoading(true)
    getMisGrupos()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <Layout><Loading /></Layout>

  const docente = data?.docente         || {}
  const grupos  = data?.grupos          || []
  const slots   = data?.horario_semanal || []

  const hasSabado = slots.some(s => s.sabado !== null)
  const dias = hasSabado ? [...DIAS_SEMANA, 'sabado'] : DIAS_SEMANA

  const colorMap = {}
  grupos.forEach((g, i) => {
    colorMap[g.codigo] = GRUPO_COLORES[i % GRUPO_COLORES.length]
  })

  return (
    <Layout>
      {/* ── Encabezado ── */}
      <div className="page-header">
        <h1>Mis Grupos</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchData} title="Actualizar">
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* ── Barra de resumen ── */}
      <div style={{
        background: '#1565c0', color: '#fff',
        borderRadius: 10, padding: '14px 20px',
        marginBottom: 24,
        display: 'flex', flexWrap: 'wrap', gap: '6px 32px', alignItems: 'center',
      }}>
        <MetaItem label="Docente"          value={docente.name    || '—'} />
        <MetaItem label="Materia asignada" value={docente.materia || 'Sin asignar'} />
        <MetaItem label="Grupos asignados" value={grupos.length} />
      </div>

      {grupos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)', fontSize: '0.95rem' }}>
          No hay grupos asignados. El coordinador debe realizar la asignación primero.
        </div>
      ) : (
        <>
          {/* ── Tarjetas de grupos ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 14,
            marginBottom: 28,
          }}>
            {grupos.map((g, i) => {
              const color = GRUPO_COLORES[i % GRUPO_COLORES.length]
              const ts    = TURNO_ESTILO[(g.turno || '').toLowerCase()] || { bg: '#f0f0f0', text: '#555' }
              return (
                <div
                  key={g.id}
                  className="card"
                  style={{ padding: '16px 18px', borderTop: `3px solid ${color}` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <strong style={{ fontSize: '1rem', color }}>
                      Grupo {g.codigo}
                    </strong>
                    <span style={{
                      background: ts.bg, color: ts.text,
                      padding: '2px 10px', borderRadius: 20,
                      fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize',
                    }}>
                      {g.turno}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.845rem' }}>
                    <FilaDato label="Aula"
                      valor={g.aula || '—'}
                    />
                    <FilaDato label="Horario"
                      valor={
                        g.hora_inicio && g.hora_fin
                          ? <span style={{ fontWeight: 700, color }}>{g.hora_inicio} – {g.hora_fin}</span>
                          : '—'
                      }
                    />
                    <FilaDato label="Estudiantes" valor={g.estudiantes} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Horario semanal (colapsable) ── */}
          {slots.length > 0 && (
            <section>
              {/* Cabecera del toggle */}
              <button
                onClick={() => setHorarioVisible(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '8px 0', marginBottom: 4,
                  borderBottom: horarioVisible ? '2px solid #1565c0' : '2px solid #bbdefb',
                  transition: 'border-color 0.2s',
                }}
              >
                <span style={{
                  fontSize: '0.9rem', fontWeight: 700,
                  color: '#1565c0', textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}>
                  Horario Semanal
                </span>
                <span style={{ marginLeft: 'auto', color: '#1565c0', display: 'flex' }}>
                  {horarioVisible ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </span>
              </button>

              {/* Tabla colapsable */}
              {horarioVisible && (
                <>
                  <div style={{
                    overflowX: 'auto',
                    borderRadius: 10,
                    border: '1px solid #bbdefb',
                    marginTop: 12,
                    boxShadow: '0 2px 8px rgba(21,101,192,0.07)',
                  }}>
                    <table style={{
                      width: '100%', borderCollapse: 'collapse',
                      fontSize: '0.875rem', minWidth: 480,
                    }}>
                      <thead>
                        <tr style={{ background: '#1565c0', color: '#fff' }}>
                          <th style={{ ...thBase, width: 120, background: '#0d47a1' }}>Hora</th>
                          {dias.map(d => (
                            <th key={d} style={thBase}>{DIAS_ETIQUETA[d]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {slots.map((slot, ri) => (
                          <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f5f9ff' }}>
                            <td style={{
                              ...tdBase,
                              fontWeight: 600, color: '#1565c0',
                              background: ri % 2 === 0 ? '#e8f1fb' : '#dbeafe',
                              borderRight: '2px solid #c7d9f0',
                              whiteSpace: 'nowrap', fontSize: '0.82rem',
                            }}>
                              {slot.hora_inicio} – {slot.hora_fin}
                            </td>
                            {dias.map(d => {
                              const celda = slot[d]
                              if (!celda) {
                                return (
                                  <td key={d} style={{ ...tdBase, color: '#d0d7e2', fontSize: '0.78rem' }}>
                                    —
                                  </td>
                                )
                              }
                              const color = colorMap[celda.codigo] || '#1565c0'
                              return (
                                <td key={d} style={tdBase}>
                                  <span style={{ fontWeight: 700, color, fontSize: '0.875rem', display: 'block' }}>
                                    {celda.codigo}
                                  </span>
                                  {celda.aula && (
                                    <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'block', marginTop: 1 }}>
                                      Aula {celda.aula}
                                    </span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Leyenda */}
                  {grupos.length > 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                      {grupos.map((g, i) => (
                        <span key={g.id} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: '0.78rem', color: 'var(--gray-600)',
                        }}>
                          <span style={{
                            width: 10, height: 10, borderRadius: 2,
                            background: GRUPO_COLORES[i % GRUPO_COLORES.length],
                            flexShrink: 0,
                          }} />
                          Grupo {g.codigo}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
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

function FilaDato({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--gray-500)', fontSize: '0.82rem' }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{valor}</span>
    </div>
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
  padding: '9px 10px',
  textAlign: 'center',
  border: '1px solid #e8f1fb',
  verticalAlign: 'middle',
}
