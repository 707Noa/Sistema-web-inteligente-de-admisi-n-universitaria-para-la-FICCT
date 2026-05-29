import api from '@/shared/services/api'
const p = '/admin'
export const getGrupos = (params) => api.get(`${p}/grupos`, { params })
export const getGrupo = (id) => api.get(`${p}/grupos/${id}`)
export const createGrupo = (data) => api.post(`${p}/grupos`, data)
export const updateGrupo = (id, data) => api.put(`${p}/grupos/${id}`, data)
export const deleteGrupo = (id) => api.delete(`${p}/grupos/${id}`)
export const asignarPostulante = (grupoId, data) => api.post(`${p}/grupos/${grupoId}/asignar-postulante`, data)
export const autoGenerar = (data) => api.post(`${p}/grupos/auto-generar`, data)
