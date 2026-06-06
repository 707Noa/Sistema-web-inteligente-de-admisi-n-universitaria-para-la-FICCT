import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import {
  getGestionesAdmision, getResultadosAdmision,
  procesarAdmision, exportarAdmisionCsv,
} from '../services/coordinadorService'
import {
  FiRefreshCw, FiAlertCircle, FiCheckCircle,
  FiDownload, FiPlayCircle,
} from 'react-icons/fi'

// ── Constantes de estilo ──────────────────────────────────────────────────────

const ACAD_BADGE = {
  aprobado:  { bg: '#e8f5e9', text: '#2e7d32', label: 'APROBADO' },
  reprobado: { bg: '#fce4ec', text: '#c62828', label: 'REPROBADO' },
  pendiente: { bg: '#fff8e1', text: '#f57f17', label: 'PENDIENTE' },
}

const ADMISION_BADGE = {
  admitido_primera:  { bg: '#e3f2fd', text: '#1565c0', label: 'Admitido 1ra opción' },
  admitido_segunda:  { bg: '#ede7f6', text: '#4527a0', label: 'Admitido 2da opción' },
  aprobado_sin_cupo: { bg: '#fff3e0', text: '#e65100', label: 'Aprobado sin cupo' },
  reprobado:         { bg: '#fce4ec', text: '#c62828', label: 'Reprobado' },
  pendiente:         { bg: '#f5f5f5', text: '#757575', label: 'Pendiente' },
}

