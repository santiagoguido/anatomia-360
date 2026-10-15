import test from 'node:test';
import assert from 'node:assert/strict';
import { DIRECCIONES, PASOS, cuadroAvatar } from '../src/game/avatarFrames.js';
import { filasAvatar, PALETA } from '../src/ui/sprites.js';

for (const genero of ['femenino', 'masculino']) {
  test(`avatar ${genero}: todos los cuadros miden 24 × 16 y usan solo colores de la paleta`, () => {
    for (const dir of DIRECCIONES) {
      for (const paso of PASOS) {
        const filas = cuadroAvatar(genero, dir, paso);
        assert.equal(filas.length, 24, `${dir}/${paso}`);
        for (const fila of filas) {
          assert.equal(fila.length, 16);
          for (const c of fila) assert.ok(c === '.' || c in PALETA, `color desconocido "${c}" en ${dir}/${paso}`);
        }
      }
    }
  });

  test(`avatar ${genero}: quieto y de frente es el mismo dibujo de la portada`, () => {
    assert.deepEqual(cuadroAvatar(genero, 'abajo', 0), filasAvatar(genero));
  });

  test(`avatar ${genero}: de espaldas no se le ve la cara`, () => {
    const cabeza = cuadroAvatar(genero, 'arriba', 0).slice(0, 10).join('');
    assert.ok(!/[eSsm]/.test(cabeza), 'quedó piel, ojos o boca en la cabeza');
  });

  test(`avatar ${genero}: de lado queda un solo ojo`, () => {
    const ojos = cuadroAvatar(genero, 'lado', 0).slice(0, 11).join('').split('e').length - 1;
    const frente = cuadroAvatar(genero, 'abajo', 0).slice(0, 11).join('').split('e').length - 1;
    assert.equal(ojos, frente / 2);
  });

  test(`avatar ${genero}: cada paso levanta un pie distinto`, () => {
    const quieto = cuadroAvatar(genero, 'abajo', 0);
    const p1 = cuadroAvatar(genero, 'abajo', 1);
    const p2 = cuadroAvatar(genero, 'abajo', 2);
    assert.notDeepEqual(p1, quieto);
    assert.notDeepEqual(p2, quieto);
    assert.notDeepEqual(p1, p2);
    assert.deepEqual(p1.slice(0, 19), quieto.slice(0, 19), 'solo cambian las piernas');
  });
}
