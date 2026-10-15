import test from 'node:test';
import assert from 'node:assert/strict';
import { crearManejador } from '../src/servidor/manejador.js';
import { RONDA } from '../src/game/ronda/reglas.js';
import { mulberry32 } from '../src/utils/azar.js';
import { cargarBancos, crearDatosFalsos, ms } from './ayudas/datosFalsos.js';

const MAT = 'a0123456x';
const bancos = cargarBancos();

/** Arma un servidor de pruebas con reloj controlable. `inicio`: instante simulado. */
function montar({ inicio = '2026-10-20T18:00:00Z', modoPruebas = false, jugadores = [MAT], semilla = 1 } = {}) {
  const reloj = { t: ms(inicio) };
  const ahora = () => reloj.t;
  const datos = crearDatosFalsos({ ahora, jugadores });
  let n = 0;
  const manejar = crearManejador({
    datos, bancos, modoPruebas, ahora, azar: mulberry32(semilla),
    nuevoId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  });
  const llamar = (cuerpo) => manejar(cuerpo);
  return { reloj, datos, llamar, avanzar: (msx) => { reloj.t += msx; } };
}

const iniciar = (s, aula = 1, matricula = MAT) => s.llamar({ accion: 'iniciar', matricula, aula });

/** Posición mostrada (A–D) de la opción correcta, según la ronda guardada en el servidor. */
function correctaMostrada(s, rondaId, indice) {
  const activa = s.datos.tabla.activas.get(rondaId);
  const rp = activa.preguntas[indice];
  const p = bancos[activa.aula].preguntas.find((x) => x.id === rp.id);
  return rp.orden.indexOf(p.correcta);
}
const incorrectaMostrada = (s, id, i) => (correctaMostrada(s, id, i) + 1) % 4;

/**
 * Juega una ronda completa. `plan(i)` devuelve 'bien' | 'mal' | 'nada'; `tarda(i)` los ms que tarda en responder.
 * Devuelve las respuestas del servidor y el resultado de terminar.
 */
async function jugar(s, { aula = 1, plan = () => 'bien', tarda = () => 9000, terminar = true, inicio } = {}) {
  const ini = inicio ?? (await iniciar(s, aula));
  assert.equal(ini.estado, 200, JSON.stringify(ini.cuerpo));
  const id = ini.cuerpo.ronda_id;
  s.avanzar(RONDA.margenInicioMs);
  const respuestas = [];
  for (let i = 0; i < ini.cuerpo.total; i++) {
    const accion = plan(i);
    const espera = accion === 'nada' ? RONDA.tiempoMs : tarda(i);
    s.avanzar(espera);
    const opcion = accion === 'bien' ? correctaMostrada(s, id, i) : accion === 'mal' ? incorrectaMostrada(s, id, i) : null;
    const r = await s.llamar({ accion: 'responder', ronda_id: id, indice: i, opcion });
    respuestas.push(r);
    s.avanzar(RONDA.pausaMs);
  }
  const fin = terminar ? await s.llamar({ accion: 'terminar', ronda_id: id }) : null;
  return { ini, id, respuestas, fin };
}

// ---- iniciar ---------------------------------------------------------------------------------

test('iniciar devuelve 25 preguntas con enunciado y opciones, SIN la respuesta correcta', async () => {
  const s = montar();
  const { estado, cuerpo } = await iniciar(s);
  assert.equal(estado, 200);
  assert.equal(cuerpo.total, 25);
  assert.equal(cuerpo.tiempo_ms, 42000);
  assert.equal(cuerpo.preguntas.length, 25);
  assert.equal(cuerpo.modo_pruebas, false);
  for (const p of cuerpo.preguntas) {
    assert.deepEqual(Object.keys(p).sort(), ['enunciado', 'opciones']);
    assert.equal(p.opciones.length, 4);
  }
  const texto = JSON.stringify(cuerpo);
  for (const prohibido of ['correcta', 'explicacion', 'referencia', 'cita', '"id"', 'orden']) {
    assert.ok(!texto.includes(prohibido), `la respuesta de iniciar no debe incluir ${prohibido}`);
  }
});

