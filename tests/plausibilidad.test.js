import test from 'node:test';
import assert from 'node:assert/strict';
import { revisarTiempos } from '../src/game/ronda/plausibilidad.js';

const r = (ms, contestada = true) => ({ ms, contestada });

test('25 respuestas en 30 segundos (1.2 s cada una) se rechazan', () => {
  assert.deepEqual(revisarTiempos(Array.from({ length: 25 }, () => r(500))), { ok: false, motivo: 'demasiado_rapida' });
  // 30 s en total: cada respuesta tarda 1.2 s entre sí, de las cuales 0.7 s son la pausa acreditada → ~0.5 s medidos.
});

test('una ronda normal (10 s por pregunta) pasa', () => {
  assert.equal(revisarTiempos(Array.from({ length: 25 }, () => r(10000))).ok, true);
});

test('un jugador muy rápido pero humano (3 s por pregunta) pasa', () => {
  assert.equal(revisarTiempos(Array.from({ length: 25 }, () => r(3000))).ok, true);
});

test('5 respuestas relámpago (< 0.8 s) rechazan aunque el promedio sea alto', () => {
  const rs = [...Array.from({ length: 5 }, () => r(300)), ...Array.from({ length: 20 }, () => r(20000))];
  assert.deepEqual(revisarTiempos(rs), { ok: false, motivo: 'respuestas_relampago' });
});

test('4 respuestas relámpago todavía se toleran (clic por error o pregunta ya conocida)', () => {
  const rs = [...Array.from({ length: 4 }, () => r(300)), ...Array.from({ length: 21 }, () => r(20000))];
  assert.equal(revisarTiempos(rs).ok, true);
});

test('las sin contestar no cuentan; con menos de 5 contestadas no se promedia', () => {
  const rs = [r(900), ...Array.from({ length: 24 }, () => r(42000, false))];
  assert.equal(revisarTiempos(rs).ok, true);
});
