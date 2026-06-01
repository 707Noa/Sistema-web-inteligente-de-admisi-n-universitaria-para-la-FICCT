import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import {
  asignarPostulantesAuto, postulantesEnGrupo,
  getGrupos, getDocentesDisponibles, asignarDocente, getAsignaciones,
} from '../services/coordinadorService'
import { FiUsers, FiRefreshCw, FiAlertCircle, FiCheckCircle, FiChevronDown } from 'react-icons/fi'

export default function ProcesarAsignacion() {
  const [tab, setTab]           = useState('postulantes') // 'postulantes' | 'docentes'
  const [loading, setLoading]   = useState(false)
  const [grupos, setGrupos]     = useState([])
  const [msg, setMsg]           = useState(null)

  // -- Postulantes
  const [resultado, setResultado] = useState(null)
  const [grupoVerPost, setGrupoVerPost] = useState(null)
  const [postulantesGrupo, setPostulantesGrupo] = useState([])

  // -- Docentes
  const [grupoSelDoc, setGrupoSelDoc]     = useState('')
  const [grupoDetalle, setGrupoDetalle]   = useState(null)
  const [asignaciones, setAsignaciones]   = useState([])
  const [docDisp, setDocDisp]             = useState({}) // materia_key → docentes[]
  const [selDocente, setSelDocente]       = useState({}) // materia_key → docente_user_id
  const [guardando, setGuardando]         = useState({})

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 7000) }

  useEffect(() => {
    getGrupos({ estado: 'activo' }).then(r => setGrupos(r.data || [])).catch(() => {})
  }, [])

  // ── 4.1 Asignación automática de postulantes ──
  const handleAsignarPost = async () => {
    setLoading(true); setResultado(null)
    try {
      const r = await asignarPostulantesAuto()
      setResultado(r.data)
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Error al asignar.')
    } finally { setLoading(false) }
  }

  const handleVerPostulantes = async (g) => {
    setGrupoVerPost(g)
    try { const r = await postulantesEnGrupo(g.id); setPostulantesGrupo(r.data.postulantes||[]) } catch { setPostulantesGrupo([]) }
  }

  // ── 4.2 Asignación de docentes ──
  const handleSelectGrupo = async (gid) => {
    setGrupoSelDoc(gid); setDocDisp({}); setSelDocente({}); setAsignaciones([])
    if (!gid) { setGrupoDetalle(null); return }
    const g = grupos.find(x => String(x.id) === String(gid))
    setGrupoDetalle(g)
    try {
      const r = await getAsignaciones({ grupo_id: gid })
      setAsignaciones(r.data || [])
    } catch {}
  }

  const loadDocentesParaMateria = async (horario) => {
    const key = `${horario.materia_id}_${horario.dia}`
    try {
      const r = await getDocentesDisponibles({
        materia_id: horario.materia_id,
        grupo_id: grupoSelDoc,
        dia: horario.dia,
        hora_inicio: horario.hora_inicio,
        hora_fin: horario.hora_fin,
      })
      setDocDisp(prev => ({ ...prev, [key]: r.data.docentes || [] }))
    } catch { setDocDisp(prev => ({ ...prev, [key]: [] })) }
  }

  const handleAsignarDocente = async (horario) => {
    const key = `${horario.materia_id}_${horario.dia}`
    const docenteId = selDocente[key]
    if (!docenteId) return showMsg('error', 'Seleccione un docente.')
    setGuardando(prev => ({ ...prev, [key]: true }))
    try {
      await asignarDocente({
        docente_user_id: docenteId,
        grupo_id: grupoSelDoc,
        materia_id: horario.materia_id,
        dia: horario.dia,
        hora_inicio: horario.hora_inicio,
        hora_fin: horario.hora_fin,
      })
      showMsg('success', 'Docente asignado correctamente.')
      const r = await getAsignaciones({ grupo_id: grupoSelDoc })
      setAsignaciones(r.data || [])
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Error al asignar.')
    } finally { setGuardando(prev => ({ ...prev, [key]: false })) }
  }

  if (loading && tab==='postulantes' && !resultado) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header"><h1>Asignación de grupos</h1></div>

      {msg && (
        <div style={{ display:'flex', gap:8, alignItems:'center', padding:'10px 16px', borderRadius:'var(--radius)', marginBottom:16, fontSize:'0.875rem',
          background: msg.type==='success'?'var(--success-light)':'var(--danger-light)',
          color: msg.type==='success'?'#065f46':'#991b1b' }}>
          {msg.type==='success'?<FiCheckCircle/>:<FiAlertCircle/>} {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:24,borderBottom:'2px solid var(--gray-200)'}}>
        {[['postulantes','Asignación de Postulantes'],['docentes','Asignación de Docentes']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            padding:'10px 20px',border:'none',background:'none',cursor:'pointer',fontWeight:600,fontSize:'0.9rem',
            borderBottom:`2px solid ${tab===k?'var(--primary)':'transparent'}`,
            color:tab===k?'var(--primary)':'var(--gray-500)',marginBottom:'-2px',transition:'all 0.2s'}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Tab Postulantes ── */}
      {tab==='postulantes' && (
        <div>
          <div className="card" style={{marginBottom:20}}>
            <p style={{marginBottom:16,color:'var(--gray-600)',fontSize:'0.9rem'}}>
              Asigna automáticamente todos los postulantes con estado <strong>INSCRITO</strong> a los grupos activos disponibles, respetando el cupo máximo.
            </p>
            <button className="btn btn-primary" onClick={handleAsignarPost} disabled={loading}>
              {loading?<><FiRefreshCw style={{animation:'spin 0.8s linear infinite'}}/> Procesando...</>
                : <><FiUsers/> Procesar Asignación Automática</>}
            </button>
          </div>

          {resultado && !resultado.error && (
            <div className="card" style={{marginBottom:20}}>
              <p style={{fontWeight:700,marginBottom:16}}>{resultado.message}</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[
                  ['Total inscritos',resultado.total_inscritos,'var(--primary)'],
                  ['Asignados',resultado.asignados,'var(--success)'],
                  ['Sin grupo',resultado.sin_grupo,'var(--warning)'],
                  ['Grupos activos',resultado.total_grupos,'var(--info)'],
                  ['Grupos llenos',resultado.grupos_llenos,'var(--danger)'],
                  ['Con cupo',resultado.grupos_disponibles,'var(--success)'],
                ].map(([l,v,c])=>(
                  <div key={l} style={{textAlign:'center',background:'var(--gray-50)',borderRadius:'var(--radius)',padding:'12px 8px'}}>
                    <div style={{fontSize:'1.6rem',fontWeight:800,color:c}}>{v??0}</div>
                    <div style={{fontSize:'0.73rem',color:'var(--gray-500)'}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ver postulantes por grupo */}
          <div className="card">
            <p style={{fontWeight:700,marginBottom:12}}>Postulantes por grupo</p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
              {grupos.map(g=>(
                <button key={g.id} onClick={()=>handleVerPostulantes(g)}
                  style={{padding:'6px 14px',borderRadius:'var(--radius)',border:'1.5px solid',cursor:'pointer',fontSize:'0.82rem',
                    borderColor:grupoVerPost?.id===g.id?'var(--primary)':'var(--gray-300)',
                    background:grupoVerPost?.id===g.id?'var(--primary)':'white',
                    color:grupoVerPost?.id===g.id?'white':'var(--gray-700)'}}>
                  {g.codigo} ({g.ocupacion}/{g.cupo_maximo})
                </button>
              ))}
            </div>
            {grupoVerPost && (
              <div>
                <p style={{fontSize:'0.85rem',fontWeight:600,marginBottom:8}}>Grupo {grupoVerPost.codigo} — {postulantesGrupo.length} postulantes</p>
                {postulantesGrupo.length>0 ? (
                  <div className="table-container" style={{maxHeight:280,overflowY:'auto'}}>
                    <table className="table" style={{fontSize:'0.82rem'}}>
                      <thead><tr><th>Nombre</th><th>CI</th><th>Correo</th></tr></thead>
                      <tbody>
                        {postulantesGrupo.map(p=>(
                          <tr key={p.id}><td>{p.nombres} {p.apellidos}</td><td>{p.ci}</td><td>{p.email}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p style={{color:'var(--gray-400)',fontSize:'0.85rem'}}>Sin postulantes asignados.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Docentes ── */}
      {tab==='docentes' && (
        <div>
          <div className="card" style={{marginBottom:20}}>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Seleccionar Grupo</label>
              <select className="form-select" style={{maxWidth:300}} value={grupoSelDoc} onChange={e=>handleSelectGrupo(e.target.value)}>
                <option value="">Seleccione un grupo...</option>
                {grupos.map(g=><option key={g.id} value={g.id}>{g.codigo} — {g.turno}</option>)}
              </select>
            </div>
          </div>

          {grupoDetalle && (
            <div className="card">
              <p style={{fontWeight:700,marginBottom:16}}>
                Grupo <span style={{color:'var(--primary)'}}>{grupoDetalle.codigo}</span> — Turno: {grupoDetalle.turno} — Días: {(grupoDetalle.dias||[]).join(', ')}
              </p>
              {(grupoDetalle.horarios||[]).length === 0
                ? <p style={{color:'var(--gray-400)'}}>Este grupo no tiene horarios generados.</p>
                : (grupoDetalle.horarios||[]).map(h => {
                  const key = `${h.materia_id}_${h.dia}`
                  const asig = asignaciones.find(a => String(a.grupo_codigo)===String(grupoDetalle.codigo) &&
                    String(a.materia_nombre)===String(h.materia_nombre) && a.dia===h.dia)
                  const disponibles = docDisp[key]

                  return (
                    <div key={key} style={{border:'1px solid var(--gray-200)',borderRadius:'var(--radius)',padding:'14px 16px',marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                        <div>
                          <span style={{fontWeight:700,color:'var(--primary)'}}>{h.materia_nombre}</span>
                          <span style={{color:'var(--gray-500)',fontSize:'0.82rem',marginLeft:12}}>
                            {h.dia} · {h.hora_inicio}–{h.hora_fin}
                          </span>
                        </div>
                        {asig
                          ? <span className="badge badge-success" style={{textTransform:'none'}}>✓ {asig.docente_name}</span>
                          : <span className="badge badge-gray">Sin docente</span>}
                      </div>

                      {!disponibles ? (
                        <button className="btn btn-outline btn-sm" style={{marginTop:10}}
                          onClick={()=>loadDocentesParaMateria(h)}>
                          <FiChevronDown/> Ver docentes disponibles
                        </button>
                      ) : disponibles.length === 0 ? (
                        <p style={{color:'var(--gray-400)',fontSize:'0.82rem',marginTop:10}}>No existen docentes activos para esta materia sin conflicto.</p>
                      ) : (
                        <div style={{display:'flex',gap:8,marginTop:10,alignItems:'center',flexWrap:'wrap'}}>
                          <select className="form-select" style={{flex:1,minWidth:200,maxWidth:300}}
                            value={selDocente[key]||''}
                            onChange={e=>setSelDocente(prev=>({...prev,[key]:e.target.value}))}>
                            <option value="">Seleccionar docente...</option>
                            {disponibles.map(d=><option key={d.id} value={d.id}>{d.name} (CI: {d.ci})</option>)}
                          </select>
                          <button className="btn btn-primary btn-sm" onClick={()=>handleAsignarDocente(h)} disabled={guardando[key]}>
                            {guardando[key]?'Guardando...':'Asignar'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
