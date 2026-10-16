import test from 'node:test';
import assert from 'node:assert/strict';
import { CLINICA, MAXIMO_CASO, MAXIMO_GUARDIA, PUNTOS_CLINICA } from '../src/game/clinica/reglas.js';
import { puntosDePaso, puntuarCaso, puntuarGuardia } from '../src/game/clinica/puntuacion.js';
import { armarGuardia, aulasDeCaso, esServibleCaso, mapaTemas } from '../src/game/clinica/seleccion.js';
import { evaluarInsigniasClinica } from '../src/game/clinica/insignias.js';
import { INSIGNIAS } from '../src/game/ronda/insignias.js';
import { puntajeMaximoTeorico } from '../src/game/ronda/puntuacion.js';
import { mulberry32 } from '../src/utils/azar.js';
import { ESQUEMAS, esquemaComoTexto, formasDe, idsDeBase, leyenda } from '../src/ui/clinica/esquemas.js';
import { estadoExploracion, mensajeMejor, mensajeSalon, metricasClinica, textoPaso } from '../src/ui/clinica/modelo.js';
import { modeloTarjeta } from '../src/game/tarjetas.js';
import { aulasDesdeCalendario } from '../src/game/aulas.js';
import { cargarBancos, cargarCasos } from './ayudas/datosFalsos.js';

const ok = (intento) => ({ acertado: true, intento });
const mal = { acertado: false, intento: null };

test('máximos: 700 por caso, 3,500 por guardia, 32,900 de récord total', () => {
  assert.equal(MAXIMO_CASO, 700);
  assert.equal(MAXIMO_GUARDIA, 3500);
  assert.equal(6 * puntajeMaximoTeorico() + MAXIMO_GUARDIA, 32900);
});

test('puntos de un paso: 200, 100 o 0', () => {
  assert.deepEqual([1, 2, null, 3].map(puntosDePaso), [200, 100, 0, 0]);
});

test('caso perfecto con pocas exploraciones: 700 y Ojo clínico', () => {
  const r = puntuarCaso({ pasos: [ok(1), ok(1), ok(1)], exploraciones: 2, pistas: 0 });
  assert.equal(r.total, 700);
  assert.equal(r.bono, 100);
  assert.equal(r.resuelto, true);
  assert.equal(r.ojoClinico, true);
});

test('el bono se pierde con 4 exploraciones y Ojo clínico con una pista, pero el caso sigue resuelto', () => {
  assert.equal(puntuarCaso({ pasos: [ok(1), ok(1), ok(1)], exploraciones: 4, pistas: 0 }).total, 600);
  const conPista = puntuarCaso({ pasos: [ok(1), ok(1), ok(1)], exploraciones: 3, pistas: 1 });
  assert.equal(conPista.total, 650);
  assert.equal(conPista.ojoClinico, false);
  assert.equal(conPista.resuelto, true);
});

test('un paso perdido deja el caso sin resolver y sin bono', () => {
  const r = puntuarCaso({ pasos: [ok(1), mal, ok(1)], exploraciones: 2, pistas: 0 });
  assert.equal(r.total, 400);
  assert.equal(r.resuelto, false);
  assert.equal(r.bono, 0);
});

test('el total de un caso nunca baja de 0', () => {
  assert.equal(puntuarCaso({ pasos: [mal, mal, mal], exploraciones: 6, pistas: 3 }).total, 0);
});

test('guardia: suma de casos', () => assert.equal(puntuarGuardia([{ total: 700 }, { total: 100 }, { total: 0 }]), 800));

test('las insignias de la Clínica están en el catálogo con nombre y descripción', () => {
  for (const id of ['residente-de-guardia', 'ojo-clinico']) assert.ok(INSIGNIAS[id].nombre && INSIGNIAS[id].descripcion);
  assert.equal(INSIGNIAS['residente-de-guardia'].nombre, 'Residente de guardia');
  assert.equal(INSIGNIAS['ojo-clinico'].nombre, 'Ojo clínico');
});

