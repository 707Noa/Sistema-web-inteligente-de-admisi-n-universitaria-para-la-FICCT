import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCarrerasDisponibles } from '@/modules/p4-reportes-monitoreo-auditoria/reportes/services/reporteService'
import { registrarPreinscripcion } from '@/modules/p2-participantes-grupos/postulantes/services/preinscripcionService'
import { FiUser, FiBookOpen, FiCheckSquare, FiSend, FiArrowLeft } from 'react-icons/fi'

export default function PreinscripcionForm() {
  const navigate = useNavigate()
  const [carreras, setCarreras] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [registroCompletado, setRegistroCompletado] = useState(false)
  const [form, setForm] = useState({
    nombres: '', apellidos: '', ci: '', genero: '', fecha_nacimiento: '',
    celular: '', segundo_celular: '', email: '', direccion: '',
    unidad_educativa: '', tipo_colegio: '', turno: '', provincia: '', anio_egreso: '',
    primera_opcion_carrera: '', segunda_opcion_carrera: '',
    declaracion_jurada: false,
  })

  useEffect(() => {
    getCarrerasDisponibles().then(r => setCarreras(r.data)).catch(() => {})
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleOptionChange = (optionName, carreraNombre) => {
    setError('')
    if (optionName === 'primera_opcion_carrera') {
      if (carreraNombre === form.segunda_opcion_carrera) {
        setForm(prev => ({ ...prev, primera_opcion_carrera: carreraNombre, segunda_opcion_carrera: '' }))
      } else {
        setForm(prev => ({ ...prev, primera_opcion_carrera: carreraNombre }))
      }
    } else if (optionName === 'segunda_opcion_carrera') {
      if (carreraNombre === form.primera_opcion_carrera) {
        setError('La segunda opción debe ser diferente a la primera.')
      } else {
        setForm(prev => ({ ...prev, segunda_opcion_carrera: carreraNombre }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.nombres || !form.apellidos || !form.ci || !form.email) {
      setError('Completa todos los campos obligatorios.'); return
    }
    if (!form.primera_opcion_carrera) {
      setError('Selecciona tu primera opción de carrera.'); return
    }
    if (!form.segunda_opcion_carrera) {
      setError('Selecciona tu segunda opción de carrera.'); return
    }
    if (form.primera_opcion_carrera === form.segunda_opcion_carrera) {
      setError('La segunda opción debe ser diferente a la primera.'); return
    }
    if (!form.declaracion_jurada) {
      setError('Debes aceptar la declaración jurada.'); return
    }

    setLoading(true)
    try {
      const payload = {
        nombres: form.nombres,
        apellidos: form.apellidos,
        ci: form.ci,
        sexo: form.genero,
        fecha_nacimiento: form.fecha_nacimiento,
        telefono: form.celular,
        segundo_telefono: form.segundo_celular,
        correo_electronico: form.email,
        direccion: form.direccion,
        colegio_procedencia: form.unidad_educativa,
        ciudad: form.provincia,
        carrera: form.primera_opcion_carrera,
        primera_opcion_carrera: form.primera_opcion_carrera,
        segunda_opcion_carrera: form.segunda_opcion_carrera,
        titulo_bachiller: true,
        otros: `Primera opción: ${form.primera_opcion_carrera}, Segunda opción: ${form.segunda_opcion_carrera}. Tipo: ${form.tipo_colegio || ''}, Turno: ${form.turno || ''}, Egreso: ${form.anio_egreso || ''}`,
      };

      await registrarPreinscripcion(payload)
      setSuccess('Registro exitoso. Su cuenta será enviada a su correo electrónico.')
      setRegistroCompletado(true)
      
      // Limpiar formulario solo después de registro exitoso
      setForm({
        nombres: '', apellidos: '', ci: '', genero: '', fecha_nacimiento: '',
        celular: '', segundo_celular: '', email: '', direccion: '',
        unidad_educativa: '', tipo_colegio: '', turno: '', provincia: '', anio_egreso: '',
        primera_opcion_carrera: '', segunda_opcion_carrera: '',
        declaracion_jurada: false,
      })

      setTimeout(() => {
        navigate('/')
      }, 2500)
    } catch (err) {
      setRegistroCompletado(false)
      if (err.response?.data?.errors?.ci) {
        setError('El CI ya fue registrado.')
      } else {
        setError(err.response?.data?.message || 'Error al enviar preinscripción.')
      }
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

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {error && <div className="login-alert" style={{ marginBottom: 16 }}>{error}</div>}
        {success && (
          <div className="login-alert success" style={{ marginBottom: 16, backgroundColor: '#d1e7dd', color: '#0f5132', borderColor: '#badbcc', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {success}
          </div>
        )}
      </div>

      {!registroCompletado && (
        <form className="preinscripcion-form" onSubmit={handleSubmit}>

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
          <style>{`
            .carreras-options-layout {
              display: grid;
              grid-template-columns: 1fr;
              gap: 24px;
            }
            @media (min-width: 992px) {
              .carreras-options-layout {
                grid-template-columns: 1fr 1fr;
              }
            }
            .carrera-card {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 12px;
              border-radius: var(--radius);
              cursor: pointer;
              transition: var(--transition);
            }
            .carrera-card input[type="radio"] {
              width: 18px;
              height: 18px;
              accent-color: var(--primary);
              cursor: pointer;
            }
          `}</style>
          <div className="preinscripcion-section-title"><FiCheckSquare /> 3. Carrera(s) a Postular *</div>
          
          <div className="carreras-options-layout">
            <div className="opcion-columna">
              <h3 style={{ fontSize: '1.05rem', color: 'var(--gray-700)', marginBottom: '12px', fontWeight: '700' }}>Primera opción</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {carreras.map((c) => (
                  <label key={`primera-${c.id}`} className="carrera-card" style={{ border: `2px solid ${form.primera_opcion_carrera === c.nombre ? 'var(--primary)' : 'var(--gray-200)'}` }}>
                    <input type="radio" name="primera_opcion_carrera" checked={form.primera_opcion_carrera === c.nombre} onChange={() => handleOptionChange('primera_opcion_carrera', c.nombre)} />
                    <div><strong>{c.nombre}</strong><br /><small style={{ color: 'var(--gray-500)' }}>Código: {c.codigo} | Plan: {c.plan} | {c.modalidad}</small></div>
                  </label>
                ))}
              </div>
            </div>

            <div className="opcion-columna">
              <h3 style={{ fontSize: '1.05rem', color: 'var(--gray-700)', marginBottom: '12px', fontWeight: '700' }}>Segunda opción</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {carreras.map((c) => (
                  <label key={`segunda-${c.id}`} className="carrera-card" style={{ border: `2px solid ${form.segunda_opcion_carrera === c.nombre ? 'var(--primary)' : 'var(--gray-200)'}` }}>
                    <input type="radio" name="segunda_opcion_carrera" checked={form.segunda_opcion_carrera === c.nombre} onChange={() => handleOptionChange('segunda_opcion_carrera', c.nombre)} />
                    <div><strong>{c.nombre}</strong><br /><small style={{ color: 'var(--gray-500)' }}>Código: {c.codigo} | Plan: {c.plan} | {c.modalidad}</small></div>
                  </label>
                ))}
              </div>
            </div>
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
      )}
    </div>
  )
}
