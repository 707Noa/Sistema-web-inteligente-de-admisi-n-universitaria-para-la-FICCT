import api from '@/shared/services/api'

const BASE = '/docente'

export const getPerfil = () => api.get(`${BASE}/perfil`)
export const getMisGrupos = () => api.get(`${BASE}/mis-grupos`)
export const getMisMaterias = () => api.get(`${BASE}/mis-materias`)
export const getMisEstudiantes = (params) => api.get(`${BASE}/mis-estudiantes`, { params })
export const getNotas = (params) => api.get(`${BASE}/notas`, { params })
export const guardarNotas = (data) => api.post(`${BASE}/notas`, data)
export const actualizarNota = (id, data) => api.put(`${BASE}/notas/${id}`, data)
