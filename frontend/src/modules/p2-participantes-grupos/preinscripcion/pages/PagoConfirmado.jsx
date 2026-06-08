import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { consultarPagoEstado, consultarStripeEstado } from '@/modules/p2-participantes-grupos/postulantes/services/preinscripcionService'
import { FiCheckCircle, FiAlertTriangle, FiPrinter, FiArrowRight, FiInfo } from 'react-icons/fi'
import Loading from '@/shared/components/Loading'

export default function PagoConfirmado() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  const postulanteId = searchParams.get('postulante_id')
  const gateway = searchParams.get('gateway') || 'stripe'
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    let active = true
    let pollInterval = null
    let pollAttempts = 0
    const maxPollAttempts = 3 // Check status up to 3 times (6 seconds total)

    const checkStatus = async () => {
      if (!active) return

      try {
        if (gateway === 'stripe' && sessionId) {
          // Consultar el estado de Stripe
          const res = await consultarStripeEstado(sessionId)
          const data = res.data // { estado: "pagado"|"pendiente"|"fallido", postulante_id: X }
          
          if (data.estado === 'pagado') {
            const pId = data.postulante_id || postulanteId
            if (pId) {
              const resPostulante = await consultarPagoEstado(pId)
              if (active) {
                setStatus(resPostulante.data)
                setLoading(false)
              }
            } else {
              if (active) {
                setError('No se pudo encontrar el ID del postulante.')
                setLoading(false)
              }
            }
            if (pollInterval) clearInterval(pollInterval)
          } else if (data.estado === 'fallido') {
            const pId = data.postulante_id || postulanteId
            if (pId) {
              const resPostulante = await consultarPagoEstado(pId)
              if (active) setStatus(resPostulante.data)
            }
            if (active) {
              setError('El pago fue fallido o cancelado.')
              setLoading(false)
            }
            if (pollInterval) clearInterval(pollInterval)
          } else {
            // Sigue pendiente
            pollAttempts++
            if (pollAttempts >= maxPollAttempts) {
              const pId = data.postulante_id || postulanteId
              if (pId) {
                const resPostulante = await consultarPagoEstado(pId)
                if (active) setStatus(resPostulante.data)
              }
              if (active) {
                setError('El pago sigue en verificación. Pago pendiente de confirmación.')
                setLoading(false)
              }
              if (pollInterval) clearInterval(pollInterval)
            }
          }
        } else {
          // Si no es Stripe o no hay session_id
          if (!postulanteId) {
            setError('ID de postulante ausente en la confirmación.')
            setLoading(false)
            return
          }
          const resPostulante = await consultarPagoEstado(postulanteId)
          if (active) {
            setStatus(resPostulante.data)
            setLoading(false)
          }
        }
      } catch (err) {
        pollAttempts++
        if (pollAttempts >= maxPollAttempts || !sessionId) {
          const pId = postulanteId
          if (pId) {
            try {
              const resPostulante = await consultarPagoEstado(pId)
              if (active) setStatus(resPostulante.data)
            } catch (innerErr) {}
          }
          if (active) {
            setError('No se pudo verificar el estado del pago. Pago pendiente de confirmación.')
            setLoading(false)
          }
          if (pollInterval) clearInterval(pollInterval)
        }
      }
    }

    // Ejecutar checkStatus inmediatamente
    checkStatus()

    // Si es Stripe y tenemos session_id, iniciar polling
    if (gateway === 'stripe' && sessionId) {
      pollInterval = setInterval(checkStatus, 2000)
    }

    return () => {
      active = false
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [postulanteId, gateway, sessionId])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <Loading />
        <p style={{ marginTop: 16, color: '#475569', fontWeight: 500 }}>Verificando pago con Stripe...</p>
      </div>
    )
  }

  const isSuccess = status && status.pago_estado === 'PAGADO'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', padding: '24px' }}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div id="printable-area" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: '550px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        color: '#1e293b'
      }}>
        {/* Header decoration based on success/failure */}
        <div style={{
          padding: '40px 24px 30px',
          textAlign: 'center',
          backgroundColor: isSuccess ? '#ecfdf5' : '#fffbeb',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {isSuccess ? (
            <>
              <FiCheckCircle style={{ fontSize: '4.5rem', color: '#10b981', marginBottom: 16 }} />
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#065f46' }}>Preinscripción Completada</h2>
              <p style={{ margin: '8px 0 0', color: '#047857', fontSize: '0.95rem', fontWeight: 500 }}>¡Su pago ha sido verificado con éxito! Pago confirmado correctamente.</p>
            </>
          ) : (
            <>
              <FiAlertTriangle style={{ fontSize: '4.5rem', color: '#f59e0b', marginBottom: 16 }} />
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#78350f' }}>Pago Pendiente / Fallido</h2>
              <p style={{ margin: '8px 0 0', color: '#b45309', fontSize: '0.95rem', fontWeight: 500 }}>El pago aún no se encuentra confirmado en el sistema. Pago pendiente de confirmación.</p>
            </>
          )}
        </div>

        {/* Content body */}
        <div style={{ padding: '30px 24px' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: 20, fontSize: '0.9rem' }}>
              ⚠️ {error}
            </div>
          )}

          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Resumen del Postulante
          </h3>

          <div style={{ display: 'grid', gap: '14px', marginBottom: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Nombres completo</span>
              <strong style={{ color: '#0f172a', fontSize: '0.9rem', textAlign: 'right' }}>
                {status ? `${status.nombres} ${status.apellidos}` : '—'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Cédula de Identidad (CI)</span>
              <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{status ? status.ci : '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Correo electrónico</span>
              <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{status ? status.email : '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Método de pago</span>
              <strong style={{ color: '#0f172a', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                {status?.pago_metodo || gateway || '—'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Monto Transaccionado</span>
              <strong style={{ fontSize: '0.9rem', color: isSuccess ? '#10b981' : '#0f172a' }}>
                {status?.pago_monto ? `${status.pago_monto} ${status.pago_moneda || 'BOB'}` : '—'}
              </strong>
            </div>
            {status?.pago_referencia && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Referencia</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px', whiteSpace: 'nowrap' }}>
                  {status.pago_referencia}
                </span>
              </div>
            )}
          </div>

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            color: '#475569',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <FiInfo style={{ color: '#3b82f6', fontSize: '1.1rem', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Información importante:</strong><br />
                {isSuccess ? (
                  'Su cuenta de acceso al preuniversitario será creada por el administrador pasadas las 24 horas. Su usuario será su correo y su contraseña será su CI.'
                ) : (
                  'Si ya realizó la transacción pero el estado sigue figurando como pendiente, el banco podría demorar unos minutos en confirmar la transferencia asíncrona. Puede consultar el estado más tarde.'
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="no-print" style={{ display: 'flex', gap: '12px' }}>
            {isSuccess ? (
              <>
                <button
                  onClick={handlePrint}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <FiPrinter /> Imprimir Comprobante
                </button>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1e3a8a',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#172554'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = '#1e3a8a'}
                >
                  Finalizar <FiArrowRight />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate(`/preinscripcion?pago_pendiente=true&id=${postulanteId}`)}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#c2410c'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#ea580c'}
              >
                Volver a Intentar Pago
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
