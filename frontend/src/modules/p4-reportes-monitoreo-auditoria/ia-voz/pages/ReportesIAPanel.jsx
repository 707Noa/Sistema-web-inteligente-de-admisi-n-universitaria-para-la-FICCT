import React, { useState } from 'react'
import Layout from '@/layouts/Layout'
import { FiMic, FiMicOff, FiSearch, FiFileText, FiDownload, FiAlertCircle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { interpretarSolicitud, getVistaPrevia, generarReporte } from '../services/reporteIAService'

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ReportesIAPanel() {
  const {
    transcript,
    interimTranscript,
    isListening,
    error: voiceError,
    supported,
    start,
    stop,
    reset,
    setTranscript,
  } = useSpeechRecognition()

  const [interpretacion, setInterpretacion] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loadingInterpretar, setLoadingInterpretar] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingGenerar, setLoadingGenerar] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [formatoSeleccionado, setFormatoSeleccionado] = useState('pdf')

  // Solo el texto comprometido (final) se envía al backend.
  // El interim se muestra aparte mientras habla, pero no se acumula hasta que es final.
  const textoParaEnviar = transcript.trim()

  const handleInterpretar = async () => {
    if (!textoParaEnviar) return
    setLoadingInterpretar(true)
    setErrorMsg(null)
    setInterpretacion(null)
    setPreview(null)
    try {
      const res = await interpretarSolicitud(textoParaEnviar)
      const data = res.data
      if (!data.exitoso) {
        setErrorMsg(data.mensaje || 'No se pudo identificar el reporte solicitado.')
      } else {
        setInterpretacion(data)
        setFormatoSeleccionado(data.formato || 'pdf')
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error al interpretar la solicitud.')
    } finally {
      setLoadingInterpretar(false)
    }
  }

  const handleVistaPrevia = async () => {
    if (!interpretacion) return
    setLoadingPreview(true)
    setErrorMsg(null)
    try {
      const res = await getVistaPrevia(interpretacion.tipo_reporte, interpretacion.filtros || {})
      setPreview(res.data)
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error al cargar la vista previa.')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleGenerar = async (fmt) => {
    if (!interpretacion) return
    setLoadingGenerar(true)
    setErrorMsg(null)
    try {
      const res = await generarReporte(interpretacion.tipo_reporte, fmt, interpretacion.filtros || {})
      const ext = fmt === 'excel' ? 'xlsx' : 'pdf'
      descargarBlob(res.data, `reporte_${interpretacion.tipo_reporte}_${Date.now()}.${ext}`)
    } catch (err) {
      if (err.response?.data) {
        try {
          const text = await err.response.data.text()
          const parsed = JSON.parse(text)
          setErrorMsg(parsed.message || 'No se pudo generar el reporte.')
        } catch {
          setErrorMsg('No se pudo generar el reporte.')
        }
      } else {
        setErrorMsg('Error al generar el reporte.')
      }
    } finally {
      setLoadingGenerar(false)
    }
  }

  const handleReset = () => {
    reset()
    setInterpretacion(null)
    setPreview(null)
    setErrorMsg(null)
  }

  const estadoLabel = isListening ? 'Escuchando…' : (voiceError ? 'Error' : 'Detenido')
  const estadoColor = isListening ? '#16a34a' : (voiceError ? '#dc2626' : 'var(--gray-500)')

  return (
    <Layout>
      <div className="page-header">
        <h1>Reportes con IA por Voz</h1>
        <p style={{ color: 'var(--gray-500)', marginTop: 4, fontSize: 14 }}>
          Dicte su solicitud o escríbala manualmente. El sistema la interpreta y genera el reporte en PDF o Excel.
        </p>
      </div>

      {!supported && (
        <div style={{ padding: '12px 16px', marginBottom: 20, background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, color: '#92400e', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiAlertCircle />
          Tu navegador no soporta dictado por voz. Usa Chrome o Edge, o escribe la solicitud en el cuadro de texto.
        </div>
      )}

      {/* ── Bloque 1: Dictado ──────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">1. Dictado de solicitud</span>
          <button
            onClick={handleReset}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
          >
            <FiRefreshCw size={14} /> Limpiar
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>

          {/* Controles del micrófono */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <button
              onClick={isListening ? stop : start}
              disabled={!supported}
              className={`btn ${isListening ? 'btn-danger' : 'btn-primary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {isListening ? <FiMicOff /> : <FiMic />}
              {isListening ? 'Detener dictado' : 'Iniciar dictado'}
            </button>

            <span style={{ fontSize: 13, color: estadoColor, display: 'flex', alignItems: 'center', gap: 6 }}>
              {isListening && (
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#16a34a',
                  display: 'inline-block', animation: 'pulse 1.2s infinite',
                }} />
              )}
              {estadoLabel}
            </span>
          </div>

          {/* Cuadro de transcripción — editable manualmente cuando no está escuchando */}
          <textarea
            value={transcript}
            onChange={(e) => {
              if (!isListening) setTranscript(e.target.value)
            }}
            placeholder={
              supported
                ? 'Presione "Iniciar dictado" y hable, o escriba aquí su solicitud…'
                : 'Escriba aquí su solicitud de reporte…'
            }
            style={{
              width: '100%',
              minHeight: 80,
              background: isListening ? '#f0fdf4' : 'var(--gray-50)',
              border: `2px solid ${isListening ? '#16a34a' : 'var(--gray-200)'}`,
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 14,
              color: 'var(--gray-800)',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              transition: 'border-color 0.2s, background 0.2s',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: isListening ? 'default' : 'text',
            }}
            readOnly={isListening}
          />

          {/* Texto provisional (interim) — se muestra solo mientras habla */}
          {isListening && interimTranscript && (
            <p style={{ fontSize: 13, color: 'var(--gray-400)', fontStyle: 'italic', margin: '4px 0 0 0' }}>
              Captando: {interimTranscript}
            </p>
          )}

          {/* Error de voz */}
          {voiceError && (
            <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiAlertCircle size={14} /> {voiceError}
            </p>
          )}

          {/* Ejemplos rápidos */}
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '0 0 6px 0' }}>Ejemplos de solicitudes:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                'Genera un reporte de aprobados en PDF',
                'Exporta los reprobados del grupo M1 en Excel',
                'Reporte de docentes asignados',
                'Grupos sin docente',
                'Ocupación de cupos por grupo',
              ].map((ej) => (
                <button
                  key={ej}
                  onClick={() => { if (!isListening) setTranscript(ej) }}
                  disabled={isListening}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20,
                    border: '1px solid var(--gray-300)', background: 'white',
                    cursor: isListening ? 'not-allowed' : 'pointer', color: 'var(--gray-600)',
                    opacity: isListening ? 0.5 : 1,
                  }}
                >
                  {ej}
                </button>
              ))}
            </div>
          </div>

          {/* Botón interpretar */}
          <div style={{ marginTop: 16 }}>
            <button
              onClick={handleInterpretar}
              disabled={!textoParaEnviar || loadingInterpretar}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <FiSearch />
              {loadingInterpretar ? 'Interpretando…' : 'Interpretar solicitud'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error global ───────────────────────────────────── */}
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, marginBottom: 16, color: '#b91c1c', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiAlertCircle /> {errorMsg}
        </div>
      )}

      {/* ── Bloque 2: Interpretación ───────────────────────── */}
      {interpretacion && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiCheckCircle style={{ color: '#10b981' }} /> 2. Interpretación detectada
            </span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <InterpField label="Tipo de reporte" value={interpretacion.titulo} />
              <InterpField label="Formato" value={interpretacion.formato?.toUpperCase()} />
              {interpretacion.filtros?.grupo && <InterpField label="Grupo" value={interpretacion.filtros.grupo} />}
              {interpretacion.filtros?.materia && <InterpField label="Materia" value={interpretacion.filtros.materia} />}
              {interpretacion.filtros?.turno && <InterpField label="Turno" value={interpretacion.filtros.turno} />}
            </div>
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--gray-600)' }}>
              <strong>Descripción:</strong> {interpretacion.descripcion}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--gray-400)' }}>
              Texto recibido: <em>"{interpretacion.texto_recibido}"</em>
            </p>
            <div style={{ marginTop: 14 }}>
              <button
                onClick={handleVistaPrevia}
                disabled={loadingPreview}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <FiFileText />
                {loadingPreview ? 'Cargando…' : 'Ver vista previa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bloque 3: Vista previa ─────────────────────────── */}
      {preview && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">3. Vista previa — {preview.titulo}</span>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
              Mostrando {preview.mostrando} de {preview.total} registros
            </span>
          </div>
          <div style={{ padding: '0 0 16px 0' }}>
            {preview.filas.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                No existen datos para los filtros seleccionados.
              </p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>{preview.columnas.map((col) => <th key={col}>{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.filas.map((fila, i) => (
                      <tr key={i}>
                        {fila.map((celda, j) => <td key={j}>{celda ?? '—'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bloque 4: Exportación ──────────────────────────── */}
      {interpretacion && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">4. Exportar reporte</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              {['pdf', 'excel'].map((fmt) => (
                <label
                  key={fmt}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    padding: '8px 16px', borderRadius: 8,
                    border: `2px solid ${formatoSeleccionado === fmt ? '#3b82f6' : 'var(--gray-200)'}`,
                    background: formatoSeleccionado === fmt ? '#eff6ff' : 'white',
                    fontWeight: formatoSeleccionado === fmt ? 600 : 400,
                    fontSize: 14,
                  }}
                >
                  <input
                    type="radio"
                    name="formato"
                    value={fmt}
                    checked={formatoSeleccionado === fmt}
                    onChange={() => setFormatoSeleccionado(fmt)}
                    style={{ accentColor: '#3b82f6' }}
                  />
                  {fmt === 'pdf' ? '📄 PDF' : '📊 Excel (.xlsx)'}
                </label>
              ))}
            </div>
            <button
              onClick={() => handleGenerar(formatoSeleccionado)}
              disabled={loadingGenerar}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <FiDownload />
              {loadingGenerar
                ? 'Generando reporte…'
                : `Descargar ${formatoSeleccionado === 'pdf' ? 'PDF' : 'Excel'}`}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
      `}</style>
    </Layout>
  )
}

function InterpField({ label, value }) {
  return (
    <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ fontSize: 11, color: 'var(--gray-500)', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', margin: 0 }}>
        {value || '—'}
      </p>
    </div>
  )
}
