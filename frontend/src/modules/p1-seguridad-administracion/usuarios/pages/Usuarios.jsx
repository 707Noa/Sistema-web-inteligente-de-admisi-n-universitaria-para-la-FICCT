import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import {
  getUsuarios, createUsuario, updateUsuario,
  activateUsuario, deactivateUsuario, getRoles,
} from '../services/userService'
import { FiPlus, FiEdit2, FiSearch, FiAlertCircle } from 'react-icons/fi'

const ROL_LABELS = {
  docente:      'Docente',
  coordinador:  'Coordinador Académico',
  autoridad:    'Autoridad Académica',
}

const emptyForm = { name: '', email: '', ci: '', role_id: '', estado: 'activo' }

export default function Usuarios() {
  const [users, setUsers]         = useState([])
  const [roles, setRoles]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(emptyForm)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)

  /* ── Data ── */
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

  /* ── Toggle estado (silencioso) ── */
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

  /* ── Modal helpers ── */
  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({
      name:    u.name    || '',
      email:   u.email   || '',
      ci:      u.ci      || '',
      role_id: u.role_id || '',
      estado:  u.estado  || 'activo',
    })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setForm(emptyForm)
    setError('')
  }

  /* ── Guardar ── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editing) {
        await updateUsuario(editing.id, form)
      } else {
        await createUsuario(form)
      }
      closeModal()
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const rolLabel = (name) => ROL_LABELS[name] || name || '-'

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      {/* ── Cabecera ── */}
      <div className="page-header">
        <h1>Gestión de Usuarios</h1>
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
              <th>Correo Electrónico</th>
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
                <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                  {u.codigo || '-'}
                </td>
                {/* Badge clickable para toggle activo/inactivo */}
                <td
                  onClick={() => handleToggleEstado(u)}
                  title={u.estado === 'activo' ? 'Click para desactivar' : 'Click para activar'}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <StatusBadge status={u.estado} />
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => openEdit(u)}
                      title="Editar usuario"
                    >
                      <FiEdit2 /> Editar
                    </button>
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
          Modal — Crear / Editar
      ══════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {editing ? 'Editar Usuario' : 'Nuevo Usuario'}
              </span>
              <button className="modal-close" onClick={closeModal}>×</button>
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
                  {/* Nombre */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Nombre Completo *</label>
                    <input
                      className="form-input"
                      placeholder="Ej: Juan Carlos Pérez López"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* CI */}
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
                        La contraseña inicial será el CI.
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label className="form-label">Correo Electrónico *</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                    {!editing && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4, display: 'block' }}>
                        El usuario de acceso será este correo.
                      </span>
                    )}
                  </div>

                  {/* Rol */}
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
                        <option key={r.id} value={r.id}>
                          {rolLabel(r.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estado */}
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
                <button className="btn btn-outline" type="button" onClick={closeModal}>
                  Cancelar
                </button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
