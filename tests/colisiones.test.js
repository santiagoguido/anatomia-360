import test from 'node:test';
import assert from 'node:assert/strict';
import { cajaPies, hayColision, intersecta, mover } from '../src/game/colisiones.js';

const mundo = { w: 400, h: 300 };

test('intersecta: solo cuenta si se traslapan, no si se tocan', () => {
  assert.equal(intersecta({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.equal(intersecta({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }), false);
});

test('cajaPies: queda centrada en x y apoyada en y', () => {
  assert.deepEqual(cajaPies(100, 50), { x: 95, y: 44, w: 10, h: 6 });
});

test('mover: camina libre cuando no hay nada enfrente', () => {
  const r = mover({ x: 100, y: 100 }, 10, -4, [], mundo);
  assert.ok(Math.abs(r.x - 110) < 1e-6);
  assert.ok(Math.abs(r.y - 96) < 1e-6);
  assert.equal(r.choqueX, false);
});

test('mover: una pared frena el avance y se desliza por el otro eje', () => {
  const pared = [{ x: 120, y: 0, w: 10, h: 300 }];
  const r = mover({ x: 100, y: 100 }, 30, 10, pared, mundo);
  assert.ok(r.x <= 115, `no debe entrar a la pared (x=${r.x})`);
  assert.equal(r.choqueX, true);
  assert.ok(Math.abs(r.y - 110) < 1e-6, 'sigue avanzando en y');
});

test('mover: un cuadro muy largo no atraviesa una pared delgada', () => {
  const pared = [{ x: 150, y: 0, w: 2, h: 300 }];
  const r = mover({ x: 100, y: 100 }, 120, 0, pared, mundo);
  assert.ok(r.x < 150, `atravesó la pared (x=${r.x})`);
});

test('mover: no sale del mundo', () => {
  const izq = mover({ x: 6, y: 100 }, -50, 0, [], mundo);
  assert.equal(izq.x, 5);
  const abajo = mover({ x: 100, y: 298 }, 0, 50, [], mundo);
  assert.equal(abajo.y, 300);
  const arriba = mover({ x: 100, y: 8 }, 0, -50, [], mundo);
  assert.equal(arriba.y, 6);
});

test('hayColision: detecta cualquiera de varios obstáculos', () => {
  const obs = [{ x: 0, y: 0, w: 5, h: 5 }, { x: 50, y: 50, w: 5, h: 5 }];
  assert.equal(hayColision({ x: 52, y: 52, w: 2, h: 2 }, obs), true);
  assert.equal(hayColision({ x: 20, y: 20, w: 2, h: 2 }, obs), false);
});
