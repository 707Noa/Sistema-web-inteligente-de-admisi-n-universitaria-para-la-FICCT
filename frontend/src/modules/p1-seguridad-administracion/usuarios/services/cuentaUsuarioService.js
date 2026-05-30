import api from '@/shared/services/api'

/**
 * Importar un archivo CSV y generar cuentas de usuarios para el perfil seleccionado.
 *
 * @param {File} file - Archivo CSV
 * @param {string} perfil - Perfil del sistema (POSTULANTE, DOCENTE, COORDINADOR, AUTORIDAD, ADMINISTRADOR, CSV)
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
