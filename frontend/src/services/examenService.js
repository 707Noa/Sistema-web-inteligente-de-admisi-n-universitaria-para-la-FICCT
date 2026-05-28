import api from './api'
const p = '/admin'
export const getExamenes = (params) => api.get(`${p}/examenes`, { params })
export const getExamen = (id) => api.get(`${p}/examenes/${id}`)
export const createExamen = (data) => api.post(`${p}/examenes`, data)
export const updateExamen = (id, data) => api.put(`${p}/examenes/${id}`, data)
export const deleteExamen = (id) => api.delete(`${p}/examenes/${id}`)