test('iniciar guarda la hora de inicio del servidor y reemplaza la ronda activa anterior', async () => {
  const s = montar();
  const a = await iniciar(s);
  s.avanzar(5000);
  const b = await iniciar(s);
  assert.equal(s.datos.tabla.activas.size, 1, 'una sola ronda activa por matrícula');
  assert.notEqual(a.cuerpo.ronda_id, b.cuerpo.ronda_id);
  assert.equal(s.datos.tabla.activas.get(b.cuerpo.ronda_id).inicio, s.reloj.t);
  const vieja = await s.llamar({ accion: 'responder', ronda_id: a.cuerpo.ronda_id, indice: 0, opcion: 0 });
  assert.equal(vieja.estado, 404, 'la ronda anulada ya no existe');
});

test('iniciar valida matrícula, aula y jugador', async () => {
  const s = montar();
  assert.equal((await s.llamar({ accion: 'iniciar', matricula: 'abc', aula: 1 })).cuerpo.error, 'solicitud_invalida');
  assert.equal((await s.llamar({ accion: 'iniciar', matricula: MAT, aula: 7 })).cuerpo.error, 'solicitud_invalida');
  assert.equal((await s.llamar({ accion: 'iniciar', matricula: MAT, aula: '1' })).cuerpo.error, 'solicitud_invalida');
  assert.equal((await s.llamar({ accion: 'iniciar', matricula: 'z9999999z', aula: 1 })).cuerpo.error, 'jugador_no_encontrado');
  assert.equal((await s.llamar({ accion: 'borrar' })).cuerpo.error, 'solicitud_invalida');
  assert.equal((await s.llamar(null)).estado, 400);
});

test('la matrícula se normaliza (mayúsculas y espacios)', async () => {
  const s = montar();
  const r = await s.llamar({ accion: 'iniciar', matricula: ' A0123456X ', aula: 1 });
  assert.equal(r.estado, 200);
});

// ---- calendario: aula cerrada -----------------------------------------------------------------

test('un aula cerrada rechaza INICIAR (hoy 20 oct solo el Aula 1 está abierta)', async () => {
  const s = montar({ inicio: '2026-10-20T18:00:00Z' });
  for (const aula of [2, 3, 4, 5, 6]) {
    const r = await iniciar(s, aula);
    assert.deepEqual([r.estado, r.cuerpo.error], [403, 'aula_cerrada'], `aula ${aula}`);
  }
  assert.equal((await iniciar(s, 1)).estado, 200);
  assert.equal(s.datos.tabla.activas.size, 1, 'las aulas cerradas no crean rondas');
});

test('el Aula 2 abre a las 00:00 CDMX del lunes 26 oct, ni un segundo antes', async () => {
  const antes = montar({ inicio: '2026-10-26T05:59:59Z' });
  assert.equal((await iniciar(antes, 2)).cuerpo.error, 'aula_cerrada');
  const justo = montar({ inicio: '2026-10-26T06:00:00Z' });
  assert.equal((await iniciar(justo, 2)).estado, 200);
});

test('las aulas 3 a 6 abren cada lunes y, una vez abiertas, no se vuelven a cerrar', async () => {
  const fechas = { 3: '2026-11-02T06:00:00Z', 4: '2026-11-09T06:00:00Z', 5: '2026-11-16T06:00:00Z', 6: '2026-11-23T06:00:00Z' };
  for (const [aula, abre] of Object.entries(fechas)) {
    assert.equal((await iniciar(montar({ inicio: new Date(ms(abre) - 1000).toISOString() }), Number(aula))).cuerpo.error, 'aula_cerrada', `aula ${aula} antes`);
    assert.equal((await iniciar(montar({ inicio: abre }), Number(aula))).estado, 200, `aula ${aula} a la hora`);
    assert.equal((await iniciar(montar({ inicio: '2026-11-27T20:00:00Z' }), Number(aula))).estado, 200, `aula ${aula} el 27 nov`);
  }
});

test('RESPONDER rechaza un aula cerrada aunque el cliente arme la llamada a mano', async () => {
  // Se simula una ronda del Aula 3 colada en la base antes de su fecha (como si alguien manipulara el cliente).
  const s = montar({ inicio: '2026-10-20T18:00:00Z' });
  const ini = await iniciar(s, 1);
  s.datos.tabla.activas.get(ini.cuerpo.ronda_id).aula = 3;
  s.avanzar(RONDA.margenInicioMs + 5000);
  const r = await s.llamar({ accion: 'responder', ronda_id: ini.cuerpo.ronda_id, indice: 0, opcion: 0 });
  assert.deepEqual([r.estado, r.cuerpo.error], [403, 'aula_cerrada']);
  assert.equal(s.datos.tabla.activas.get(ini.cuerpo.ronda_id).respuestas.length, 0, 'no se guardó nada');
});

