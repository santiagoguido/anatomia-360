import test from 'node:test';
import assert from 'node:assert/strict';
import { crearManejador } from '../src/servidor/manejador.js';
import { CLINICA, MAXIMO_GUARDIA } from '../src/game/clinica/reglas.js';
import { mulberry32 } from '../src/utils/azar.js';
import { cargarBancos, cargarCasos, crearDatosFalsos, ms } from './ayudas/datosFalsos.js';

const MAT = 'a0123456x';
const bancos = cargarBancos();

function montar({ inicio = '2026-10-20T18:00:00Z', modoPruebas = false, aprobar = true, semilla = 3 } = {}) {
  const reloj = { t: ms(inicio) };
  const ahora = () => reloj.t;
  const datos = crearDatosFalsos({ ahora, jugadores: [MAT] });
  const casos = cargarCasos({ aprobar });
  let n = 0;
  const manejar = crearManejador({
    datos, bancos, casos, modoPruebas, ahora, azar: mulberry32(semilla),
    nuevoId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  });
  return { reloj, datos, casos, llamar: (c) => manejar(c), avanzar: (x) => { reloj.t += x; } };
}

const iniciar = (s) => s.llamar({ accion: 'guardia_iniciar', matricula: MAT });
const ok = (r) => { assert.equal(r.estado, 200, JSON.stringify(r.cuerpo)); return r.cuerpo; };

/** Posición mostrada (0–3) de la opción correcta del paso, según lo guardado en el servidor. */
function correcta(s, id, caso, paso) {
  const activa = s.datos.tabla.guardiasActivas.get(id);
  const c = activa.casos[caso];
  return c.ordenes[paso].indexOf(s.casos.find((x) => x.id === c.id).pasos[paso].correcta);
}

const EXPLORACIONES = CLINICA.exploraciones;

/**
 * Juega una guardia. `plan({caso, paso})` → 'bien' (1.er intento) | 'segundo' (falla y acierta) | 'perder' (falla dos veces).
 * `explora(caso)` → cuántas exploraciones hace. `pista({caso,paso})` → true para pedirla.
 */
async function jugar(s, { plan = () => 'bien', explora = () => 2, pista = () => false } = {}) {
  const ini = ok(await iniciar(s));
  const id = ini.guardia_id;
  let ultimo = null;
  const pasos = [];
  for (let caso = 0; caso < ini.total; caso++) {
    for (let k = 0; k < explora(caso); k++) {
      ok(await s.llamar({ accion: 'guardia_explorar', guardia_id: id, caso, exploracion: EXPLORACIONES[k] }));
    }
    for (let paso = 0; paso < CLINICA.pasos; paso++) {
      if (pista({ caso, paso })) ok(await s.llamar({ accion: 'guardia_pista', guardia_id: id, caso, paso }));
      const buena = correcta(s, id, caso, paso);
      const mala = (buena + 1) % 4;
      const jugada = plan({ caso, paso });
      let r;
      if (jugada === 'bien') r = ok(await s.llamar({ accion: 'guardia_responder', guardia_id: id, caso, paso, intento: 1, opcion: buena }));
      else {
        ok(await s.llamar({ accion: 'guardia_responder', guardia_id: id, caso, paso, intento: 1, opcion: mala }));
        r = ok(await s.llamar({ accion: 'guardia_responder', guardia_id: id, caso, paso, intento: 2, opcion: jugada === 'segundo' ? buena : (mala + 1) % 4 === buena ? (mala + 2) % 4 : (mala + 1) % 4 }));
      }
      pasos.push(r.resultado);
      ultimo = r;
    }
    const sig = ok(await s.llamar({ accion: 'guardia_siguiente', guardia_id: id, caso }));
    if (caso === ini.total - 1) return { id, ini, pasos, final: sig, ultimo };
  }
  throw new Error('no terminó');
}

