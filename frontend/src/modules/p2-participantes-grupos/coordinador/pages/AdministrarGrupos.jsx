import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import {
  getGrupos, generarGruposAuto, toggleEstadoGrupo, getGrupo, deleteGrupo,
} from '../services/coordinadorService'
import {
  FiEye, FiAlertCircle, FiCheckCircle, FiRefreshCw, FiZap, FiTrash2,
} from 'react-icons/fi'

const TURNOS = ['mañana', 'tarde', 'noche']
const TURNO_LABELS = { mañana: 'Mañana (08:00-12:00)', tarde: 'Tarde (12:00-16:00)', noche: 'Noche (16:00-20:00)' }
const MATERIAS_ORDEN = ['Computación', 'Física', 'Inglés', 'Matemáticas']
const TURNO_HORAS = {
  mañana: [['08:00', '09:00'], ['09:00', '10:00'], ['10:00', '11:00'], ['11:00', '12:00']],
  tarde: [['12:00', '13:00'], ['13:00', '14:00'], ['14:00', '15:00'], ['15:00', '16:00']],
  noche: [['16:00', '17:00'], ['17:00', '18:00'], ['18:00', '19:00'], ['19:00', '20:00']],
}

export default function AdministrarGrupos() {
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTurno, setFiltroTurno] = useState('')

  // Modales: null | 'ver' | 'generar' | 'resultGenerar' | 'asignar' | 'resultAsignar' | 'confirmarEliminar'
  const [modal, setModal] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Estados de operaciones
  const [generando, setGenerando] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [resultGenerar, setResultGenerar] = useState(null)

  // Notificación flotante
  const [msg, setMsg] = useState(null)

  const fetchGrupos = useCallback(async () => {
    try {
      const r = await getGrupos({ estado: filtroEstado || undefined, turno: filtroTurno || undefined })
      setGrupos(r.data || [])
    } catch { setGrupos([]) }
    finally { setLoading(false) }
  }, [filtroEstado, filtroTurno])

  useEffect(() => { fetchGrupos() }, [fetchGrupos])

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 6000)
  }

  const close = () => {
    setModal(null); setDetalle(null)
    setResultGenerar(null); setDeleteTarget(null)
  }

  // ── Ver detalle ──
  const openVer = async (g) => {
    try { const r = await getGrupo(g.id); setDetalle(r.data); setModal('ver') } catch { }
  }

  // ── Toggle estado por clic en badge ──
  const handleToggle = async (g) => {
    try { await toggleEstadoGrupo(g.id); fetchGrupos() } catch { }
  }

  // ── Generar grupos automáticamente ──
  const handleGenerarConfirm = async () => {
    setGenerando(true)
    try {
      const r = await generarGruposAuto()
      setResultGenerar(r.data)
      setModal('resultGenerar')
      fetchGrupos()
    } catch (e) {
      const status = e.response?.status
      const mensaje = e.response?.data?.message || 'Error al generar grupos.'
      if (status === 409) {
        close()
        showMsg('error', mensaje)
      } else {
        setResultGenerar({ error: mensaje })
        setModal('resultGenerar')
      }
    } finally {
      setGenerando(false)
    }
  }

  // ── Eliminar grupo ──
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await deleteGrupo(deleteTarget.id)
      showMsg('success', `Grupo ${deleteTarget.codigo} eliminado.`)
      close(); fetchGrupos()
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Error al eliminar.')
      close()
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <Layout><Loading /></Layout>

  return (
    <Layout>

      {/* ── Cabecera ── */}
      <div className="page-header">
        <h1>Gestión de Grupos</h1>
        <div className="page-header-actions" style={{ flexWrap: 'wrap', gap: '10px' }}>

          <select className="form-select" style={{ width: 140 }}
            value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>

          <select className="form-select" style={{ width: 190 }}
            value={filtroTurno} onChange={e => setFiltroTurno(e.target.value)}>
            <option value="">Todos los turnos</option>
            {TURNOS.map(t => <option key={t} value={t}>{TURNO_LABELS[t]}</option>)}
          </select>

          <button className="btn btn-primary" onClick={() => setModal('generar')}>
            <FiZap /> Generar Grupos
          </button>
        </div>
      </div>

      {/* ── Notificación ── */}
      {msg && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '10px 16px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: '0.875rem',
          background: msg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
          color: msg.type === 'success' ? '#065f46' : '#991b1b',
        }}>
          {msg.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          <span style={{ flex: 1 }}>{msg.text}</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            onClick={() => setMsg(null)}>×</button>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Turno</th>
              <th>Aula</th>
              <th>Días</th>
              <th>Cupo</th>
              <th>Ocupación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(g => (
              <tr key={g.id}>
                <td><strong>{g.codigo}</strong></td>
                <td>
                  <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                    {g.turno}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{g.aula || '-'}</td>
                <td style={{ fontSize: '0.8rem' }}>{(g.dias || []).join(', ') || '-'}</td>
                <td>70</td>
                <td>
                  <span style={{
                    fontWeight: 600,
                    color: g.ocupacion >= 70 ? '#dc2626' : g.ocupacion > 0 ? '#065f46' : 'var(--gray-400)',
                  }}>
                    {g.ocupacion}
                  </span>
                  <span style={{ color: 'var(--gray-400)' }}> / 70</span>
                </td>
                <td onClick={() => handleToggle(g)} style={{ cursor: 'pointer' }}
                  title="Clic para cambiar estado">
                  <StatusBadge status={g.estado} />
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openVer(g)} title="Ver detalle">
                      <FiEye />
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => { setDeleteTarget(g); setModal('confirmarEliminar') }}
                      disabled={deletingId === g.id}
                      title="Eliminar grupo"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', background: 'transparent', border: '1px solid' }}
                    >
                      {deletingId === g.id
                        ? <FiRefreshCw style={{ animation: 'spin 0.8s linear infinite' }} />
                        : <FiTrash2 />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {grupos.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No hay grupos generados. Use el botón <strong>Generar Grupos</strong> para crear grupos automáticamente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


      {/* ══════════════════════════════════════════════
          Modal — Ver detalle de grupo
      ══════════════════════════════════════════════ */}
      {modal === 'ver' && detalle && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Grupo {detalle.codigo}</span>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  ['Turno', detalle.turno],
                  ['Aula', detalle.aula || '-'],
                  ['Cupo', 70],
                  ['Ocupación', `${detalle.ocupacion} / 70`],
                  ['Estado', detalle.estado],
                  ['Días', (detalle.dias || []).length],
                ].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'center', padding: 10, background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'capitalize' }}>{v}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--gray-500)' }}>{l}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: 12 }}>
                <strong>Días:</strong> {(detalle.dias || []).join(', ') || '-'}
              </p>

              <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Horarios por materia:</p>
              <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-100)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Materia</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Horario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MATERIAS_ORDEN.map((nombre, idx) => {
                      const [h1, h2] = TURNO_HORAS[detalle.turno]?.[idx] || ['--:--', '--:--']
                      return (
                        <tr key={nombre} style={{ borderTop: '1px solid var(--gray-200)' }}>
                          <td style={{ padding: '8px 12px' }}>{nombre}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600 }}>
                            {h1} – {h2}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cerrar</button>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════
          Modal — Confirmar generación automática
      ══════════════════════════════════════════════ */}
      {modal === 'generar' && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Generar Grupos Automáticamente</span>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 14 }}>
                El sistema generará grupos basándose en los postulantes con estado <strong>INSCRITO</strong>.
              </p>

              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius)', padding: '14px 16px',
                fontSize: '0.84rem', color: '#1e40af', lineHeight: 1.8,
                marginBottom: 14,
              }}>
                <strong>Fórmula:</strong> Grupos = CEIL(Inscritos / 70)<br />
                <strong>Cupo máximo:</strong> 70 postulantes por grupo<br />
                <strong>Turnos:</strong> Mañana → Tarde → Noche (rotación)<br />
                <strong>Códigos:</strong> M1, T1, N1, M2, T2, N2...<br />
                <strong>Materias:</strong> Computación, Física, Inglés, Matemáticas<br />
                <strong>Aulas:</strong> Asignadas sin choque (11-16 / 21-26)
              </div>

              <div style={{
                background: '#fef3c7', border: '1px solid #fcd34d',
                borderRadius: 'var(--radius)', padding: '10px 14px',
                fontSize: '0.82rem', color: '#92400e',
              }}>
                Si ya existen grupos activos, el sistema no generará nuevos para evitar duplicados.
                Desactive o elimine los grupos existentes primero.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close} disabled={generando}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGenerarConfirm} disabled={generando}>
                {generando
                  ? <><FiRefreshCw style={{ animation: 'spin 0.8s linear infinite' }} /> Generando...</>
                  : <><FiZap /> Confirmar y Generar</>}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════
          Modal — Resultado de generación
      ══════════════════════════════════════════════ */}
      {modal === 'resultGenerar' && resultGenerar && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Resultado de Generación</span>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              {resultGenerar.error ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--danger-light)', color: '#991b1b', padding: '12px 14px', borderRadius: 'var(--radius)' }}>
                  <FiAlertCircle /> {resultGenerar.error}
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                      ['Inscritos contados', resultGenerar.total_inscritos, 'var(--primary)'],
                      ['Grupos generados', resultGenerar.grupos_generados, 'var(--success)'],
                    ].map(([l, v, c]) => (
                      <div key={l} style={{ textAlign: 'center', padding: 14, background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: c }}>{v}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', marginTop: 2 }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: 12 }}>
                    {resultGenerar.message}
                  </p>

                  {resultGenerar.grupos?.length > 0 && (
                    <>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 8 }}>Grupos creados:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {resultGenerar.grupos.map(g => (
                          <span key={g.codigo} style={{
                            padding: '4px 12px', borderRadius: '20px', fontWeight: 700,
                            background: 'var(--primary)', color: '#fff', fontSize: '0.84rem',
                          }}>
                            {g.codigo} — Aula {g.aula} ({g.turno})
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={close}><FiCheckCircle /> Listo</button>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════
          Modal — Confirmar eliminación de grupo
      ══════════════════════════════════════════════ */}
      {modal === 'confirmarEliminar' && deleteTarget && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Eliminar Grupo</span>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 10 }}>
                ¿Desea eliminar el grupo <strong>{deleteTarget.codigo}</strong> (Turno: {deleteTarget.turno}, Aula: {deleteTarget.aula})?
              </p>
              <p style={{ color: '#991b1b', fontSize: '0.84rem', margin: 0 }}>
                Se desasignarán todos los postulantes del grupo y se eliminarán sus horarios.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancelar</button>
              <button
                className="btn"
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                onClick={handleDeleteConfirm}
                disabled={!!deletingId}
              >
                {deletingId ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}
