import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getMisEstudiantes } from '../services/docenteService'
import { FiSearch, FiUser } from 'react-icons/fi'

export default function MisEstudiantes() {
  const [estudiantes, setEstudiantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    getMisEstudiantes()
      .then(r => setEstudiantes(r.data || []))
      .catch(e => setError(e.message || 'Error al cargar estudiantes.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = estudiantes.filter(e => {
    const s = search.toLowerCase()
    return (
      e.name.toLowerCase().includes(s) ||
      (e.ci && e.ci.toLowerCase().includes(s)) ||
      (e.grupo_codigo && e.grupo_codigo.toLowerCase().includes(s)) ||
      (e.carrera_postulada && e.carrera_postulada.toLowerCase().includes(s))
    )
  })

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Mis Estudiantes</h1>
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            className="search-input"
            placeholder="Buscar por nombre, CI, grupo o carrera..."
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
              <th>Nombre Completo</th>
              <th>CI</th>
              <th>Carrera</th>
              <th>Grupo</th>
              <th>Materia(s)</th>
              <th>Estado Inscripción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--primary-gradient)',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 'bold'
                    }}>
                      {e.name[0].toUpperCase()}
                    </div>
                    <strong>{e.name}</strong>
                  </div>
                </td>
                <td>{e.ci || '-'}</td>
                <td>{e.carrera_postulada || '-'}</td>
                <td>
                  <span className="badge badge-info">{e.grupo_codigo}</span>
                </td>
                <td>
                  <span className="badge badge-success" style={{ textTransform: 'none' }}>{e.materia || 'Sin asignar'}</span>
                </td>
                <td>
                  <span className={`badge ${e.estado_tramite === 'INSCRITO' ? 'badge-success' : 'badge-warning'}`}>
                    {e.estado_tramite || 'pendiente'}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No se encontraron estudiantes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