test('el tope de una guardia coincide con el check del SQL (3,500)', async () => {
  const { readFileSync } = await import('node:fs');
  const sql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  assert.equal(MAXIMO_GUARDIA, 3500);
  assert.match(sql, /puntaje\s+integer\s+not null check \(puntaje between 0 and 3500\)/);
  assert.match(sql, /puntos\s+integer\s+not null check \(puntos between 0 and 700\)/);
});

test('con solo el Aula 1 abierta salen 5 casos, todos de la semana 1', async () => {
  const s = montar();
  const r = ok(await iniciar(s));
  assert.equal(r.total, 5);
  const activa = s.datos.tabla.guardiasActivas.get(r.guardia_id);
  for (const c of activa.casos) assert.equal(s.casos.find((x) => x.id === c.id).semana, 1, c.id);
});

test('los casos de aulas cerradas nunca salen, ni el que combina las aulas 1 y 2 mientras la 2 esté cerrada', async () => {
  for (let semilla = 1; semilla <= 12; semilla++) {
    const s = montar({ semilla });
    const r = ok(await iniciar(s));
    const ids = s.datos.tabla.guardiasActivas.get(r.guardia_id).casos.map((c) => c.id);
    assert.ok(ids.every((id) => id.startsWith('c1-')), ids.join());
  }
});

test('con el Aula 2 abierta ya pueden salir casos de la semana 2, y el que usa las aulas 1 y 2 solo entonces', async () => {
  const vistos = new Set();
  for (let semilla = 1; semilla <= 40; semilla++) {
    const s = montar({ inicio: '2026-10-27T18:00:00Z', semilla });
    const r = ok(await iniciar(s));
    for (const c of s.datos.tabla.guardiasActivas.get(r.guardia_id).casos) vistos.add(c.id);
  }
  assert.ok([...vistos].some((id) => id.startsWith('c2-')));
  assert.ok(vistos.has('c2-07'));
});

test('casos en borrador no se sirven; con el interruptor de pruebas sí', async () => {
  const s = montar({ aprobar: false });
  const r = await iniciar(s);
  assert.equal(r.estado, 503);
  assert.equal(r.cuerpo.error, 'casos_insuficientes');
  const p = montar({ aprobar: false, modoPruebas: true, inicio: '2026-10-15T18:00:00Z' });
  const ok1 = ok(await iniciar(p));
  assert.equal(ok1.vista.modo_pruebas, true);
});

test('la primera respuesta del servidor no revela correctas, pistas, desenlace ni hallazgos sin explorar', async () => {
  const s = montar();
  const r = ok(await iniciar(s));
  const texto = JSON.stringify(r);
  const caso = s.casos.find((c) => c.id === s.datos.tabla.guardiasActivas.get(r.guardia_id).casos[0].id);
  assert.equal(r.vista.paso, null, 'sin explorar no se envía la pregunta');
  for (const e of r.vista.exploraciones) assert.equal(e.hallazgo, null);
  for (const prohibido of ['"correcta"', 'util', caso.desenlace.explicacion, caso.pasos[0].pista, caso.exploraciones.inspeccion.hallazgo]) {
    assert.ok(!texto.includes(prohibido), `se filtró: ${prohibido.slice(0, 40)}`);
  }
});

test('hay que explorar el mínimo para razonar; explorar dos veces lo mismo cuenta una vez', async () => {
  const s = montar();
  const { guardia_id: id } = ok(await iniciar(s));
  const responder = () => s.llamar({ accion: 'guardia_responder', guardia_id: id, caso: 0, paso: 0, intento: 1, opcion: 0 });
  assert.equal((await responder()).cuerpo.error, 'fuera_de_orden');
  let v = ok(await s.llamar({ accion: 'guardia_explorar', guardia_id: id, caso: 0, exploracion: 'inspeccion' })).vista;
  v = ok(await s.llamar({ accion: 'guardia_explorar', guardia_id: id, caso: 0, exploracion: 'inspeccion' })).vista;
  assert.equal(v.n_exploraciones, 1);
  assert.equal(v.paso, null);
  v = ok(await s.llamar({ accion: 'guardia_explorar', guardia_id: id, caso: 0, exploracion: 'fuerza' })).vista;
  assert.equal(v.n_exploraciones, 2);
  assert.equal(v.paso.indice, 0);
  assert.equal(v.paso.opciones.length, 4);
  assert.ok(v.exploraciones.find((e) => e.id === 'fuerza').hallazgo);
  assert.equal((await s.llamar({ accion: 'guardia_explorar', guardia_id: id, caso: 0, exploracion: 'cualquiera' })).cuerpo.error, 'solicitud_invalida');
});

