import api from "@/shared/services/api";

/**
 * Registrar una nueva preinscripción pública.
 */
export const registrarPreinscripcion = (data) => {
  return api.post("/preinscripcion", data, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
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

/**
 * Generar sesión de Stripe Checkout.
 */
export const generarStripeCheckout = (postulanteId) => {
  return api.post('/pagos/stripe/checkout', { postulante_id: postulanteId });
};

/**
 * Iniciar Stripe Checkout en un solo paso (con datos/documentos o temporal ID).
 */
export const preinscripcionStripeCheckout = (data) => {
  const isFormData = data instanceof FormData;
  return api.post('/preinscripcion/stripe/checkout', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' }
  });
};

/**
 * Crear orden de PayPal.
 */
export const crearPaypalOrder = (id) => {
  return api.post(`/preinscripcion/${id}/pago/paypal/create-order`);
};

/**
 * Capturar pago aprobado de PayPal.
 */
export const capturarPaypalPago = (id, orderId) => {
  return api.post(`/preinscripcion/${id}/pago/paypal/capture`, { order_id: orderId });
};

/**
 * Consultar el estado del pago de una preinscripción.
 */
export const consultarPagoEstado = (id) => {
  return api.get(`/preinscripcion/${id}/pago/estado`);
};

/**
 * Consultar el estado del pago de Stripe usando el session_id.
 */
export const consultarStripeEstado = (sessionId) => {
  return api.get('/preinscripcion/stripe/estado', { params: { session_id: sessionId } });
};

/**
 * Simular el resultado del pago de una preinscripción (Prototipo Académico).
 */
export const simularPagoPostulante = (id, estado, metodo) => {
  return api.post(`/preinscripcion/${id}/pago/simular`, { estado, metodo });
};

/**
 * Cancelar la preinscripción de un postulante (eliminar datos).
 */
export const cancelarPreinscripcion = (id, token = null) => {
  return api.delete(`/preinscripciones/${id}/cancelar`, {
    params: token ? { token } : {}
  });
};
