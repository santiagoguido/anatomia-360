// ARCHIVO GENERADO por scripts/sincronizar-funcion.js. No lo edites: cambia el original y ejecuta `npm run funcion:preparar`.
// Interruptor de pruebas de la Edge Function. APAGADO por defecto y nunca debe quedar activo en producción.
//
// Con el interruptor encendido la función: (1) trata TODAS las aulas como abiertas y (2) sirve preguntas
// en estado "borrador". Sirve para probar las aulas 2–6 antes de su fecha y para jugar mientras Santi
// aprueba el banco. Se enciende solo con la variable de entorno de la función (nunca en el repo).

export const NOMBRE_INTERRUPTOR = 'A360_MODO_PRUEBAS';

/** Encendido solo con "1" o "true" exactos; vacío, ausente o cualquier otra cosa = apagado. */
export function interruptorActivo(valor) {
  const v = String(valor ?? '').trim().toLowerCase();
  return v === '1' || v === 'true';
}
