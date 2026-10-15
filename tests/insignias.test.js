import test from 'node:test';
import assert from 'node:assert/strict';
import { INSIGNIAS, evaluarInsignias } from '../src/game/ronda/insignias.js';

const ronda = (extra = {}) => ({ aciertos: 15, total: 25, puntaje: 2000, rachaMax: 4, tiempoPromedioMs: 20000, recordAnterior: 0, ...extra });
const gana = (datos) => evaluarInsignias({ ronda: ronda(datos.ronda), mejoresAciertos: datos.mejores ?? {}, rachaDias: datos.dias ?? 1, yaGanadas: datos.ya ?? [] });

test('la primera ronda terminada da "Primer día de clases"', () => {
  assert.deepEqual(gana({}), ['primer-dia']);
  assert.deepEqual(gana({ ya: ['primer-dia'] }), [], 'no se repite');
});

test('Ronda perfecta: 25 de 25', () => {
  assert.ok(gana({ ronda: { aciertos: 25 } }).includes('ronda-perfecta'));
  assert.ok(!gana({ ronda: { aciertos: 24 } }).includes('ronda-perfecta'));
});

test('Rayo: 20+ aciertos con promedio menor a 15 s', () => {
  assert.ok(gana({ ronda: { aciertos: 20, tiempoPromedioMs: 14999 } }).includes('rayo'));
  assert.ok(!gana({ ronda: { aciertos: 20, tiempoPromedioMs: 15000 } }).includes('rayo'));
  assert.ok(!gana({ ronda: { aciertos: 19, tiempoPromedioMs: 5000 } }).includes('rayo'));
  assert.ok(!gana({ ronda: { aciertos: 25, tiempoPromedioMs: null } }).includes('rayo'));
});

test('Racha de 10 y de 25 (aciertos seguidos en una ronda)', () => {
  assert.ok(!gana({ ronda: { rachaMax: 9 } }).includes('racha-10'));
  assert.ok(gana({ ronda: { rachaMax: 10 } }).includes('racha-10'));
  assert.ok(!gana({ ronda: { rachaMax: 24 } }).includes('racha-25'));
  const perfecta = gana({ ronda: { rachaMax: 25, aciertos: 25 } });
  assert.ok(perfecta.includes('racha-10') && perfecta.includes('racha-25'));
});

test('Constancia: 3 días seguidos; de oro con 7', () => {
  assert.ok(!gana({ dias: 2 }).includes('constancia'));
  assert.ok(gana({ dias: 3 }).includes('constancia'));
  assert.ok(!gana({ dias: 6 }).includes('constancia-oro'));
  const siete = gana({ dias: 7, ya: ['constancia'] });
  assert.ok(siete.includes('constancia-oro') && !siete.includes('constancia'));
});

test('Dominio del cuello: 22+ en las Aulas 1 y 2', () => {
  assert.ok(gana({ mejores: { 1: 22, 2: 23 } }).includes('dominio-cuello'));
  assert.ok(!gana({ mejores: { 1: 22, 2: 21 } }).includes('dominio-cuello'));
  assert.ok(!gana({ mejores: { 1: 25 } }).includes('dominio-cuello'), 'sin Aula 2 no se gana');
});

test('Señor de los plexos: 22+ en las Aulas 3 y 5', () => {
  assert.ok(gana({ mejores: { 3: 22, 5: 22 } }).includes('senor-plexos'));
  assert.ok(!gana({ mejores: { 3: 22, 4: 25 } }).includes('senor-plexos'));
});

test('Vascular: 22+ en las Aulas 2, 4 y 6', () => {
  assert.ok(gana({ mejores: { 2: 22, 4: 22, 6: 22 } }).includes('vascular'));
  assert.ok(!gana({ mejores: { 2: 22, 4: 22 } }).includes('vascular'));
});

test('Remontada: subir el récord de un aula 1,000 puntos o más (con un récord previo)', () => {
  assert.ok(gana({ ronda: { puntaje: 3000, recordAnterior: 2000 } }).includes('remontada'));
  assert.ok(!gana({ ronda: { puntaje: 2999, recordAnterior: 2000 } }).includes('remontada'));
  assert.ok(!gana({ ronda: { puntaje: 3500, recordAnterior: 0 } }).includes('remontada'), 'la primera ronda de un aula no es una remontada');
});

test('Listo para el departamental: 20+ en las 6 aulas', () => {
  const seis = { 1: 20, 2: 21, 3: 22, 4: 20, 5: 25, 6: 20 };
  assert.ok(gana({ mejores: seis }).includes('listo-departamental'));
  assert.ok(!gana({ mejores: { ...seis, 6: 19 } }).includes('listo-departamental'));
  assert.ok(!gana({ mejores: { 1: 25, 2: 25, 3: 25, 4: 25, 5: 25 } }).includes('listo-departamental'), 'con un aula cerrada (sin rondas) no se puede ganar');
});

test('las insignias que dependen de aulas aún cerradas no se ganan sin rondas en ellas', () => {
  // Es mediados de octubre: solo hay rondas del Aula 1, aunque saque 25 de 25.
  const nuevas = gana({ ronda: { aciertos: 25, rachaMax: 25 }, mejores: { 1: 25 } });
  for (const id of ['dominio-cuello', 'senor-plexos', 'vascular', 'listo-departamental']) assert.ok(!nuevas.includes(id), id);
});

test('todas las insignias del catálogo tienen nombre y descripción', () => {
  assert.equal(Object.keys(INSIGNIAS).length, 12);
  for (const [id, i] of Object.entries(INSIGNIAS)) assert.ok(i.nombre && i.descripcion, id);
});
