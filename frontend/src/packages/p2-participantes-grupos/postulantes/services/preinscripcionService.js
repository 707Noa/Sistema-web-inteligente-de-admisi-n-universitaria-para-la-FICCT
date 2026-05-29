import api from "@/shared/services/api";

/**
 * Registrar una nueva preinscripción pública.
 */
export const registrarPreinscripcion = (data) => {
  return api.post("/preinscripcion", data);
};

/**
 * Listar preinscripciones con paginación/filtros (Administrador/Coordinador).
 */
export const listarPreinscripciones = (params) => {
  return api.get("/preinscripciones", { params });
};

/**
 * Descargar preinscripciones en formato CSV.
 */
export const descargarPreinscripcionesCsv = () => {
  return api.get("/preinscripciones/exportar-csv", { responseType: "blob" });
};

/**
 * Generar cuenta de usuario individual para un postulante.
 */
export const generarCuentaPostulante = (id) => {
  return api.post(`/preinscripciones/${id}/generar-cuenta`);
};

/**
 * Generar cuentas de usuario masivas para todos los preinscritos.
 */
export const generarCuentasMasivo = () => {
  return api.post("/preinscripciones/generar-cuentas");
};