test('insignias: Residente a la 5.ª guardia, Ojo clínico al resolver sin pistas y con ≤3 exploraciones; sin repetir', () => {
  assert.deepEqual(evaluarInsigniasClinica({ guardiasTerminadas: 4, ojoClinico: false }), []);
  assert.deepEqual(evaluarInsigniasClinica({ guardiasTerminadas: 5, ojoClinico: false }), ['residente-de-guardia']);
  assert.deepEqual(evaluarInsigniasClinica({ guardiasTerminadas: 5, ojoClinico: true }), ['residente-de-guardia', 'ojo-clinico']);
  assert.deepEqual(evaluarInsigniasClinica({ guardiasTerminadas: 6, ojoClinico: true, yaGanadas: ['residente-de-guardia', 'ojo-clinico'] }), []);
});

// ---- Selección -----------------------------------------------------------------------------------------------------

const bancos = cargarBancos();
const aulaDeTema = mapaTemas(bancos);
const casos = cargarCasos();

test('cada caso necesita las aulas de sus temas', () => {
  assert.deepEqual(aulasDeCaso(casos.find((c) => c.id === 'c1-01'), aulaDeTema), [1]);
  assert.deepEqual(aulasDeCaso(casos.find((c) => c.id === 'c2-07'), aulaDeTema), [1, 2]);
  assert.equal(aulasDeCaso({ temas: ['no-existe'] }, aulaDeTema), null);
});

test('esServibleCaso: aprobado y con todas sus aulas abiertas; borrador solo con modo de pruebas', () => {
  const c = casos.find((x) => x.id === 'c2-07');
  assert.equal(esServibleCaso(c, { aulasAbiertas: new Set([1]), aulaDeTema }), false);
  assert.equal(esServibleCaso(c, { aulasAbiertas: new Set([1, 2]), aulaDeTema }), true);
  const b = { ...c, estado: 'borrador' };
  assert.equal(esServibleCaso(b, { aulasAbiertas: new Set([1, 2]), aulaDeTema }), false);
  assert.equal(esServibleCaso(b, { aulasAbiertas: new Set([1, 2]), aulaDeTema, permitirBorrador: true }), true);
});

test('armarGuardia: 5 casos distintos, primero los no resueltos, con las opciones mezcladas', () => {
  const abiertas = new Set([1]);
  const resueltos = ['c1-01', 'c1-02', 'c1-03', 'c1-04', 'c1-05'];
  for (let semilla = 1; semilla <= 20; semilla++) {
    const g = armarGuardia({ casos, archivados: resueltos, aulasAbiertas: abiertas, aulaDeTema, azar: mulberry32(semilla) });
    assert.equal(g.length, 5);
    assert.equal(new Set(g.map((x) => x.id)).size, 5);
    // hay 8 casos de la semana 1: los 3 no resueltos entran siempre
    for (const nuevo of ['c1-06', 'c1-07', 'c1-08']) assert.ok(g.some((x) => x.id === nuevo), `semilla ${semilla}`);
    for (const x of g) {
      assert.equal(x.ordenes.length, 3);
      for (const o of x.ordenes) assert.deepEqual([...o].sort(), [0, 1, 2, 3]);
    }
  }
});

test('armarGuardia sin suficientes casos servibles lanza casos_insuficientes', () => {
  const pocos = casos.filter((c) => c.id < 'c1-05');
  assert.throws(() => armarGuardia({ casos: pocos, aulasAbiertas: new Set([1]), aulaDeTema }), (e) => e.codigo === 'casos_insuficientes' && e.estado === 503);
});

test('la posición de la correcta se reparte entre A–D al mezclar (no queda siempre en el mismo lugar)', () => {
  const posiciones = new Set();
  for (let semilla = 1; semilla <= 30; semilla++) {
    const g = armarGuardia({ casos, aulasAbiertas: new Set([1]), aulaDeTema, azar: mulberry32(semilla) });
    const c = casos.find((x) => x.id === g[0].id);
    posiciones.add(g[0].ordenes[0].indexOf(c.pasos[0].correcta));
  }
  assert.equal(posiciones.size, 4);
});

// ---- Esquemas y modelo de pantalla ----------------------------------------------------------------------------------

test('esquemas: cada base tiene título, formas y etiquetas para todos sus ids resaltables', () => {
  for (const [nombre, base] of Object.entries(ESQUEMAS)) {
    assert.ok(base.titulo && base.formas.length >= 6, nombre);
    for (const id of idsDeBase(nombre)) {
      if (id.endsWith('-fondo')) continue;
      assert.ok(base.etiquetas[id] || ['carotida-interna'].includes(id), `${nombre}: falta etiqueta de ${id}`);
    }
  }
});

