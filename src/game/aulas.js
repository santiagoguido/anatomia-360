// Estado de las aulas (abierta / bloqueada), cuenta regresiva y fechas. Sin DOM ni Phaser.
// La hora que manda es la del SERVIDOR (`estado_aulas()` en Supabase), no la del teléfono:
// si el reloj del alumno está mal, no se abre nada antes de tiempo.
import { CALENDARIO_AULAS, INICIO_CURSO, SEMANAS_CURSO, ZONA_HORARIA } from '../config.js';

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIA_INGLES = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const DIA_MS = 86400000;

// Se formatea en inglés y se traduce aquí: así no depende de cómo escriba el navegador los nombres en español.
const formato = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
});

/** Año, mes, día y día de la semana (0 = lunes) de un momento, en hora de la Ciudad de México. */
export function fechaCdmx(ms) {
  const partes = Object.fromEntries(formato.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  const anio = Number(partes.year);
  const mes = Number(partes.month);
  const dia = Number(partes.day);
  return { anio, mes, dia, diaSemana: DIA_INGLES[partes.weekday], serial: Date.UTC(anio, mes - 1, dia) / DIA_MS };
}

function aulaDeFila(fila, ahoraMs) {
  return {
    numero: Number(fila.numero),
    titulo: fila.titulo,
    temas: [...(fila.temas ?? [])],
    abreEnMs: Date.parse(fila.abre_en),
    // Segundos que faltaban según el servidor en el momento `recibidoEn` (null = se calcula con el reloj local).
    segundosAlRecibir: Number.isFinite(fila.segundos_para_abrir) ? fila.segundos_para_abrir : null,
    abiertaAlRecibir: typeof fila.abierta === 'boolean' ? fila.abierta : null,
    recibidoEn: ahoraMs,
  };
}

/** Respuesta de `estado_aulas()` → aulas listas para el campus. */
export function normalizarAulas(filas, ahoraMs = Date.now()) {
  return (filas ?? []).map((f) => aulaDeFila(f, ahoraMs)).sort((a, b) => a.numero - b.numero);
}

/** Respaldo con las fechas de `config.js` cuando no hay conexión con Supabase. */
export function aulasDesdeCalendario(ahoraMs = Date.now()) {
  return normalizarAulas(CALENDARIO_AULAS, ahoraMs);
}

/** Segundos que faltan para que abra el aula (0 si ya abrió). Avanza solo, sin volver a preguntar al servidor. */
export function segundosParaAbrir(aula, ahoraMs = Date.now()) {
  if (aula.segundosAlRecibir !== null) {
    const pasados = (ahoraMs - aula.recibidoEn) / 1000;
    return Math.max(0, Math.ceil(aula.segundosAlRecibir - pasados));
  }
  return Math.max(0, Math.ceil((aula.abreEnMs - ahoraMs) / 1000));
}

export function estaAbierta(aula, ahoraMs = Date.now()) {
  if (aula.abiertaAlRecibir === true) return true;
  return segundosParaAbrir(aula, ahoraMs) === 0;
}

const dos = (n) => String(n).padStart(2, '0');

/** "6 días", "1 día" o, en el último día, "05:12:09". */
export function textoCuentaRegresiva(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const dias = Math.floor(s / 86400);
  if (dias >= 1) return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  return `${dos(Math.floor(s / 3600))}:${dos(Math.floor((s % 3600) / 60))}:${dos(s % 60)}`;
}

/**
 * Lo que se le muestra al alumno de un aula bloqueada: "6 días" (días de calendario en CDMX,
 * como se cuenta en la vida diaria) y, en las últimas 24 horas, "05:12:09".
 */
export function textoFaltante(aula, ahoraMs = Date.now()) {
  const segundos = segundosParaAbrir(aula, ahoraMs);
  if (segundos < 86400) return textoCuentaRegresiva(segundos);
  const dias = fechaCdmx(aula.abreEnMs).serial - fechaCdmx(ahoraMs).serial;
  return textoCuentaRegresiva(Math.max(1, dias) * 86400);
}

/** "lunes 2 de noviembre" (en hora de la Ciudad de México). */
export function textoFechaApertura(ms) {
  const f = fechaCdmx(ms);
  return `${DIAS[f.diaSemana]} ${f.dia} de ${MESES[f.mes - 1]}`;
}

/** Semana del curso (1 a 6) y la fecha de su lunes. Antes del inicio cuenta como semana 1; después del final, como la última. */
export function semanaDelCurso(ahoraMs = Date.now()) {
  const hoy = fechaCdmx(ahoraMs);
  const inicio = fechaCdmx(Date.parse(INICIO_CURSO));
  const lunesHoy = hoy.serial - hoy.diaSemana;
  const bruta = Math.floor((lunesHoy - inicio.serial) / 7) + 1;
  const numero = Math.min(Math.max(bruta, 1), SEMANAS_CURSO);
  const lunes = new Date((inicio.serial + (numero - 1) * 7) * DIA_MS);
  return { numero, lunesDia: lunes.getUTCDate(), lunesMes: lunes.getUTCMonth() };
}

/** "Lun 26 oct · Semana 2" para la barra superior. */
export function etiquetaSemana(ahoraMs = Date.now()) {
  const { numero, lunesDia, lunesMes } = semanaDelCurso(ahoraMs);
  return `Lun ${lunesDia} ${MESES[lunesMes].slice(0, 3)} · Semana ${numero}`;
}

/** Cuántas aulas están abiertas (para la Clínica y el texto de las semanas). */
export function aulasAbiertas(aulas, ahoraMs = Date.now()) {
  return aulas.filter((a) => estaAbierta(a, ahoraMs)).sort((a, b) => a.numero - b.numero);
}