test('TERMINAR rechaza un aula cerrada y no guarda nada', async () => {
  const s = montar({ inicio: '2026-10-20T18:00:00Z' });
  const { id } = await jugar(s, { terminar: false });
  s.datos.tabla.activas.get(id).aula = 4;
  const r = await s.llamar({ accion: 'terminar', ronda_id: id });
  assert.deepEqual([r.estado, r.cuerpo.error], [403, 'aula_cerrada']);
  assert.equal(s.datos.tabla.rondas.length, 0);
  assert.equal(s.datos.tabla.progreso.size, 0);
});

test('la hora del TELÉFONO no cuenta: el cuerpo de la solicitud no puede traer hora ni estado de aula', async () => {
  const s = montar({ inicio: '2026-10-20T18:00:00Z' });
  const r = await s.llamar({ accion: 'iniciar', matricula: MAT, aula: 2, ahora: ms('2030-01-01T00:00:00Z'), abierta: true, hora: '2030-01-01' });
  assert.equal(r.cuerpo.error, 'aula_cerrada');
});

test('el reloj de la base se consulta en las tres operaciones', async () => {
  const s = montar();
  const { id } = await jugar(s, { plan: () => 'bien' });
  // iniciar (1) + 25 responder + terminar (1) + terminar repetido (no aplica aquí)
  assert.equal(s.datos.llamadas.aulaAbierta, 27, 'iniciar + 25 responder + terminar');
  assert.ok(id);
});

// ---- interruptor de pruebas -----------------------------------------------------------------------

test('con el interruptor de pruebas encendido las aulas cerradas se juegan y se sirven borradores', async () => {
  const crudos = cargarBancos({ aprobar: false });
  const reloj = { t: ms('2026-10-20T18:00:00Z') };
  const datos = crearDatosFalsos({ ahora: () => reloj.t });
  const mk = (modoPruebas) => crearManejador({ datos, bancos: crudos, modoPruebas, ahora: () => reloj.t, azar: mulberry32(2), nuevoId: () => '11111111-1111-4111-8111-111111111111' });
  // Apagado (lo normal): aula cerrada Y sin preguntas aprobadas.
  assert.equal((await mk(false)({ accion: 'iniciar', matricula: MAT, aula: 1 })).cuerpo.error, 'banco_insuficiente');
  assert.equal((await mk(false)({ accion: 'iniciar', matricula: MAT, aula: 5 })).cuerpo.error, 'aula_cerrada');
  // Encendido: ambas cosas se saltan y la respuesta lo avisa.
  const r = await mk(true)({ accion: 'iniciar', matricula: MAT, aula: 5 });
  assert.equal(r.estado, 200);
  assert.equal(r.cuerpo.modo_pruebas, true);
});

// ---- responder ------------------------------------------------------------------------------------------

test('responder devuelve solo acierto/fallo, puntos y racha; nunca la opción correcta', async () => {
  const s = montar();
  const ini = await iniciar(s);
  const id = ini.cuerpo.ronda_id;
  s.avanzar(RONDA.margenInicioMs + 21000);
  const bien = await s.llamar({ accion: 'responder', ronda_id: id, indice: 0, opcion: correctaMostrada(s, id, 0) });
  assert.equal(bien.estado, 200);
  assert.deepEqual(Object.keys(bien.cuerpo).sort(), ['acierto', 'contestada', 'indice', 'ms', 'puntos', 'puntos_ronda', 'racha', 'restantes']);
  assert.equal(bien.cuerpo.acierto, true);
  assert.equal(bien.cuerpo.ms, 21000);
  assert.equal(bien.cuerpo.puntos, 100 + 25 + 10);
  assert.equal(bien.cuerpo.racha, 1);
  assert.equal(bien.cuerpo.restantes, 24);

  s.avanzar(RONDA.pausaMs + 42000 - 1000);
  const mal = await s.llamar({ accion: 'responder', ronda_id: id, indice: 1, opcion: incorrectaMostrada(s, id, 1) });
  assert.equal(mal.cuerpo.acierto, false);
  assert.equal(mal.cuerpo.puntos, 0);
  assert.equal(mal.cuerpo.racha, 0);
  assert.equal(mal.cuerpo.puntos_ronda, 135);
  assert.ok(!JSON.stringify(mal.cuerpo).includes('correcta'));
});

