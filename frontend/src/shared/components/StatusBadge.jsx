import React from 'react'

const statusMap = {
  // Estados académicos
  activo:    { cls: 'badge-success', label: 'Activo' },
  aprobado:  { cls: 'badge-success', label: 'Aprobado' },
  inactivo:  { cls: 'badge-gray',    label: 'Inactivo' },
  reprobado: { cls: 'badge-danger',  label: 'Reprobado' },
  pendiente: { cls: 'badge-warning', label: 'Pendiente' },
  verificado:{ cls: 'badge-info',    label: 'Verificado' },
  rechazado: { cls: 'badge-danger',  label: 'Rechazado' },
  // Estados de trámite de postulantes
  PENDIENTE_PAGO: { cls: 'badge-warning', label: 'Pendiente de pago' },
  PREINSCRITO:    { cls: 'badge-info',    label: 'Preinscrito' },
  INSCRITO:       { cls: 'badge-success', label: 'Inscrito' },
}

export default function StatusBadge({ status }) {
  const entry = statusMap[status]
  if (entry) return <span className={`badge ${entry.cls}`}>{entry.label}</span>
  return <span className="badge badge-gray">{status}</span>
}
