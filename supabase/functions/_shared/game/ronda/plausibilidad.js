// ARCHIVO GENERADO por scripts/sincronizar-funcion.js. No lo edites: cambia el original y ejecuta `npm run funcion:preparar`.
// Rechazo de rondas imposibles para un humano. Se calcula con los tiempos que midió el SERVIDOR.
import { RONDA } from './reglas.js';

/**
 * Revisa los tiempos de las respuestas contestadas (campo `ms`, medido por el servidor).
 * Rechaza si el promedio es menor a 1.5 s (p. ej. 25 respuestas en 30 s) o si hay 5 o más
 * respuestas de menos de 0.8 s. Devuelve { ok, motivo }.
 */
export function revisarTiempos(respuestas) {
  const contestadas = respuestas.filter((r) => r.contestada);
  if (contestadas.length >= RONDA.minimoParaPromediar) {
    const promedio = contestadas.reduce((s, r) => s + r.ms, 0) / contestadas.length;
    if (promedio < RONDA.minimoPromedioMs) return { ok: false, motivo: 'demasiado_rapida' };
  }
  const relampago = contestadas.filter((r) => r.ms < RONDA.relampagoMs).length;
  if (relampago >= RONDA.relampagoMaximo) return { ok: false, motivo: 'respuestas_relampago' };
  return { ok: true, motivo: null };
}
