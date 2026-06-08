import { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import {
  getStatsAsignacion, asignarPostulantesAuto, asignarDocentesAuto,
  postulantesEnGrupo, getGrupos, getGrupo,
  getDocentesDisponibles, asignarDocente, getAsignaciones,
} from '../services/coordinadorService'
import {
  FiUsers, FiRefreshCw, FiAlertCircle, FiCheckCircle,
  FiChevronDown, FiUserCheck, FiX,
} from 'react-icons/fi'

// ── Barra de progreso ─────────────────────────────────────────────────────────
function OcupBar({ occ, max }) {
  const pct   = max > 0 ? Math.min(100, Math.round(occ / max * 100)) : 0
  const color = pct >= 100 ? '#dc2626' : pct >= 80 ? '#f59e0b' : '#16a34a'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, height:5, background:'var(--gray-200)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:99 }} />
      </div>
      <span style={{ fontSize:'0.75rem', fontWeight:600, color, minWidth:44, textAlign:'right' }}>
        {occ}/{max}
      </span>
    </div>
  )
}

// ── Chip de resultado ─────────────────────────────────────────────────────────
function Chip({ label, value, color='var(--gray-700)' }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px',
      borderRadius:'20px', background:'var(--gray-50)', border:'1px solid var(--gray-200)',
      fontSize:'0.82rem', color:'var(--gray-600)',
    }}>
      <strong style={{ color, fontSize:'0.9rem' }}>{value ?? 0}</strong> {label}
    </span>
  )
}

