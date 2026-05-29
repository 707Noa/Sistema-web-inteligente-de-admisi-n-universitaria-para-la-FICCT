import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import {
  listarPreinscripciones,
  descargarPreinscripcionesCsv,
  generarCuentaPostulante,
  generarCuentasMasivo
} from '../services/preinscripcionService'
import { FiSearch, FiDownload, FiKey, FiUsers, FiUserCheck } from 'react-icons/fi'

export default function PreinscripcionesList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [masivoLoading, setMasivoLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchData()
  }, [search])

  const fetchData = async () => {
    try {
      const res = await listarPreinscripciones({ search })
      setItems(res.data.data || [])
    } catch (err) {
      setError('Error al cargar la lista de preinscripciones.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCsv = async () => {
    setError('')
    setSuccess('')
    try {
      const res = await descargarPreinscripcionesCsv()
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `preinscripciones_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      setSuccess('CSV descargado correctamente.')
    } catch (err) {
      setError('Error al exportar los datos en CSV.')
    }
  }

  const handleGenerarCuenta = async (id, name) => {
    setActionLoading(id)
    setError('')
    setSuccess('')
    try {
      const res = await generarCuentaPostulante(id)
      setSuccess(`Cuenta creada con éxito para ${name}. Código generado: ${res.data.user.codigo}`)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar la cuenta.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMasivo = async () => {
    if (!window.confirm('¿Desea crear cuentas automáticas y enviar correos a todos los preinscritos que aún no tienen cuenta?')) return
    
    setMasivoLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await generarCuentasMasivo()
      setSuccess(res.data.message)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar cuentas en lote.')
    } finally {
      setMasivoLoading(false)
    }
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Gestión de Preinscripciones</h1>
        <div className="page-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por nombre, CI, correo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn btn-outline"
            onClick={handleDownloadCsv}
            title="Exportar registros a CSV"
          >
            <FiDownload /> Exportar CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={handleMasivo}
            disabled={masivoLoading}
            title="Crear cuentas para todos los postulantes preinscritos"
          >
            {masivoLoading ? 'Generando...' : <><FiUsers /> Generación Masiva</>}
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
              <th>Carrera</th>
              <th>Código Usuario</th>
              <th>Estado Trámite</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id}>
                <td>
                  <strong>{p.nombres} {p.apellidos}</strong>
                </td>
                <td>{p.ci}</td>
                <td>{p.email || '-'}</td>
                <td>{p.carrera || p.carrera_postulada || '-'}</td>
                <td>
                  {p.codigo_usuario ? (
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', color: 'var(--gray-700)' }}>
                      {p.codigo_usuario}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Sin cuenta</span>
                  )}
                </td>
                <td>
                  <StatusBadge status={p.estado_tramite === 'CUENTA_CREADA' ? 'activo' : 'pendiente'} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginLeft: '6px' }}>
                    ({p.estado_tramite || 'PREINSCRITO'})
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    {!p.user_id && !p.codigo_usuario ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleGenerarCuenta(p.id, `${p.nombres} ${p.apellidos}`)}
                        disabled={actionLoading === p.id}
                        title="Generar credenciales y enviar correo"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FiKey /> {actionLoading === p.id ? 'Generando...' : 'Crear Cuenta'}
                      </button>
                    ) : (
                      <span style={{ color: '#0f5132', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        <FiUserCheck /> Cuenta Activa
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No se encontraron preinscripciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
