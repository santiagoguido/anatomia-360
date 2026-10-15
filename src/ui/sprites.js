// Avatares e íconos en pixel art, dibujados con rectángulos SVG.
// Cada avatar se define con la mitad izquierda de cada fila y se espeja, así
// siempre queda simétrico. Sesión 2 usará estos mismos colores para el sprite
// que camina por el campus.
import { s } from '../utils/dom.js';

const PALETA = {
  h: '#3A2216', H: '#6B4330', // pelo largo y su brillo
  k: '#1E1410', K: '#4A3326', // pelo corto y su brillo
  s: '#C98E6B', S: '#A9714F', // piel y sombra
  e: '#0A1828', m: '#8A3F36', // ojos y boca
  w: '#F6F5FA', g: '#C7CDDA', // bata y su sombra
  t: '#178582', T: '#0F4F4D', // scrub turquesa y pantalón
  c: '#2E4A66', y: '#BFA181', // estetoscopio / zapatos y placa dorada
};

const CABEZA = {
  femenino: ['....hhhh', '...hhhhh', '..hhhhHH', '..hhhhhh', '..hhhsss', '..hhssss', '..hhsess', '..hhssss', '..hhsssm', '..hh.sss', '..hh..SS'],
  masculino: ['....kkkk', '...kkkkk', '..kkkkKK', '..kkkkkk', '..kkksss', '..kkssss', '..kksess', '...kssss', '...ksssm', '....ssss', '.....SSS'],
};
const CUERPO = {
  femenino: ['..hwwwtS', '..hwwctt', '..gwwcwt', '..gwwwct', '..gwwwwc', '..ssgwwy', '..ssgwww'],
  masculino: ['..wwwwtS', '..wwwctt', '..gwwcwt', '..gwwwct', '..gwwwwc', '..ssgwwy', '..ssgwww'],
};
const PIERNAS = ['...wwwww', '....TTT.', '....TTT.', '....TTT.', '....ccc.', '...cccc.'];

const espejo = (mitad) => mitad + [...mitad].reverse().join('');

/** 24 filas de 16 caracteres. */
export function filasAvatar(genero) {
  const g = genero === 'femenino' ? 'femenino' : 'masculino';
  return [...CABEZA[g], ...CUERPO[g], ...PIERNAS].map(espejo);
}

/** Une píxeles contiguos del mismo color en una fila para usar menos rectángulos. */
function rectangulos(filas, paleta) {
  const rects = [];
  filas.forEach((fila, y) => {
    let x = 0;
    while (x < fila.length) {
      const c = fila[x];
      if (c === '.' || c === ' ') { x += 1; continue; }
      let fin = x;
      while (fin < fila.length && fila[fin] === c) fin += 1;
      rects.push(s('rect', { x, y, width: fin - x, height: 1, fill: paleta[c] ?? 'currentColor' }));
      x = fin;
    }
  });
  return rects;
}

/** Avatar de médica o médico con bata. */
export function crearAvatar(genero) {
  const filas = filasAvatar(genero);
  return s(
    'svg',
    {
      class: 'avatar',
      viewBox: `0 0 ${filas[0].length} ${filas.length}`,
      role: 'img',
      'aria-label': genero === 'femenino' ? 'Avatar: médica con bata' : 'Avatar: médico con bata',
      'shape-rendering': 'crispEdges',
    },
    ...rectangulos(filas, PALETA),
  );
}

const ICONOS = {
  check: ['........', '.......#', '......##', '#....##.', '##..##..', '.####...', '..##....', '........'],
  trofeo: ['########', '#.####.#', '#.####.#', '.######.', '..####..', '...##...', '...##...', '.######.'],
  estrella: ['...##...', '...##...', '########', '.######.', '..####..', '.##..##.', '.#....#.', '........'],
  llama: ['...#....', '...##...', '..###...', '..####.#', '.#######', '.##.####', '.##..###', '..#####.'],
  medalla: ['########', '########', '###..###', '##.##.##', '.######.', '.######.', '..####..', '...##...'],
  aviso: ['...##...', '...##...', '...##...', '...##...', '...##...', '........', '...##...', '...##...'],
};

/** Ícono de 8×8 que toma el color del texto (currentColor). */
export function crearIcono(nombre) {
  const filas = ICONOS[nombre];
  return s(
    'svg',
    { class: `icono icono--${nombre}`, viewBox: '0 0 8 8', 'aria-hidden': 'true', 'shape-rendering': 'crispEdges' },
    ...rectangulos(filas, { '#': 'currentColor' }),
  );
}