test('una pregunta no se puede contestar dos veces con otra opción (no se puede tantear)', async () => {
  const s = montar();
  const ini = await iniciar(s);
  const id = ini.cuerpo.ronda_id;
  s.avanzar(RONDA.margenInicioMs + 8000);
  const mala = incorrectaMostrada(s, id, 0);
  const primera = await s.llamar({ accion: 'responder', ronda_id: id, indice: 0, opcion: mala });
  assert.equal(primera.cuerpo.acierto, false);
  for (const otra of [0, 1, 2, 3].filter((o) => o !== mala)) {
    const r = await s.llamar({ accion: 'responder', ronda_id: id, indice: 0, opcion: otra });
    assert.deepEqual([r.estado, r.cuerpo.error], [409, 'pregunta_ya_respondida'], `opción ${otra}`);
  }
  assert.equal(s.datos.tabla.activas.get(id).respuestas.length, 1);
});

test('repetir la MISMA respuesta (se perdió la contestación) devuelve lo mismo sin duplicar', async () => {
  const s = montar();
  const ini = await iniciar(s);
  const id = ini.cuerpo.ronda_id;
  s.avanzar(RONDA.margenInicioMs + 8000);
  const op = correctaMostrada(s, id, 0);
  const a = await s.llamar({ accion: 'responder', ronda_id: id, indice: 0, opcion: op });
  s.avanzar(3000);
  const b = await s.llamar({ accion: 'responder', ronda_id: id, indice: 0, opcion: op });
  assert.deepEqual(b.cuerpo, a.cuerpo);
  assert.equal(s.datos.tabla.activas.get(id).respuestas.length, 1);
});

test('las preguntas se responden en orden', async () => {
  const s = montar();
  const ini = await iniciar(s);
  s.avanzar(RONDA.margenInicioMs + 8000);
  const r = await s.llamar({ accion: 'responder', ronda_id: ini.cuerpo.ronda_id, indice: 3, opcion: 0 });
  assert.deepEqual([r.estado, r.cuerpo.error], [409, 'fuera_de_orden']);
});

test('"sin contestar" solo vale cuando el tiempo de verdad se acabó', async () => {
  const s = montar();
  const ini = await iniciar(s);
  const id = ini.cuerpo.ronda_id;
  s.avanzar(RONDA.margenInicioMs + 5000);
  const antes = await s.llamar({ accion: 'responder', ronda_id: id, indice: 0, opcion: null });
  assert.deepEqual([antes.estado, antes.cuerpo.error], [400, 'respuesta_prematura']);
  s.avanzar(RONDA.tiempoMs); // ya pasaron más de 42 s desde que empezó la pregunta
  const ok = await s.llamar({ accion: 'responder', ronda_id: id, indice: 0, opcion: null });
  assert.equal(ok.estado, 200);
  assert.equal(ok.cuerpo.contestada, false);
  assert.equal(ok.cuerpo.acierto, false);
  assert.equal(ok.cuerpo.ms, RONDA.tiempoMs);
});

test('una respuesta que llega fuera de tiempo (42 s + gracia) cuenta como no contestada', async () => {
  const s = montar();
  const ini = await iniciar(s);
  const id = ini.cuerpo.ronda_id;
  s.avanzar(RONDA.margenInicioMs + RONDA.tiempoMs + RONDA.graciaMs + 1);
  const r = await s.llamar({ accion: 'responder', ronda_id: id, indice: 0, opcion: correctaMostrada(s, id, 0) });
  assert.deepEqual([r.cuerpo.contestada, r.cuerpo.acierto, r.cuerpo.puntos], [false, false, 0]);
});

test('con la gracia de red, una respuesta a 42.5 s todavía vale', async () => {
  const s = montar();
  const ini = await iniciar(s);
  const id = ini.cuerpo.ronda_id;
  s.avanzar(RONDA.margenInicioMs + 42500);
  const r = await s.llamar({ accion: 'responder', ronda_id: id, indice: 0, opcion: correctaMostrada(s, id, 0) });
  assert.equal(r.cuerpo.acierto, true);
  assert.equal(r.cuerpo.ms, 42000);
  assert.equal(r.cuerpo.puntos, 100 + 0 + 10, 'sin bono de velocidad');
});

