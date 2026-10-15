import test from 'node:test';
import assert from 'node:assert/strict';
import {
  claseReloj, formatoCalificacion, formatoPuntos, formatoSegundos, fraccionRestante, mensajeRecord, mensajeSalon,
  nombreInsignia, opcionDeTecla, porcentaje, segundosRestantes, tituloResultado,
} from '../src/ui/ronda/modelo.js';

test('el reloj cuenta 42 s hacia atrás y se pone rojo en los últimos 10', () => {
  assert.equal(segundosRestantes(0, 0), 42);
  assert.equal(segundosRestantes(0, 100), 42, 'con 41.9 s de sobra se ve 42');
  assert.equal(segundosRestantes(0, 1000), 41);
  assert.equal(segundosRestantes(0, 41999), 1);
  assert.equal(segundosRestantes(0, 42000), 0);
  assert.equal(segundosRestantes(0, 99000), 0, 'nunca negativo');
  assert.equal(claseReloj(42), 'normal');
  assert.equal(claseReloj(11), 'normal');
  assert.equal(claseReloj(10), 'urgente');
  assert.equal(claseReloj(0), 'urgente');
});

test('la barra del reloj va de 1 a 0', () => {
  assert.equal(fraccionRestante(0, 0), 1);
  assert.equal(fraccionRestante(0, 21000), 0.5);
  assert.equal(fraccionRestante(0, 60000), 0);
});

test('teclas A–D y 1–4 contestan; el resto no', () => {
  assert.deepEqual(['a', 'B', 'c', 'D', '1', '2', '3', '4'].map(opcionDeTecla), [0, 1, 2, 3, 0, 1, 2, 3]);
  for (const t of ['e', '5', '0', 'Enter', ' ', 'Shift', undefined, null]) assert.equal(opcionDeTecla(t), null, String(t));
});

test('formatos de números', () => {
  assert.equal(formatoPuntos(3420), '3,420');
  assert.equal(formatoPuntos(undefined), '0');
  assert.equal(formatoSegundos(12400), '12.4 s');
  assert.equal(formatoSegundos(null), '—');
  assert.equal(formatoCalificacion(8.4), '8.4');
  assert.equal(formatoCalificacion(10), '10');
  assert.equal(formatoCalificacion(8), '8.0');
  assert.equal(porcentaje(11, 12), 92);
  assert.equal(porcentaje(0, 0), 0);
});

test('título del resultado según los aciertos', () => {
  assert.equal(tituloResultado(25, 25), '¡Ronda perfecta!');
  assert.equal(tituloResultado(22, 25), '¡Excelente!');
  assert.equal(tituloResultado(19, 25), 'Muy bien');
  assert.equal(tituloResultado(16, 25), 'Vas bien');
  assert.equal(tituloResultado(8, 25), 'A repasar un poco');
});

test('comparación con el récord del aula', () => {
  assert.deepEqual(mensajeRecord({ es_nuevo: true, diferencia: 640, anterior: 2800 }), { tono: 'nuevo', texto: '¡Nuevo récord del aula! +640 puntos' });
  assert.equal(mensajeRecord({ es_nuevo: true, diferencia: 2500, anterior: 0 }).texto, '¡Primer récord del aula!');
  assert.equal(mensajeRecord({ es_nuevo: false, diferencia: 0, anterior: 2800 }).tono, 'igual');
  assert.deepEqual(mensajeRecord({ es_nuevo: false, diferencia: -1520, anterior: 4000 }), { tono: 'menor', texto: 'Te faltaron 1,520 puntos para tu récord.' });
});

test('mensaje del Salón: semana 0, semana 1 a 6 y después del curso', () => {
  assert.match(mensajeSalon({ cuenta: true, semana: '2026-10-19' }), /suma a tu puntaje semanal/);
  assert.match(mensajeSalon({ cuenta: false, semana: '2026-10-12' }), /arranca el lunes 19 de octubre/);
  assert.match(mensajeSalon({ cuenta: false, semana: '2026-11-30' }), /ya terminó/);
});

test('nombres de insignias: del catálogo, o el id si no se conoce', () => {
  assert.equal(nombreInsignia('primer-dia'), 'Primer día de clases');
  assert.equal(nombreInsignia('listo-departamental'), 'Listo para el departamental');
  assert.equal(nombreInsignia('futura'), 'futura');
});
