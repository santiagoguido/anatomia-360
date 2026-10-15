import test from 'node:test';
import assert from 'node:assert/strict';
import { avanzarResistencia, barrasEncendidas, crearResistencia } from '../src/game/resistencia.js';

const correr = (est, segundos) => {
  let e = est;
  for (let i = 0; i < segundos * 60; i += 1) e = avanzarResistencia(e, 1 / 60, true, true);
  return e;
};

test('correr gasta la resistencia (unos 3 s seguidos) y al vaciarse ya no se puede correr', () => {
  assert.ok(correr(crearResistencia(), 2).nivel > 0.25, 'a los 2 s todavía hay resistencia');
  const e = correr(crearResistencia(), 3);
  assert.equal(e.agotada, true);
  assert.ok(e.nivel < 0.05);
  assert.equal(avanzarResistencia(e, 1 / 60, true, true).corre, false);
});

test('quieto, o sin querer correr, no gasta y se recupera', () => {
  let e = { nivel: 0.5, agotada: false };
  e = avanzarResistencia(e, 1, false, true);
  assert.ok(e.nivel > 0.5);
  e = avanzarResistencia({ nivel: 0.5, agotada: false }, 1, true, false); // quiere correr pero no se mueve
  assert.ok(e.nivel > 0.5);
  assert.equal(e.corre, false);
});

test('tras agotarse hay que recuperar el umbral antes de correr otra vez', () => {
  let e = { nivel: 0, agotada: true };
  e = avanzarResistencia(e, 0.5, true, true); // 0.11 de recarga: aún no
  assert.equal(e.agotada, true);
  assert.equal(e.corre, false);
  e = avanzarResistencia(e, 1, false, false); // ya pasó el umbral
  assert.equal(e.agotada, false);
});

test('nunca pasa de 1 ni baja de 0', () => {
  assert.equal(avanzarResistencia({ nivel: 1, agotada: false }, 10, false, false).nivel, 1);
  assert.equal(correr(crearResistencia(), 30).nivel >= 0, true);
});

test('barras encendidas: de 0 a 5', () => {
  assert.equal(barrasEncendidas(1), 5);
  assert.equal(barrasEncendidas(0.81), 5);
  assert.equal(barrasEncendidas(0.8), 4);
  assert.equal(barrasEncendidas(0.01), 1);
  assert.equal(barrasEncendidas(0), 0);
});
