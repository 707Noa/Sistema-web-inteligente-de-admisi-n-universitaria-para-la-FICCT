import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from '../packages/p1-seguridad-administracion/auth/context/AuthContext'
import '../index.css'

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
