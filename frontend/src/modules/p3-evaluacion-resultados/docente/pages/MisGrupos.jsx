import React, { useState, useEffect, useMemo } from 'react'
import Layout from '@/layouts/Layout'
import Loading from '@/shared/components/Loading'
import api from '@/shared/services/api'
import {
  getMisGrupos,
  getEstudiantesGrupo,
  guardarCalificacion,
  getAsistencia,
  guardarAsistencia
} from '../services/docenteAcademicoService'
import {
  FiRefreshCw, FiChevronDown, FiChevronUp, FiArrowLeft, FiBook, FiUser,
  FiList, FiAward, FiCheckSquare, FiPlus, FiEdit2, FiTrash2, FiSave,
  FiAlertCircle, FiCheck, FiDownload, FiUpload, FiX, FiFile
} from 'react-icons/fi'

// ── Constantes ────────────────────────────────────────────────────────────────

const DIAS_SEMANA   = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
const DIAS_ETIQUETA = {
  lunes:     'Lunes',
  martes:    'Martes',
  miercoles: 'Miércoles',
  jueves:    'Jueves',
  viernes:   'Viernes',
  sabado:    'Sábado',
}

const GRUPO_COLORES = ['#1565c0', '#c62828', '#283593', '#ad1457', '#00695c', '#6a1b9a']

const TURNO_ESTILO = {
  mañana: { bg: '#e3f2fd', text: '#1565c0' },
  tarde:  { bg: '#fff3e0', text: '#e65100' },
  noche:  { bg: '#ede7f6', text: '#4527a0' },
}

const ESTADOS_ASISTENCIA = ['presente', 'ausente', 'licencia']
const ASISTENCIA_ESTILO = {
  presente: { bg: '#e8f5e9', text: '#2e7d32', label: 'Presente' },
  ausente:  { bg: '#ffebee', text: '#c62828', label: 'Ausente' },
  licencia: { bg: '#fff8e1', text: '#f57f17', label: 'Licencia' },
}

