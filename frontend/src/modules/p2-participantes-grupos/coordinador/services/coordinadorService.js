import api from '@/shared/services/api'

const BASE = '/coordinador'

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
export const toggleEstadoGrupo  = (id)     => api.patch(`${BASE}/grupos/${id}/toggle-estado`)
export const getGrupoEstudiantes = (id)     => api.get(`${BASE}/grupos/${id}/estudiantes`)
export const calcularGrupos     = (totalInscritos) => api.post(`${BASE}/grupos/calcular`, { total_inscritos: totalInscritos })

// ── Asignaciones ──
export const asignarPostulantesAuto    = ()      => api.post(`${BASE}/asignacion/postulantes-auto`)
export const postulantesEnGrupo        = (gid)   => api.get(`${BASE}/asignacion/grupo/${gid}/postulantes`)
export const getDocentesDisponibles    = (data)  => api.post(`${BASE}/asignacion/docentes-disponibles`, data)
export const asignarDocente            = (data)  => api.post(`${BASE}/asignacion/docente`, data)
export const asignarDocenteAGrupo      = (grupoId, data) => api.post(`${BASE}/${grupoId}/asignar-docente`, data)
export const getAsignaciones           = (params)=> api.get(`${BASE}/asignacion/asignaciones`, { params })
export const getPostulantesSinGrupo    = (params)=> api.get(`${BASE}/postulantes-sin-grupo`, { params })
export const asignarEstudiantes        = (grupoId, postulanteIds) => api.post(`${BASE}/grupos/${grupoId}/asignar-estudiantes`, { postulante_ids: postulanteIds })

// ── Reporte ──
export const getReporteHorarios = (params) => api.get(`${BASE}/reporte/horarios`, { params })
export const exportarHorariosCsv = (params) => {
  const q = new URLSearchParams(params).toString()
  window.open(`${api.defaults.baseURL}${BASE}/reporte/horarios/csv?${q}`)
}

// ── Postulantes ──
export const getPostulantesCoordinador = (params) => api.get(`${BASE}/postulantes`, { params })
export const getPostulanteCoordinador = (id) => api.get(`${BASE}/postulantes/${id}`)
export const updatePostulanteCoordinador = (id, data) => api.put(`${BASE}/postulantes/${id}`, data)
export const patchRequisitosCoordinador = (id, completos) => api.patch(`${BASE}/postulantes/${id}/requisitos`, { requisitos_completos: completos })
export const deletePostulanteCoordinador = (id) => api.delete(`${BASE}/postulantes/${id}`)
export const eliminarPostulantesMultipleCoordinador = (ids) => api.post(`${BASE}/postulantes/eliminar-multiple`, { ids })
export const exportarPostulantesCsv = (params) => {
  const q = new URLSearchParams(params).toString()
  window.open(`${api.defaults.baseURL}${BASE}/postulantes/export/csv?${q}`)
}
