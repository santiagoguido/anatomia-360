// Datos y textos de las pantallas de la ronda. Sin DOM: se prueba con Node (tests/rondaModelo.test.js).
import { RESULTADO } from '../../textos.js';
import { textoFechaApertura } from '../../game/aulas.js';
import { INSIGNIAS } from '../../game/ronda/insignias.js';
import { RONDA, SALON } from '../../game/ronda/reglas.js';

export const LETRAS = ['A', 'B', 'C', 'D'];

/** Segundos que quedan (se redondea hacia arriba: con 0.3 s de sobra todavía se ve "1"). */
export function segundosRestantes(inicioMs, ahoraMs, limiteMs = RONDA.tiempoMs) {
  return Math.max(0, Math.ceil((limiteMs - (ahoraMs - inicioMs)) / 1000));
}

/** Parte del reloj que queda, de 0 a 1 (para la barra). */
export function fraccionRestante(inicioMs, ahoraMs, limiteMs = RONDA.tiempoMs) {
  return Math.min(1, Math.max(0, (limiteMs - (ahoraMs - inicioMs)) / limiteMs));
}

/** El reloj se pone rojo en los últimos 10 s. */
export function claseReloj(segundos) {
  return segundos <= RONDA.avisoRojoMs / 1000 ? 'urgente' : 'normal';
}

/** A–D o 1–4 → posición 0–3; cualquier otra tecla → null. */
export function opcionDeTecla(tecla) {
  const t = String(tecla ?? '').toLowerCase();
  const i = ['a', 'b', 'c', 'd'].indexOf(t);
  if (i >= 0) return i;
  const n = ['1', '2', '3', '4'].indexOf(t);
  return n >= 0 ? n : null;
}

export const formatoPuntos = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

export const formatoSegundos = (ms) => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)} s` : '—');

/** 8.4 → "8.4"; 10 → "10"; 8 → "8.0". */
export const formatoCalificacion = (c) => (c >= 10 ? '10' : Number(c).toFixed(1));

/** Título según los aciertos (25/25 = perfecta). */
export function tituloResultado(aciertos, total) {
  const T = RESULTADO.titulos;
  if (aciertos >= total) return T.perfecta;
  const f = aciertos / total;
  if (f >= 0.84) return T.excelente;
  if (f >= 0.72) return T.muyBien;
  if (f >= 0.6) return T.vasBien;
  return T.repasar;
}

/** Comparación con el récord del aula: { tono, texto }. */
export function mensajeRecord(record) {
  const R = RESULTADO.record;
  if (record.es_nuevo) return { tono: 'nuevo', texto: R.nuevo(record.diferencia, record.anterior) };
  if (record.diferencia === 0) return { tono: 'igual', texto: R.igual };
  return { tono: 'menor', texto: R.faltaron(-record.diferencia) };
}

/** Qué decirle al alumno sobre si la ronda suma al Salón de la Fama semanal. */
export function mensajeSalon(salon) {
  const S = RESULTADO.salon;
  if (salon?.cuenta) return S.cuenta;
  if (salon?.semana && salon.semana < SALON.primerLunes) {
    return S.antes(textoFechaApertura(Date.parse(`${SALON.primerLunes}T06:00:00Z`)));
  }
  return S.despues;
}

export const nombreInsignia = (id) => INSIGNIAS[id]?.nombre ?? id;

/** Porcentaje (0–100) de aciertos de un tema, para la barra. */
export const porcentaje = (aciertos, total) => (total ? Math.round((aciertos / total) * 100) : 0);
