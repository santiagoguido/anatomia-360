// El campus: 3 × 3 pantallas de 52 × 24 tiles (de 16 px). Todo está en TILES salvo lo que diga "px".
// Es solo datos y cuentas: sin Phaser ni DOM, así se prueba que no haya lugares inalcanzables.
//
//            oeste (0)            centro (1)                       este (2)
//   norte    jardín + biblioteca  jardín                           estanque
//   medio    CONTROL ESCOLAR      plaza · Aulas 1-3 · Clínica ·    AULAS 4, 5 y 6
//                                 Salón de la Fama
//   sur      cafetería            jardín + estanque                estanque
import { mulberry32 } from '../utils/azar.js';

export const TILE = 16;
export const PANTALLA = { w: 52, h: 24 };
export const PANTALLAS = { columnas: 3, filas: 3 };
export const MUNDO = { w: PANTALLA.w * PANTALLAS.columnas, h: PANTALLA.h * PANTALLAS.filas }; // 156 × 72 tiles
export const MUNDO_PX = { w: MUNDO.w * TILE, h: MUNDO.h * TILE };

const rect = (x, y, w, h) => ({ x, y, w, h });
export const expandir = (r, n) => rect(r.x - n, r.y - n, r.w + 2 * n, r.h + 2 * n);
export const enPx = (r) => rect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
const contiene = (r, tx, ty) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h;

// ---- Suelo -------------------------------------------------------------------

export const CAMINOS = [
  rect(0, 35, MUNDO.w, 3), // calzada este-oeste
  rect(77, 31, 3, 41), // calzada de la plaza hacia el sur
  rect(58, 31, 3, 4), // puerta del Aula 1
  rect(96, 31, 3, 4), // puerta del Aula 3
  rect(61, 44, 2, 3), // puerta de la Clínica
  rect(94, 44, 2, 3), // puerta del Salón de la Fama
  rect(130, 44, 3, 3), // puerta del Aula 5
];

export const PLAZA = rect(71, 31, 15, 11);
export const FUENTE = rect(76, 35, 5, 3);

export const ESTANQUES = [rect(8, 5, 10, 6), rect(125, 5, 12, 7), rect(120, 55, 12, 7)];

// ---- Edificios ----------------------------------------------------------------

export const EDIFICIOS = [
  { id: 'aula-1', tipo: 'aula', numero: 1, ...rect(56, 25, 7, 6) },
  { id: 'aula-2', tipo: 'aula', numero: 2, ...rect(75, 25, 7, 6) },
  { id: 'aula-3', tipo: 'aula', numero: 3, ...rect(94, 25, 7, 6) },
  { id: 'clinica', tipo: 'clinica', ...rect(58, 38, 8, 6) },
  { id: 'salon-fama', tipo: 'salon', ...rect(91, 38, 8, 6) },
  { id: 'control-escolar', tipo: 'control', ...rect(10, 29, 9, 6) },
  { id: 'aula-4', tipo: 'aula', numero: 4, ...rect(112, 29, 7, 6) },
  { id: 'aula-5', tipo: 'aula', numero: 5, ...rect(128, 38, 7, 6) },
  { id: 'aula-6', tipo: 'aula', numero: 6, ...rect(144, 29, 7, 6) },
  { id: 'biblioteca', tipo: 'deco', ...rect(30, 6, 12, 8) },
  { id: 'cafeteria', tipo: 'deco', ...rect(20, 58, 12, 8) },
];

/** Margen (en tiles) alrededor de cada lugar donde aparece su tarjeta. */
export const MARGEN_LUGAR = 2;

/** Lugares con los que se puede interactuar (todo menos los edificios de adorno). */
export const LUGARES = EDIFICIOS.filter((e) => e.tipo !== 'deco');

export function lugarPorId(id) {
  return LUGARES.find((l) => l.id === id) ?? null;
}

// ---- Mobiliario ----------------------------------------------------------------

export const BANCAS = [rect(72, 32, 2, 1), rect(83, 32, 2, 1), rect(72, 40, 2, 1), rect(83, 40, 2, 1)];

export const FAROLAS = [
  [55, 34], [64, 34], [70, 34], [86, 34], [93, 34], [102, 34],
  [9, 34], [20, 34], [111, 34], [120, 34], [143, 34], [152, 34],
  [127, 38], [136, 38],
].map(([x, y]) => ({ x, y }));