test('esquemas: resaltar cambia el relleno y atenúa el resto; un id desconocido no rompe nada', () => {
  const spec = { base: 'cuello-lateral', resaltar: ['ecm'] };
  const formas = formasDe(spec);
  assert.ok(formas.some((f) => f.atributos.class.includes('resaltada')));
  assert.ok(formas.some((f) => f.atributos.opacity < 1));
  assert.deepEqual(leyenda(spec), [{ id: 'ecm', nombre: 'Esternocleidomastoideo' }]);
  assert.ok(esquemaComoTexto({ base: 'cuello-lateral', resaltar: ['no-existe'] }).startsWith('<svg'));
  assert.deepEqual(formasDe({ base: 'no-existe' }), []);
});

test('esquemas: son dibujos propios (sin imágenes externas ni enlaces)', () => {
  for (const b of Object.keys(ESQUEMAS)) {
    const svg = esquemaComoTexto({ base: b, resaltar: [] });
    assert.ok(!/<image|href=|http:\/\/(?!www\.w3\.org)|https:/.test(svg), b);
  }
});

test('modelo: exploraciones, mejor guardia, Salón y pasos', () => {
  const v = { n_exploraciones: 3, minimo_exploraciones: 2, para_bono: 3 };
  assert.deepEqual(estadoExploracion(v), { texto: 'Exploraciones: 3 · mínimo 2 para razonar · bono con 3 o menos', faltan: 0, conBono: true });
  assert.equal(estadoExploracion({ ...v, n_exploraciones: 4 }).conBono, false);
  assert.equal(estadoExploracion({ ...v, n_exploraciones: 0 }).faltan, 2);
  assert.equal(mensajeMejor({ es_nuevo: true, diferencia: 500, anterior: 100 }).tono, 'nuevo');
  assert.match(mensajeMejor({ es_nuevo: true, diferencia: 500, anterior: 0 }).texto, /Primera guardia/);
  assert.equal(mensajeMejor({ es_nuevo: false, diferencia: 0, anterior: 900 }).tono, 'igual');
  assert.match(mensajeMejor({ es_nuevo: false, diferencia: -250, anterior: 900 }).texto, /250/);
  assert.match(mensajeSalon({ cuenta: true }), /suma a tu puntaje semanal/);
  assert.match(mensajeSalon({ cuenta: false, semana: '2026-10-12' }), /arranca el lunes 19 de octubre/);
  assert.match(textoPaso({ acertado: true, intento: 2 }), /segundo/);
  assert.deepEqual(metricasClinica({ mejor_guardia: 2800, expedientes: 3 }), { mejor: 2800, expedientes: 3 });
  assert.deepEqual(metricasClinica(null), { mejor: 0, expedientes: 0 });
});

test('la tarjeta de la Clínica en el campus muestra la mejor guardia y los expedientes del jugador', () => {
  const aulas = aulasDesdeCalendario(Date.parse('2026-10-20T18:00:00Z'));
  const lugar = { id: 'clinica', tipo: 'clinica' };
  const ahoraMs = Date.parse('2026-10-20T18:00:00Z');
  const vacia = modeloTarjeta(lugar, { aulas, jugador: { mejor_guardia: 0, expedientes: 0 }, ahoraMs });
  assert.deepEqual(vacia.metricas.map((m) => m.valor), ['—', '0']);
  const con = modeloTarjeta(lugar, { aulas, jugador: { mejor_guardia: 2800, expedientes: 3 }, ahoraMs });
  assert.deepEqual(con.metricas.map((m) => m.valor), ['2,800', '3']);
  assert.equal(con.boton.habilitado, true);
});

test('CLINICA: 6 exploraciones, 4 útiles, 5 casos por guardia, 3 pasos', () => {
  assert.equal(CLINICA.exploraciones.length, 6);
  assert.equal(CLINICA.exploracionesUtiles, 4);
  assert.equal(CLINICA.casosPorGuardia, 5);
  assert.equal(CLINICA.pasos, 3);
  assert.equal(PUNTOS_CLINICA.pista, 50);
});