test('opción inválida, índice inválido o id mal formado se rechazan', async () => {
  const s = montar();
  const ini = await iniciar(s);
  const id = ini.cuerpo.ronda_id;
  for (const mala of [
    { ronda_id: id, indice: 0, opcion: 4 }, { ronda_id: id, indice: 0, opcion: -1 }, { ronda_id: id, indice: 0, opcion: '1' },
    { ronda_id: id, indice: 25, opcion: 0 }, { ronda_id: id, indice: 1.5, opcion: 0 }, { ronda_id: 'no-es-uuid', indice: 0, opcion: 0 },
  ]) {
    assert.equal((await s.llamar({ accion: 'responder', ...mala })).cuerpo.error, 'solicitud_invalida', JSON.stringify(mala));
  }
  const desconocida = await s.llamar({ accion: 'responder', ronda_id: '99999999-9999-4999-8999-999999999999', indice: 0, opcion: 0 });
  assert.deepEqual([desconocida.estado, desconocida.cuerpo.error], [404, 'ronda_no_encontrada']);
});

test('una ronda abandonada caduca', async () => {
  const s = montar();
  const ini = await iniciar(s);
  s.avanzar(3 * 3600 * 1000);
  const r = await s.llamar({ accion: 'responder', ronda_id: ini.cuerpo.ronda_id, indice: 0, opcion: 0 });
  assert.deepEqual([r.estado, r.cuerpo.error], [410, 'ronda_expirada']);
});

// ---- terminar ---------------------------------------------------------------------------------------------

test('terminar califica, guarda en rondas y progreso y devuelve el resumen con explicaciones y citas', async () => {
  const s = montar();
  const { fin, respuestas } = await jugar(s, { plan: (i) => (i < 20 ? 'bien' : 'mal'), tarda: () => 12000 });
  assert.equal(fin.estado, 200);
  const { resumen, jugador } = fin.cuerpo;
  assert.equal(resumen.aciertos, 20);
  assert.equal(resumen.total, 25);
  assert.equal(resumen.calificacion, 8);
  assert.equal(resumen.puntaje, respuestas[24].cuerpo.puntos_ronda);
  assert.equal(resumen.racha_max, 20);
  assert.equal(resumen.tiempo_promedio_ms, 12000);
  assert.equal(resumen.record.anterior, 0);
  assert.equal(resumen.record.nuevo, resumen.puntaje);
  assert.equal(resumen.record.es_nuevo, true);
  assert.equal(resumen.por_tema.length, 2);
  assert.equal(resumen.por_tema.reduce((n, t) => n + t.total, 0), 25);
  assert.equal(resumen.por_tema.reduce((n, t) => n + t.aciertos, 0), 20);

  assert.equal(resumen.revision.length, 5, 'solo las falladas');
  for (const rev of resumen.revision) {
    assert.equal(rev.opciones.length, 4);
    assert.ok(rev.correcta >= 0 && rev.correcta <= 3);
    assert.notEqual(rev.elegida, rev.correcta);
    assert.ok(rev.explicacion.length >= 40);
    assert.match(rev.cita, /Moore.*Cap\. \d+, «.+», pp?\. \d{3,4}/);
  }

  assert.equal(s.datos.tabla.rondas.length, 1);
  assert.equal(s.datos.tabla.progreso.get(`${MAT}:1`).rondas, 1);
  assert.equal(jugador.record_total, resumen.puntaje);
  assert.equal(jugador.racha_dias, 1);
  assert.equal(resumen.racha_dias, 1);
});

test('la revisión no incluye preguntas acertadas (no se filtra el banco)', async () => {
  const s = montar();
  const { fin } = await jugar(s, { plan: () => 'bien' });
  assert.deepEqual(fin.cuerpo.resumen.revision, []);
  assert.equal(fin.cuerpo.resumen.calificacion, 10);
});

test('las preguntas sin contestar aparecen en la revisión sin respuesta elegida', async () => {
  const s = montar();
  const { fin } = await jugar(s, { plan: (i) => (i === 3 ? 'nada' : 'bien') });
  const rev = fin.cuerpo.resumen.revision;
  assert.equal(rev.length, 1);
  assert.equal(rev[0].indice, 3);
  assert.equal(rev[0].elegida, null);
});

