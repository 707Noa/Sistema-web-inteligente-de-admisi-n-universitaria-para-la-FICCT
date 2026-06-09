import api from '@/shared/services/api'

const BASE = '/docente'

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
export const exportarCalificaciones = async (params) => {
  const response = await api.get(`${BASE}/reporte/calificaciones`, { params, responseType: 'blob' })
  _descargarBlob(response, 'calificaciones.csv')
}

export const exportarAsistencia = async (params) => {
  const response = await api.get(`${BASE}/reporte/asistencia`, { params, responseType: 'blob' })
  _descargarBlob(response, 'asistencia.csv')
}
