import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import { getDocentes, createDocente, updateDocente, deleteDocente } from '../services/docenteService'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiCheckCircle } from 'react-icons/fi'

const emptyForm = {
  nombres: '', apellidos: '', ci: '', email: '',
  celular: '', profesion: '', tiene_maestria: false, tiene_diplomado: false,
}

export default function Docentes() {
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [error, setError]           = useState('')
  const [form, setForm]             = useState(emptyForm)
  const [credenciales, setCredenciales] = useState(null) // mostrar tras crear

  useEffect(() => { fetchData() }, [search])

  const fetchData = async () => {
    try { const r = await getDocentes({ search }); setItems(r.data.data || []) }
    catch {} finally { setLoading(false) }
  }

  const openCrear = () => { setEditing(null); setForm(emptyForm); setError(''); setCredenciales(null); setShowModal(true) }

  const openEditar = (d) => {
    setEditing(d)
    setForm({ nombres: d.nombres, apellidos: d.apellidos, ci: d.ci, email: d.email || '',
      celular: d.celular || '', profesion: d.profesion || '',
      tiene_maestria: d.tiene_maestria, tiene_diplomado: d.tiene_diplomado })
    setError(''); setCredenciales(null); setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditing(null); setCredenciales(null) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) {
        await updateDocente(editing.id, form)
        closeModal(); fetchData()
      } else {
        const r = await createDocente(form)
        // Mostrar credenciales generadas
        if (r.data?.usuario) {
          setCredenciales({
            email:    r.data.usuario.email,
            password: '2026' + String(form.ci).split('').reverse().join(''),
            codigo:   r.data.usuario.codigo,
          })
        }
        fetchData()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar.')
    }
  }

  const handleEliminar = async (d) => {
    try { await deleteDocente(d.id); fetchData() } catch {}
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Gestión del docente</h1>
        <div className="page-header-actions">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input className="search-input" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openCrear}><FiPlus /> Nuevo docente</button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th><th>CI</th><th>Correo</th>
              <th>Profesión</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id}>
                <td><strong>{d.nombres} {d.apellidos}</strong></td>
                <td>{d.ci}</td>
                <td>{d.email || '-'}</td>
                <td>{d.profesion || '-'}</td>
                <td><StatusBadge status={d.estado} /></td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEditar(d)}><FiEdit2 /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleEliminar(d)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>Sin docentes</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Editar docente' : 'Nuevo docente'}</span>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            {credenciales ? (
              /* ── Pantalla de credenciales generadas ── */
              <div className="modal-body">
                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16,
                  background:'var(--success-light)', color:'#065f46', padding:'12px 16px', borderRadius:'var(--radius)' }}>
                  <FiCheckCircle style={{ flexShrink:0 }} />
                  <strong>Docente creado correctamente. Credenciales de acceso:</strong>
                </div>
                {[
                  ['Usuario (correo)', credenciales.email],
                  ['Contraseña inicial', credenciales.password],
                  ['Registro', credenciales.codigo],
                ].map(([l, v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0',
                    borderBottom:'1px solid var(--gray-100)', fontSize:'0.875rem' }}>
                    <span style={{ color:'var(--gray-500)' }}>{l}</span>
                    <strong style={{ fontFamily:'monospace', color:'var(--primary)' }}>{v}</strong>
                  </div>
                ))}
                <p style={{ fontSize:'0.78rem', color:'var(--gray-500)', marginTop:12 }}>
                  El docente puede iniciar sesión en el portal con estas credenciales.
                </p>
                <div className="modal-footer" style={{ paddingLeft:0, paddingRight:0, paddingBottom:0 }}>
                  <button className="btn btn-primary" onClick={closeModal}>Entendido</button>
                </div>
              </div>
            ) : (
              /* ── Formulario ── */
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && (
                    <div style={{ background:'var(--danger-light)', color:'#991b1b', padding:'10px 14px',
                      borderRadius:'var(--radius)', marginBottom:16, fontSize:'0.875rem' }}>
                      {error}
                    </div>
                  )}
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Nombres *</label>
                      <input className="form-input" value={form.nombres} onChange={e => set('nombres', e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Apellidos *</label>
                      <input className="form-input" value={form.apellidos} onChange={e => set('apellidos', e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CI *</label>
                      <input className="form-input" value={form.ci} onChange={e => set('ci', e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Correo electrónico {!editing && '*'}</label>
                      <input className="form-input" type="email" value={form.email}
                        onChange={e => set('email', e.target.value)} required={!editing} />
                      {!editing && (
                        <span style={{ fontSize:'0.75rem', color:'var(--gray-500)', marginTop:4, display:'block' }}>
                          Será el usuario de acceso al sistema.
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Celular</label>
                      <input className="form-input" value={form.celular} onChange={e => set('celular', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Profesión</label>
                      <input className="form-input" value={form.profesion} onChange={e => set('profesion', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:20, marginTop:8 }}>
                    <label className="checkbox-group">
                      <input type="checkbox" checked={form.tiene_maestria} onChange={e => set('tiene_maestria', e.target.checked)} />
                      <span>Tiene maestría</span>
                    </label>
                    <label className="checkbox-group">
                      <input type="checkbox" checked={form.tiene_diplomado} onChange={e => set('tiene_diplomado', e.target.checked)} />
                      <span>Tiene diplomado</span>
                    </label>
                  </div>
                  {!editing && (
                    <div style={{ marginTop:14, padding:'10px 14px', background:'var(--info-light)',
                      borderRadius:'var(--radius)', fontSize:'0.8rem', color:'#1e40af' }}>
                      La contraseña inicial será: <strong>2026 + CI invertido</strong>
                      {form.ci && (
                        <span style={{ marginLeft:8, fontFamily:'monospace', fontWeight:700 }}>
                          → 2026{String(form.ci).split('').reverse().join('')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" type="button" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-primary" type="submit">Guardar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
