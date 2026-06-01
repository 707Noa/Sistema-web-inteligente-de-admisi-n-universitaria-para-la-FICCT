import React, { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import {
  getPostulantes,
  generarCuenta,
  deletePostulante,
  importarPostulantesCsv,
} from '../services/postulanteService'
import {
  FiSearch, FiEye, FiUserCheck, FiRefreshCw, FiUpload, FiUsers, FiAlertCircle, FiCheckCircle,
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

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getPostulantes({ search })
      setItems(r.data.data || [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  const showMsg = (type, text) => {
    setMensaje({ type, text })
    setTimeout(() => setMensaje(null), 6000)
  }

  /* ── Generar cuenta individual ── */
  const handleGenerarCuenta = async (postulante) => {
    setGenerando(postulante.id)
    try {
      const r = await generarCuenta(postulante.id)
      const codigo = r.data.user?.codigo || r.data.postulante?.codigo_usuario || ''
      showMsg('success', `Cuenta creada. Código de acceso: ${codigo}`)
      fetchData()
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
      fetchData()
    } catch (err) {
      setResultado({ error: err.response?.data?.message || 'Error al procesar el archivo.' })
    } finally { setProcesando(false) }
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      {/* ── Cabecera ── */}
      <div className="page-header">
        <h1>Gestión de Postulantes</h1>
        <div className="page-header-actions">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por nombre o CI..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => { setShowMasivoModal(true); setResultado(null) }}
          >
            <FiUsers /> Generación Masiva
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
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>CI</th>
              <th>Carrera</th>
              <th>Estado</th>
              <th>Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id}>
                <td><strong>{p.nombres} {p.apellidos}</strong></td>
                <td>{p.ci}</td>
                <td style={{ maxWidth: 180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {p.carrera || p.carrera_postulada || '-'}
                </td>
                <td><StatusBadge status={p.estado_tramite} /></td>
                <td style={{ whiteSpace:'nowrap', fontSize:'0.82rem', color:'var(--gray-500)' }}>
                  {formatFecha(p.created_at)}
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-outline btn-sm" title="Ver perfil"
                      onClick={() => navigate(`/admin/postulantes/${p.id}`)}>
                      <FiEye />
                    </button>
                    {p.estado_tramite === 'PREINSCRITO' && !p.user_id && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleGenerarCuenta(p)}
                        disabled={generando === p.id}
                        title="Crear cuenta e inscribir"
                      >
                        {generando === p.id
                          ? <FiRefreshCw style={{ animation:'spin 0.8s linear infinite' }} />
                          : <FiUserCheck />}
                        Inscribir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>
                Sin postulantes con pago confirmado
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

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

                  {/* Nota informativa */}
                  <div style={{
                    display:'flex', gap:10, alignItems:'flex-start',
                    background:'#eff6ff', border:'1px solid #bfdbfe',
                    borderRadius:'var(--radius)', padding:'12px 14px', marginBottom:20,
                    fontSize:'0.83rem', color:'#1e40af', lineHeight:1.5,
                  }}>
                    <FiAlertCircle style={{ flexShrink:0, marginTop:2 }} />
                    <div>
                      <strong>Formato CSV (separador <code>;</code>):</strong>
                      <code style={{ display:'block', marginTop:4, marginBottom:6, wordBreak:'break-all' }}>
                        Nombres;Apellidos;CI;Correo;Teléfono;"1ª Carrera";"2ª Carrera";"Unidad Educativa";Ciudad;Estado
                      </code>
                      <span>
                        Estado <code>PREINSCRITO</code>: importa el postulante <strong>sin</strong> crear cuenta.
                        Estado <code>INSCRITO</code>: importa <strong>y</strong> genera cuenta de acceso automáticamente.
                      </span>
                    </div>
                  </div>

                  {/* Zona de carga drag & drop */}
                  <div className="form-group">
                    <label className="form-label">Archivo CSV</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      style={{
                        border: `2px dashed ${dragOver ? 'var(--primary)' : csvFile ? 'var(--success)' : 'var(--gray-300)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '32px 20px',
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
    </Layout>
  )
}
