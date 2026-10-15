// ARCHIVO GENERADO por scripts/sincronizar-funcion.js. No lo edites: cambia el original y ejecuta `npm run funcion:preparar`.
/** Error del motor de rondas: `codigo` lo traduce el juego a un texto; `estado` es el HTTP que devuelve la función. */
export class ErrorRonda extends Error {
  constructor(codigo, estado = 400, extra = {}) {
    super(codigo);
    this.name = 'ErrorRonda';
    this.codigo = codigo;
    this.estado = estado;
    this.extra = extra;
  }
}

/** Códigos que el navegador sabe traducir (textos.js → ERRORES). */
export const CODIGOS_RONDA = [
  'solicitud_invalida',
  'jugador_no_encontrado',
  'aula_cerrada',
  'banco_insuficiente',
  'ronda_no_encontrada',
  'ronda_terminada',
  'ronda_expirada',
  'ronda_incompleta',
  'ronda_invalida',
  'pregunta_ya_respondida',
  'fuera_de_orden',
  'respuesta_prematura',
  'conflicto',
];
