import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aulasAbiertas, aulasDesdeCalendario, estaAbierta, etiquetaSemana, normalizarAulas,
  segundosParaAbrir, semanaDelCurso, textoCuentaRegresiva, textoFaltante, textoFechaApertura,
} from '../src/game/aulas.js';

const ms = (iso) => Date.parse(iso);
// 15 de octubre de 2026, mediodía en CDMX: el curso aún no empieza pero el Aula 1 ya está abierta.
const HOY = ms('2026-10-15T18:00:00Z');

test('calendario local: solo el Aula 1 está abierta antes del 26 de octubre', () => {
  const aulas = aulasDesdeCalendario(HOY);
  assert.deepEqual(aulas.map((a) => estaAbierta(a, HOY)), [true, false, false, false, false, false]);
});

test('las aulas abren a las 00:00 de CDMX del lunes, ni un segundo antes', () => {
  const aulas = aulasDesdeCalendario(HOY);
  const aula2 = aulas[1];
  assert.equal(estaAbierta(aula2, ms('2026-10-26T05:59:59Z')), false); // 23:59:59 del domingo en CDMX
  assert.equal(estaAbierta(aula2, ms('2026-10-26T06:00:00Z')), true); // 00:00:00 del lunes
});

test('las 6 aulas abren cada lunes: 26 oct, 2, 9, 16 y 23 nov', () => {
  const textos = aulasDesdeCalendario(HOY).slice(1).map((a) => textoFechaApertura(a.abreEnMs));
  assert.deepEqual(textos, [
    'lunes 26 de octubre', 'lunes 2 de noviembre', 'lunes 9 de noviembre', 'lunes 16 de noviembre', 'lunes 23 de noviembre',
  ]);
});

test('con datos del servidor, manda su cuenta (no el reloj del teléfono)', () => {
  const filas = [{ numero: 2, titulo: 'Aula 2', temas: ['x'], abre_en: '2026-10-26T06:00:00Z', abierta: false, segundos_para_abrir: 120 }];
  const [aula] = normalizarAulas(filas, 1_000_000);
  // El teléfono "cree" que ya es 2030, pero el servidor dijo que faltaban 120 s.
  assert.equal(segundosParaAbrir(aula, 1_000_000), 120);
  assert.equal(segundosParaAbrir(aula, 1_000_000 + 30_000), 90);
  assert.equal(estaAbierta(aula, 1_000_000 + 30_000), false);
  assert.equal(estaAbierta(aula, 1_000_000 + 120_000), true);
});

test('un aula que el servidor marca abierta se ve abierta', () => {
  const [aula] = normalizarAulas([{ numero: 1, titulo: 'Aula 1', temas: [], abre_en: '2026-10-01T06:00:00Z', abierta: true, segundos_para_abrir: 0 }], HOY);
  assert.equal(estaAbierta(aula, HOY), true);
});

test('cuenta regresiva: días o hh:mm:ss en el último día', () => {
  assert.equal(textoCuentaRegresiva(6 * 86400 + 5), '6 días');
  assert.equal(textoCuentaRegresiva(86400), '1 día');
  assert.equal(textoCuentaRegresiva(86399), '23:59:59');
  assert.equal(textoCuentaRegresiva(65), '00:01:05');
  assert.equal(textoCuentaRegresiva(-3), '00:00:00');
});

test('semana del curso: la 1 empieza el lunes 19 de octubre', () => {
  assert.equal(semanaDelCurso(ms('2026-10-15T18:00:00Z')).numero, 1, 'antes de empezar cuenta como semana 1');
  assert.equal(etiquetaSemana(ms('2026-10-15T18:00:00Z')), 'Lun 19 oct · Semana 1');
  assert.equal(etiquetaSemana(ms('2026-10-19T06:00:00Z')), 'Lun 19 oct · Semana 1');
  assert.equal(etiquetaSemana(ms('2026-10-25T05:59:00Z')), 'Lun 19 oct · Semana 1'); // domingo 23:59 CDMX
  assert.equal(etiquetaSemana(ms('2026-10-28T18:00:00Z')), 'Lun 26 oct · Semana 2');
  assert.equal(etiquetaSemana(ms('2026-11-27T18:00:00Z')), 'Lun 23 nov · Semana 6');
  assert.equal(etiquetaSemana(ms('2026-12-30T18:00:00Z')), 'Lun 23 nov · Semana 6', 'después del curso se queda en la última');
});

test('aulasAbiertas: ordenadas por número', () => {
  const ahora = ms('2026-11-10T18:00:00Z');
  assert.deepEqual(aulasAbiertas(aulasDesdeCalendario(ahora), ahora).map((a) => a.numero), [1, 2, 3, 4]);
});

test('lo que falta se cuenta en días de calendario y, el último día, en horas', () => {
  const [, aula2] = aulasDesdeCalendario(HOY); // abre lunes 26 de octubre 00:00 CDMX
  assert.equal(textoFaltante(aula2, ms('2026-10-20T16:00:00Z')), '6 días'); // martes 10:00 → lunes
  assert.equal(textoFaltante(aula2, ms('2026-10-24T18:00:00Z')), '2 días'); // sábado 12:00
  assert.equal(textoFaltante(aula2, ms('2026-10-26T05:00:00Z')), '01:00:00'); // domingo 23:00
  assert.equal(textoFaltante(aula2, ms('2026-10-26T05:59:59Z')), '00:00:01');
});
