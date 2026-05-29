import React, { createContext, useState, useContext, useEffect } from 'react'
import api from '@/shared/services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const activeToken = localStorage.getItem('token')
    if (activeToken && activeToken !== 'undefined' && activeToken !== 'null') {
      api.defaults.headers.common['Authorization'] = `Bearer ${activeToken}`
      checkAuth()
    } else {
      localStorage.removeItem('token')
      setUser(null)
      setToken(null)
      setLoading(false)
    }
  }, [])

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data.user || res.data)
    } catch {
      localStorage.removeItem('token')
      setUser(null)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    const res = await api.post('/auth/login', credentials)
    const { user: userData, token: newToken, redirect } = res.data
    setUser(userData)
    setToken(newToken)
    localStorage.setItem('token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    return { user: userData, redirect }
  }

  const logout = async () => {
    const activeToken = localStorage.getItem('token')
    if (activeToken && activeToken !== 'undefined' && activeToken !== 'null') {
      try {
        await api.post('/auth/logout')
      } catch (error) {
        console.warn("No se pudo cerrar sesión en backend.")
      }
    }
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
