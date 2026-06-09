import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import StatusBadge from '@/shared/components/StatusBadge'
import { getGrupos } from '../services/autoridadService'
import { FiSearch } from 'react-icons/fi'

export default function GruposAutoridad() {
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    getGrupos()
      .then(r => setGrupos(r.data || []))
      .catch(e => setError(e.message || 'Error al cargar grupos.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = grupos.filter(g => {
    const s = search.toLowerCase()
    return (
      (g.codigo || '').toLowerCase().includes(s) ||
      (g.gestion || '').toLowerCase().includes(s) ||
      (g.turno || '').toLowerCase().includes(s) ||
      (g.aula || '').toLowerCase().includes(s)
    )
  })

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Grupos Habilitados</h1>
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            className="search-input"
            placeholder="Buscar por código, gestión, turno, aula..."
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
              <th>Código Grupo</th>
              <th>Gestión</th>
              <th>Turno</th>
              <th>Aula</th>
              <th>Materias</th>
              <th>Docentes</th>
              <th>Ocupación</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(g => {
              const pct = g.cupo_maximo > 0 ? Math.round((g.ocupacion / g.cupo_maximo) * 100) : 0
              const pctColor = pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--warning)' : 'var(--success)'
              return (
                <tr key={g.id}>
                  <td><strong>{g.codigo}</strong></td>
                  <td>{g.gestion}</td>
                  <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{g.turno}</span></td>
                  <td>{g.aula || <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Sin aula</span>}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-success">{g.materias_count ?? 0}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-info">{g.docentes_count ?? 0}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{g.ocupacion} / {g.cupo_maximo}</span>
                      <div style={{ width: 48, height: 6, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pctColor, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{pct}%</span>
                    </div>
                  </td>
                  <td><StatusBadge status={g.estado} /></td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No se encontraron grupos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
