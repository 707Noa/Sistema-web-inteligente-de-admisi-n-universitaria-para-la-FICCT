import api from '@/shared/services/api'

const BASE = '/coordinador'

function _descargarBlob(response, nombreArchivo) {
  const contentDisposition = response.headers['content-disposition'] || ''
  const match = contentDisposition.match(/filename[^;=\n]*=['"]?([^'"\n;]+)/)
  const filename = match ? match[1] : nombreArchivo
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

// ── Perfil ──
export const getPerfil = () => api.get(`${BASE}/perfil`)
export const getDashboard = () => api.get(`${BASE}/dashboard`)

// ── Docentes ──
export const getDocentesAcademicos = (params) => api.get(`${BASE}/docentes`, { params })
export const getDocenteAcademico   = (id)     => api.get(`${BASE}/docentes/${id}`)
export const getMaterias           = ()        => api.get(`${BASE}/docentes/materias`)
export const asignarMateria        = (id, data)=> api.post(`${BASE}/docentes/${id}/asignar-materia`, data)
export const getDocenteCargaHoraria = (id)     => api.get(`${BASE}/docentes/${id}/carga-horaria`)

// ── Grupos ──
export const getGrupos          = (params) => api.get(`${BASE}/grupos`, { params })
export const getGrupo           = (id)     => api.get(`${BASE}/grupos/${id}`)
export const createGrupo        = (data)   => api.post(`${BASE}/grupos`, data)
export const updateGrupo        = (id, d)  => api.put(`${BASE}/grupos/${id}`, d)
export const deleteGrupo        = (id)     => api.delete(`${BASE}/grupos/${id}`)
export const toggleEstadoGrupo  = (id)     => api.patch(`${BASE}/grupos/${id}/toggle-estado`)
export const getGrupoEstudiantes = (id)     => api.get(`${BASE}/grupos/${id}/estudiantes`)
export const calcularGrupos     = (totalInscritos) => api.post(`${BASE}/grupos/calcular`, { total_inscritos: totalInscritos })
export const generarGruposAuto  = ()       => api.post(`${BASE}/grupos/auto-generar`)

// ── Asignaciones ──
export const getStatsAsignacion        = ()      => api.get(`${BASE}/asignacion/stats`)
export const asignarPostulantesAuto    = ()      => api.post(`${BASE}/asignacion/postulantes-auto`)
export const asignarDocentesAuto       = ()      => api.post(`${BASE}/asignacion/docentes-auto`)
export const postulantesEnGrupo        = (gid)   => api.get(`${BASE}/asignacion/grupo/${gid}/postulantes`)
export const getDocentesDisponibles    = (data)  => api.post(`${BASE}/asignacion/docentes-disponibles`, data)
export const asignarDocente            = (data)  => api.post(`${BASE}/asignacion/docente`, data)
export const asignarDocenteAGrupo      = (grupoId, data) => api.post(`${BASE}/${grupoId}/asignar-docente`, data)
export const getAsignaciones           = (params)=> api.get(`${BASE}/asignacion/asignaciones`, { params })
export const getPostulantesSinGrupo    = (params)=> api.get(`${BASE}/postulantes-sin-grupo`, { params })
export const asignarEstudiantes        = (grupoId, postulanteIds) => api.post(`${BASE}/grupos/${grupoId}/asignar-estudiantes`, { postulante_ids: postulanteIds })

// ── Cupos por Carrera ──
export const getCuposCarrera       = (params) => api.get(`${BASE}/cupos-carrera`, { params })
export const crearCupoCarrera      = (data)   => api.post(`${BASE}/cupos-carrera`, data)
export const actualizarCupoCarrera = (id, d)  => api.put(`${BASE}/cupos-carrera/${id}`, d)
export const toggleCupoEstado      = (id)     => api.patch(`${BASE}/cupos-carrera/${id}/toggle-estado`)
export const revertirCupos         = ()       => api.post(`${BASE}/cupos-carrera/revertir`)

// ── Reporte ──
export const getReporteHorarios = (params) => api.get(`${BASE}/reporte/horarios`, { params })
export const exportarHorariosCsv = async (params) => {
  const response = await api.get(`${BASE}/reporte/horarios/csv`, { params, responseType: 'blob' })
  _descargarBlob(response, 'horarios.csv')
}

// ── Admisión Final ──
export const getGestionesAdmision  = (params) => api.get(`${BASE}/admision/gestiones`, { params })
export const getResultadosAdmision = (params) => api.get(`${BASE}/admision/resultados`, { params })
export const procesarAdmision      = (data)   => api.post(`${BASE}/admision/procesar`, data)
export const exportarAdmisionCsv   = async (params) => {
  const response = await api.get(`${BASE}/admision/exportar-csv`, { params, responseType: 'blob' })
  _descargarBlob(response, 'admision.csv')
}

// ── Postulantes ──
export const getPostulantesCoordinador = (params) => api.get(`${BASE}/postulantes`, { params })
export const getPostulanteCoordinador = (id) => api.get(`${BASE}/postulantes/${id}`)
export const updatePostulanteCoordinador = (id, data) => api.put(`${BASE}/postulantes/${id}`, data)
export const patchRequisitosCoordinador = (id, completos) => api.patch(`${BASE}/postulantes/${id}/requisitos`, { requisitos_completos: completos })
export const deletePostulanteCoordinador = (id) => api.delete(`${BASE}/postulantes/${id}`)
export const eliminarPostulantesMultipleCoordinador = (ids) => api.post(`${BASE}/postulantes/eliminar-multiple`, { ids })
export const exportarPostulantesCsv = async (params) => {
  const response = await api.get(`${BASE}/postulantes/export/csv`, { params, responseType: 'blob' })
  _descargarBlob(response, 'postulantes.csv')
}
