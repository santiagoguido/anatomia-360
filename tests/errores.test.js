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

test('respuesta de la función de rondas: usa el código que mandó el servidor', async () => {
  const { clasificarRespuestaRondas, esReintentable } = await import('../src/api/errores.js');
  assert.equal(clasificarRespuestaRondas(403, { error: 'aula_cerrada' }), 'aula_cerrada');
  assert.equal(clasificarRespuestaRondas(422, { error: 'ronda_invalida' }), 'ronda_invalida');
  assert.equal(clasificarRespuestaRondas(503, { error: 'banco_insuficiente', tema: 'x' }), 'banco_insuficiente');
  // Un código que el juego no conoce no se muestra tal cual.
  assert.equal(clasificarRespuestaRondas(400, { error: 'inventado' }), 'servidor');
  // Si el gateway contesta 404 sin nuestro cuerpo, la función no está desplegada.
  assert.equal(clasificarRespuestaRondas(404, { message: 'Requested function was not found' }), 'funcion_no_desplegada');
  assert.equal(clasificarRespuestaRondas(404, { error: 'ronda_no_encontrada' }), 'ronda_no_encontrada');
  assert.equal(clasificarRespuestaRondas(401, null), 'clave_invalida');
  assert.equal(clasificarRespuestaRondas(500, null), 'servidor');
  assert.equal(esReintentable('red'), true);
  assert.equal(esReintentable('aula_cerrada'), false);
  assert.equal(esReintentable('ronda_invalida'), false);
});

test('todos los códigos de la función tienen mensaje para el alumno', async () => {
  const { CODIGOS_RONDA } = await import('../src/game/ronda/errores.js');
  const { ERRORES } = await import('../src/textos.js');
  for (const c of [...CODIGOS_RONDA, 'funcion_no_desplegada']) assert.ok(ERRORES[c], `falta el texto de ${c}`);
});
