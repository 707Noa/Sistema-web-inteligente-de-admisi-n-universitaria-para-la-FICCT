import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProfileSelector from '../pages/auth/ProfileSelector'
import Login from '../pages/auth/Login'
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'
import PreinscripcionForm from '../pages/preinscripcion/PreinscripcionForm'
import Comprobante from '../pages/preinscripcion/Comprobante'
import Dashboard from '../pages/dashboard/Dashboard'
import Usuarios from '../pages/usuarios/Usuarios'
import Postulantes from '../pages/postulantes/Postulantes'
import PostulantePerfil from '../pages/postulantes/PostulantePerfil'
import Docentes from '../pages/docentes/Docentes'
import Materias from '../pages/materias/Materias'
import Grupos from '../pages/grupos/Grupos'

import ProtectedRoute from '../components/ProtectedRoute'
import Layout from '../components/Layout'

// Mock components for modules in development to prevent route breaking
function ExamenesMock() {
  return (
    <Layout>
      <div className="page-header">
        <h1>Exámenes</h1>
      </div>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ color: 'var(--gray-600)' }}>Módulo de gestión de exámenes en desarrollo.</p>
      </div>
    </Layout>
  )
}

function ReportesMock() {
  return (
    <Layout>
      <div className="page-header">
        <h1>Reportes y Estadísticas</h1>
      </div>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ color: 'var(--gray-600)' }}>Módulo de reportes institucionales en desarrollo. Admite exportaciones a PDF y Excel.</p>
      </div>
    </Layout>
  )
}

function AuditoriaMock() {
  return (
    <Layout>
      <div className="page-header">
        <h1>Auditoría y Logs</h1>
      </div>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ color: 'var(--gray-600)' }}>Módulo de auditoría y rastreo de acciones en desarrollo.</p>
      </div>
    </Layout>
  )
}

function InicioMock({ role }) {
  return (
    <Layout>
      <div className="page-header">
        <h1>Inicio — {role}</h1>
      </div>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ color: 'var(--gray-600)' }}>Bienvenido al portal académico de cursos preuniversitarios para {role}s.</p>
      </div>
    </Layout>
  )
}

// Fallback Page for 404 Not Found
function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 20, textAlign: 'center', background: '#f8fafc' }}>
      <h1 style={{ fontSize: '4rem', margin: 0, color: '#1a3a6b' }}>404</h1>
      <h2 style={{ margin: '10px 0 20px 0', color: '#334155' }}>Página no encontrada</h2>
      <p style={{ color: '#64748b', marginBottom: 30, maxWidth: 400 }}>La página que estás buscando no existe o ha sido movida.</p>
      <a href="/" style={{ padding: '10px 20px', background: '#1a3a6b', color: 'white', textDecoration: 'none', borderRadius: 6, fontWeight: 'bold' }}>
        Volver al inicio
      </a>
    </div>
  )
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<ProfileSelector />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/:perfil/login" element={<Login />} />
      <Route path="/:perfil/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/preinscripcion" element={<PreinscripcionForm />} />
      <Route path="/preinscripcion/comprobante/:id" element={<Comprobante />} />

      {/* Protected Routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
      <Route path="/admin/postulantes" element={<ProtectedRoute><Postulantes /></ProtectedRoute>} />
      <Route path="/admin/postulantes/:id" element={<ProtectedRoute><PostulantePerfil /></ProtectedRoute>} />
      <Route path="/admin/docentes" element={<ProtectedRoute><Docentes /></ProtectedRoute>} />
      <Route path="/admin/materias" element={<ProtectedRoute><Materias /></ProtectedRoute>} />
      <Route path="/admin/grupos" element={<ProtectedRoute><Grupos /></ProtectedRoute>} />
      <Route path="/admin/examenes" element={<ProtectedRoute><ExamenesMock /></ProtectedRoute>} />
      <Route path="/admin/reportes" element={<ProtectedRoute><ReportesMock /></ProtectedRoute>} />
      <Route path="/admin/auditoria" element={<ProtectedRoute><AuditoriaMock /></ProtectedRoute>} />

      <Route path="/coordinador/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/autoridad/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      <Route path="/docente/inicio" element={<ProtectedRoute><InicioMock role="Docente" /></ProtectedRoute>} />
      <Route path="/postulante/inicio" element={<ProtectedRoute><InicioMock role="Postulante" /></ProtectedRoute>} />

      {/* Fallback Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
