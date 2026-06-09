import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
})

// Request interceptor to dynamically inject token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      const pathname = window.location.pathname
      // Solo redirigir a '/' si el usuario estaba en una página protegida.
      // Las páginas públicas de auth no deben causar redirección.
      const isPublicPage =
        pathname === '/' ||
        pathname.includes('/login') ||
        pathname.includes('/forgot-password') ||
        pathname.includes('/reset-password') ||
        pathname.includes('/preinscripcion') ||
        pathname.includes('/change-password')
      if (!isPublicPage) {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export default api
