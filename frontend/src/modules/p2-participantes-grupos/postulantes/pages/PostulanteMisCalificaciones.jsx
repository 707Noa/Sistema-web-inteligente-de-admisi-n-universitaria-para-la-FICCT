import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getPostulanteCalificaciones } from '../services/postulanteService'
import { FiRefreshCw } from 'react-icons/fi'

// ── Constantes ────────────────────────────────────────────────────────────────

const ESTADO_BADGE = {
  aprobado:  { bg: '#e8f5e9', text: '#2e7d32', label: 'APROBADO' },
  reprobado: { bg: '#fce4ec', text: '#c62828', label: 'REPROBADO' },
  pendiente: { bg: '#fff8e1', text: '#f57f17', label: 'PENDIENTE' },
}

const ESTADO_GENERAL = {
  aprobado:   { bg: '#e8f5e9', text: '#2e7d32', label: 'APROBADO' },
  reprobado:  { bg: '#fce4ec', text: '#c62828', label: 'REPROBADO' },
  en_proceso: { bg: '#e3f2fd', text: '#1565c0', label: 'EN PROCESO' },
  sin_datos:  { bg: '#f5f5f5', text: '#757575', label: 'SIN DATOS' },
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PostulanteMisCalificaciones() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = () => {
    setLoading(true)
    getPostulanteCalificaciones()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <Layout><Loading /></Layout>

  const materias        = data?.materias          || []
  const promedioGeneral = data?.promedio_general  ?? null
  const estadoGeneral   = data?.estado_general    || 'sin_datos'
  const egEstilo        = ESTADO_GENERAL[estadoGeneral] || ESTADO_GENERAL.sin_datos

  return (
    <Layout>
      <div className="page-header">
        <h1>Mis Calificaciones</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchData} title="Actualizar">
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {materias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)', fontSize: '0.95rem' }}>
          No hay calificaciones registradas aún.
        </div>
      ) : (
        <>
          {/* ── Tabla de calificaciones ── */}
          <div className="card" style={{ overflowX: 'auto', marginBottom: 20, padding: 0 }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: '0.875rem', minWidth: 560,
            }}>
              <thead>
                <tr style={{ background: '#1565c0', color: '#fff' }}>
                  <th style={{ ...thBase, textAlign: 'left', paddingLeft: 20 }}>Materia</th>
                  <th style={thBase}>Parcial 1</th>
                  <th style={thBase}>Parcial 2</th>
                  <th style={thBase}>Parcial 3</th>
                  <th style={thBase}>Promedio</th>
                  <th style={{ ...thBase, borderRight: 'none' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {materias.map((m, i) => {
                  const eb = ESTADO_BADGE[m.estado] || ESTADO_BADGE.pendiente
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f5f9ff' }}>
                      <td style={{
                        ...tdBase, textAlign: 'left', paddingLeft: 20,
                        fontWeight: 600, color: 'var(--gray-800)',
                      }}>
                        {m.materia}
                      </td>
                      <td style={tdBase}>{m.parcial_1 ?? '—'}</td>
                      <td style={tdBase}>{m.parcial_2 ?? '—'}</td>
                      <td style={tdBase}>{m.parcial_3 ?? '—'}</td>
                      <td style={{ ...tdBase, fontWeight: 700, color: '#1565c0' }}>
                        {m.promedio !== null ? m.promedio : '—'}
                      </td>
                      <td style={{ ...tdBase, borderRight: 'none' }}>
                        <span style={{
                          background: eb.bg, color: eb.text,
                          padding: '3px 10px', borderRadius: 20,
                          fontSize: '0.75rem', fontWeight: 700,
                        }}>
                          {eb.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Resultado académico general ── */}
          <div className="card" style={{ padding: '20px 24px', maxWidth: 440 }}>
            <h3 style={{
              fontSize: '0.85rem', fontWeight: 700,
              color: '#1565c0', marginBottom: 16,
              textTransform: 'uppercase', letterSpacing: '0.3px',
            }}>
              Resultado Académico
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.77rem', color: 'var(--gray-500)', marginBottom: 4 }}>
                  Promedio General
                </div>
                <div style={{
                  fontSize: '1.6rem', fontWeight: 800,
                  color: promedioGeneral !== null ? '#1565c0' : 'var(--gray-400)',
                }}>
                  {promedioGeneral !== null ? promedioGeneral : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.77rem', color: 'var(--gray-500)', marginBottom: 6 }}>
                  Estado Académico
                </div>
                <span style={{
                  background: egEstilo.bg, color: egEstilo.text,
                  padding: '6px 18px', borderRadius: 20,
                  fontSize: '0.85rem', fontWeight: 700,
                }}>
                  {egEstilo.label}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}

// ── Estilos base de tabla ─────────────────────────────────────────────────────

const thBase = {
  padding: '11px 14px',
  textAlign: 'center',
  fontWeight: 600,
  fontSize: '0.82rem',
  letterSpacing: '0.3px',
  borderRight: '1px solid rgba(255,255,255,0.15)',
}

const tdBase = {
  padding: '10px 12px',
  textAlign: 'center',
  border: '1px solid #e8f1fb',
  verticalAlign: 'middle',
}
