import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import { useAuth } from '@/modules/p1-seguridad-administracion/auth/hooks/useAuth'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import {
  getUsuarios, createUsuario, updateUsuario,
  activateUsuario, deactivateUsuario, getRoles, deleteUsuario,
  getDocenteRequisitos, updateDocenteRequisitos,
} from '../services/userService'
import { FiPlus, FiEdit2, FiSearch, FiAlertCircle, FiTrash2, FiClipboard } from 'react-icons/fi'

const ROL_LABELS = {
  docente:     'Docente',
  coordinador: 'Coordinador Academico',
  autoridad:   'Autoridad Academica',
}

const emptyForm = { name: '', email: '', ci: '', role_id: '', estado: 'activo' }

const emptyReq = {
  docente_id:            null,
  nombres:               '',
  apellidos:             '',
  ci:                    '',
  tiene_profesion_area:  false,
  tiene_maestria:        false,
  tiene_diplomado:       false,
  estado_cumplimiento:   'NO_CUMPLE',
}

// ── Componente auxiliar: Radio par Cumple / No cumple ────────────────────────
function RequisitoCampo({ label, value, onChange }) {
  return (
    <div className="form-group" style={{ marginBottom: 16 }}>
      <label className="form-label" style={{ marginBottom: 8 }}>{label}</label>
      <div style={{ display: 'flex', gap: 24 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: value === true ? 600 : 400 }}>
          <input
            type="radio"
            name={label}
            checked={value === true}
            onChange={() => onChange(true)}
            style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
          />
          Cumple
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: value === false ? 600 : 400 }}>
          <input
            type="radio"
            name={label}
            checked={value === false}
            onChange={() => onChange(false)}
            style={{ accentColor: '#dc2626', width: 16, height: 16 }}
          />
          No cumple
        </label>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Usuarios() {
  const { user: loggedInUser } = useAuth()
  const [users, setUsers]         = useState([])
  const [roles, setRoles]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  // Modal crear/editar
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(emptyForm)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)

  // Modal requisitos
  const [showReq, setShowReq]         = useState(false)
  const [reqUserId, setReqUserId]     = useState(null)
  const [reqData, setReqData]         = useState(emptyReq)
  const [reqLoading, setReqLoading]   = useState(false)
  const [reqSaving, setReqSaving]     = useState(false)
  const [reqError, setReqError]       = useState('')
  const [reqSuccess, setReqSuccess]   = useState(false)

  // Modal confirmar eliminar
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [deleteError, setDeleteError]   = useState('')

  /* ── Carga de datos ── */
  const fetchData = useCallback(async () => {
    try {
      const res = await getUsuarios({ search })
      setUsers(res.data.data || [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  useEffect(() => {
    getRoles()
      .then(r => setRoles((r.data || []).filter(
        rol => !['postulante', 'administrador'].includes(rol.name)
      )))
      .catch(() => {})
  }, [])

  /* ── Toggle estado ── */
  const handleToggleEstado = async (u) => {
    try {
      if (u.estado === 'activo') {
        await deactivateUsuario(u.id)
      } else {
        await activateUsuario(u.id)
      }
      fetchData()
    } catch {
      // silencioso
    }
  }

  /* ── Modal crear/editar ── */
  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setError(''); setShowModal(true)
  }
  const openEdit = (u) => {
    setEditing(u)
    setForm({ name: u.name || '', email: u.email || '', ci: u.ci || '', role_id: u.role_id || '', estado: u.estado || 'activo' })
    setError(''); setShowModal(true)
  }
  const closeModal = () => {
    setShowModal(false); setEditing(null); setForm(emptyForm); setError('')
  }
  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      editing ? await updateUsuario(editing.id, form) : await createUsuario(form)
      closeModal(); fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  /* ── Modal requisitos ── */
  const openRequisitos = async (u) => {
    setReqUserId(u.id)
    setReqData(emptyReq)
    setReqError('')
    setReqSuccess(false)
    setReqLoading(true)
    setShowReq(true)
    try {
      const r = await getDocenteRequisitos(u.id)
      setReqData(r.data)
    } catch (err) {
      setReqError(err.response?.data?.message || 'No se pudieron cargar los requisitos del docente.')
    } finally {
      setReqLoading(false)
    }
  }

  const closeReq = () => {
    setShowReq(false); setReqUserId(null); setReqData(emptyReq)
    setReqError(''); setReqSuccess(false)
  }

  const handleSaveRequisitos = async (e) => {
    e.preventDefault()
    setReqError(''); setReqSuccess(false); setReqSaving(true)
    try {
      const r = await updateDocenteRequisitos(reqUserId, {
        tiene_profesion_area: reqData.tiene_profesion_area,
        tiene_maestria:       reqData.tiene_maestria,
        tiene_diplomado:      reqData.tiene_diplomado,
      })
      closeReq()
      fetchData()
      alert('Requisitos guardados correctamente.')
    } catch (err) {
      setReqError(err.response?.data?.message || 'Error al guardar los requisitos.')
    } finally {
      setReqSaving(false)
    }
  }

  // Estado de cumplimiento calculado en tiempo real
  const estadoCumplimiento = reqData.tiene_profesion_area && reqData.tiene_maestria && reqData.tiene_diplomado
    ? 'CUMPLE' : 'NO CUMPLE'
  const cumpleStyle = estadoCumplimiento === 'CUMPLE'
    ? { color: '#065f46', background: 'var(--success-light)', border: '1px solid #6ee7b7' }
    : { color: '#991b1b', background: 'var(--danger-light)',  border: '1px solid #fca5a5' }

  /* ── Modal eliminar ── */
  const openDelete = (u) => {
    if (loggedInUser && loggedInUser.id === u.id) {
      alert('No puedes eliminar tu propia cuenta de usuario.')
      return
    }
    setDeleteTarget(u); setDeleteError('')
  }
  const closeDelete = () => {
    setDeleteTarget(null); setDeleteError('')
  }
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError('')
    try {
      await deleteUsuario(deleteTarget.id)
      closeDelete(); fetchData()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Error al eliminar el usuario.')
    } finally {
      setDeleting(false)
    }
  }

  const rolLabel = (name) => ROL_LABELS[name] || name || '-'

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>

      {/* ── Cabecera ── */}
      <div className="page-header">
        <h1>Gestion de Usuarios</h1>
        <div className="page-header-actions">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por nombre, CI o correo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <FiPlus /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>CI</th>
              <th>Correo Electronico</th>
              <th>Rol</th>
              <th>Registro</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.ci || '-'}</td>
                <td>{u.email}</td>
                <td>
                  <span className="badge badge-info" style={{ textTransform: 'none' }}>
                    {rolLabel(u.role?.name)}
                  </span>
                </td>
                <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  {u.codigo || '-'}
                </td>
                <td
                  onClick={() => handleToggleEstado(u)}
                  title={u.estado === 'activo' ? 'Clic para desactivar' : 'Clic para activar'}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <StatusBadge status={u.estado} />
                </td>
                <td>
                  <div className="table-actions">
                    {/* Editar */}
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => openEdit(u)}
                      title="Editar usuario"
                    >
                      <FiEdit2 />
                    </button>

                    {/* Eliminar */}
                    <button
                      className="btn btn-sm"
                      onClick={() => openDelete(u)}
                      title="Eliminar usuario"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', background: 'transparent', border: '1px solid' }}
                    >
                      <FiTrash2 />
                    </button>

                    {/* Requisitos — solo para Docente, al final */}
                    {u.role?.name === 'docente' && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openRequisitos(u)}
                        title="Requisitos academicos del docente"
                        style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                      >
                        <FiClipboard />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No se encontraron usuarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


      {/* ══════════════════════════════════════════════
          Modal — Crear / Editar Usuario
      ══════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</span>
              <button className="modal-close" onClick={closeModal}>x</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    background: 'var(--danger-light)', color: '#991b1b',
                    padding: '10px 14px', borderRadius: 'var(--radius)',
                    marginBottom: 16, fontSize: '0.875rem',
                  }}>
                    <FiAlertCircle style={{ flexShrink: 0 }} /> {error}
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Nombre Completo *</label>
                    <input
                      className="form-input"
                      placeholder="Ej: Juan Carlos Perez Lopez"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">CI *</label>
                    <input
                      className="form-input"
                      placeholder="Ej: 9355594"
                      value={form.ci}
                      onChange={e => setForm({ ...form, ci: e.target.value })}
                      required={!editing}
                    />
                    {!editing && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4, display: 'block' }}>
                        La contrasena inicial sera el CI.
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Correo Electronico *</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Rol *</label>
                    <select
                      className="form-select"
                      value={form.role_id}
                      onChange={e => setForm({ ...form, role_id: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar rol</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{rolLabel(r.name)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select
                      className="form-select"
                      value={form.estado}
                      onChange={e => setForm({ ...form, estado: e.target.value })}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-outline" type="button" onClick={closeModal}>Cancelar</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════
          Modal — Requisitos Docente
      ══════════════════════════════════════════════ */}
      {showReq && (
        <div className="modal-overlay" onClick={closeReq}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Requisitos Docente</span>
              <button className="modal-close" onClick={closeReq}>x</button>
            </div>

            <div className="modal-body">

              {/* Nombre del docente */}
              {(reqData.nombres || reqData.apellidos) && (
                <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--gray-200)' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-500)' }}>Docente</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)' }}>
                    {reqData.nombres} {reqData.apellidos}
                  </p>
                  {reqData.ci && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--gray-500)' }}>CI: {reqData.ci}</p>
                  )}
                </div>
              )}

              {reqLoading && (
                <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '20px 0' }}>Cargando requisitos...</p>
              )}

              {reqError && (
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  background: 'var(--danger-light)', color: '#991b1b',
                  padding: '10px 14px', borderRadius: 'var(--radius)',
                  marginBottom: 16, fontSize: '0.875rem',
                }}>
                  <FiAlertCircle style={{ flexShrink: 0 }} /> {reqError}
                </div>
              )}

              {reqSuccess && (
                <div style={{
                  background: 'var(--success-light)', color: '#065f46',
                  padding: '10px 14px', borderRadius: 'var(--radius)',
                  marginBottom: 16, fontSize: '0.875rem', fontWeight: 600,
                }}>
                  Requisitos guardados correctamente.
                </div>
              )}

              {!reqLoading && !reqError && (
                <form id="form-requisitos" onSubmit={handleSaveRequisitos}>

                  <RequisitoCampo
                    label="Profesion en el area"
                    value={reqData.tiene_profesion_area}
                    onChange={v => setReqData({ ...reqData, tiene_profesion_area: v })}
                  />

                  <RequisitoCampo
                    label="Maestria"
                    value={reqData.tiene_maestria}
                    onChange={v => setReqData({ ...reqData, tiene_maestria: v })}
                  />

                  <RequisitoCampo
                    label="Diplomado en educacion superior"
                    value={reqData.tiene_diplomado}
                    onChange={v => setReqData({ ...reqData, tiene_diplomado: v })}
                  />

                  {/* Estado de cumplimiento — calculado automaticamente */}
                  <div style={{
                    marginTop: 8, padding: '12px 16px',
                    borderRadius: 'var(--radius)', ...cumpleStyle,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Estado de cumplimiento</span>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.03em' }}>{estadoCumplimiento}</span>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 8, marginBottom: 0 }}>
                    El estado se calcula automaticamente. Cumple cuando los tres requisitos estan marcados como Cumple.
                  </p>
                </form>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" type="button" onClick={closeReq}>Cerrar</button>
              {!reqLoading && !reqError && (
                <button
                  className="btn btn-primary"
                  type="submit"
                  form="form-requisitos"
                  disabled={reqSaving}
                >
                  {reqSaving ? 'Guardando...' : 'Guardar requisitos'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════
          Modal — Confirmar Eliminacion
      ══════════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={closeDelete}>
          <div className="modal" style={{ maxWidth: 430 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Confirmar Eliminacion</span>
              <button className="modal-close" onClick={closeDelete}>x</button>
            </div>
            <div className="modal-body">
              {deleteError && (
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  background: 'var(--danger-light)', color: '#991b1b',
                  padding: '10px 14px', borderRadius: 'var(--radius)',
                  marginBottom: 16, fontSize: '0.875rem',
                }}>
                  <FiAlertCircle style={{ flexShrink: 0 }} /> {deleteError}
                </div>
              )}
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 8 }}>
                Esta accion desactivara la cuenta del usuario{' '}
                <strong>{deleteTarget.name}</strong> ({rolLabel(deleteTarget.role?.name)}).
              </p>
              <p style={{ color: '#991b1b', fontSize: '0.85rem', margin: 0 }}>
                El usuario no podra iniciar sesion mientras su cuenta este inactiva.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeDelete}>Cancelar</button>
              <button
                className="btn"
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}
