import api from '@/shared/services/api'

const BASE = '/coordinador'

// ── Docentes ──
export const getDocentesAcademicos = (params) => api.get(`${BASE}/docentes`, { params })
export const getDocenteAcademico   = (id)     => api.get(`${BASE}/docentes/${id}`)
export const getMaterias           = ()        => api.get(`${BASE}/docentes/materias`)
export const asignarMateria        = (id, data)=> api.post(`${BASE}/docentes/${id}/asignar-materia`, data)

// ── Grupos ──
export const getGrupos          = (params) => api.get(`${BASE}/grupos`, { params })
export const getGrupo           = (id)     => api.get(`${BASE}/grupos/${id}`)
export const createGrupo        = (data)   => api.post(`${BASE}/grupos`, data)
export const updateGrupo        = (id, d)  => api.put(`${BASE}/grupos/${id}`, d)
export const toggleEstadoGrupo  = (id)     => api.patch(`${BASE}/grupos/${id}/toggle-estado`)

// ── Asignaciones ──
export const asignarPostulantesAuto    = ()      => api.post(`${BASE}/asignacion/postulantes-auto`)
export const postulantesEnGrupo        = (gid)   => api.get(`${BASE}/asignacion/grupo/${gid}/postulantes`)
export const getDocentesDisponibles    = (data)  => api.post(`${BASE}/asignacion/docentes-disponibles`, data)
export const asignarDocente            = (data)  => api.post(`${BASE}/asignacion/docente`, data)
export const getAsignaciones           = (params)=> api.get(`${BASE}/asignacion/asignaciones`, { params })

// ── Reporte ──
export const getReporteHorarios = (params) => api.get(`${BASE}/reporte/horarios`, { params })
export const exportarHorariosCsv = (params) => {
  const q = new URLSearchParams(params).toString()
  window.open(`${api.defaults.baseURL}${BASE}/reporte/horarios/csv?${q}`)
}
