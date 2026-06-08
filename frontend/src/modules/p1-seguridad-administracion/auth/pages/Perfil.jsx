import React, { useState, useEffect } from 'react'
import Layout from '@/layouts/Layout'
import { useAuth } from '../context/AuthContext'
import {
  getPostulantePerfil,
  getMateriaTemas,
  getPostulanteCalificaciones
} from '@/modules/p2-participantes-grupos/postulantes/services/postulanteService'
import api from '@/shared/services/api'
import {
  FiUser, FiMail, FiCreditCard, FiHash, FiShield, FiCheckCircle,
  FiCpu, FiPercent, FiBook, FiZap, FiArrowLeft, FiBell, FiList,
  FiAward, FiBriefcase
} from 'react-icons/fi'

const ROL_LABELS = {
  administrador: 'Administrador',
  docente: 'Docente',
  coordinador: 'Coordinador Académico',
  autoridad: 'Autoridad Académica',
  postulante: 'Postulante',
}

export default function Perfil() {
  const { user } = useAuth()
  const [profileData, setProfileData] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [materiasDb, setMateriasDb] = useState([])
  const [selectedMateria, setSelectedMateria] = useState(null)
  const [activeTab, setActiveTab] = useState('curso')
  const [temas, setTemas] = useState([])
  const [loadingTemas, setLoadingTemas] = useState(false)
  const [calificaciones, setCalificaciones] = useState(null)

  const [companeros, setCompaneros] = useState([])
  const [loadingCompaneros, setLoadingCompaneros] = useState(false)

  useEffect(() => {
    // Cargar materias de la DB para resolver IDs reales
    api.get('/materias-all')
      .then(r => setMateriasDb(r.data || []))
      .catch(() => { })

    if (user && user.role === 'postulante') {
      setLoadingProfile(true)
      getPostulantePerfil()
        .then(r => setProfileData(r.data))
        .catch(() => { })
        .finally(() => setLoadingProfile(false))

      getPostulanteCalificaciones()
        .then(r => setCalificaciones(r.data))
        .catch(() => { })
    }
  }, [user])

  // Cargar temas cuando se selecciona materia
  useEffect(() => {
    if (selectedMateria?.dbId) {
      setLoadingTemas(true)
      getMateriaTemas(selectedMateria.dbId)
        .then(r => {
          setTemas(r.data?.temas || [])
        })
        .catch(() => {
          setTemas([])
        })
        .finally(() => setLoadingTemas(false))
    } else {
      setTemas([])
    }
  }, [selectedMateria])

  // Cargar compañeros de paralelo cuando se entra a pestaña participantes
  useEffect(() => {
    if (activeTab === 'participantes' && selectedMateria) {
      setLoadingCompaneros(true)
      api.get('/postulante/grupo-compañeros')
        .then(r => {
          setCompaneros(r.data || [])
        })
        .catch(() => {
          setCompaneros([])
        })
        .finally(() => setLoadingCompaneros(false))
    }
  }, [activeTab, selectedMateria])

  if (!user) return null

  const rolLabel = ROL_LABELS[user.role] || user.role || '—'
  const userInitial = user?.name ? user.name[0].toUpperCase() : 'U'

  if (user.role === 'postulante') {
    const allAsignaciones = profileData?.grupos?.flatMap(g =>
      (g.asignaciones || []).map(a => ({
        ...a,
        grupo_codigo: g.codigo || g.nombre_grupo,
        grupo_aula: g.aula,
        grupo_gestion: g.gestion || 'I-2026',
        grupo_id: g.id
      }))
    ) || []

    const findMateriaInfo = (nameRegex) => {
      return allAsignaciones.find(a =>
        new RegExp(nameRegex, 'i').test(a.materia?.nombre || '')
      )
    }

    const materiasCUP = [
      {
        nombre: 'Computación',
        key: 'computacion',
        regex: 'computac',
        icon: <FiCpu />,
        color: '#10b981',
        bgLight: '#ecfdf5',
      },
      {
        nombre: 'Matemáticas',
        key: 'matematicas',
        regex: 'matemat',
        icon: <FiPercent />,
        color: '#3b82f6',
        bgLight: '#eff6ff',
      },
      {
        nombre: 'Inglés',
        key: 'ingles',
        regex: 'ingl',
        icon: <FiBook />,
        color: '#8b5cf6',
        bgLight: '#f5f3ff',
      },
      {
        nombre: 'Física',
        key: 'fisica',
        regex: 'fisic',
        icon: <FiZap />,
        color: '#f59e0b',
        bgLight: '#fffbeb',
      },
    ]

    const handleSelectMateria = (mCUP, info) => {
      // Buscar ID de materia en la DB por nombre
      const dbMat = materiasDb.find(dm =>
        new RegExp(mCUP.regex, 'i').test(dm.nombre)
      )
      setSelectedMateria({
        dbId: dbMat?.id || info?.materia_id || null,
        nombre: mCUP.nombre,
        color: mCUP.color,
        bgLight: mCUP.bgLight,
        icon: mCUP.icon,
        info: info
      })
      setActiveTab('curso')
    }

    // Filtrar calificación de la materia seleccionada
    const califMateria = calificaciones?.materias?.find(c =>
      new RegExp(selectedMateria?.nombre, 'i').test(c.materia)
    )

    return (
      <Layout>
        {selectedMateria ? (
          // ── Vista Interna del Curso ──
          <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

            {/* Botón Volver */}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setSelectedMateria(null)}
              style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FiArrowLeft /> Volver al Panel General
            </button>

            {/* Encabezado Superior del Curso */}
            <div style={{
              background: `linear-gradient(135deg, ${selectedMateria.color} 0%, #1e293b 100%)`,
              color: 'white',
              borderRadius: 'var(--radius-md)',
              padding: '28px 32px',
              marginBottom: '24px',
              boxShadow: 'var(--shadow-md)'
            }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85, fontWeight: 700 }}>
                Aula Virtual Académica
              </span>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '6px 0 4px 0', color: 'white' }}>
                [{selectedMateria.info?.grupo_gestion || 'I-2026'}] {selectedMateria.nombre.toUpperCase()} - {selectedMateria.info?.grupo_codigo || 'SA'}
              </h1>
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
                Docente: {selectedMateria.info?.docente?.name || 'Por asignar'} &bull; Aula: {selectedMateria.info?.grupo_aula || 'Por definir'}
              </p>
            </div>

            {/* Pestañas de Navegación del Curso */}
            <div style={{
              display: 'flex',
              gap: '4px',
              borderBottom: '2px solid var(--gray-200)',
              marginBottom: '24px',
              overflowX: 'auto'
            }}>
              {[
                { key: 'curso', label: 'Curso', icon: <FiBook /> },
                { key: 'participantes', label: 'Participantes', icon: <FiUser /> },
                { key: 'actividades', label: 'Actividades', icon: <FiList /> }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '12px 20px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    marginBottom: '-2px',
                    borderBottom: `2.5px solid ${activeTab === t.key ? selectedMateria.color : 'transparent'}`,
                    color: activeTab === t.key ? selectedMateria.color : 'var(--gray-500)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    transition: 'var(--transition)'
                  }}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Contenido de la Pestaña Activa */}
            <div className="tab-content" style={{ minHeight: '300px' }}>

              {/* 1. CURSO */}
              {activeTab === 'curso' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Avisos */}
                  <div className="card" style={{ borderLeft: `4px solid ${selectedMateria.color}`, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <FiBell style={{ color: selectedMateria.color, fontSize: '1.2rem' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Avisos y Comunicados</h3>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--gray-600)', margin: 0, lineHeight: 1.6 }}>
                      Estimados postulantes, sean bienvenidos al aula virtual. Les recordamos que las clases se dictan de manera presencial en el aula e indicaciones establecidas. Para cualquier consulta académica, pueden comunicarse con el docente asignado.
                    </p>
                  </div>

                  {/* Temas / Mosaicos */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Temas y Unidades del Curso</h3>

                    {loadingTemas ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
                        Cargando contenidos del curso...
                      </div>
                    ) : temas.length === 0 ? (
                      <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                        No se definieron temas específicos en el plan analítico para esta materia.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {temas.map(t => (
                          <div
                            key={t.id}
                            className="card"
                            style={{
                              padding: '20px',
                              borderTop: `4px solid ${selectedMateria.color}`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              borderRadius: 'var(--radius)'
                            }}
                          >
                            <span style={{ fontSize: '0.73rem', textTransform: 'uppercase', color: selectedMateria.color, fontWeight: 700 }}>
                              Tema {t.numero}
                            </span>
                            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--gray-800)' }}>
                              {t.titulo}
                            </h4>
                            <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                              {t.descripcion || 'Sin descripción detallada.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. PARTICIPANTES */}
              {activeTab === 'participantes' && (
                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '10px' }}>
                    Compañeros de Paralelo
                  </h3>
                  {loadingCompaneros ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                      Cargando lista de compañeros...
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Estudiante</th>
                            <th>CI</th>
                            <th>Registro</th>
                            <th>Correo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ...companeros.map(c => ({
                              name: `${c.nombres} ${c.apellidos}`,
                              ci: c.ci,
                              reg: c.codigo_usuario,
                              email: c.email,
                              isMe: false
                            })),
                            {
                              name: `${user.name} (Tú)`,
                              ci: user.ci,
                              reg: user.codigo || '—',
                              email: user.email || '—',
                              isMe: true
                            }
                          ].map((student, idx) => (
                            <tr key={idx} style={{ background: student.isMe ? '#f0f9ff' : 'transparent' }}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: student.isMe ? 'var(--primary)' : 'var(--gray-200)',
                                    color: student.isMe ? 'white' : 'var(--gray-700)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.8rem', fontWeight: 'bold'
                                  }}>
                                    {student.name[0]}
                                  </div>
                                  <span style={{ fontWeight: 500 }}>{student.name}</span>
                                </div>
                              </td>
                              <td style={{ fontFamily: 'monospace' }}>{student.ci || '—'}</td>
                              <td style={{ fontFamily: 'monospace' }}>{student.reg || '—'}</td>
                              <td>{student.email || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 4. ACTIVIDADES */}
              {activeTab === 'actividades' && (
                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '10px' }}>
                    Tareas y Actividades Prácticas
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { title: 'Cuestionario Inicial Temas 1-2', points: '10 pts', status: 'entregado', date: 'Vence: Finalizado' },
                      { title: 'Práctica Dirigida de Laboratorio', points: '15 pts', status: 'entregado', date: 'Vence: Finalizado' },
                      { title: 'Proyecto de Integración de Contenidos', points: '20 pts', status: 'pendiente', date: 'Vence: Próxima semana' }
                    ].map((act, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 18px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)'
                      }}>
                        <div>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>{act.title}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Puntaje: {act.points} &bull; {act.date}</span>
                        </div>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
                          background: act.status === 'entregado' ? 'var(--success-light)' : 'var(--warning-light)',
                          color: act.status === 'entregado' ? '#065f46' : '#b45309'
                        }}>
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          // ── Panel General (Dashboard Principal del Postulante) ──
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>

            {/* Bienvenida */}
            <div className="card" style={{
              padding: '28px 32px',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                width: 68, height: 68, flexShrink: 0,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.7rem', color: 'white', fontWeight: 700,
              }}>
                {userInitial}
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>
                  ¡Hola, {user.name || 'Estudiante'}!
                </h2>
                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
                  Bienvenido a tu panel general CUP. Selecciona cualquiera de las materias asignadas a continuación para ingresar al aula de clases interactiva.
                </p>
              </div>
            </div>

            {/* Grid de Materias */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 750, margin: 0 }}>Mis Asignaturas Preuniversitarias</h3>
                {loadingProfile && <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Cargando asignaciones...</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                {materiasCUP.map(m => {
                  const info = findMateriaInfo(m.regex)
                  return (
                    <div
                      key={m.key}
                      className="card"
                      onClick={() => handleSelectMateria(m, info)}
                      style={{
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        borderTop: `5px solid ${m.color}`,
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        borderRadius: 'var(--radius-md)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                        e.currentTarget.style.borderColor = m.color
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '10px', background: m.bgLight, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                          {m.icon}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0 }}>{m.nombre}</h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>CUP - FICCT</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--gray-600)', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                        <div><strong>Docente:</strong> {info?.docente?.name || 'Sin asignar'}</div>
                        <div><strong>Grupo:</strong> {info?.grupo_codigo || 'Por definir'}</div>
                        <div><strong>Aula:</strong> {info?.grupo_aula || 'Por definir'}</div>
                        <div><strong>Horario:</strong> {info ? `${info.hora_inicio} - ${info.hora_fin} (${info.dia})` : 'Por definir'}</div>
                      </div>
                      <div style={{ textAlign: 'right', marginTop: '8px', fontSize: '0.78rem', color: m.color, fontWeight: 'bold', borderTop: '1px solid var(--gray-100)', paddingTop: '10px' }}>
                        Ingresar al curso &rarr;
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Mi Perfil</h1>
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

        {/* Avatar + nombre */}
        <div className="card" style={{ padding: '24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 68, height: 68, flexShrink: 0,
            borderRadius: '50%',
            background: 'var(--primary-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.7rem', color: 'white', fontWeight: 700,
          }}>
            {userInitial}
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>
              {user.name || '—'}
            </h2>
            <span className="badge badge-info" style={{ textTransform: 'none' }}>
              {rolLabel}
            </span>
          </div>
        </div>

        {/* Datos */}
        <div className="card" style={{ padding: '4px 24px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ width: 38, height: 38, flexShrink: 0, background: 'var(--info-light)', color: 'var(--accent)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiUser /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Nombre Completo</div><div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{user.name}</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ width: 38, height: 38, flexShrink: 0, background: 'var(--info-light)', color: 'var(--accent)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiCreditCard /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>CI</div><div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{user.ci}</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ width: 38, height: 38, flexShrink: 0, background: 'var(--info-light)', color: 'var(--accent)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiMail /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Correo Electrónico</div><div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{user.email}</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ width: 38, height: 38, flexShrink: 0, background: 'var(--info-light)', color: 'var(--accent)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiHash /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Código / Registro</div><div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{user.codigo || '—'}</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ width: 38, height: 38, flexShrink: 0, background: 'var(--info-light)', color: 'var(--accent)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiShield /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Rol</div><div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{rolLabel}</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 0' }}>
            <div style={{ width: 38, height: 38, flexShrink: 0, background: 'var(--info-light)', color: 'var(--accent)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiCheckCircle /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Estado Cuenta</div><div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{user.estado}</div></div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
