import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validarMatricula,
  validarNombre,
  normalizarMatricula,
  formatearNombre,
  saludo,
  primerNombre,
  enmascararMatricula,
  esGenero,
} from '../src/utils/validacion.js';

test('matrícula: formatos válidos', () => {
  for (const m of ['26000123', 'a0123456x', '1234567', '1234567890', '0123456xy']) {
    assert.equal(validarMatricula(m).ok, true, m);
  }
});

test('matrícula: se guarda en minúsculas y sin espacios', () => {
  assert.deepEqual(validarMatricula('  A0123456X '), { ok: true, valor: 'a0123456x' });
  assert.equal(normalizarMatricula('26 000 123'), '26000123');
});

test('matrícula: formatos inválidos', () => {
  const casos = {
    '': 'Escribe',
    '123456': '7 a 10', // muy corta
    '12345678901': '7 a 10', // muy larga
    abcdefgh: 'formato', // sin números
    ab12cd34: 'formato', // letras en medio
    á1234567: 'sin acentos', // acento
    '1234-567': 'sin símbolos',
  };
  for (const [valor, pista] of Object.entries(casos)) {
    const r = validarMatricula(valor);
    assert.equal(r.ok, false, `"${valor}" debería rechazarse`);
    assert.match(r.error, new RegExp(pista), valor);
  }
});

test('nombre: acepta acentos, ñ, guion y apóstrofo', () => {
  for (const n of ['José Ángel Peña-Núñez', "Ana O'Connor", 'María de los Ángeles López']) {
    assert.deepEqual(validarNombre(n), { ok: true, valor: n });
  }
});

test('nombre: limpia espacios y arregla todo-minúsculas o todo-mayúsculas', () => {
  assert.equal(validarNombre('  valeria   torres ').valor, 'Valeria Torres');
  assert.equal(validarNombre('JUAN PÉREZ').valor, 'Juan Pérez');
  assert.equal(validarNombre('maria de los angeles lopez').valor, 'Maria de los Angeles Lopez');
  assert.equal(formatearNombre("o'connor ana"), "O'Connor Ana");
  assert.equal(formatearNombre('peña-núñez luis'), 'Peña-Núñez Luis');
});

test('nombre: rechaza lo que no es nombre y apellido', () => {
  for (const n of ['', '   ', 'Ana', 'Ana R2', '<b>Ana</b> Ruiz', 'A'.repeat(61) + ' B', '1234 5678']) {
    assert.equal(validarNombre(n).ok, false, `"${n}" debería rechazarse`);
  }
});

test('textos del avatar y la matrícula oculta', () => {
  assert.equal(saludo('femenino'), 'Bienvenida');
  assert.equal(saludo('masculino'), 'Bienvenido');
  assert.equal(primerNombre('  Valeria  Torres'), 'Valeria');
  assert.equal(enmascararMatricula('26004521'), '••••4521');
  assert.equal(esGenero('femenino') && esGenero('masculino'), true);
  assert.equal(esGenero('otro'), false);
});
