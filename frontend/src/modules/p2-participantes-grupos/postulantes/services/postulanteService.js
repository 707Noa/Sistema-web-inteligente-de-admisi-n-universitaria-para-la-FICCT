import api from '@/shared/services/api'
const p = '/admin'
export const getPostulantes = (params) => api.get(`${p}/postulantes`, { params })
export const getPostulante = (id) => api.get(`${p}/postulantes/${id}`)
export const createPostulante = (data) => api.post(`${p}/postulantes`, data)
export const updatePostulante = (id, data) => api.put(`${p}/postulantes/${id}`, data)
export const deletePostulante = (id) => api.delete(`${p}/postulantes/${id}`)
export const getPostulantePerfil = () => api.get('/postulante/perfil')

// Gestión de preinscripciones (admin) — solo muestra PREINSCRITO e INSCRITO
export const getPreinscripciones = (params) => api.get('/admin/preinscripciones', { params })
export const generarCuenta = (id) => api.post(`/preinscripciones/${id}/generar-cuenta`)
export const generarCuentasMasivo = () => api.post('/preinscripciones/generar-cuentas')
export const importarPostulantesCsv = (formData) => api.post('/admin/postulantes/importar-csv', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
