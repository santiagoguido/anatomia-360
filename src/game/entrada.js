// Convierte joystick y teclado en un solo vector de movimiento. Sin DOM ni Phaser.

/**
 * Vector del joystick a partir de cuánto se desplazó el pulgar del centro.
 * `fuerza` va de 0 a 1 y ya descuenta la zona muerta (un roce sin querer no mueve al avatar).
 */
export function vectorJoystick(dx, dy, radio, zonaMuerta = 0.18) {
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || radio <= 0) return { x: 0, y: 0, fuerza: 0 };
  const llevado = Math.min(dist / radio, 1);
  if (llevado < zonaMuerta) return { x: 0, y: 0, fuerza: 0 };
  const fuerza = (llevado - zonaMuerta) / (1 - zonaMuerta);
  return { x: dx / dist, y: dy / dist, fuerza };
}

/** Teclas (-1, 0, 1 en cada eje) → vector con la misma longitud en diagonal. */
export function vectorTeclado(izq, der, arriba, abajo) {
  const x = (der ? 1 : 0) - (izq ? 1 : 0);
  const y = (abajo ? 1 : 0) - (arriba ? 1 : 0);
  if (x === 0 && y === 0) return { x: 0, y: 0, fuerza: 0 };
  const largo = Math.hypot(x, y);
  return { x: x / largo, y: y / largo, fuerza: 1 };
}

/** Manda el joystick si se está usando; si no, el teclado. */
export function combinarEntrada(joystick, teclado) {
  return joystick && joystick.fuerza > 0 ? joystick : teclado;
}

/**
 * Hacia dónde mira el avatar: 'abajo', 'arriba' o 'lado' (con `espejo` para mirar a la izquierda).
 * Si el vector es casi diagonal, conserva la dirección anterior para que no parpadee.
 */
export function direccionDe(vec, anterior = { dir: 'abajo', espejo: false }) {
  if (!vec || vec.fuerza === 0) return anterior;
  const ax = Math.abs(vec.x);
  const ay = Math.abs(vec.y);
  if (Math.abs(ax - ay) < 0.12) return anterior;
  if (ax > ay) return { dir: 'lado', espejo: vec.x < 0 };
  return { dir: vec.y > 0 ? 'abajo' : 'arriba', espejo: anterior.espejo };
}
