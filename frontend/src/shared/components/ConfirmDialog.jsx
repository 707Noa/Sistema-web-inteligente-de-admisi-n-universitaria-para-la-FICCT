import React from 'react'
import { FiAlertTriangle } from 'react-icons/fi'

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-body">
          <div className="confirm-dialog">
            <div className="confirm-dialog-icon"><FiAlertTriangle /></div>
            <h3>{title || '¿Estás seguro?'}</h3>
            <p>{message || 'Esta acción no se puede deshacer.'}</p>
            <div className="confirm-dialog-actions">
              <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
              <button className="btn btn-danger" onClick={onConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
