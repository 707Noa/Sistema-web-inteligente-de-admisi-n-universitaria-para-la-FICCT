import api from './api'
const p = '/admin'
export const getReportePostulantes = (params) => api.get(`${p}/reportes/postulantes`, { params })
export const getReporteAprobados = (params) => api.get(`${p}/reportes/aprobados`, { params })
export const getReporteReprobados = (params) => api.get(`${p}/reportes/reprobados`, { params })
export const getReportePromedios = () => api.get(`${p}/reportes/promedios`)
export const getReporteGrupos = () => api.get(`${p}/reportes/grupos`)
export const getReporteDocentes = () => api.get(`${p}/reportes/docentes-por-grupo`)
export const getAuditorias = (params) => api.get(`${p}/auditorias`, { params })
export const getPreinscripciones = (params) => api.get(`${p}/preinscripciones`, { params })
export const crearPreinscripcion = (data) => api.post('/preinscripciones', data)
export const getPreinscripcion = (id) => api.get(`/preinscripciones/${id}`)
export const getCarrerasDisponibles = () => api.get('/carreras-disponibles')
