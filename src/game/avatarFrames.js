// Cuadros del avatar que camina por el campus, armados a partir del mismo sprite de la portada
// (src/ui/sprites.js) para que la médica o el médico se vean igual en todo el juego.
// Cada cuadro son 24 filas de 16 caracteres; cada letra es un color de PALETA.
import { filasAvatar } from '../ui/sprites.js';

export const DIRECCIONES = ['abajo', 'arriba', 'lado'];
/** 0 = quieto, 1 y 2 = pasos (se levanta un pie y luego el otro). */
export const PASOS = [0, 1, 2];

const PELO = { femenino: 'h', masculino: 'k' };
const FILAS_CABEZA = 11; // las primeras 11 filas son la cabeza
const FILA_PIERNAS = 19; // desde aquí empiezan las piernas (la fila 18 es el borde de la bata)

const aMatriz = (filas) => filas.map((f) => [...f]);
const aFilas = (m) => m.map((f) => f.join(''));

/** Levanta un pie 2 px: paso 1 = izquierdo, paso 2 = derecho. */
function conPaso(m, paso) {
  if (paso === 0) return m;
  const [ini, fin] = paso === 1 ? [0, 8] : [8, 16];
  for (let y = FILA_PIERNAS; y < 22; y += 1) for (let x = ini; x < fin; x += 1) m[y][x] = m[y + 2][x];
  for (let y = 22; y < 24; y += 1) for (let x = ini; x < fin; x += 1) m[y][x] = '.';
  return m;
}

/** De espaldas: la cara se cubre con pelo y se quitan el estetoscopio y la placa. */
function deEspaldas(m, genero) {
  const pelo = PELO[genero];
  for (let y = 0; y < FILAS_CABEZA - 1; y += 1) {
    for (let x = 0; x < 16; x += 1) if ('sSem'.includes(m[y][x])) m[y][x] = pelo;
  }
  for (let y = FILAS_CABEZA; y < 24; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      if (m[y][x] === 'c' && y < 18) m[y][x] = 'w';
      if (m[y][x] === 'y' && y < 18) m[y][x] = 'w';
    }
  }
  return m;
}

/** De lado: se deja un solo ojo y la boca corrida (el espejo horizontal lo hace el juego). */
function deLado(m) {
  for (let y = 0; y < FILAS_CABEZA; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      if (m[y][x] === 'e') m[y][x] = 's';
    }
    if (m[y][7] === 'm') m[y][7] = 's';
  }
  return m;
}

/** Cuadro (24 filas × 16 columnas) para un género, una dirección y un paso. */
export function cuadroAvatar(genero, direccion = 'abajo', paso = 0) {
  const g = genero === 'femenino' ? 'femenino' : 'masculino';
  let m = aMatriz(filasAvatar(g));
  if (direccion === 'arriba') m = deEspaldas(m, g);
  if (direccion === 'lado') m = deLado(m);
  return aFilas(conPaso(m, paso));
}
