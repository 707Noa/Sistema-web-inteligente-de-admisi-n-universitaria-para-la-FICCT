import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import { getReporteHorarios, exportarHorariosCsv, getDocentesAcademicos, getGrupos } from '../services/coordinadorService'
import { FiDownload, FiRefreshCw } from 'react-icons/fi'

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado']
const TURNOS = ['mañana','tarde','noche']
const MATERIAS = ['Computación','Física','Inglés','Matemáticas']

export default function ReporteHorarios() {
  const [rows, setRows]         = useState([])
  const [docentes, setDocentes] = useState([])
  const [grupos, setGrupos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [filtros, setFiltros]   = useState({ docente_user_id:'', materia_nombre:'', grupo_id:'', turno:'', dia:'' })

  const fetchReporte = useCallback(async () => {
    setLoading(true)
    const params = {}
    if (filtros.docente_user_id) params.docente_user_id = filtros.docente_user_id
    if (filtros.grupo_id)        params.grupo_id        = filtros.grupo_id
    if (filtros.turno)           params.turno           = filtros.turno
    if (filtros.dia)             params.dia             = filtros.dia
    try {
      const r = await getReporteHorarios(params)
      let data = r.data || []
      if (filtros.materia_nombre) {
        data = data.filter(x => x.materia_nombre === filtros.materia_nombre)
      }
      setRows(data)
    } catch { setRows([]) }
    finally { setLoading(false) }
  }, [filtros])

  useEffect(() => { fetchReporte() }, [fetchReporte])

  useEffect(() => {
    getDocentesAcademicos().then(r => setDocentes(r.data||[])).catch(()=>{})
    getGrupos().then(r => setGrupos(r.data||[])).catch(()=>{})
  }, [])

  const handleExport = () => {
    const params = {}
    if (filtros.docente_user_id) params.docente_user_id = filtros.docente_user_id
    if (filtros.grupo_id)        params.grupo_id        = filtros.grupo_id
    if (filtros.turno)           params.turno           = filtros.turno
    if (filtros.dia)             params.dia             = filtros.dia
    exportarHorariosCsv(params)
  }

  const setFiltro = (key, val) => setFiltros(prev => ({ ...prev, [key]: val }))

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h1>Reporte de horarios</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={handleExport} title="Exportar CSV">
            <FiDownload /> CSV
          </button>
          <button className="btn btn-outline btn-sm" onClick={fetchReporte} title="Actualizar">
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}>
        <select className="form-select" style={{flex:'1',minWidth:180}} value={filtros.docente_user_id} onChange={e=>setFiltro('docente_user_id',e.target.value)}>
          <option value="">Todos los docentes</option>
          {docentes.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="form-select" style={{flex:'1',minWidth:160}} value={filtros.materia_nombre} onChange={e=>setFiltro('materia_nombre',e.target.value)}>
          <option value="">Todas las materias</option>
          {MATERIAS.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select className="form-select" style={{flex:'1',minWidth:140}} value={filtros.grupo_id} onChange={e=>setFiltro('grupo_id',e.target.value)}>
          <option value="">Todos los grupos</option>
          {grupos.map(g=><option key={g.id} value={g.id}>{g.codigo}</option>)}
        </select>
        <select className="form-select" style={{flex:'1',minWidth:140}} value={filtros.turno} onChange={e=>setFiltro('turno',e.target.value)}>
          <option value="">Todos los turnos</option>
          {TURNOS.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
        <select className="form-select" style={{flex:'1',minWidth:140}} value={filtros.dia} onChange={e=>setFiltro('dia',e.target.value)}>
          <option value="">Todos los días</option>
          {DIAS.map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Docente</th><th>CI</th><th>Registro</th>
              <th>Materia</th><th>Grupo</th><th>Día</th><th>Turno</th><th>Horario</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i}>
                <td><strong>{r.docente_name}</strong></td>
                <td>{r.docente_ci||'-'}</td>
                <td style={{fontSize:'0.8rem',color:'var(--gray-500)'}}>{r.docente_codigo||'-'}</td>
                <td><span className="badge badge-info" style={{textTransform:'none'}}>{r.materia_nombre}</span></td>
                <td><strong>{r.grupo_codigo}</strong></td>
                <td style={{textTransform:'capitalize'}}>{r.dia}</td>
                <td style={{textTransform:'capitalize'}}>{r.turno}</td>
                <td style={{whiteSpace:'nowrap',fontWeight:600,color:'var(--primary)'}}>
                  {r.hora_inicio} – {r.hora_fin}
                </td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--gray-400)'}}>
                Sin asignaciones registradas
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length>0 && (
        <p style={{textAlign:'right',fontSize:'0.8rem',color:'var(--gray-500)',marginTop:8}}>
          {rows.length} registro(s)
        </p>
      )}
    </Layout>
  )
}
