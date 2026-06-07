import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import {
  getPostulantesCoordinador,
  exportarPostulantesCsv,
  deletePostulanteCoordinador,
  eliminarPostulantesMultipleCoordinador,
  updatePostulanteCoordinador,
  patchRequisitosCoordinador
} from '../services/coordinadorService'
import { getCarrerasDisponibles } from '@/modules/p4-reportes-monitoreo-auditoria/reportes/services/reporteService'
import { FiSearch, FiEye, FiCheckCircle, FiAlertCircle, FiDownload, FiTrash2, FiRefreshCw } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

function formatFecha(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function CoordinadorPostulantes() {
  const [items, setItems]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [mensaje, setMensaje]           = useState(null)
  const [seleccionados, setSeleccionados] = useState([])
  const [procesandoEliminar, setProcesandoEliminar] = useState(false)
  const navigate = useNavigate()

  // Pagination, filter and sorting states
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [carreraFilter, setCarreraFilter] = useState('')
  const [estadoFilter, setEstadoFilter]   = useState('')
  const [ordenNombre, setOrdenNombre]     = useState('')
  const [carreras, setCarreras]           = useState([])

  // Fetch careers on mount
  useEffect(() => {
    getCarrerasDisponibles()
      .then(r => setCarreras(r.data || []))
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async (targetPage = page, searchStr = search) => {
    setLoading(true)
    try {
      const r = await getPostulantesCoordinador({
        search: searchStr,
        carrera: carreraFilter,
        estado: estadoFilter,
        orden_nombre: ordenNombre,
        page: targetPage,
        per_page: 70
      })
      setItems(r.data.data || [])
      setPage(r.data.current_page || 1)
      setTotalPages(r.data.last_page || 1)
      setSeleccionados([])
    } catch {
      setItems([])
      setPage(1)
      setTotalPages(1)
      setSeleccionados([])
    } finally {
      setLoading(false)
    }
  }, [carreraFilter, estadoFilter, search, ordenNombre])

  // Debounced search / filter loading
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
    setTimeout(() => setMensaje(null), 5000)
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

  /* ── Deletion handlers ── */
  const handleEliminarIndividual = async (id, nombre) => {
    if (window.confirm('¿Está seguro de eliminar este postulante?')) {
      try {
        const res = await deletePostulanteCoordinador(id)
        showMsg('success', res.data?.message || 'Postulante eliminado correctamente.')
        setSeleccionados(prev => prev.filter(selId => selId !== id))
        fetchData(page)
      } catch (err) {
        showMsg('error', err.response?.data?.message || 'Error al eliminar el postulante.')
      }
    }
  }

  const handleEliminarMultiple = async () => {
    if (seleccionados.length === 0) {
      alert('Seleccione al menos un postulante.')
      return
    }

    // Double check that all selected are INACTIVO
    const nonInactiveSelected = items.filter(
      p => seleccionados.includes(p.id) && p.estado_tramite !== 'INACTIVO' && p.estado !== 'inactivo'
    )
    if (nonInactiveSelected.length > 0) {
      showMsg('error', 'Solo se pueden eliminar postulantes con estado INACTIVO.')
      return
    }

    if (!window.confirm(`¿Está seguro de eliminar los postulantes seleccionados?`)) {
      return
    }

    setProcesandoEliminar(true)
    try {
      const res = await eliminarPostulantesMultipleCoordinador(seleccionados)
      showMsg('success', res.data?.message || 'Proceso de eliminación finalizado.')
      setSeleccionados([])
      fetchData(page)
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Error al procesar la eliminación.')
    } finally {
      setProcesandoEliminar(false)
    }
  }

  const handleExportarCsv = () => {
    exportarPostulantesCsv({
      search,
      carrera: carreraFilter,
      estado: estadoFilter
    })
  }

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
            className="btn btn-primary"
            onClick={handleExportarCsv}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px' }}
          >
            <FiDownload /> Exportar CSV
          </button>

          <button
            className="btn btn-danger"
            onClick={handleEliminarMultiple}
            disabled={seleccionados.length === 0 || procesandoEliminar}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: seleccionados.length === 0 ? '#fca5a5' : '#ef4444',
              borderColor: seleccionados.length === 0 ? '#fca5a5' : '#ef4444',
              color: '#fff',
              cursor: seleccionados.length === 0 ? 'not-allowed' : 'pointer',
              height: '38px'
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
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
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
                <th>Turno Elegido</th>
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
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.carrera || p.carrera_postulada || '-'}
                  </td>
                  <td>
                    {p.preferencia_turno === 'manana' ? (
                      <span className="badge badge-info" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>Mañana</span>
                    ) : p.preferencia_turno === 'tarde' ? (
                      <span className="badge badge-warning" style={{ backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 600 }}>Tarde</span>
                    ) : p.preferencia_turno === 'noche' ? (
                      <span className="badge badge-success" style={{ backgroundColor: '#d1fae5', color: '#047857', fontWeight: 600 }}>Noche</span>
                    ) : (
                      <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Sin definir</span>
                    )}
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
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                    {formatFecha(p.created_at)}
                  </td>
                  <td>
                    <div className="table-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button className="btn btn-outline btn-sm" title="Ver perfil"
                        onClick={() => navigate(`/coordinador/postulantes/${p.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiEye /> Ver perfil
                      </button>
                      {(p.estado_tramite === 'INACTIVO' || p.estado === 'inactivo') && (
                        <button className="btn btn-outline btn-sm" title="Eliminar postulante"
                          onClick={() => handleEliminarIndividual(p.id, `${p.nombres} ${p.apellidos}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                        >
                          <FiTrash2 /> Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    Sin postulantes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
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
    </Layout>
  )
}
