import test from 'node:test';
import assert from 'node:assert/strict';
import { clasificarError, ErrorApp } from '../src/api/errores.js';

test('errores propios de la base de datos', () => {
  assert.equal(clasificarError({ message: 'matricula_invalida' }), 'matricula_invalida');
  assert.equal(clasificarError({ message: 'nombre_invalido' }), 'nombre_invalido');
  assert.equal(clasificarError({ message: 'genero_invalido' }), 'genero_invalido');
});

test('falta ejecutar el SQL (la función no existe)', () => {
  assert.equal(clasificarError({ code: 'PGRST202', message: 'Could not find the function' }), 'esquema_faltante');
});

test('clave incorrecta, red y tiempo agotado', () => {
  assert.equal(clasificarError({ message: 'Invalid API key' }), 'clave_invalida');
  assert.equal(clasificarError({ message: 'TypeError: Failed to fetch' }), 'red');
  assert.equal(clasificarError({ message: 'Load failed' }), 'red');
  assert.equal(clasificarError({ message: 'cualquier cosa' }, { agotado: true }), 'tiempo');
  assert.equal(clasificarError({ name: 'AbortError', message: 'The operation was aborted' }), 'tiempo');
});

test('lo desconocido se reporta como error de servidor', () => {
  assert.equal(clasificarError({ message: 'algo raro' }), 'servidor');
  assert.equal(clasificarError(undefined), 'servidor');
});

test('ErrorApp conserva el código', () => {
  const e = new ErrorApp('red', 'detalle');
  assert.equal(e.codigo, 'red');
  assert.equal(e.message, 'detalle');
});
