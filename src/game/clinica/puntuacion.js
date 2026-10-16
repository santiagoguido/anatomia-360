// Puntos de la Clínica. Funciones puras: el servidor las usa para calificar.
import { CLINICA, MAXIMO_CASO, MAXIMO_GUARDIA, PUNTOS_CLINICA } from './reglas.js';

/** Puntos de un paso según el intento en que se acertó (1 o 2). 0 si no se acertó. */
export function puntosDePaso(intentoAcertado) {
  if (intentoAcertado === 1) return PUNTOS_CLINICA.pasoPrimerIntento;
  if (intentoAcertado === 2) return PUNTOS_CLINICA.pasoSegundoIntento;
  return 0;
}

/**
 * Resultado de un caso.
 *  - pasos: [{ acertado: bool, intento: 1|2|null }] (3)
 *  - exploraciones: cuántas exploraciones distintas hizo el alumno
 *  - pistas: cuántas pistas pidió
 * Resuelto = los 3 pasos acertados (al primer o segundo intento). El bono se da si además usó 3 exploraciones o menos.
 * El total de un caso nunca baja de 0.
 */
export function puntuarCaso({ pasos, exploraciones, pistas }) {
  const porPasos = pasos.reduce((s, p) => s + (p.acertado ? puntosDePaso(p.intento) : 0), 0);
  const resuelto = pasos.length === CLINICA.pasos && pasos.every((p) => p.acertado);
  const bono = resuelto && exploraciones <= CLINICA.exploracionesParaBono ? PUNTOS_CLINICA.bonoPocasExploraciones : 0;
  const descuento = pistas * PUNTOS_CLINICA.pista;
  const total = Math.max(0, porPasos + bono - descuento);
  return { porPasos, bono, descuento, total, resuelto, ojoClinico: resuelto && pistas === 0 && exploraciones <= CLINICA.exploracionesParaBono };
}

/** Puntaje de una guardia: la suma de sus casos. */
export const puntuarGuardia = (casos) => casos.reduce((s, c) => s + c.total, 0);

export { MAXIMO_CASO, MAXIMO_GUARDIA };
