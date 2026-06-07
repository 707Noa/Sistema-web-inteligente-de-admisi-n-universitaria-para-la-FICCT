import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getMisGrupos, getNotas, guardarNotas } from '../services/docenteService'
import { FiCheckCircle, FiAlertCircle, FiSave, FiRefreshCw } from 'react-icons/fi'

export default function RegistroNotas() {
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)

  const [grupoId, setGrupoId] = useState('')
  const [materiaId, setMateriaId] = useState('')
  const [materiasDisponibles, setMateriasDisponibles] = useState([])

  const [estudiantes, setEstudiantes] = useState([])
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    getMisGrupos()
      .then(r => setGrupos(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 6000)
  }

  const handleGrupoChange = (gid) => {
    setGrupoId(gid)
    setMateriaId('')
    setEstudiantes([])
    if (!gid) {
      setMateriasDisponibles([])
      return
    }
    const grp = grupos.find(x => String(x.id) === String(gid))
    setMateriasDisponibles(grp?.materias || [])
  }

  const handleCargarNotas = async () => {
    if (!grupoId || !materiaId) return
    setLoadingEstudiantes(true)
    try {
      const r = await getNotas({ grupo_id: grupoId, materia_id: materiaId })
      setEstudiantes(r.data || [])
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Error al cargar notas.')
    } finally {
      setLoadingEstudiantes(false)
    }
  }

  useEffect(() => {
    if (grupoId && materiaId) {
      handleCargarNotas()
    }
  }, [grupoId, materiaId])

  const handleNotaChange = (index, field, val) => {
    if (val !== '' && (isNaN(val) || parseFloat(val) < 0 || parseFloat(val) > 100)) {
      return // Prevent values outside 0-100
    }
    setEstudiantes(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }

      // Dynamic average calculation
      const n1 = copy[index].nota_1 !== '' && copy[index].nota_1 !== null ? parseFloat(copy[index].nota_1) : null
      const n2 = copy[index].nota_2 !== '' && copy[index].nota_2 !== null ? parseFloat(copy[index].nota_2) : null
      const n3 = copy[index].nota_3 !== '' && copy[index].nota_3 !== null ? parseFloat(copy[index].nota_3) : null

      if (n1 !== null && n2 !== null && n3 !== null) {
        copy[index].promedio = ((n1 + n2 + n3) / 3).toFixed(2)
      } else {
        copy[index].promedio = null
      }
      return copy
    })
  }

  const handleGuardarTodo = async () => {
    // Validate all inputs before saving
    for (let est of estudiantes) {
      const n1 = est.nota_1
      const n2 = est.nota_2
      const n3 = est.nota_3
      if (
        (n1 !== '' && n1 !== null && (n1 < 0 || n1 > 100)) ||
        (n2 !== '' && n2 !== null && (n2 < 0 || n2 > 100)) ||
        (n3 !== '' && n3 !== null && (n3 < 0 || n3 > 100))
      ) {
        return showMsg('error', `Las notas del postulante ${est.name} deben estar entre 0 y 100.`)
      }
    }

    setSaving(true)
    try {
      const payload = estudiantes.map(e => ({
        postulante_id: e.postulante_id,
        grupo_id: grupoId,
        materia_id: materiaId,
        nota_1: e.nota_1,
        nota_2: e.nota_2,
        nota_3: e.nota_3,
      }))
      await guardarNotas({ notas: payload })
      showMsg('success', 'Notas registradas correctamente.')
      handleCargarNotas()
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Error al guardar notas.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Registro de Notas</h1>
        {estudiantes.length > 0 && (
          <button className="btn btn-primary" onClick={handleGuardarTodo} disabled={saving}>
            {saving ? <><FiRefreshCw style={{ animation: 'spin 0.8s linear infinite' }} /> Guardando...</> : <><FiSave /> Guardar Todo</>}
          </button>
        )}
      </div>

      {msg && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center', padding: '10px 16px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: '0.875rem',
          background: msg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
          color: msg.type === 'success' ? '#065f46' : '#991b1b'
        }}>
          {msg.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />} {msg.text}
        </div>
      )}

      {/* Selectores */}
      <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <label className="form-label">Grupo</label>
          <select className="form-select" value={grupoId} onChange={e => handleGrupoChange(e.target.value)}>
            <option value="">Seleccione grupo...</option>
            {grupos.map(g => (
              <option key={g.id} value={g.id}>{g.codigo} — {g.turno}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <label className="form-label">Materia</label>
          <select className="form-select" value={materiaId} onChange={e => setMateriaId(e.target.value)} disabled={!grupoId}>
            <option value="">Seleccione materia...</option>
            {materiasDisponibles.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingEstudiantes ? <Loading /> : (
        grupoId && materiaId && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Postulante</th>
                    <th>CI</th>
                    <th style={{ width: 110 }}>Nota 1</th>
                    <th style={{ width: 110 }}>Nota 2</th>
                    <th style={{ width: 110 }}>Nota 3</th>
                    <th style={{ width: 110, textAlign: 'center' }}>Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantes.map((e, index) => (
                    <tr key={e.postulante_id}>
                      <td>
                        <strong>{e.name}</strong>
                      </td>
                      <td>{e.ci}</td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          min="0"
                          max="100"
                          value={e.nota_1 ?? ''}
                          onChange={ev => handleNotaChange(index, 'nota_1', ev.target.value)}
                          placeholder="—"
                          style={{ padding: '6px 10px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          min="0"
                          max="100"
                          value={e.nota_2 ?? ''}
                          onChange={ev => handleNotaChange(index, 'nota_2', ev.target.value)}
                          placeholder="—"
                          style={{ padding: '6px 10px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          min="0"
                          max="100"
                          value={e.nota_3 ?? ''}
                          onChange={ev => handleNotaChange(index, 'nota_3', ev.target.value)}
                          placeholder="—"
                          style={{ padding: '6px 10px' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', color: e.promedio ? (parseFloat(e.promedio) >= 51 ? 'var(--success)' : 'var(--danger)') : 'var(--gray-400)' }}>
                        {e.promedio !== null && e.promedio !== undefined ? e.promedio : '—'}
                      </td>
                    </tr>
                  ))}
                  {estudiantes.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                        Sin postulantes asignados en este grupo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </Layout>
  )
}
