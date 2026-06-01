import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import { getDocentesAcademicos, getMaterias, asignarMateria } from '../services/coordinadorService'
import { FiSearch, FiEdit2, FiEye, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

export default function DocentesAcademicos() {
  const [docentes, setDocentes] = useState([])
  const [materias, setMaterias] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null) // { mode:'asignar'|'ver', docente }
  const [materiaId, setMateriaId] = useState('')
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null)

  const fetchDocentes = useCallback(async () => {
    try {
      const r = await getDocentesAcademicos({ search })
      setDocentes(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setDocentes([])
      const msg = e.response?.data?.message || e.message || 'Error al cargar docentes.'
      showMsg('error', msg)
    }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { const t = setTimeout(fetchDocentes, 300); return () => clearTimeout(t) }, [fetchDocentes])
  useEffect(() => { getMaterias().then(r => setMaterias(r.data || [])).catch(() => {}) }, [])

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000) }

  const openAsignar = (d) => { setModal({ mode: 'asignar', docente: d }); setMateriaId(d.materia_id || '') }
  const openVer     = (d) => setModal({ mode: 'ver', docente: d })
  const close       = () => setModal(null)

  const handleGuardar = async () => {
    if (!materiaId) return showMsg('error', 'Seleccione una materia.')
    setSaving(true)
    try {
      await asignarMateria(modal.docente.id, { materia_id: materiaId })
      showMsg('success', 'Materia asignada correctamente.')
      close()
      fetchDocentes()
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Error al asignar materia.')
    } finally { setSaving(false) }
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Gestión del docente</h1>
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input className="search-input" placeholder="Buscar por nombre o CI..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {msg && (
        <div style={{ display:'flex', gap:8, alignItems:'center', padding:'10px 16px', borderRadius:'var(--radius)', marginBottom:16, fontSize:'0.875rem',
          background: msg.type==='success'?'var(--success-light)':'var(--danger-light)',
          color: msg.type==='success'?'#065f46':'#991b1b' }}>
          {msg.type==='success'?<FiCheckCircle/>:<FiAlertCircle/>} {msg.text}
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th>Nombre Completo</th><th>CI</th><th>Correo</th><th>Registro</th>
            <th>Materia Asignada</th><th>Estado</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            {docentes.map(d => (
              <tr key={d.id}>
                <td><strong>{d.name}</strong></td>
                <td>{d.ci||'-'}</td>
                <td>{d.email}</td>
                <td style={{fontSize:'0.8rem',color:'var(--gray-500)'}}>{d.codigo||'-'}</td>
                <td>
                  {d.materia_nombre
                    ? <span className="badge badge-info" style={{textTransform:'none'}}>{d.materia_nombre}</span>
                    : <span className="badge badge-gray">Sin asignar</span>}
                </td>
                <td><StatusBadge status={d.estado}/></td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openVer(d)} title="Ver"><FiEye /></button>
                    <button className="btn btn-primary btn-sm" onClick={() => openAsignar(d)} title="Asignar materia"><FiEdit2 /> Materia</button>
                  </div>
                </td>
              </tr>
            ))}
            {docentes.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--gray-400)'}}>Sin docentes</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal.mode==='ver'?'Detalle Docente':'Asignar Materia'}</span>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <p style={{fontSize:'0.9rem',marginBottom:16}}>
                <strong>{modal.docente.name}</strong> — CI: {modal.docente.ci||'-'}
              </p>
              {modal.mode==='ver' ? (
                <div>
                  {[['Correo',modal.docente.email],['Registro',modal.docente.codigo||'-'],['Estado',modal.docente.estado],
                    ['Materia',modal.docente.materia_nombre||'Sin asignar']].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                      <span style={{color:'var(--gray-500)',fontSize:'0.85rem'}}>{l}</span>
                      <span style={{fontWeight:600,fontSize:'0.85rem'}}>{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Materia principal *</label>
                  <select className="form-select" value={materiaId} onChange={e=>setMateriaId(e.target.value)}>
                    <option value="">Seleccionar materia</option>
                    {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>
            {modal.mode==='asignar' && (
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={close}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>{saving?'Guardando...':'Guardar'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
