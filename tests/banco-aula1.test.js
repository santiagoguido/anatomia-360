import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const banco = JSON.parse(readFileSync(new URL('../contenido/preguntas/aula-1.json', import.meta.url), 'utf8'));
const P = banco.preguntas;
const cuenta = (lista, clave) => lista.reduce((m, x) => ((m[clave(x)] = (m[clave(x)] ?? 0) + 1), m), {});

test('el banco tiene 100 preguntas con ids únicos', () => {
  assert.equal(P.length, 100);
  assert.equal(new Set(P.map((p) => p.id)).size, 100);
});

test('50 preguntas por tema', () => {
  assert.deepEqual(cuenta(P, (p) => p.tema), { 'musculos-triangulos': 50, 'faringe-esofago': 50 });
});

test('reparto por patrón: 35 clínicas, 25 disección, 20 función, 10 límites, 10 imagen', () => {
  assert.deepEqual(cuenta(P, (p) => p.patron), { P09: 35, P02: 25, P04: 20, P10: 10, P13: 10 });
});

test('cada pregunta tiene 4 opciones distintas y una sola correcta válida', () => {
  for (const p of P) {
    assert.equal(p.opciones.length, 4, p.id);
    assert.equal(new Set(p.opciones.map((o) => o.trim().toLowerCase())).size, 4, `${p.id}: opciones repetidas`);
    assert.ok(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta <= 3, `${p.id}: correcta fuera de rango`);
    assert.ok(p.opciones.every((o) => o.trim().length > 0), p.id);
  }
});

test('ninguna opción es "todas las anteriores" ni similar', () => {
  const prohibido = /(todas|ninguna) (de )?las (anteriores|opciones)|a y b|ambas/i;
  for (const p of P) for (const o of p.opciones) assert.ok(!prohibido.test(o), `${p.id}: ${o}`);
});

test('campos obligatorios: enunciado, explicación y referencia', () => {
  for (const p of P) {
    assert.ok(p.enunciado.trim().length >= 25, `${p.id}: enunciado muy corto`);
    assert.ok(p.explicacion.trim().length >= 40, `${p.id}: explicación muy corta`);
    assert.ok(p.referencia?.capitulo && p.referencia?.seccion, `${p.id}: referencia incompleta`);
    assert.ok([1, 2, 3].includes(p.dificultad), `${p.id}: dificultad`);
    assert.equal(p.estado, 'borrador', `${p.id}: todo empieza como borrador`);
  }
});

test('las preguntas con imagen traen su descripción y las demás no', () => {
  for (const p of P) {
    if (p.patron === 'P13') {
      assert.ok(p.imagen?.id && p.imagen?.descripcion, `${p.id}: falta imagen`);
      assert.equal(p.imagen.estado, 'pendiente');
    } else {
      assert.equal(p.imagen, null, `${p.id}: no debería tener imagen`);
    }
  }
  assert.equal(new Set(P.filter((p) => p.imagen).map((p) => p.imagen.id)).size, 10);
});

test('la posición de la correcta está repartida (sin letra dominante)', () => {
  const c = cuenta(P, (p) => p.correcta);
  for (const n of [0, 1, 2, 3]) assert.ok((c[n] ?? 0) >= 20 && (c[n] ?? 0) <= 30, `posición ${n}: ${c[n]}`);
});

test('la correcta no se delata por ser la opción más larga', () => {
  let masLarga = 0;
  const notables = [];
  for (const p of P) {
    const largos = p.opciones.map((o) => o.length);
    const ok = largos[p.correcta];
    const otros = Math.max(...largos.filter((_, i) => i !== p.correcta));
    if (ok > otros) masLarga++;
    if (ok > otros * 1.2 && ok - otros >= 8) notables.push(p.id);
  }
  assert.ok(masLarga <= 35, `la correcta es la más larga en ${masLarga} de 100 (se espera ~25)`);
  assert.ok(notables.length <= 3, `la correcta destaca por longitud en: ${notables.join(', ')}`);
});

test('las opciones largas tienen longitud parecida (la mayor no pasa de 2 veces la menor)', () => {
  for (const p of P) {
    const largos = p.opciones.map((o) => o.length);
    if (Math.max(...largos) <= 40) continue; // en nombres cortos la longitud no es una pista
    assert.ok(Math.max(...largos) / Math.min(...largos) <= 2, `${p.id}: ${largos.join('/')}`);
  }
});

test('mezcla de dificultad razonable', () => {
  const d = cuenta(P, (p) => p.dificultad);
  assert.ok(d[1] >= 25 && d[3] >= 10, JSON.stringify(d));
});
