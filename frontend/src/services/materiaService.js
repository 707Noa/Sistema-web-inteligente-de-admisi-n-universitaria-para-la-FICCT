import api from './api'
const p = '/admin'
export const getMaterias = (params) => api.get(`${p}/materias`, { params })
export const getMateria = (id) => api.get(`${p}/materias/${id}`)
export const createMateria = (data) => api.post(`${p}/materias`, data)
export const updateMateria = (id, data) => api.put(`${p}/materias/${id}`, data)
export const deleteMateria = (id) => api.delete(`${p}/materias/${id}`)
export const getAllMaterias = () => api.get('/materias-all')
