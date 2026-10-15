// Reglas del motor de rondas. ÚNICO lugar donde viven: las usan el juego (navegador) y la
// Edge Function (servidor). Sin DOM, sin imports: este archivo se copia tal cual a
// supabase/functions/_shared/ con `npm run funcion:preparar`.

export const RONDA = {
  preguntas: 25,
  /** Cuántas preguntas salen de cada tema: 12 de uno y 13 del otro (al azar cuál). */
  porTema: [12, 13],
  opciones: 4,
  tiempoMs: 42000,
  /** El reloj se pone rojo en los últimos 10 s. */
  avisoRojoMs: 10000,
  /** Pausa en pantalla tras responder. La acredita el servidor, así ambos relojes coinciden sin otra consulta. */
  pausaMs: 700,
  /** Margen antes de la primera pregunta (cubre la latencia de iniciar la ronda). */
  margenInicioMs: 1500,
  /** Tolerancia de red al calificar el tiempo de una respuesta. */
  graciaMs: 1500,
  /** Plausibilidad (ver plausibilidad.js). Un humano no lee y contesta en menos de esto. */
  minimoPromedioMs: 1500,
  relampagoMs: 800,
  relampagoMaximo: 5,
  minimoParaPromediar: 5,
};

/** Una ronda sin terminar caduca pasado este tiempo (25 preguntas al máximo + márgenes + 2 min). */
export const RONDA_EXPIRA_MS =
  RONDA.margenInicioMs + RONDA.preguntas * (RONDA.tiempoMs + RONDA.pausaMs + RONDA.graciaMs) + 120000;

export const PUNTOS = {
  correcta: 100,
  /** Hasta 50, proporcional al tiempo que sobró. */
  bonoVelocidadMax: 50,
  /** +10 por cada acierto seguido (contando el actual), con tope. */
  rachaPorAcierto: 10,
  rachaTope: 50,
};

/** Calificación = aciertos de 25 en escala de 10. */
export const ESCALA_CALIFICACION = 10;

/** Estados de pregunta que el servidor puede servir (el interruptor de pruebas añade "borrador"). */
export const ESTADOS_SERVIBLES = ['aprobada'];
/** Una pregunta con imagen solo se sirve si su imagen está lista. */
export const IMAGEN_LISTA = 'lista';

/**
 * Salón de la Fama semanal: arranca en la semana 1 (lunes 19 oct 2026). Las rondas jugadas antes
 * (semana 0) guardan récord personal pero no suman al Top 10. El SQL (`semana_cuenta_para_salon`)
 * tiene las mismas fechas; una prueba comprueba que coincidan.
 */
export const SALON = { primerLunes: '2026-10-19', ultimoLunes: '2026-11-23' };
