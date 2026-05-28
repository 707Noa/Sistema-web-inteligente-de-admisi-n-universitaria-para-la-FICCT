import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import Loading from '../../components/Loading'
import ConfirmDialog from '../../components/ConfirmDialog'
import { getMaterias, createMateria, updateMateria, deleteMateria } from '../../services/materiaService'
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi'
import StatusBadge from '../../components/StatusBadge'

export default function Materias() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nombre: '', codigo: '', descripcion: '' })

  useEffect(() => { fetchData() }, [search])
  const fetchData = async () => { try { const r = await getMaterias({ search }); setItems(r.data.data || []) } catch {} finally { setLoading(false) } }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try { if (editing) await updateMateria(editing.id, form); else await createMateria(form); setShowModal(false); setEditing(null); fetchData() }
    catch (err) { setError(err.response?.data?.message || 'Error.') }
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Materias</h1>
        <div className="page-header-actions">
          <div className="search-container"><FiSearch className="search-icon" /><input className="search-input" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ nombre: '', codigo: '', descripcion: '' }); setShowModal(true) }}><FiPlus /> Nueva</button>
        </div>
      </div>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Nombre</th><th>Código</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map(m => (<tr key={m.id}><td><strong>{m.nombre}</strong></td><td><span className="badge badge-info">{m.codigo}</span></td><td>{m.descripcion || '-'}</td><td><StatusBadge status={m.estado} /></td><td><div className="table-actions"><button className="btn btn-outline btn-sm" onClick={() => { setEditing(m); setForm({ nombre: m.nombre, codigo: m.codigo, descripcion: m.descripcion || '' }); setShowModal(true) }}><FiEdit2 /></button><button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(m)}><FiTrash2 /></button></div></td></tr>))}
            {items.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Sin materias</td></tr>}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><span className="modal-title">{editing ? 'Editar' : 'Nueva'} Materia</span><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
          <form onSubmit={handleSubmit}><div className="modal-body">
            {error && <div className="login-alert">{error}</div>}
            <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required /></div>
            <div className="form-group"><label className="form-label">Código</label><input className="form-input" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} required /></div>
            <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-textarea" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} /></div>
          </div><div className="modal-footer"><button className="btn btn-outline" type="button" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn-primary" type="submit">Guardar</button></div></form>
        </div></div>
      )}
      {confirmDelete && <ConfirmDialog title="Eliminar materia" message={`¿Eliminar ${confirmDelete.nombre}?`} onConfirm={async () => { await deleteMateria(confirmDelete.id); setConfirmDelete(null); fetchData() }} onCancel={() => setConfirmDelete(null)} />}
    </Layout>
  )
}
