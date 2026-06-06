import React, { useState, useEffect, useMemo } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import {
  getDocenteGrupos,
  getEstudiantesGrupo,
  guardarCalificacion,
} from '../services/docenteAcademicoService'
import { FiSave } from 'react-icons/fi'

const THRESHOLD = 60

function calcPromedio(nota_1, nota_2, nota_3) {
  const v = [nota_1, nota_2, nota_3].map(n => parseFloat(n))
  if (v.every(x => !isNaN(x))) {
    return ((v[0] + v[1] + v[2]) / 3).toFixed(2)
  }
  return null
}

function EstadoBadge({ promedio }) {
  if (promedio === null) {
    return <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>Pendiente</span>
  }
  const aprobado = parseFloat(promedio) >= THRESHOLD
  return (
    <span style={{
      background: aprobado ? '#e8f5e9' : '#ffebee',
      color:      aprobado ? '#2e7d32' : '#c62828',
      padding: '3px 10px', borderRadius: 20, fontSize: '0.76rem', fontWeight: 700,
    }}>
      {aprobado ? 'APROBADO' : 'REPROBADO'}
    </span>
  )
}

function NotaInput({ value, onChange, disabled }) {
  return (
    <input
      type="number"
      min={0}
      max={100}
      step="0.01"
      className="form-control"
      style={{ width: 80, textAlign: 'center', fontSize: '0.875rem' }}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder="—"
    />
  )
}

