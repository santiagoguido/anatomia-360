import test from 'node:test';
import assert from 'node:assert/strict';
import { actualizarRachaDias, diasEntre } from '../src/game/ronda/dias.js';

test('primera ronda: racha de 1 día', () => {
  assert.deepEqual(actualizarRachaDias({ racha: 0, ultimoDia: null }, '2026-10-15'), { racha: 1, ultimoDia: '2026-10-15' });
});

test('varias rondas el mismo día no suben la racha', () => {
  assert.deepEqual(actualizarRachaDias({ racha: 3, ultimoDia: '2026-10-15' }, '2026-10-15'), { racha: 3, ultimoDia: '2026-10-15' });
});

test('al día siguiente sube; saltarse un día la reinicia', () => {
  assert.equal(actualizarRachaDias({ racha: 3, ultimoDia: '2026-10-15' }, '2026-10-16').racha, 4);
  assert.equal(actualizarRachaDias({ racha: 6, ultimoDia: '2026-10-15' }, '2026-10-17').racha, 1);
});

test('cruza el fin de mes y de año', () => {
  assert.equal(actualizarRachaDias({ racha: 2, ultimoDia: '2026-10-31' }, '2026-11-01').racha, 3);
  assert.equal(actualizarRachaDias({ racha: 2, ultimoDia: '2026-12-31' }, '2027-01-01').racha, 3);
  assert.equal(diasEntre('2026-10-15', '2026-11-27'), 43);
});
