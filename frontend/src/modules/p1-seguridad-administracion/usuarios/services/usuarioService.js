import api from '@/shared/services/api'

/**
 * Listar usuarios con filtros de rol, estado y búsqueda.
 *
 * @param {object} params
 * @param {string} params.rol
 * @param {string} params.search
 * @param {string} params.estado
 * @param {number} params.page
 * @returns {Promise<object>}
 */
export const listarUsuarios = ({ rol, search, estado, page }) => {
  return api.get('/usuarios', {
    params: { rol, search, estado, page }
  })
}

/**
 * Exportar usuarios en formato CSV con filtros aplicados.
 *
 * @param {object} params
 * @param {string} params.rol
 * @param {string} params.search
 * @param {string} params.estado
 */
export const exportarUsuariosCsv = async ({ rol, search, estado }) => {
  const response = await api.get('/usuarios/exportar-csv', {
    params: { rol, search, estado },
    responseType: 'blob',
  })

  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `usuarios_${rol || 'todos'}.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Importar CSV y generar cuentas de usuarios para el perfil seleccionado (no se permite "Otro").
 *
 * @param {File} file
 * @param {string} perfil
 * @returns {Promise<object>}
 */
export const importarCsvYGenerarCuentas = async (file, perfil) => {
  const formData = new FormData()
  formData.append('archivo', file)
  formData.append('perfil', perfil)

  const response = await api.post(
    '/usuarios/importar-csv-generar-cuentas',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )

  return response.data
}

/**
 * Eliminar o desactivar un usuario o postulante de forma segura según su tipo de origen.
 *
 * @param {string} id
 * @param {string} tipoOrigen
 * @returns {Promise<object>}
 */
export const eliminarUsuario = async (id, tipoOrigen) => {
  const response = await api.delete(`/usuarios/${id}`, {
    params: { tipo_origen: tipoOrigen },
  });
  return response.data;
}