test('terminar con preguntas sin responder se rechaza', async () => {
  const s = montar();
  const ini = await iniciar(s);
  s.avanzar(RONDA.margenInicioMs + 9000);
  await s.llamar({ accion: 'responder', ronda_id: ini.cuerpo.ronda_id, indice: 0, opcion: 0 });
  const r = await s.llamar({ accion: 'terminar', ronda_id: ini.cuerpo.ronda_id });
  assert.deepEqual([r.estado, r.cuerpo.error], [409, 'ronda_incompleta']);
  assert.equal(s.datos.tabla.rondas.length, 0);
});

test('terminar dos veces devuelve el mismo resumen y guarda UNA sola ronda', async () => {
  const s = montar();
  const { id, fin } = await jugar(s, { plan: (i) => (i % 4 === 0 ? 'mal' : 'bien') });
  const otra = await s.llamar({ accion: 'terminar', ronda_id: id });
  assert.equal(otra.estado, 200);
  assert.deepEqual(otra.cuerpo.resumen, fin.cuerpo.resumen);
  assert.equal(s.datos.tabla.rondas.length, 1);
  assert.equal(s.datos.tabla.progreso.get(`${MAT}:1`).rondas, 1);
  const tarde = await s.llamar({ accion: 'responder', ronda_id: id, indice: 0, opcion: 0 });
  assert.equal(tarde.cuerpo.error, 'ronda_terminada');
});

test('ronda imposible (25 respuestas en 30 s) se rechaza y no guarda nada', async () => {
  const s = montar();
  const ini = await iniciar(s);
  const id = ini.cuerpo.ronda_id;
  s.avanzar(RONDA.margenInicioMs);
  for (let i = 0; i < 25; i++) {
    s.avanzar(1200); // 1.2 s entre respuestas: 30 s en total
    await s.llamar({ accion: 'responder', ronda_id: id, indice: i, opcion: correctaMostrada(s, id, i) });
  }
  const r = await s.llamar({ accion: 'terminar', ronda_id: id });
  assert.deepEqual([r.estado, r.cuerpo.error], [422, 'ronda_invalida']);
  assert.equal(s.datos.tabla.rondas.length, 0);
  assert.equal(s.datos.tabla.progreso.size, 0);
  assert.equal(s.datos.tabla.activas.size, 0, 'la ronda inválida se descarta');
});

test('el récord solo sube con una ronda mejor; repetir no lo infla', async () => {
  const s = montar();
  const a = await jugar(s, { plan: () => 'bien', tarda: () => 5000 });
  const peor = await jugar(s, { plan: (i) => (i < 10 ? 'bien' : 'mal') });
  assert.equal(peor.fin.cuerpo.resumen.record.anterior, a.fin.cuerpo.resumen.puntaje);
  assert.equal(peor.fin.cuerpo.resumen.record.es_nuevo, false);
  assert.ok(peor.fin.cuerpo.resumen.record.diferencia < 0);
  assert.equal(peor.fin.cuerpo.jugador.record_total, a.fin.cuerpo.resumen.puntaje);
  assert.equal(s.datos.tabla.progreso.get(`${MAT}:1`).ultimo, peor.fin.cuerpo.resumen.puntaje);
});

test('el récord total suma el mejor de cada aula', async () => {
  const s = montar({ inicio: '2026-10-27T18:00:00Z' }); // Aulas 1 y 2 abiertas
  const a1 = await jugar(s, { aula: 1, tarda: () => 6000 });
  s.avanzar(1000);
  const a2 = await jugar(s, { aula: 2, tarda: () => 6000 });
  assert.equal(a2.fin.cuerpo.jugador.record_total, a1.fin.cuerpo.resumen.puntaje + a2.fin.cuerpo.resumen.puntaje);
});

// ---- Salón de la Fama y semana 0 --------------------------------------------------------------------------

