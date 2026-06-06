import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import {
  getCuposCarrera, crearCupoCarrera, actualizarCupoCarrera,
  toggleCupoEstado, revertirCupos,
} from '../services/coordinadorService'
import { FiPlus, FiEdit2, FiRefreshCw, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

// ── Constantes ────────────────────────────────────────────────────────────────

const CARRERAS = [
  'Ingeniería en Sistemas',
  'Ingeniería Informática',
  'Ingeniería en Redes y Telecomunicaciones',
  'Ingeniería en Robótica',
]

const ESTADO_BADGE = {
  activo:   { bg: '#e8f5e9', text: '#2e7d32', label: 'Activo' },
  inactivo: { bg: '#f5f5f5', text: '#757575', label: 'Inactivo' },
  lleno:    { bg: '#fce4ec', text: '#c62828', label: 'Lleno' },
}

// ── Barra de progreso ─────────────────────────────────────────────────────────

function OcuBar({ ocupados, maximo }) {
  const pct   = maximo > 0 ? Math.min(100, Math.round((ocupados / maximo) * 100)) : 0
  const color = pct >= 100 ? '#c62828' : pct >= 80 ? '#f57f17' : '#2e7d32'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#e0e0e0', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color, minWidth: 50, textAlign: 'right' }}>
        {ocupados}/{maximo}
      </span>
    </div>
  )
}

// ── Modal de formulario ───────────────────────────────────────────────────────

