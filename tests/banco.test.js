import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = new URL('../contenido/preguntas/', import.meta.url);
const archivos = readdirSync(DIR).filter((f) => /^aula-\d+\.json$/.test(f)).sort();
const cuenta = (lista, clave) => lista.reduce((m, x) => ((m[clave(x)] = (m[clave(x)] ?? 0) + 1), m), {});

test('hay al menos un banco de aula', () => assert.ok(archivos.length >= 1));

for (const archivo of archivos) {
  const banco = JSON.parse(readFileSync(new URL(archivo, DIR), 'utf8'));
  const P = banco.preguntas;
  const temas = banco.temas.map((t) => t.id);

  test(`${archivo}: 100 preguntas con ids únicos, 50 por tema`, () => {
    assert.equal(P.length, 100);
    assert.equal(new Set(P.map((p) => p.id)).size, 100);
    assert.equal(temas.length, 2);
    for (const t of temas) assert.equal(P.filter((p) => p.tema === t).length, 50, t);
  });

  test(`${archivo}: 35 clínicas, 25 disección, 20 función, 10 límites, 10 imagen`, () => {
    assert.deepEqual(cuenta(P, (p) => p.patron), { P09: 35, P02: 25, P04: 20, P10: 10, P13: 10 });
  });

  test(`${archivo}: 4 opciones distintas, una correcta válida, sin "todas las anteriores"`, () => {
    const prohibido = /(todas|ninguna) (de )?las (anteriores|opciones)|a y b|ambas/i;
    for (const p of P) {
      assert.equal(p.opciones.length, 4, p.id);
      assert.equal(new Set(p.opciones.map((o) => o.trim().toLowerCase())).size, 4, `${p.id}: opciones repetidas`);
      assert.ok(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta <= 3, p.id);
      for (const o of p.opciones) assert.ok(o.trim() && !prohibido.test(o), `${p.id}: ${o}`);
    }
  });

  test(`${archivo}: enunciado, explicación, dificultad y estado`, () => {
    for (const p of P) {
      assert.ok(p.enunciado.trim().length >= 25, `${p.id}: enunciado muy corto`);
      assert.ok(p.explicacion.trim().length >= 40, `${p.id}: explicación muy corta`);
      assert.ok([1, 2, 3].includes(p.dificultad), `${p.id}: dificultad`);
      assert.ok(temas.includes(p.tema), `${p.id}: tema`);
      assert.ok(['borrador', 'aprobada'].includes(p.estado), `${p.id}: estado inválido`);
    }
  });

  test(`${archivo}: cada pregunta cita formalmente su fuente (obra, capítulo, página)`, () => {
    for (const p of P) {
      const r = p.referencia;
      assert.ok(banco.fuente.referencias[r.fuente], `${p.id}: fuente desconocida`);
      assert.ok(r.capitulo && r.seccion, `${p.id}: referencia incompleta`);
      assert.ok(r.pagina && /^\d{3,4}([–,]\s*\d{3,4})*$/.test(r.pagina.replace(/\s+/g, ' ').replace(/, /g, ',')) || /\d{3,4}/.test(r.pagina), `${p.id}: página`);
      assert.ok(r.cita.startsWith(banco.fuente.referencias[r.fuente].cita), `${p.id}: la cita debe llevar la referencia bibliográfica completa`);
      assert.match(r.cita, /Cap\. \d+, «.+», pp?\. \d{3,4}/, `${p.id}: formato de cita`);
    }
  });

  test(`${archivo}: no se menciona el archivo digital del libro`, () => {
    const texto = JSON.stringify(banco.preguntas.map(({ nota_revision, ...p }) => p)) + JSON.stringify(banco.fuente);
    assert.ok(!/\bpdf\b|booksmedicos|\.pdf/i.test(texto), 'hay una mención a un PDF en el contenido visible');
  });

  test(`${archivo}: las preguntas con imagen traen su descripción y las demás no`, () => {
    for (const p of P) {
      if (p.patron === 'P13') {
        assert.ok(p.imagen?.id && p.imagen?.descripcion, `${p.id}: falta imagen`);
        assert.equal(p.imagen.estado, 'pendiente');
      } else assert.equal(p.imagen, null, `${p.id}: no debería tener imagen`);
    }
    assert.equal(new Set(P.filter((p) => p.imagen).map((p) => p.imagen.id)).size, 10);
  });

  test(`${archivo}: posición de la correcta repartida`, () => {
    const c = cuenta(P, (p) => p.correcta);
    for (const n of [0, 1, 2, 3]) assert.ok((c[n] ?? 0) >= 20 && (c[n] ?? 0) <= 30, `posición ${n}: ${c[n]}`);
  });

  test(`${archivo}: la correcta no se delata por su longitud`, () => {
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

  test(`${archivo}: opciones largas de longitud parecida (la mayor ≤ 2 veces la menor)`, () => {
    for (const p of P) {
      const largos = p.opciones.map((o) => o.length);
      if (Math.max(...largos) <= 40) continue;
      assert.ok(Math.max(...largos) / Math.min(...largos) <= 2, `${p.id}: ${largos.join('/')}`);
    }
  });

  test(`${archivo}: mezcla de dificultad razonable`, () => {
    const d = cuenta(P, (p) => p.dificultad);
    assert.ok(d[1] >= 25 && d[3] >= 10, JSON.stringify(d));
  });
}