test('SEMANA 0: una ronda antes del 19 oct guarda récord personal pero no entra al Salón de la Fama', async () => {
  const s = montar({ inicio: '2026-10-15T18:00:00Z' });
  const { fin } = await jugar(s);
  assert.equal(fin.cuerpo.resumen.salon.cuenta, false);
  assert.equal(fin.cuerpo.resumen.salon.semana, '2026-10-12');
  assert.ok(fin.cuerpo.jugador.record_total > 0, 'el récord personal sí se guarda');
  assert.equal(s.datos.tabla.progreso.get(`${MAT}:1`).rondas, 1);
  assert.equal(s.datos.tabla.rondas.length, 1);
  assert.equal(s.datos.tabla.semanal.size, 0, 'nada en el puntaje semanal');
});

test('SEMANA 1: desde el lunes 19 oct la ronda cuenta para el Salón', async () => {
  const s = montar({ inicio: '2026-10-19T06:00:00Z' });
  const { fin } = await jugar(s);
  assert.equal(fin.cuerpo.resumen.salon.cuenta, true);
  assert.equal(fin.cuerpo.resumen.salon.semana, '2026-10-19');
  assert.equal(s.datos.tabla.semanal.get(`2026-10-19:${MAT}`), fin.cuerpo.resumen.puntaje);
});

test('el domingo 18 oct a las 23:59 (CDMX) todavía es semana 0', async () => {
  const s = montar({ inicio: '2026-10-19T05:30:00Z' });
  const { fin } = await jugar(s, { tarda: () => 1500 }); // termina antes del lunes 06:00 UTC
  assert.ok(s.reloj.t < ms('2026-10-19T06:00:00Z'));
  assert.equal(fin.cuerpo.resumen.salon.cuenta, false);
});

test('puntaje semanal = mejor ronda de cada aula de la semana', async () => {
  const s = montar({ inicio: '2026-10-27T18:00:00Z' });
  await jugar(s, { aula: 1, plan: (i) => (i < 10 ? 'bien' : 'mal') });
  const mejor1 = await jugar(s, { aula: 1, tarda: () => 5000 });
  const a2 = await jugar(s, { aula: 2, tarda: () => 5000 });
  const semana = a2.fin.cuerpo.resumen.salon.semana;
  assert.equal(s.datos.tabla.semanal.get(`${semana}:${MAT}`), mejor1.fin.cuerpo.resumen.puntaje + a2.fin.cuerpo.resumen.puntaje);
});

// ---- preguntas vistas / falladas -----------------------------------------------------------------------------

test('con pocas no vistas, las falladas completan la ronda y salen de la lista al acertarlas', async () => {
  const s = montar({ semilla: 11 });
  // Jugador que ya vio casi todo el Aula 1: quedan 10 no vistas por tema y 5 falladas por tema.
  const vistas = new Set();
  const falladas = new Set();
  for (const t of bancos[1].temas) {
    const delTema = bancos[1].preguntas.filter((p) => p.tema === t.id);
    delTema.slice(10).forEach((p) => vistas.add(p.id));
    delTema.slice(10, 15).forEach((p) => falladas.add(p.id));
  }
  s.datos.tabla.progreso.set(`${MAT}:1`, { record: 0, ultimo: 0, rondas: 1, vistas, falladas });

  const ini = await iniciar(s);
  const ids = s.datos.tabla.activas.get(ini.cuerpo.ronda_id).preguntas.map((p) => p.id);
  const clase = (id) => (!vistas.has(id) ? 0 : falladas.has(id) ? 1 : 2);
  const clases = ids.map(clase);
  assert.deepEqual(clases, [...clases].sort(), 'primero no vistas, luego falladas, al final acertadas');
  assert.equal(clases.filter((c) => c === 0).length, 20, 'las 10 no vistas de cada tema entran todas');
  assert.equal(clases.filter((c) => c === 1).length, 5, 'las falladas completan los 12–13 de cada tema');
  assert.equal(clases.filter((c) => c === 2).length, 0, 'no hace falta ninguna ya acertada');

  const elegidasFalladas = ids.filter((id) => falladas.has(id));
  await jugar(s, { inicio: ini, plan: () => 'bien' });
  const despues = s.datos.tabla.progreso.get(`${MAT}:1`);
  for (const id of elegidasFalladas) assert.ok(!despues.falladas.has(id), 'acertada → ya no es fallada');
  assert.equal(despues.falladas.size, 10 - 5, 'las falladas que no salieron siguen pendientes');
});