export default function MisGrupos() {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [horarioVisible, setHorarioVisible] = useState(false)
  const [selectedGrupo, setSelectedGrupo]   = useState(null)
  
  // Tabs del aula virtual
  const [activeTab, setActiveTab] = useState('curso')

  // Estado del curso (Temas y Avisos)
  const [temas, setTemas] = useState([])
  const [loadingTemas, setLoadingTemas] = useState(false)
  const [avisos, setAvisos] = useState([])
  const [loadingAvisos, setLoadingAvisos] = useState(false)

  // Modals de Temas y Avisos
  const [showTemaModal, setShowTemaModal] = useState(null) // 'create' | 'edit'
  const [temaForm, setTemaForm] = useState({ id: '', numero: '', titulo: '', descripcion: '' })
  const [showAvisoModal, setShowAvisoModal] = useState(null) // 'create' | 'edit'
  const [avisoForm, setAvisoForm] = useState({ id: '', titulo: '', contenido: '' })

  // Estado de estudiantes y notas
  const [grupoInfo, setGrupoInfo] = useState(null)
  const [loadingEst, setLoadingEst] = useState(false)
  const [notas, setNotas] = useState({})
  const [savingNotas, setSavingNotas] = useState({})
  const [notasMsgs, setNotasMsgs] = useState({})
  const [originalNotas, setOriginalNotas] = useState({})
  const [selectedEstudiantes, setSelectedEstudiantes] = useState({})
  const [savingMasivo, setSavingMasivo] = useState(false)
  const [masivoErrorMsg, setMasivoErrorMsg] = useState('')
  const [masivoSuccessMsg, setMasivoSuccessMsg] = useState('')

  // Estado de CSV
  const [csvFile, setCsvFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState(null)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [importandoCsv, setImportandoCsv] = useState(false)
  const [csvErrorMsg, setCsvErrorMsg] = useState('')

  // Estado de Tareas
  const [tareas, setTareas] = useState([])
  const [loadingTareas, setLoadingTareas] = useState(false)
  const [showTareaModal, setShowTareaModal] = useState(null) // 'create' | 'edit'
  const [tareaForm, setTareaForm] = useState({
    id: '', titulo: '', descripcion: '', fecha_publicacion: '', fecha_limite: '', estado: 'activa', archivo: null
  })

  // Estado de Asistencia
  const [fechaAsistencia, setFechaAsistencia] = useState(new Date().toISOString().slice(0, 10))
  const [filasAsistencia, setFilasAsistencia] = useState([])
  const [loadingAsist, setLoadingAsist] = useState(false)
  const [savingAsist, setSavingAsist] = useState(false)
  const [asistMsg, setAsistMsg] = useState(null)

  const fetchData = () => {
    setLoading(true)
    getMisGrupos()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  // Cargar datos al cambiar de grupo o pestaña
  useEffect(() => {
    if (!selectedGrupo) return

    if (activeTab === 'curso') {
      cargarTemasYAvisos()
    } else if (activeTab === 'estudiantes' || activeTab === 'calificaciones') {
      cargarEstudiantes()
    } else if (activeTab === 'actividades') {
      cargarTareas()
    } else if (activeTab === 'asistencia') {
      cargarAsistenciaEstudiantes()
    }
  }, [selectedGrupo, activeTab])

  // Cargar asistencia cuando cambia la fecha
  useEffect(() => {
    if (selectedGrupo && activeTab === 'asistencia') {
      cargarAsistenciaEstudiantes()
    }
  }, [fechaAsistencia])

  // Promedio del grupo (solo estudiantes con las 3 notas)
  const promedioGrupo = useMemo(() => {
    if (!grupoInfo) return null
    const estudiantes = grupoInfo.estudiantes || []
    const completos = estudiantes.filter(e => {
      const n = notas[e.id] || {}
      return n.nota_1 !== '' && n.nota_2 !== '' && n.nota_3 !== ''
    })
    if (completos.length === 0) return null
    const sum = completos.reduce((acc, e) => {
      const n = notas[e.id] || {}
      const p = ((parseFloat(n.nota_1) + parseFloat(n.nota_2) + parseFloat(n.nota_3)) / 3)
      return acc + p
    }, 0)
    return (sum / completos.length).toFixed(2)
  }, [grupoInfo, notas])

  if (loading) return <Layout><Loading /></Layout>

  const docente = data?.docente         || {}
  const grupos  = data?.grupos          || []
  const slots   = data?.horario_semanal || []

  const hasSabado = slots.some(s => s.sabado !== null)
  const dias = hasSabado ? [...DIAS_SEMANA, 'sabado'] : DIAS_SEMANA

  const colorMap = {}
  grupos.forEach((g, i) => {
    colorMap[g.codigo] = GRUPO_COLORES[i % GRUPO_COLORES.length]
  })

  // ── Funciones de carga de datos ──

  const cargarTemasYAvisos = async () => {
    setLoadingTemas(true)
    setLoadingAvisos(true)
    try {
      // Temas
      const tRes = await api.get(`/materias/${selectedGrupo.materia_id}/temas`)
      setTemas(tRes.data?.temas || [])
    } catch {
      setTemas([])
    } finally {
      setLoadingTemas(false)
    }

    try {
      // Avisos
      const aRes = await api.get(`/docente/grupos/${selectedGrupo.id}/materias/${selectedGrupo.materia_id}/avisos`)
      setAvisos(aRes.data || [])
    } catch {
      setAvisos([])
    } finally {
      setLoadingAvisos(false)
    }
  }

  const cargarEstudiantes = async () => {
    setLoadingEst(true)
    setNotasMsgs({})
    setMasivoErrorMsg('')
    setMasivoSuccessMsg('')
    setSelectedEstudiantes({})
    try {
      const r = await getEstudiantesGrupo(selectedGrupo.id)
      setGrupoInfo(r.data)
      const init = {}
      const orig = {}
      r.data.estudiantes.forEach(e => {
        const val = {
          nota_1: e.nota_1 !== null && e.nota_1 !== undefined ? String(e.nota_1) : '',
          nota_2: e.nota_2 !== null && e.nota_2 !== undefined ? String(e.nota_2) : '',
          nota_3: e.nota_3 !== null && e.nota_3 !== undefined ? String(e.nota_3) : '',
        }
        init[e.id] = { ...val }
        orig[e.id] = { ...val }
      })
      setNotas(init)
      setOriginalNotas(orig)
    } catch {
      setGrupoInfo(null)
    } finally {
      setLoadingEst(false)
    }
  }

  const cargarTareas = async () => {
    setLoadingTareas(true)
    try {
      const r = await api.get(`/docente/grupos/${selectedGrupo.id}/materias/${selectedGrupo.materia_id}/tareas`)
      setTareas(r.data || [])
    } catch {
      setTareas([])
    } finally {
      setLoadingTareas(false)
    }
  }

  const cargarAsistenciaEstudiantes = async () => {
    setLoadingAsist(true)
    setAsistMsg(null)
    try {
      const [estudRes, asistRes] = await Promise.all([
        getEstudiantesGrupo(selectedGrupo.id),
        getAsistencia({ grupo_id: selectedGrupo.id, fecha: fechaAsistencia }),
      ])
      const estudiantes = estudRes.data?.estudiantes || []
      const asistencias = asistRes.data || []

      const existingMap = {}
      asistencias.forEach(a => { existingMap[a.postulante_id] = a.estado })

      setFilasAsistencia(estudiantes.map(e => ({
        postulante_id: e.id,
        nombre: e.nombre,
        ci: e.ci,
        estado: existingMap[e.id] || 'presente',
      })))
    } catch {
      setFilasAsistencia([])
      setAsistMsg({ type: 'error', text: 'Error al cargar estudiantes de asistencia.' })
    } finally {
      setLoadingAsist(false)
    }
  }

  // ── Temas CRUD ──

  const handleSaveTema = async (e) => {
    e.preventDefault()
    try {
      if (showTemaModal === 'create') {
        await api.post('/docente/temas', {
          materia_id: selectedGrupo.materia_id,
          numero: temaForm.numero,
          titulo: temaForm.titulo,
          descripcion: temaForm.descripcion
        })
      } else {
        await api.put(`/docente/temas/${temaForm.id}`, {
          numero: temaForm.numero,
          titulo: temaForm.titulo,
          descripcion: temaForm.descripcion
        })
      }
      setShowTemaModal(null)
      cargarTemasYAvisos()
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar tema.')
    }
  }

  const handleEditTema = (t) => {
    setTemaForm({ id: t.id, numero: t.numero, titulo: t.titulo, descripcion: t.descripcion || '' })
    setShowTemaModal('edit')
  }

  const handleDeleteTema = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este tema?')) return
    try {
      await api.delete(`/docente/temas/${id}`)
      cargarTemasYAvisos()
    } catch (err) {
      alert('Error al eliminar tema.')
    }
  }

  // ── Avisos CRUD ──

  const handleSaveAviso = async (e) => {
    e.preventDefault()
    try {
      if (showAvisoModal === 'create') {
        await api.post('/docente/avisos', {
          grupo_id: selectedGrupo.id,
          materia_id: selectedGrupo.materia_id,
          titulo: avisoForm.titulo,
          contenido: avisoForm.contenido
        })
      } else {
        await api.put(`/docente/avisos/${avisoForm.id}`, {
          titulo: avisoForm.titulo,
          contenido: avisoForm.contenido
        })
      }
      setShowAvisoModal(null)
      cargarTemasYAvisos()
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar aviso.')
    }
  }

  const handleEditAviso = (av) => {
    setAvisoForm({ id: av.id, titulo: av.titulo, contenido: av.contenido })
    setShowAvisoModal('edit')
  }

  const handleDeleteAviso = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este aviso?')) return
    try {
      await api.delete(`/docente/avisos/${id}`)
      cargarTemasYAvisos()
    } catch (err) {
      alert('Error al eliminar aviso.')
    }
  }

  // ── Tareas CRUD ──

  const handleSaveTarea = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('grupo_id', selectedGrupo.id)
    fd.append('materia_id', selectedGrupo.materia_id)
    fd.append('gestion', selectedGrupo.gestion || 'I-2026')
    fd.append('titulo', tareaForm.titulo)
    fd.append('descripcion', tareaForm.descripcion)
    fd.append('fecha_publicacion', tareaForm.fecha_publicacion)
    fd.append('fecha_limite', tareaForm.fecha_limite)
    fd.append('estado', tareaForm.estado)
    if (tareaForm.archivo) {
      fd.append('archivo', tareaForm.archivo)
    }

    try {
      if (showTareaModal === 'create') {
        await api.post('/docente/tareas', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        await api.post(`/docente/tareas/${tareaForm.id}?_method=PUT`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      setShowTareaModal(null)
      cargarTareas()
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar tarea.')
    }
  }

  const handleEditTarea = (t) => {
    setTareaForm({
      id: t.id,
      titulo: t.titulo,
      descripcion: t.descripcion,
      fecha_publicacion: t.fecha_publicacion ? t.fecha_publicacion.substring(0, 16) : '',
      fecha_limite: t.fecha_limite ? t.fecha_limite.substring(0, 16) : '',
      estado: t.estado || 'activa',
      archivo: null
    })
    setShowTareaModal('edit')
  }

  const handleDeleteTarea = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta tarea?')) return
    try {
      await api.delete(`/docente/tareas/${id}`)
      cargarTareas()
    } catch (err) {
      alert('Error al eliminar tarea.')
    }
  }

  // ── Calificaciones manuales ──

  // ── Calificaciones manuales ──

  const handleNotaChange = (id, field, value) => {
    setNotas(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
    setNotasMsgs(prev => ({ ...prev, [id]: null }))
    setMasivoErrorMsg('')
    setMasivoSuccessMsg('')
  }

  const hasChanges = (estudianteId) => {
    const n = notas[estudianteId] || {}
    const orig = originalNotas[estudianteId] || {}
    return (n.nota_1 ?? '') !== (orig.nota_1 ?? '') ||
           (n.nota_2 ?? '') !== (orig.nota_2 ?? '') ||
           (n.nota_3 ?? '') !== (orig.nota_3 ?? '')
  }

  const validarEstudiante = (e, n) => {
    const fields = ['nota_1', 'nota_2', 'nota_3']
    for (const f of fields) {
      const val = n[f]
      if (val !== '' && val !== null && val !== undefined) {
        if (isNaN(val) || isNaN(parseFloat(val))) {
          return 'Debe ser un valor numérico.'
        }
        const num = parseFloat(val)
        if (num < 0 || num > 100) {
          return 'Debe estar entre 0 y 100.'
        }
      }
    }
    return null
  }

  const handleGuardarNotaManual = async (postulanteId) => {
    setSavingNotas(prev => ({ ...prev, [postulanteId]: true }))
    setNotasMsgs(prev => ({ ...prev, [postulanteId]: null }))
    const n = notas[postulanteId] || {}
    const e = grupoInfo.estudiantes.find(est => est.id === postulanteId)

    const error = validarEstudiante(e, n)
    if (error) {
      setNotasMsgs(prev => ({ ...prev, [postulanteId]: { type: 'error', text: error } }))
      setSavingNotas(prev => ({ ...prev, [postulanteId]: false }))
      return
    }

    try {
      await guardarCalificacion({
        postulante_id: postulanteId,
        grupo_id:      selectedGrupo.id,
        nota_1:        n.nota_1 !== '' ? n.nota_1 : null,
        nota_2:        n.nota_2 !== '' ? n.nota_2 : null,
        nota_3:        n.nota_3 !== '' ? n.nota_3 : null,
      })
      setNotasMsgs(prev => ({ ...prev, [postulanteId]: { type: 'success', text: 'Guardado' } }))
      
      // Actualizar originalNotas localmente para este estudiante
      setOriginalNotas(prev => ({
        ...prev,
        [postulanteId]: {
          nota_1: n.nota_1,
          nota_2: n.nota_2,
          nota_3: n.nota_3
        }
      }))
      
      await reloadEstudiantesKeepSelections()
    } catch (err) {
      setNotasMsgs(prev => ({ ...prev, [postulanteId]: { type: 'error', text: err.response?.data?.message || 'Error' } }))
    } finally {
      setSavingNotas(prev => ({ ...prev, [postulanteId]: false }))
    }
  }

  const handleGuardarSeleccionados = async () => {
    setMasivoErrorMsg('')
    setMasivoSuccessMsg('')
    
    const selectedIds = Object.keys(selectedEstudiantes).filter(id => selectedEstudiantes[id])
    if (selectedIds.length === 0) {
      setMasivoErrorMsg('Selecciona al menos un estudiante para guardar las notas.')
      return
    }

    const toSave = []
    let hasValidationError = false
    const newMsgs = { ...notasMsgs }

    selectedIds.forEach(id => {
      const e = grupoInfo.estudiantes.find(est => String(est.id) === id)
      if (!e) return
      const n = notas[id] || { nota_1: '', nota_2: '', nota_3: '' }
      
      const error = validarEstudiante(e, n)
      if (error) {
        newMsgs[id] = { type: 'error', text: error }
        hasValidationError = true
      } else {
        toSave.push({
          postulante_id: e.id,
          nota_1: n.nota_1 !== '' ? n.nota_1 : null,
          nota_2: n.nota_2 !== '' ? n.nota_2 : null,
          nota_3: n.nota_3 !== '' ? n.nota_3 : null,
        })
      }
    })

    if (hasValidationError) {
      setNotasMsgs(newMsgs)
      setMasivoErrorMsg('No se pudieron guardar algunas notas. Revisa las filas marcadas con error.')
      return
    }

    setSavingMasivo(true)
    try {
      const res = await api.post('/docente/calificaciones/masivo', {
        grupo_id: selectedGrupo.id,
        calificaciones: toSave
      })
      setMasivoSuccessMsg(res.data?.message || 'Calificaciones guardadas con éxito.')
      
      // Actualizar originalNotas para los estudiantes guardados
      const nextOrig = { ...originalNotas }
      toSave.forEach(item => {
        nextOrig[item.postulante_id] = {
          nota_1: item.nota_1 !== null ? String(item.nota_1) : '',
          nota_2: item.nota_2 !== null ? String(item.nota_2) : '',
          nota_3: item.nota_3 !== null ? String(item.nota_3) : '',
        }
        newMsgs[item.postulante_id] = { type: 'success', text: 'Guardado' }
      })
      setOriginalNotas(nextOrig)
      setNotasMsgs(newMsgs)
      
      await reloadEstudiantesKeepSelections()
    } catch (err) {
      setMasivoErrorMsg(err.response?.data?.message || 'Error al guardar calificaciones.')
    } finally {
      setSavingMasivo(false)
    }
  }

  const handleGuardarTodo = async () => {
    setMasivoErrorMsg('')
    setMasivoSuccessMsg('')
    
    if (!grupoInfo || !grupoInfo.estudiantes || grupoInfo.estudiantes.length === 0) {
      return
    }

    const toSave = []
    let hasValidationError = false
    const newMsgs = { ...notasMsgs }

    grupoInfo.estudiantes.forEach(e => {
      const n = notas[e.id] || { nota_1: '', nota_2: '', nota_3: '' }
      
      const error = validarEstudiante(e, n)
      if (error) {
        newMsgs[e.id] = { type: 'error', text: error }
        hasValidationError = true
      } else {
        toSave.push({
          postulante_id: e.id,
          nota_1: n.nota_1 !== '' ? n.nota_1 : null,
          nota_2: n.nota_2 !== '' ? n.nota_2 : null,
          nota_3: n.nota_3 !== '' ? n.nota_3 : null,
        })
      }
    })

    if (hasValidationError) {
      setNotasMsgs(newMsgs)
      setMasivoErrorMsg('No se pudieron guardar algunas notas. Revisa las filas marcadas con error.')
      return
    }

    setSavingMasivo(true)
    try {
      const res = await api.post('/docente/calificaciones/masivo', {
        grupo_id: selectedGrupo.id,
        calificaciones: toSave
      })
      setMasivoSuccessMsg(res.data?.message || 'Calificaciones guardadas con éxito.')
      
      const nextOrig = { ...originalNotas }
      toSave.forEach(item => {
        nextOrig[item.postulante_id] = {
          nota_1: item.nota_1 !== null ? String(item.nota_1) : '',
          nota_2: item.nota_2 !== null ? String(item.nota_2) : '',
          nota_3: item.nota_3 !== null ? String(item.nota_3) : '',
        }
        newMsgs[item.postulante_id] = { type: 'success', text: 'Guardado' }
      })
      setOriginalNotas(nextOrig)
      setNotasMsgs(newMsgs)
      
      await reloadEstudiantesKeepSelections()
    } catch (err) {
      setMasivoErrorMsg(err.response?.data?.message || 'Error al guardar calificaciones.')
    } finally {
      setSavingMasivo(false)
    }
  }

  const reloadEstudiantesKeepSelections = async () => {
    try {
      const r = await getEstudiantesGrupo(selectedGrupo.id)
      setGrupoInfo(r.data)
      const nextNotas = {}
      const nextOrig = {}
      r.data.estudiantes.forEach(e => {
        const val = {
          nota_1: e.nota_1 !== null && e.nota_1 !== undefined ? String(e.nota_1) : '',
          nota_2: e.nota_2 !== null && e.nota_2 !== undefined ? String(e.nota_2) : '',
          nota_3: e.nota_3 !== null && e.nota_3 !== undefined ? String(e.nota_3) : '',
        }
        const hasLocalEdits = hasChanges(e.id)
        if (hasLocalEdits) {
          nextNotas[e.id] = notas[e.id]
          nextOrig[e.id] = originalNotas[e.id]
        } else {
          nextNotas[e.id] = { ...val }
          nextOrig[e.id] = { ...val }
        }
      })
      setNotas(nextNotas)
      setOriginalNotas(nextOrig)
    } catch {
      // ignore
    }
  }

  // ── CSV notas plantilla y carga ──

  const handleDescargarPlantilla = () => {
    if (!grupoInfo || !grupoInfo.estudiantes) return
    const headers = 'ci,estudiante,examen_1,examen_2,examen_3\n'
    const rows = grupoInfo.estudiantes.map(e => {
      const n1 = e.nota_1 !== null && e.nota_1 !== undefined ? e.nota_1 : ''
      const n2 = e.nota_2 !== null && e.nota_2 !== undefined ? e.nota_2 : ''
      const n3 = e.nota_3 !== null && e.nota_3 !== undefined ? e.nota_3 : ''
      return `${e.ci},"${e.nombre}",${n1},${n2},${n3}`
    }).join('\n')
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `plantilla_notas_${selectedGrupo.codigo}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSubirCsv = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCsvFile(file)
    setCsvErrorMsg('')
    setCsvPreview(null)

    const fd = new FormData()
    fd.append('grupo_id', selectedGrupo.id)
    fd.append('file', file)

    try {
      const res = await api.post('/docente/calificaciones/previsualizar-csv', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setCsvPreview(res.data)
      setShowCsvModal(true)
    } catch (err) {
      setCsvErrorMsg(err.response?.data?.message || 'Error al previsualizar el archivo CSV.')
      alert(err.response?.data?.message || 'Error al previsualizar CSV.')
    } finally {
      e.target.value = null // reset file input
    }
  }

  const handleConfirmarImportacion = async () => {
    if (!csvPreview || csvPreview.invalid_rows > 0) return
    setImportandoCsv(true)
    try {
      await api.post('/docente/calificaciones/importar-csv', {
        grupo_id: selectedGrupo.id,
        updates: csvPreview.updates
      })
      setShowCsvModal(false)
      setCsvPreview(null)
      setCsvFile(null)
      alert('Notas importadas con éxito.')
      await cargarEstudiantes()
    } catch (err) {
      alert(err.response?.data?.message || 'Error al confirmar la importación.')
    } finally {
      setImportandoCsv(false)
    }
  }

  // ── Asistencia CRUD ──

  const handleEstadoAsist = (postulanteId, estado) => {
    setFilasAsistencia(prev => prev.map(f => f.postulante_id === postulanteId ? { ...f, estado } : f))
  }

  const marcarTodosAsist = (estado) => {
    setFilasAsistencia(prev => prev.map(f => ({ ...f, estado })))
  }

  const handleGuardarAsist = async () => {
    if (filasAsistencia.length === 0) return
    setSavingAsist(true)
    setAsistMsg(null)
    try {
      await guardarAsistencia({
        grupo_id: selectedGrupo.id,
        fecha: fechaAsistencia,
        registros: filasAsistencia.map(f => ({ postulante_id: f.postulante_id, estado: f.estado })),
      })
      setAsistMsg({ type: 'success', text: `Asistencia guardada para ${filasAsistencia.length} estudiante(s).` })
    } catch {
      setAsistMsg({ type: 'error', text: 'Error al guardar la asistencia.' })
    } finally {
      setSavingAsist(false)
    }
  }

  const estudiantesList = grupoInfo?.estudiantes || []
  const allChecked = estudiantesList.length > 0 && estudiantesList.every(e => !!selectedEstudiantes[e.id])
  const someChecked = estudiantesList.length > 0 && estudiantesList.some(e => !!selectedEstudiantes[e.id]) && !allChecked

  return (
    <Layout>
      {selectedGrupo ? (
        // ════════════════════════════════════════
        // ── Vista Interna: AULA VIRTUAL DOCENTE ──
        // ════════════════════════════════════════
        <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.25s ease' }}>
          {/* Botón Volver */}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setSelectedGrupo(null)}
            style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiArrowLeft /> Volver a Mis Grupos
          </button>

          {/* Encabezado Superior */}
          <div style={{
            background: 'linear-gradient(135deg, #1565c0 0%, #1e293b 100%)',
            color: 'white',
            borderRadius: 'var(--radius)',
            padding: '24px 30px',
            marginBottom: '20px',
            boxShadow: 'var(--shadow)'
          }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.85, fontWeight: 700 }}>
              Aula Virtual del Docente
            </span>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '4px 0', color: 'white' }}>
              [{selectedGrupo.gestion || 'I-2026'}] {selectedGrupo.materia?.toUpperCase()} — {selectedGrupo.codigo}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: '0.85rem', opacity: 0.95, marginTop: 4 }}>
              <span><strong>Turno:</strong> {selectedGrupo.turno}</span>
              <span><strong>Aula:</strong> {selectedGrupo.aula || '—'}</span>
              <span><strong>Estudiantes:</strong> {selectedGrupo.estudiantes}</span>
              {selectedGrupo.hora_inicio && (
                <span><strong>Horario:</strong> {selectedGrupo.hora_inicio} - {selectedGrupo.hora_fin}</span>
              )}
            </div>
          </div>

          {/* Selector de pestañas */}
          <div style={{
            display: 'flex',
            gap: '4px',
            borderBottom: '2px solid var(--gray-200)',
            marginBottom: '20px',
            overflowX: 'auto'
          }}>
            {[
              { key: 'curso',          label: 'Curso',          icon: <FiBook /> },
              { key: 'estudiantes',    label: 'Estudiantes',    icon: <FiUser /> },
              { key: 'actividades',    label: 'Actividades / Tareas', icon: <FiList /> },
              { key: 'calificaciones', label: 'Calificaciones', icon: <FiAward /> },
              { key: 'asistencia',     label: 'Asistencia',     icon: <FiCheckSquare /> }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '12px 18px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  marginBottom: '-2px',
                  borderBottom: `2.5px solid ${activeTab === t.key ? '#1565c0' : 'transparent'}`,
                  color: activeTab === t.key ? '#1565c0' : 'var(--gray-500)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'var(--transition)'
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* ── CONTENIDO DE LAS PESTAÑAS ── */}
          <div style={{ minHeight: '300px' }}>

            {/* Pestaña: CURSO (Temas + Avisos) */}
            {activeTab === 'curso' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                
                {/* Panel de Temas */}
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--gray-800)' }}>Temas y Unidades</h3>
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      setTemaForm({ id: '', numero: temas.length + 1, titulo: '', descripcion: '' })
                      setShowTemaModal('create')
                    }}>
                      <FiPlus /> Crear Tema
                    </button>
                  </div>

                  {loadingTemas ? (
                    <Loading />
                  ) : temas.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 10, fontSize: '0.85rem' }}>No hay temas creados.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {temas.map(t => (
                        <div key={t.id} style={{ padding: '12px 14px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', background: 'var(--gray-50)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <strong style={{ fontSize: '0.85rem', color: '#1565c0' }}>Tema {t.numero}: {t.titulo}</strong>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-outline btn-sm" style={{ padding: 4 }} onClick={() => handleEditTema(t)}><FiEdit2 size={12} /></button>
                              <button className="btn btn-outline btn-sm" style={{ padding: 4, color: 'var(--danger)' }} onClick={() => handleDeleteTema(t.id)}><FiTrash2 size={12} /></button>
                            </div>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', margin: 0 }}>{t.descripcion || 'Sin descripción.'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Panel de Avisos */}
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--gray-800)' }}>Avisos y Comunicados</h3>
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      setAvisoForm({ id: '', titulo: '', contenido: '' })
                      setShowAvisoModal('create')
                    }}>
                      <FiPlus /> Crear Aviso
                    </button>
                  </div>

                  {loadingAvisos ? (
                    <Loading />
                  ) : avisos.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 10, fontSize: '0.85rem' }}>No hay avisos publicados.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {avisos.map(av => (
                        <div key={av.id} style={{ padding: '12px 14px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', background: 'var(--gray-50)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--gray-800)' }}>{av.titulo}</strong>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-outline btn-sm" style={{ padding: 4 }} onClick={() => handleEditAviso(av)}><FiEdit2 size={12} /></button>
                              <button className="btn btn-outline btn-sm" style={{ padding: 4, color: 'var(--danger)' }} onClick={() => handleDeleteAviso(av.id)}><FiTrash2 size={12} /></button>
                            </div>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--gray-600)', margin: 0, whiteSpace: 'pre-wrap' }}>{av.contenido}</p>
                          <small style={{ fontSize: '0.68rem', color: 'var(--gray-400)', display: 'block', marginTop: 4 }}>
                            Publicado el: {new Date(av.created_at).toLocaleDateString()}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Pestaña: ESTUDIANTES */}
            {activeTab === 'estudiantes' && (
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14 }}>Estudiantes del Paralelo</h3>
                {loadingEst ? (
                  <Loading />
                ) : !grupoInfo || !grupoInfo.estudiantes || grupoInfo.estudiantes.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No hay estudiantes registrados en este grupo.</p>
                ) : (
                  <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Nombre Completo</th>
                          <th>CI</th>
                          <th>Estado del Trámite</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupoInfo.estudiantes.map((e, idx) => (
                          <tr key={e.id}>
                            <td style={{ color: 'var(--gray-400)' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 600 }}>{e.nombre}</td>
                            <td style={{ fontFamily: 'monospace' }}>{e.ci}</td>
                            <td>
                              <span style={{
                                padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600,
                                background: '#e0f2fe', color: '#0369a1'
                              }}>
                                INSCRITO
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: ACTIVIDADES / TAREAS */}
            {activeTab === 'actividades' && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Tareas y Prácticas</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setTareaForm({ id: '', titulo: '', descripcion: '', fecha_publicacion: '', fecha_limite: '', estado: 'activa', archivo: null })
                    setShowTareaModal('create')
                  }}>
                    <FiPlus /> Crear Tarea
                  </button>
                </div>

                {loadingTareas ? (
                  <Loading />
                ) : tareas.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 20 }}>No hay tareas creadas.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                    {tareas.map(t => (
                      <div key={t.id} style={{
                        padding: 16, border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)',
                        background: 'white', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 6
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#1565c0' }}>{t.titulo}</strong>
                          <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: '0.68rem', fontWeight: 700,
                            background: t.estado === 'activa' ? '#e8f5e9' : '#ffebee',
                            color: t.estado === 'activa' ? '#2e7d32' : '#c62828'
                          }}>
                            {t.estado.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', margin: '4px 0', lineHeight: 1.5 }}>
                          {t.descripcion}
                        </p>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>
                          <div>Publicado: {new Date(t.fecha_publicacion).toLocaleString()}</div>
                          <div>Límite: <strong style={{ color: 'var(--gray-700)' }}>{new Date(t.fecha_limite).toLocaleString()}</strong></div>
                        </div>
                        {t.archivo_path && (
                          <a href={`${api.defaults.baseURL}/storage/${t.archivo_path}`} target="_blank" rel="noreferrer" style={{
                            fontSize: '0.75rem', color: '#1565c0', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginTop: 4
                          }}>
                            <FiFile /> Descargar Adjunto
                          </a>
                        )}
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleEditTarea(t)}><FiEdit2 size={12} /> Editar</button>
                          <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteTarea(t.id)}><FiTrash2 size={12} /> Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: CALIFICACIONES */}
            {activeTab === 'calificaciones' && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Registro de Calificaciones</h3>
                    <small style={{ color: 'var(--gray-400)' }}>Materia: {selectedGrupo.materia}</small>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={handleDescargarPlantilla}>
                      <FiDownload /> Descargar Plantilla CSV
                    </button>
                    <label className="btn btn-primary btn-sm" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <FiUpload /> Cargar CSV
                      <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleSubirCsv} />
                    </label>
                  </div>
                </div>

                {loadingEst ? (
                  <Loading />
                ) : !grupoInfo || !grupoInfo.estudiantes || grupoInfo.estudiantes.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No hay estudiantes registrados.</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleGuardarSeleccionados}
                        disabled={savingMasivo}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <FiSave /> Guardar seleccionados
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={handleGuardarTodo}
                        disabled={savingMasivo}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <FiSave /> Guardar todo
                      </button>
                      {masivoErrorMsg && (
                        <span style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: '#ffebee', border: '1px solid #ef9a9a' }}>
                          <FiAlertCircle /> {masivoErrorMsg}
                        </span>
                      )}
                      {masivoSuccessMsg && (
                        <span style={{ color: '#2e7d32', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: '#e8f5e9', border: '1px solid #a5d6a7' }}>
                          <FiCheck /> {masivoSuccessMsg}
                        </span>
                      )}
                    </div>

                    {promedioGrupo !== null && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: 20,
                          background: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: '0.8rem',
                        }}>
                          Promedio del grupo: {promedioGrupo}
                        </span>
                      </div>
                    )}

                    <div className="table-container" style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th style={{ width: 40, textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={el => {
                                  if (el) el.indeterminate = someChecked;
                                }}
                                onChange={(evt) => {
                                  const checked = evt.target.checked
                                  const next = {}
                                  estudiantesList.forEach(e => {
                                    next[e.id] = checked
                                  })
                                  setSelectedEstudiantes(next)
                                }}
                                style={{ cursor: 'pointer', width: 16, height: 16 }}
                              />
                            </th>
                            <th>#</th>
                            <th>Estudiante</th>
                            <th>CI</th>
                            <th style={{ textAlign: 'center', width: 90 }}>Examen 1</th>
                            <th style={{ textAlign: 'center', width: 90 }}>Examen 2</th>
                            <th style={{ textAlign: 'center', width: 90 }}>Examen 3</th>
                            <th style={{ textAlign: 'center', width: 90 }}>Promedio</th>
                            <th style={{ textAlign: 'center', width: 110 }}>Estado</th>
                            <th style={{ textAlign: 'center', width: 120 }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupoInfo.estudiantes.map((e, idx) => {
                            const n = notas[e.id] || {}
                            const isSaving = savingNotas[e.id]
                            const rowMsg = notasMsgs[e.id]
                            const rowHasChanges = hasChanges(e.id)
                            
                            // Calcular promedio visual
                            const v = [n.nota_1, n.nota_2, n.nota_3].map(x => parseFloat(x))
                            const hasAllNotes = v.every(x => !isNaN(x))
                            const visualPromedio = hasAllNotes ? ((v[0] + v[1] + v[2]) / 3).toFixed(2) : '—'
                            const aprobado = hasAllNotes && parseFloat(visualPromedio) >= 60

                            return (
                              <tr key={e.id} style={{ background: rowHasChanges ? '#fffbeb' : 'transparent' }}>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={!!selectedEstudiantes[e.id]}
                                    onChange={(evt) => {
                                      setSelectedEstudiantes(prev => ({
                                        ...prev,
                                        [e.id]: evt.target.checked
                                      }))
                                    }}
                                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                                  />
                                </td>
                                <td style={{ color: 'var(--gray-400)' }}>{idx + 1}</td>
                                <td style={{ fontWeight: 600 }}>{e.nombre}</td>
                                <td style={{ fontFamily: 'monospace' }}>{e.ci}</td>
                                <td>
                                  <input
                                    type="text" className="form-control text-center"
                                    value={n.nota_1 ?? ''} onChange={v => handleNotaChange(e.id, 'nota_1', v.target.value)}
                                    disabled={isSaving} placeholder="—" style={{ height: 30, padding: '2px 4px', fontSize: '0.82rem' }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text" className="form-control text-center"
                                    value={n.nota_2 ?? ''} onChange={v => handleNotaChange(e.id, 'nota_2', v.target.value)}
                                    disabled={isSaving} placeholder="—" style={{ height: 30, padding: '2px 4px', fontSize: '0.82rem' }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text" className="form-control text-center"
                                    value={n.nota_3 ?? ''} onChange={v => handleNotaChange(e.id, 'nota_3', v.target.value)}
                                    disabled={isSaving} placeholder="—" style={{ height: 30, padding: '2px 4px', fontSize: '0.82rem' }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: '#1565c0' }}>{visualPromedio}</td>
                                <td style={{ textAlign: 'center' }}>
                                  {!hasAllNotes ? (
                                    <span style={{ color: 'var(--gray-400)', fontSize: '0.78rem' }}>Pendiente</span>
                                  ) : (
                                    <span style={{
                                      padding: '2px 8px', borderRadius: 12, fontSize: '0.74rem', fontWeight: 700,
                                      background: aprobado ? '#e8f5e9' : '#ffebee',
                                      color: aprobado ? '#2e7d32' : '#c62828'
                                    }}>
                                      {aprobado ? 'APROBADO' : 'REPROBADO'}
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button
                                      className={rowHasChanges ? "btn btn-primary btn-sm" : "btn btn-sm"}
                                      style={{
                                        padding: '3px 8px',
                                        fontSize: '0.74rem',
                                        ...(rowHasChanges ? {} : { background: '#e8f5e9', color: '#2e7d32', borderColor: '#a5d6a7', cursor: 'default' })
                                      }}
                                      onClick={() => {
                                        if (rowHasChanges) handleGuardarNotaManual(e.id);
                                      }}
                                      disabled={isSaving || !rowHasChanges}
                                    >
                                      {rowHasChanges ? <><FiSave /> Guardar</> : <><FiCheck /> Guardado</>}
                                    </button>
                                    {rowMsg && (
                                      <span style={{
                                        fontSize: '0.7rem', fontWeight: 700,
                                        color: rowMsg.type === 'success' ? '#2e7d32' : '#c62828',
                                        display: 'block'
                                      }}>
                                        {rowMsg.text}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Pestaña: ASISTENCIA */}
            {activeTab === 'asistencia' && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Control de Asistencia</h3>
                    <small style={{ color: 'var(--gray-400)' }}>Selecciona la fecha para tomar asistencia</small>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)' }}>Fecha:</label>
                    <input
                      type="date" className="form-control" style={{ width: 140, height: 32, padding: '2px 8px', fontSize: '0.85rem' }}
                      value={fechaAsistencia} onChange={e => setFechaAsistencia(e.target.value)}
                    />
                  </div>
                </div>

                {asistMsg && (
                  <div style={{
                    marginBottom: 14, padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: '0.82rem',
                    background: asistMsg.type === 'success' ? '#e8f5e9' : '#ffebee',
                    color: asistMsg.type === 'success' ? '#2e7d32' : '#c62828',
                    border: `1px solid ${asistMsg.type === 'success' ? '#a5d6a7' : '#ef9a9a'}`
                  }}>
                    {asistMsg.text}
                  </div>
                )}

                {loadingAsist ? (
                  <Loading />
                ) : filasAsistencia.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No hay estudiantes cargados.</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.74rem', fontWeight: 600, ...ASISTENCIA_ESTILO.presente }}>
                        Presentes: {filasAsistencia.filter(f => f.estado === 'presente').length}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.74rem', fontWeight: 600, ...ASISTENCIA_ESTILO.ausente }}>
                        Ausentes: {filasAsistencia.filter(f => f.estado === 'ausente').length}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.74rem', fontWeight: 600, ...ASISTENCIA_ESTILO.licencia }}>
                        Licencias: {filasAsistencia.filter(f => f.estado === 'licencia').length}
                      </span>

                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" style={{ fontSize: '0.74rem', padding: '3px 8px' }} onClick={() => marcarTodosAsist('presente')}>Presentes</button>
                        <button className="btn btn-outline btn-sm" style={{ fontSize: '0.74rem', padding: '3px 8px' }} onClick={() => marcarTodosAsist('ausente')}>Ausentes</button>
                      </div>
                    </div>

                    <div className="table-container" style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Estudiante</th>
                            <th>CI</th>
                            <th>Estado de Asistencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filasAsistencia.map((f, i) => (
                            <tr key={f.postulante_id}>
                              <td style={{ color: 'var(--gray-400)' }}>{i + 1}</td>
                              <td style={{ fontWeight: 600 }}>{f.nombre}</td>
                              <td style={{ fontFamily: 'monospace' }}>{f.ci}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {ESTADOS_ASISTENCIA.map(est => {
                                    const style = ASISTENCIA_ESTILO[est]
                                    const active = f.estado === est
                                    return (
                                      <button
                                        key={est} className="btn btn-sm" onClick={() => handleEstadoAsist(f.postulante_id, est)}
                                        style={{
                                          padding: '2px 8px', fontSize: '0.74rem', borderRadius: 12, border: '1px solid transparent',
                                          background: active ? style.bg : '#f3f4f6',
                                          color: active ? style.text : 'var(--gray-500)',
                                          borderColor: active ? style.text : 'transparent',
                                          fontWeight: active ? 700 : 500
                                        }}
                                      >
                                        {style.label}
                                      </button>
                                    )
                                  })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                      <button className="btn btn-primary" onClick={handleGuardarAsist} disabled={savingAsist} style={{ minWidth: 160 }}>
                        <FiSave /> {savingAsist ? 'Guardando...' : 'Guardar Asistencia'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>

          {/* ── MODALS AULA VIRTUAL ── */}

          {/* Modal Tema CRUD */}
          {showTemaModal && (
            <div className="modal-overlay" onClick={() => setShowTemaModal(null)}>
              <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-title">{showTemaModal === 'create' ? 'Crear Tema' : 'Editar Tema'}</span>
                  <button className="modal-close" onClick={() => setShowTemaModal(null)}><FiX /></button>
                </div>
                <form onSubmit={handleSaveTema}>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Número del Tema</label>
                      <input
                        type="number" className="form-input" required value={temaForm.numero}
                        onChange={e => setTemaForm({ ...temaForm, numero: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Título del Tema</label>
                      <input
                        type="text" className="form-input" required placeholder="Ej: Álgebra Lineal" value={temaForm.titulo}
                        onChange={e => setTemaForm({ ...temaForm, titulo: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Descripción</label>
                      <textarea
                        className="form-input" style={{ minHeight: 80 }} placeholder="Resumen del tema..." value={temaForm.descripcion}
                        onChange={e => setTemaForm({ ...temaForm, descripcion: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline" onClick={() => setShowTemaModal(null)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Guardar Tema</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Aviso CRUD */}
          {showAvisoModal && (
            <div className="modal-overlay" onClick={() => setShowAvisoModal(null)}>
              <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-title">{showAvisoModal === 'create' ? 'Crear Aviso' : 'Editar Aviso'}</span>
                  <button className="modal-close" onClick={() => setShowAvisoModal(null)}><FiX /></button>
                </div>
                <form onSubmit={handleSaveAviso}>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Título del Aviso</label>
                      <input
                        type="text" className="form-input" required placeholder="Ej: Clases de mañana" value={avisoForm.titulo}
                        onChange={e => setAvisoForm({ ...avisoForm, titulo: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contenido</label>
                      <textarea
                        className="form-input" required style={{ minHeight: 120 }} placeholder="Escribe el comunicado aquí..." value={avisoForm.contenido}
                        onChange={e => setAvisoForm({ ...avisoForm, contenido: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline" onClick={() => setShowAvisoModal(null)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Publicar Aviso</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Tarea CRUD */}
          {showTareaModal && (
            <div className="modal-overlay" onClick={() => setShowTareaModal(null)}>
              <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-title">{showTareaModal === 'create' ? 'Crear Tarea' : 'Editar Tarea'}</span>
                  <button className="modal-close" onClick={() => setShowTareaModal(null)}><FiX /></button>
                </div>
                <form onSubmit={handleSaveTarea}>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Título de la Tarea</label>
                      <input
                        type="text" className="form-input" required placeholder="Ej: Práctica de Ecuaciones" value={tareaForm.titulo}
                        onChange={e => setTareaForm({ ...tareaForm, titulo: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Descripción / Indicaciones</label>
                      <textarea
                        className="form-input" required style={{ minHeight: 80 }} placeholder="Escribe las instrucciones..." value={tareaForm.descripcion}
                        onChange={e => setTareaForm({ ...tareaForm, descripcion: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="form-group">
                        <label className="form-label">Fecha de Publicación</label>
                        <input
                          type="datetime-local" className="form-input" required value={tareaForm.fecha_publicacion}
                          onChange={e => setTareaForm({ ...tareaForm, fecha_publicacion: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Fecha Límite</label>
                        <input
                          type="datetime-local" className="form-input" required value={tareaForm.fecha_limite}
                          onChange={e => setTareaForm({ ...tareaForm, fecha_limite: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="form-group">
                        <label className="form-label">Estado</label>
                        <select
                          className="form-select" value={tareaForm.estado}
                          onChange={e => setTareaForm({ ...tareaForm, estado: e.target.value })}
                        >
                          <option value="activa">Activa</option>
                          <option value="inactiva">Inactiva</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Archivo Adjunto (Opcional)</label>
                        <input
                          type="file" className="form-control" style={{ fontSize: '0.8rem' }}
                          onChange={e => setTareaForm({ ...tareaForm, archivo: e.target.files[0] })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline" onClick={() => setShowTareaModal(null)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Guardar Tarea</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Vista Previa de Calificaciones CSV */}
          {showCsvModal && csvPreview && (
            <div className="modal-overlay" onClick={() => setShowCsvModal(false)}>
              <div className="modal" style={{ maxWidth: 700, width: '90%' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-title">Previsualizar Notas Importadas</span>
                  <button className="modal-close" onClick={() => setShowCsvModal(false)}><FiX /></button>
                </div>
                <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  
                  {/* Estadísticas */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: '#f3f4f6', color: 'var(--gray-700)' }}>
                      Total filas: {csvPreview.total_rows}
                    </span>
                    <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: '#e8f5e9', color: '#2e7d32' }}>
                      Filas válidas: {csvPreview.valid_rows}
                    </span>
                    <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: '#ffebee', color: '#c62828' }}>
                      Filas con error: {csvPreview.invalid_rows}
                    </span>
                  </div>

                  {/* Listado de errores si existen */}
                  {csvPreview.errors.length > 0 && (
                    <div style={{ background: '#ffebee', color: '#c62828', padding: 12, borderRadius: 6, marginBottom: 14, fontSize: '0.8rem' }}>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 700 }}>Errores detectados en el archivo:</h4>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {csvPreview.errors.map((err, i) => (
                          <li key={i}>Fila {err.row}: {err.error}</li>
                        ))}
                      </ul>
                      <p style={{ margin: '8px 0 0 0', fontWeight: 600 }}>Corrige los errores en tu archivo CSV antes de continuar.</p>
                    </div>
                  )}

                  {/* Tabla de actualizaciones */}
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '10px 0 6px 0' }}>Notas que serán actualizadas:</h4>
                  <table className="table" style={{ fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>CI</th>
                        <th style={{ textAlign: 'center' }}>Examen 1</th>
                        <th style={{ textAlign: 'center' }}>Examen 2</th>
                        <th style={{ textAlign: 'center' }}>Examen 3</th>
                        <th style={{ textAlign: 'center' }}>Promedio</th>
                        <th style={{ textAlign: 'center' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.updates.map((up, idx) => {
                        const hasDiff = up.nota_1 !== up.nota_1_old || up.nota_2 !== up.nota_2_old || up.nota_3 !== up.nota_3_old
                        return (
                          <tr key={idx} style={{ background: hasDiff ? '#f0f9ff' : 'transparent' }}>
                            <td style={{ fontWeight: 600 }}>{up.nombre}</td>
                            <td style={{ fontFamily: 'monospace' }}>{up.ci}</td>
                            <td style={{ textAlign: 'center' }}>
                              {up.nota_1 ?? '—'} {up.sobreescribir && up.nota_1_old !== null && up.nota_1 !== up.nota_1_old && (
                                <span style={{ color: 'var(--gray-400)', fontSize: '0.7rem' }}> (de {up.nota_1_old})</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {up.nota_2 ?? '—'} {up.sobreescribir && up.nota_2_old !== null && up.nota_2 !== up.nota_2_old && (
                                <span style={{ color: 'var(--gray-400)', fontSize: '0.7rem' }}> (de {up.nota_2_old})</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {up.nota_3 ?? '—'} {up.sobreescribir && up.nota_3_old !== null && up.nota_3 !== up.nota_3_old && (
                                <span style={{ color: 'var(--gray-400)', fontSize: '0.7rem' }}> (de {up.nota_3_old})</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{up.promedio ?? '—'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                padding: '1px 6px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700,
                                background: up.estado_nota === 'APROBADO' ? '#e8f5e9' : up.estado_nota === 'REPROBADO' ? '#ffebee' : '#f3f4f6',
                                color: up.estado_nota === 'APROBADO' ? '#2e7d32' : up.estado_nota === 'REPROBADO' ? '#c62828' : 'var(--gray-500)'
                              }}>
                                {up.estado_nota}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowCsvModal(false)}>Cancelar</button>
                  <button
                    className="btn btn-primary" onClick={handleConfirmarImportacion}
                    disabled={importandoCsv || csvPreview.invalid_rows > 0}
                  >
                    {importandoCsv ? 'Importando...' : 'Confirmar Importación'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        // ════════════════════════════════════════
        // ── Vista General: MIS GRUPOS (Tarjetas) ──
        // ════════════════════════════════════════
        <>
          {/* ── Encabezado ── */}
          <div className="page-header">
            <h1>Mis Grupos</h1>
            <div className="page-header-actions">
              <button className="btn btn-outline btn-sm" onClick={fetchData} title="Actualizar">
                <FiRefreshCw />
              </button>
            </div>
          </div>

          {/* ── Barra de resumen ── */}
          <div style={{
            background: '#1565c0', color: '#fff',
            borderRadius: 10, padding: '14px 22px',
            marginBottom: 24,
            display: 'flex', flexWrap: 'wrap', gap: '6px 32px', alignItems: 'center',
          }}>
            <MetaItem label="Docente"          value={docente.name    || '—'} />
            <MetaItem label="Materia asignada" value={docente.materia || 'Sin asignar'} />
            <MetaItem label="Grupos asignados" value={grupos.length} />
          </div>

          {grupos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)', fontSize: '0.95rem' }}>
              No hay grupos asignados. El coordinador debe realizar la asignación primero.
            </div>
          ) : (
            <>
              {/* ── Tarjetas de grupos ── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 16,
                marginBottom: 28,
              }}>
                {grupos.map((g, i) => {
                  const color = GRUPO_COLORES[i % GRUPO_COLORES.length]
                  const ts    = TURNO_ESTILO[(g.turno || '').toLowerCase()] || { bg: '#f0f0f0', text: '#555' }
                  const diasStr = (g.dias || []).map(d => DIAS_ETIQUETA[d.toLowerCase()] || d).join(', ')

                  return (
                    <div
                      key={g.id}
                      className="card"
                      onClick={() => { setSelectedGrupo(g); setActiveTab('curso') }}
                      style={{
                        padding: '16px 18px',
                        borderTop: `4px solid ${color}`,
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = 'var(--shadow)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <strong style={{ fontSize: '1.05rem', color }}>
                          Grupo {g.codigo}
                        </strong>
                        <span style={{
                          background: ts.bg, color: ts.text,
                          padding: '2px 10px', borderRadius: 20,
                          fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize',
                        }}>
                          {g.turno}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.845rem' }}>
                        <FilaDato label="Materia" valor={g.materia || docente.materia || '—'} />
                        <FilaDato label="Aula" valor={g.aula || '—'} />
                        <FilaDato label="Horario"
                          valor={
                            g.hora_inicio && g.hora_fin
                              ? <span style={{ fontWeight: 700, color }}>{diasStr} {g.hora_inicio} – {g.hora_fin}</span>
                              : '—'
                          }
                        />
                        <FilaDato label="Estudiantes" valor={`${g.estudiantes} alumnos`} />
                      </div>
                      
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '0.76rem', color: '#1565c0', fontWeight: 700 }}>Ingresar Aula Virtual &rarr;</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Horario semanal (colapsable) ── */}
              {slots.length > 0 && (
                <section>
                  <button
                    onClick={() => setHorarioVisible(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', background: 'none', border: 'none',
                      cursor: 'pointer', padding: '8px 0', marginBottom: 4,
                      borderBottom: horarioVisible ? '2px solid #1565c0' : '2px solid #bbdefb',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <span style={{
                      fontSize: '0.9rem', fontWeight: 700,
                      color: '#1565c0', textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}>
                      Mi Horario Semanal
                    </span>
                    <span style={{ marginLeft: 'auto', color: '#1565c0', display: 'flex' }}>
                      {horarioVisible ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </span>
                  </button>

                  {horarioVisible && (
                    <>
                      <div style={{
                        overflowX: 'auto',
                        borderRadius: 10,
                        border: '1px solid #bbdefb',
                        marginTop: 12,
                        boxShadow: '0 2px 8px rgba(21,101,192,0.07)',
                      }}>
                        <table style={{
                          width: '100%', borderCollapse: 'collapse',
                          fontSize: '0.875rem', minWidth: 480,
                        }}>
                          <thead>
                            <tr style={{ background: '#1565c0', color: '#fff' }}>
                              <th style={{ ...thBase, width: 120, background: '#0d47a1' }}>Hora</th>
                              {dias.map(d => (
                                <th key={d} style={thBase}>{DIAS_ETIQUETA[d]}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {slots.map((slot, ri) => (
                              <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f5f9ff' }}>
                                <td style={{
                                  ...tdBase,
                                  fontWeight: 600, color: '#1565c0',
                                  background: ri % 2 === 0 ? '#e8f1fb' : '#dbeafe',
                                  borderRight: '2px solid #c7d9f0',
                                  whiteSpace: 'nowrap', fontSize: '0.82rem',
                                }}>
                                  {slot.hora_inicio} – {slot.hora_fin}
                                </td>
                                {dias.map(d => {
                                  const celda = slot[d]
                                  if (!celda) {
                                    return (
                                      <td key={d} style={{ ...tdBase, color: '#d0d7e2', fontSize: '0.78rem' }}>
                                        —
                                      </td>
                                    )
                                  }
                                  const color = colorMap[celda.codigo] || '#1565c0'
                                  return (
                                    <td key={d} style={tdBase}>
                                      <span style={{ fontWeight: 700, color, fontSize: '0.875rem', display: 'block' }}>
                                        {celda.codigo}
                                      </span>
                                      {celda.aula && (
                                        <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'block', marginTop: 1 }}>
                                          Aula {celda.aula}
                                        </span>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Leyenda */}
                      {grupos.length > 1 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                          {grupos.map((g, i) => (
                            <span key={g.id} style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              fontSize: '0.78rem', color: 'var(--gray-600)',
                            }}>
                              <span style={{
                                width: 10, height: 10, borderRadius: 2,
                                background: GRUPO_COLORES[i % GRUPO_COLORES.length],
                                flexShrink: 0,
                              }} />
                              Grupo {g.codigo}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}
    </Layout>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function MetaItem({ label, value }) {
  return (
    <span style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>
      <span style={{ opacity: 0.72 }}>{label}: </span>
      <strong>{value}</strong>
    </span>
  )
}

function FilaDato({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--gray-500)', fontSize: '0.82rem' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--gray-800)', textAlign: 'right' }}>{valor}</span>
    </div>
  )
}

// ── Estilos base de tabla ─────────────────────────────────────────────────────

const thBase = {
  padding: '10px 14px',
  textAlign: 'center',
  fontWeight: 600,
  fontSize: '0.8rem',
  letterSpacing: '0.3px',
  borderRight: '1px solid rgba(255,255,255,0.15)',
}

const tdBase = {
  padding: '9px 10px',
  textAlign: 'center',
  border: '1px solid #e8f1fb',
  verticalAlign: 'middle',
}
