import React, { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import {
  getPostulantes,
  generarCuenta,
  deletePostulante,
  importarPostulantesCsv,
  listarPostulantes,
  crearCuentasPostulantes,
  eliminarPostulantesMasivo,
} from '../services/postulanteService'
import { getCarrerasDisponibles } from '@/modules/p4-reportes-monitoreo-auditoria/reportes/services/reporteService'
import {
  FiSearch, FiEye, FiUserCheck, FiRefreshCw, FiUpload, FiUsers, FiAlertCircle, FiCheckCircle, FiTrash2,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

function formatFecha(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Postulantes() {
  const [items, setItems]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [generando, setGenerando]       = useState(null)
  const [mensaje, setMensaje]           = useState(null)
  const [showMasivoModal, setShowMasivoModal] = useState(false)
  const [csvFile, setCsvFile]           = useState(null)
  const [dragOver, setDragOver]         = useState(false)
  const [procesando, setProcesando]     = useState(false)
  const [resultado, setResultado]       = useState(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  // Pagination, filter and sorting states
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [carreraFilter, setCarreraFilter] = useState('')
  const [estadoFilter, setEstadoFilter]   = useState('')
  const [ordenNombre, setOrdenNombre]     = useState('')
  const [carreras, setCarreras]           = useState([])

  // Selection states
  const [seleccionados, setSeleccionados] = useState([])

  // Process actions states
  const [procesandoCuentas, setProcesandoCuentas] = useState(false)
  const [procesandoEliminar, setProcesandoEliminar] = useState(false)
  const [actionResultModal, setActionResultModal] = useState(null)

  // Fetch careers on mount
  useEffect(() => {
    getCarrerasDisponibles()
      .then(r => setCarreras(r.data || []))
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async (targetPage = page, searchStr = search) => {
    setLoading(true)
    try {
      const r = await listarPostulantes({
        search: searchStr,
        carrera: carreraFilter,
        estado: estadoFilter,
        ordenNombre: ordenNombre,
        page: targetPage,
        perPage: 70
      })
      setItems(r.data.data || [])
      setPage(r.data.current_page || 1)
      setTotalPages(r.data.last_page || 1)
    } catch {
      setItems([])
      setPage(1)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [carreraFilter, estadoFilter, search, ordenNombre])

  // Debounced effect for search/filters to reset page and fetch
  useEffect(() => {
    const t = setTimeout(() => {
      fetchData(1, search)
    }, 300)
    return () => clearTimeout(t)
  }, [search, carreraFilter, estadoFilter, ordenNombre])

  const handlePageChange = (targetPage) => {
    fetchData(targetPage, search)
  }

  const showMsg = (type, text) => {
    setMensaje({ type, text })
    setTimeout(() => setMensaje(null), 6000)
  }

  /* ── Selection handlers ── */
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const visibleIds = items.map(item => item.id)
      setSeleccionados(prev => {
        const newSelection = [...prev]
        visibleIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id)
          }
        })
        return newSelection
      })
    } else {
      const visibleIds = items.map(item => item.id)
      setSeleccionados(prev => prev.filter(id => !visibleIds.includes(id)))
    }
  }

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSeleccionados(prev => [...prev, id])
    } else {
      setSeleccionados(prev => prev.filter(x => x !== id))
    }
  }

  const allVisibleSelected = items.length > 0 && items.every(item => seleccionados.includes(item.id))
  const someVisibleSelected = items.length > 0 && items.some(item => seleccionados.includes(item.id)) && !allVisibleSelected

  /* ── Mass actions handlers ── */
  const handleCrearCuentas = async () => {
    let msg = ''
    let mode = ''

    if (seleccionados.length > 0) {
      msg = `¿Está seguro de crear cuentas para los ${seleccionados.length} postulantes seleccionados?`
      mode = 'seleccionados'
    } else if (search || carreraFilter || estadoFilter) {
      msg = '¿Está seguro de crear cuentas para los postulantes que cumplen con los filtros actuales?'
      mode = 'filtrados'
    } else {
      msg = '¿Está seguro de crear cuentas para todos los postulantes preinscritos elegibles?'
      mode = 'general'
    }

    if (!window.confirm(msg)) return

    setProcesandoCuentas(true)
    try {
      const filtros = (mode === 'filtrados' || mode === 'general') ? {
        search,
        carrera: carreraFilter,
        estado: estadoFilter,
      } : null

      const res = await crearCuentasPostulantes({
        postulanteIds: seleccionados,
        filtros
      })

      setActionResultModal({
        title: 'Resumen de Creación de Cuentas',
        type: 'crear',
        data: res.data
      })
      showMsg('success', 'Proceso de creación de cuentas finalizado.')
      setSeleccionados([])
      fetchData(page)
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Error al procesar la creación de cuentas.')
    } finally {
      setProcesandoCuentas(false)
    }
  }

  const handleEliminarMasivo = async () => {
    if (seleccionados.length === 0) {
      alert('Seleccione al menos un postulante.')
      return
    }

    // Calculate summary of states
    const summary = {}
    seleccionados.forEach(id => {
      const item = items.find(p => p.id === id)
      if (item) {
        const state = item.estado_tramite || item.estado || 'PENDIENTE_PAGO'
        summary[state] = (summary[state] || 0) + 1
      }
    })

    const summaryText = Object.entries(summary)
      .map(([state, count]) => `- ${count} ${state}`)
      .join('\n')

    const message = `Está a punto de eliminar ${seleccionados.length} postulantes:\n${summaryText}\n\n¿Desea continuar?`

    if (!window.confirm(message)) {
      return
    }

    setProcesandoEliminar(true)
    try {
      const res = await eliminarPostulantesMasivo(seleccionados)
      setActionResultModal({
        title: 'Resumen de Eliminación/Desactivación',
        type: 'eliminar',
        data: res.data
      })
      showMsg('success', 'Proceso de eliminación finalizado.')
      setSeleccionados([])
      fetchData(page)
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Error al procesar la eliminación.')
    } finally {
      setProcesandoEliminar(false)
    }
  }

  const handleEliminarIndividual = async (id, nombre, estado) => {
    if (!window.confirm(`¿Está seguro de eliminar este postulante? Estado actual: ${estado || 'Desconocido'}.`)) return
    try {
      const res = await deletePostulante(id)
      showMsg('success', res.data?.message || 'Postulante eliminado correctamente.')
      setSeleccionados(prev => prev.filter(selId => selId !== id))
      fetchData(page)
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Error al eliminar el postulante.')
    }
  }

  /* ── Generar cuenta individual ── */
  const handleGenerarCuenta = async (postulante) => {
    setGenerando(postulante.id)
    try {
      const r = await generarCuenta(postulante.id)
      const codigo = r.data.user?.codigo || r.data.postulante?.codigo_usuario || ''
      showMsg('success', `Cuenta creada. Código de acceso: ${codigo}`)
      fetchData(page)
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Error al generar cuenta.')
    } finally { setGenerando(null) }
  }

  /* ── Modal masivo ── */
  const closeMasivoModal = () => {
    setShowMasivoModal(false)
    setCsvFile(null)
    setResultado(null)
    setDragOver(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.txt'))) setCsvFile(f)
  }

  const handleCrear = async () => {
    if (!csvFile) return
    setProcesando(true)
    setResultado(null)
    const fd = new FormData()
    fd.append('archivo', csvFile)
    try {
      const r = await importarPostulantesCsv(fd)
      setResultado(r.data)
      fetchData(1)
    } catch (err) {
      setResultado({ error: err.response?.data?.message || 'Error al procesar el archivo.' })
    } finally { setProcesando(false) }
  }

  if (loading && items.length === 0) return <Layout><Loading /></Layout>

  return (
    <Layout>
      {/* ── Cabecera ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Gestión de Postulantes</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          
          <div className="search-container" style={{ margin: 0 }}>
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por nombre o CI..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            value={carreraFilter}
            onChange={e => {
              setCarreraFilter(e.target.value)
              setPage(1)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="">Todas las carreras</option>
            {carreras.map((c, i) => (
              <option key={i} value={c.nombre}>{c.nombre}</option>
            ))}
          </select>

          <select
            value={estadoFilter}
            onChange={e => {
              setEstadoFilter(e.target.value)
              setPage(1)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE_PAGO">Pendiente de pago</option>
            <option value="PREINSCRITO">Preinscrito</option>
            <option value="INSCRITO">Inscrito</option>
            <option value="INACTIVO">Inactivo</option>
          </select>

          <select
            value={ordenNombre}
            onChange={e => {
              setOrdenNombre(e.target.value)
              setPage(1)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="">Orden normal</option>
            <option value="asc">Nombre A-Z</option>
            <option value="desc">Nombre Z-A</option>
          </select>

          <button
            className="btn btn-outline"
            onClick={() => { setShowMasivoModal(true); setResultado(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiUsers /> Generación Masiva
          </button>

          <button
            className="btn btn-primary"
            onClick={handleCrearCuentas}
            disabled={procesandoCuentas}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }}
          >
            {procesandoCuentas ? <FiRefreshCw style={{ animation: 'spin 0.8s linear infinite' }} /> : <FiUserCheck />}
            Crear cuentas
          </button>

          <button
            className="btn btn-danger"
            onClick={handleEliminarMasivo}
            disabled={seleccionados.length === 0 || procesandoEliminar}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: seleccionados.length === 0 ? '#fca5a5' : '#ef4444',
              borderColor: seleccionados.length === 0 ? '#fca5a5' : '#ef4444',
              color: '#fff',
              cursor: seleccionados.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {procesandoEliminar ? <FiRefreshCw style={{ animation: 'spin 0.8s linear infinite' }} /> : <FiTrash2 />}
            Eliminar
          </button>
        </div>
      </div>

      {/* ── Alerta flotante ── */}
      {mensaje && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: '0.875rem',
          background: mensaje.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
          color: mensaje.type === 'success' ? '#065f46' : '#991b1b',
        }}>
          {mensaje.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          <span style={{ flex: 1 }}>{mensaje.text}</span>
          <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'inherit' }}
            onClick={() => setMensaje(null)}>×</button>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="tabla-scroll-postulantes">
        {loading ? <div style={{ padding: '40px 0' }}><Loading /></div> : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={el => {
                      if (el) el.indeterminate = someVisibleSelected;
                    }}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </th>
                <th>Nombre Completo</th>
                <th>CI</th>
                <th>Correo</th>
                <th>Carrera</th>
                <th>Requisitos</th>
                <th>Estado</th>
                <th>Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} style={{ backgroundColor: seleccionados.includes(p.id) ? '#f8fafc' : 'transparent' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(p.id)}
                      onChange={e => handleSelectOne(p.id, e.target.checked)}
                      style={{
                        cursor: 'pointer',
                        width: '16px',
                        height: '16px'
                      }}
                    />
                  </td>
                  <td><strong>{p.nombres} {p.apellidos}</strong></td>
                  <td>{p.ci}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.email}>
                    {p.email || '-'}
                  </td>
                  <td style={{ maxWidth: 180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {p.carrera || p.carrera_postulada || '-'}
                  </td>
                  <td>
                    {p.requisitos_cumplidos ? (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        display: 'inline-block'
                      }}>Sí</span>
                    ) : (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        display: 'inline-block'
                      }}>No</span>
                    )}
                  </td>
                  <td><StatusBadge status={p.estado_tramite} /></td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: p.user_id ? 'var(--primary)' : 'var(--gray-500)', fontWeight: p.user_id ? 'bold' : 'normal' }}>
                    {p.user_id ? p.codigo_usuario : 'Sin cuenta creada'}
                  </td>
                  <td>
                    <div className="table-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {p.estado_tramite === 'PREINSCRITO' && !p.user_id && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            if (!p.requisitos_cumplidos) {
                              alert('Faltan documentos obligatorios.');
                              return;
                            }
                            handleGenerarCuenta(p);
                          }}
                          disabled={generando === p.id}
                          title="Crear cuenta e inscribir"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {generando === p.id
                            ? <FiRefreshCw style={{ animation:'spin 0.8s linear infinite' }} />
                            : <FiUserCheck />}
                          Inscribir
                        </button>
                      )}
                      <button
                        className="btn btn-outline btn-sm"
                        title="Eliminar postulante"
                        onClick={() => handleEliminarIndividual(p.id, `${p.nombres} ${p.apellidos}`, p.estado_tramite || p.estado || 'PENDIENTE_PAGO')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      >
                        <FiTrash2 /> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>
                  Sin postulantes registrados
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', marginBottom: '20px' }}>
          <button
            className="btn btn-outline btn-sm"
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
          >
            Anterior
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: '#64748b', padding: '0 8px' }}>
            Página {page} de {totalPages}
          </span>
          <button
            className="btn btn-outline btn-sm"
            disabled={page === totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          Modal — Generación Masiva de Cuentas
      ══════════════════════════════════════════════ */}
      {showMasivoModal && (
        <div className="modal-overlay" onClick={closeMasivoModal}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <span className="modal-title">Generación Masiva de Cuentas</span>
              <button className="modal-close" onClick={closeMasivoModal}>×</button>
            </div>

            <div className="modal-body">

              {!resultado ? (
                <>
                  {/* Perfil fijo */}
                  <div className="form-group">
                    <label className="form-label">Perfil del Sistema</label>
                    <select className="form-select" disabled value="postulante">
                      <option value="postulante">Postulante</option>
                    </select>
                  </div>

                  {/* Zona de carga drag & drop */}
                  <div className="form-group" style={{ marginTop: '20px' }}>
                    <label className="form-label">Archivo CSV</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      style={{
                        border: `2px dashed ${dragOver ? 'var(--primary)' : csvFile ? 'var(--success)' : 'var(--gray-300)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '40px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: dragOver ? '#eff6ff' : csvFile ? '#f0fdf4' : 'var(--gray-50)',
                        transition: 'all 0.2s ease',
                        userSelect: 'none',
                      }}
                    >
                      <FiUpload style={{
                        fontSize: '2rem',
                        color: csvFile ? 'var(--success)' : 'var(--gray-400)',
                        marginBottom: 10,
                        display: 'block',
                        margin: '0 auto 10px',
                      }} />
                      {csvFile ? (
                        <p style={{ color:'var(--success)', fontWeight:600, fontSize:'0.9rem' }}>
                          {csvFile.name}
                          <span style={{ color:'var(--gray-400)', fontWeight:400, marginLeft:8 }}>
                            ({(csvFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </p>
                      ) : (
                        <p style={{ color:'var(--gray-500)', fontSize:'0.875rem' }}>
                          Haga clic para seleccionar o arrastre un archivo CSV aquí
                        </p>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        style={{ display:'none' }}
                        onChange={e => setCsvFile(e.target.files[0] || null)}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* ── Resultado ── */
                <div>
                  {resultado.error ? (
                    <div style={{
                      display:'flex', gap:10, alignItems:'center',
                      background:'var(--danger-light)', color:'#991b1b',
                      padding:'12px 16px', borderRadius:'var(--radius)', marginBottom:16,
                    }}>
                      <FiAlertCircle /> {resultado.error}
                    </div>
                  ) : (
                    <>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:16 }}>
                        {[
                          { label:'Total filas',    val: resultado.total,      color:'var(--gray-700)' },
                          { label:'Importados',     val: resultado.importados,  color:'var(--primary)' },
                          { label:'Cuentas creadas',val: resultado.inscritos,   color:'var(--success)' },
                          { label:'Omitidos',       val: resultado.omitidos,    color:'var(--warning)' },
                        ].map(({ label, val, color }) => (
                          <div key={label} style={{
                            textAlign:'center', background:'var(--gray-50)',
                            borderRadius:'var(--radius)', padding:'12px 8px',
                          }}>
                            <div style={{ fontSize:'1.5rem', fontWeight:800, color }}>{val ?? 0}</div>
                            <div style={{ fontSize:'0.72rem', color:'var(--gray-500)', marginTop:2 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize:'0.875rem', color:'var(--gray-600)', marginBottom: resultado.errores?.length ? 12 : 0 }}>
                        {resultado.message}
                      </p>
                      {resultado.errores?.length > 0 && (
                        <details style={{ fontSize:'0.8rem' }}>
                          <summary style={{ cursor:'pointer', color:'var(--warning)', marginBottom:6 }}>
                            Ver {resultado.errores.length} advertencia(s)
                          </summary>
                          <ul style={{ paddingLeft:18, color:'var(--gray-600)', maxHeight:130, overflowY:'auto', lineHeight:1.7 }}>
                            {resultado.errores.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        </details>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeMasivoModal}>
                Cancelar
              </button>
              {!resultado ? (
                <button
                  className="btn btn-primary"
                  onClick={handleCrear}
                  disabled={procesando || !csvFile}
                >
                  {procesando
                    ? <><FiRefreshCw style={{ animation:'spin 0.8s linear infinite' }} /> Procesando...</>
                    : 'Crear'}
                </button>
              ) : (
                <button className="btn btn-primary" onClick={closeMasivoModal}>
                  <FiCheckCircle /> Listo
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          Modal — Resumen de Acción Masiva
      ══════════════════════════════════════════════ */}
      {actionResultModal && (
        <div className="modal-overlay" onClick={() => setActionResultModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{actionResultModal.title}</span>
              <button className="modal-close" onClick={() => setActionResultModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '12px 8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-700)' }}>
                    {actionResultModal.type === 'crear'
                      ? (actionResultModal.data.total_procesados ?? 0)
                      : ((actionResultModal.data.eliminados_fisicamente ?? 0) + (actionResultModal.data.desactivados ?? 0) + (actionResultModal.data.errores?.length ?? 0))
                    }
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 2 }}>Total Procesados</div>
                </div>
                <div style={{ textAlign: 'center', background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '12px 8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
                    {actionResultModal.type === 'crear'
                      ? (actionResultModal.data.cuentas_creadas ?? 0)
                      : ((actionResultModal.data.eliminados_fisicamente ?? 0) + (actionResultModal.data.desactivados ?? 0))
                    }
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 2 }}>
                    {actionResultModal.type === 'crear' ? 'Cuentas Creadas' : 'Exitosos'}
                  </div>
                </div>
                <div style={{ textAlign: 'center', background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '12px 8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>
                    {actionResultModal.type === 'crear'
                      ? (actionResultModal.data.omitidos ?? 0)
                      : (actionResultModal.data.errores?.length ?? 0)
                    }
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 2 }}>
                    {actionResultModal.type === 'crear' ? 'Omitidos / Fallidos' : 'Omitidos'}
                  </div>
                </div>
              </div>

              {actionResultModal.type === 'eliminar' && (
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: 12, lineHeight: 1.6 }}>
                  <p><strong>Eliminados físicamente (sin cuenta):</strong> {actionResultModal.data.eliminados_fisicamente ?? 0}</p>
                  <p><strong>Desactivados (con cuenta):</strong> {actionResultModal.data.desactivados ?? 0}</p>
                </div>
              )}

              {actionResultModal.data.errores?.length > 0 && (
                <div style={{ marginTop: 15 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#991b1b', marginBottom: 8 }}>Detalles de errores / omisiones:</p>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #fee2e2', borderRadius: 4, padding: 8, background: '#fef2f2' }}>
                    <ul style={{ paddingLeft: 16, margin: 0, fontSize: '0.82rem', color: '#991b1b', lineHeight: 1.6 }}>
                      {actionResultModal.data.errores.map((err, i) => (
                        <li key={i}>
                          <strong>{err.nombre || `ID ${err.postulante_id}`}:</strong> {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setActionResultModal(null)}>Listo</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
