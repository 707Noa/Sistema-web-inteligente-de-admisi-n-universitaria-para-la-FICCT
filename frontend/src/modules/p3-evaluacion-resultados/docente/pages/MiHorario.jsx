import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getDocenteHorario } from '../services/docenteAcademicoService'
import { FiRefreshCw } from 'react-icons/fi'

const TURNO_STYLE = {
  mañana: { bg: '#e8f5e9', text: '#2e7d32' },
  tarde:  { bg: '#fff3e0', text: '#e65100' },
  noche:  { bg: '#ede7f6', text: '#4527a0' },
}

function TurnoBadge({ turno }) {
  const t = (turno || '').toLowerCase()
  const s = TURNO_STYLE[t] || { bg: '#f0f0f0', text: '#555' }
  return (
    <span style={{
      background: s.bg, color: s.text,
      padding: '2px 10px', borderRadius: 20,
      fontSize: '0.76rem', fontWeight: 600, textTransform: 'capitalize',
    }}>
      {turno}
    </span>
  )
}

export default function MiHorario() {
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetchHorario = () => {
    setLoading(true)
    getDocenteHorario()
      .then(r => setRows(r.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchHorario() }, [])

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Mi Horario</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchHorario} title="Actualizar">
            <FiRefreshCw />
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Materia</th>
              <th>Horario</th>
              <th>Aula</th>
              <th>Turno</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No hay horarios asignados
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i}>
                  <td><strong>{r.grupo_codigo || '—'}</strong></td>
                  <td>
                    <span className="badge badge-info" style={{ textTransform: 'none' }}>
                      {r.materia}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                    {r.hora_inicio} – {r.hora_fin}
                  </td>
                  <td>{r.aula || '—'}</td>
                  <td><TurnoBadge turno={r.turno} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <p style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 8 }}>
          {rows.length} clase(s) asignada(s)
        </p>
      )}
    </Layout>
  )
}
