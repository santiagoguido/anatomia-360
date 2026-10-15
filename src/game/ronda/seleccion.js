// Armado de una ronda: qué 25 preguntas salen y en qué orden. Puro: el azar entra por parámetro.
import { ErrorRonda } from './errores.js';
import { ESTADOS_SERVIBLES, IMAGEN_LISTA, RONDA } from './reglas.js';

/** Fisher-Yates. No modifica el arreglo original. */
export function mezclar(lista, azar = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** ¿Se puede servir esta pregunta? Aprobada (o borrador si hay modo pruebas) y, si lleva imagen, con la imagen lista. */
export function esServible(pregunta, { permitirBorrador = false } = {}) {
  const estados = permitirBorrador ? [...ESTADOS_SERVIBLES, 'borrador'] : ESTADOS_SERVIBLES;
  if (!estados.includes(pregunta.estado)) return false;
  if (pregunta.patron === 'P13' || pregunta.imagen) return pregunta.imagen?.estado === IMAGEN_LISTA;
  return true;
}

/** 0 = no vista, 1 = fallada, 2 = ya acertada. */
export function claseDePregunta(id, vistas, falladas) {
  if (!vistas.has(id)) return 0;
  return falladas.has(id) ? 1 : 2;
}

const porClase = (preguntas, vistas, falladas, azar) => {
  const grupos = [[], [], []];
  for (const p of preguntas) grupos[claseDePregunta(p.id, vistas, falladas)].push(p);
  return grupos.map((g) => mezclar(g, azar));
};

/**
 * Elige las preguntas de una ronda.
 *  - 12 de un tema y 13 del otro (al azar cuál).
 *  - Dentro de cada tema, primero las no vistas, luego las falladas y al final las ya acertadas.
 *  - Se presentan en ese mismo orden (no vistas → falladas → acertadas), revueltos los temas dentro de cada grupo.
 *  - A cada pregunta se le mezcla el orden de A–D: `orden[i]` es la opción original que se muestra en la posición i.
 * Devuelve [{ id, orden }]. Lanza `banco_insuficiente` si un tema no tiene preguntas servibles suficientes.
 */
export function armarRonda({ banco, vistas = [], falladas = [], azar = Math.random, permitirBorrador = false }) {
  const setVistas = new Set(vistas);
  const setFalladas = new Set(falladas);
  const temas = banco.temas.map((t) => t.id);
  const cuotas = mezclar(RONDA.porTema, azar);
  const elegidas = [];

  temas.forEach((tema, i) => {
    const servibles = banco.preguntas.filter((p) => p.tema === tema && esServible(p, { permitirBorrador }));
    if (servibles.length < cuotas[i]) throw new ErrorRonda('banco_insuficiente', 503, { tema, servibles: servibles.length });
    const grupos = porClase(servibles, setVistas, setFalladas, azar);
    elegidas.push(...grupos.flat().slice(0, cuotas[i]));
  });

  const ordenadas = porClase(elegidas, setVistas, setFalladas, azar).flat();
  return ordenadas.map((p) => ({ id: p.id, orden: mezclar(Array.from({ length: RONDA.opciones }, (_, k) => k), azar) }));
}
