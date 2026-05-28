import api from './api'
const p = '/admin'
export const getPostulantes = (params) => api.get(`${p}/postulantes`, { params })
export const getPostulante = (id) => api.get(`${p}/postulantes/${id}`)
export const createPostulante = (data) => api.post(`${p}/postulantes`, data)
export const updatePostulante = (id, data) => api.put(`${p}/postulantes/${id}`, data)
export const deletePostulante = (id) => api.delete(`${p}/postulantes/${id}`)
export const getPostulantePerfil = () => api.get('/postulante/perfil')
