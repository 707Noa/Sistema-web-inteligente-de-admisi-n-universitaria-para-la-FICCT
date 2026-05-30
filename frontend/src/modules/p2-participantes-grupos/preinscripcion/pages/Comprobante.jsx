import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPreinscripcion } from '@/modules/p4-reportes-monitoreo-auditoria/reportes/services/reporteService'
import { QRCodeSVG } from 'qrcode.react'
import Loading from '@/shared/components/Loading'
import { FiDownload, FiPrinter, FiArrowLeft } from 'react-icons/fi'

export default function Comprobante() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef()

  useEffect(() => {
    getPreinscripcion(id).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const handlePrint = () => {
    const content = printRef.current
    const win = window.open('', '', 'width=800,height=600')
    win.document.write('<html><head><title>Comprobante</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}td{padding:6px 8px;border-bottom:1px dashed #ddd}.header{background:#1a3a6b;color:white;padding:20px;text-align:center}.footer{background:#fef3c7;padding:12px;text-align:center;font-size:14px}</style></head><body>')
    win.document.write(content.innerHTML)
    win.document.write('</body></html>')
    win.document.close()
    win.print()
  }

  if (loading) return <Loading />
  if (!data) return <div style={{ textAlign: 'center', padding: 60 }}>No se encontró la preinscripción.</div>

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <Link to="/preinscripcion" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FiArrowLeft /> Nueva preinscripción
          </Link>
        </div>

        <div className="comprobante" ref={printRef}>
          <div className="comprobante-header">
            <h1>🎓 Comprobante de Preinscripción</h1>
            <p>Cursos Preuniversitarios — CUP-FICCT</p>
          </div>

          <div className="comprobante-body">
            <div className="comprobante-row"><label>N° Formulario:</label><strong>{data.numero_formulario}</strong></div>
            <div className="comprobante-row"><label>Fecha:</label><span>{new Date(data.created_at).toLocaleString('es-BO')}</span></div>
            <div className="comprobante-row"><label>Nombres:</label><span>{data.nombres}</span></div>
            <div className="comprobante-row"><label>Apellidos:</label><span>{data.apellidos}</span></div>
            <div className="comprobante-row"><label>CI:</label><span>{data.ci}</span></div>
            <div className="comprobante-row"><label>Correo:</label><span>{data.email}</span></div>
            <div className="comprobante-row"><label>Teléfono:</label><span>{data.celular || '-'}</span></div>
            {data.unidad_educativa && <div className="comprobante-row"><label>Unidad Educativa:</label><span>{data.unidad_educativa}</span></div>}
            <div className="comprobante-row"><label>Carrera(s):</label>
              <span>{(data.carreras || []).map(c => c.nombre).join(', ') || '-'}</span>
            </div>
            <div className="comprobante-row"><label>Declaración Jurada:</label><span>{data.declaracion_jurada ? '✅ Aceptada' : '❌ No aceptada'}</span></div>

            <div className="comprobante-qr">
              <QRCodeSVG value={data.codigo_qr || data.numero_formulario} size={140} />
              <p style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--gray-500)' }}>{data.codigo_qr}</p>
            </div>
          </div>

          <div className="comprobante-footer">
            <strong>IMPORTANTE:</strong> Usted debe realizar el pago de matrícula correspondiente y presentar los requisitos solicitados en la unidad correspondiente.<br />
            <strong>EL TRÁMITE ES PERSONAL</strong>
          </div>
        </div>

        <div className="comprobante-actions">
          <button className="btn btn-primary" onClick={handlePrint}><FiPrinter /> Imprimir</button>
          <button className="btn btn-outline" onClick={handlePrint}><FiDownload /> Descargar PDF</button>
        </div>
      </div>
    </div>
  )
}
