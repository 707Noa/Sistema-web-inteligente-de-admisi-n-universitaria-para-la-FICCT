import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProfileSelector from '@/modules/p1-seguridad-administracion/auth/pages/ProfileSelector'
import Login from '@/modules/p1-seguridad-administracion/auth/pages/Login'
import ForgotPassword from '@/modules/p1-seguridad-administracion/auth/pages/ForgotPassword'
import ResetPassword from '@/modules/p1-seguridad-administracion/auth/pages/ResetPassword'
import ChangePassword from '@/modules/p1-seguridad-administracion/auth/pages/ChangePassword'
import Perfil from '@/modules/p1-seguridad-administracion/auth/pages/Perfil'
import PreinscripcionForm from '@/modules/p2-participantes-grupos/preinscripcion/pages/PreinscripcionForm'
import Comprobante from '@/modules/p2-participantes-grupos/preinscripcion/pages/Comprobante'
import PagoConfirmado from '@/modules/p2-participantes-grupos/preinscripcion/pages/PagoConfirmado'
import Dashboard from '@/modules/p4-reportes-monitoreo-auditoria/dashboard/pages/Dashboard'
import Usuarios from '@/modules/p1-seguridad-administracion/usuarios/pages/Usuarios'
import Postulantes from '@/modules/p2-participantes-grupos/postulantes/pages/Postulantes'
import PostulantePerfil from '@/modules/p2-participantes-grupos/postulantes/pages/PostulantePerfil'
import PreinscripcionesList from '@/modules/p2-participantes-grupos/postulantes/pages/PreinscripcionesList'
import Docentes from '@/modules/p2-participantes-grupos/docentes/pages/Docentes'
import Materias from '@/modules/p2-participantes-grupos/materias/pages/Materias'
import Grupos from '@/modules/p2-participantes-grupos/grupos/pages/Grupos'
import DocentesAcademicos from '@/modules/p2-participantes-grupos/coordinador/pages/DocentesAcademicos'
import AdministrarGrupos from '@/modules/p2-participantes-grupos/coordinador/pages/AdministrarGrupos'
import ProcesarAsignacion from '@/modules/p2-participantes-grupos/coordinador/pages/ProcesarAsignacion'
import ReporteHorarios from '@/modules/p2-participantes-grupos/coordinador/pages/ReporteHorarios'
import CoordinadorDashboard from '@/modules/p2-participantes-grupos/coordinador/pages/CoordinadorDashboard'
import CoordinadorPerfil from '@/modules/p2-participantes-grupos/coordinador/pages/CoordinadorPerfil'
import CoordinadorPostulantes from '@/modules/p2-participantes-grupos/coordinador/pages/CoordinadorPostulantes'
import CuposCarrera from '@/modules/p2-participantes-grupos/coordinador/pages/CuposCarrera'
import AdmisionFinal from '@/modules/p2-participantes-grupos/coordinador/pages/AdmisionFinal'

// Páginas del Postulante (Portal)
import PostulanteMiPerfil from '@/modules/p2-participantes-grupos/postulantes/pages/PostulanteMiPerfil'
import PostulanteMiHorario from '@/modules/p2-participantes-grupos/postulantes/pages/PostulanteMiHorario'
import PostulanteMisCalificaciones from '@/modules/p2-participantes-grupos/postulantes/pages/PostulanteMisCalificaciones'

// Páginas del Docente (Portal p3)
import DocenteMiPerfil from '@/modules/p3-evaluacion-resultados/docente/pages/MiPerfil'
import DocenteMisGrupos from '@/modules/p3-evaluacion-resultados/docente/pages/MisGrupos'
import DocenteAsistencia from '@/modules/p3-evaluacion-resultados/docente/pages/Asistencia'
import DocenteCalificaciones from '@/modules/p3-evaluacion-resultados/docente/pages/Calificaciones'
import DocenteReportes from '@/modules/p3-evaluacion-resultados/docente/pages/Reportes'

// Docente Pages
import MisGrupos from '@/modules/p2-participantes-grupos/docente/pages/MisGrupos'
import MisMaterias from '@/modules/p2-participantes-grupos/docente/pages/MisMaterias'
import MisEstudiantes from '@/modules/p2-participantes-grupos/docente/pages/MisEstudiantes'
import RegistroNotas from '@/modules/p2-participantes-grupos/docente/pages/RegistroNotas'