// ── Tarjeta de grupo (reutilizable) ───────────────────────────────────────────
function GrupoCard({ g, actionLabel, onAction }) {
  return (
    <div style={{
      border:'1px solid var(--gray-200)', borderRadius:'var(--radius)',
      padding:'14px 16px', background:'var(--gray-50)',
      display:'flex', flexDirection:'column', gap:8,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:800, fontSize:'1.05rem' }}>{g.codigo}</span>
        <span style={{ fontSize:'0.72rem', color:'var(--gray-400)', textTransform:'capitalize' }}>{g.turno}</span>
      </div>
      <div style={{ fontSize:'0.75rem', color:'var(--gray-500)' }}>Aula {g.aula||'-'}</div>
      {g.ocupacion !== undefined && (
        <OcupBar occ={g.ocupacion} max={g.cupo_maximo||70} />
      )}
      <button
        className="btn btn-outline btn-sm"
        style={{ marginTop:4, width:'100%', fontSize:'0.78rem' }}
        onClick={() => onAction(g)}
      >
        {actionLabel}
      </button>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ProcesarAsignacion() {
  const [tab, setTab] = useState('postulantes')

  // Stats
  const [stats, setStats]               = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Grupos
  const [grupos, setGrupos] = useState([])

  // Tab postulantes
  const [asignandoPost, setAsignandoPost] = useState(false)
  const [resultPost, setResultPost]       = useState(null)
  const [modalEstudiantes, setModalEstudiantes] = useState(null)
  const [estudiantes, setEstudiantes]     = useState([])
  const [loadingEst, setLoadingEst]       = useState(false)

  // Tab docentes
  const [asignandoDoc, setAsignandoDoc]   = useState(false)
  const [resultDoc, setResultDoc]         = useState(null)
  const [modalDocentes, setModalDocentes] = useState(null)  // grupo seleccionado
  const [materiasDoc, setMateriasDoc]     = useState([])    // [{materia_id, nombre, horario, docente}]
  const [loadingDocModal, setLoadingDocModal] = useState(false)
  const [expandedMat, setExpandedMat]     = useState(null)  // materia_id con dropdown abierto
  const [dispDocModal, setDispDocModal]   = useState({})    // materia_id → docentes[]
  const [selDocModal, setSelDocModal]     = useState({})    // materia_id → docente_id
  const [guardandoMat, setGuardandoMat]   = useState({})    // materia_id → bool

  // Tab horarios
  const [modalHorario, setModalHorario] = useState(null)
  const [detalleHorario, setDetalleHorario] = useState(null)
  const [loadingHorario, setLoadingHorario] = useState(false)

  const getCellDataForGroup = (dia, hora) => {
    if (!detalleHorario) return null
    const entry = (detalleHorario.horarios || []).find(h => 
      (h.dia || '').toLowerCase() === dia.toLowerCase() && 
      (h.hora_inicio || '').substring(0, 5) === hora
    )
    if (!entry) return null
    const asig = (detalleHorario.asignaciones || []).find(a => 
      String(a.materia_nombre).toLowerCase() === String(entry.materia_nombre).toLowerCase()
    )
    return {
      materia: entry.materia_nombre,
      docente: asig?.docente_name || 'Por asignar',
      aula: detalleHorario.aula || '-'
    }
  }

  const getHoursForTurno = (turno) => {
    const t = (turno || '').toLowerCase()
    if (t === 'mañana' || t === 'manana') {
      return ['08:00', '09:00', '10:00', '11:00']
    } else if (t === 'tarde') {
      return ['13:00', '14:00', '15:00']
    } else if (t === 'noche') {
      return ['16:00', '17:00', '18:00', '19:00']
    }
    return []
  }

  // Notificación
  const [msg, setMsg] = useState(null)

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 6000)
  }

  // ── Cargar stats y grupos ──
  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try { const r = await getStatsAsignacion(); setStats(r.data) }
    catch { setStats(null) }
    finally { setLoadingStats(false) }
  }, [])

  useEffect(() => {
    loadStats()
    getGrupos({ estado:'activo' }).then(r => setGrupos(r.data||[])).catch(()=>{})
  }, [loadStats])

  // ── Asignar postulantes ──
  const handleAsignarPost = async () => {
    setAsignandoPost(true); setResultPost(null)
    try { const r = await asignarPostulantesAuto(); setResultPost(r.data); loadStats() }
    catch (e) { showMsg('error', e.response?.data?.message || 'Error al asignar postulantes.') }
    finally { setAsignandoPost(false) }
  }

  const abrirEstudiantes = async (g) => {
    setModalEstudiantes(g); setLoadingEst(true); setEstudiantes([])
    try { const r = await postulantesEnGrupo(g.id); setEstudiantes(r.data.postulantes||[]) }
    catch { setEstudiantes([]) }
    finally { setLoadingEst(false) }
  }

  // ── Asignar docentes auto ──
  const handleAsignarDocAuto = async () => {
    setAsignandoDoc(true); setResultDoc(null)
    try { const r = await asignarDocentesAuto(); setResultDoc(r.data); loadStats() }
    catch (e) { showMsg('error', e.response?.data?.message || 'Error al asignar docentes.') }
    finally { setAsignandoDoc(false) }
  }

  // ── Abrir modal "Ver docentes" de un grupo ──
  const abrirDocentesGrupo = async (g) => {
    setModalDocentes(g)
    setLoadingDocModal(true)
    setMateriasDoc([])
    setExpandedMat(null)
    setDispDocModal({})
    setSelDocModal({})
    try {
      const [gR, aR] = await Promise.all([
        getGrupo(g.id),
        getAsignaciones({ grupo_id: g.id }),
      ])
      const horarios  = gR.data?.horarios || []
      const asigns    = aR.data || []

      // Deduplicar por materia_id
      const map = {}
      for (const h of horarios) {
        if (!map[h.materia_id]) map[h.materia_id] = h
      }

      setMateriasDoc(Object.values(map).map(h => {
        const asig = asigns.find(a => String(a.materia_nombre) === String(h.materia_nombre))
        return {
          materia_id:     h.materia_id,
          materia_nombre: h.materia_nombre,
          hora_inicio:    h.hora_inicio,
          hora_fin:       h.hora_fin,
          docente:        asig?.docente_name || null,
          asignado:       !!asig,
        }
      }))
    } catch {}
    finally { setLoadingDocModal(false) }
  }

  // ── Cargar docentes disponibles para una materia (dentro del modal) ──
  const cargarDocDisponibles = async (h) => {
    const key = h.materia_id
    setExpandedMat(key)
    if (dispDocModal[key]) return  // ya cargados
    try {
      const r = await getDocentesDisponibles({
        materia_id:  h.materia_id,
        grupo_id:    modalDocentes.id,
        dia:         Array.isArray(modalDocentes.dias) ? (modalDocentes.dias[0]||'lunes') : 'lunes',
        hora_inicio: h.hora_inicio,
        hora_fin:    h.hora_fin,
      })
      setDispDocModal(p => ({
        ...p,
        [key]: {
          docentes: r.data.docentes || [],
          message: r.data.message || ''
        }
      }))
    } catch {
      setDispDocModal(p => ({
        ...p,
        [key]: { docentes: [], message: '' }
      }))
    }
  }

  // ── Asignar docente manual desde el modal ──
  const handleAsignarManualModal = async (h) => {
    const key   = h.materia_id
    const docId = selDocModal[key]
    if (!docId) return showMsg('error', 'Seleccione un docente.')
    setGuardandoMat(p => ({ ...p, [key]: true }))
    try {
      await asignarDocente({
        docente_user_id: docId,
        grupo_id:        modalDocentes.id,
        materia_id:      h.materia_id,
        hora_inicio:     h.hora_inicio,
        hora_fin:        h.hora_fin,
        todos_los_dias:  true,
      })
      showMsg('success', 'Docente asignado.')
      // Recargar datos del modal
      await abrirDocentesGrupo(modalDocentes)
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Error al asignar.')
    } finally { setGuardandoMat(p => ({ ...p, [key]: false })) }
  }

  const abrirHorarioGrupo = async (g) => {
    setModalHorario(g)
    setLoadingHorario(true)
    setDetalleHorario(null)
    try {
      const r = await getGrupo(g.id)
      setDetalleHorario(r.data)
    } catch {
      setDetalleHorario(null)
    } finally {
      setLoadingHorario(false)
    }
  }

  // ── Estilos base ──
  const card = {
    background:'#fff', borderRadius:'var(--radius)',
    boxShadow:'0 1px 3px rgba(0,0,0,0.07)', padding:'14px 18px', marginBottom:14,
  }

  return (
    <Layout>

      {/* ── Cabecera ── */}
      <div className="page-header" style={{ marginBottom:14 }}>
        <h1>Asignacion de Grupos</h1>
        <button
          className="btn btn-outline btn-sm"
          onClick={loadStats}
          disabled={loadingStats}
          style={{ display:'inline-flex', alignItems:'center', gap:5 }}
        >
          <FiRefreshCw style={{ animation: loadingStats ? 'spin 0.8s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      {/* ── Tarjetas compactas (3 chips) ── */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:18 }}>
        {[
          [stats?.total_inscritos, 'Total inscritos',    'var(--primary)'],
          [stats?.total_grupos,    'Grupos activos',     '#0891b2'],
          [stats?.asignados,       'Postulantes asignados', '#16a34a'],
        ].map(([val, label, color]) => (
          <div key={label} style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'#fff', borderRadius:'var(--radius)',
            boxShadow:'0 1px 3px rgba(0,0,0,0.07)',
            padding:'8px 16px',
          }}>
            <span style={{ fontSize:'1.5rem', fontWeight:800, color, lineHeight:1 }}>
              {loadingStats ? '—' : (val ?? 0)}
            </span>
            <span style={{ fontSize:'0.8rem', color:'var(--gray-600)', fontWeight:500 }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Notificación ── */}
      {msg && (
        <div style={{
          display:'flex', gap:8, alignItems:'center', padding:'9px 14px',
          borderRadius:'var(--radius)', marginBottom:14, fontSize:'0.875rem',
          background: msg.type==='success' ? 'var(--success-light)' : 'var(--danger-light)',
          color:      msg.type==='success' ? '#065f46' : '#991b1b',
        }}>
          {msg.type==='success' ? <FiCheckCircle/> : <FiAlertCircle/>}
          <span style={{flex:1}}>{msg.text}</span>
          <button style={{background:'none',border:'none',cursor:'pointer',color:'inherit'}} onClick={()=>setMsg(null)}>×</button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:2, borderBottom:'2px solid var(--gray-200)', marginBottom:18 }}>
        {[['postulantes','Postulantes'],['docentes','Docentes'],['horarios','Horario']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding:'9px 22px', border:'none', background:'none', cursor:'pointer',
            fontWeight:600, fontSize:'0.86rem', marginBottom:'-2px',
            borderBottom:`2px solid ${tab===k ? 'var(--primary)' : 'transparent'}`,
            color: tab===k ? 'var(--primary)' : 'var(--gray-500)',
          }}>
            {l}
          </button>
        ))}
      </div>


      {/* ════════════════════════════════════════
          TAB: POSTULANTES
      ════════════════════════════════════════ */}
      {tab === 'postulantes' && (
        <>
          {/* Barra de acción */}
          <div style={{ ...card, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <span style={{ fontWeight:600, color:'var(--gray-700)', fontSize:'0.9rem' }}>Asignacion de postulantes</span>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {resultPost && (
                <>
                  <Chip label="asignados"   value={resultPost.asignados}    color='#16a34a' />
                  <Chip label="sin grupo"   value={resultPost.sin_grupo}    color='#d97706' />
                </>
              )}
              <button className="btn btn-primary btn-sm" onClick={handleAsignarPost} disabled={asignandoPost}>
                {asignandoPost
                  ? <><FiRefreshCw style={{animation:'spin 0.8s linear infinite'}}/> Asignando...</>
                  : <><FiUsers/> Asignar postulantes</>}
              </button>
            </div>
          </div>

          {/* Tarjetas de grupos */}
          {grupos.length === 0 ? (
            <div style={{ ...card, textAlign:'center', color:'var(--gray-400)', padding:28 }}>
              No hay grupos activos. Genere grupos desde Gestion de Grupos.
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:10 }}>
              {grupos.map(g => (
                <GrupoCard
                  key={g.id}
                  g={g}
                  actionLabel="Ver postulantes"
                  onAction={abrirEstudiantes}
                />
              ))}
            </div>
          )}
        </>
      )}


      {/* ════════════════════════════════════════
          TAB: DOCENTES
      ════════════════════════════════════════ */}
      {tab === 'docentes' && (
        <>
          {/* Barra de acción */}
          <div style={{ ...card, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <span style={{ fontWeight:600, color:'var(--gray-700)', fontSize:'0.9rem' }}>Asignacion de docentes</span>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {resultDoc && (
                <>
                  <Chip label="asignadas"   value={resultDoc.asignadas}      color='#16a34a' />
                  <Chip label="sin docente" value={resultDoc.sin_docente}    color='#d97706' />
                </>
              )}
              <button className="btn btn-primary btn-sm" onClick={handleAsignarDocAuto} disabled={asignandoDoc}>
                {asignandoDoc
                  ? <><FiRefreshCw style={{animation:'spin 0.8s linear infinite'}}/> Asignando...</>
                  : <><FiUserCheck/> Asignar docentes</>}
              </button>
            </div>
          </div>

          {/* Tarjetas de grupos */}
          {grupos.length === 0 ? (
            <div style={{ ...card, textAlign:'center', color:'var(--gray-400)', padding:28 }}>
              No hay grupos activos. Genere grupos desde Gestion de Grupos.
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:10 }}>
              {grupos.map(g => (
                <GrupoCard
                  key={g.id}
                  g={{ ...g, ocupacion: undefined }}   // sin barra de ocupacion en tab docentes
                  actionLabel="Ver docentes"
                  onAction={abrirDocentesGrupo}
                />
              ))}
            </div>
          )}
        </>
      )}


      {/* ════════════════════════════════════════
          TAB: HORARIOS
      ════════════════════════════════════════ */}
      {tab === 'horarios' && (
        <>
          {/* Barra de acción */}
          <div style={{ ...card, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontWeight:600, color:'var(--gray-700)', fontSize:'0.9rem' }}>Horarios por Grupo</span>
            <span style={{ fontSize:'0.8rem', color:'var(--gray-400)' }}>Seleccione un grupo para visualizar su horario detallado y docente asignado</span>
          </div>

          {/* Tarjetas de grupos */}
          {grupos.length === 0 ? (
            <div style={{ ...card, textAlign:'center', color:'var(--gray-400)', padding:28 }}>
              No hay grupos activos. Genere grupos desde Gestión de Grupos.
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:10 }}>
              {grupos.map(g => (
                <GrupoCard
                  key={g.id}
                  g={g}
                  actionLabel="Ver Horario"
                  onAction={abrirHorarioGrupo}
                />
              ))}
            </div>
          )}
        </>
      )}


      {/* ════════════════════════════════════════
          Modal — Estudiantes del grupo
      ════════════════════════════════════════ */}
      {modalEstudiantes && (
        <div className="modal-overlay" onClick={() => setModalEstudiantes(null)}>
          <div className="modal" style={{ maxWidth:600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                Estudiantes — {modalEstudiantes.codigo}
                <span style={{ fontWeight:400, color:'var(--gray-500)', marginLeft:8, fontSize:'0.82rem' }}>
                  {modalEstudiantes.turno} · Aula {modalEstudiantes.aula||'-'}
                </span>
              </span>
              <button className="modal-close" onClick={() => setModalEstudiantes(null)}><FiX/></button>
            </div>
            <div className="modal-body" style={{ padding:'12px 20px' }}>
              {loadingEst ? (
                <p style={{ textAlign:'center', color:'var(--gray-400)', padding:20 }}>Cargando...</p>
              ) : estudiantes.length === 0 ? (
                <p style={{ textAlign:'center', color:'var(--gray-400)', padding:20 }}>Sin estudiantes asignados.</p>
              ) : (
                <>
                  <p style={{ fontSize:'0.82rem', color:'var(--gray-500)', marginBottom:10 }}>
                    {estudiantes.length} estudiante{estudiantes.length!==1?'s':''} asignados
                  </p>
                  <div style={{ maxHeight:380, overflowY:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                      <thead style={{ position:'sticky', top:0, background:'#fff', zIndex:1 }}>
                        <tr style={{ borderBottom:'2px solid var(--gray-200)' }}>
                          {['#','Nombre','CI','Registro','1ra Carrera','2da Carrera'].map(h => (
                            <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:700, color:'var(--gray-500)', fontSize:'0.73rem', textTransform:'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {estudiantes.map((p,i) => (
                          <tr key={p.id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                            <td style={{ padding:'8px 10px', color:'var(--gray-400)' }}>{i+1}</td>
                            <td style={{ padding:'8px 10px', fontWeight:500 }}>{p.nombres} {p.apellidos}</td>
                            <td style={{ padding:'8px 10px', fontFamily:'monospace' }}>{p.ci}</td>
                            <td style={{ padding:'8px 10px', fontFamily:'monospace', fontSize:'0.77rem', color:'var(--gray-500)' }}>{p.codigo_usuario||p.registro||'-'}</td>
                            <td style={{ padding:'8px 10px', color:'var(--gray-600)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={p.primera_carrera || p.carrera_postulada}>{p.primera_carrera || p.carrera_postulada || '—'}</td>
                            <td style={{ padding:'8px 10px', color:'var(--gray-600)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={p.segunda_carrera}>{p.segunda_carrera || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalEstudiantes(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}


      {/* ════════════════════════════════════════
          Modal — Docentes del grupo
      ════════════════════════════════════════ */}
      {modalDocentes && (
        <div className="modal-overlay" onClick={() => setModalDocentes(null)}>
          <div className="modal" style={{ maxWidth:580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                Docentes — {modalDocentes.codigo}
                <span style={{ fontWeight:400, color:'var(--gray-500)', marginLeft:8, fontSize:'0.82rem' }}>
                  {modalDocentes.turno} · Aula {modalDocentes.aula||'-'}
                </span>
              </span>
              <button className="modal-close" onClick={() => setModalDocentes(null)}><FiX/></button>
            </div>
            <div className="modal-body" style={{ padding:'12px 20px' }}>
              {loadingDocModal ? (
                <p style={{ textAlign:'center', color:'var(--gray-400)', padding:20 }}>Cargando...</p>
              ) : materiasDoc.length === 0 ? (
                <p style={{ textAlign:'center', color:'var(--gray-400)', padding:20 }}>Sin horarios generados para este grupo.</p>
              ) : (
                <div>
                  {materiasDoc.map(h => {
                    const key      = h.materia_id
                    const expanded = expandedMat === key
                    const dataMat  = dispDocModal[key]

                    return (
                      <div key={key} style={{ borderBottom:'1px solid var(--gray-100)', padding:'10px 0' }}>
                        {/* Fila principal */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                          <div>
                            <span style={{ fontWeight:700, fontSize:'0.88rem' }}>{h.materia_nombre}</span>
                            <span style={{ fontSize:'0.75rem', color:'var(--gray-400)', fontFamily:'monospace', marginLeft:10 }}>
                              {h.hora_inicio?.substring(0,5)} – {h.hora_fin?.substring(0,5)}
                            </span>
                          </div>

                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            {h.asignado ? (
                              <>
                                <span style={{
                                  background:'#dcfce7', color:'#15803d',
                                  padding:'3px 10px', borderRadius:'20px',
                                  fontSize:'0.76rem', fontWeight:600,
                                }}>
                                  {h.docente}
                                </span>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize:'0.74rem', padding:'3px 8px' }}
                                  onClick={() => cargarDocDisponibles(h)}
                                >
                                  Cambiar
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ fontSize:'0.76rem', display:'inline-flex', alignItems:'center', gap:4 }}
                                onClick={() => cargarDocDisponibles(h)}
                              >
                                <FiChevronDown/> Asignar docente
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Dropdown de asignación (si está expandido) */}
                        {expanded && (
                          <div style={{ marginTop:8, display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                            {!dataMat ? (
                              <span style={{ fontSize:'0.78rem', color:'var(--gray-400)' }}>Cargando...</span>
                            ) : dataMat.docentes.length === 0 ? (
                              <span style={{ fontSize:'0.78rem', color:'var(--danger, #ef4444)', fontWeight: 550 }}>
                                {dataMat.message || "No hay docentes disponibles para esta materia en este horario."}
                              </span>
                            ) : (
                              <>
                                <select
                                  className="form-select"
                                  style={{ flex:'1 1 180px', maxWidth:280, fontSize:'0.82rem', height:32, padding:'0 8px' }}
                                  value={selDocModal[key]||''}
                                  onChange={e => setSelDocModal(p => ({...p,[key]:e.target.value}))}
                                >
                                  <option value="">Seleccionar docente...</option>
                                  {dataMat.docentes.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} (CI: {d.ci})</option>
                                  ))}
                                </select>
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize:'0.78rem' }}
                                  onClick={() => handleAsignarManualModal(h)}
                                  disabled={guardandoMat[key]}
                                >
                                  {guardandoMat[key] ? 'Guardando...' : 'Confirmar'}
                                </button>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize:'0.78rem' }}
                                  onClick={() => setExpandedMat(null)}
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalDocentes(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          Modal — Horario del grupo
      ════════════════════════════════════════ */}
      {modalHorario && (
        <div className="modal-overlay" onClick={() => setModalHorario(null)}>
          <div className="modal" style={{ maxWidth: 800, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                Horario detallado — {modalHorario.codigo} {(modalHorario.turno || '').toLowerCase()}
              </span>
              <button className="modal-close" onClick={() => setModalHorario(null)}><FiX /></button>
            </div>
            <div className="modal-body" style={{ padding: '12px 20px' }}>
              {loadingHorario ? (
                <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 20 }}>Cargando...</p>
              ) : !detalleHorario ? (
                <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 20 }}>Error al cargar detalles.</p>
              ) : (
                <>
                  <div style={{ marginBottom: 16, display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                      <strong>Grupo:</strong> {detalleHorario.codigo}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                      <strong>Turno:</strong> {detalleHorario.turno}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                      <strong>Aula:</strong> {detalleHorario.aula || '-'}
                    </p>
                  </div>
                  
                  <div style={{ overflowX: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', background: 'white' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center' }}>
                      <thead>
                        <tr style={{ background: 'var(--primary)', color: 'white' }}>
                          <th style={{ padding: '10px', border: '1px solid var(--gray-200)', width: '100px', fontWeight: 600 }}>Hora</th>
                          <th style={{ padding: '10px', border: '1px solid var(--gray-200)', fontWeight: 600 }}>Lunes</th>
                          <th style={{ padding: '10px', border: '1px solid var(--gray-200)', fontWeight: 600 }}>Martes</th>
                          <th style={{ padding: '10px', border: '1px solid var(--gray-200)', fontWeight: 600 }}>Miércoles</th>
                          <th style={{ padding: '10px', border: '1px solid var(--gray-200)', fontWeight: 600 }}>Jueves</th>
                          <th style={{ padding: '10px', border: '1px solid var(--gray-200)', fontWeight: 600 }}>Viernes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getHoursForTurno(detalleHorario.turno).map(h => {
                          const nextHourNum = parseInt(h.split(':')[0], 10) + 1
                          const nextHour = `${nextHourNum < 10 ? '0' : ''}${nextHourNum}:00`
                          return (
                            <tr key={h} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                              <td style={{ padding: '10px', fontWeight: 'bold', border: '1px solid var(--gray-200)', background: 'var(--gray-50)', fontSize: '0.78rem' }}>
                                {h} - {nextHour}
                              </td>
                              {['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].map(dia => {
                                const cell = getCellDataForGroup(dia, h)
                                return (
                                  <td key={dia} style={{ padding: '6px', border: '1px solid var(--gray-200)', verticalAlign: 'middle', height: '75px', width: '18%' }}>
                                    {cell ? (
                                      <div style={{
                                        background: 'var(--primary-light, #eff6ff)',
                                        border: '1px solid var(--primary-border, #bfdbfe)',
                                        borderRadius: 'var(--radius)',
                                        padding: '6px',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        color: 'var(--gray-800)',
                                        boxShadow: 'var(--shadow-sm)'
                                      }}
                                      title={`Docente: ${cell.docente}\nAula: ${cell.aula}`}
                                      >
                                        <strong style={{ color: 'var(--primary)', fontSize: '0.78rem', marginBottom: '2px', display: 'block' }}>
                                          {cell.materia}
                                        </strong>
                                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--gray-600)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          Docente: {cell.docente}
                                        </span>
                                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--gray-600)' }}>
                                          Aula: {cell.aula}
                                        </span>
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--gray-300)', fontSize: '0.8rem' }}>—</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalHorario(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}
