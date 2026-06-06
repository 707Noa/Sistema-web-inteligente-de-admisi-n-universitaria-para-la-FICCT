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
} from '../services/postulanteService'
import {
  FiSearch, FiEye, FiUserCheck, FiRefreshCw, FiUpload, FiUsers,
  FiAlertCircle, FiCheckCircle, FiEdit2, FiTrash2,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

// ── Utilidades ────────────────────────────────────────────────────────────────

function toInputDate(dateStr) {
  if (!dateStr) return ''
  return String(dateStr).substring(0, 10)
}

function previewRegistro(ci) {
  if (!ci) return ''
  return '2026' + ci.split('').reverse().join('')
}

const ESTADOS_TRAMITE = ['PREINSCRITO', 'INSCRITO', 'PENDIENTE_PAGO']

// ── Componente principal ──────────────────────────────────────────────────────

export default function Postulantes() {
  const navigate    = useNavigate()
  const fileInputRef = useRef(null)

  // ── Lista ──
  const [items, setItems]     = useState([])
  const [meta, setMeta]       = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 })
  const [conteos, setConteos] = useState({ estado_tramite: {}, carrera: {} })
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtroEstado, setFiltroEstado]   = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [pagina, setPagina]   = useState(1)
  const [generando, setGenerando] = useState(null)
  const [mensaje, setMensaje]    = useState(null)

  // ── Modal edición ──
  const [showForm, setShowForm]     = useState(false)
  const [editId, setEditId]         = useState(null)
  const [formData, setFormData]     = useState({})
  const [formErrors, setFormErrors] = useState({})
  const [formLoading, setFormLoading] = useState(false)

  // ── Confirmación eliminar ──
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  // ── Modal masivo ──
  const [showMasivo, setShowMasivo] = useState(false)
  const [csvFile, setCsvFile]       = useState(null)
  const [dragOver, setDragOver]     = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado]   = useState(null)

  // ── Helpers ──
  const showMsg = (type, text) => {
    setMensaje({ type, text })
    setTimeout(() => setMensaje(null), 6000)
  }

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page: pagina }
      if (search)        params.search        = search
      if (filtroEstado)  params.estado_tramite = filtroEstado
      if (filtroCarrera) params.carrera        = filtroCarrera

      const r = await getPostulantes(params)
      const d = r.data
      setItems(d.data || [])
      setMeta({
        current_page: d.current_page,
        last_page:    d.last_page,
        total:        d.total,
        per_page:     d.per_page,
      })
      if (d.conteos) setConteos(d.conteos)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [pagina, search, filtroEstado, filtroCarrera])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  const handleSearch        = (v) => { setSearch(v);        setPagina(1) }
  const handleFiltroEstado  = (v) => { setFiltroEstado(v);  setPagina(1) }
  const handleFiltroCarrera = (v) => { setFiltroCarrera(v); setPagina(1) }

  // ── Generar cuenta ──
  const handleGenerarCuenta = async (p) => {
    setGenerando(p.id)
    try {
      const r = await generarCuenta(p.id)
      const codigo = r.data.user?.codigo || r.data.postulante?.codigo_usuario || ''
      showMsg('success', `Cuenta creada. Código: ${codigo}`)
      fetchData()
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Error al generar cuenta.')
    } finally {
      setGenerando(null)
    }
  }

  // ── Abrir edición ──
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
      fetchData()
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

  // ── Eliminar ──
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePostulante(deleteTarget.id)
      showMsg('success', `"${deleteTarget.nombres} ${deleteTarget.apellidos}" eliminado.`)
      setDeleteTarget(null)
      fetchData()
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Error al eliminar.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  // ── Masivo ──
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
      setResultado(r.data); fetchData()
    } catch (err) {
      setResultado({ error: err.response?.data?.message || 'Error al procesar el archivo.' })
    } finally {
      setProcesando(false)
    }
  }

  // ── Paginación ──
  const renderPaginas = () => {
    const total = meta.last_page
    const cur   = meta.current_page
    if (total <= 1) return null
    const radius = 2
    const pages  = []
    for (let i = Math.max(1, cur - radius); i <= Math.min(total, cur + radius); i++) pages.push(i)
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
          Mostrando {Math.min((cur - 1) * meta.per_page + 1, meta.total)}–{Math.min(cur * meta.per_page, meta.total)} de {meta.total} postulantes
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-outline btn-sm" disabled={cur <= 1} onClick={() => setPagina(cur - 1)}>
            <FiChevronLeft />
          </button>
          {pages[0] > 1 && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => setPagina(1)}>1</button>
              {pages[0] > 2 && <span style={{ padding: '4px 6px', color: 'var(--gray-400)' }}>…</span>}
            </>
          )}
          {pages.map(p => (
            <button key={p} className={`btn btn-sm ${p === cur ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPagina(p)}>{p}</button>
          ))}
          {pages[pages.length - 1] < total && (
            <>
              {pages[pages.length - 1] < total - 1 && <span style={{ padding: '4px 6px', color: 'var(--gray-400)' }}>…</span>}
              <button className="btn btn-outline btn-sm" onClick={() => setPagina(total)}>{total}</button>
            </>
          )}
          <button className="btn btn-outline btn-sm" disabled={cur >= total} onClick={() => setPagina(cur + 1)}>
            <FiChevronRight />
          </button>
        </div>
      </div>
    )
  }

  // ── Opciones para selects ──
  const carrerasOpciones = Object.keys(conteos.carrera || {}).sort()
  const estadosOpciones  = Object.keys(conteos.estado_tramite || {}).sort()

  // Texto de contador dinámico
  const textoContador = () => {
    const parts = []
    if (filtroEstado)  parts.push(filtroEstado)
    if (filtroCarrera) parts.push(filtroCarrera)
    if (parts.length > 0) return `${meta.total} postulante${meta.total !== 1 ? 's' : ''} — ${parts.join(', ')}`
    if (search) return `${meta.total} resultado${meta.total !== 1 ? 's' : ''} para "${search}"`
    return `${meta.total} postulante${meta.total !== 1 ? 's' : ''} en total`
  }

  if (loading && items.length === 0) return <Layout><Loading /></Layout>

  return (
    <Layout>

      {/* ══════════════════════════════════════════════
          Cabecera con controles en una sola barra
      ══════════════════════════════════════════════ */}
      <div className="page-header">
        <h1>Gestión de Postulantes</h1>
        <div className="page-header-actions" style={{ flexWrap: 'wrap', gap: '10px' }}>

          {/* Buscador */}
          <div className="search-container" style={{ minWidth: 200, flex: '1 1 200px', maxWidth: 280 }}>
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por nombre o CI..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>

          {/* Filtro carrera */}
          <select
            className="form-select"
            value={filtroCarrera}
            onChange={e => handleFiltroCarrera(e.target.value)}
            style={{ minWidth: 180, flex: '1 1 180px', maxWidth: 260 }}
          >
            <option value="">Todas las carreras</option>
            {carrerasOpciones.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Filtro estado */}
          <select
            className="form-select"
            value={filtroEstado}
            onChange={e => handleFiltroEstado(e.target.value)}
            style={{ minWidth: 150, flex: '1 1 150px', maxWidth: 200 }}
          >
            <option value="">Todos los estados</option>
            {(estadosOpciones.length > 0 ? estadosOpciones : ESTADOS_TRAMITE).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Generación masiva */}
          <button
            className="btn btn-primary"
            onClick={() => { setShowMasivo(true); setResultado(null) }}
            style={{ whiteSpace: 'nowrap' }}
          >
            <FiUsers /> Generación Masiva
          </button>

        </div>
      </div>

      {/* Contador de resultados */}
      <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: '0 0 12px', paddingLeft: 2 }}>
        {loading ? 'Actualizando...' : textoContador()}
      </p>

      {/* ── Mensaje flotante ── */}
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
                <td
                  style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={p.carrera || p.carrera_postulada}
                >
                  {p.carrera || p.carrera_postulada || '-'}
                </td>
                <td><StatusBadge status={p.estado_tramite} /></td>
                <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--gray-600)' }}>
                  {p.codigo_usuario || '-'}
                </td>
                <td>
                  <div className="table-actions">
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
                    <button
                      className="btn btn-sm"
                      title="Eliminar"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', background: 'transparent', border: '1px solid' }}
                      onClick={() => setDeleteTarget(p)}
                    >
                      <FiTrash2 />
                    </button>
                    {p.estado_tramite === 'PREINSCRITO' && !p.user_id && (
                      <button
                        className="btn btn-primary btn-sm"
                        title="Crear cuenta e inscribir"
                        disabled={generando === p.id}
                        onClick={() => handleGenerarCuenta(p)}
                      >
                        {generando === p.id
                          ? <FiRefreshCw style={{ animation: 'spin 0.8s linear infinite' }} />
                          : <FiUserCheck />}
                        Inscribir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No se encontraron postulantes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Paginación ── */}
      {renderPaginas()}


      {/* ══════════════════════════════════════════════
          Modal — Editar Postulante
      ══════════════════════════════════════════════ */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Editar Postulante</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
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
                    <label className="form-label">Teléfono</label>
                    <input className="form-input" value={formData.celular}
                      onChange={e => setFormData({ ...formData, celular: e.target.value })} />
                    {fieldErr('celular') && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErr('celular')}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Correo electrónico</label>
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
                    <label className="form-label">Dirección</label>
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


      {/* ══════════════════════════════════════════════
          Modal — Confirmar Eliminación
      ══════════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 430 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Confirmar Eliminación</span>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 10 }}>
                ¿Está seguro de que desea eliminar al postulante{' '}
                <strong>{deleteTarget.nombres} {deleteTarget.apellidos}</strong> (CI: {deleteTarget.ci})?
              </p>
              <p style={{ color: '#991b1b', fontSize: '0.85rem', margin: 0 }}>
                Esta acción eliminará permanentemente el registro.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button
                className="btn"
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════
          Modal — Generación Masiva
      ══════════════════════════════════════════════ */}
      {showMasivo && (
        <div className="modal-overlay" onClick={closeMasivo}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Generación Masiva de Cuentas</span>
              <button className="modal-close" onClick={closeMasivo}>×</button>
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
                        Nombres;Apellidos;CI;Correo;Teléfono;"1ª Carrera";"2ª Carrera";"Unidad Educativa";Ciudad;Estado
                      </code>
                      <span>
                        Estado <code>PREINSCRITO</code>: importa el postulante <strong>sin</strong> crear cuenta.{' '}
                        Estado <code>INSCRITO</code>: importa <strong>y</strong> genera cuenta automáticamente.{' '}
                        El campo <strong>Registro</strong> se genera automáticamente desde el CI.
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Archivo CSV</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      style={{
                        border: `2px dashed ${dragOver ? 'var(--primary)' : csvFile ? 'var(--success)' : 'var(--gray-300)'}`,
                        borderRadius: 'var(--radius-md)', padding: '32px 20px', textAlign: 'center',
                        cursor: 'pointer', background: dragOver ? '#eff6ff' : csvFile ? '#f0fdf4' : 'var(--gray-50)',
                        transition: 'all 0.2s ease', userSelect: 'none',
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
                          Haga clic para seleccionar o arrastre un archivo CSV aquí
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

    </Layout>
  )
}
