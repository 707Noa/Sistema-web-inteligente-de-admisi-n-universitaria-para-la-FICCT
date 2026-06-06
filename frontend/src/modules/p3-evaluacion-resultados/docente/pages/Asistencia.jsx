import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import {
  getDocenteGrupos,
  getEstudiantesGrupo,
  getAsistencia,
  guardarAsistencia,
} from '../services/docenteAcademicoService'
import { FiSave, FiRefreshCw } from 'react-icons/fi'

const ESTADOS = ['presente', 'ausente', 'licencia']

const ESTADO_STYLE = {
  presente: { bg: '#e8f5e9', text: '#2e7d32' },
  ausente:  { bg: '#ffebee', text: '#c62828' },
  licencia: { bg: '#fff8e1', text: '#f57f17' },
}

function EstadoSelect({ value, onChange }) {
  return (
    <select
      className="form-select"
      style={{ minWidth: 120, fontSize: '0.85rem' }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {ESTADOS.map(e => (
        <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
      ))}
    </select>
  )
}

export default function Asistencia() {
  const [grupos, setGrupos]     = useState([])
  const [grupoId, setGrupoId]   = useState('')
  const [fecha, setFecha]       = useState(new Date().toISOString().slice(0, 10))
  const [filas, setFilas]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [loaded, setLoaded]     = useState(false)
  const [msg, setMsg]           = useState(null) // {type: 'success'|'error', text}

  useEffect(() => {
    getDocenteGrupos().then(r => setGrupos(r.data || [])).catch(() => {})
  }, [])

  const cargar = async () => {
    if (!grupoId || !fecha) return
    setLoading(true)
    setMsg(null)
    try {
      const [estudRes, asistRes] = await Promise.all([
        getEstudiantesGrupo(grupoId),
        getAsistencia({ grupo_id: grupoId, fecha }),
      ])
      const estudiantes = estudRes.data?.estudiantes || []
      const asistencias = asistRes.data || []

      const existingMap = {}
      asistencias.forEach(a => { existingMap[a.postulante_id] = a.estado })

      setFilas(estudiantes.map(e => ({
        postulante_id: e.id,
        nombre: e.nombre,
        ci: e.ci,
        estado: existingMap[e.id] || 'presente',
      })))
      setLoaded(true)
    } catch {
      setFilas([])
      setMsg({ type: 'error', text: 'Error al cargar estudiantes.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEstado = (postulanteId, estado) => {
    setFilas(prev => prev.map(f => f.postulante_id === postulanteId ? { ...f, estado } : f))
  }

  const marcarTodos = (estado) => {
    setFilas(prev => prev.map(f => ({ ...f, estado })))
  }

  const guardar = async () => {
    if (filas.length === 0) return
    setSaving(true)
    setMsg(null)
    try {
      await guardarAsistencia({
        grupo_id: grupoId,
        fecha,
        registros: filas.map(f => ({ postulante_id: f.postulante_id, estado: f.estado })),
      })
      setMsg({ type: 'success', text: `Asistencia guardada para ${filas.length} estudiante(s).` })
    } catch {
      setMsg({ type: 'error', text: 'Error al guardar la asistencia.' })
    } finally {
      setSaving(false)
    }
  }

  const presentes  = filas.filter(f => f.estado === 'presente').length
  const ausentes   = filas.filter(f => f.estado === 'ausente').length
  const licencias  = filas.filter(f => f.estado === 'licencia').length

  return (
    <Layout>
      <div className="page-header"><h1>Asistencia</h1></div>

      {/* Controles de selección */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: 180 }}>
            <label style={labelStyle}>Grupo</label>
            <select
              className="form-select"
              value={grupoId}
              onChange={e => { setGrupoId(e.target.value); setLoaded(false); setFilas([]) }}
            >
              <option value="">Seleccionar grupo</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>{g.codigo}{g.materia ? ` — ${g.materia}` : ''}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1', minWidth: 160 }}>
            <label style={labelStyle}>Fecha</label>
            <input
              type="date"
              className="form-control"
              value={fecha}
              onChange={e => { setFecha(e.target.value); setLoaded(false); setFilas([]) }}
            />
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={cargar}
            disabled={!grupoId || !fecha || loading}
          >
            {loading ? <FiRefreshCw style={{ animation: 'spin 1s linear infinite' }} /> : null}
            Cargar estudiantes
          </button>
        </div>
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 6, fontSize: '0.875rem',
          background: msg.type === 'success' ? '#e8f5e9' : '#ffebee',
          color: msg.type === 'success' ? '#2e7d32' : '#c62828',
          border: `1px solid ${msg.type === 'success' ? '#a5d6a7' : '#ef9a9a'}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Tabla de asistencia */}
      {loaded && filas.length > 0 && (
        <>
          {/* Resumen + acciones rápidas */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <span style={{ ...pillStyle, ...ESTADO_STYLE.presente }}>Presentes: {presentes}</span>
            <span style={{ ...pillStyle, ...ESTADO_STYLE.ausente }}>Ausentes: {ausentes}</span>
            {licencias > 0 && (
              <span style={{ ...pillStyle, ...ESTADO_STYLE.licencia }}>Licencias: {licencias}</span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => marcarTodos('presente')}>
                Marcar todos presentes
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => marcarTodos('ausente')}>
                Marcar todos ausentes
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Estudiante</th>
                  <th>CI</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={f.postulante_id}>
                    <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{f.nombre}</td>
                    <td style={{ color: 'var(--gray-600)' }}>{f.ci}</td>
                    <td>
                      <EstadoSelect
                        value={f.estado}
                        onChange={estado => handleEstado(f.postulante_id, estado)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              className="btn btn-primary"
              onClick={guardar}
              disabled={saving}
              style={{ minWidth: 160 }}
            >
              <FiSave />
              {saving ? 'Guardando...' : 'Guardar asistencia'}
            </button>
          </div>
        </>
      )}

      {loaded && filas.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)', fontSize: '0.9rem' }}>
          El grupo no tiene estudiantes registrados
        </div>
      )}
    </Layout>
  )
}

const labelStyle = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: 'var(--gray-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px',
}

const pillStyle = {
  padding: '3px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
}
