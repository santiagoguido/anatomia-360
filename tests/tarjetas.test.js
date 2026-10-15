import test from 'node:test';
import assert from 'node:assert/strict';
import { aulasDesdeCalendario } from '../src/game/aulas.js';
import { LUGARES, lugarPorId } from '../src/game/mapa.js';
import { modeloTarjeta } from '../src/game/tarjetas.js';

const HOY = Date.parse('2026-10-29T18:00:00Z'); // semana 2: Aulas 1 y 2 abiertas
const aulas = aulasDesdeCalendario(HOY);
const jugador = { progreso: [{ aula: 1, ultimo_puntaje: 3620, record: 3980, rondas_jugadas: 7 }] };
const tarjeta = (id, j = jugador) => modeloTarjeta(lugarPorId(id), { aulas, jugador: j, ahoraMs: HOY });

test('aula abierta con progreso: último puntaje, récord y rondas', () => {
  const m = tarjeta('aula-1');
  assert.equal(m.abierta, true);
  assert.equal(m.encabezado, 'AULA 1 · SEMANA 1');
  assert.deepEqual(m.metricas.map((x) => x.valor), ['3,620', '3,980']);
  assert.equal(m.nota, '7 rondas jugadas');
  assert.equal(m.boton.habilitado, true);
});

test('aula abierta sin haber jugado: guiones, sin inventar números', () => {
  const m = tarjeta('aula-2');
  assert.equal(m.abierta, true);
  assert.deepEqual(m.metricas.map((x) => x.valor), ['—', '—']);
  assert.equal(m.nota, 'Todavía no juegas esta aula');
});

test('aula bloqueada: fecha de apertura, cuenta regresiva y botón apagado', () => {
  const m = tarjeta('aula-3');
  assert.equal(m.abierta, false);
  assert.equal(m.estado.texto, 'Bloqueada');
  assert.equal(m.cuenta.etiqueta, 'Se abre el lunes 2 de noviembre');
  assert.equal(m.cuenta.valor, '4 días');
  assert.equal(m.boton.habilitado, false);
  assert.ok(m.nota.includes('hasta el final del curso'));
});

test('Clínica: temas de las aulas abiertas', () => {
  const m = tarjeta('clinica');
  assert.equal(m.lineas[0], 'Casos con los temas de las semanas 1 y 2');
  assert.deepEqual(m.chips, ['Cuello', 'Faringe', 'Laringe y tiroides', 'Vasos del cuello']);
  assert.equal(m.boton.texto, 'Iniciar guardia · 5 pacientes');
});

test('Salón de la Fama y Control Escolar siempre disponibles', () => {
  assert.equal(tarjeta('salon-fama').lineas[0], 'Top 10 de la semana 2');
  assert.equal(tarjeta('control-escolar').boton.habilitado, true);
});

test('todos los lugares del mapa tienen tarjeta', () => {
  for (const l of LUGARES) assert.ok(modeloTarjeta(l, { aulas, jugador, ahoraMs: HOY }), l.id);
});

test('sin jugador ni progreso no truena', () => {
  assert.doesNotThrow(() => modeloTarjeta(lugarPorId('aula-1'), { aulas, jugador: null, ahoraMs: HOY }));
});
