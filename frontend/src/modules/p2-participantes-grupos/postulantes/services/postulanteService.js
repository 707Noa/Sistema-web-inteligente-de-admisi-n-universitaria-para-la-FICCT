import api from '@/shared/services/api'
const p = '/admin'
export const getPostulantes = (params) => api.get(`${p}/postulantes`, { params })
export const getPostulante = (id) => api.get(`${p}/postulantes/${id}`)
export const createPostulante = (data) => api.post(`${p}/postulantes`, data)
export const updatePostulante = (id, data) => api.put(`${p}/postulantes/${id}`, data)
export const deletePostulante = (id) => api.delete(`${p}/postulantes/${id}`)
export const getPostulantePerfil        = ()       => api.get('/postulante/perfil')
export const getPostulanteHorario       = ()       => api.get('/postulante/horario')
export const getPostulanteCalificaciones = ()      => api.get('/postulante/calificaciones')

// Gestión de preinscripciones (admin) — solo muestra PREINSCRITO e INSCRITO
export const getPreinscripciones = (params) => api.get('/admin/preinscripciones', { params })
export const generarCuenta = (id) => api.post(`/preinscripciones/${id}/generar-cuenta`)
export const generarCuentasMasivo = () => api.post('/preinscripciones/generar-cuentas')
export const importarPostulantesCsv = (formData) => api.post('/admin/postulantes/importar-csv', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})

export const listarPostulantes = ({ search, carrera, estado, ordenNombre, page, perPage }) =>
  api.get(`${p}/postulantes`, {
    params: {
      search,
      carrera,
      estado,
      orden_nombre: ordenNombre,
      page,
      per_page: perPage,
    }
  })

export const crearCuentasPostulantes = ({ postulanteIds, filtros }) =>
  api.post(`${p}/postulantes/crear-cuentas`, {
    postulante_ids: postulanteIds,
    filtros,
  })

export const eliminarPostulantesMasivo = (postulanteIds) =>
  api.post(`${p}/postulantes/eliminar-masivo`, {
    postulante_ids: postulanteIds,
  })

export const eliminarPostulantesMultiple = (ids) =>
  api.post(`${p}/postulantes/eliminar-multiple`, { ids })
