import api from '@/shared/services/api'

const BASE = '/autoridad'

export const getPerfil = () => api.get(`${BASE}/perfil`)
export const getDashboard = () => api.get(`${BASE}/dashboard`)
export const getGrupos = () => api.get(`${BASE}/grupos`)
export const getDocentesAsignados = () => api.get(`${BASE}/docentes-asignados`)
export const getHorarios = (params) => api.get(`${BASE}/horarios`, { params })
export const getEstadisticas = () => api.get(`${BASE}/estadisticas`)
