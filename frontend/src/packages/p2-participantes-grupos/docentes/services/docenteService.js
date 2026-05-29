import api from '@/shared/services/api'
const p = '/admin'
export const getDocentes = (params) => api.get(`${p}/docentes`, { params })
export const getDocente = (id) => api.get(`${p}/docentes/${id}`)
export const createDocente = (data) => api.post(`${p}/docentes`, data)
export const updateDocente = (id, data) => api.put(`${p}/docentes/${id}`, data)
export const deleteDocente = (id) => api.delete(`${p}/docentes/${id}`)
