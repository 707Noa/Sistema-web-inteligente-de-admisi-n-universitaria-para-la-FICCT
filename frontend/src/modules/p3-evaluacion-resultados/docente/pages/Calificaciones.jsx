import React, { useState, useEffect, useMemo } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import api from '@/shared/services/api'
import {
  getDocenteGrupos,
  getEstudiantesGrupo,
  guardarCalificacion,
} from '../services/docenteAcademicoService'
import { FiSave, FiDownload, FiUpload, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi'

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
  const [originalNotas, setOriginalNotas] = useState({})
  const [selectedEstudiantes, setSelectedEstudiantes] = useState({})
  const [savingMasivo, setSavingMasivo] = useState(false)
  const [masivoErrorMsg, setMasivoErrorMsg] = useState('')
  const [masivoSuccessMsg, setMasivoSuccessMsg] = useState('')

  // Estado de CSV
  const [csvFile, setCsvFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState(null)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [importandoCsv, setImportandoCsv] = useState(false)

  useEffect(() => {
    getDocenteGrupos().then(r => setGrupos(r.data || [])).catch(() => {})
  }, [])

  const cargar = async (id) => {
    setGrupoId(id)
    setGrupoInfo(null)
    setNotas({})
    setMsgs({})
    setCsvPreview(null)
    setCsvFile(null)
    setMasivoErrorMsg('')
    setMasivoSuccessMsg('')
    setSelectedEstudiantes({})
    if (!id) return
    setLoading(true)
    try {
      const r = await getEstudiantesGrupo(id)
      setGrupoInfo(r.data)
      const init = {}
      const orig = {}
      r.data.estudiantes.forEach(e => {
        const val = {
          nota_1: e.nota_1 !== null && e.nota_1 !== undefined ? String(e.nota_1) : '',
          nota_2: e.nota_2 !== null && e.nota_2 !== undefined ? String(e.nota_2) : '',
          nota_3: e.nota_3 !== null && e.nota_3 !== undefined ? String(e.nota_3) : '',
        }
        init[e.id] = { ...val }
        orig[e.id] = { ...val }
      })
      setNotas(init)
      setOriginalNotas(orig)
    } catch {
      setGrupoInfo(null)
    } finally {
      setLoading(false)
    }
  }

  const handleNota = (id, field, value) => {
    setNotas(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
    setMsgs(prev => ({ ...prev, [id]: null }))
    setMasivoErrorMsg('')
    setMasivoSuccessMsg('')
  }

  const hasChanges = (estudianteId) => {
    const n = notas[estudianteId] || {}
    const orig = originalNotas[estudianteId] || {}
    return (n.nota_1 ?? '') !== (orig.nota_1 ?? '') ||
           (n.nota_2 ?? '') !== (orig.nota_2 ?? '') ||
           (n.nota_3 ?? '') !== (orig.nota_3 ?? '')
  }

  const validarEstudiante = (e, n) => {
    const fields = ['nota_1', 'nota_2', 'nota_3']
    for (const f of fields) {
      const val = n[f]
      if (val !== '' && val !== null && val !== undefined) {
        if (isNaN(val) || isNaN(parseFloat(val))) {
          return 'Debe ser un valor numérico.'
        }
        const num = parseFloat(val)
        if (num < 0 || num > 100) {
          return 'Debe estar entre 0 y 100.'
        }
      }
    }
    return null
  }

  const guardar = async (postulanteId) => {
    setSaving(prev => ({ ...prev, [postulanteId]: true }))
    setMsgs(prev => ({ ...prev, [postulanteId]: null }))
    const n = notas[postulanteId] || {}
    const e = grupoInfo.estudiantes.find(est => est.id === postulanteId)

    const error = validarEstudiante(e, n)
    if (error) {
      setMsgs(prev => ({ ...prev, [postulanteId]: { type: 'error', text: error } }))
      setSaving(prev => ({ ...prev, [postulanteId]: false }))
      return
    }

    try {
      await guardarCalificacion({
        postulante_id: postulanteId,
        grupo_id:      grupoId,
        nota_1:        n.nota_1 !== '' ? n.nota_1 : null,
        nota_2:        n.nota_2 !== '' ? n.nota_2 : null,
        nota_3:        n.nota_3 !== '' ? n.nota_3 : null,
      })
      setMsgs(prev => ({ ...prev, [postulanteId]: { type: 'success', text: 'Guardado' } }))
      
      // Actualizar originalNotas localmente para este estudiante
      setOriginalNotas(prev => ({
        ...prev,
        [postulanteId]: {
          nota_1: n.nota_1,
          nota_2: n.nota_2,
          nota_3: n.nota_3
        }
      }))
      
      await reloadEstudiantesKeepSelections()
    } catch (err) {
      setMsgs(prev => ({ ...prev, [postulanteId]: { type: 'error', text: err.response?.data?.message || 'Error' } }))
    } finally {
      setSaving(prev => ({ ...prev, [postulanteId]: false }))
    }
  }

  const handleGuardarSeleccionados = async () => {
    setMasivoErrorMsg('')
    setMasivoSuccessMsg('')
    
    const selectedIds = Object.keys(selectedEstudiantes).filter(id => selectedEstudiantes[id])
    if (selectedIds.length === 0) {
      setMasivoErrorMsg('Selecciona al menos un estudiante para guardar las notas.')
      return
    }

    const toSave = []
    let hasValidationError = false
    const newMsgs = { ...msgs }

    selectedIds.forEach(id => {
      const e = grupoInfo.estudiantes.find(est => String(est.id) === id)
      if (!e) return
      const n = notas[id] || { nota_1: '', nota_2: '', nota_3: '' }
      
      const error = validarEstudiante(e, n)
      if (error) {
        newMsgs[id] = { type: 'error', text: error }
        hasValidationError = true
      } else {
        toSave.push({
          postulante_id: e.id,
          nota_1: n.nota_1 !== '' ? n.nota_1 : null,
          nota_2: n.nota_2 !== '' ? n.nota_2 : null,
          nota_3: n.nota_3 !== '' ? n.nota_3 : null,
        })
      }
    })

    if (hasValidationError) {
      setMsgs(newMsgs)
      setMasivoErrorMsg('No se pudieron guardar algunas notas. Revisa las filas marcadas con error.')
      return
    }

    setSavingMasivo(true)
    try {
      const res = await api.post('/docente/calificaciones/masivo', {
        grupo_id: grupoId,
        calificaciones: toSave
      })
      setMasivoSuccessMsg(res.data?.message || 'Calificaciones guardadas con éxito.')
      
      const nextOrig = { ...originalNotas }
      toSave.forEach(item => {
        nextOrig[item.postulante_id] = {
          nota_1: item.nota_1 !== null ? String(item.nota_1) : '',
          nota_2: item.nota_2 !== null ? String(item.nota_2) : '',
          nota_3: item.nota_3 !== null ? String(item.nota_3) : '',
        }
        newMsgs[item.postulante_id] = { type: 'success', text: 'Guardado' }
      })
      setOriginalNotas(nextOrig)
      setMsgs(newMsgs)
      
      await reloadEstudiantesKeepSelections()
    } catch (err) {
      setMasivoErrorMsg(err.response?.data?.message || 'Error al guardar calificaciones.')
    } finally {
      setSavingMasivo(false)
    }
  }

  const handleGuardarTodo = async () => {
    setMasivoErrorMsg('')
    setMasivoSuccessMsg('')
    
    if (!grupoInfo || !grupoInfo.estudiantes || grupoInfo.estudiantes.length === 0) {
      return
    }

    const toSave = []
    let hasValidationError = false
    const newMsgs = { ...msgs }

    grupoInfo.estudiantes.forEach(e => {
      const n = notas[e.id] || { nota_1: '', nota_2: '', nota_3: '' }
      
      const error = validarEstudiante(e, n)
      if (error) {
        newMsgs[e.id] = { type: 'error', text: error }
        hasValidationError = true
      } else {
        toSave.push({
          postulante_id: e.id,
          nota_1: n.nota_1 !== '' ? n.nota_1 : null,
          nota_2: n.nota_2 !== '' ? n.nota_2 : null,
          nota_3: n.nota_3 !== '' ? n.nota_3 : null,
        })
      }
    })

    if (hasValidationError) {
      setMsgs(newMsgs)
      setMasivoErrorMsg('No se pudieron guardar algunas notas. Revisa las filas marcadas con error.')
      return
    }

    setSavingMasivo(true)
    try {
      const res = await api.post('/docente/calificaciones/masivo', {
        grupo_id: grupoId,
        calificaciones: toSave
      })
      setMasivoSuccessMsg(res.data?.message || 'Calificaciones guardadas con éxito.')
      
      const nextOrig = { ...originalNotas }
      toSave.forEach(item => {
        nextOrig[item.postulante_id] = {
          nota_1: item.nota_1 !== null ? String(item.nota_1) : '',
          nota_2: item.nota_2 !== null ? String(item.nota_2) : '',
          nota_3: item.nota_3 !== null ? String(item.nota_3) : '',
        }
        newMsgs[item.postulante_id] = { type: 'success', text: 'Guardado' }
      })
      setOriginalNotas(nextOrig)
      setMsgs(newMsgs)
      
      await reloadEstudiantesKeepSelections()
    } catch (err) {
      setMasivoErrorMsg(err.response?.data?.message || 'Error al guardar calificaciones.')
    } finally {
      setSavingMasivo(false)
    }
  }

  const reloadEstudiantesKeepSelections = async () => {
    try {
      const r = await getEstudiantesGrupo(grupoId)
      setGrupoInfo(r.data)
      const nextNotas = {}
      const nextOrig = {}
      r.data.estudiantes.forEach(e => {
        const val = {
          nota_1: e.nota_1 !== null && e.nota_1 !== undefined ? String(e.nota_1) : '',
          nota_2: e.nota_2 !== null && e.nota_2 !== undefined ? String(e.nota_2) : '',
          nota_3: e.nota_3 !== null && e.nota_3 !== undefined ? String(e.nota_3) : '',
        }
        const hasLocalEdits = hasChanges(e.id)
        if (hasLocalEdits) {
          nextNotas[e.id] = notas[e.id]
          nextOrig[e.id] = originalNotas[e.id]
        } else {
          nextNotas[e.id] = { ...val }
          nextOrig[e.id] = { ...val }
        }
      })
      setNotas(nextNotas)
      setOriginalNotas(nextOrig)
    } catch {
      // ignore
    }
  }

  // ── CSV Plantilla e Importación ──

  const descargarPlantilla = () => {
    if (!grupoInfo || !grupoInfo.estudiantes) return
    const headers = 'ci,estudiante,examen_1,examen_2,examen_3\n'
    const rows = grupoInfo.estudiantes.map(e => {
      const n1 = e.nota_1 !== null && e.nota_1 !== undefined ? e.nota_1 : ''
      const n2 = e.nota_2 !== null && e.nota_2 !== undefined ? e.nota_2 : ''
      const n3 = e.nota_3 !== null && e.nota_3 !== undefined ? e.nota_3 : ''
      return `${e.ci},"${e.nombre}",${n1},${n2},${n3}`
    }).join('\n')
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `plantilla_notas_${grupoInfo.grupo_codigo || 'grupo'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSubirCsv = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCsvFile(file)

    const fd = new FormData()
    fd.append('grupo_id', grupoId)
    fd.append('file', file)

    try {
      const res = await api.post('/docente/calificaciones/previsualizar-csv', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setCsvPreview(res.data)
      setShowCsvModal(true)
    } catch (err) {
      alert(err.response?.data?.message || 'Error al previsualizar CSV.')
    } finally {
      e.target.value = null // reset
    }
  }

  const handleConfirmarImportacion = async () => {
    if (!csvPreview || csvPreview.invalid_rows > 0) return
    setImportandoCsv(true)
    try {
      await api.post('/docente/calificaciones/importar-csv', {
        grupo_id: grupoId,
        updates: csvPreview.updates
      })
      setShowCsvModal(false)
      setCsvPreview(null)
      setCsvFile(null)
      alert('Notas importadas con éxito.')
      await cargar(grupoId)
    } catch (err) {
      alert(err.response?.data?.message || 'Error al importar calificaciones.')
    } finally {
      setImportandoCsv(false)
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

  const estudiantesList = grupoInfo?.estudiantes || []
  const allChecked = estudiantesList.length > 0 && estudiantesList.every(e => !!selectedEstudiantes[e.id])
  const someChecked = estudiantesList.length > 0 && estudiantesList.some(e => !!selectedEstudiantes[e.id]) && !allChecked

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
          {/* Info grupo y botones CSV */}
          <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                Materia: <strong style={{ color: 'var(--gray-900)' }}>{grupoInfo.estudiantes?.length > 0 ? grupos.find(g => g.id == grupoId)?.materia || '—' : '—'}</strong>
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                Estudiantes: <strong>{grupoInfo.estudiantes?.length ?? 0}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {promedioGrupo !== null && (
                <span style={{
                  padding: '4px 14px', borderRadius: 20,
                  background: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: '0.875rem', marginRight: 10
                }}>
                  Promedio del grupo: {promedioGrupo}
                </span>
              )}

              <button className="btn btn-outline btn-sm" onClick={descargarPlantilla}>
                <FiDownload /> Descargar Plantilla CSV
              </button>
              <label className="btn btn-primary btn-sm" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <FiUpload /> Cargar CSV
                <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleSubirCsv} />
              </label>
            </div>
          </div>

          {/* Botones de acción masiva */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleGuardarSeleccionados}
              disabled={savingMasivo}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FiSave /> Guardar seleccionados
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleGuardarTodo}
              disabled={savingMasivo}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FiSave /> Guardar todo
            </button>
            {masivoErrorMsg && (
              <span style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: '#ffebee', border: '1px solid #ef9a9a' }}>
                <FiAlertCircle /> {masivoErrorMsg}
              </span>
            )}
            {masivoSuccessMsg && (
              <span style={{ color: '#2e7d32', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: '#e8f5e9', border: '1px solid #a5d6a7' }}>
                <FiCheck /> {masivoSuccessMsg}
              </span>
            )}
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={el => {
                        if (el) el.indeterminate = someChecked;
                      }}
                      onChange={(evt) => {
                        const checked = evt.target.checked
                        const next = {}
                        estudiantesList.forEach(e => {
                          next[e.id] = checked
                        })
                        setSelectedEstudiantes(next)
                      }}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </th>
                  <th>#</th>
                  <th>Estudiante</th>
                  <th>CI</th>
                  <th style={{ textAlign: 'center' }}>Examen 1</th>
                  <th style={{ textAlign: 'center' }}>Examen 2</th>
                  <th style={{ textAlign: 'center' }}>Examen 3</th>
                  <th style={{ textAlign: 'center' }}>Promedio</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {(grupoInfo.estudiantes || []).map((e, i) => {
                  const n = notas[e.id] || {}
                  const p = calcPromedio(n.nota_1, n.nota_2, n.nota_3)
                  const isSaving = saving[e.id]
                  const rowMsg = msgs[e.id]
                  const rowHasChanges = hasChanges(e.id)

                  return (
                    <tr key={e.id} style={{ background: rowHasChanges ? '#fffbeb' : 'transparent' }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!selectedEstudiantes[e.id]}
                          onChange={(evt) => {
                            setSelectedEstudiantes(prev => ({
                              ...prev,
                              [e.id]: evt.target.checked
                            }))
                          }}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
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
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className={rowHasChanges ? "btn btn-primary btn-sm" : "btn btn-sm"}
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.74rem',
                              ...(rowHasChanges ? {} : { background: '#e8f5e9', color: '#2e7d32', borderColor: '#a5d6a7', cursor: 'default' })
                            }}
                            onClick={() => {
                              if (rowHasChanges) guardar(e.id);
                            }}
                            disabled={isSaving || !rowHasChanges}
                            title="Guardar calificaciones"
                          >
                            {rowHasChanges ? <><FiSave /> Guardar</> : <><FiCheck /> Guardado</>}
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

      {/* Modal Vista Previa de Calificaciones CSV */}
      {showCsvModal && csvPreview && (
        <div className="modal-overlay" onClick={() => setShowCsvModal(false)}>
          <div className="modal" style={{ maxWidth: 700, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Previsualizar Notas Importadas</span>
              <button className="modal-close" onClick={() => setShowCsvModal(false)}><FiX /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: '#f3f4f6', color: 'var(--gray-700)' }}>
                  Total filas: {csvPreview.total_rows}
                </span>
                <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: '#e8f5e9', color: '#2e7d32' }}>
                  Filas válidas: {csvPreview.valid_rows}
                </span>
                <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: '#ffebee', color: '#c62828' }}>
                  Filas con error: {csvPreview.invalid_rows}
                </span>
              </div>

              {csvPreview.errors.length > 0 && (
                <div style={{ background: '#ffebee', color: '#c62828', padding: 12, borderRadius: 6, marginBottom: 14, fontSize: '0.8rem' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 700 }}>Errores detectados en el archivo:</h4>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {csvPreview.errors.map((err, i) => (
                      <li key={i}>Fila {err.row}: {err.error}</li>
                    ))}
                  </ul>
                  <p style={{ margin: '8px 0 0 0', fontWeight: 600 }}>Corrige los errores en tu archivo CSV antes de continuar.</p>
                </div>
              )}

              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '10px 0 6px 0' }}>Notas que serán actualizadas:</h4>
              <table className="table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>CI</th>
                    <th style={{ textAlign: 'center' }}>Examen 1</th>
                    <th style={{ textAlign: 'center' }}>Examen 2</th>
                    <th style={{ textAlign: 'center' }}>Examen 3</th>
                    <th style={{ textAlign: 'center' }}>Promedio</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.updates.map((up, idx) => {
                    const hasDiff = up.nota_1 !== up.nota_1_old || up.nota_2 !== up.nota_2_old || up.nota_3 !== up.nota_3_old
                    return (
                      <tr key={idx} style={{ background: hasDiff ? '#f0f9ff' : 'transparent' }}>
                        <td style={{ fontWeight: 600 }}>{up.nombre}</td>
                        <td style={{ fontFamily: 'monospace' }}>{up.ci}</td>
                        <td style={{ textAlign: 'center' }}>
                          {up.nota_1 ?? '—'} {up.sobreescribir && up.nota_1_old !== null && up.nota_1 !== up.nota_1_old && (
                            <span style={{ color: 'var(--gray-400)', fontSize: '0.7rem' }}> (de {up.nota_1_old})</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {up.nota_2 ?? '—'} {up.sobreescribir && up.nota_2_old !== null && up.nota_2 !== up.nota_2_old && (
                            <span style={{ color: 'var(--gray-400)', fontSize: '0.7rem' }}> (de {up.nota_2_old})</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {up.nota_3 ?? '—'} {up.sobreescribir && up.nota_3_old !== null && up.nota_3 !== up.nota_3_old && (
                            <span style={{ color: 'var(--gray-400)', fontSize: '0.7rem' }}> (de {up.nota_3_old})</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{up.promedio ?? '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '1px 6px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700,
                            background: up.estado_nota === 'APROBADO' ? '#e8f5e9' : up.estado_nota === 'REPROBADO' ? '#ffebee' : '#f3f4f6',
                            color: up.estado_nota === 'APROBADO' ? '#2e7d32' : up.estado_nota === 'REPROBADO' ? '#c62828' : 'var(--gray-500)'
                          }}>
                            {up.estado_nota}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCsvModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary" onClick={handleConfirmarImportacion}
                disabled={importandoCsv || csvPreview.invalid_rows > 0}
              >
                {importandoCsv ? 'Importando...' : 'Confirmar Importación'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}

const labelStyle = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: 'var(--gray-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px',
}
