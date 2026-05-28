import api from './api'
const p = '/admin'
export const getDashboard = () => api.get(`${p}/dashboard`)
