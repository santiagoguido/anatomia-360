import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { CLINICA } from '../src/game/clinica/reglas.js';
import { idsDeBase, BASES } from '../src/ui/clinica/esquemas.js';

const DIR = new URL('../contenido/casos/', import.meta.url);
const archivos = readdirSync(DIR).filter((f) => /^semana-\d+\.json$/.test(f)).sort();
const bancos = [1, 2, 3, 4, 5, 6].map((n) => JSON.parse(readFileSync(new URL(`../contenido/preguntas/aula-${n}.json`, import.meta.url), 'utf8')));
const aulaDeTema = new Map(bancos.flatMap((b) => b.temas.map((t) => [t.id, b.aula])));
const prohibido = /(todas|ninguna) (de )?las (anteriores|opciones)|a y b|ambas/i;

test('hay casos de al menos una semana', () => assert.ok(archivos.length >= 1));

const todos = [];
for (const archivo of archivos) {
  const doc = JSON.parse(readFileSync(new URL(archivo, DIR), 'utf8'));
  const numero = Number(archivo.match(/\d+/)[0]);

  test(`${archivo}: encabezado y fuente`, () => {
    assert.equal(doc.semana, numero);
    assert.ok(doc.fuente.referencias.moore2017.cita.startsWith('Moore, K. L.'));
    assert.deepEqual(doc.exploraciones.map((e) => e.id), CLINICA.exploraciones);
  });

  for (const c of doc.casos) {
    todos.push(c);

    test(`${c.id}: datos generales, paciente y presentación`, () => {
      assert.match(c.id, new RegExp(`^c${numero}-\\d{2}$`));
      assert.equal(c.semana, numero);
      assert.ok(c.titulo.length >= 10 && c.motivo.length >= 10);
      assert.ok([1, 2, 3].includes(c.dificultad));
      assert.ok(c.paciente.nombre && c.paciente.edad && c.paciente.ocupacion && ['femenino', 'masculino'].includes(c.paciente.sexo));
      assert.ok(c.presentacion.length >= 2 && c.presentacion.every((l) => l.length > 10));
      assert.ok(['borrador', 'aprobado'].includes(c.estado), `${c.id}: estado ${c.estado} (usa "borrador" o "aprobado")`);
    });

    test(`${c.id}: sus temas existen y la semana del caso es la de su aula más tardía`, () => {
      assert.ok(c.temas.length >= 1);
      for (const t of c.temas) assert.ok(aulaDeTema.has(t), `${c.id}: tema desconocido ${t}`);
      assert.equal(Math.max(...c.temas.map((t) => aulaDeTema.get(t))), c.semana, 'el caso debe estar en el archivo de la última semana que necesita');
    });

    test(`${c.id}: 6 exploraciones, exactamente 4 útiles, todas con hallazgo`, () => {
      assert.deepEqual(Object.keys(c.exploraciones), CLINICA.exploraciones);
      const utiles = Object.values(c.exploraciones).filter((e) => e.util).length;
      assert.equal(utiles, CLINICA.exploracionesUtiles);
      for (const e of Object.values(c.exploraciones)) assert.ok(typeof e.util === 'boolean' && e.hallazgo.length >= 20);
    });

    test(`${c.id}: 3 pasos (función, estructura, nivel) con 4 opciones distintas y una correcta, sin «todas las anteriores»`, () => {
      assert.deepEqual(c.pasos.map((p) => p.tipo), ['funcion', 'estructura', 'nivel']);
      for (const p of c.pasos) {
        assert.equal(p.opciones.length, CLINICA.opciones);
        assert.equal(new Set(p.opciones.map((o) => o.trim().toLowerCase())).size, 4, 'opciones repetidas');
        assert.ok(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta <= 3);
        assert.ok(p.pregunta.length >= 15 && p.pista.length >= 25);
        for (const o of p.opciones) assert.ok(o.trim() && !prohibido.test(o), o);
      }
    });

    test(`${c.id}: la pista no contiene la respuesta correcta tal cual`, () => {
      for (const p of c.pasos) assert.ok(!p.pista.toLowerCase().includes(p.opciones[p.correcta].toLowerCase()), p.pregunta);
    });

    test(`${c.id}: la correcta no se delata por su longitud`, () => {
      for (const p of c.pasos) {
        const otras = p.opciones.filter((_, i) => i !== p.correcta);
        assert.ok(p.opciones[p.correcta].length <= Math.max(...otras.map((o) => o.length)) * 1.4 + 10, `${c.id} «${p.pregunta.slice(0, 40)}…»`);
      }
    });

    test(`${c.id}: desenlace con explicación, esquema válido y cita formal de Moore`, () => {
      assert.ok(c.desenlace.texto.length >= 30 && c.desenlace.explicacion.length >= 120);
      const { base, resaltar, pie } = c.desenlace.esquema;
      assert.ok(BASES.includes(base), `base desconocida ${base}`);
      assert.ok(resaltar.length >= 1 && pie.length >= 10);
      const ids = idsDeBase(base);
      for (const id of resaltar) assert.ok(ids.has(id), `${c.id}: el esquema ${base} no tiene «${id}»`);
      const r = c.referencia;
      assert.equal(r.fuente, 'moore2017');
      assert.ok(r.cita.startsWith(doc.fuente.referencias.moore2017.cita));
      assert.match(r.cita, /Cap\. 9, «.+», pp?\. \d{4}/);
      // El extracto de Moore llega a la p. 1854; el banco de preguntas cita hasta la 1868 (cuadros clínicos): no se sale de ese rango.
      for (const n of r.pagina.match(/\d{4}/g)) assert.ok(Number(n) >= 1763 && Number(n) <= 1868, `página fuera de rango: ${n}`);
    });

    test(`${c.id}: no menciona el archivo digital del libro`, () => {
      const { nota_revision, ...visible } = c;
      assert.ok(!/\bpdf\b|booksmedicos|\.pdf/i.test(JSON.stringify(visible)));
    });
  }
}

test('ids de casos únicos en todas las semanas', () => {
  assert.equal(new Set(todos.map((c) => c.id)).size, todos.length);
});

test('semanas 1 y 2: 8 casos cada una', () => {
  for (const [n, esperado] of [[1, 8], [2, 8]]) assert.equal(todos.filter((c) => c.semana === n).length, esperado, `semana ${n}`);
});

test('los casos de la semana 1 solo usan temas del Aula 1', () => {
  for (const c of todos.filter((x) => x.semana === 1)) for (const t of c.temas) assert.equal(aulaDeTema.get(t), 1, c.id);
});

test('las 4 exploraciones útiles no son siempre las mismas: hay variedad entre casos', () => {
  const combos = new Set(todos.map((c) => Object.entries(c.exploraciones).filter(([, e]) => e.util).map(([k]) => k).join()));
  assert.ok(combos.size >= 5, `solo ${combos.size} combinaciones distintas`);
});

test('cada base de esquema se usa y todas las bases usadas existen', () => {
  const usadas = new Set(todos.map((c) => c.desenlace.esquema.base));
  for (const b of usadas) assert.ok(BASES.includes(b));
  for (const b of BASES) assert.ok(usadas.has(b), `la base ${b} no la usa ningún caso`);
});

test('los casos con nota_revision la explican (qué no está en el extracto de Moore)', () => {
  for (const c of todos.filter((x) => x.nota_revision)) assert.ok(c.nota_revision.length >= 60, c.id);
});
