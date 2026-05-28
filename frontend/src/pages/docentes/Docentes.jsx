import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import Loading from '../../components/Loading'
import { getDocentes, createDocente, updateDocente, deleteDocente } from '../../services/docenteService'
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi'

export default function Docentes() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nombres: '', apellidos: '', ci: '', email: '', celular: '', profesion: '', tiene_maestria: false, tiene_diplomado: false })

  useEffect(() => { fetchData() }, [search])
  const fetchData = async () => { try { const r = await getDocentes({ search }); setItems(r.data.data || []) } catch {} finally { setLoading(false) } }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try { if (editing) await updateDocente(editing.id, form); else await createDocente(form); setShowModal(false); setEditing(null); fetchData() }
    catch (err) { setError(err.response?.data?.message || 'Error.') }
  }

  const handleEdit = (d) => {
    setEditing(d); setForm({ nombres: d.nombres, apellidos: d.apellidos, ci: d.ci, email: d.email || '', celular: d.celular || '', profesion: d.profesion || '', tiene_maestria: d.tiene_maestria, tiene_diplomado: d.tiene_diplomado }); setShowModal(true)
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Docentes</h1>
        <div className="page-header-actions">
          <div className="search-container"><FiSearch className="search-icon" /><input className="search-input" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ nombres: '', apellidos: '', ci: '', email: '', celular: '', profesion: '', tiene_maestria: false, tiene_diplomado: false }); setShowModal(true) }}><FiPlus /> Nuevo</button>
        </div>
      </div>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Nombre</th><th>CI</th><th>Email</th><th>Profesión</th><th>Maestría</th><th>Diplomado</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map(d => (<tr key={d.id}><td><strong>{d.nombres} {d.apellidos}</strong></td><td>{d.ci}</td><td>{d.email || '-'}</td><td>{d.profesion || '-'}</td><td>{d.tiene_maestria ? '✅' : '❌'}</td><td>{d.tiene_diplomado ? '✅' : '❌'}</td><td><StatusBadge status={d.estado} /></td><td><div className="table-actions"><button className="btn btn-outline btn-sm" onClick={() => handleEdit(d)}><FiEdit2 /></button><button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(d)}><FiTrash2 /></button></div></td></tr>))}
            {items.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Sin docentes</td></tr>}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><span className="modal-title">{editing ? 'Editar' : 'Nuevo'} Docente</span><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
          <form onSubmit={handleSubmit}><div className="modal-body">
            {error && <div className="login-alert">{error}</div>}
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Nombres</label><input className="form-input" value={form.nombres} onChange={e => setForm({...form, nombres: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Apellidos</label><input className="form-input" value={form.apellidos} onChange={e => setForm({...form, apellidos: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">CI</label><input className="form-input" value={form.ci} onChange={e => setForm({...form, ci: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Celular</label><input className="form-input" value={form.celular} onChange={e => setForm({...form, celular: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Profesión</label><input className="form-input" value={form.profesion} onChange={e => setForm({...form, profesion: e.target.value})} /></div>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              <label className="checkbox-group"><input type="checkbox" checked={form.tiene_maestria} onChange={e => setForm({...form, tiene_maestria: e.target.checked})} /><span>Tiene maestría</span></label>
              <label className="checkbox-group"><input type="checkbox" checked={form.tiene_diplomado} onChange={e => setForm({...form, tiene_diplomado: e.target.checked})} /><span>Tiene diplomado</span></label>
            </div>
          </div><div className="modal-footer"><button className="btn btn-outline" type="button" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn-primary" type="submit">Guardar</button></div></form>
        </div></div>
      )}
      {confirmDelete && <ConfirmDialog title="Eliminar docente" message={`¿Eliminar a ${confirmDelete.nombres}?`} onConfirm={async () => { await deleteDocente(confirmDelete.id); setConfirmDelete(null); fetchData() }} onCancel={() => setConfirmDelete(null)} />}
    </Layout>
  )
}
