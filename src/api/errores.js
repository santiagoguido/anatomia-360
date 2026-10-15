import { CODIGOS_RONDA } from '../game/ronda/errores.js';

/** Error con un código que las pantallas traducen a un mensaje (ver textos.js → ERRORES). */
export class ErrorApp extends Error {
  constructor(codigo, detalle) {
    super(detalle ?? codigo);
    this.name = 'ErrorApp';
    this.codigo = codigo;
  }
}

const CODIGOS_SERVIDOR = ['matricula_invalida', 'nombre_invalido', 'genero_invalido'];

/** Convierte el error de Supabase en un código propio. Exportada para poder probarla. */
export function clasificarError(error, { agotado = false } = {}) {
  if (agotado) return 'tiempo';
  const mensaje = String(error?.message ?? '');
  for (const codigo of CODIGOS_SERVIDOR) {
    if (mensaje.includes(codigo)) return codigo;
  }
  if (error?.code === 'PGRST202' || error?.code === '42883') return 'esquema_faltante';
  if (/invalid api key|jwt|apikey/i.test(mensaje)) return 'clave_invalida';
  if (/abort/i.test(mensaje) || error?.name === 'AbortError') return 'tiempo';
  if (/failed to fetch|networkerror|fetch failed|load failed|network request/i.test(mensaje)) return 'red';
  return 'servidor';
}

/**
 * Traduce la respuesta HTTP de la función `rondas` a un código propio.
 * Si la función contestó con un código conocido, se usa tal cual; si el gateway de Supabase contestó 404
 * sin nuestro cuerpo, la función no está desplegada.
 */
export function clasificarRespuestaRondas(estado, cuerpo) {
  if (cuerpo && typeof cuerpo.error === 'string' && CODIGOS_RONDA.includes(cuerpo.error)) return cuerpo.error;
  if (estado === 404) return 'funcion_no_desplegada';
  if (estado === 401 || estado === 403) return 'clave_invalida';
  return 'servidor';
}

/** Errores que tiene sentido reintentar tal cual (las operaciones de la ronda son idempotentes). */
export const REINTENTABLES = ['red', 'tiempo', 'servidor', 'conflicto', 'respuesta_prematura'];
export const esReintentable = (codigo) => REINTENTABLES.includes(codigo);
