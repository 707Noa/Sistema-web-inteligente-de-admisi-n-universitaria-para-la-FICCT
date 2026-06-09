import api from '@/shared/services/api'

const BASE = '/p4/reportes-ia'

export const getTiposDisponibles = () =>
  api.get(`${BASE}/tipos-disponibles`)

export const interpretarSolicitud = (texto) =>
  api.post(`${BASE}/interpretar`, { texto })

export const getVistaPrevia = (tipoReporte, filtros = {}) =>
  api.post(`${BASE}/vista-previa`, { tipo_reporte: tipoReporte, filtros })

export const generarReporte = (tipoReporte, formato, filtros = {}) =>
  api.post(
    `${BASE}/generar`,
    { tipo_reporte: tipoReporte, formato, filtros },
    { responseType: 'blob' }
  )
