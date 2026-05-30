import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import {
  listarUsuarios,
  exportarUsuariosCsv,
  importarCsvYGenerarCuentas,
  eliminarUsuario
} from '@/modules/p1-seguridad-administracion/usuarios/services/usuarioService'
import { FiSearch, FiDownload, FiUsers } from 'react-icons/fi'

export default function PreinscripcionesList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rolFilter, setRolFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Pagination states
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modal states for general account generation
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [perfil, setPerfil] = useState('POSTULANTE')
  const [file, setFile] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    setPage(1)
    fetchData(1)
  }, [search, rolFilter, estadoFilter])

  const fetchData = async (targetPage = 1) => {
    try {
      const res = await listarUsuarios({ rol: rolFilter, search, estado: estadoFilter, page: targetPage })
      setItems(res.data.data || [])
      setTotalPages(res.data.last_page || 1)
      setPage(res.data.current_page || 1)
    } catch (err) {
      setError('Error al cargar la lista de usuarios.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, tipoOrigen) => {
    setError('')
    setSuccess('')
    if (!window.confirm('¿Seguro que deseas eliminar este registro?')) {
      return
    }

    try {
      const res = await eliminarUsuario(id, tipoOrigen)
      setSuccess(res.message || 'Registro procesado correctamente.')
      fetchData(page)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar el registro.')
    }
  }

  const handleExportCsv = async () => {
    setError('')
    setSuccess('')
    try {
      await exportarUsuariosCsv({ rol: rolFilter, search, estado: estadoFilter })
      setSuccess('CSV de usuarios descargado correctamente.')
    } catch (err) {
      setError('Error al exportar los usuarios a CSV.')
    }
  }

  const handleImportCsv = async (e) => {
    e.preventDefault()
    if (!file) {
      setImportError('Por favor seleccione un archivo CSV.')
      return
    }

    setImportLoading(true)
    setImportError('')
    setImportResult(null)

    try {
      const res = await importarCsvYGenerarCuentas(file, perfil)
      setImportResult(res)
      setSuccess('El procesamiento del archivo CSV finalizó con éxito.')
      fetchData(1)
    } catch (err) {
      setImportError(err.response?.data?.message || 'Error al procesar el archivo CSV. Verifique el formato e intente nuevamente.')
    } finally {
      setImportLoading(false)
    }
  }

  const getRolDisplay = (roleName) => {
    if (!roleName) return '-'
    const name = roleName.toLowerCase()
    if (name === 'coordinador') return 'Coordinador Académico'
    if (name === 'autoridad') return 'Autoridad Académica'
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Gestión de Usuarios</h1>
        <div className="page-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por nombre, CI, registro..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <select
            value={rolFilter}
            onChange={e => setRolFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: '#1e293b'
            }}
          >
            <option value="">Todos los Roles</option>
            <option value="postulante">Postulante</option>
            <option value="docente">Docente</option>
            <option value="coordinador">Coordinador Académico</option>
            <option value="autoridad">Autoridad Académica</option>
            <option value="administrador">Administrador</option>
          </select>

          <select
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: '#1e293b'
            }}
          >
            <option value="">Todos los Estados</option>
            <option value="PREINSCRITO">PREINSCRITO</option>
            <option value="CUENTA_CREADA">CUENTA_CREADA</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>

          <button
            className="btn btn-outline"
            onClick={handleExportCsv}
            title="Exportar registros a CSV según filtros"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FiDownload /> Exportar CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
            title="Crear cuentas masivas para cualquier perfil usando un archivo CSV"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FiUsers /> Generación Masiva
          </button>
        </div>
      </div>

      {error && <div className="login-alert" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && (
        <div
          className="login-alert success"
          style={{
            marginBottom: '16px',
            backgroundColor: '#d1e7dd',
            color: '#0f5132',
            borderColor: '#badbcc',
            padding: '12px',
            borderRadius: 'var(--radius)',
            border: '1px solid'
          }}
        >
          {success}
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>CI</th>
              <th>Correo electrónico</th>
              <th>Rol</th>
              <th>Registro</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(u => (
              <tr key={`${u.tipo_origen}_${u.id}`}>
                <td>
                  <strong>{u.nombre_completo}</strong>
                </td>
                <td>{u.ci || '-'}</td>
                <td>{u.correo_electronico || '-'}</td>
                <td>
                  <span className="badge badge-info">
                    {u.rol || '-'}
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', color: 'var(--gray-700)' }}>
                    {u.registro || 'Sin registro'}
                  </span>
                </td>
                <td>
                  <StatusBadge status={u.estado || 'activo'} />
                </td>
                <td>
                  <button
                    className="btn"
                    onClick={() => {
                      const idEliminar = u.tipo_origen === 'postulante' ? u.postulante_id : u.user_id;
                      handleDelete(idEliminar, u.tipo_origen);
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.8rem',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: '1px solid #fca5a5',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.backgroundColor = '#fecaca'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.backgroundColor = '#fee2e2'
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No se encontraron usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button
            className="btn btn-outline btn-sm"
            disabled={page === 1}
            onClick={() => fetchData(page - 1)}
          >
            Anterior
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: '#64748b', padding: '0 8px' }}>
            Página {page} de {totalPages}
          </span>
          <button
            className="btn btn-outline btn-sm"
            disabled={page === totalPages}
            onClick={() => fetchData(page + 1)}
          >
            Siguiente
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="modal-content" style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            color: '#1e293b'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
                Generación Masiva de Cuentas
              </h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false)
                  setImportResult(null)
                  setFile(null)
                  setImportError('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {!importResult ? (
                <form onSubmit={handleImportCsv}>
                  {importError && (
                    <div className="login-alert" style={{ marginBottom: '20px' }}>
                      {importError}
                    </div>
                  )}

                  {/* Perfil Selection */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#334155', textAlign: 'left' }}>
                      Perfil del Sistema
                    </label>
                    <select
                      value={perfil}
                      onChange={(e) => setPerfil(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="POSTULANTE">Postulante</option>
                      <option value="DOCENTE">Docente</option>
                      <option value="COORDINADOR">Coordinador Académico</option>
                      <option value="AUTORIDAD">Autoridad Académica</option>
                      <option value="ADMINISTRADOR">Administrador</option>
                    </select>
                  </div>

                  {/* File Selection */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#334155', textAlign: 'left' }}>
                      Archivo CSV
                    </label>
                    <div style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '30px 20px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      position: 'relative'
                    }}>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={(e) => setFile(e.target.files[0])}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                      <FiDownload style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '8px', margin: '0 auto' }} />
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                        {file ? (
                          <strong style={{ color: '#0f172a' }}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</strong>
                        ) : (
                          'Haga clic para seleccionar o arrastre un archivo CSV aquí'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        setIsModalOpen(false)
                        setFile(null)
                        setImportError('')
                      }}
                      disabled={importLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={importLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      {importLoading ? 'Creando...' : 'Crear'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Results Display */
                <div>
                  <div style={{
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    textAlign: 'center'
                  }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>PROCESADOS</span>
                      <strong style={{ fontSize: '1.5rem', color: '#065f46' }}>{importResult.total}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>CREADOS</span>
                      <strong style={{ fontSize: '1.5rem', color: '#065f46' }}>{importResult.creadas}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>OMITIDOS</span>
                      <strong style={{ fontSize: '1.5rem', color: '#065f46' }}>{importResult.omitidas}</strong>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-around',
                    textAlign: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Correos Enviados</span>
                      <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0f172a' }}>{importResult.correos_enviados || 0}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Correos Fallidos</span>
                      <strong style={{ display: 'block', fontSize: '1.1rem', color: '#ef4444' }}>{importResult.correos_fallidos || 0}</strong>
                    </div>
                  </div>

                  {importResult.errores && importResult.errores.length > 0 && (
                    <div style={{ textAlign: 'left' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>
                        Detalles de Incidencias / Errores ({importResult.errores.length})
                      </h4>
                      <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        backgroundColor: '#fff'
                      }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                              <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569', width: '80px' }}>Fila</th>
                              <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Detalle / Motivo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.errores.map((err, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: 'bold' }}>Fila {err.fila}</td>
                                <td style={{ padding: '8px 12px', color: '#ef4444' }}>{err.motivo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setIsModalOpen(false)
                        setImportResult(null)
                        setFile(null)
                        setImportError('')
                      }}
                    >
                      Cerrar Resumen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
