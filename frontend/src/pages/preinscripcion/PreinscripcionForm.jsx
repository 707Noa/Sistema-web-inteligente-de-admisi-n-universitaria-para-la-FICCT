import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearPreinscripcion, getCarrerasDisponibles } from '../../services/reporteService'
import { FiUser, FiBookOpen, FiCheckSquare, FiSend, FiArrowLeft } from 'react-icons/fi'

export default function PreinscripcionForm() {
  const navigate = useNavigate()
  const [carreras, setCarreras] = useState([])
  const [selectedCarreras, setSelectedCarreras] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nombres: '', apellidos: '', ci: '', genero: '', fecha_nacimiento: '',
    celular: '', segundo_celular: '', email: '', direccion: '',
    unidad_educativa: '', tipo_colegio: '', turno: '', provincia: '', anio_egreso: '',
    declaracion_jurada: false,
  })

  useEffect(() => {
    getCarrerasDisponibles().then(r => setCarreras(r.data)).catch(() => {})
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const toggleCarrera = (id) => {
    setSelectedCarreras(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.nombres || !form.apellidos || !form.ci || !form.email) {
      setError('Completa todos los campos obligatorios.'); return
    }
    if (selectedCarreras.length === 0) { setError('Selecciona al menos una carrera.'); return }
    if (!form.declaracion_jurada) { setError('Debes aceptar la declaración jurada.'); return }

    setLoading(true)
    try {
      const res = await crearPreinscripcion({ ...form, carreras: selectedCarreras })
      navigate(`/preinscripcion/comprobante/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar preinscripción.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="preinscripcion-page">
      <div className="preinscripcion-header">
        <div style={{ marginBottom: 12 }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.8)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
            <FiArrowLeft /> Volver al portal
          </a>
        </div>
        <h1>📋 Formulario de Preinscripción</h1>
        <p>Cursos Preuniversitarios — Gestión 2026</p>
      </div>

      <form className="preinscripcion-form" onSubmit={handleSubmit}>
        {error && <div className="login-alert" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="preinscripcion-section">
          <div className="preinscripcion-section-title"><FiUser /> 1. Datos Personales</div>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Nombres *</label><input className="form-input" name="nombres" value={form.nombres} onChange={handleChange} required /></div>
            <div className="form-group"><label className="form-label">Apellidos *</label><input className="form-input" name="apellidos" value={form.apellidos} onChange={handleChange} required /></div>
            <div className="form-group"><label className="form-label">CI *</label><input className="form-input" name="ci" value={form.ci} onChange={handleChange} required /></div>
            <div className="form-group"><label className="form-label">Género</label>
              <select className="form-select" name="genero" value={form.genero} onChange={handleChange}>
                <option value="">Seleccionar</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option><option value="otro">Otro</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Fecha de nacimiento</label><input className="form-input" name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} /></div>
            <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" name="celular" value={form.celular} onChange={handleChange} /></div>
            <div className="form-group"><label className="form-label">Segundo teléfono</label><input className="form-input" name="segundo_celular" value={form.segundo_celular} onChange={handleChange} /></div>
            <div className="form-group"><label className="form-label">Correo electrónico *</label><input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} required /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Dirección</label><input className="form-input" name="direccion" value={form.direccion} onChange={handleChange} /></div>
          </div>
        </div>

        <div className="preinscripcion-section">
          <div className="preinscripcion-section-title"><FiBookOpen /> 2. Datos de la Unidad Educativa</div>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Unidad educativa</label><input className="form-input" name="unidad_educativa" value={form.unidad_educativa} onChange={handleChange} /></div>
            <div className="form-group"><label className="form-label">Tipo de colegio</label>
              <select className="form-select" name="tipo_colegio" value={form.tipo_colegio} onChange={handleChange}>
                <option value="">Seleccionar</option><option value="fiscal">Fiscal</option><option value="particular">Particular</option><option value="convenio">Convenio</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Turno</label>
              <select className="form-select" name="turno" value={form.turno} onChange={handleChange}>
                <option value="">Seleccionar</option><option value="mañana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Provincia</label><input className="form-input" name="provincia" value={form.provincia} onChange={handleChange} /></div>
            <div className="form-group"><label className="form-label">Año de egreso</label><input className="form-input" name="anio_egreso" value={form.anio_egreso} onChange={handleChange} placeholder="2026" /></div>
          </div>
        </div>

        <div className="preinscripcion-section">
          <div className="preinscripcion-section-title"><FiCheckSquare /> 3. Carrera(s) a Postular *</div>
          <div className="form-grid">
            {carreras.map((c) => (
              <label key={c.id} className="checkbox-group" style={{ padding: '12px', border: `2px solid ${selectedCarreras.includes(c.id) ? 'var(--primary)' : 'var(--gray-200)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'var(--transition)' }}>
                <input type="checkbox" checked={selectedCarreras.includes(c.id)} onChange={() => toggleCarrera(c.id)} />
                <div><strong>{c.nombre}</strong><br /><small style={{ color: 'var(--gray-500)' }}>Código: {c.codigo} | Plan: {c.plan} | {c.modalidad}</small></div>
              </label>
            ))}
          </div>
        </div>

        <div className="preinscripcion-section">
          <div className="preinscripcion-section-title">4. Declaración Jurada *</div>
          <label className="checkbox-group">
            <input type="checkbox" name="declaracion_jurada" checked={form.declaracion_jurada} onChange={handleChange} />
            <span>Declaro que los datos ingresados son correctos y acepto las normas y reglamentos del proceso de admisión.</span>
          </label>
        </div>

        <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading} style={{ marginBottom: 40 }}>
          {loading ? 'Enviando...' : <><FiSend /> Enviar preinscripción</>}
        </button>
      </form>
    </div>
  )
}