// Autoridad Pages
import DashboardAutoridad from '@/modules/p2-participantes-grupos/autoridad/pages/DashboardAutoridad'
import GruposAutoridad from '@/modules/p2-participantes-grupos/autoridad/pages/GruposAutoridad'
import DocentesAsignados from '@/modules/p2-participantes-grupos/autoridad/pages/DocentesAsignados'
import EstadisticasAutoridad from '@/modules/p2-participantes-grupos/autoridad/pages/EstadisticasAutoridad'
import AlertasAutoridad from '@/modules/p2-participantes-grupos/autoridad/pages/AlertasAutoridad'
import ReportesIAPanel from '@/modules/p4-reportes-monitoreo-auditoria/ia-voz/pages/ReportesIAPanel'

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
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
      <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
      <Route path="/preinscripcion" element={<PreinscripcionForm />} />
      <Route path="/preinscripcion/comprobante/:id" element={<Comprobante />} />
      <Route path="/preinscripcion/pago-confirmado" element={<PagoConfirmado />} />
      <Route path="/pago/exitoso" element={<PagoConfirmado />} />

      {/* Protected Routes */}
      <Route path="/admin/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/admin/usuarios" element={<PrivateRoute><Usuarios /></PrivateRoute>} />
      <Route path="/admin/postulantes" element={<PrivateRoute><Postulantes /></PrivateRoute>} />
      <Route path="/admin/preinscripciones" element={<PrivateRoute><PreinscripcionesList /></PrivateRoute>} />
      <Route path="/admin/postulantes/:id" element={<PrivateRoute><PostulantePerfil /></PrivateRoute>} />
      <Route path="/admin/docentes" element={<PrivateRoute><Docentes /></PrivateRoute>} />
      <Route path="/admin/materias" element={<PrivateRoute><Materias /></PrivateRoute>} />
      <Route path="/admin/grupos" element={<PrivateRoute><Grupos /></PrivateRoute>} />
      <Route path="/admin/examenes" element={<PrivateRoute><ExamenesMock /></PrivateRoute>} />
      <Route path="/admin/reportes" element={<PrivateRoute><ReportesMock /></PrivateRoute>} />
      <Route path="/admin/auditoria" element={<PrivateRoute><AuditoriaMock /></PrivateRoute>} />

      {/* Rutas Coordinador Académico */}
      <Route path="/coordinador/dashboard"        element={<PrivateRoute><CoordinadorDashboard /></PrivateRoute>} />
      <Route path="/coordinador/perfil"           element={<PrivateRoute><CoordinadorPerfil /></PrivateRoute>} />
      <Route path="/coordinador/postulantes"      element={<PrivateRoute><CoordinadorPostulantes /></PrivateRoute>} />
      <Route path="/coordinador/postulantes/:id"  element={<PrivateRoute><PostulantePerfil /></PrivateRoute>} />
      <Route path="/coordinador/docentes"         element={<PrivateRoute><DocentesAcademicos /></PrivateRoute>} />
      <Route path="/coordinador/grupos"           element={<PrivateRoute><AdministrarGrupos /></PrivateRoute>} />
      <Route path="/coordinador/asignacion"       element={<PrivateRoute><ProcesarAsignacion /></PrivateRoute>} />
      <Route path="/coordinador/reporte-horarios" element={<PrivateRoute><ReporteHorarios /></PrivateRoute>} />
      <Route path="/coordinador/cupos-carrera"    element={<PrivateRoute><CuposCarrera /></PrivateRoute>} />
      <Route path="/coordinador/admision-final"   element={<PrivateRoute><AdmisionFinal /></PrivateRoute>} />
      <Route path="/coordinador/reportes-ia"      element={<PrivateRoute><ReportesIAPanel /></PrivateRoute>} />

      {/* Rutas Autoridad Académica */}
      <Route path="/autoridad/dashboard"    element={<PrivateRoute><DashboardAutoridad /></PrivateRoute>} />
      <Route path="/autoridad/grupos"       element={<PrivateRoute><GruposAutoridad /></PrivateRoute>} />
      <Route path="/autoridad/docentes"     element={<PrivateRoute><DocentesAsignados /></PrivateRoute>} />
      <Route path="/autoridad/horarios"     element={<Navigate to="/autoridad/dashboard" replace />} />
      <Route path="/autoridad/estadisticas" element={<PrivateRoute><EstadisticasAutoridad /></PrivateRoute>} />
      <Route path="/autoridad/alertas"      element={<PrivateRoute><AlertasAutoridad /></PrivateRoute>} />
      <Route path="/autoridad/reportes-ia"  element={<PrivateRoute><ReportesIAPanel /></PrivateRoute>} />

      {/* Rutas Docente */}
      <Route path="/docente/inicio"         element={<PrivateRoute><MisGrupos /></PrivateRoute>} />
      <Route path="/docente/mis-grupos"     element={<PrivateRoute><MisGrupos /></PrivateRoute>} />
      <Route path="/docente/mis-materias"   element={<PrivateRoute><MisMaterias /></PrivateRoute>} />
      <Route path="/docente/mis-estudiantes"element={<PrivateRoute><MisEstudiantes /></PrivateRoute>} />
      <Route path="/docente/registro-notas" element={<PrivateRoute><RegistroNotas /></PrivateRoute>} />

      {/* Rutas Docente Portal (p3) */}
      <Route path="/docente/perfil"           element={<PrivateRoute><DocenteMiPerfil /></PrivateRoute>} />
      <Route path="/docente/horario"          element={<PrivateRoute><Navigate to="/docente/grupos" replace /></PrivateRoute>} />
      <Route path="/docente/grupos"           element={<PrivateRoute><DocenteMisGrupos /></PrivateRoute>} />
      <Route path="/docente/asistencia"       element={<PrivateRoute><DocenteAsistencia /></PrivateRoute>} />
      <Route path="/docente/calificaciones"   element={<PrivateRoute><DocenteCalificaciones /></PrivateRoute>} />
      <Route path="/docente/reportes"         element={<PrivateRoute><DocenteReportes /></PrivateRoute>} />

      {/* Rutas Postulante Portal */}
      <Route path="/postulante/perfil"          element={<PrivateRoute><PostulanteMiPerfil /></PrivateRoute>} />
      <Route path="/postulante/horario"         element={<PrivateRoute><PostulanteMiHorario /></PrivateRoute>} />
      <Route path="/postulante/calificaciones"  element={<PrivateRoute><PostulanteMisCalificaciones /></PrivateRoute>} />
      <Route path="/postulante/inicio"          element={<PrivateRoute><PostulanteMiPerfil /></PrivateRoute>} />

      {/* Fallback Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
