import api from '@/shared/services/api'
const p = '/admin'
export const getDashboard = () => api.get(`${p}/dashboard`)