export default function Calificaciones() {
  const [grupos, setGrupos]     = useState([])
  const [grupoId, setGrupoId]   = useState('')
  const [grupoInfo, setGrupoInfo] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [notas, setNotas]       = useState({})   // {id: {nota_1, nota_2, nota_3}}
  const [saving, setSaving]     = useState({})   // {id: bool}
  const [msgs, setMsgs]         = useState({})   // {id: {type, text}}

  useEffect(() => {
    getDocenteGrupos().then(r => setGrupos(r.data || [])).catch(() => {})
  }, [])

  const cargar = async (id) => {
    setGrupoId(id)
    setGrupoInfo(null)
    setNotas({})
    setMsgs({})
    if (!id) return
    setLoading(true)
    try {
      const r = await getEstudiantesGrupo(id)
      setGrupoInfo(r.data)
      const init = {}
      r.data.estudiantes.forEach(e => {
        init[e.id] = {
          nota_1: e.nota_1 !== null && e.nota_1 !== undefined ? String(e.nota_1) : '',
          nota_2: e.nota_2 !== null && e.nota_2 !== undefined ? String(e.nota_2) : '',
          nota_3: e.nota_3 !== null && e.nota_3 !== undefined ? String(e.nota_3) : '',
        }
      })
      setNotas(init)
    } catch {
      setGrupoInfo(null)
    } finally {
      setLoading(false)
    }
  }

  const handleNota = (id, field, value) => {
    setNotas(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const guardar = async (postulanteId) => {
    setSaving(prev => ({ ...prev, [postulanteId]: true }))
    setMsgs(prev => ({ ...prev, [postulanteId]: null }))
    const n = notas[postulanteId] || {}
    try {
      await guardarCalificacion({
        postulante_id: postulanteId,
        grupo_id:      grupoId,
        nota_1:        n.nota_1 !== '' ? n.nota_1 : null,
        nota_2:        n.nota_2 !== '' ? n.nota_2 : null,
        nota_3:        n.nota_3 !== '' ? n.nota_3 : null,
      })
      setMsgs(prev => ({ ...prev, [postulanteId]: { type: 'success', text: 'Guardado' } }))
      // Refresh
      await cargar(grupoId)
    } catch {
      setMsgs(prev => ({ ...prev, [postulanteId]: { type: 'error', text: 'Error' } }))
    } finally {
      setSaving(prev => ({ ...prev, [postulanteId]: false }))
    }
  }

  // Promedio del grupo (solo estudiantes con las 3 notas)
  const promedioGrupo = useMemo(() => {
    if (!grupoInfo) return null
    const estudiantes = grupoInfo.estudiantes || []
    const completos = estudiantes.filter(e => {
      const n = notas[e.id] || {}
      return n.nota_1 !== '' && n.nota_2 !== '' && n.nota_3 !== ''
    })
    if (completos.length === 0) return null
    const sum = completos.reduce((acc, e) => {
      const p = calcPromedio(notas[e.id]?.nota_1, notas[e.id]?.nota_2, notas[e.id]?.nota_3)
      return acc + (p !== null ? parseFloat(p) : 0)
    }, 0)
    return (sum / completos.length).toFixed(2)
  }, [grupoInfo, notas])

  return (
    <Layout>
      <div className="page-header"><h1>Calificaciones</h1></div>

      {/* Selección de grupo */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: 200 }}>
            <label style={labelStyle}>Grupo</label>
            <select
              className="form-select"
              value={grupoId}
              onChange={e => cargar(e.target.value)}
            >
              <option value="">Seleccionar grupo</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>{g.codigo}{g.materia ? ` — ${g.materia}` : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><Loading /></div>}

      {!loading && grupoInfo && (
        <>
          {/* Info grupo */}
          <div style={{ marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
              Materia: <strong style={{ color: 'var(--gray-900)' }}>{grupoInfo.estudiantes?.length > 0 ? grupos.find(g => g.id == grupoId)?.materia || '—' : '—'}</strong>
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
              Estudiantes: <strong>{grupoInfo.estudiantes?.length ?? 0}</strong>
            </span>
            {promedioGrupo !== null && (
              <span style={{
                marginLeft: 'auto', padding: '4px 14px', borderRadius: 20,
                background: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: '0.875rem',
              }}>
                Promedio del grupo: {promedioGrupo}
              </span>
            )}
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Estudiante</th>
                  <th>CI</th>
                  <th style={{ textAlign: 'center' }}>Examen 1</th>
                  <th style={{ textAlign: 'center' }}>Examen 2</th>
                  <th style={{ textAlign: 'center' }}>Examen 3</th>
                  <th style={{ textAlign: 'center' }}>Promedio</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {(grupoInfo.estudiantes || []).map((e, i) => {
                  const n = notas[e.id] || {}
                  const p = calcPromedio(n.nota_1, n.nota_2, n.nota_3)
                  const isSaving = saving[e.id]
                  const rowMsg = msgs[e.id]

                  return (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: '0.78rem' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{e.nombre}</td>
                      <td style={{ color: 'var(--gray-600)' }}>{e.ci}</td>
                      <td style={{ textAlign: 'center' }}>
                        <NotaInput
                          value={n.nota_1 ?? ''}
                          onChange={v => handleNota(e.id, 'nota_1', v)}
                          disabled={isSaving}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <NotaInput
                          value={n.nota_2 ?? ''}
                          onChange={v => handleNota(e.id, 'nota_2', v)}
                          disabled={isSaving}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <NotaInput
                          value={n.nota_3 ?? ''}
                          onChange={v => handleNota(e.id, 'nota_3', v)}
                          disabled={isSaving}
                        />
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                        {p !== null ? p : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <EstadoBadge promedio={p} />
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => guardar(e.id)}
                            disabled={isSaving}
                            title="Guardar calificaciones"
                          >
                            <FiSave />
                            {isSaving ? '...' : 'Guardar'}
                          </button>
                          {rowMsg && (
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 600,
                              color: rowMsg.type === 'success' ? '#2e7d32' : '#c62828',
                            }}>
                              {rowMsg.text}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {(grupoInfo.estudiantes || []).length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)', fontSize: '0.9rem' }}>
              El grupo no tiene estudiantes registrados
            </div>
          )}
        </>
      )}
    </Layout>
  )
}

const labelStyle = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: 'var(--gray-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px',
}
