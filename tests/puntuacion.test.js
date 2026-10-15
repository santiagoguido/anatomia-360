import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bonoRacha, bonoVelocidad, calificacion, desempenoPorTema, puntajeMaximoTeorico, puntuarRespuesta, resumirRonda,
} from '../src/game/ronda/puntuacion.js';
import { PUNTOS, RONDA } from '../src/game/ronda/reglas.js';

test('correcta suma 100 + velocidad + racha; incorrecta o sin contestar 0 y reinicia la racha', () => {
  const ok = puntuarRespuesta({ acierto: true, tiempoMs: 21000, rachaAnterior: 0 });
  assert.deepEqual(ok, { puntos: 100 + 25 + 10, racha: 1, base: 100, bonoVelocidad: 25, bonoRacha: 10 });
  const mal = puntuarRespuesta({ acierto: false, tiempoMs: 1000, rachaAnterior: 7 });
  assert.deepEqual(mal, { puntos: 0, racha: 0, base: 0, bonoVelocidad: 0, bonoRacha: 0 });
});

test('bono de velocidad: proporcional al tiempo que sobró (0 a 50)', () => {
  assert.equal(bonoVelocidad(0), 50);
  assert.equal(bonoVelocidad(21000), 25);
  assert.equal(bonoVelocidad(42000), 0);
  assert.equal(bonoVelocidad(60000), 0, 'más tiempo del límite no da negativos');
  assert.equal(bonoVelocidad(-500), 50, 'tiempos negativos se tratan como 0');
  assert.ok(bonoVelocidad(10000) > bonoVelocidad(30000));
});

test('bono de racha: +10 por acierto seguido, tope +50', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 25].map(bonoRacha), [10, 20, 30, 40, 50, 50, 50]);
});

test('la racha crece con cada acierto y se reinicia con un fallo', () => {
  let racha = 0;
  const salida = [];
  for (const acierto of [true, true, true, false, true]) {
    ({ racha } = puntuarRespuesta({ acierto, tiempoMs: 42000, rachaAnterior: racha }));
    salida.push(racha);
  }
  assert.deepEqual(salida, [1, 2, 3, 0, 1]);
});

test('el máximo teórico de una ronda es 4,900 (no 5,000) y cabe en el check de la base', () => {
  assert.equal(puntajeMaximoTeorico(), 4900);
  assert.ok(puntajeMaximoTeorico() <= 5000);
  // 25 × (100 + 50) + bonos de racha (10+20+30+40+50 + 20 × 50)
  assert.equal(25 * (PUNTOS.correcta + PUNTOS.bonoVelocidadMax) + 150 + 20 * 50, 4900);
});

test('ninguna combinación posible supera el máximo teórico', () => {
  const azar = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let ronda = 0; ronda < 500; ronda++) {
    let racha = 0;
    let total = 0;
    for (let i = 0; i < RONDA.preguntas; i++) {
      const r = puntuarRespuesta({ acierto: azar() < 0.9, tiempoMs: azar() * RONDA.tiempoMs, rachaAnterior: racha });
      racha = r.racha;
      total += r.puntos;
    }
    assert.ok(total <= puntajeMaximoTeorico());
  }
});

test('calificación: aciertos de 25 en escala de 10 con un decimal', () => {
  assert.equal(calificacion(25), 10);
  assert.equal(calificacion(21), 8.4);
  assert.equal(calificacion(0), 0);
  assert.equal(calificacion(13), 5.2);
});

test('resumirRonda: aciertos, puntos, racha máxima y tiempo promedio de las contestadas', () => {
  const r = (acierto, contestada, ms, puntos, racha, tema = 't1') => ({ acierto, contestada, ms, puntos, racha, tema });
  const respuestas = [r(true, true, 4000, 150, 1), r(true, true, 8000, 160, 2), r(false, true, 12000, 0, 0), r(false, false, 42000, 0, 0)];
  const s = resumirRonda(respuestas, 4);
  assert.equal(s.aciertos, 2);
  assert.equal(s.puntaje, 310);
  assert.equal(s.rachaMax, 2);
  assert.equal(s.tiempoPromedioMs, 8000, 'la sin contestar no cuenta en el promedio');
  assert.equal(s.calificacion, 5);
});

test('resumirRonda: sin ninguna contestada el promedio es null', () => {
  const s = resumirRonda([{ acierto: false, contestada: false, ms: 42000, puntos: 0, racha: 0, tema: 'a' }], 1);
  assert.equal(s.tiempoPromedioMs, null);
});

test('desempeño por tema respeta el orden de los temas', () => {
  const temas = [{ id: 'a', nombre: 'Tema A' }, { id: 'b', nombre: 'Tema B' }];
  const rs = [{ tema: 'b', acierto: true }, { tema: 'a', acierto: false }, { tema: 'b', acierto: false }];
  assert.deepEqual(desempenoPorTema(rs, temas), [
    { id: 'a', nombre: 'Tema A', aciertos: 0, total: 1 },
    { id: 'b', nombre: 'Tema B', aciertos: 1, total: 2 },
  ]);
});
