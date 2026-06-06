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

  const grupo   = data?.grupo           || null
  const slots   = data?.horario_semanal || []
  const docentes = data?.docentes       || {}

  // Mapa de color por nombre de materia
  const materiaNombres = [...new Set(
    slots.flatMap(s => DIAS_SEMANA.map(d => s[d]?.materia).filter(Boolean))
  )]
  const colorMap = {}
  materiaNombres.forEach((m, i) => {
    colorMap[m] = MATERIA_COLORES[i % MATERIA_COLORES.length]
  })

  const hasSabado = slots.some(s => s.sabado !== null)
  const dias = hasSabado ? [...DIAS_SEMANA, 'sabado'] : DIAS_SEMANA

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
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)', fontSize: '0.95rem' }}>
          No tienes un grupo asignado. Contacta con tu coordinador académico.
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

          {slots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)', fontSize: '0.9rem' }}>
              El horario de tu grupo aún no está disponible.
            </div>
          ) : (
            <>
              {/* ── Tabla de horario semanal ── */}
              <div style={{
                overflowX: 'auto',
                borderRadius: 10,
                border: '1px solid #bbdefb',
                boxShadow: '0 2px 8px rgba(21,101,192,0.07)',
                marginBottom: 20,
              }}>
                <table style={{
                  width: '100%', borderCollapse: 'collapse',
                  fontSize: '0.875rem', minWidth: 480,
                }}>
                  <thead>
                    <tr style={{ background: '#1565c0', color: '#fff' }}>
                      <th style={{ ...thBase, width: 130, background: '#0d47a1' }}>Hora</th>
                      {dias.map(d => (
                        <th key={d} style={thBase}>{DIAS_ETIQUETA[d]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot, ri) => (
                      <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f5f9ff' }}>
                        {/* Columna de hora */}
                        <td style={{
                          ...tdBase,
                          fontWeight: 600, color: '#1565c0',
                          background: ri % 2 === 0 ? '#e8f1fb' : '#dbeafe',
                          borderRight: '2px solid #c7d9f0',
                          whiteSpace: 'nowrap', fontSize: '0.82rem',
                        }}>
                          {slot.hora_inicio} – {slot.hora_fin}
                        </td>

                        {/* Columnas de días */}
                        {dias.map(d => {
                          const celda = slot[d]
                          if (!celda) {
                            return (
                              <td key={d} style={{ ...tdBase, color: '#d0d7e2', fontSize: '0.78rem' }}>
                                —
                              </td>
                            )
                          }
                          const color = colorMap[celda.materia] || '#1565c0'
                          return (
                            <td key={d} style={tdBase}>
                              <span style={{
                                fontWeight: 700, color,
                                fontSize: '0.875rem', display: 'block',
                              }}>
                                {celda.materia}
                              </span>
                              {celda.aula && (
                                <span style={{
                                  fontSize: '0.72rem', color: '#6b7280',
                                  display: 'block', marginTop: 2,
                                }}>
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

              {/* ── Docentes por materia ── */}
              {Object.keys(docentes).length > 0 && (
                <div className="card" style={{ padding: '16px 22px' }}>
                  <h3 style={{
                    fontSize: '0.85rem', fontWeight: 700,
                    color: '#1565c0', marginBottom: 14,
                    textTransform: 'uppercase', letterSpacing: '0.3px',
                  }}>
                    Docentes
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 12,
                  }}>
                    {Object.entries(docentes).map(([materia, docente]) => {
                      const color = colorMap[materia] || '#1565c0'
                      return (
                        <div key={materia} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>
                            {materia}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                            {docente}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
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
