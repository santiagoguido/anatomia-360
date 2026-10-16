// Insignias de la Clínica (Sesión 6). Los nombres y descripciones viven en src/game/ronda/insignias.js (catálogo único).
import { CLINICA } from './reglas.js';

/**
 * Insignias NUEVAS al terminar una guardia.
 *  - guardiasTerminadas: cuántas lleva el jugador, YA contando esta
 *  - ojoClinico: ¿algún caso de esta guardia se resolvió sin pistas y con 3 exploraciones o menos?
 *  - yaGanadas: ids que ya tiene
 */
export function evaluarInsigniasClinica({ guardiasTerminadas, ojoClinico, yaGanadas = [] }) {
  const logradas = [];
  if (guardiasTerminadas >= CLINICA.guardiasResidente) logradas.push('residente-de-guardia');
  if (ojoClinico) logradas.push('ojo-clinico');
  const tiene = new Set(yaGanadas);
  return logradas.filter((id) => !tiene.has(id));
}
