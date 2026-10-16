// Armado de una guardia: qué 5 casos salen. Puro: el azar entra por parámetro.
import { ErrorRonda } from '../ronda/errores.js';
import { mezclar } from '../ronda/seleccion.js';
import { CLINICA, ESTADOS_CASO_SERVIBLES } from './reglas.js';

/**
 * Aulas que necesita un caso, según los temas que usa. `aulaDeTema`: Map tema → número de aula.
 * Un tema desconocido devuelve null (el caso no se sirve: es un error de contenido que `npm test` detecta).
 */
export function aulasDeCaso(caso, aulaDeTema) {
  const aulas = new Set();
  for (const tema of caso.temas) {
    const aula = aulaDeTema.get(tema);
    if (!aula) return null;
    aulas.add(aula);
  }
  return [...aulas].sort((a, b) => a - b);
}

/** Map tema → aula a partir de los bancos { 1: { temas: [{ id }] }, ... }. */
export function mapaTemas(bancos) {
  const mapa = new Map();
  for (const [aula, banco] of Object.entries(bancos)) for (const t of banco.temas) mapa.set(t.id, Number(aula));
  return mapa;
}

/** ¿Se puede servir este caso? Aprobado (o borrador si hay modo pruebas) y con todas sus aulas abiertas. */
export function esServibleCaso(caso, { aulasAbiertas, aulaDeTema, permitirBorrador = false }) {
  const estados = permitirBorrador ? [...ESTADOS_CASO_SERVIBLES, 'borrador'] : ESTADOS_CASO_SERVIBLES;
  if (!estados.includes(caso.estado)) return false;
  const aulas = aulasDeCaso(caso, aulaDeTema);
  if (!aulas) return false;
  return aulas.every((a) => aulasAbiertas.has(a));
}

/**
 * Elige los casos de una guardia: primero los que el alumno no ha resuelto (archivados como expediente), luego los ya
 * resueltos; al azar dentro de cada grupo. A cada paso se le mezcla el orden de A–D: `ordenes[p][i]` es la opción original
 * que se muestra en la posición i del paso p. Lanza `casos_insuficientes` si no hay suficientes casos servibles.
 */
export function armarGuardia({ casos, archivados = [], aulasAbiertas, aulaDeTema, azar = Math.random, permitirBorrador = false }) {
  const servibles = casos.filter((c) => esServibleCaso(c, { aulasAbiertas, aulaDeTema, permitirBorrador }));
  if (servibles.length < CLINICA.casosPorGuardia) {
    throw new ErrorRonda('casos_insuficientes', 503, { servibles: servibles.length });
  }
  const resueltos = new Set(archivados);
  const nuevos = mezclar(servibles.filter((c) => !resueltos.has(c.id)), azar);
  const repetidos = mezclar(servibles.filter((c) => resueltos.has(c.id)), azar);
  return [...nuevos, ...repetidos].slice(0, CLINICA.casosPorGuardia).map((c) => ({
    id: c.id,
    ordenes: c.pasos.map(() => mezclar(Array.from({ length: CLINICA.opciones }, (_, k) => k), azar)),
  }));
}
