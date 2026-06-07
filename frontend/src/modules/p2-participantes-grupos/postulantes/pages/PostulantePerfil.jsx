import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import { getPostulante, updatePostulante } from '../services/postulanteService'
import { getPostulanteCoordinador, updatePostulanteCoordinador, patchRequisitosCoordinador } from '@/modules/p2-participantes-grupos/coordinador/services/coordinadorService'
import api from '@/shared/services/api'
import { QRCodeSVG } from 'qrcode.react'
import { FiArrowLeft, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiRefreshCw, FiHash } from 'react-icons/fi'

function formatFechaSolo(dateStr) {
  if (!dateStr) return '-'
  // Tomar solo la parte YYYY-MM-DD para evitar conversión de zona horaria
  const solo = String(dateStr).substring(0, 10)
  if (!solo || solo === 'null') return '-'
  const [y, m, d] = solo.split('-')
  return `${d}/${m}/${y}`
}

export default function PostulantePerfil() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actualizandoEstado, setActualizandoEstado] = useState(false)

  const isCoordinador = window.location.pathname.startsWith('/coordinador')

  useEffect(() => {
    const fetchFunc = isCoordinador ? getPostulanteCoordinador : getPostulante
    fetchFunc(id)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id, isCoordinador])

  const handleCambiarEstado = async (nuevoEstado) => {
    setActualizandoEstado(true)
    try {
      const updateFunc = isCoordinador ? updatePostulanteCoordinador : updatePostulante
      const payload = {
        nombres: data.nombres,
        apellidos: data.apellidos,
        ci: data.ci,
        email: data.email,
        celular: data.celular,
        carrera_postulada: data.carrera_postulada || data.carrera,
        estado_tramite: nuevoEstado,
        preferencia_turno: data.preferencia_turno
      }
      const res = await updateFunc(data.id, payload)
      setData(res.data)
      alert('Estado actualizado correctamente.')
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar el estado.')
    } finally {
      setActualizandoEstado(false)
    }
  }

  const handleToggleRequisitos = async (valorNuevo) => {
    try {
      if (!isCoordinador) return
      const res = await patchRequisitosCoordinador(data.id, valorNuevo)
      setData(res.data)
      alert('Requisitos actualizados correctamente.')
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar los requisitos.')
    }
  }

  const handleVerDocumento = async (tipo) => {
    try {
      const res = await api.get(`/postulantes/${id}/documento/${tipo}`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'image/png' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      alert('Error al cargar el documento. Es posible que el archivo no haya sido cargado aún o no sea válido.')
    }
  }

  if (loading) return <Layout><Loading /></Layout>
  if (!data)   return <Layout><p style={{ padding: 24 }}>Postulante no encontrado.</p></Layout>

  return (
    <Layout>
      <div className="page-header">
        <button className="btn btn-outline" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Volver
        </button>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>
          {data.nombres} {data.apellidos}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* ── Datos Personales ── */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span className="card-title"><FiUser /> Datos Personales</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {actualizandoEstado && <FiRefreshCw style={{ animation: 'spin 0.8s linear infinite', color: 'var(--primary)' }} />}
              <select
                value={data.estado_tramite || data.estado || ''}
                disabled={actualizandoEstado}
                onChange={e => handleCambiarEstado(e.target.value)}
                className="form-select"
                style={{
                  width: 'auto',
                  padding: '4px 8px',
                  height: 'auto',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <option value="PENDIENTE_PAGO">PENDIENTE_PAGO</option>
                <option value="PREINSCRITO">PREINSCRITO</option>
                <option value="INSCRITO">INSCRITO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          </div>
          <div className="comprobante-row"><label>Nombres:</label><span>{data.nombres}</span></div>
          <div className="comprobante-row"><label>Apellidos:</label><span>{data.apellidos}</span></div>
          <div className="comprobante-row"><label>CI:</label><span>{data.ci}</span></div>
          <div className="comprobante-row"><label><FiMail /> Correo:</label><span>{data.email || '-'}</span></div>
          <div className="comprobante-row"><label><FiPhone /> Teléfono:</label><span>{data.celular || '-'}</span></div>
          <div className="comprobante-row"><label><FiMapPin /> Dirección:</label><span>{data.direccion || '-'}</span></div>
          <div className="comprobante-row"><label><FiCalendar /> Nacimiento:</label><span>{formatFechaSolo(data.fecha_nacimiento)}</span></div>
          <div className="comprobante-row"><label>Carrera:</label><span>{data.carrera || data.carrera_postulada || '-'}</span></div>
          <div className="comprobante-row"><label>Ciudad:</label><span>{data.ciudad || '-'}</span></div>
          <div className="comprobante-row"><label>Unidad educativa:</label><span>{data.colegio_procedencia || '-'}</span></div>
          <div className="comprobante-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label>Turno elegido:</label>
            {isCoordinador ? (
              <select
                value={data.preferencia_turno || ''}
                onChange={async (e) => {
                  const val = e.target.value;
                  try {
                    const updateFunc = isCoordinador ? updatePostulanteCoordinador : updatePostulante;
                    const payload = {
                      nombres: data.nombres,
                      apellidos: data.apellidos,
                      ci: data.ci,
                      email: data.email,
                      celular: data.celular,
                      carrera_postulada: data.carrera_postulada || data.carrera,
                      estado_tramite: data.estado_tramite || data.estado,
                      preferencia_turno: val || null
                    }
                    const res = await updateFunc(data.id, payload);
                    setData(res.data);
                    alert('Turno preferido actualizado correctamente.');
                  } catch (err) {
                    alert(err.response?.data?.message || 'Error al actualizar el turno.');
                  }
                }}
                className="form-select"
                style={{
                  width: 'auto',
                  padding: '4px 8px',
                  height: 'auto',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <option value="">Sin definir</option>
                <option value="manana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            ) : (
              <span style={{ fontWeight: '600' }}>
                {data.preferencia_turno === 'manana' ? 'Mañana' :
                 data.preferencia_turno === 'tarde' ? 'Tarde' :
                 data.preferencia_turno === 'noche' ? 'Noche' : 'Sin definir'}
              </span>
            )}
          </div>
        </div>

        {/* Column 2 */}
        <div>
          {/* ── Información de Registro ── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title"><FiHash /> Registro e Inscripción</span>
            </div>
            <div className="comprobante-row">
              <label>Código de registro:</label>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                {data.codigo_usuario || '-'}
              </span>
            </div>
            <div className="comprobante-row">
              <label>Estado trámite:</label>
              <StatusBadge status={data.estado_tramite || data.estado} />
            </div>
            <div className="comprobante-row">
              <label>Estado pago:</label>
              <StatusBadge status={data.pago_estado} />
            </div>
            {data.pago_metodo && (
              <div className="comprobante-row">
                <label>Método de pago:</label>
                <span>{data.pago_metodo}</span>
              </div>
            )}
            {data.pago_fecha && (
              <div className="comprobante-row">
                <label>Fecha de pago:</label>
                <span>{formatFechaSolo(data.pago_fecha)}</span>
              </div>
            )}
            {data.pago_monto && (
              <div className="comprobante-row">
                <label>Monto pagado:</label>
                <span>{data.pago_monto} {data.pago_moneda}</span>
              </div>
            )}
            {data.user && (
              <div className="comprobante-row">
                <label>Cuenta de acceso:</label>
                <span style={{ color: '#065f46' }}>✔ Generada</span>
              </div>
            )}
          </div>

          {/* ── Código QR ── */}
          <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="card-header"><span className="card-title">Código QR</span></div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
              <QRCodeSVG value={data.codigo_qr || `POST-${data.id}`} size={180} />
            </div>
            <p style={{ marginTop: 12, color: 'var(--gray-500)', fontSize: '0.85rem' }}>{data.codigo_qr}</p>
          </div>

          {/* ── Documentos Adjuntos ── */}
          <div className="card">
            <div className="card-header"><span className="card-title">Documentos Adjuntos</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Carnet de Identidad:</span>
                {data.imagen_ci_path ? (
                  <button className="btn btn-outline btn-sm" onClick={() => handleVerDocumento('ci')}>Ver</button>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>No cargado</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Título de Bachiller:</span>
                {data.imagen_titulo_bachiller_path ? (
                  <button className="btn btn-outline btn-sm" onClick={() => handleVerDocumento('titulo')}>Ver</button>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>No cargado</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Fotografía:</span>
                {(data.fotografia_path || data.foto) ? (
                  <button className="btn btn-outline btn-sm" onClick={() => handleVerDocumento('foto')}>Ver</button>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>No cargada</span>
                )}
              </div>
              {isCoordinador ? (
                <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '16px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)' }}>Requisitos del Postulante:</span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      backgroundColor: (data.requisitos_completos || data.requisitos_cumplidos) ? '#d1fae5' : '#fee2e2',
                      color: (data.requisitos_completos || data.requisitos_cumplidos) ? '#065f46' : '#991b1b',
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}>
                      {(data.requisitos_completos || data.requisitos_cumplidos) ? 'Completo (Sí)' : 'Incompleto (No)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleToggleRequisitos(true)}
                      style={{
                        flex: 1,
                        backgroundColor: '#10b981',
                        borderColor: '#10b981',
                        color: '#fff',
                        fontSize: '0.82rem',
                        padding: '8px 12px',
                        opacity: (data.requisitos_completos || data.requisitos_cumplidos) ? 0.6 : 1
                      }}
                    >
                      Marcar requisitos completos
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleToggleRequisitos(false)}
                      style={{
                        flex: 1,
                        color: '#ef4444',
                        borderColor: '#fca5a5',
                        fontSize: '0.82rem',
                        padding: '8px 12px',
                        opacity: !(data.requisitos_completos || data.requisitos_cumplidos) ? 0.6 : 1
                      }}
                    >
                      Marcar requisitos incompletos
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '16px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)' }}>Requisitos del Postulante:</span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      backgroundColor: (data.requisitos_completos || data.requisitos_cumplidos) ? '#d1fae5' : '#fee2e2',
                      color: (data.requisitos_completos || data.requisitos_cumplidos) ? '#065f46' : '#991b1b',
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}>
                      {(data.requisitos_completos || data.requisitos_cumplidos) ? 'Completo (Sí)' : 'Incompleto (No)'}
                    </span>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                    (Los requisitos solo pueden ser validados por el Coordinador)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Grupos Asignados ── */}
      {data.grupos && data.grupos.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <span className="card-title">Grupos Asignados</span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Materia</th>
                  <th>Docente</th>
                  <th>Aula</th>
                  <th>Horario</th>
                </tr>
              </thead>
              <tbody>
                {data.grupos.map(g => (
                  <tr key={g.id}>
                    <td>{g.nombre_grupo}</td>
                    <td>{g.materia?.nombre || '-'}</td>
                    <td>{g.docente ? `${g.docente.nombres} ${g.docente.apellidos}` : '-'}</td>
                    <td>{g.aula || '-'}</td>
                    <td>{g.horario || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Notas ── */}
      {data.examenes && data.examenes.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <span className="card-title">Notas</span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Nota 1</th>
                  <th>Nota 2</th>
                  <th>Nota 3</th>
                  <th>Promedio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.examenes.map(ex => (
                  <tr key={ex.id}>
                    <td>{ex.materia?.nombre || '-'}</td>
                    <td>{ex.nota_1 ?? '-'}</td>
                    <td>{ex.nota_2 ?? '-'}</td>
                    <td>{ex.nota_3 ?? '-'}</td>
                    <td><strong>{ex.promedio ?? '-'}</strong></td>
                    <td><StatusBadge status={ex.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}
