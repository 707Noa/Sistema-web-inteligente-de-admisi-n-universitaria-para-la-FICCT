import React, { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import {
  getPostulantes,
  updatePostulante,
  deletePostulante,
  generarCuenta,
  importarPostulantesCsv,
  listarPostulantes,
  crearCuentasPostulantes,
  eliminarPostulantesMasivo,
} from '../services/postulanteService'
import { getCarrerasDisponibles } from '@/modules/p4-reportes-monitoreo-auditoria/reportes/services/reporteService'
import {
  FiSearch, FiEye, FiUserCheck, FiRefreshCw, FiUpload, FiUsers,
  FiAlertCircle, FiCheckCircle, FiEdit2, FiTrash2,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

// â”€â”€ Utilidades â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function toInputDate(dateStr) {
  if (!dateStr) return ''
  return String(dateStr).substring(0, 10)
}

function previewRegistro(ci) {
  if (!ci) return ''
  return '2026' + ci.split('').reverse().join('')
}

function formatFecha(dateStr) {
  if (!dateStr) return '-'
  const solo = String(dateStr).substring(0, 10)
  if (!solo || solo === 'null') return '-'
  const [y, m, d] = solo.split('-')
  return `${d}/${m}/${y}`
}

const ESTADOS_TRAMITE = ['PREINSCRITO', 'INSCRITO', 'PENDIENTE_PAGO']

// â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Postulantes() {
  const navigate    = useNavigate()
  const fileInputRef = useRef(null)

  // â”€â”€ Lista â”€â”€
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [generando, setGenerando] = useState(null)
  const [mensaje, setMensaje]    = useState(null)

  // Pagination, filter and sorting states (from Stashed)
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [carreraFilter, setCarreraFilter] = useState('')
  const [estadoFilter, setEstadoFilter]   = useState('')
  const [ordenNombre, setOrdenNombre]     = useState('')
  const [carreras, setCarreras]           = useState([])
  const [meta, setMeta]                 = useState({ total: 0 })

  // Selection states (from Stashed)
  const [seleccionados, setSeleccionados] = useState([])

  // Process actions states (from Stashed)
  const [procesandoCuentas, setProcesandoCuentas] = useState(false)
  const [procesandoEliminar, setProcesandoEliminar] = useState(false)
  const [actionResultModal, setActionResultModal] = useState(null)

  // â”€â”€ Modal ediciÃ³n â”€â”€ (from Upstream)
  const [showForm, setShowForm]     = useState(false)
  const [editId, setEditId]         = useState(null)
  const [formData, setFormData]     = useState({})
  const [formErrors, setFormErrors] = useState({})
  const [formLoading, setFormLoading] = useState(false)

  // â”€â”€ Modal masivo â”€â”€ (from Upstream)
  const [showMasivo, setShowMasivo] = useState(false)
  const [csvFile, setCsvFile]       = useState(null)
  const [dragOver, setDragOver]     = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado]   = useState(null)

  // â”€â”€ Helpers â”€â”€
  const showMsg = (type, text) => {
    setMensaje({ type, text })
    setTimeout(() => setMensaje(null), 6000)
  }

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
      setMeta({ total: r.data.total || 0 })
    } catch {
      setItems([])
      setPage(1)
      setTotalPages(1)
      setMeta({ total: 0 })
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

  const handleSearch = (v) => {
    setSearch(v)
    setPage(1)
  }

  /* â”€â”€ Selection handlers â”€â”€ */
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

  /* â”€â”€ Mass actions handlers â”€â”€ */
  const handleCrearCuentas = async () => {
    let msg = ''
    let mode = ''

    if (seleccionados.length > 0) {
      msg = `Â¿EstÃ¡ seguro de crear cuentas para los ${seleccionados.length} postulantes seleccionados?`
      mode = 'seleccionados'
    } else if (search || carreraFilter || estadoFilter) {
      msg = 'Â¿EstÃ¡ seguro de crear cuentas para los postulantes que cumplen con los filtros actuales?'
      mode = 'filtrados'
    } else {
      msg = 'Â¿EstÃ¡ seguro de crear cuentas para todos los postulantes preinscritos elegibles?'
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
        title: 'Resumen de CreaciÃ³n de Cuentas',
        type: 'crear',
        data: res.data
      })
      showMsg('success', 'Proceso de creaciÃ³n de cuentas finalizado.')
      setSeleccionados([])
      fetchData(page)
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Error al procesar la creaciÃ³n de cuentas.')
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

    const message = `EstÃ¡ a punto de eliminar ${seleccionados.length} postulantes:\n${summaryText}\n\nÂ¿Desea continuar?`

    if (!window.confirm(message)) {
      return
    }

    setProcesandoEliminar(true)
    try {
      const res = await eliminarPostulantesMasivo(seleccionados)
      setActionResultModal({
        title: 'Resumen de EliminaciÃ³n/DesactivaciÃ³n',
        type: 'eliminar',
        data: res.data
      })
      showMsg('success', 'Proceso de eliminaciÃ³n finalizado.')
      setSeleccionados([])
      fetchData(page)
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Error al procesar la eliminaciÃ³n.')
    } finally {
      setProcesandoEliminar(false)
    }
  }

  const handleEliminarIndividual = async (id, nombre, estado) => {
    if (!window.confirm(`Â¿EstÃ¡ seguro de eliminar este postulante? Estado actual: ${estado || 'Desconocido'}.`)) return
    try {
      const res = await deletePostulante(id)
      showMsg('success', res.data?.message || 'Postulante eliminado correctamente.')
      setSeleccionados(prev => prev.filter(selId => selId !== id))
      fetchData(page)
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Error al eliminar el postulante.')
    }
  }

  /* â”€â”€ Generar cuenta individual â”€â”€ */
  const handleGenerarCuenta = async (p) => {
    setGenerando(p.id)
    try {
      const r = await generarCuenta(p.id)
      const codigo = r.data.user?.codigo || r.data.postulante?.codigo_usuario || ''
      showMsg('success', `Cuenta creada. CÃ³digo de acceso: ${codigo}`)
      fetchData(page)
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Error al generar cuenta.')
    } finally {
      setGenerando(null)
    }
  }

  // â”€â”€ Abrir ediciÃ³n â”€â”€
  const openEdit = (p) => {
    setEditId(p.id)
    setFormData({
      nombres:              p.nombres || '',
      apellidos:            p.apellidos || '',
      ci:                   p.ci || '',
      email:                p.email || '',
      celular:              p.celular || '',
      fecha_nacimiento:     toInputDate(p.fecha_nacimiento),
      carrera:              p.carrera || p.carrera_postulada || '',
      colegio_procedencia:  p.colegio_procedencia || '',
      ciudad:               p.ciudad || '',
      estado_tramite:       p.estado_tramite || 'PREINSCRITO',
      direccion:            p.direccion || '',
      preferencia_turno:    p.preferencia_turno || '',
    })
    setFormErrors({})
    setShowForm(true)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormErrors({})
    setFormLoading(true)
    try {
      await updatePostulante(editId, formData)
      showMsg('success', 'Postulante actualizado correctamente.')
      setShowForm(false)
      fetchData(page)
    } catch (err) {
      const errs = err.response?.data?.errors || {}
      if (Object.keys(errs).length > 0) {
        setFormErrors(errs)
      } else {
        setFormErrors({ _general: err.response?.data?.message || 'Error al guardar.' })
      }
    } finally {
      setFormLoading(false)
    }
  }

  const fieldErr = (f) => formErrors[f]?.[0]

  // â”€â”€ Masivo â”€â”€
  const closeMasivo = () => {
    setShowMasivo(false); setCsvFile(null); setResultado(null); setDragOver(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.txt'))) setCsvFile(f)
  }
  const handleImport = async () => {
    if (!csvFile) return
    setProcesando(true); setResultado(null)
    const fd = new FormData()
    fd.append('archivo', csvFile)
    try {
      const r = await importarPostulantesCsv(fd)
      setResultado(r.data)
      fetchData(1)
    } catch (err) {
      setResultado({ error: err.response?.data?.message || 'Error al procesar el archivo.' })
    } finally {
      setProcesando(false)
    }
  }

  // Texto de contador dinÃ¡mico
  const textoContador = () => {
    const parts = []
    if (estadoFilter)  parts.push(estadoFilter)
    if (carreraFilter) parts.push(carreraFilter)
    if (parts.length > 0) return `${meta.total} postulante${meta.total !== 1 ? 's' : ''} â€” ${parts.join(', ')}`
    if (search) return `${meta.total} resultado${meta.total !== 1 ? 's' : ''} para "${search}"`
    return `${meta.total} postulante${meta.total !== 1 ? 's' : ''} en total`
  }

  if (loading && items.length === 0) return <Layout><Loading /></Layout>

  return (
    <Layout>
      {/* â”€â”€ Cabecera â”€â”€ */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>GestiÃ³n de Postulantes</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>

          <div className="search-container" style={{ margin: 0 }}>
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por nombre o CI..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
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
            onClick={() => { setShowMasivo(true); setResultado(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiUsers /> GeneraciÃ³n Masiva
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

      {/* Contador de resultados */}
      <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: '0 0 12px', paddingLeft: 2 }}>
        {loading ? 'Actualizando...' : textoContador()}
      </p>

      {/* â”€â”€ Mensaje flotante â”€â”€ */}
      {mensaje && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: '0.875rem',
          background: mensaje.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
          color:      mensaje.type === 'success' ? '#065f46' : '#991b1b',
        }}>
          {mensaje.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          <span style={{ flex: 1 }}>{mensaje.text}</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'inherit' }}
            onClick={() => setMensaje(null)}>Ã—</button>
        </div>
      )}

      {/* â”€â”€ Tabla â”€â”€ */}
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
                      }}>SÃ­</span>
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
                  <td style={{ whiteSpace:'nowrap', fontSize:'0.82rem', color:'var(--gray-500)' }}>
                    {formatFecha(p.created_at)}
                  </td>
                  <td>
                    <div className="table-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        title="Ver perfil"
                        onClick={() => navigate(`/admin/postulantes/${p.id}`)}
                      >
                        <FiEye />
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        title="Editar"
                        onClick={() => openEdit(p)}
                      >
                        <FiEdit2 />
                      </button>
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
                <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>
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
            PÃ¡gina {page} de {totalPages}
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          Modal â€” Editar Postulante
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Editar Postulante</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>Ã—</button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

                {formErrors._general && (
                  <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: '0.875rem' }}>
                    {formErrors._general}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                  <div className="form-group">
                    <label className="form-label">Nombres *</label>
                    <input className="form-input" value={formData.nombres} required
                      onChange={e => setFormData({ ...formData, nombres: e.target.value })} />
                    {fieldErr('nombres') && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErr('nombres')}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Apellidos *</label>
                    <input className="form-input" value={formData.apellidos} required
                      onChange={e => setFormData({ ...formData, apellidos: e.target.value })} />
                    {fieldErr('apellidos') && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErr('apellidos')}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">CI *</label>
                    <input className="form-input" value={formData.ci} required
                      onChange={e => setFormData({ ...formData, ci: e.target.value })} />
                    {fieldErr('ci') && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErr('ci')}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">TelÃ©fono</label>
                    <input className="form-input" value={formData.celular}
                      onChange={e => setFormData({ ...formData, celular: e.target.value })} />
                    {fieldErr('celular') && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErr('celular')}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Correo electrÃ³nico</label>
                    <input className="form-input" type="email" value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    {fieldErr('email') && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErr('email')}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fecha de nacimiento</label>
                    <input className="form-input" type="date" value={formData.fecha_nacimiento}
                      onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={formData.estado_tramite}
                      onChange={e => setFormData({ ...formData, estado_tramite: e.target.value })}>
                      {ESTADOS_TRAMITE.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Turno elegido</label>
                    <select className="form-select" value={formData.preferencia_turno || ''}
                      onChange={e => setFormData({ ...formData, preferencia_turno: e.target.value })}>
                      <option value="">Sin definir</option>
                      <option value="manana">MaÃ±ana</option>
                      <option value="tarde">Tarde</option>
                      <option value="noche">Noche</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Carrera</label>
                    <input className="form-input" value={formData.carrera}
                      onChange={e => setFormData({ ...formData, carrera: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unidad educativa</label>
                    <input className="form-input" value={formData.colegio_procedencia}
                      onChange={e => setFormData({ ...formData, colegio_procedencia: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ciudad</label>
                    <input className="form-input" value={formData.ciudad}
                      onChange={e => setFormData({ ...formData, ciudad: e.target.value })} />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">DirecciÃ³n</label>
                    <input className="form-input" value={formData.direccion}
                      onChange={e => setFormData({ ...formData, direccion: e.target.value })} />
                  </div>

                </div>

                {/* Preview del registro si cambia el CI */}
                {formData.ci && (
                  <div style={{ marginTop: 14, padding: '8px 14px', background: '#eff6ff', borderRadius: 'var(--radius)', fontSize: '0.83rem', color: '#1e40af' }}>
                    Registro resultante: <strong style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{previewRegistro(formData.ci)}</strong>
                  </div>
                )}

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading
                    ? <><FiRefreshCw style={{ animation: 'spin 0.8s linear infinite' }} /> Guardando...</>
                    : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          Modal â€” GeneraciÃ³n Masiva
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {showMasivo && (
        <div className="modal-overlay" onClick={closeMasivo}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">GeneraciÃ³n Masiva de Cuentas</span>
              <button className="modal-close" onClick={closeMasivo}>Ã—</button>
            </div>

            <div className="modal-body">
              {!resultado ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Perfil del Sistema</label>
                    <select className="form-select" disabled value="postulante">
                      <option value="postulante">Postulante</option>
                    </select>
                  </div>

                  <div style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 20,
                    fontSize: '0.83rem', color: '#1e40af', lineHeight: 1.5,
                  }}>
                    <FiAlertCircle style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Formato CSV (separador <code>;</code>):</strong>
                      <code style={{ display: 'block', marginTop: 4, marginBottom: 6, wordBreak: 'break-all' }}>
                        Nombres;Apellidos;CI;Correo;TelÃ©fono;"1Âª Carrera";"2Âª Carrera";"Unidad Educativa";Ciudad;Estado;"Turno Elegido"
                      </code>
                      <span>
                        Estado <code>PREINSCRITO</code>: importa el postulante <strong>sin</strong> crear cuenta.{' '}
                        Estado <code>INSCRITO</code>: importa <strong>y</strong> genera cuenta automÃ¡ticamente.{' '}
                        El campo <strong>Registro</strong> se genera automÃ¡ticamente desde el CI.
                      </span>
                    </div>
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
                      <FiUpload style={{ fontSize: '2rem', color: csvFile ? 'var(--success)' : 'var(--gray-400)', display: 'block', margin: '0 auto 10px' }} />
                      {csvFile ? (
                        <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                          {csvFile.name}
                          <span style={{ color: 'var(--gray-400)', fontWeight: 400, marginLeft: 8 }}>
                            ({(csvFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </p>
                      ) : (
                        <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', margin: 0 }}>
                          Haga clic para seleccionar o arrastre un archivo CSV aquÃ­
                        </p>
                      )}
                      <input
                        ref={fileInputRef} type="file" accept=".csv,.txt"
                        style={{ display: 'none' }}
                        onChange={e => setCsvFile(e.target.files[0] || null)}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  {resultado.error ? (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--danger-light)', color: '#991b1b', padding: '12px 16px', borderRadius: 'var(--radius)' }}>
                      <FiAlertCircle /> {resultado.error}
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                        {[
                          { label: 'Total filas',    val: resultado.total,      color: 'var(--gray-700)' },
                          { label: 'Importados',     val: resultado.importados, color: 'var(--primary)' },
                          { label: 'Cuentas creadas',val: resultado.inscritos,  color: 'var(--success)' },
                          { label: 'Omitidos',       val: resultado.omitidos,   color: 'var(--warning)' },
                        ].map(({ label, val, color }) => (
                          <div key={label} style={{ textAlign: 'center', background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '12px 8px' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{val ?? 0}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 2 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: resultado.errores?.length ? 12 : 0 }}>
                        {resultado.message}
                      </p>
                      {resultado.errores?.length > 0 && (
                        <details style={{ fontSize: '0.8rem' }}>
                          <summary style={{ cursor: 'pointer', color: 'var(--warning)', marginBottom: 6 }}>
                            Ver {resultado.errores.length} advertencia(s)
                          </summary>
                          <ul style={{ paddingLeft: 18, color: 'var(--gray-600)', maxHeight: 130, overflowY: 'auto', lineHeight: 1.7 }}>
                            {resultado.errores.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        </details>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeMasivo}>Cancelar</button>
              {!resultado ? (
                <button className="btn btn-primary" onClick={handleImport} disabled={procesando || !csvFile}>
                  {procesando
                    ? <><FiRefreshCw style={{ animation: 'spin 0.8s linear infinite' }} /> Procesando...</>
                    : 'Crear'}
                </button>
              ) : (
                <button className="btn btn-primary" onClick={closeMasivo}>
                  <FiCheckCircle /> Listo
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          Modal â€” Resumen de AcciÃ³n Masiva
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {actionResultModal && (
        <div className="modal-overlay" onClick={() => setActionResultModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{actionResultModal.title}</span>
              <button className="modal-close" onClick={() => setActionResultModal(null)}>Ã—</button>
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
                  <p><strong>Eliminados fÃ­sicamente (sin cuenta):</strong> {actionResultModal.data.eliminados_fisicamente ?? 0}</p>
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