const RESUMEN_COLOR = {
  total:              { bg: '#e3f2fd', text: '#1565c0' },
  aprobados:          { bg: '#e8f5e9', text: '#2e7d32' },
  reprobados:         { bg: '#fce4ec', text: '#c62828' },
  admitidos_primera:  { bg: '#e8eaf6', text: '#283593' },
  admitidos_segunda:  { bg: '#ede7f6', text: '#4527a0' },
  aprobados_sin_cupo: { bg: '#fff3e0', text: '#e65100' },
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function ResumenCard({ label, value, estilo }) {
  return (
    <div style={{
      background: estilo.bg, color: estilo.text,
      borderRadius: 10, padding: '12px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      minWidth: 110,
    }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
    </div>
  )
}

function Nota({ valor }) {
  if (valor === null || valor === undefined) return <span style={{ color: '#bbb' }}>—</span>
  const color = valor >= 60 ? '#2e7d32' : '#c62828'
  return <span style={{ fontWeight: 600, color }}>{valor}</span>
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AdmisionFinal() {
  const [gestiones,     setGestiones]     = useState([])
  const [gestion,       setGestion]       = useState('')
  const [resultados,    setResultados]    = useState([])
  const [resumen,       setResumen]       = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [procesando,    setProcesando]    = useState(false)
  const [msg,           setMsg]           = useState(null)
  const [confirmar,     setConfirmar]     = useState(null) // { existentes }

  // Filtros
  const [filtroAcad,   setFiltroAcad]   = useState('')
  const [filtroAdm,    setFiltroAdm]    = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')

  // Cargar gestiones al montar
  useEffect(() => {
    getGestionesAdmision()
      .then(r => {
        setGestiones(r.data)
        if (r.data.length > 0) setGestion(r.data[0])
      })
      .catch(() => {})
  }, [])

  const fetchResultados = useCallback(async () => {
    if (!gestion) return
    setLoading(true)
    try {
      const params = { gestion }
      if (filtroAcad)    params.estado_academico = filtroAcad
      if (filtroAdm)     params.estado_admision  = filtroAdm
      if (filtroCarrera) params.carrera_admitida = filtroCarrera
      const r = await getResultadosAdmision(params)
      setResultados(r.data)
      // Calcular resumen local
      const d = r.data
      setResumen({
        total:              d.length,
        aprobados:          d.filter(x => x.estado_academico === 'aprobado').length,
        reprobados:         d.filter(x => ['reprobado','pendiente'].includes(x.estado_academico)).length,
        admitidos_primera:  d.filter(x => x.estado_admision === 'admitido_primera').length,
        admitidos_segunda:  d.filter(x => x.estado_admision === 'admitido_segunda').length,
        aprobados_sin_cupo: d.filter(x => x.estado_admision === 'aprobado_sin_cupo').length,
      })
    } catch {
      setResultados([])
      setResumen(null)
    } finally {
      setLoading(false)
    }
  }, [gestion, filtroAcad, filtroAdm, filtroCarrera])

  useEffect(() => { fetchResultados() }, [fetchResultados])

  const showMsg = (tipo, texto) => {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg(null), 5000)
  }

  // Iniciar procesamiento (con posible confirmación)
  const handleProcesar = async (forzar = false) => {
    if (!gestion) { showMsg('error', 'Selecciona una gestión primero.'); return }
    setConfirmar(null)
    setProcesando(true)
    try {
      const r = await procesarAdmision({ gestion, forzar })
      showMsg('success', r.data.message)
      fetchResultados()
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.requiere_confirmacion) {
        setConfirmar({ existentes: err.response.data.existentes })
      } else {
        showMsg('error', err.response?.data?.message || 'Error al procesar la admisión.')
      }
    } finally {
      setProcesando(false)
    }
  }

  const handleExportar = () => {
    const params = { gestion }
    if (filtroAcad)    params.estado_academico = filtroAcad
    if (filtroAdm)     params.estado_admision  = filtroAdm
    if (filtroCarrera) params.carrera_admitida = filtroCarrera
    exportarAdmisionCsv(params)
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Admisión Final</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchResultados} disabled={loading} title="Actualizar">
            <FiRefreshCw />
          </button>
          {resultados.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={handleExportar} title="Exportar CSV">
              <FiDownload style={{ marginRight: 4 }} /> CSV
            </button>
          )}
        </div>
      </div>

      {/* Mensaje de estado */}
      {msg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: msg.tipo === 'success' ? '#e8f5e9' : '#fce4ec',
          color: msg.tipo === 'success' ? '#2e7d32' : '#c62828',
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem',
        }}>
          {msg.tipo === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          {msg.texto}
        </div>
      )}

      {/* Diálogo de confirmación de reproceso */}
      {confirmar && (
        <div style={{
          background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10,
          padding: '14px 18px', marginBottom: 16, fontSize: '0.875rem', color: '#6d4c00',
        }}>
          <strong style={{ display: 'block', marginBottom: 6 }}>
            Ya existe un proceso de admisión para la gestión {gestion} ({confirmar.existentes} registros).
          </strong>
          Los resultados anteriores serán eliminados y reemplazados.
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={() => handleProcesar(true)} disabled={procesando}>
              Reprocesar de todas formas
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmar(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Barra de controles */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-600)' }}>Gestión</label>
            <select
              value={gestion} onChange={e => setGestion(e.target.value)}
              style={selectStyle}
            >
              <option value="">Seleccionar gestión</option>
              {gestiones.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handleProcesar(false)}
            disabled={procesando || !gestion}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <FiPlayCircle />
            {procesando ? 'Procesando...' : 'Procesar admisión final'}
          </button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      {resumen && resumen.total > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          <ResumenCard label="Total"              value={resumen.total}              estilo={RESUMEN_COLOR.total} />
          <ResumenCard label="Aprobados"          value={resumen.aprobados}          estilo={RESUMEN_COLOR.aprobados} />
          <ResumenCard label="Reprobados"         value={resumen.reprobados}         estilo={RESUMEN_COLOR.reprobados} />
          <ResumenCard label="Admitidos 1ra"      value={resumen.admitidos_primera}  estilo={RESUMEN_COLOR.admitidos_primera} />
          <ResumenCard label="Admitidos 2da"      value={resumen.admitidos_segunda}  estilo={RESUMEN_COLOR.admitidos_segunda} />
          <ResumenCard label="Sin cupo"           value={resumen.aprobados_sin_cupo} estilo={RESUMEN_COLOR.aprobados_sin_cupo} />
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <select value={filtroAcad} onChange={e => setFiltroAcad(e.target.value)} style={selectStyle}>
          <option value="">Estado académico</option>
          <option value="aprobado">Aprobado</option>
          <option value="reprobado">Reprobado</option>
          <option value="pendiente">Pendiente</option>
        </select>
        <select value={filtroAdm} onChange={e => setFiltroAdm(e.target.value)} style={selectStyle}>
          <option value="">Estado admisión</option>
          <option value="admitido_primera">Admitido 1ra opción</option>
          <option value="admitido_segunda">Admitido 2da opción</option>
          <option value="aprobado_sin_cupo">Aprobado sin cupo</option>
          <option value="reprobado">Reprobado</option>
        </select>
        <input
          type="text" placeholder="Carrera admitida..."
          value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)}
          style={{ ...selectStyle, minWidth: 200 }}
        />
        {(filtroAcad || filtroAdm || filtroCarrera) && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => { setFiltroAcad(''); setFiltroAdm(''); setFiltroCarrera('') }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla de resultados */}
      {loading ? <Loading /> : resultados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)', fontSize: '0.95rem' }}>
          {gestion
            ? 'No hay resultados para esta gestión. Usa el botón "Procesar admisión final".'
            : 'Selecciona una gestión para ver los resultados.'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 1100 }}>
            <thead>
              <tr style={{ background: '#1565c0', color: '#fff' }}>
                <th style={{ ...thBase, textAlign: 'left', paddingLeft: 14, minWidth: 160 }}>Nombre</th>
                <th style={thBase}>CI</th>
                <th style={thBase}>Registro</th>
                <th style={{ ...thBase, minWidth: 120 }}>1ra Carrera</th>
                <th style={{ ...thBase, minWidth: 120 }}>2da Carrera</th>
                <th style={thBase}>Comp.</th>
                <th style={thBase}>Mat.</th>
                <th style={thBase}>Ing.</th>
                <th style={thBase}>Fís.</th>
                <th style={thBase}>Prom.</th>
                <th style={thBase}>Estado Ac.</th>
                <th style={{ ...thBase, minWidth: 140 }}>Carrera admitida</th>
                <th style={{ ...thBase, minWidth: 150 }}>Estado admisión</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r, i) => {
                const ab = ACAD_BADGE[r.estado_academico]   || ACAD_BADGE.pendiente
                const db = ADMISION_BADGE[r.estado_admision] || ADMISION_BADGE.pendiente
                return (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f5f9ff' }}>
                    <td style={{ ...tdBase, textAlign: 'left', paddingLeft: 14, fontWeight: 600 }}>{r.nombre}</td>
                    <td style={tdBase}>{r.ci}</td>
                    <td style={{ ...tdBase, fontFamily: 'monospace', fontSize: '0.78rem' }}>{r.registro}</td>
                    <td style={{ ...tdBase, fontSize: '0.78rem' }}>{r.primera_carrera || '—'}</td>
                    <td style={{ ...tdBase, fontSize: '0.78rem', color: 'var(--gray-500)' }}>{r.segunda_carrera || '—'}</td>
                    <td style={tdBase}><Nota valor={r.promedio_computacion} /></td>
                    <td style={tdBase}><Nota valor={r.promedio_matematicas} /></td>
                    <td style={tdBase}><Nota valor={r.promedio_ingles} /></td>
                    <td style={tdBase}><Nota valor={r.promedio_fisica} /></td>
                    <td style={{ ...tdBase, fontWeight: 700, color: '#1565c0' }}>
                      {r.promedio_final !== null ? r.promedio_final : '—'}
                    </td>
                    <td style={tdBase}>
                      <span style={{
                        background: ab.bg, color: ab.text,
                        padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                      }}>
                        {ab.label}
                      </span>
                    </td>
                    <td style={{ ...tdBase, fontSize: '0.78rem' }}>
                      {r.carrera_admitida || <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={{ ...tdBase, borderRight: 'none' }}>
                      <span style={{
                        background: db.bg, color: db.text,
                        padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}>
                        {db.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}

// ── Estilos base ──────────────────────────────────────────────────────────────

const thBase = {
  padding: '10px 10px', textAlign: 'center',
  fontWeight: 600, fontSize: '0.78rem', letterSpacing: '0.2px',
  borderRight: '1px solid rgba(255,255,255,0.15)',
}
const tdBase = {
  padding: '9px 10px', textAlign: 'center',
  border: '1px solid #e8f1fb', verticalAlign: 'middle',
}
const selectStyle = {
  padding: '7px 12px', borderRadius: 6, fontSize: '0.875rem',
  border: '1px solid var(--gray-300)', background: '#fff',
  color: 'var(--gray-800)', outline: 'none', cursor: 'pointer',
}
