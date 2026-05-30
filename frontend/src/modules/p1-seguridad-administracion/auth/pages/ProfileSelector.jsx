import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiUser, 
  FiBook, 
  FiSettings, 
  FiAward, 
  FiShield, 
  FiX, 
  FiLogIn, 
  FiCode, 
  FiDatabase, 
  FiWifi, 
  FiCpu, 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiFacebook, 
  FiInstagram,
  FiTerminal,
  FiZap,
  FiPercent,
  FiCompass
} from 'react-icons/fi'
import ficctEdificio from '@/assets/landing/ficct-edificio.png'

const profiles = [
  { key: 'postulante', label: 'Postulante', icon: <FiUser size={26} />, desc: 'Acceso para postulantes registrados' },
  { key: 'docente', label: 'Docente', icon: <FiBook size={26} />, desc: 'Acceso para plantel docente' },
  { key: 'coordinador', label: 'Coordinador Académico', icon: <FiSettings size={26} />, desc: 'Gestión académica interna' },
  { key: 'autoridad', label: 'Autoridad Académica', icon: <FiAward size={26} />, desc: 'Supervisión y control institucional' },
  { key: 'administrador', label: 'Administrador', icon: <FiShield size={26} />, desc: 'Acceso total de administración' },
]

const careers = [
  {
    name: 'Ingeniería Informática',
    icon: <FiCode />,
    desc: 'Desarrollo de soluciones informáticas, software y eficiencia tecnológica para organizaciones.'
  },
  {
    name: 'Ingeniería en Sistemas',
    icon: <FiDatabase />,
    desc: 'Análisis, diseño y optimización de sistemas de información complejos.'
  },
  {
    name: 'Ing. en Redes y Telecomunicaciones',
    icon: <FiWifi />,
    desc: 'Diseño, implementación y mantenimiento de redes de comunicación e infraestructura.'
  },
  {
    name: 'Ingeniería en Robótica',
    icon: <FiCpu />,
    desc: 'Desarrollo de sistemas robóticos, automatización e inteligencia artificial.'
  }
]

const subjects = [
  { name: 'Matemáticas', icon: <FiPercent /> },
  { name: 'Física', icon: <FiZap /> },
  { name: 'Química', icon: <FiCompass /> },
  { name: 'Computación', icon: <FiTerminal /> }
]

export default function ProfileSelector() {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleProfileSelect = (key) => {
    navigate(`/${key}/login`)
    setIsModalOpen(false)
  }

  return (
    <div className="landing-page">
      {/* 1. Banner Principal */}
      <section className="landing-banner-section">
        <div className="landing-banner-container">
          <div className="landing-banner-content">
            <div className="landing-badge">🎓 Curso Preuniversitario</div>
            <h1>
              Curso Preuniversitario <br />
              de Ingreso a la FICCT
            </h1>
            <div className="landing-banner-divider"></div>
            <p>
              Prepárate con excelencia para tu ingreso a la Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones.<br />
              Formamos tu talento, construimos tu futuro.
            </p>
            <button className="landing-btn-login" onClick={() => setIsModalOpen(true)}>
              <FiLogIn /> Iniciar sesión
            </button>
          </div>
        </div>
      </section>

      {/* 2. Oferta Académica */}
      <section className="landing-section landing-careers-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Oferta Académica</h2>
          <p className="landing-section-subtitle">
            Programas de pregrado diseñados para formar líderes en tecnología e innovación.
          </p>
        </div>
        <div className="landing-careers-list">
          {careers.map((career, index) => (
            <div key={index} className="landing-career-item">
              <div className="landing-career-icon">
                {career.icon}
              </div>
              <div className="landing-career-details">
                <h3 className="landing-career-name">{career.name}</h3>
                <p className="landing-career-desc">{career.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Materias Evaluadas */}
      <section className="landing-section landing-subjects-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Materias Evaluadas</h2>
          <p className="landing-section-subtitle">
            Áreas de conocimiento clave que forman la base curricular del Curso Preuniversitario.
          </p>
        </div>
        <div className="landing-subjects-grid">
          {subjects.map((subject, index) => (
            <div key={index} className="landing-subject-card">
              <div className="landing-subject-icon">
                {subject.icon}
              </div>
              <h3 className="landing-subject-name">{subject.name}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Sección Institucional */}
      <section className="landing-institutional-section">
        <div className="landing-institutional-content">
          <div className="landing-inst-brand">
            <span className="landing-inst-logo">FICCT</span>
            <span className="landing-inst-sub">UAGRM</span>
          </div>
          <p className="landing-inst-text">
            Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones de la Universidad Autónoma Gabriel René Moreno. Formando profesionales de excelencia en informática y tecnología.
          </p>
        </div>
      </section>

      {/* 5. Sección Contáctanos */}
      <section className="landing-section landing-contact-section">
        <div className="landing-contact-container">
          <div className="landing-section-header" style={{ marginBottom: 32 }}>
            <h2 className="landing-section-title">Contáctanos</h2>
            <p className="landing-section-subtitle">
              Conéctate con nosotros a través de nuestros canales oficiales o visita nuestras instalaciones.
            </p>
          </div>

          <div className="landing-contact-grid">
            <div className="landing-contact-card">
              <div className="landing-contact-icon">
                <FiMapPin />
              </div>
              <div className="landing-contact-details">
                <h4>Dirección</h4>
                <p>Av. Busch, Ciudad Universitaria, Módulo 236 - Santa Cruz de la Sierra, Bolivia</p>
              </div>
            </div>

            <div className="landing-contact-card">
              <div className="landing-contact-icon">
                <FiPhone />
              </div>
              <div className="landing-contact-details">
                <h4>Teléfono</h4>
                <p>(591) 3 - 3553636</p>
              </div>
            </div>

            <div className="landing-contact-card">
              <div className="landing-contact-icon">
                <FiMail />
              </div>
              <div className="landing-contact-details">
                <h4>Correo electrónico</h4>
                <p>f_icct@uagrm.edu.bo</p>
              </div>
            </div>
          </div>

          <div className="landing-socials-container">
            <p>Visita nuestras redes sociales</p>
            <div className="landing-social-links">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="landing-social-btn facebook"
              >
                <FiFacebook /> Facebook
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="landing-social-btn instagram"
              >
                <FiInstagram /> Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Tricolor Stripe */}
      <div className="landing-footer-stripe"></div>

      {/* Glassmorphic Modal de Selección de Perfil */}
      {isModalOpen && (
        <div className="landing-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="landing-modal" onClick={(e) => e.stopPropagation()}>
            <button className="landing-modal-close-btn" onClick={() => setIsModalOpen(false)}>
              <FiX />
            </button>
            <div className="landing-modal-header">
              <h2>Portal Académico</h2>
              <p>Selecciona tu perfil de acceso para continuar</p>
            </div>
            <div className="landing-modal-grid">
              {profiles.map((p) => (
                <div 
                  key={p.key} 
                  className="landing-modal-card"
                  onClick={() => handleProfileSelect(p.key)}
                >
                  <div className="landing-modal-card-icon">
                    {p.icon}
                  </div>
                  <h3>{p.label}</h3>
                  <p>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
