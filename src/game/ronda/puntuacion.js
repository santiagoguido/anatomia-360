// Puntos, racha y resumen de una ronda. Funciones puras (el servidor las usa para calificar).
import { ESCALA_CALIFICACION, PUNTOS, RONDA } from './reglas.js';

/** Bono de velocidad: 0 a 50, proporcional al tiempo que sobró de los 42 s. */
export function bonoVelocidad(tiempoMs, limiteMs = RONDA.tiempoMs) {
  const t = Math.min(Math.max(Number(tiempoMs) || 0, 0), limiteMs);
  return Math.round((PUNTOS.bonoVelocidadMax * (limiteMs - t)) / limiteMs);
}

/** Bono de racha para un acierto cuya racha (contándolo) es `racha`: +10 por acierto seguido, tope +50. */
export function bonoRacha(racha) {
  return Math.min(Math.max(racha, 0) * PUNTOS.rachaPorAcierto, PUNTOS.rachaTope);
}

/**
 * Puntos de una pregunta y racha resultante.
 * Correcta = 100 + velocidad + racha. Incorrecta o sin contestar = 0 y la racha vuelve a 0.
 */
export function puntuarRespuesta({ acierto, tiempoMs, rachaAnterior = 0 }) {
  if (!acierto) return { puntos: 0, racha: 0, base: 0, bonoVelocidad: 0, bonoRacha: 0 };
  const racha = rachaAnterior + 1;
  const velocidad = bonoVelocidad(tiempoMs);
  const porRacha = bonoRacha(racha);
  return { puntos: PUNTOS.correcta + velocidad + porRacha, racha, base: PUNTOS.correcta, bonoVelocidad: velocidad, bonoRacha: porRacha };
}

/** Máximo teórico de una ronda: 25 aciertos seguidos, todos con 0 s de respuesta. Con las reglas actuales: 4,900. */
export function puntajeMaximoTeorico(total = RONDA.preguntas) {
  let racha = 0;
  let suma = 0;
  for (let i = 0; i < total; i++) {
    racha += 1;
    suma += PUNTOS.correcta + PUNTOS.bonoVelocidadMax + bonoRacha(racha);
  }
  return suma;
}

/** Calificación en escala de 10 con un decimal (21 de 25 → 8.4). */
export function calificacion(aciertos, total = RONDA.preguntas) {
  if (!total) return 0;
  return Math.round((aciertos / total) * ESCALA_CALIFICACION * 10) / 10;
}

/**
 * Resumen numérico de una ronda a partir de sus respuestas
 * (cada una: { tema, acierto, contestada, ms, puntos, racha }).
 */
export function resumirRonda(respuestas, total = RONDA.preguntas) {
  const aciertos = respuestas.filter((r) => r.acierto).length;
  const contestadas = respuestas.filter((r) => r.contestada);
  const tiempoPromedioMs = contestadas.length
    ? Math.round(contestadas.reduce((s, r) => s + r.ms, 0) / contestadas.length)
    : null;
  return {
    aciertos,
    total,
    puntaje: respuestas.reduce((s, r) => s + r.puntos, 0),
    rachaMax: respuestas.reduce((m, r) => Math.max(m, r.racha), 0),
    tiempoPromedioMs,
    calificacion: calificacion(aciertos, total),
  };
}

/** Aciertos y total por tema, en el orden de `temas` ([{ id, nombre }]). */
export function desempenoPorTema(respuestas, temas) {
  return temas.map((t) => {
    const delTema = respuestas.filter((r) => r.tema === t.id);
    return { id: t.id, nombre: t.nombre, aciertos: delTema.filter((r) => r.acierto).length, total: delTema.length };
  });
}