test('guardia perfecta con 2 exploraciones y sin pistas: 700 por caso, 3,500 en total', async () => {
  const s = montar();
  const j = await jugar(s);
  const r = j.final;
  assert.equal(r.final, true);
  assert.equal(r.resumen.puntaje, 3500);
  assert.equal(r.resumen.resueltos, 5);
  assert.equal(r.jugador.mejor_guardia, 3500);
  assert.equal(r.jugador.expedientes, 5);
  assert.equal(r.jugador.record_total, 3500);
  assert.ok(r.resumen.insignias_nuevas.includes('ojo-clinico'));
  assert.equal(r.resumen.mejor.es_nuevo, true);
  assert.equal(r.resumen.salon.cuenta, true);
});

test('puntos por paso: 200 al primer intento, 100 al segundo; pista resta 50; bono solo con 3 exploraciones o menos', async () => {
  const s = montar();
  // caso 0: paso 0 al segundo intento, 1 pista; caso 1: 4 exploraciones (sin bono); resto perfecto
  const j = await jugar(s, {
    plan: ({ caso, paso }) => (caso === 0 && paso === 0 ? 'segundo' : 'bien'),
    pista: ({ caso, paso }) => caso === 0 && paso === 0,
    explora: (caso) => (caso === 1 ? 4 : 2),
  });
  const casos = j.final.resumen.casos;
  assert.equal(casos[0].puntos, 100 + 200 + 200 + 100 - 50);
  assert.equal(casos[0].ojo_clinico, false); // usó pista
  assert.equal(casos[1].puntos, 600); // 4 exploraciones: sin bono
  assert.equal(casos[2].puntos, 700);
  assert.equal(j.final.resumen.puntaje, 550 + 600 + 700 * 3);
});

test('dos fallos en un paso revelan la respuesta, valen 0 y el caso no queda resuelto ni se archiva', async () => {
  const s = montar();
  const j = await jugar(s, { plan: ({ caso, paso }) => (caso === 0 && paso === 1 ? 'perder' : 'bien') });
  const perdido = j.pasos[1];
  assert.equal(perdido.revelada, true);
  assert.equal(perdido.acierto, false);
  assert.equal(perdido.puntos_paso, 0);
  assert.ok(Number.isInteger(perdido.correcta));
  const r = j.final;
  assert.equal(r.resumen.casos[0].resuelto, false);
  assert.equal(r.resumen.casos[0].puntos, 400); // 200 + 0 + 200, sin bono
  assert.equal(r.jugador.expedientes, 4);
  assert.equal(r.resumen.resueltos, 4);
});

test('una respuesta equivocada no revela la correcta en el primer fallo', async () => {
  const s = montar();
  const { guardia_id: id } = ok(await iniciar(s));
  for (const e of ['inspeccion', 'fuerza']) ok(await s.llamar({ accion: 'guardia_explorar', guardia_id: id, caso: 0, exploracion: e }));
  const mala = (correcta(s, id, 0, 0) + 1) % 4;
  const r = ok(await s.llamar({ accion: 'guardia_responder', guardia_id: id, caso: 0, paso: 0, intento: 1, opcion: mala }));
  assert.equal(r.resultado.acierto, false);
  assert.equal(r.resultado.correcta, null);
  assert.equal(r.resultado.intentos_restantes, 1);
  assert.equal(r.vista.paso.intento, 2);
});

