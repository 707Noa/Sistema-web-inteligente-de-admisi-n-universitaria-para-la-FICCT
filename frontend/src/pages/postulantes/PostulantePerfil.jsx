import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import Loading from '../../components/Loading'
import { getPostulante } from '../../services/postulanteService'
import { QRCodeSVG } from 'qrcode.react'
import { FiArrowLeft, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar } from 'react-icons/fi'

export default function PostulantePerfil() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { getPostulante(id).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false)) }, [id])

  if (loading) return <Layout><Loading /></Layout>
  if (!data) return <Layout><p>No encontrado</p></Layout>

  return (
    <Layout>
      <div className="page-header">
        <button className="btn btn-outline" onClick={() => navigate(-1)}><FiArrowLeft /> Volver</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <div className="card-header"><span className="card-title"><FiUser /> Datos Personales</span><StatusBadge status={data.estado} /></div>
          <div className="comprobante-row"><label>Nombres:</label><span>{data.nombres}</span></div>
          <div className="comprobante-row"><label>Apellidos:</label><span>{data.apellidos}</span></div>
          <div className="comprobante-row"><label>CI:</label><span>{data.ci}</span></div>
          <div className="comprobante-row"><label><FiMail /> Email:</label><span>{data.email || '-'}</span></div>
          <div className="comprobante-row"><label><FiPhone /> Celular:</label><span>{data.celular || '-'}</span></div>
          <div className="comprobante-row"><label><FiMapPin /> Dirección:</label><span>{data.direccion || '-'}</span></div>
          <div className="comprobante-row"><label><FiCalendar /> Nacimiento:</label><span>{data.fecha_nacimiento || '-'}</span></div>
          <div className="comprobante-row"><label>Carrera:</label><span>{data.carrera_postulada || '-'}</span></div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-header"><span className="card-title">Código QR</span></div>
          <QRCodeSVG value={data.codigo_qr || `POST-${data.id}`} size={180} />
          <p style={{ marginTop: 12, color: 'var(--gray-500)', fontSize: '0.85rem' }}>{data.codigo_qr}</p>
        </div>
      </div>

      {data.grupos && data.grupos.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header"><span className="card-title">Grupos Asignados</span></div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Grupo</th><th>Materia</th><th>Docente</th><th>Aula</th><th>Horario</th></tr></thead>
              <tbody>
                {data.grupos.map(g => (
                  <tr key={g.id}><td>{g.nombre_grupo}</td><td>{g.materia?.nombre || '-'}</td><td>{g.docente ? `${g.docente.nombres} ${g.docente.apellidos}` : '-'}</td><td>{g.aula || '-'}</td><td>{g.horario || '-'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.examenes && data.examenes.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header"><span className="card-title">Notas</span></div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Materia</th><th>Nota 1</th><th>Nota 2</th><th>Nota 3</th><th>Promedio</th><th>Estado</th></tr></thead>
              <tbody>
                {data.examenes.map(ex => (
                  <tr key={ex.id}><td>{ex.materia?.nombre || '-'}</td><td>{ex.nota_1 ?? '-'}</td><td>{ex.nota_2 ?? '-'}</td><td>{ex.nota_3 ?? '-'}</td><td><strong>{ex.promedio ?? '-'}</strong></td><td><StatusBadge status={ex.estado} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}
