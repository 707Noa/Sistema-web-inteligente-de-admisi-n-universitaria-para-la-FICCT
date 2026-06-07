import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCarrerasDisponibles } from '@/modules/p4-reportes-monitoreo-auditoria/reportes/services/reporteService'
import {
  registrarPreinscripcion,
  generarStripeCheckout,
  preinscripcionStripeCheckout,
  crearPaypalOrder,
  capturarPaypalPago,
  simularPagoPostulante,
  cancelarPreinscripcion
} from '@/modules/p2-participantes-grupos/postulantes/services/preinscripcionService'
import {
  FiUser,
  FiBookOpen,
  FiCheckSquare,
  FiSend,
  FiArrowLeft,
  FiArrowRight,
  FiFileText,
  FiImage,
  FiCreditCard,
  FiLoader,
  FiCheck,
  FiLock,
  FiUpload
} from 'react-icons/fi'

export default function PreinscripcionForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Stepper state (1: Datos, 2: Documentos, 3: Pago)
  const [step, setStep] = useState(1)
  
  // Postulante ID retrieved after completing Step 2
  const [postulanteId, setPostulanteId] = useState(null)
  
  const [carreras, setCarreras] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form states
  const [form, setForm] = useState({
    nombres: '', apellidos: '', ci: '', genero: '', fecha_nacimiento: '',
    celular: '', segundo_celular: '', email: '', direccion: '',
    unidad_educativa: '', tipo_colegio: '', turno: '', provincia: '', anio_egreso: '',
    primera_opcion_carrera: '', segunda_opcion_carrera: '',
    preferencia_turno: '',
    declaracion_jurada: false,
  })

  // File uploads state
  const [imagenCi, setImagenCi] = useState(null)
  const [imagenCiPreview, setImagenCiPreview] = useState(null)
  
  const [imagenTituloBachiller, setImagenTituloBachiller] = useState(null)
  const [imagenTituloBachillerPreview, setImagenTituloBachillerPreview] = useState(null)

  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)

  // Payment states
  const [paymentGateway, setPaymentGateway] = useState('stripe') // stripe or paypal
  const [paypalOrderId, setPaypalOrderId] = useState(null)
  const [paypalLoading, setPaypalLoading] = useState(false)

  // Simulation states
  const [tarjetaForm, setTarjetaForm] = useState({
    numeroTarjeta: '',
    fechaVencimiento: '',
    cvv: '',
    titular: ''
  })
  const [correoPaypal, setCorreoPaypal] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    getCarrerasDisponibles().then(r => setCarreras(r.data)).catch(() => {})

    // Check if we have a saved ID in URL to resume the payment step directly
    const savedId = searchParams.get('id')
    const isCanceled = searchParams.get('cancelado')
    const isPending = searchParams.get('pago_pendiente')

    if (savedId) {
      setPostulanteId(parseInt(savedId))
      setStep(3)
      if (isCanceled) {
        setError('El proceso de pago fue cancelado. Por favor intente nuevamente.')
      } else if (isPending) {
        setError('Su pago sigue en verificación o pendiente. Por favor intente realizar el pago nuevamente.')
      }
    }
  }, [searchParams])

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

  // Handle Step 1 Submit (Client-Side Validation Only)
  const handleNextToStep2 = (e) => {
    e.preventDefault()
    setError('')

    if (!form.nombres || !form.apellidos || !form.ci || !form.email || !form.preferencia_turno) {
      setError('Por favor complete todos los campos obligatorios (*).'); return
    }
    const emailRegexStep1 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegexStep1.test(form.email)) {
      setError('El formato del correo electrónico no es válido.'); return
    }
    if (!form.primera_opcion_carrera) {
      setError('Seleccione su primera opción de carrera.'); return
    }
    if (!form.segunda_opcion_carrera) {
      setError('Seleccione su segunda opción de carrera.'); return
    }
    if (form.primera_opcion_carrera === form.segunda_opcion_carrera) {
      setError('La segunda opción de carrera debe ser diferente a la primera.'); return
    }
    if (!form.declaracion_jurada) {
      setError('Debe aceptar la declaración jurada.'); return
    }

    setStep(2)
  }

  // File Upload Handlers
  const handleCiChange = (e) => {
    setError('')
    const file = e.target.files[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp']
    if (!allowedExts.includes(ext)) {
      setError('El CI debe estar en formato JPG, JPEG, PNG o WEBP.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen del CI supera el límite de 5 MB.')
      return
    }

    setImagenCi(file)
    setImagenCiPreview(URL.createObjectURL(file))
  }

  const handleTituloChange = (e) => {
    setError('')
    const file = e.target.files[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp']
    if (!allowedExts.includes(ext)) {
      setError('El título debe estar en formato JPG, JPEG, PNG o WEBP.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen del Título de Bachiller supera el límite de 5 MB.')
      return
    }

    setImagenTituloBachiller(file)
    setImagenTituloBachillerPreview(URL.createObjectURL(file))
  }

  const handleFotoChange = (e) => {
    setError('')
    const file = e.target.files[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp']
    if (!allowedExts.includes(ext)) {
      setError('La fotografía debe estar en formato JPG, JPEG, PNG o WEBP.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La fotografía supera el límite de 5 MB.')
      return
    }

    setFoto(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  // Submit Step 2 (Multipart Form Upload & Save Postulante)
  const handleRegisterAndGoToPayment = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!imagenCi) {
      setError('La imagen del CI es obligatoria.')
      return
    }

    if (!imagenTituloBachiller) {
      setError('La imagen del Título de Bachiller es obligatoria.')
      return
    }

    if (!foto) {
      setError('La fotografía del postulante es obligatoria.')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('nombres', form.nombres)
      formData.append('apellidos', form.apellidos)
      formData.append('ci', form.ci)
      formData.append('sexo', form.genero)
      formData.append('fecha_nacimiento', form.fecha_nacimiento)
      formData.append('telefono', form.celular)
      formData.append('segundo_telefono', form.segundo_celular)
      formData.append('correo_electronico', form.email)
      formData.append('direccion', form.direccion)
      formData.append('colegio_procedencia', form.unidad_educativa)
      formData.append('ciudad', form.provincia)
      formData.append('carrera', form.primera_opcion_carrera)
      formData.append('primera_opcion_carrera', form.primera_opcion_carrera)
      formData.append('segunda_opcion_carrera', form.segunda_opcion_carrera)
      formData.append('preferencia_turno', form.preferencia_turno)
      formData.append('titulo_bachiller', '1') // default flag
      formData.append('otros', `Primera opción: ${form.primera_opcion_carrera}, Segunda opción: ${form.segunda_opcion_carrera}. Tipo: ${form.tipo_colegio || ''}, Turno: ${form.turno || ''}, Egreso: ${form.anio_egreso || ''}`)

      // Append files
      formData.append('imagen_ci', imagenCi)
      formData.append('imagen_titulo_bachiller', imagenTituloBachiller)
      formData.append('fotografia', foto)

      const res = await registrarPreinscripcion(formData)
      setPostulanteId(res.data.data.id)
      setSuccess('Documentos y datos registrados correctamente.')
      
      setTimeout(() => {
        setSuccess('')
        setStep(3)
      }, 1500)
    } catch (err) {
      console.log('Error del backend:', err.response?.data)
      const errs = err.response?.data?.errors || {}

      // Errores de datos duplicados: volver al Step 1 para que el usuario los corrija
      const dataDuplicateFields = {
        ci: 'El CI ya está registrado.',
        correo_electronico: 'El correo electrónico ya está registrado.',
        telefono: 'El teléfono ya está registrado.',
      }
      const duplicateMessages = Object.entries(dataDuplicateFields)
        .filter(([field]) => errs[field])
        .map(([, msg]) => msg)

      if (duplicateMessages.length > 0) {
        setError(duplicateMessages.join(' '))
        // Volver al Step 1 para que corrija los datos duplicados
        setStep(1)
      } else {
        setError(err.response?.data?.message || 'Error al guardar sus datos y documentos.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Step 3 Payment Handler: Simulated Card Payment (PAGADO)
  const handleTarjetaPaySimulated = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setSuccess('')

    if (!tarjetaForm.numeroTarjeta) {
      setError('El número de tarjeta es obligatorio.'); return
    }
    if (!tarjetaForm.fechaVencimiento) {
      setError('La fecha de vencimiento es obligatoria.'); return
    }
    if (!tarjetaForm.cvv) {
      setError('El código de seguridad (CVV) es obligatorio.'); return
    }
    if (!tarjetaForm.titular) {
      setError('El nombre del titular es obligatorio.'); return
    }

    setLoading(true)
    try {
      const res = await simularPagoPostulante(postulanteId, 'PAGADO', 'TARJETA')
      setSuccess('¡Pago simulado con tarjeta exitoso!')
      setTimeout(() => {
        navigate(`/preinscripcion/pago-confirmado?gateway=stripe&session_id=${res.data.data.pago_referencia}&postulante_id=${postulanteId}`)
      }, 1500)
    } catch (err) {
      setError('Error al procesar la simulación de pago con tarjeta.')
    } finally {
      setLoading(false)
    }
  }

  // Step 3 Payment Handler: Simulated Card Cancel (CANCELADO)
  const handleTarjetaCancelSimulated = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await simularPagoPostulante(postulanteId, 'CANCELADO', 'TARJETA')
      setError('El pago fue cancelado. Redirigiendo...')
      setTimeout(() => {
        navigate(`/preinscripcion?cancelado=true&id=${postulanteId}`)
      }, 1500)
    } catch (err) {
      setError('Error al registrar la cancelación de pago.')
    } finally {
      setLoading(false)
    }
  }

  // Step 3 Payment Handler: Simulated Card Fail (FALLIDO)
  const handleTarjetaFailSimulated = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await simularPagoPostulante(postulanteId, 'FALLIDO', 'TARJETA')
      setError('El pago con tarjeta simulado ha fallado. Intente con otra tarjeta.')
    } catch (err) {
      setError('Error al registrar el fallo del pago.')
    } finally {
      setLoading(false)
    }
  }

  // Step 3 Payment Handler: Simulated PayPal Payment (PAGADO)
  const handlePaypalPaySimulated = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setSuccess('')

    if (!correoPaypal) {
      setError('El correo de PayPal de prueba es obligatorio.'); return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(correoPaypal)) {
      setError('Ingrese un formato de correo electrónico válido.'); return
    }

    setLoading(true)
    try {
      const res = await simularPagoPostulante(postulanteId, 'PAGADO', 'PAYPAL')
      setSuccess('¡Pago simulado con PayPal aprobado con éxito!')
      setTimeout(() => {
        navigate(`/preinscripcion/pago-confirmado?gateway=paypal&order_id=${res.data.data.pago_referencia}&postulante_id=${postulanteId}`)
      }, 1500)
    } catch (err) {
      setError('Error al procesar la simulación de pago de PayPal.')
    } finally {
      setLoading(false)
    }
  }

  // Step 3 Payment Handler: Simulated PayPal Cancel (CANCELADO)
  const handlePaypalCancelSimulated = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await simularPagoPostulante(postulanteId, 'CANCELADO', 'PAYPAL')
      setError('El pago de PayPal fue cancelado. Redirigiendo...')
      setTimeout(() => {
        navigate(`/preinscripcion?cancelado=true&id=${postulanteId}`)
      }, 1500)
    } catch (err) {
      setError('Error al registrar la cancelación de pago.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCancelModal = () => {
    setShowCancelModal(true)
  }

  const handleCloseCancelModal = () => {
    setShowCancelModal(false)
  }

  const handleConfirmCancel = async () => {
    const id = postulanteId || searchParams.get('id') || localStorage.getItem('postulante_id')
    const token = searchParams.get('token') || searchParams.get('cancel_token') || localStorage.getItem('cancel_token')

    if (!id) {
      setError('No se pudo encontrar el identificador de la preinscripción para cancelar.')
      return
    }

    setCanceling(true)
    setError('')
    setSuccess('')
    try {
      const res = await cancelarPreinscripcion(id, token)
      setSuccess(res.data.message || 'Preinscripción cancelada correctamente.')
      setShowCancelModal(false)
      setTimeout(() => {
        window.location.href = '/preinscripcion'
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cancelar la preinscripción.')
      setShowCancelModal(false)
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className="preinscripcion-page" style={{ paddingBottom: '60px' }}>
      <div className="preinscripcion-header">
        <div style={{ marginBottom: 12 }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.8)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
            <FiArrowLeft /> Volver al portal
          </a>
        </div>
        <h1>📋 Formulario de Preinscripción</h1>
        <p>Cursos Preuniversitarios — Gestión 2026</p>
      </div>

      {/* stepper progress indicators */}
      <div style={{ maxWidth: '800px', margin: '30px auto', display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 20px' }}>
        <div style={{ position: 'absolute', top: '50%', left: '20px', right: '20px', height: '3px', backgroundColor: '#e2e8f0', transform: 'translateY(-50%)', zIndex: 1 }}>
          <div style={{
            height: '100%',
            backgroundColor: '#1e3a8a',
            width: step === 1 ? '0%' : step === 2 ? '50%' : '100%',
            transition: 'width 0.4s ease'
          }}></div>
        </div>

        {/* Step 1 Indicator */}
        <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: step >= 1 ? '#1e3a8a' : '#ffffff',
            color: step >= 1 ? '#ffffff' : '#64748b',
            border: '3px solid #1e3a8a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            {step > 1 ? <FiCheck /> : '1'}
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: step >= 1 ? '#1e3a8a' : '#64748b' }}>Datos Personales</span>
        </div>

        {/* Step 2 Indicator */}
        <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: step >= 2 ? '#1e3a8a' : '#ffffff',
            color: step >= 2 ? '#ffffff' : '#64748b',
            border: `3px solid ${step >= 2 ? '#1e3a8a' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}>
            {step > 2 ? <FiCheck /> : '2'}
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: step >= 2 ? '#1e3a8a' : '#64748b' }}>Subir Documentos</span>
        </div>

        {/* Step 3 Indicator */}
        <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: step >= 3 ? '#1e3a8a' : '#ffffff',
            color: step >= 3 ? '#ffffff' : '#64748b',
            border: `3px solid ${step >= 3 ? '#1e3a8a' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}>
            3
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: step >= 3 ? '#1e3a8a' : '#64748b' }}>Pasarela de Pago</span>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
        {error && (
          <div className="login-alert" style={{ marginBottom: 20, textAlign: 'left', borderRadius: '8px' }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="login-alert success" style={{
            marginBottom: 20,
            backgroundColor: '#d1e7dd',
            color: '#0f5132',
            borderColor: '#badbcc',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {success}
          </div>
        )}
      </div>

      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        
        {/* STEP 1: PERSONAL & ACADEMIC DATA */}
        {step === 1 && (
          <form className="preinscripcion-form" onSubmit={handleNextToStep2}>
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
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">¿En qué turno prefiere pasar clases? *</label>
                  <select className="form-select" name="preferencia_turno" value={form.preferencia_turno} onChange={handleChange} required>
                    <option value="">Seleccionar turno</option>
                    <option value="manana">Mañana: 07:00 a 11:00</option>
                    <option value="tarde">Tarde: 13:00 a 17:00</option>
                    <option value="noche">Noche: 18:00 a 22:00</option>
                  </select>
                </div>
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

            <button className="btn btn-primary btn-block btn-lg" type="submit" style={{ marginBottom: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              Siguiente Paso <span style={{ marginLeft: 4 }}>→</span>
            </button>
          </form>
        )}

        {/* STEP 2: DOCUMENT UPLOADS */}
        {step === 2 && (
          <form className="preinscripcion-form" onSubmit={handleRegisterAndGoToPayment}>
            <div className="preinscripcion-section" style={{ textAlign: 'left' }}>
              <div className="preinscripcion-section-title"><FiFileText /> 2. Carga de Documentos Obligatorios</div>
              <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: 24, lineHeight: '1.5' }}>
                Para continuar con el trámite preuniversitario, es estrictamente obligatorio que adjunte fotografías nítidas o escaneos de su <strong>Cédula de Identidad</strong>, de su <strong>Título de Bachiller</strong> y una <strong>Fotografía del postulante</strong>. 
                Los formatos aceptados son JPG, JPEG, PNG y WEBP, con un tamaño máximo de 5 MB por archivo.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }} className="form-grid-docs">
                
                {/* CI Upload Field */}
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '24px',
                  backgroundColor: '#f8fafc',
                  textAlign: 'center',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#1e3a8a'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCiChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 3
                    }}
                  />
                  <FiUpload style={{ fontSize: '2.2rem', color: '#94a3b8', marginBottom: 12 }} />
                  <h4 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: '1rem', fontWeight: 600 }}>Cédula de Identidad (CI) *</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Haga clic o arrastre la imagen aquí (Máx. 5MB)</p>
                  
                  {imagenCi && (
                    <div style={{ marginTop: '16px', zIndex: 4, position: 'relative', width: '100%', maxWidth: '250px' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>
                        ✅ {imagenCi.name}
                      </span>
                      {imagenCiPreview && (
                        <img
                          src={imagenCiPreview}
                          alt="Vista previa CI"
                          style={{
                            width: '100%',
                            maxHeight: '120px',
                            objectFit: 'contain',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            padding: '4px',
                            backgroundColor: '#ffffff'
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Título de Bachiller Upload Field */}
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '24px',
                  backgroundColor: '#f8fafc',
                  textAlign: 'center',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#1e3a8a'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleTituloChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 3
                    }}
                  />
                  <FiUpload style={{ fontSize: '2.2rem', color: '#94a3b8', marginBottom: 12 }} />
                  <h4 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: '1rem', fontWeight: 600 }}>Título de Bachiller *</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Haga clic o arrastre la imagen aquí (Máx. 5MB)</p>
                  
                  {imagenTituloBachiller && (
                    <div style={{ marginTop: '16px', zIndex: 4, position: 'relative', width: '100%', maxWidth: '250px' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>
                        ✅ {imagenTituloBachiller.name}
                      </span>
                      {imagenTituloBachillerPreview && (
                        <img
                          src={imagenTituloBachillerPreview}
                          alt="Vista previa Título"
                          style={{
                            width: '100%',
                            maxHeight: '120px',
                            objectFit: 'contain',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            padding: '4px',
                            backgroundColor: '#ffffff'
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Fotografía Upload Field */}
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '24px',
                  backgroundColor: '#f8fafc',
                  textAlign: 'center',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#1e3a8a'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 3
                    }}
                  />
                  <FiUpload style={{ fontSize: '2.2rem', color: '#94a3b8', marginBottom: 12 }} />
                  <h4 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: '1rem', fontWeight: 600 }}>Fotografía del postulante *</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Haga clic o arrastre la imagen aquí (Máx. 5MB)</p>
                  
                  {foto && (
                    <div style={{ marginTop: '16px', zIndex: 4, position: 'relative', width: '100%', maxWidth: '250px' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>
                        ✅ {foto.name}
                      </span>
                      {fotoPreview && (
                        <img
                          src={fotoPreview}
                          alt="Vista previa Fotografía"
                          style={{
                            width: '100%',
                            maxHeight: '120px',
                            objectFit: 'contain',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            padding: '4px',
                            backgroundColor: '#ffffff'
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: 40 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep(1)}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={loading}
              >
                <FiArrowLeft /> Volver a Datos
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={loading || !imagenCi || !imagenTituloBachiller || !foto}
              >
                {loading ? (
                  <>
                    <FiLoader className="spin" /> Guardando y validando archivos...
                  </>
                ) : (
                  <>
                    Continuar al pago <span style={{ marginLeft: 4 }}>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: PAYMENT GATEWAY */}
        {step === 3 && (
          <div className="preinscripcion-form" style={{ textAlign: 'left' }}>
            <div className="preinscripcion-section">
              <div className="preinscripcion-section-title"><FiCreditCard /> 3. Pasarela de Pago Seguro</div>
              <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: 24, lineHeight: '1.5' }}>
                Sus datos y documentos han sido pre-registrados con éxito. Para completar de forma oficial su preinscripción en el 
                Curso Preuniversitario FICCT, es necesario realizar el pago del arancel de admisión institucional.
              </p>

              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>TARIFA DE PREINSCRIPCIÓN</span>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#1e3a8a' }}>350.00 BOB</h3>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1e40af', fontSize: '0.85rem', fontWeight: 600, backgroundColor: '#dbeafe', padding: '6px 12px', borderRadius: '20px' }}>
                  <FiLock /> Transacción Encriptada
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: '550px' }}>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                  }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                      Pago seguro con Stripe
                    </h4>
                    <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.5', marginBottom: '16px' }}>
                      Será redirigido a Stripe Checkout para pagar la tarifa de preinscripción. El sistema no almacena los datos de su tarjeta. Stripe procesará el pago de forma segura.
                    </p>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#991b1b',
                      backgroundColor: '#fee2e2',
                      border: '1px solid #fca5a5',
                      padding: '10px',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}>
                      ⚠️ MODO PRUEBA - No se realizará ningún cobro real.
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                      onClick={async () => {
                        setLoading(true);
                        setError('');
                        try {
                          let res;
                          if (postulanteId) {
                            console.log('Iniciando Stripe checkout para preinscripción temporal existente:', postulanteId);
                            res = await preinscripcionStripeCheckout({ preinscripcion_temporal_id: postulanteId });
                          } else {
                            console.log('Creando preinscripción temporal e iniciando Stripe checkout');
                            const formData = new FormData();
                            formData.append('nombres', form.nombres);
                            formData.append('apellidos', form.apellidos);
                            formData.append('ci', form.ci);
                            if (form.genero) {
                              formData.append('genero', form.genero);
                              formData.append('sexo', form.genero);
                            }
                            if (form.fecha_nacimiento) formData.append('fecha_nacimiento', form.fecha_nacimiento);
                            if (form.celular) formData.append('telefono', form.celular);
                            if (form.segundo_celular) formData.append('segundo_telefono', form.segundo_celular);
                            formData.append('correo_electronico', form.email);
                            if (form.direccion) formData.append('direccion', form.direccion);
                            if (form.unidad_educativa) formData.append('colegio_procedencia', form.unidad_educativa);
                            if (form.provincia) formData.append('ciudad', form.provincia);
                            
                            formData.append('carrera', form.primera_opcion_carrera);
                            formData.append('primera_opcion_carrera', form.primera_opcion_carrera);
                            formData.append('segunda_opcion_carrera', form.segunda_opcion_carrera);
                            formData.append('preferencia_turno', form.preferencia_turno);
                            formData.append('titulo_bachiller', 1);

                            if (imagenCi) formData.append('imagen_ci', imagenCi);
                            if (imagenTituloBachiller) formData.append('imagen_titulo_bachiller', imagenTituloBachiller);
                            if (foto) formData.append('fotografia', foto);

                            res = await preinscripcionStripeCheckout(formData);
                          }

                          const url = res.data?.checkout_url;

                          if (!url) {
                            throw new Error('No se recibió checkout_url de Stripe.');
                          }

                          if (!url.startsWith('https://checkout.stripe.com/')) {
                            throw new Error('La URL recibida no es una URL válida de Stripe Checkout.');
                          }

                          window.location.href = url;
                        } catch (err) {
                          console.error('Stripe checkout error:', err.response?.data || err);
                          const errMsg = err.response?.data?.message || err.message || 'No se pudo iniciar el pago con Stripe.';
                          setError(errMsg);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      style={{
                        width: '100%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '14px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#1e3a8a',
                        color: '#ffffff',
                        fontSize: '1rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {loading ? <FiLoader className="spin" /> : <><FiCheck /> Pagar inscripción</>}
                    </button>

                    <button
                      onClick={handleOpenCancelModal}
                      disabled={loading}
                      style={{
                        width: '100%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {showCancelModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '450px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            color: '#1e293b',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                margin: '0 auto 16px'
              }}>
                ⚠️
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                ¿Deseas cancelar tu preinscripción?
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: '1.5' }}>
                Si cancelas, todos tus datos y documentos registrados serán eliminados permanentemente del sistema.
              </p>
            </div>
            <div style={{
              padding: '16px 24px',
              backgroundColor: '#f8fafc',
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              borderTop: '1px solid #f1f5f9'
            }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCloseCancelModal}
                disabled={canceling}
                style={{ minWidth: '100px' }}
              >
                No
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmCancel}
                disabled={canceling}
                style={{
                  minWidth: '100px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {canceling ? 'Cancelando...' : 'Sí'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