test('repetir una respuesta perdida devuelve lo mismo; cambiar la opción se rechaza', async () => {
  const s = montar();
  const { guardia_id: id } = ok(await iniciar(s));
  for (const e of ['inspeccion', 'fuerza']) ok(await s.llamar({ accion: 'guardia_explorar', guardia_id: id, caso: 0, exploracion: e }));
  const buena = correcta(s, id, 0, 0);
  const cuerpo = { accion: 'guardia_responder', guardia_id: id, caso: 0, paso: 0, intento: 1, opcion: buena };
  const a = ok(await s.llamar(cuerpo));
  const b = ok(await s.llamar(cuerpo));
  assert.deepEqual(a.resultado, b.resultado);
  assert.equal((await s.llamar({ ...cuerpo, opcion: (buena + 1) % 4 })).cuerpo.error, 'pregunta_ya_respondida');
  // un intento saltado o un paso fuera de orden se rechazan
  assert.equal((await s.llamar({ ...cuerpo, paso: 2, intento: 1 })).cuerpo.error, 'fuera_de_orden');
});

test('la pista se cobra una sola vez por paso aunque se repita la petición', async () => {
  const s = montar();
  const { guardia_id: id } = ok(await iniciar(s));
  for (const e of ['inspeccion', 'fuerza']) ok(await s.llamar({ accion: 'guardia_explorar', guardia_id: id, caso: 0, exploracion: e }));
  const p = { accion: 'guardia_pista', guardia_id: id, caso: 0, paso: 0 };
  const a = ok(await s.llamar(p));
  const b = ok(await s.llamar(p));
  assert.equal(a.vista.pistas_usadas, 1);
  assert.equal(b.vista.pistas_usadas, 1);
  assert.ok(a.vista.paso.pista);
  assert.equal((await s.llamar({ ...p, paso: 1 })).cuerpo.error, 'fuera_de_orden');
});

test('al terminar un caso llega el desenlace y no antes; «siguiente» se puede repetir', async () => {
  const s = montar();
  const { guardia_id: id } = ok(await iniciar(s));
  for (const e of ['inspeccion', 'fuerza']) ok(await s.llamar({ accion: 'guardia_explorar', guardia_id: id, caso: 0, exploracion: e }));
  let r;
  for (let paso = 0; paso < 3; paso++) {
    r = ok(await s.llamar({ accion: 'guardia_responder', guardia_id: id, caso: 0, paso, intento: 1, opcion: correcta(s, id, 0, paso) }));
    assert.equal(r.vista.desenlace === null, paso < 2);
  }
  assert.equal(r.vista.desenlace.puntos.total, 700);
  assert.equal(r.vista.desenlace.resuelto, true);
  assert.ok(r.vista.desenlace.esquema.base);
  assert.equal((await s.llamar({ accion: 'guardia_siguiente', guardia_id: id, caso: 1 })).cuerpo.error, 'fuera_de_orden');
  const a = ok(await s.llamar({ accion: 'guardia_siguiente', guardia_id: id, caso: 0 }));
  const b = ok(await s.llamar({ accion: 'guardia_siguiente', guardia_id: id, caso: 0 }));
  assert.equal(a.vista.indice, 1);
  assert.equal(b.vista.indice, 1);
});

test('terminar la guardia dos veces devuelve el mismo resumen y guarda una sola vez', async () => {
  const s = montar();
  const j = await jugar(s);
  const otra = ok(await s.llamar({ accion: 'guardia_siguiente', guardia_id: j.id, caso: 4 }));
  assert.deepEqual(otra.resumen, j.final.resumen);
  assert.equal(s.datos.tabla.guardias.length, 1);
});

test('empezar otra guardia anula la anterior', async () => {
  const s = montar();
  const a = ok(await iniciar(s)).guardia_id;
  ok(await iniciar(s));
  const r = await s.llamar({ accion: 'guardia_explorar', guardia_id: a, caso: 0, exploracion: 'fuerza' });
  assert.equal(r.cuerpo.error, 'guardia_no_encontrada');
});

