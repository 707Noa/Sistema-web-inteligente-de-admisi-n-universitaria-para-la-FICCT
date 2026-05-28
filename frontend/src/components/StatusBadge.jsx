import React from 'react'

export default function StatusBadge({ status }) {
  const map = {
    activo: 'badge-success', aprobado: 'badge-success',
    inactivo: 'badge-gray', reprobado: 'badge-danger',
    pendiente: 'badge-warning', verificado: 'badge-info',
    rechazado: 'badge-danger',
  }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}
