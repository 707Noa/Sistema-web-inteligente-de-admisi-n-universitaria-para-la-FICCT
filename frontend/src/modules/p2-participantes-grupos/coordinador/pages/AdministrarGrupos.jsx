import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import { getGrupos, createGrupo, updateGrupo, toggleEstadoGrupo, getGrupo } from '../services/coordinadorService'
import { FiPlus, FiEdit2, FiEye, FiAlertCircle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi'

const TURNOS   = ['mañana', 'tarde', 'noche']
const DIAS_OPC = ['lunes','martes','miercoles','jueves','viernes','sabado']
const TURNO_LABELS = { mañana:'Mañana (08:00-12:00)', tarde:'Tarde (12:00-16:00)', noche:'Noche (16:00-20:00)' }
const MATERIAS_ORDEN = ['Computación','Física','Inglés','Matemáticas']

const TURNO_HORAS = {
  mañana: [['08:00','09:00'],['09:00','10:00'],['10:00','11:00'],['11:00','12:00']],
  tarde:  [['12:00','13:00'],['13:00','14:00'],['14:00','15:00'],['15:00','16:00']],
  noche:  [['16:00','17:00'],['17:00','18:00'],['18:00','19:00'],['19:00','20:00']],
}

const emptyForm = { codigo:'', turno:'mañana', dias:[], cupo_maximo:40 }

export default function AdministrarGrupos() {
  const [grupos, setGrupos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // null | 'crear' | 'editar' | 'ver'
  const [editing, setEditing] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [form, setForm]       = useState(emptyForm)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTurno, setFiltroTurno]   = useState('')

  const fetchGrupos = useCallback(async () => {
    try {
      const r = await getGrupos({ estado: filtroEstado || undefined, turno: filtroTurno || undefined })
      setGrupos(r.data || [])
    } catch { setGrupos([]) }
    finally { setLoading(false) }
  }, [filtroEstado, filtroTurno])

  useEffect(() => { fetchGrupos() }, [fetchGrupos])

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  const openCrear = () => { setEditing(null); setForm(emptyForm); setModal('crear') }
  const openEditar = (g) => {
    setEditing(g)
    setForm({ codigo: g.codigo, turno: g.turno, dias: g.dias||[], cupo_maximo: g.cupo_maximo })
    setModal('editar')
  }
  const openVer = async (g) => {
    try { const r = await getGrupo(g.id); setDetalle(r.data); setModal('ver') } catch {}
  }
  const close = () => { setModal(null); setEditing(null); setDetalle(null) }

  const toggleDia = (dia) => {
    setForm(f => ({
      ...f,
      dias: f.dias.includes(dia) ? f.dias.filter(d => d !== dia) : [...f.dias, dia]
    }))
  }

  const handleGuardar = async () => {
    if (!form.codigo.trim()) return showMsg('error', 'El código es obligatorio.')
    if (!form.turno) return showMsg('error', 'Seleccione un turno.')
    if (!form.dias.length) return showMsg('error', 'Seleccione al menos un día.')
    if (!form.cupo_maximo || form.cupo_maximo < 1) return showMsg('error', 'El cupo debe ser mayor a 0.')
    setSaving(true)
    try {
      if (editing) { await updateGrupo(editing.id, form) }
      else { await createGrupo(form) }
      showMsg('success', editing ? 'Grupo actualizado.' : 'Grupo creado con horarios automáticos.')
      close(); fetchGrupos()
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const handleToggle = async (g) => {
    try { await toggleEstadoGrupo(g.id); fetchGrupos() } catch {}
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Gestión de grupos</h1>
        <div className="page-header-actions">
          <select className="form-select" style={{width:140}} value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <select className="form-select" style={{width:160}} value={filtroTurno} onChange={e=>setFiltroTurno(e.target.value)}>
            <option value="">Todos los turnos</option>
            {TURNOS.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openCrear}><FiPlus /> Nuevo Grupo</button>
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
            <th>Código</th><th>Turno</th><th>Días</th><th>Cupo</th><th>Ocupación</th><th>Estado</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            {grupos.map(g => (
              <tr key={g.id}>
                <td><strong>{g.codigo}</strong></td>
                <td><span className="badge badge-info" style={{textTransform:'capitalize'}}>{g.turno}</span></td>
                <td style={{fontSize:'0.8rem'}}>{(g.dias||[]).join(', ')||'-'}</td>
                <td>{g.cupo_maximo}</td>
                <td>{g.ocupacion} / {g.cupo_maximo}</td>
                <td onClick={() => handleToggle(g)} style={{cursor:'pointer'}} title="Click para cambiar estado">
                  <StatusBadge status={g.estado}/>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-outline btn-sm" onClick={()=>openVer(g)} title="Ver"><FiEye/></button>
                    <button className="btn btn-outline btn-sm" onClick={()=>openEditar(g)} title="Editar"><FiEdit2/></button>
                  </div>
                </td>
              </tr>
            ))}
            {grupos.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--gray-400)'}}>Sin grupos</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar */}
      {(modal==='crear'||modal==='editar') && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal==='crear'?'Nuevo Grupo':'Editar Grupo'}</span>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Código *</label>
                  <input className="form-input" placeholder="Ej: M1, T2, N1" value={form.codigo}
                    onChange={e=>setForm({...form,codigo:e.target.value.toUpperCase()})} style={{textTransform:'uppercase'}}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Cupo máximo *</label>
                  <input className="form-input" type="number" min="1" max="200" value={form.cupo_maximo}
                    onChange={e=>setForm({...form,cupo_maximo:parseInt(e.target.value)||1})}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Turno *</label>
                  <select className="form-select" value={form.turno} onChange={e=>setForm({...form,turno:e.target.value})}>
                    {TURNOS.map(t=><option key={t} value={t}>{TURNO_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Días de clase *</label>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>
                    {DIAS_OPC.map(d=>(
                      <button key={d} type="button" onClick={()=>toggleDia(d)}
                        style={{padding:'6px 12px',borderRadius:'var(--radius)',border:'1.5px solid',fontSize:'0.8rem',cursor:'pointer',
                          borderColor:form.dias.includes(d)?'var(--primary)':'var(--gray-300)',
                          background:form.dias.includes(d)?'var(--primary)':'white',
                          color:form.dias.includes(d)?'white':'var(--gray-700)'}}>
                        {d.charAt(0).toUpperCase()+d.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview de horarios */}
              {form.turno && form.dias.length>0 && (
                <div style={{marginTop:16,padding:'12px 16px',background:'var(--gray-50)',borderRadius:'var(--radius)',border:'1px solid var(--gray-200)',maxHeight: '220px', overflowY: 'auto'}}>
                  <p style={{fontSize:'0.8rem',fontWeight:600,color:'var(--gray-600)',marginBottom:8}}>Horarios a generar automáticamente:</p>
                  {form.dias.map(d => {
                    const esLmv = ['lunes', 'miercoles', 'viernes'].includes(d.toLowerCase());
                    const mats = ['miercoles', 'jueves'].includes(d.toLowerCase())
                      ? ['Inglés', 'Matemáticas']
                      : ['Computación', 'Física'];

                    const getHoras = (turno, idx) => {
                      if (esLmv) {
                        if (idx === 0) {
                          if (turno === 'tarde') return '13:00 – 14:30';
                          if (turno === 'noche') return '18:00 – 19:30';
                          return '07:00 – 08:30';
                        } else {
                          if (turno === 'tarde') return '14:30 – 16:00';
                          if (turno === 'noche') return '19:30 – 21:00';
                          return '08:30 – 10:00';
                        }
                      } else {
                        if (idx === 0) {
                          if (turno === 'tarde') return '13:00 – 15:15';
                          if (turno === 'noche') return '18:00 – 20:15';
                          return '07:00 – 09:15';
                        } else {
                          if (turno === 'tarde') return '15:15 – 17:30';
                          if (turno === 'noche') return '20:15 – 22:30';
                          return '09:15 – 11:30';
                        }
                      }
                    };

                    return (
                      <div key={d} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'capitalize', borderBottom: '1px solid var(--gray-200)', paddingBottom: '2px', marginBottom: '4px' }}>
                          {d}
                        </div>
                        {mats.map((m, idx) => (
                          <div key={m} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '2px 0 2px 8px' }}>
                            <span>{m}</span>
                            <span style={{ color: 'var(--gray-700)', fontWeight: 600 }}>{getHoras(form.turno, idx)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving?<><FiRefreshCw style={{animation:'spin 0.8s linear infinite'}}/> Guardando...</>:'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver */}
      {modal==='ver' && detalle && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Grupo {detalle.codigo}</span>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                {[['Turno',detalle.turno],['Cupo',detalle.cupo_maximo],
                  ['Ocupación',`${detalle.ocupacion}/${detalle.cupo_maximo}`],['Estado',detalle.estado]].map(([l,v])=>(
                  <div key={l} style={{textAlign:'center',padding:'10px',background:'var(--gray-50)',borderRadius:'var(--radius)'}}>
                    <div style={{fontSize:'1.1rem',fontWeight:700,color:'var(--primary)',textTransform:'capitalize'}}>{v}</div>
                    <div style={{fontSize:'0.73rem',color:'var(--gray-500)'}}>{l}</div>
                  </div>
                ))}
              </div>
              <p style={{fontSize:'0.85rem',color:'var(--gray-600)',marginBottom:8}}>
                <strong>Días:</strong> {(detalle.dias||[]).join(', ')||'-'}
              </p>
              <p style={{fontSize:'0.85rem',fontWeight:600,marginBottom:8}}>Horarios:</p>
              <div className="table-container">
                <table className="table" style={{fontSize:'0.82rem'}}>
                  <thead><tr><th>Materia</th><th>Día</th><th>Horario</th></tr></thead>
                  <tbody>
                    {(detalle.horarios||[]).map((h,i)=>(
                      <tr key={i}>
                        <td>{h.materia_nombre}</td>
                        <td style={{textTransform:'capitalize'}}>{h.dia}</td>
                        <td>{h.hora_inicio} – {h.hora_fin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