test('una guardia caduca después de 2 horas', async () => {
  const s = montar();
  const { guardia_id: id } = ok(await iniciar(s));
  s.avanzar(CLINICA.expiraMs + 1000);
  const r = await s.llamar({ accion: 'guardia_explorar', guardia_id: id, caso: 0, exploracion: 'fuerza' });
  assert.equal(r.estado, 410);
  assert.equal(r.cuerpo.error, 'guardia_expirada');
});

test('la mejor guardia sube el récord total y se conserva la mejor; los casos resueltos se repiten al final', async () => {
  const s = montar();
  const a = await jugar(s, { plan: ({ paso }) => (paso === 0 ? 'segundo' : 'bien') }); // 600 por caso → 3,000
  assert.equal(a.final.resumen.puntaje, 3000);
  s.avanzar(60000);
  const b = await jugar(s, { plan: () => 'perder' }); // 0
  assert.equal(b.final.resumen.puntaje, 0);
  assert.equal(b.final.jugador.mejor_guardia, 3000);
  assert.equal(b.final.jugador.record_total, 3000);
  assert.equal(b.final.resumen.mejor.es_nuevo, false);
  // los 5 casos de la primera guardia quedaron archivados; la segunda debe usar primero los 3 casos que faltaban
  const archivados = new Set([...s.datos.tabla.expedientes.values()].map((e) => e.caso_id));
  assert.equal(archivados.size, 5);
});

test('«Residente de guardia» llega con la 5.ª guardia terminada, no antes', async () => {
  const s = montar();
  let insignias = [];
  for (let n = 1; n <= 5; n++) {
    const j = await jugar(s, { explora: () => 4 }); // 4 exploraciones: nunca Ojo clínico
    insignias = j.final.resumen.insignias_nuevas;
    if (n < 5) assert.deepEqual(insignias, [], `guardia ${n}`);
    s.avanzar(1000);
  }
  assert.deepEqual(insignias, ['residente-de-guardia']);
});

test('la semana 0 guarda récord personal pero no suma al Salón; la semana 1 sí, con la mejor guardia', async () => {
  const antes = montar({ inicio: '2026-10-15T18:00:00Z' });
  const a = await jugar(antes);
  assert.equal(a.final.resumen.salon.cuenta, false);
  assert.equal(a.final.jugador.mejor_guardia, 3500);
  assert.equal(antes.datos.tabla.semanal.size, 0);

  const durante = montar({ inicio: '2026-10-20T18:00:00Z' });
  const b = await jugar(durante);
  assert.equal(b.final.resumen.salon.cuenta, true);
  assert.equal([...durante.datos.tabla.semanal.values()][0], 3500);
});

test('expedientes: devuelve el desenlace de los casos resueltos, solo los de esa matrícula', async () => {
  const s = montar();
  await jugar(s, { plan: ({ caso, paso }) => (caso === 0 && paso === 0 ? 'perder' : 'bien') });
  const r = ok(await s.llamar({ accion: 'expedientes', matricula: MAT }));
  assert.equal(r.expedientes.length, 4);
  for (const e of r.expedientes) {
    assert.ok(e.titulo && e.explicacion && e.esquema.base && e.cita.startsWith('Moore'));
  }
  assert.deepEqual(ok(await s.llamar({ accion: 'expedientes', matricula: 'z9999999z' })).expedientes, []);
});

test('solicitudes mal formadas se rechazan sin romper nada', async () => {
  const s = montar();
  for (const cuerpo of [
    { accion: 'guardia_iniciar' },
    { accion: 'guardia_iniciar', matricula: 'x' },
    { accion: 'guardia_explorar', guardia_id: 'no-es-uuid', caso: 0, exploracion: 'fuerza' },
    { accion: 'constructor' },
    { accion: '__proto__' },
  ]) {
    const r = await s.llamar(cuerpo);
    assert.equal(r.estado, 400, JSON.stringify(cuerpo));
  }
  const noExiste = await s.llamar({ accion: 'guardia_iniciar', matricula: 'b7654321y' });
  assert.equal(noExiste.estado, 404);
});
