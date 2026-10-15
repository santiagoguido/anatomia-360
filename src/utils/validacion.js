import { MATRICULA, NOMBRE, GENEROS } from '../config.js';

const LETRAS = 'A-Za-zÀ-ÖØ-öø-ÿ';
const RE_NOMBRE = new RegExp(`^[${LETRAS}][${LETRAS}'’. -]*$`);
const RE_LETRA = new RegExp(`[${LETRAS}]`);
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos', 'di', 'van', 'von']);

/** Minúsculas y sin espacios, como se guarda en la base de datos. */
export function normalizarMatricula(valor) {
  return String(valor ?? '').toLowerCase().replace(/\s+/g, '');
}

/** @returns {{ok: true, valor: string} | {ok: false, error: string}} */
export function validarMatricula(valor) {
  const m = normalizarMatricula(valor);
  if (!m) return { ok: false, error: 'Escribe tu matrícula.' };
  if (/[^a-z0-9]/.test(m)) {
    return { ok: false, error: 'Usa solo letras (sin acentos ni ñ) y números, sin símbolos.' };
  }
  if (m.length < MATRICULA.min || m.length > MATRICULA.max) {
    return {
      ok: false,
      error: `La matrícula tiene de ${MATRICULA.min} a ${MATRICULA.max} caracteres y escribiste ${m.length}.`,
    };
  }
  if (!MATRICULA.patron.test(m)) {
    return {
      ok: false,
      error: 'Revisa el formato: números, y letras solo al inicio o al final (por ejemplo, a0123456x).',
    };
  }
  return { ok: true, valor: m };
}

export function limpiarNombre(valor) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim();
}

function capitalizar(palabra) {
  return palabra.replace(/(^|[-'’.])([a-zà-öø-ÿ])/g, (_, antes, letra) => antes + letra.toUpperCase());
}

/** Si el nombre viene todo en minúsculas o todo en mayúsculas, lo pone en formato de nombre propio. */
export function formatearNombre(nombre) {
  if (nombre !== nombre.toLowerCase() && nombre !== nombre.toUpperCase()) return nombre;
  return nombre
    .toLowerCase()
    .split(' ')
    .map((palabra, i) => (i > 0 && PARTICULAS.has(palabra) ? palabra : capitalizar(palabra)))
    .join(' ');
}

/** @returns {{ok: true, valor: string} | {ok: false, error: string}} */
export function validarNombre(valor) {
  const n = limpiarNombre(valor);
  if (!n) return { ok: false, error: 'Escribe tu nombre y apellido.' };
  if (!RE_NOMBRE.test(n)) return { ok: false, error: 'Usa solo letras, sin números ni símbolos.' };
  if (n.length > NOMBRE.max) {
    return { ok: false, error: `El nombre puede tener hasta ${NOMBRE.max} caracteres.` };
  }
  const palabras = n.split(' ').filter((p) => RE_LETRA.test(p));
  if (palabras.length < 2 || n.length < NOMBRE.min) {
    return { ok: false, error: 'Escribe tu nombre y al menos un apellido.' };
  }
  return { ok: true, valor: formatearNombre(n) };
}

export function esGenero(valor) {
  return GENEROS.includes(valor);
}

export function saludo(genero) {
  return genero === 'femenino' ? 'Bienvenida' : 'Bienvenido';
}

export function primerNombre(nombre) {
  return limpiarNombre(nombre).split(' ')[0] ?? '';
}

/** ••••4521 */
export function enmascararMatricula(matricula) {
  return '••••' + String(matricula ?? '').slice(-4);
}
