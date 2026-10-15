// Resistencia para correr (las 5 barritas del botón CORRER). Sin Phaser, para poder probarla.
import { MOVIMIENTO } from '../config.js';

const { consumo, recarga, umbral } = MOVIMIENTO.resistencia;

export function crearResistencia() {
  return { nivel: 1, agotada: false };
}

/**
 * Avanza `dt` segundos. Solo se gasta al correr moviéndose; al vaciarse hay que
 * esperar a recuperar un poco (umbral) antes de volver a correr, para que no tartamudee.
 * Devuelve el nuevo estado y si en este cuadro el avatar corre.
 */
export function avanzarResistencia(estado, dt, quiereCorrer, seMueve) {
  let { nivel, agotada } = estado;
  const corre = quiereCorrer && seMueve && !agotada && nivel > 0;
  if (corre) {
    nivel = Math.max(0, nivel - consumo * dt);
    if (nivel === 0) agotada = true;
  } else {
    nivel = Math.min(1, nivel + recarga * dt);
    if (agotada && nivel >= umbral) agotada = false;
  }
  return { nivel, agotada, corre };
}

/** Barras encendidas (de 0 a `barras`) para dibujar el indicador. */
export function barrasEncendidas(nivel, barras = MOVIMIENTO.resistencia.barras) {
  return Math.max(0, Math.ceil(Math.min(1, Math.max(0, nivel)) * barras - 1e-9));
}
