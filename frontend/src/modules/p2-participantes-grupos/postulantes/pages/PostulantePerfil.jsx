import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@/layouts/Layout'
import StatusBadge from '@/shared/components/StatusBadge'
import Loading from '@/shared/components/Loading'
import { getPostulante } from '../services/postulanteService'
import {
  FiArrowLeft, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiHash,
} from 'react-icons/fi'

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

  useEffect(() => {
    getPostulante(id)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

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
          <div className="card-header">
            <span className="card-title"><FiUser /> Datos Personales</span>
            <StatusBadge status={data.estado_tramite || data.estado} />
          </div>
          <div className="comprobante-row"><label>Nombres:</label><span>{data.nombres}</span></div>
          <div className="comprobante-row"><label>Apellidos:</label><span>{data.apellidos}</span></div>
          <div className="comprobante-row"><label>CI:</label><span>{data.ci}</span></div>
          <div className="comprobante-row">
            <label><FiMail /> Correo:</label>
            <span>{data.email || '-'}</span>
          </div>
          <div className="comprobante-row">
            <label><FiPhone /> Teléfono:</label>
            <span>{data.celular || '-'}</span>
          </div>
          <div className="comprobante-row">
            <label><FiMapPin /> Dirección:</label>
            <span>{data.direccion || '-'}</span>
          </div>
          <div className="comprobante-row">
            <label><FiCalendar /> Nacimiento:</label>
            <span>{formatFechaSolo(data.fecha_nacimiento)}</span>
          </div>
          <div className="comprobante-row">
            <label>Carrera:</label>
            <span>{data.carrera || data.carrera_postulada || '-'}</span>
          </div>
          <div className="comprobante-row">
            <label>Ciudad:</label>
            <span>{data.ciudad || '-'}</span>
          </div>
          <div className="comprobante-row">
            <label>Unidad educativa:</label>
            <span>{data.colegio_procedencia || '-'}</span>
          </div>
        </div>

        {/* ── Información de Registro ── */}
        <div className="card">
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
            <StatusBadge status={data.estado_tramite} />
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
