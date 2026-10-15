// Colisiones del avatar contra rectángulos. Todo en píxeles; sin Phaser, para poder probarlo.
// El avatar choca con una caja pequeña en los pies, no con todo el sprite: así puede
// pasar "detrás" de árboles y edificios y la cabeza se dibuja por encima.

export const CAJA_PIES = { ancho: 10, alto: 6 };

export function intersecta(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Caja de colisión a partir del punto entre los pies (x, y). */
export function cajaPies(x, y, tam = CAJA_PIES) {
  return { x: x - tam.ancho / 2, y: y - tam.alto, w: tam.ancho, h: tam.alto };
}

export function hayColision(caja, obstaculos) {
  for (const o of obstaculos) if (intersecta(caja, o)) return true;
  return false;
}

const limitar = (v, min, max) => Math.min(Math.max(v, min), max);

/**
 * Mueve el punto (x, y) en (dx, dy) sin atravesar obstáculos ni salir del mundo.
 * Cada eje se prueba por separado, así el avatar se desliza por las paredes en vez de atorarse.
 * El movimiento se parte en pasos chicos para que un cuadro lento no lo "teletransporte" al otro lado.
 */
export function mover(pos, dx, dy, obstaculos, mundo, tam = CAJA_PIES) {
  let { x, y } = pos;
  const minX = tam.ancho / 2;
  const maxX = mundo.w - tam.ancho / 2;
  const minY = tam.alto;
  const maxY = mundo.h;
  const pasos = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2));
  const px = dx / pasos;
  const py = dy / pasos;
  let choqueX = false;
  let choqueY = false;

  for (let i = 0; i < pasos; i += 1) {
    if (px !== 0) {
      const nx = limitar(x + px, minX, maxX);
      if (hayColision(cajaPies(nx, y, tam), obstaculos)) choqueX = true;
      else x = nx;
    }
    if (py !== 0) {
      const ny = limitar(y + py, minY, maxY);
      if (hayColision(cajaPies(x, ny, tam), obstaculos)) choqueY = true;
      else y = ny;
    }
  }
  return { x, y, choqueX, choqueY };
}