test('una pregunta fallada queda en la lista de falladas y como vista', async () => {
  const s = montar({ semilla: 3 });
  await jugar(s, { plan: (i) => (i < 5 ? 'mal' : 'bien') });
  const prog = s.datos.tabla.progreso.get(`${MAT}:1`);
  assert.equal(prog.falladas.size, 5);
  assert.equal(prog.vistas.size, 25);
});

// ---- insignias y racha de días ----------------------------------------------------------------------------------

test('una ronda perfecta rápida gana Primer día, Ronda perfecta, Rayo y Racha de 10 y 25', async () => {
  const s = montar();
  const { fin } = await jugar(s, { plan: () => 'bien', tarda: () => 5000 });
  assert.deepEqual(fin.cuerpo.resumen.insignias_nuevas.sort(), ['primer-dia', 'racha-10', 'racha-25', 'ronda-perfecta', 'rayo'].sort());
  assert.deepEqual([...fin.cuerpo.jugador.insignias].sort(), [...fin.cuerpo.resumen.insignias_nuevas].sort());
});

test('las insignias no se repiten en la siguiente ronda', async () => {
  const s = montar();
  await jugar(s, { plan: () => 'bien', tarda: () => 5000 });
  const dos = await jugar(s, { plan: () => 'bien', tarda: () => 5000 });
  assert.deepEqual(dos.fin.cuerpo.resumen.insignias_nuevas, []);
});

test('Constancia: 3 días seguidos de rondas; saltarse un día reinicia la racha', async () => {
  const s = montar({ inicio: '2026-10-20T18:00:00Z' });
  assert.equal((await jugar(s)).fin.cuerpo.resumen.racha_dias, 1);
  s.avanzar(DIA);
  assert.equal((await jugar(s)).fin.cuerpo.resumen.racha_dias, 2);
  s.avanzar(DIA);
  const tercero = await jugar(s);
  assert.equal(tercero.fin.cuerpo.resumen.racha_dias, 3);
  assert.ok(tercero.fin.cuerpo.resumen.insignias_nuevas.includes('constancia'));
  s.avanzar(2 * DIA);
  assert.equal((await jugar(s)).fin.cuerpo.resumen.racha_dias, 1);
});
const DIA = 86400000;

test('Remontada: sube el récord del aula 1,000 puntos o más', async () => {
  const s = montar();
  await jugar(s, { plan: (i) => (i < 8 ? 'bien' : 'mal'), tarda: () => 9000 });
  const segunda = await jugar(s, { plan: () => 'bien', tarda: () => 5000 });
  assert.ok(segunda.fin.cuerpo.resumen.record.diferencia >= 1000);
  assert.ok(segunda.fin.cuerpo.resumen.insignias_nuevas.includes('remontada'));
});

test('las insignias de aulas aún cerradas no se pueden ganar: sus rondas se rechazan', async () => {
  const s = montar({ inicio: '2026-10-20T18:00:00Z' });
  await jugar(s, { aula: 1, plan: () => 'bien', tarda: () => 5000 });
  for (const aula of [2, 3, 4, 5, 6]) assert.equal((await iniciar(s, aula)).cuerpo.error, 'aula_cerrada');
  const ins = s.datos.tabla.jugadores.get(MAT).insignias;
  for (const id of ['dominio-cuello', 'senor-plexos', 'vascular', 'listo-departamental']) assert.ok(!ins.includes(id), id);
});

test('Dominio del cuello: 22+ en las Aulas 1 y 2, una vez que el Aula 2 abre', async () => {
  const s = montar({ inicio: '2026-10-27T18:00:00Z' });
  const grande = (i) => (i < 23 ? 'bien' : 'mal');
  await jugar(s, { aula: 1, plan: grande, tarda: () => 9000 });
  s.avanzar(1000);
  const dos = await jugar(s, { aula: 2, plan: grande, tarda: () => 9000 });
  assert.ok(dos.fin.cuerpo.resumen.insignias_nuevas.includes('dominio-cuello'));
});

// ---- errores del servidor ---------------------------------------------------------------------------------------------

test('un fallo inesperado devuelve 500 sin detalles internos', async () => {
  const s = montar();
  s.datos.aulaAbierta = async () => { throw new Error('conexión rota: password=secreto'); };
  const original = console.error;
  console.error = () => {};
  try {
    const r = await iniciar(s);
    assert.deepEqual([r.estado, r.cuerpo], [500, { error: 'servidor' }]);
  } finally {
    console.error = original;
  }
});
