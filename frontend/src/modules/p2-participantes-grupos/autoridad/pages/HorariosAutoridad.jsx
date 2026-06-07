import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getHorarios } from '../services/autoridadService'
import { FiSearch } from 'react-icons/fi'

export default function HorariosAutoridad() {
  const [horarios, setHorarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [diaFiltro, setDiaFiltro] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    getHorarios()
      .then(r => setHorarios(r.data || []))
      .catch(e => setError(e.message || 'Error al cargar horarios.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = horarios.filter(h => {
    const s = search.toLowerCase()
    const matchesSearch = (
      h.grupo_codigo.toLowerCase().includes(s) ||
      h.carrera.toLowerCase().includes(s) ||
      h.materia_nombre.toLowerCase().includes(s) ||
      h.docente_name.toLowerCase().includes(s) ||
      h.aula.toLowerCase().includes(s)
    )
    const matchesDia = !diaFiltro || h.dia.toLowerCase() === diaFiltro.toLowerCase()
    return matchesSearch && matchesDia
  })

  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Horarios</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: 150 }}
            value={diaFiltro}
            onChange={e => setDiaFiltro(e.target.value)}
          >
            <option value="">Todos los días</option>
            {dias.map(d => (
              <option key={d} value={d} style={{ textTransform: 'capitalize' }}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por grupo, carrera, materia, docente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
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
              <th>Grupo</th>
              <th>Carrera</th>
              <th>Materia</th>
              <th>Docente</th>
              <th>Día</th>
              <th>Horario</th>
              <th>Aula</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(h => (
              <tr key={h.id}>
                <td><strong>{h.grupo_codigo}</strong></td>
                <td>{h.carrera}</td>
                <td><span className="badge badge-info" style={{ textTransform: 'none' }}>{h.materia_nombre}</span></td>
                <td>{h.docente_name}</td>
                <td style={{ textTransform: 'capitalize' }}>{h.dia}</td>
                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  {h.hora_inicio} - {h.hora_fin}
                </td>
                <td>{h.aula}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No se encontraron horarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
