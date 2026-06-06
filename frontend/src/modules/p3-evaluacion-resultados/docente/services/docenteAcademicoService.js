import api from '@/shared/services/api'

const BASE = '/docente'

// ── Perfil ──
export const getDocentePerfil = () => api.get(`${BASE}/perfil`)

// ── Horario ──
export const getDocenteHorario = () => api.get(`${BASE}/horario`)

// ── Grupos ──
export const getDocenteGrupos   = ()         => api.get(`${BASE}/grupos`)
export const getEstudiantesGrupo = (grupoId) => api.get(`${BASE}/grupos/${grupoId}/estudiantes`)
export const getMisGrupos        = ()         => api.get(`${BASE}/mis-grupos`)

// ── Asistencia ──
export const getAsistencia = (params) => api.get(`${BASE}/asistencia`, { params })
export const guardarAsistencia = (data) => api.post(`${BASE}/asistencia`, data)

// ── Calificaciones ──
export const guardarCalificacion = (data) => api.post(`${BASE}/calificaciones`, data)

// ── Reportes CSV ──
export const exportarCalificaciones = (params) => {
  const q = new URLSearchParams(params).toString()
  window.open(`${api.defaults.baseURL}${BASE}/reporte/calificaciones?${q}`)
}

export const exportarAsistencia = (params) => {
  const q = new URLSearchParams(params).toString()
  window.open(`${api.defaults.baseURL}${BASE}/reporte/asistencia?${q}`)
}
