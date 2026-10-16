// ARCHIVO GENERADO por scripts/sincronizar-funcion.js. No lo edites: cambia el original y ejecuta `npm run funcion:preparar`.
// Reglas de la Clínica (Sesión 6). ÚNICO lugar donde viven: las usan el juego (navegador) y la Edge Function.
// Sin DOM y sin imports: este archivo se copia tal cual a supabase/functions/_shared/ con `npm run funcion:preparar`.

export const CLINICA = {
  /** Pacientes por guardia. */
  casosPorGuardia: 5,
  /** Pasos de razonamiento por caso: función perdida → estructura lesionada → nivel o sitio. */
  pasos: 3,
  /** Opciones de cada paso. */
  opciones: 4,
  /** Intentos por paso: al segundo fallo el servidor revela la respuesta y el paso vale 0. */
  intentos: 2,
  /** Exploraciones posibles de cada paciente (el orden es el del botón en pantalla). */
  exploraciones: ['inspeccion', 'fuerza', 'sensibilidad', 'pulsos', 'reflejos', 'arcos'],
  /** Cuántas de esas seis aportan al razonamiento en cada caso. */
  exploracionesUtiles: 4,
  /** Con este número de exploraciones o menos se gana el bono y la insignia «Ojo clínico». */
  exploracionesParaBono: 3,
  /** Mínimo de exploraciones para empezar a razonar (sin él, no explorar nada sería la mejor jugada). */
  exploracionesMinimas: 2,
  /** Una guardia sin terminar caduca pasado este tiempo. */
  expiraMs: 2 * 60 * 60 * 1000,
  /** Guardias terminadas para la insignia «Residente de guardia». */
  guardiasResidente: 5,
};

export const PUNTOS_CLINICA = {
  /** Paso acertado al primer intento. */
  pasoPrimerIntento: 200,
  /** Paso acertado al segundo intento. */
  pasoSegundoIntento: 100,
  /** Caso resuelto (los 3 pasos acertados) con pocas exploraciones. */
  bonoPocasExploraciones: 100,
  /** Cada pista pedida resta esto. */
  pista: 50,
};

/** Estados de caso que el servidor puede servir (el interruptor de pruebas añade «borrador»). */
export const ESTADOS_CASO_SERVIBLES = ['aprobado'];

/** Hasta aquí vive el SQL: guardias.puntaje tiene un `check` con este máximo. Una prueba lo comprueba. */
export const MAXIMO_CASO = CLINICA.pasos * PUNTOS_CLINICA.pasoPrimerIntento + PUNTOS_CLINICA.bonoPocasExploraciones;
export const MAXIMO_GUARDIA = CLINICA.casosPorGuardia * MAXIMO_CASO;