function ModalCupo({ modo, cupo, onClose, onSaved }) {
  const [carrera,  setCarrera]  = useState(cupo?.carrera   || '')
  const [gestion,  setGestion]  = useState(cupo?.gestion   || `${new Date().getFullYear()}-I`)
  const [maximo,   setMaximo]   = useState(cupo?.cupo_maximo || '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const data = { carrera, gestion, cupo_maximo: parseInt(maximo, 10) }
      if (modo === 'crear') {
        await crearCupoCarrera(data)
      } else {
        await actualizarCupoCarrera(cupo.id, { cupo_maximo: parseInt(maximo, 10) })
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el cupo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1565c0', marginBottom: 20 }}>
          {modo === 'crear' ? 'Agregar cupo por carrera' : 'Editar cupo máximo'}
        </h2>

        {error && (
          <div style={{ background: '#fce4ec', color: '#c62828', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={labelStyle}>
            Carrera *
            <select
              value={carrera} onChange={e => setCarrera(e.target.value)}
              required disabled={modo === 'editar'}
              style={inputStyle}
            >
              <option value="">Seleccionar carrera</option>
              {CARRERAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label style={labelStyle}>
            Gestión *
            <input
              type="text" value={gestion} onChange={e => setGestion(e.target.value)}
              placeholder="2026-I" required disabled={modo === 'editar'}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Cupo máximo *
            <input
              type="number" value={maximo} onChange={e => setMaximo(e.target.value)}
              min={1} required
              style={inputStyle}
            />
            {modo === 'editar' && cupo.cupos_ocupados > 0 && (
              <span style={{ fontSize: '0.77rem', color: '#f57f17', marginTop: 2 }}>
                Mínimo permitido: {cupo.cupos_ocupados} (estudiantes ya admitidos)
              </span>
            )}
          </label>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CuposCarrera() {
  const [cupos,        setCupos]      = useState([])
  const [loading,      setLoading]    = useState(true)
  const [filtroGestion, setFiltro]   = useState('')
  const [gestiones,    setGestiones]  = useState([])
  const [modal,        setModal]      = useState(null) // { modo: 'crear'|'editar', cupo? }
  const [msg,          setMsg]        = useState(null) // { tipo, texto }
  const [revertiendo,  setRevertiendo] = useState(null)

  const fetchCupos = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroGestion) params.gestion = filtroGestion
      const r = await getCuposCarrera(params)
      const data = r.data
      setCupos(data)
      // Extraer gestiones únicas para filtro
      const gs = [...new Set(data.map(c => c.gestion))].sort().reverse()
      setGestiones(gs)
    } catch {
      setCupos([])
    } finally {
      setLoading(false)
    }
  }, [filtroGestion])

  useEffect(() => { fetchCupos() }, [fetchCupos])

  const showMsg = (tipo, texto) => {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleToggle = async (cupo) => {
    try {
      await toggleCupoEstado(cupo.id)
      showMsg('success', `Estado cambiado para ${cupo.carrera}.`)
      fetchCupos()
    } catch {
      showMsg('error', 'No se pudo cambiar el estado.')
    }
  }

  const handleRevertir = async (cupo) => {
    if (!window.confirm(
      `Esta acción es solo para pruebas.\n\nEliminará TODOS los resultados de admisión de la gestión "${cupo.gestion}".\n\n¿Continuar?`
    )) return
    setRevertiendo(cupo.id)
    try {
      const r = await revertirCupos(cupo.id)
      showMsg('success', r.data.message)
      fetchCupos()
    } catch {
      showMsg('error', 'No se pudo revertir la admisión.')
    } finally {
      setRevertiendo(null)
    }
  }

  const getEstadoBadge = (cupo) => {
    if (cupo.estado === 'inactivo') return ESTADO_BADGE.inactivo
    if (cupo.cupos_restantes === 0) return ESTADO_BADGE.lleno
    return ESTADO_BADGE.activo
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Cupos por Carrera</h1>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchCupos} title="Actualizar">
            <FiRefreshCw />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal({ modo: 'crear' })}>
            <FiPlus style={{ marginRight: 4 }} /> Agregar cupo
          </button>
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

      {/* Filtro por gestión */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--gray-600)', fontWeight: 500 }}>
          Filtrar por gestión:
        </label>
        <select
          value={filtroGestion}
          onChange={e => setFiltro(e.target.value)}
          style={{ ...inputStyle, width: 160, marginTop: 0 }}
        >
          <option value="">Todas</option>
          {gestiones.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {loading ? <Loading /> : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          {cupos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)', fontSize: '0.95rem' }}>
              No hay cupos registrados. Agrega el primero.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: 700 }}>
              <thead>
                <tr style={{ background: '#1565c0', color: '#fff' }}>
                  <th style={{ ...thBase, textAlign: 'left', paddingLeft: 20 }}>Carrera</th>
                  <th style={thBase}>Gestión</th>
                  <th style={thBase}>Cupo máx.</th>
                  <th style={{ ...thBase, minWidth: 140 }}>Ocupación</th>
                  <th style={thBase}>Restantes</th>
                  <th style={thBase}>Estado</th>
                  <th style={{ ...thBase, borderRight: 'none' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cupos.map((c, i) => {
                  const eb = getEstadoBadge(c)
                  return (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#f5f9ff' }}>
                      <td style={{ ...tdBase, textAlign: 'left', paddingLeft: 20, fontWeight: 600, color: 'var(--gray-800)' }}>
                        {c.carrera}
                      </td>
                      <td style={{ ...tdBase, fontWeight: 600, color: '#1565c0' }}>{c.gestion}</td>
                      <td style={tdBase}>{c.cupo_maximo}</td>
                      <td style={{ ...tdBase, minWidth: 140 }}>
                        <OcuBar ocupados={c.cupos_ocupados} maximo={c.cupo_maximo} />
                      </td>
                      <td style={{ ...tdBase, fontWeight: 700, color: c.cupos_restantes === 0 ? '#c62828' : '#2e7d32' }}>
                        {c.cupos_restantes}
                      </td>
                      <td style={tdBase}>
                        <span style={{
                          background: eb.bg, color: eb.text,
                          padding: '3px 10px', borderRadius: 20,
                          fontSize: '0.75rem', fontWeight: 700,
                        }}>
                          {eb.label}
                        </span>
                      </td>
                      <td style={{ ...tdBase, borderRight: 'none' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setModal({ modo: 'editar', cupo: c })}
                            title="Editar cupo máximo"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          >
                            <FiEdit2 size={13} style={{ marginRight: 3 }} /> Editar
                          </button>
                          <button
                            onClick={() => handleToggle(c)}
                            style={{
                              padding: '4px 10px', fontSize: '0.78rem', borderRadius: 6, cursor: 'pointer',
                              background: c.estado === 'activo' ? '#fff3e0' : '#e8f5e9',
                              color: c.estado === 'activo' ? '#e65100' : '#2e7d32',
                              border: `1px solid ${c.estado === 'activo' ? '#ffcc80' : '#a5d6a7'}`,
                            }}
                          >
                            {c.estado === 'activo' ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => handleRevertir(c)}
                            disabled={revertiendo === c.id}
                            style={{
                              padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6, cursor: 'pointer',
                              background: '#f5f5f5', color: '#9e9e9e',
                              border: '1px solid #e0e0e0',
                            }}
                            title="Solo para pruebas: elimina resultados de admisión de esta gestión"
                          >
                            {revertiendo === c.id ? '...' : 'Revertir'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ModalCupo
          modo={modal.modo}
          cupo={modal.cupo}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchCupos(); showMsg('success', 'Cupo guardado correctamente.') }}
        />
      )}
    </Layout>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const thBase = {
  padding: '11px 12px', textAlign: 'center',
  fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.3px',
  borderRight: '1px solid rgba(255,255,255,0.15)',
}
const tdBase = {
  padding: '10px 12px', textAlign: 'center',
  border: '1px solid #e8f1fb', verticalAlign: 'middle',
}
const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 4,
  fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)',
}
const inputStyle = {
  padding: '8px 12px', borderRadius: 6, fontSize: '0.875rem',
  border: '1px solid var(--gray-300)', outline: 'none',
  background: '#fff', color: 'var(--gray-800)', width: '100%', marginTop: 2,
}
const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalStyle = {
  background: '#fff', borderRadius: 12, padding: '28px 32px',
  width: '100%', maxWidth: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
}
