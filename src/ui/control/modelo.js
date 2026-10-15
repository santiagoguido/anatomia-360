// Datos de Control Escolar (el expediente de UN alumno). Sin DOM: se prueba con Node (tests/controlModelo.test.js).
import { TEMAS_AULA } from '../../config.js';
import { CONTROL as T } from '../../textos.js';
import { INSIGNIAS } from '../../game/ronda/insignias.js';
import { RONDA } from '../../game/ronda/reglas.js';
import { calificacion } from '../../game/ronda/puntuacion.js';

export const AULAS = [1, 2, 3, 4, 5, 6];

/** Mínimo de respuestas en un tema para recomendar repasarlo (con menos, el porcentaje no dice mucho). */
export const MINIMO_PARA_REPASAR = 5;
export const MAXIMO_A_REPASAR = 3;

export const porcentaje = (aciertos, total) => (total ? Math.round((aciertos / total) * 100) : null);

/** 'fuerte' (80% o más), 'regular' (60–79), 'repasar' (menos de 60) o 'sin-datos'. */
export function nivel(aciertos, total) {
  const p = porcentaje(aciertos, total);
  if (p === null) return 'sin-datos';
  if (p >= 80) return 'fuerte';
  if (p >= 60) return 'regular';
  return 'repasar';
}

/** Los 12 temas (2 por aula) con sus aciertos; los que aún no tienen respuestas salen en 0 de 0. */
export function temasConResultados(porTema = []) {
  return AULAS.flatMap((aula) =>
    TEMAS_AULA[aula].map((t) => {
      const fila = porTema.find((x) => x.aula === aula && x.tema === t.id);
      const aciertos = fila?.aciertos ?? 0;
      const total = fila?.total ?? 0;
      return { aula, id: t.id, nombre: t.nombre, aciertos, total, porcentaje: porcentaje(aciertos, total), nivel: nivel(aciertos, total) };
    }),
  );
}

/** Los temas que más conviene repasar: con suficientes respuestas, por debajo de 80%, del más flojo al más fuerte. */
export function temasParaRepasar(temas) {
  return temas
    .filter((t) => t.total >= MINIMO_PARA_REPASAR && t.porcentaje < 80)
    .sort((a, b) => a.porcentaje - b.porcentaje || b.total - a.total)
    .slice(0, MAXIMO_A_REPASAR);
}

/** Resumen general: rondas, preguntas contestadas y porcentaje de aciertos. */
export function resumenGeneral(datos) {
  const porTema = datos.por_tema ?? [];
  const total = porTema.reduce((n, t) => n + t.total, 0);
  const aciertos = porTema.reduce((n, t) => n + t.aciertos, 0);
  return { rondas: datos.rondas ?? 0, total, aciertos, porcentaje: porcentaje(aciertos, total) };
}

/** Una tarjeta por aula (1 a 6), jugada o no, con la mejor calificación en escala de 10. */
export function tarjetasAula(porAula = []) {
  return AULAS.map((aula) => {
    const p = porAula.find((x) => x.aula === aula);
    if (!p || p.rondas_jugadas === 0) return { aula, jugada: false };
    return {
      aula,
      jugada: true,
      record: p.record,
      ultimo: p.ultimo_puntaje,
      rondas: p.rondas_jugadas,
      mejorCalificacion: calificacion(p.mejores_aciertos, RONDA.preguntas),
    };
  });
}

/** El catálogo de insignias con cuáles ya ganó el alumno. Primero las ganadas. */
export function insigniasConEstado(ganadas = []) {
  const tiene = new Set(ganadas);
  const lista = Object.entries(INSIGNIAS).map(([id, i], orden) => ({ id, orden, nombre: i.nombre, descripcion: i.descripcion, ganada: tiene.has(id) }));
  return lista.sort((a, b) => Number(b.ganada) - Number(a.ganada) || a.orden - b.orden);
}

export const textoInsignias = (lista) => T.insigniasGanadas(lista.filter((i) => i.ganada).length, lista.length);
