import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPUS } from '../src/textos.js';
import { cajaPies, hayColision } from '../src/game/colisiones.js';
import {
  ARBOLES, CAMINOS, EDIFICIOS, ESTANQUES, FUENTE, LUGARES, MARGEN_LUGAR, MUNDO, MUNDO_PX, OBSTACULOS, PANTALLA,
  PANTALLAS, PLAZA, SPAWN, TILE, dentroDeLugar, enPx, pantallaDe,
} from '../src/game/mapa.js';

const choca = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test('el mundo mide 3 × 3 pantallas', () => {
  assert.deepEqual(MUNDO, { w: PANTALLA.w * PANTALLAS.columnas, h: PANTALLA.h * PANTALLAS.filas });
  assert.deepEqual(MUNDO_PX, { w: MUNDO.w * TILE, h: MUNDO.h * TILE });
});

test('hay 6 aulas (una por número) y los lugares del mockup', () => {
  const aulas = EDIFICIOS.filter((e) => e.tipo === 'aula').map((e) => e.numero).sort();
  assert.deepEqual(aulas, [1, 2, 3, 4, 5, 6]);
  for (const id of ['clinica', 'salon-fama', 'control-escolar']) assert.ok(LUGARES.some((l) => l.id === id), id);
});

test('el campus empieza como en el mockup: Aulas 1-3, Clínica y Salón en la pantalla central; Control Escolar al oeste; Aulas 4-6 al este', () => {
  const pantalla = (id) => {
    const e = EDIFICIOS.find((x) => x.id === id);
    return pantallaDe((e.x + e.w / 2) * TILE, (e.y + e.h / 2) * TILE);
  };
  for (const id of ['aula-1', 'aula-2', 'aula-3', 'clinica', 'salon-fama']) assert.deepEqual(pantalla(id), { columna: 1, fila: 1 }, id);
  assert.deepEqual(pantalla('control-escolar'), { columna: 0, fila: 1 });
  for (const id of ['aula-4', 'aula-5', 'aula-6']) assert.deepEqual(pantalla(id), { columna: 2, fila: 1 }, id);
  assert.deepEqual(pantallaDe(SPAWN.x, SPAWN.y), { columna: 1, fila: 1 });
});

test('cada edificio tiene su etiqueta de texto y cabe dentro del mundo', () => {
  for (const e of EDIFICIOS) {
    assert.ok(CAMPUS.etiquetas[e.id], `falta etiqueta de ${e.id}`);
    assert.ok(e.x >= 0 && e.y >= 3 && e.x + e.w <= MUNDO.w && e.y + e.h <= MUNDO.h, `${e.id} se sale del mundo`);
  }
});

test('los edificios, la fuente y los estanques no se encimen', () => {
  const cosas = [...EDIFICIOS.map((e) => [e.id, e]), ['fuente', FUENTE], ...ESTANQUES.map((e, i) => [`estanque-${i}`, e])];
  for (let i = 0; i < cosas.length; i += 1) {
    for (let j = i + 1; j < cosas.length; j += 1) {
      assert.equal(choca(cosas[i][1], cosas[j][1]), false, `${cosas[i][0]} se encima con ${cosas[j][0]}`);
    }
  }
  for (const e of EDIFICIOS) assert.equal(choca(e, PLAZA), false, `${e.id} se encima con la plaza`);
});

test('los árboles no tapan caminos ni plaza ni tarjetas y hay muchos', () => {
  assert.ok(ARBOLES.length > 150);
  for (const a of ARBOLES) {
    const tile = { x: a.tx, y: a.ty, w: 1, h: 1 };
    for (const c of CAMINOS) assert.equal(choca(tile, c), false, `árbol en camino (${a.tx},${a.ty})`);
    assert.equal(choca(tile, PLAZA), false, `árbol en la plaza (${a.tx},${a.ty})`);
    for (const l of LUGARES) assert.equal(dentroDeLugar(l, (a.tx + 0.5) * TILE, (a.ty + 0.5) * TILE, 1), false, `árbol pegado a ${l.id}`);
  }
});

test('el mapa se genera igual cada vez (misma semilla)', async () => {
  const otra = await import(`../src/game/mapa.js?otra=${Date.now()}`);
  assert.deepEqual(otra.ARBOLES, ARBOLES);
});

test('el avatar aparece en un lugar libre', () => {
  assert.equal(hayColision(cajaPies(SPAWN.x, SPAWN.y), OBSTACULOS), false);
});

test('todos los obstáculos están dentro del mundo', () => {
  for (const o of OBSTACULOS) {
    assert.ok(o.x >= 0 && o.y >= 0 && o.x + o.w <= MUNDO_PX.w && o.y + o.h <= MUNDO_PX.h, JSON.stringify(o));
  }
});

// Recorre el campus a pie (cuadrícula de 4 px) para asegurar que ningún lugar quedó encerrado.
test('desde la plaza se llega a la puerta de cada lugar (y a las esquinas del mundo)', () => {
  const PASO = 4;
  const cols = MUNDO_PX.w / PASO;
  const filas = MUNDO_PX.h / PASO;
  const libre = new Uint8Array(cols * filas);
  for (let j = 0; j < filas; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const x = i * PASO + PASO / 2;
      const y = j * PASO + PASO / 2;
      const dentro = x >= 5 && x <= MUNDO_PX.w - 5 && y >= 6 && y <= MUNDO_PX.h;
      libre[j * cols + i] = dentro && !hayColision(cajaPies(x, y), OBSTACULOS) ? 1 : 0;
    }
  }
  const visto = new Uint8Array(cols * filas);
  const inicio = Math.floor(SPAWN.y / PASO) * cols + Math.floor(SPAWN.x / PASO);
  assert.equal(libre[inicio], 1);
  const cola = [inicio];
  visto[inicio] = 1;
  for (let k = 0; k < cola.length; k += 1) {
    const n = cola[k];
    const i = n % cols;
    const j = (n - i) / cols;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= filas) continue;
      const m = nj * cols + ni;
      if (libre[m] && !visto[m]) { visto[m] = 1; cola.push(m); }
    }
  }
  const alcanzable = (px, py) => visto[Math.floor(py / PASO) * cols + Math.floor(px / PASO)] === 1;

  for (const l of LUGARES) {
    const z = enPx({ x: l.x - MARGEN_LUGAR, y: l.y - MARGEN_LUGAR, w: l.w + 2 * MARGEN_LUGAR, h: l.h + 2 * MARGEN_LUGAR });
    let hay = false;
    for (let y = z.y; y < z.y + z.h && !hay; y += PASO) {
      for (let x = z.x; x < z.x + z.w && !hay; x += PASO) {
        if (dentroDeLugar(l, x, y) && alcanzable(x, y)) hay = true;
      }
    }
    assert.ok(hay, `no se puede llegar a ${l.id}`);
  }
  for (const [x, y] of [[20, 30], [MUNDO_PX.w - 20, 30], [20, MUNDO_PX.h - 6], [MUNDO_PX.w - 20, MUNDO_PX.h - 6]]) {
    assert.ok(alcanzable(x, y) || !libre[Math.floor(y / PASO) * cols + Math.floor(x / PASO)], `esquina inalcanzable (${x},${y})`);
  }
  const libres = libre.reduce((a, b) => a + b, 0);
  assert.ok(cola.length / libres > 0.99, `solo ${(100 * cola.length / libres).toFixed(1)}% del suelo libre es alcanzable`);
});
