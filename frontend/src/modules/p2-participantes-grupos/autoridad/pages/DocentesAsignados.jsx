import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
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
      a.docente_name.toLowerCase().includes(s) ||
      a.materia_nombre.toLowerCase().includes(s) ||
      a.grupo_codigo.toLowerCase().includes(s) ||
      a.carrera.toLowerCase().includes(s)
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
            placeholder="Buscar por docente, materia, grupo..."
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
              <th>Carrera</th>
              <th>Horario</th>
              <th>Aula</th>
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
                <td>{a.carrera}</td>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {a.dia} · {a.hora_inicio} - {a.hora_fin}
                  </span>
                </td>
                <td>{a.aula}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
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
