import test from 'node:test';
import assert from 'node:assert/strict';
import { combinarEntrada, direccionDe, vectorJoystick, vectorTeclado } from '../src/game/entrada.js';

test('joystick: dentro de la zona muerta no se mueve', () => {
  assert.equal(vectorJoystick(2, 1, 36).fuerza, 0);
  assert.equal(vectorJoystick(0, 0, 36).fuerza, 0);
});

test('joystick: a tope da fuerza 1 y dirección unitaria', () => {
  const v = vectorJoystick(100, 0, 36);
  assert.equal(v.fuerza, 1);
  assert.equal(v.x, 1);
  assert.equal(v.y, 0);
});

test('joystick: la fuerza crece de forma continua con la distancia', () => {
  const poco = vectorJoystick(14, 0, 36).fuerza;
  const medio = vectorJoystick(24, 0, 36).fuerza;
  assert.ok(poco > 0 && medio > poco && medio < 1);
});

test('teclado: la diagonal no es más rápida que ir recto', () => {
  const d = vectorTeclado(false, true, false, true);
  assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-9);
  assert.deepEqual(vectorTeclado(true, true, false, false), { x: 0, y: 0, fuerza: 0 });
});

test('combinarEntrada: manda el joystick si se usa, si no el teclado', () => {
  const joy = { x: 1, y: 0, fuerza: 0.5 };
  const tec = { x: 0, y: 1, fuerza: 1 };
  assert.equal(combinarEntrada(joy, tec), joy);
  assert.equal(combinarEntrada({ x: 0, y: 0, fuerza: 0 }, tec), tec);
});

test('dirección: eje dominante, con espejo a la izquierda', () => {
  assert.deepEqual(direccionDe({ x: 1, y: 0.1, fuerza: 1 }), { dir: 'lado', espejo: false });
  assert.deepEqual(direccionDe({ x: -1, y: 0.1, fuerza: 1 }), { dir: 'lado', espejo: true });
  assert.equal(direccionDe({ x: 0, y: -1, fuerza: 1 }).dir, 'arriba');
  assert.equal(direccionDe({ x: 0, y: 1, fuerza: 1 }).dir, 'abajo');
});

test('dirección: en diagonal exacta conserva la anterior (no parpadea)', () => {
  const antes = { dir: 'arriba', espejo: false };
  assert.equal(direccionDe({ x: 0.707, y: -0.707, fuerza: 1 }, antes), antes);
  assert.equal(direccionDe({ x: 0, y: 0, fuerza: 0 }, antes), antes);
});
