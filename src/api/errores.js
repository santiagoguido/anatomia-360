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
