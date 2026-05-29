import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import OccupancyBar from '@/shared/components/OccupancyBar'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import StatusBadge from '@/shared/components/StatusBadge'
import { getGrupos, createGrupo, updateGrupo, deleteGrupo } from '../services/grupoService'
import { FiPlus, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

export default function Grupos() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nombre_grupo: '', capacidad_maxima: 70, aula: '', horario: '' })
  const navigate = useNavigate()

  useEffect(() => { fetchData() }, [])
  const fetchData = async () => { try { const r = await getGrupos(); setItems(r.data.data || []) } catch {} finally { setLoading(false) } }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try { if (editing) await updateGrupo(editing.id, form); else await createGrupo(form); setShowModal(false); setEditing(null); fetchData() }
    catch (err) { setError(err.response?.data?.message || 'Error.') }
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Grupos</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ nombre_grupo: '', capacidad_maxima: 70, aula: '', horario: '' }); setShowModal(true) }}><FiPlus /> Nuevo Grupo</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {items.map(g => (
          <div key={g.id} className="card">
            <div className="card-header">
              <span className="card-title">{g.nombre_grupo}</span>
              <StatusBadge status={g.estado} />
            </div>
            <OccupancyBar current={g.postulantes_count || 0} max={g.capacidad_maxima} />
            <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              {g.docente && <div>Docente: {g.docente.nombres} {g.docente.apellidos}</div>}
              {g.materia && <div>Materia: {g.materia.nombre}</div>}
              {g.aula && <div>Aula: {g.aula}</div>}
              {g.horario && <div>Horario: {g.horario}</div>}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/grupos/${g.id}`)}><FiEye /> Ver</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setEditing(g); setForm({ nombre_grupo: g.nombre_grupo, capacidad_maxima: g.capacidad_maxima, aula: g.aula || '', horario: g.horario || '' }); setShowModal(true) }}><FiEdit2 /></button>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(g)}><FiTrash2 /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p style={{ color: 'var(--gray-400)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>Sin grupos</p>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><span className="modal-title">{editing ? 'Editar' : 'Nuevo'} Grupo</span><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
          <form onSubmit={handleSubmit}><div className="modal-body">
            {error && <div className="login-alert">{error}</div>}
            <div className="form-group"><label className="form-label">Nombre del grupo</label><input className="form-input" value={form.nombre_grupo} onChange={e => setForm({...form, nombre_grupo: e.target.value})} required /></div>
            <div className="form-group"><label className="form-label">Capacidad máxima</label><input className="form-input" type="number" value={form.capacidad_maxima} onChange={e => setForm({...form, capacidad_maxima: parseInt(e.target.value)})} /></div>
            <div className="form-group"><label className="form-label">Aula</label><input className="form-input" value={form.aula} onChange={e => setForm({...form, aula: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Horario</label><input className="form-input" value={form.horario} onChange={e => setForm({...form, horario: e.target.value})} placeholder="Lunes 08:00 - 10:00" /></div>
          </div><div className="modal-footer"><button className="btn btn-outline" type="button" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn-primary" type="submit">Guardar</button></div></form>
        </div></div>
      )}
      {confirmDelete && <ConfirmDialog title="Eliminar grupo" message={`¿Eliminar ${confirmDelete.nombre_grupo}?`} onConfirm={async () => { await deleteGrupo(confirmDelete.id); setConfirmDelete(null); fetchData() }} onCancel={() => setConfirmDelete(null)} />}
    </Layout>
  )
}
