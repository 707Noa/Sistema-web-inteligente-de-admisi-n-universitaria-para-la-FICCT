import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FiUser, FiBook, FiSettings, FiAward, FiShield, FiInfo } from 'react-icons/fi'

const profiles = [
  { key: 'postulante', label: 'Postulante', icon: <FiUser size={28} />, desc: 'Acceso para estudiantes' },
  { key: 'docente', label: 'Docente', icon: <FiBook size={28} />, desc: 'Acceso para profesores' },
  { key: 'coordinador', label: 'Coordinador Académico', icon: <FiSettings size={28} />, desc: 'Gestión académica' },
  { key: 'autoridad', label: 'Autoridad Académica', icon: <FiAward size={28} />, desc: 'Supervisión institucional' },
  { key: 'administrador', label: 'Administrador', icon: <FiShield size={28} />, desc: 'Acceso total al sistema' },
]

export default function ProfileSelector() {
  const navigate = useNavigate()

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-header-badge">🎓 Sistema Académico</div>
        <h1>PORTAL DE CURSOS PREUNIVERSITARIOS</h1>
        <p>Elige tu tipo de cuenta para continuar</p>
      </div>

      <div className="profile-grid">
        {profiles.map((p) => (
          <div key={p.key} className="profile-card" onClick={() => navigate(`/${p.key}/login`)}>
            <div className="profile-card-icon">{p.icon}</div>
            <h3>{p.label}</h3>
            <button className="btn" onClick={(e) => { e.stopPropagation(); navigate(`/${p.key}/login`) }}>
              Seleccionar
            </button>
          </div>
        ))}
      </div>

      <div className="profile-footer">
        <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
          <FiInfo /> Información
        </button>
      </div>
    </div>
  )
}
