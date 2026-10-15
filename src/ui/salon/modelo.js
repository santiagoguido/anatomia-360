// Datos y textos del Salón de la Fama. Sin DOM: se prueba con Node (tests/salonModelo.test.js).
import { SALON as T } from '../../textos.js';
import { SALON } from '../../game/ronda/reglas.js';
import { diasEntre } from '../../game/ronda/dias.js';
import { textoFechaApertura } from '../../game/aulas.js';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Número de semana del curso (1 a 6) de un lunes 'AAAA-MM-DD'. */
export const numeroSemana = (lunes) => Math.round(diasEntre(SALON.primerLunes, lunes) / 7) + 1;

/** "2 nov" a partir de 'AAAA-MM-DD'. */
export function fechaCorta(iso) {
  const [, mes, dia] = iso.split('-').map(Number);
  return `${dia} ${MESES[mes - 1]}`;
}

/** Pestañas de semanas: [{ lunes, numero, etiqueta, actual, seleccionada }]. */
export function opcionesSemana(datos) {
  return (datos.semanas ?? []).map((lunes) => ({
    lunes,
    numero: numeroSemana(lunes),
    etiqueta: T.semana(numeroSemana(lunes)),
    fecha: fechaCorta(lunes),
    actual: lunes === datos.semana_actual,
    seleccionada: lunes === datos.semana,
  }));
}

/** 'antes' (aún no arranca), 'vacio' (semana sin puntos) o 'activo'. */
export function estadoSalon(datos) {
  if (datos.estado === 'antes') return 'antes';
  return (datos.top10 ?? []).length === 0 ? 'vacio' : 'activo';
}

/** Mensaje de antes del lunes 19 oct. */
export const mensajeAntes = (datos) =>
  T.antes(textoFechaApertura(Date.parse(`${datos.primer_lunes ?? SALON.primerLunes}T06:00:00Z`)));

export const textoVacio = (datos) => (datos.semana === datos.semana_actual ? T.vacio : T.vacioPasada);

export const textoJugadores = (datos) =>
  datos.semana === datos.semana_actual ? T.jugadores(datos.jugadores) : T.jugadoresPasada(datos.jugadores);

/** Filas del Top 10 con la medalla de los tres primeros (se distingue por texto además de por color). */
export function filasTop10(top10) {
  const medallas = { 1: 'oro', 2: 'plata', 3: 'bronce' };
  return (top10 ?? []).map((f) => ({ ...f, medalla: medallas[f.posicion] ?? null }));
}

/** Qué decirle al jugador sobre su lugar en la semana que está viendo. */
export function mensajeMiLugar(datos) {
  const enTop = (datos.top10 ?? []).find((f) => f.es_tuyo);
  if (enTop) return { tono: 'top', texto: T.miLugarTop(enTop.posicion) };
  const mi = datos.mi_posicion;
  if (mi) return { tono: 'fuera', texto: T.miLugar(mi.posicion, datos.jugadores, mi.puntaje.toLocaleString('en-US')) };
  return { tono: 'sin', texto: T.sinPuntos };
}

/** Ganadores de semanas terminadas, de la más reciente a la más antigua. */
export function listaGanadores(ganadores) {
  return [...(ganadores ?? [])]
    .sort((a, b) => (a.semana < b.semana ? 1 : -1))
    .map((g) => ({ ...g, numero: numeroSemana(g.semana), titulo: T.ganador(numeroSemana(g.semana), fechaCorta(g.semana)) }));
}
