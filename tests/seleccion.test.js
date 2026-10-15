import test from 'node:test';
import assert from 'node:assert/strict';
import { armarRonda, claseDePregunta, esServible, mezclar } from '../src/game/ronda/seleccion.js';
import { ErrorRonda } from '../src/game/ronda/errores.js';
import { mulberry32 } from '../src/utils/azar.js';
import { cargarBancos } from './ayudas/datosFalsos.js';

const bancos = cargarBancos();
const banco = bancos[1];
const porId = new Map(banco.preguntas.map((p) => [p.id, p]));

test('una ronda tiene 25 preguntas distintas: 12 de un tema y 13 del otro', () => {
  for (let semilla = 1; semilla <= 40; semilla++) {
    const r = armarRonda({ banco, azar: mulberry32(semilla) });
    assert.equal(r.length, 25);
    assert.equal(new Set(r.map((x) => x.id)).size, 25);
    const cuenta = banco.temas.map((t) => r.filter((x) => porId.get(x.id).tema === t.id).length).sort();
    assert.deepEqual(cuenta, [12, 13], `semilla ${semilla}`);
  }
});

test('el tema que lleva 13 varía de una ronda a otra', () => {
  const con13 = new Set();
  for (let s = 1; s <= 30; s++) {
    const r = armarRonda({ banco, azar: mulberry32(s) });
    for (const t of banco.temas) if (r.filter((x) => porId.get(x.id).tema === t.id).length === 13) con13.add(t.id);
  }
  assert.equal(con13.size, 2);
});

test('el orden de A–D es una permutación de 0..3 y cambia entre rondas', () => {
  const a = armarRonda({ banco, azar: mulberry32(1) });
  const b = armarRonda({ banco, azar: mulberry32(2) });
  for (const x of [...a, ...b]) assert.deepEqual([...x.orden].sort(), [0, 1, 2, 3]);
  assert.ok(a.some((x, i) => x.orden.join() !== b[i].orden.join()));
});

test('prioridad: primero no vistas, luego falladas, al final las ya acertadas', () => {
  // Se marcan como vistas casi todas; solo 14 + 14 quedan sin ver, para que las demás clases se noten.
  const [t1, t2] = banco.temas.map((t) => banco.preguntas.filter((p) => p.tema === t.id && esServible(p)));
  const noVistas = [...t1.slice(0, 14), ...t2.slice(0, 14)].map((p) => p.id);
  const resto = banco.preguntas.filter((p) => !noVistas.includes(p.id));
  const falladas = resto.slice(0, 40).map((p) => p.id);
  const vistas = resto.map((p) => p.id);
  const r = armarRonda({ banco, vistas, falladas, azar: mulberry32(5) });
  const clases = r.map((x) => claseDePregunta(x.id, new Set(vistas), new Set(falladas)));
  assert.deepEqual([...clases].sort(), clases, 'se presentan en orden: no vistas, falladas, acertadas');
  assert.equal(clases.filter((c) => c === 0).length, 25, 'con 14 no vistas por tema alcanzan para toda la ronda');
});

test('cuando faltan no vistas se completa con falladas y luego con acertadas', () => {
  const todas = banco.preguntas.map((p) => p.id);
  const vistas = todas;
  const falladas = banco.preguntas.filter((p) => p.tema === banco.temas[0].id).slice(0, 5).map((p) => p.id);
  const r = armarRonda({ banco, vistas, falladas, azar: mulberry32(9) });
  const clases = r.map((x) => claseDePregunta(x.id, new Set(vistas), new Set(falladas)));
  assert.equal(clases.filter((c) => c === 1).length, 5, 'las 5 falladas entran siempre');
  assert.deepEqual([...clases].sort(), clases);
});

test('solo se sirven preguntas aprobadas; los borradores solo con el modo de pruebas', () => {
  const crudo = cargarBancos({ aprobar: false })[1];
  assert.throws(() => armarRonda({ banco: crudo }), (e) => e instanceof ErrorRonda && e.codigo === 'banco_insuficiente');
  // Con modo de pruebas los borradores sirven, pero una P13 con imagen pendiente sigue excluida.
  const r = armarRonda({ banco: crudo, permitirBorrador: true, azar: mulberry32(3) });
  assert.equal(r.length, 25);
  for (const x of r) assert.equal(crudo.preguntas.find((p) => p.id === x.id).patron === 'P13', false);
});

test('las P13 con la imagen pendiente nunca se sirven, aunque estén aprobadas', () => {
  const b = structuredClone(banco);
  for (const p of b.preguntas) if (p.imagen) p.imagen.estado = 'pendiente';
  for (let s = 1; s <= 20; s++) {
    for (const x of armarRonda({ banco: b, azar: mulberry32(s) })) {
      assert.equal(b.preguntas.find((p) => p.id === x.id).imagen, null);
    }
  }
});

test('banco_insuficiente si un tema no llega a 12–13 servibles', () => {
  const b = structuredClone(banco);
  const tema = b.temas[0].id;
  let quedan = 11;
  for (const p of b.preguntas) if (p.tema === tema && quedan-- <= 0) p.estado = 'borrador';
  assert.throws(() => armarRonda({ banco: b }), (e) => e.codigo === 'banco_insuficiente' && e.extra.tema === tema);
});

test('mezclar conserva los elementos y no modifica el original', () => {
  const original = [1, 2, 3, 4, 5];
  const m = mezclar(original, mulberry32(4));
  assert.deepEqual([...m].sort(), original);
  assert.deepEqual(original, [1, 2, 3, 4, 5]);
});
