import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoSalon, fechaCorta, filasTop10, listaGanadores, mensajeAntes, mensajeMiLugar, numeroSemana, opcionesSemana, textoJugadores, textoVacio,
} from '../src/ui/salon/modelo.js';

const base = {
  estado: 'activo', semana: '2026-11-09', semana_actual: '2026-11-09',
  semanas: ['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'],
  jugadores: 13, top10: [], mi_posicion: null, ganadores: [],
};
const fila = (posicion, extra = {}) => ({ posicion, nombre: `Alumno ${posicion}`, matricula_oculta: '••••0001', puntaje: 5000 - posicion, es_tuyo: false, ...extra });

test('número de semana del curso: 19 oct = 1 … 23 nov = 6', () => {
  assert.equal(numeroSemana('2026-10-19'), 1);
  assert.equal(numeroSemana('2026-10-26'), 2);
  assert.equal(numeroSemana('2026-11-23'), 6);
});

test('fecha corta en español', () => {
  assert.equal(fechaCorta('2026-11-02'), '2 nov');
  assert.equal(fechaCorta('2026-10-19'), '19 oct');
});

test('pestañas de semanas: etiqueta, fecha, cuál es la actual y cuál está elegida', () => {
  const ops = opcionesSemana({ ...base, semana: '2026-10-26' });
  assert.deepEqual(ops.map((o) => o.etiqueta), ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4']);
  assert.deepEqual(ops.map((o) => o.actual), [false, false, false, true]);
  assert.deepEqual(ops.map((o) => o.seleccionada), [false, true, false, false]);
  assert.equal(ops[0].fecha, '19 oct');
});

test('estado del Salón: antes del 19 oct, semana vacía o con jugadores', () => {
  assert.equal(estadoSalon({ estado: 'antes', primer_lunes: '2026-10-19' }), 'antes');
  assert.equal(estadoSalon(base), 'vacio');
  assert.equal(estadoSalon({ ...base, top10: [fila(1)] }), 'activo');
});

test('antes del arranque dice la fecha y que las rondas ya cuentan para el récord personal', () => {
  const m = mensajeAntes({ estado: 'antes', primer_lunes: '2026-10-19' });
  assert.match(m, /arranca el lunes 19 de octubre/);
  assert.match(m, /récord personal/);
});

test('textos de semana vacía y de jugadores distinguen la semana actual de una pasada', () => {
  assert.match(textoVacio(base), /Todavía nadie suma puntos esta semana/);
  assert.match(textoVacio({ ...base, semana: '2026-10-26' }), /Nadie sumó puntos en esa semana/);
  assert.equal(textoJugadores({ ...base, jugadores: 1 }), '1 jugador suma puntos esta semana');
  assert.equal(textoJugadores({ ...base, jugadores: 13 }), '13 jugadores suman puntos esta semana');
  assert.equal(textoJugadores({ ...base, semana: '2026-10-26', jugadores: 8 }), '8 jugadores sumaron puntos esa semana');
});

test('medallas solo para los tres primeros lugares', () => {
  const filas = filasTop10([fila(1), fila(2), fila(3), fila(4), fila(10)]);
  assert.deepEqual(filas.map((f) => f.medalla), ['oro', 'plata', 'bronce', null, null]);
  assert.deepEqual(filasTop10(undefined), []);
});

test('mi lugar: en el Top 10, fuera de él o sin puntos', () => {
  assert.deepEqual(mensajeMiLugar({ ...base, top10: [fila(1), fila(2, { es_tuyo: true })] }), { tono: 'top', texto: '¡Estás en el Top 10! Lugar 2.' });
  assert.deepEqual(
    mensajeMiLugar({ ...base, top10: [fila(1)], mi_posicion: { posicion: 13, puntaje: 1250 } }),
    { tono: 'fuera', texto: 'Estás en el lugar 13 de 13 con 1,250 puntos.' },
  );
  assert.equal(mensajeMiLugar({ ...base, top10: [fila(1)] }).tono, 'sin');
});

test('ganadores: de la semana más reciente a la más antigua, con su número de semana', () => {
  const g = listaGanadores([
    { semana: '2026-10-19', nombre: 'A', puntaje: 100, matricula_oculta: '••••1', es_tuyo: false },
    { semana: '2026-11-02', nombre: 'C', puntaje: 300, matricula_oculta: '••••3', es_tuyo: true },
    { semana: '2026-10-26', nombre: 'B', puntaje: 200, matricula_oculta: '••••2', es_tuyo: false },
  ]);
  assert.deepEqual(g.map((x) => x.numero), [3, 2, 1]);
  assert.equal(g[0].titulo, 'Semana 3 · 2 nov');
  assert.deepEqual(listaGanadores(undefined), []);
});
