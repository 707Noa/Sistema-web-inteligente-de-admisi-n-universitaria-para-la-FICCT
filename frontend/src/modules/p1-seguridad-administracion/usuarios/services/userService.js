import api from '@/shared/services/api'

const prefix = '/admin'

export const getUsuarios = (params) => api.get(`${prefix}/usuarios`, { params })
export const getUsuario = (id) => api.get(`${prefix}/usuarios/${id}`)
export const createUsuario = (data) => api.post(`${prefix}/usuarios`, data)
export const updateUsuario = (id, data) => api.put(`${prefix}/usuarios/${id}`, data)
export const deleteUsuario = (id) => api.delete(`${prefix}/usuarios/${id}`)
export const activateUsuario = (id) => api.put(`${prefix}/usuarios/${id}/activate`)
export const deactivateUsuario = (id) => api.put(`${prefix}/usuarios/${id}/deactivate`)
export const changePassword = (id, data) => api.put(`${prefix}/usuarios/${id}/change-password`, data)
export const getRoles = () => api.get('/roles')

// Requisitos académicos del docente (identificado por user_id)
export const getDocenteRequisitos    = (userId) => api.get(`/admin/docentes/usuario/${userId}/requisitos`)
export const updateDocenteRequisitos = (userId, data) => api.put(`/admin/docentes/usuario/${userId}/requisitos`, data)
