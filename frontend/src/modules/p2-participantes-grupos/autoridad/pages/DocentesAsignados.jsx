import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import StatusBadge from '@/shared/components/StatusBadge'
import { getDocentesAsignados } from '../services/autoridadService'
import { FiSearch } from 'react-icons/fi'

export default function DocentesAsignados() {
  const [asignaciones, setAsignaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    getDocentesAsignados()
      .then(r => setAsignaciones(r.data || []))
      .catch(e => setError(e.message || 'Error al cargar asignaciones.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = asignaciones.filter(a => {
    const s = search.toLowerCase()
    return (
      (a.docente_name || '').toLowerCase().includes(s) ||
      (a.materia_nombre || '').toLowerCase().includes(s) ||
      (a.grupo_codigo || '').toLowerCase().includes(s) ||
      (a.turno || '').toLowerCase().includes(s)
    )
  })

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Docentes Asignados</h1>
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            className="search-input"
            placeholder="Buscar por docente, materia, grupo, turno..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, color: '#991b1b', background: '#fee2e2', borderRadius: 'var(--radius)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Docente</th>
              <th>Registro</th>
              <th>Materia</th>
              <th>Grupo</th>
              <th>Turno</th>
              <th>Horario</th>
              <th>Aula</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id}>
                <td>
                  <div>
                    <strong>{a.docente_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>CI: {a.docente_ci}</div>
                  </div>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{a.docente_codigo}</td>
                <td><span className="badge badge-success" style={{ textTransform: 'none' }}>{a.materia_nombre}</span></td>
                <td><strong>{a.grupo_codigo}</strong></td>
                <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{a.turno}</span></td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--primary)', lineHeight: 1.4 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 400 }}>{a.dias_texto}</div>
                    {a.hora_inicio} – {a.hora_fin}
                  </div>
                </td>
                <td>{a.aula || <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Sin aula</span>}</td>
                <td><StatusBadge status={a.estado} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No se encontraron asignaciones de docentes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
