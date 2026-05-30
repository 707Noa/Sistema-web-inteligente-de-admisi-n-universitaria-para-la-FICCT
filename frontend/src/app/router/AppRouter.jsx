import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProfileSelector from '@/modules/p1-seguridad-administracion/auth/pages/ProfileSelector'
import Login from '@/modules/p1-seguridad-administracion/auth/pages/Login'
import ForgotPassword from '@/modules/p1-seguridad-administracion/auth/pages/ForgotPassword'
import ResetPassword from '@/modules/p1-seguridad-administracion/auth/pages/ResetPassword'
import PreinscripcionForm from '@/modules/p2-participantes-grupos/preinscripcion/pages/PreinscripcionForm'
import Comprobante from '@/modules/p2-participantes-grupos/preinscripcion/pages/Comprobante'
import Dashboard from '@/modules/p4-reportes-monitoreo-auditoria/dashboard/pages/Dashboard'
import Usuarios from '@/modules/p1-seguridad-administracion/usuarios/pages/Usuarios'
import Postulantes from '@/modules/p2-participantes-grupos/postulantes/pages/Postulantes'
import PostulantePerfil from '@/modules/p2-participantes-grupos/postulantes/pages/PostulantePerfil'
import PreinscripcionesList from '@/modules/p2-participantes-grupos/postulantes/pages/PreinscripcionesList'
import Docentes from '@/modules/p2-participantes-grupos/docentes/pages/Docentes'
import Materias from '@/modules/p2-participantes-grupos/materias/pages/Materias'
import Grupos from '@/modules/p2-participantes-grupos/grupos/pages/Grupos'

import PrivateRoute from './PrivateRoute'
import Layout from '@/layouts/Layout'

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
      <Route path="/admin/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/admin/usuarios" element={<PrivateRoute><PreinscripcionesList /></PrivateRoute>} />
      <Route path="/admin/postulantes" element={<PrivateRoute><Postulantes /></PrivateRoute>} />
      <Route path="/admin/preinscripciones" element={<PrivateRoute><PreinscripcionesList /></PrivateRoute>} />
      <Route path="/admin/postulantes/:id" element={<PrivateRoute><PostulantePerfil /></PrivateRoute>} />
      <Route path="/admin/docentes" element={<PrivateRoute><Docentes /></PrivateRoute>} />
      <Route path="/admin/materias" element={<PrivateRoute><Materias /></PrivateRoute>} />
      <Route path="/admin/grupos" element={<PrivateRoute><Grupos /></PrivateRoute>} />
      <Route path="/admin/examenes" element={<PrivateRoute><ExamenesMock /></PrivateRoute>} />
      <Route path="/admin/reportes" element={<PrivateRoute><ReportesMock /></PrivateRoute>} />
      <Route path="/admin/auditoria" element={<PrivateRoute><AuditoriaMock /></PrivateRoute>} />

      <Route path="/coordinador/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/autoridad/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

      <Route path="/docente/inicio" element={<PrivateRoute><InicioMock role="Docente" /></PrivateRoute>} />
      <Route path="/postulante/inicio" element={<PrivateRoute><InicioMock role="Postulante" /></PrivateRoute>} />

      {/* Fallback Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