export const ESTATUAS = [
  { x: 72, y: 29 },
  { x: 84, y: 29 },
  { x: 80, y: 44 },
];

/** Carteles pintados sobre la calzada, en los bordes de la pantalla central. */
export const CARTELES = [
  { clave: 'oeste', x: 52 * TILE + 8, y: 36.5 * TILE, alinear: 'izquierda' },
  { clave: 'este', x: 104 * TILE - 8, y: 36.5 * TILE, alinear: 'derecha' },
];

/** Dónde aparece el avatar: en la plaza, mirando hacia el sur. Punto entre los pies, en px. */
export const SPAWN = { x: 78.5 * TILE, y: 40 * TILE };

// ---- Árboles (siempre los mismos: la semilla es fija) -----------------------------

function generarArboles() {
  const azar = mulberry32(3602026);
  const prohibidas = [
    ...CAMINOS.map((c) => expandir(c, 1)),
    expandir(PLAZA, 2),
    ...EDIFICIOS.map((e) => expandir(e, 2)),
    ...ESTANQUES.map((e) => expandir(e, 1)),
    ...BANCAS.map((b) => expandir(b, 1)),
    ...FAROLAS.map((f) => expandir(rect(f.x, f.y, 1, 1), 1)),
    ...ESTATUAS.map((s) => expandir(rect(s.x, s.y, 1, 1), 1)),
  ];
  const arboles = [];
  for (let c = 0; c < PANTALLAS.columnas; c += 1) {
    for (let f = 0; f < PANTALLAS.filas; f += 1) {
      const centro = c === 1 && f === 1;
      const meta = centro ? 10 : 26;
      let puestos = 0;
      for (let intento = 0; intento < meta * 40 && puestos < meta; intento += 1) {
        const tx = c * PANTALLA.w + 1 + Math.floor(azar() * (PANTALLA.w - 2));
        const ty = f * PANTALLA.h + 2 + Math.floor(azar() * (PANTALLA.h - 3));
        if (prohibidas.some((r) => contiene(r, tx, ty))) continue;
        if (arboles.some((a) => Math.abs(a.tx - tx) < 3 && Math.abs(a.ty - ty) < 3)) continue;
        arboles.push({ tx, ty, variante: azar() < 0.5 ? 0 : 1 });
        puestos += 1;
      }
    }
  }
  return arboles;
}

export const ARBOLES = generarArboles();

// ---- Obstáculos (px) --------------------------------------------------------------

/** Rectángulos sólidos, en píxeles, que el avatar no puede atravesar. */
function generarObstaculos() {
  const o = [];
  for (const e of EDIFICIOS) o.push(enPx(e));
  o.push(rect(FUENTE.x * TILE + 2, FUENTE.y * TILE + 4, FUENTE.w * TILE - 4, FUENTE.h * TILE - 6));
  for (const e of ESTANQUES) o.push(enPx(e));
  for (const b of BANCAS) o.push(rect(b.x * TILE, b.y * TILE + 4, b.w * TILE, 8));
  for (const f of FAROLAS) o.push(rect(f.x * TILE + 5, f.y * TILE + 10, 6, 6));
  for (const s of ESTATUAS) o.push(rect(s.x * TILE - 2, s.y * TILE + 4, 20, 12));
  for (const a of ARBOLES) o.push(rect(a.tx * TILE + 4, a.ty * TILE + 8, 8, 8)); // solo el tronco
  return o;
}

export const OBSTACULOS = generarObstaculos();

// ---- Consultas ----------------------------------------------------------------------

/** Pantalla (columna, fila) donde está un punto en px. */
export function pantallaDe(px, py) {
  return {
    columna: Math.min(PANTALLAS.columnas - 1, Math.max(0, Math.floor(px / (PANTALLA.w * TILE)))),
    fila: Math.min(PANTALLAS.filas - 1, Math.max(0, Math.floor(py / (PANTALLA.h * TILE)))),
  };
}

/** ¿El punto (px) está dentro del área de un lugar, con `margen` tiles alrededor? */
export function dentroDeLugar(lugar, px, py, margen = MARGEN_LUGAR) {
  const z = enPx(expandir(lugar, margen));
  return px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h;
}

/** Distancia al borde de un lugar (0 si está dentro del edificio). Sirve para elegir el más cercano. */
export function distanciaALugar(lugar, px, py) {
  const r = enPx(lugar);
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}
