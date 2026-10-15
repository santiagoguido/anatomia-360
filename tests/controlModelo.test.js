import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TEMAS_AULA } from '../src/config.js';
import {
  insigniasConEstado, nivel, porcentaje, resumenGeneral, tarjetasAula, temasConResultados, temasParaRepasar, textoInsignias,
} from '../src/ui/control/modelo.js';

test('TEMAS_AULA coincide con los ids y nombres de contenido/preguntas', () => {
  for (let n = 1; n <= 6; n++) {
    const banco = JSON.parse(readFileSync(new URL(`../contenido/preguntas/aula-${n}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(TEMAS_AULA[n], banco.temas, `Aula ${n}`);
  }
});

test('niveles: 80% o más domina, 60–79 va bien, menos de 60 se repasa, sin respuestas = sin datos', () => {
  assert.equal(nivel(8, 10), 'fuerte');
  assert.equal(nivel(79, 100), 'regular');
  assert.equal(nivel(6, 10), 'regular');
  assert.equal(nivel(59, 100), 'repasar');
  assert.equal(nivel(0, 0), 'sin-datos');
  assert.equal(porcentaje(1, 3), 33);
  assert.equal(porcentaje(0, 0), null);
});

test('los 12 temas salen siempre, con nombre, aunque no tengan respuestas', () => {
  const temas = temasConResultados([{ aula: 1, tema: 'faringe-esofago', aciertos: 7, total: 10 }]);
  assert.equal(temas.length, 12);
  const f = temas.find((t) => t.id === 'faringe-esofago');
  assert.deepEqual([f.nombre, f.aula, f.porcentaje, f.nivel], ['Faringe y esófago', 1, 70, 'regular']);
  const vacio = temas.find((t) => t.id === 'plexo-braquial');
  assert.deepEqual([vacio.total, vacio.porcentaje, vacio.nivel], [0, null, 'sin-datos']);
});

test('un tema desconocido en la base no rompe nada (se ignora)', () => {
  assert.equal(temasConResultados([{ aula: 1, tema: 'inventado', aciertos: 1, total: 1 }]).filter((t) => t.total > 0).length, 0);
});

test('temas a repasar: con suficientes respuestas, bajo 80%, del más flojo al mejor, máximo 3', () => {
  const porTema = [
    { aula: 1, tema: 'musculos-triangulos', aciertos: 3, total: 10 },
    { aula: 1, tema: 'faringe-esofago', aciertos: 9, total: 10 },
    { aula: 2, tema: 'laringe-traquea-tiroides', aciertos: 5, total: 10 },
    { aula: 2, tema: 'vascularizacion-cuello', aciertos: 0, total: 3 }, // pocas respuestas: no se recomienda
    { aula: 3, tema: 'hombro-brazo-codo', aciertos: 6, total: 10 },
    { aula: 3, tema: 'plexo-braquial', aciertos: 7, total: 10 },
  ];
  const r = temasParaRepasar(temasConResultados(porTema));
  assert.deepEqual(r.map((t) => t.id), ['musculos-triangulos', 'laringe-traquea-tiroides', 'hombro-brazo-codo']);
  assert.equal(temasParaRepasar(temasConResultados([])).length, 0);
});

test('resumen general: rondas, preguntas y porcentaje', () => {
  const r = resumenGeneral({ rondas: 3, por_tema: [{ aciertos: 7, total: 10 }, { aciertos: 3, total: 10 }] });
  assert.deepEqual(r, { rondas: 3, total: 20, aciertos: 10, porcentaje: 50 });
  assert.deepEqual(resumenGeneral({}), { rondas: 0, total: 0, aciertos: 0, porcentaje: null });
});

test('tarjetas por aula: siempre 6; las no jugadas salen marcadas; la mejor calificación es de 10', () => {
  const t = tarjetasAula([{ aula: 1, record: 3200, ultimo_puntaje: 2900, rondas_jugadas: 4, mejores_aciertos: 21 }]);
  assert.equal(t.length, 6);
  assert.deepEqual(t[0], { aula: 1, jugada: true, record: 3200, ultimo: 2900, rondas: 4, mejorCalificacion: 8.4 });
  assert.deepEqual(t.slice(1).map((x) => x.jugada), [false, false, false, false, false]);
});

test('insignias: se muestran las 12 del catálogo, las ganadas primero', () => {
  const lista = insigniasConEstado(['rayo', 'primer-dia']);
  assert.equal(lista.length, 12);
  assert.deepEqual(lista.slice(0, 2).map((i) => i.id), ['primer-dia', 'rayo']);
  assert.ok(lista.slice(2).every((i) => !i.ganada));
  assert.equal(textoInsignias(lista), '2 de 12 ganadas');
  assert.equal(insigniasConEstado(undefined).filter((i) => i.ganada).length, 0);
});
