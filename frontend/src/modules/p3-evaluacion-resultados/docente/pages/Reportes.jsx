import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import {
  getDocenteGrupos,
  exportarCalificaciones,
  exportarAsistencia,
} from '../services/docenteAcademicoService'
import { FiDownload } from 'react-icons/fi'

export default function Reportes() {
  const [grupos, setGrupos]             = useState([])
  const [grupoCalif, setGrupoCalif]     = useState('')
  const [estadoCalif, setEstadoCalif]   = useState('')
  const [grupoAsist, setGrupoAsist]     = useState('')
  const [fechaInicio, setFechaInicio]   = useState('')
  const [fechaFin, setFechaFin]         = useState('')
  const [estadoAsist, setEstadoAsist]   = useState('')

  useEffect(() => {
    getDocenteGrupos().then(r => setGrupos(r.data || [])).catch(() => {})
  }, [])

  const exportCalif = () => {
    const params = {}
    if (grupoCalif)  params.grupo_id = grupoCalif
    if (estadoCalif) params.estado   = estadoCalif
    exportarCalificaciones(params)
  }

  const exportAsist = () => {
    const params = {}
    if (grupoAsist)  params.grupo_id    = grupoAsist
    if (fechaInicio) params.fecha_inicio = fechaInicio
    if (fechaFin)    params.fecha_fin    = fechaFin
    if (estadoAsist) params.estado      = estadoAsist
    exportarAsistencia(params)
  }

  return (
    <Layout>
      <div className="page-header"><h1>Reportes</h1></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Reporte de Calificaciones */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: '1rem', color: 'var(--gray-800)', fontWeight: 600 }}>
            Reporte de Calificaciones
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 16 }}>
            Exporta las calificaciones de tu materia. Incluye: estudiante, CI, exámenes, promedio y estado.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: '1', minWidth: 160 }}>
              <label style={labelStyle}>Grupo</label>
              <select className="form-select" value={grupoCalif} onChange={e => setGrupoCalif(e.target.value)}>
                <option value="">Todos los grupos</option>
                {grupos.map(g => (
                  <option key={g.id} value={g.id}>{g.codigo}{g.materia ? ` — ${g.materia}` : ''}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: 160 }}>
              <label style={labelStyle}>Estado</label>
              <select className="form-select" value={estadoCalif} onChange={e => setEstadoCalif(e.target.value)}>
                <option value="">Todos</option>
                <option value="APROBADO">Aprobado</option>
                <option value="REPROBADO">Reprobado</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary" onClick={exportCalif}>
            <FiDownload /> Exportar CSV
          </button>
        </div>

        {/* Reporte de Asistencia */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: '1rem', color: 'var(--gray-800)', fontWeight: 600 }}>
            Reporte de Asistencia
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 16 }}>
            Exporta los registros de asistencia. Puedes filtrar por grupo, rango de fechas y estado.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: '1', minWidth: 160 }}>
              <label style={labelStyle}>Grupo</label>
              <select className="form-select" value={grupoAsist} onChange={e => setGrupoAsist(e.target.value)}>
                <option value="">Todos los grupos</option>
                {grupos.map(g => (
                  <option key={g.id} value={g.id}>{g.codigo}{g.materia ? ` — ${g.materia}` : ''}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: 140 }}>
              <label style={labelStyle}>Fecha inicio</label>
              <input
                type="date" className="form-control"
                value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              />
            </div>
            <div style={{ flex: '1', minWidth: 140 }}>
              <label style={labelStyle}>Fecha fin</label>
              <input
                type="date" className="form-control"
                value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              />
            </div>
            <div style={{ flex: '1', minWidth: 140 }}>
              <label style={labelStyle}>Estado</label>
              <select className="form-select" value={estadoAsist} onChange={e => setEstadoAsist(e.target.value)}>
                <option value="">Todos</option>
                <option value="presente">Presente</option>
                <option value="ausente">Ausente</option>
                <option value="licencia">Licencia</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary" onClick={exportAsist}>
            <FiDownload /> Exportar CSV
          </button>
        </div>

      </div>
    </Layout>
  )
}

const labelStyle = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: 'var(--gray-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px',
}
