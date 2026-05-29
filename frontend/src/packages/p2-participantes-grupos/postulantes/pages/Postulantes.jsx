import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import Loading from '@/shared/components/Loading'
import { getPostulantes, createPostulante, updatePostulante, deletePostulante } from '../services/postulanteService'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

export default function Postulantes() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nombres: '', apellidos: '', ci: '', genero: '', fecha_nacimiento: '', celular: '', email: '', direccion: '', carrera_postulada: '' })
  const navigate = useNavigate()

  useEffect(() => { fetchData() }, [search])

  const fetchData = async () => {
    try { const r = await getPostulantes({ search }); setItems(r.data.data || []) } catch {} finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await updatePostulante(editing.id, form)
      else await createPostulante(form)
      setShowModal(false); setEditing(null); fetchData()
    } catch (err) { setError(err.response?.data?.message || 'Error.') }
  }

  const handleEdit = (p) => {
    setEditing(p); setForm({ nombres: p.nombres, apellidos: p.apellidos, ci: p.ci, genero: p.genero || '', fecha_nacimiento: p.fecha_nacimiento || '', celular: p.celular || '', email: p.email || '', direccion: p.direccion || '', carrera_postulada: p.carrera_postulada || '' }); setShowModal(true)
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Postulantes</h1>
        <div className="page-header-actions">
          <div className="search-container"><FiSearch className="search-icon" /><input className="search-input" placeholder="Buscar por nombre, CI, carrera..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ nombres: '', apellidos: '', ci: '', genero: '', fecha_nacimiento: '', celular: '', email: '', direccion: '', carrera_postulada: '' }); setShowModal(true) }}><FiPlus /> Nuevo</button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Nombre Completo</th><th>CI</th><th>Email</th><th>Carrera</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id}>
                <td><strong>{p.nombres} {p.apellidos}</strong></td>
                <td>{p.ci}</td>
                <td>{p.email || '-'}</td>
                <td>{p.carrera_postulada || '-'}</td>
                <td><StatusBadge status={p.estado} /></td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/postulantes/${p.id}`)}><FiEye /></button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleEdit(p)}><FiEdit2 /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(p)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Sin postulantes</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">{editing ? 'Editar' : 'Nuevo'} Postulante</span><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="login-alert">{error}</div>}
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Nombres</label><input className="form-input" value={form.nombres} onChange={e => setForm({...form, nombres: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Apellidos</label><input className="form-input" value={form.apellidos} onChange={e => setForm({...form, apellidos: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">CI</label><input className="form-input" value={form.ci} onChange={e => setForm({...form, ci: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Celular</label><input className="form-input" value={form.celular} onChange={e => setForm({...form, celular: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Carrera</label><input className="form-input" value={form.carrera_postulada} onChange={e => setForm({...form, carrera_postulada: e.target.value})} /></div>
                </div>
              </div>
              <div className="modal-footer"><button className="btn btn-outline" type="button" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn-primary" type="submit">Guardar</button></div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && <ConfirmDialog title="Eliminar postulante" message={`¿Eliminar a ${confirmDelete.nombres} ${confirmDelete.apellidos}?`} onConfirm={async () => { await deletePostulante(confirmDelete.id); setConfirmDelete(null); fetchData() }} onCancel={() => setConfirmDelete(null)} />}
    </Layout>
  )
}
