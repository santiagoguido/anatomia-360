import test from 'node:test';
import assert from 'node:assert/strict';
import { filasAvatar } from '../src/ui/sprites.js';

for (const genero of ['femenino', 'masculino']) {
  test(`avatar ${genero}: 24 filas de 16 columnas, simétrico`, () => {
    const filas = filasAvatar(genero);
    assert.equal(filas.length, 24);
    for (const fila of filas) {
      assert.equal(fila.length, 16);
      assert.equal(fila, [...fila].reverse().join(''), `la fila ${fila} no es simétrica`);
    }
  });
}
