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
export const generarStripeCheckout = (id) => {
  return api.post(`/preinscripcion/${id}/pago/stripe/checkout`);
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
 * Simular el resultado del pago de una preinscripción (Prototipo Académico).
 */
export const simularPagoPostulante = (id, estado, metodo) => {
  return api.post(`/preinscripcion/${id}/pago/simular`, { estado, metodo });
};
