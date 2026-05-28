import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import Loading from '../../components/Loading'
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, activateUsuario, deactivateUsuario, getRoles } from '../../services/userService'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiCheck, FiX } from 'react-icons/fi'

export default function Usuarios() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', ci: '', password: '', role_id: '' })
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [search])
  useEffect(() => { getRoles().then(r => setRoles(r.data)).catch(() => {}) }, [])

  const fetchData = async () => {
    try {
      const res = await getUsuarios({ search })
      setUsers(res.data.data || [])
    } catch {} finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) { await updateUsuario(editing.id, form) }
      else { await createUsuario(form) }
      setShowModal(false); setEditing(null); setForm({ name: '', email: '', ci: '', password: '', role_id: '' }); fetchData()
    } catch (err) { setError(err.response?.data?.message || 'Error al guardar.') }
  }

  const handleEdit = (u) => {
    setEditing(u); setForm({ name: u.name, email: u.email, ci: u.ci || '', password: '', role_id: u.role_id }); setShowModal(true)
  }

  const handleDelete = async () => {
    await deleteUsuario(confirmDelete.id); setConfirmDelete(null); fetchData()
  }

  const toggleStatus = async (u) => {
    if (u.estado === 'activo') await deactivateUsuario(u.id)
    else await activateUsuario(u.id)
    fetchData()
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Usuarios</h1>
        <div className="page-header-actions">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input className="search-input" placeholder="Buscar usuarios..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', email: '', ci: '', password: '', role_id: '' }); setShowModal(true) }}>
            <FiPlus /> Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Nombre</th><th>Email</th><th>CI</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>{u.ci || '-'}</td>
                <td><span className="badge badge-info">{u.role?.name || '-'}</span></td>
                <td><StatusBadge status={u.estado} /></td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => handleEdit(u)}><FiEdit2 /></button>
                    <button className="btn btn-outline btn-sm" onClick={() => toggleStatus(u)} title={u.estado === 'activo' ? 'Inactivar' : 'Activar'}>
                      {u.estado === 'activo' ? <FiX /> : <FiCheck />}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(u)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No se encontraron usuarios</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</span><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="login-alert">{error}</div>}
                <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">CI</label><input className="form-input" value={form.ci} onChange={e => setForm({...form, ci: e.target.value})} /></div>
                {!editing && <div className="form-group"><label className="form-label">Contraseña</label><input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>}
                <div className="form-group"><label className="form-label">Rol</label>
                  <select className="form-select" value={form.role_id} onChange={e => setForm({...form, role_id: e.target.value})} required>
                    <option value="">Seleccionar rol</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer"><button className="btn btn-outline" type="button" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn-primary" type="submit">Guardar</button></div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && <ConfirmDialog title="Eliminar usuario" message={`¿Eliminar a ${confirmDelete.name}?`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />}
    </Layout>
  )
}
