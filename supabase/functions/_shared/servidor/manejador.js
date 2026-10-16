// ARCHIVO GENERADO por scripts/sincronizar-funcion.js. No lo edites: cambia el original y ejecuta `npm run funcion:preparar`.
// Lógica de la Edge Function `rondas`: iniciar, responder y terminar una ronda.
// Sin Deno, sin Supabase y sin DOM: todo lo externo entra por parámetros (`datos`, `bancos`, reloj, azar),
// así se prueba con Node. Este archivo se copia a supabase/functions/_shared/ (npm run funcion:preparar).
//
// Reglas de seguridad que aplica:
//  · El servidor guarda las respuestas correctas; al navegador solo le llegan enunciados y opciones.
//  · La hora de inicio y la de cada respuesta las pone el servidor.
//  · Iniciar, responder y terminar rechazan un aula cerrada según el reloj de la BASE (no el del teléfono).
//  · Una sola respuesta por pregunta, en orden. Una sola ronda activa por matrícula.
//  · Una ronda con tiempos imposibles para un humano se descarta y no guarda nada.
import { ErrorRonda } from '../game/ronda/errores.js';
import { RONDA, RONDA_EXPIRA_MS } from '../game/ronda/reglas.js';
import { actualizarRachaDias } from '../game/ronda/dias.js';
import { evaluarInsignias } from '../game/ronda/insignias.js';
import { revisarTiempos } from '../game/ronda/plausibilidad.js';
import { desempenoPorTema, puntuarRespuesta, resumirRonda } from '../game/ronda/puntuacion.js';
import { armarRevision } from '../game/ronda/resumen.js';
import { armarRonda } from '../game/ronda/seleccion.js';
import { crearClinica } from './clinica.js';

const MATRICULA = /^[a-z0-9]{7,10}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const entero = (v) => typeof v === 'number' && Number.isInteger(v);

function matriculaValida(valor) {
  const m = String(valor ?? '').toLowerCase().replace(/\s+/g, '');
  if (!MATRICULA.test(m) || !/[0-9]/.test(m)) throw new ErrorRonda('solicitud_invalida', 400);
  return m;
}

function aulaValida(valor) {
  if (!entero(valor) || valor < 1 || valor > 6) throw new ErrorRonda('solicitud_invalida', 400);
  return valor;
}

function rondaIdValido(valor) {
  if (typeof valor !== 'string' || !UUID.test(valor)) throw new ErrorRonda('solicitud_invalida', 400);
  return valor;
}

/**
 * @param datos  Acceso a la base (ver supabase/functions/rondas/datos.ts y tests/ayudas/datosFalsos.js):
 *   aulaAbierta(aula), jugadorJson(matricula), progresoAula(matricula, aula), crearRondaActiva(fila),
 *   leerRondaActiva(id), guardarRespuesta(id, indice, registro), eliminarRondaActiva(id),
 *   contextoCierre(matricula, aula), guardarRondaTerminada(args)
 * @param bancos { 1: { temas, preguntas }, ... } (los JSON de contenido/ ya filtrados)
 * @param casos  casos clínicos de todas las semanas (Sesión 6; ver clinica.js)
 * @param modoPruebas  interruptor de pruebas (ver interruptor.js)
 */
export function crearManejador({ datos, bancos, casos = [], modoPruebas = false, ahora = Date.now, azar = Math.random, nuevoId = () => globalThis.crypto.randomUUID() }) {
  const indices = new Map(
    Object.entries(bancos).map(([aula, banco]) => [Number(aula), new Map(banco.preguntas.map((p) => [p.id, p]))]),
  );

  /** Rechaza un aula cerrada. Manda el reloj de la base; el interruptor de pruebas es lo único que lo salta. */
  async function exigirAulaAbierta(aula) {
    if (modoPruebas) return;
    if (!(await datos.aulaAbierta(aula))) throw new ErrorRonda('aula_cerrada', 403);
  }

  async function iniciar(cuerpo) {
    const matricula = matriculaValida(cuerpo.matricula);
    const aula = aulaValida(cuerpo.aula);
    await exigirAulaAbierta(aula);
    if (!(await datos.jugadorJson(matricula))) throw new ErrorRonda('jugador_no_encontrado', 404);
    const banco = bancos[aula];
    if (!banco) throw new ErrorRonda('banco_insuficiente', 503);

    const progreso = (await datos.progresoAula(matricula, aula)) ?? { vistas: [], falladas: [] };
    const elegidas = armarRonda({
      banco,
      vistas: progreso.vistas,
      falladas: progreso.falladas,
      azar,
      permitirBorrador: modoPruebas,
    });

    const inicio = ahora();
    const id = nuevoId();
    // Reemplaza cualquier ronda activa anterior de esta matrícula (salir a mitad de ronda la anula).
    await datos.crearRondaActiva({ id, matricula, aula, inicio, expira: inicio + RONDA_EXPIRA_MS, preguntas: elegidas });

    const porId = indices.get(aula);
    return {
      ronda_id: id,
      aula,
      total: elegidas.length,
      tiempo_ms: RONDA.tiempoMs,
      pausa_ms: RONDA.pausaMs,
      margen_inicio_ms: RONDA.margenInicioMs,
      modo_pruebas: modoPruebas,
      // Solo enunciado y opciones (ya mezcladas). Sin id, sin tema y sin la correcta.
      preguntas: elegidas.map((e) => {
        const p = porId.get(e.id);
        return { enunciado: p.enunciado, opciones: e.orden.map((i) => p.opciones[i]) };
      }),
    };
  }

  const respuestaPublica = (r, puntosRonda, total) => ({
    indice: r.indice,
    acierto: r.acierto,
    contestada: r.contestada,
    puntos: r.puntos,
    puntos_ronda: puntosRonda,
    racha: r.racha,
    ms: r.ms,
    restantes: total - (r.indice + 1),
  });

  async function responder(cuerpo) {
    const rondaId = rondaIdValido(cuerpo.ronda_id);
    const indice = cuerpo.indice;
    const opcion = cuerpo.opcion ?? null;
    if (!entero(indice) || indice < 0 || indice >= RONDA.preguntas) throw new ErrorRonda('solicitud_invalida', 400);
    if (opcion !== null && (!entero(opcion) || opcion < 0 || opcion >= RONDA.opciones)) throw new ErrorRonda('solicitud_invalida', 400);

    const activa = await datos.leerRondaActiva(rondaId);
    if (!activa) throw new ErrorRonda('ronda_no_encontrada', 404);
    await exigirAulaAbierta(activa.aula);
    if (activa.terminada) throw new ErrorRonda('ronda_terminada', 409);

    const t = ahora();
    if (t > activa.expira) throw new ErrorRonda('ronda_expirada', 410);

    const previas = activa.respuestas;
    const total = activa.preguntas.length;

    // Reintento de una respuesta que ya se guardó (se perdió la contestación): se repite lo mismo, nunca otra opción.
    if (indice < previas.length) {
      const guardada = previas[indice];
      if (guardada.opcionEnviada !== opcion) throw new ErrorRonda('pregunta_ya_respondida', 409);
      const puntosRonda = previas.slice(0, indice + 1).reduce((s, r) => s + r.puntos, 0);
      return respuestaPublica(guardada, puntosRonda, total);
    }
    if (indice > previas.length) throw new ErrorRonda('fuera_de_orden', 409);

    // La pregunta empieza cuando terminó la pausa de la anterior (la primera, tras el margen de inicio).
    const inicioPregunta = indice === 0 ? activa.inicio + RONDA.margenInicioMs : previas[indice - 1].t + RONDA.pausaMs;
    const transcurrido = Math.max(0, t - inicioPregunta);

    let contestada = opcion !== null;
    if (opcion === null && transcurrido < RONDA.tiempoMs - RONDA.graciaMs) {
      // "Sin contestar" solo vale cuando el tiempo de verdad se acabó.
      throw new ErrorRonda('respuesta_prematura', 400);
    }
    if (transcurrido > RONDA.tiempoMs + RONDA.graciaMs) contestada = false; // llegó fuera de tiempo

    const rp = activa.preguntas[indice];
    const pregunta = indices.get(activa.aula).get(rp.id);
    const acierto = contestada && rp.orden[opcion] === pregunta.correcta;
    const ms = Math.min(transcurrido, RONDA.tiempoMs);
    const rachaAnterior = indice > 0 ? previas[indice - 1].racha : 0;
    const { puntos, racha } = puntuarRespuesta({ acierto, tiempoMs: ms, rachaAnterior });

    const registro = {
      indice,
      id: rp.id,
      tema: pregunta.tema,
      opcionEnviada: opcion,
      opcion: contestada ? rp.orden[opcion] : null,
      contestada,
      acierto,
      ms,
      puntos,
      racha,
      t,
    };
    if (!(await datos.guardarRespuesta(activa.id, indice, registro))) throw new ErrorRonda('conflicto', 409);
    return respuestaPublica(registro, previas.reduce((s, r) => s + r.puntos, 0) + puntos, total);
  }

  async function terminar(cuerpo) {
    const rondaId = rondaIdValido(cuerpo.ronda_id);
    const activa = await datos.leerRondaActiva(rondaId);
    if (!activa) throw new ErrorRonda('ronda_no_encontrada', 404);
    await exigirAulaAbierta(activa.aula);

    // Ya calificada (se perdió la contestación): se repite el mismo resumen, sin guardar nada otra vez.
    if (activa.terminada) {
      return { resumen: activa.resumen, jugador: await datos.jugadorJson(activa.matricula) };
    }

    const t = ahora();
    if (t > activa.expira) throw new ErrorRonda('ronda_expirada', 410);
    if (activa.respuestas.length !== activa.preguntas.length) throw new ErrorRonda('ronda_incompleta', 409);

    if (!revisarTiempos(activa.respuestas).ok) {
      await datos.eliminarRondaActiva(activa.id);
      throw new ErrorRonda('ronda_invalida', 422);
    }

    const banco = bancos[activa.aula];
    const porId = indices.get(activa.aula);
    const total = activa.preguntas.length;
    const base = resumirRonda(activa.respuestas, total);

    const ctx = await datos.contextoCierre(activa.matricula, activa.aula);
    const racha = actualizarRachaDias({ racha: ctx.racha_dias, ultimoDia: ctx.ultimo_dia_jugado }, ctx.hoy);
    const mejores = { ...ctx.mejores_aciertos };
    mejores[activa.aula] = Math.max(mejores[activa.aula] ?? 0, base.aciertos);

    const insigniasNuevas = evaluarInsignias({
      ronda: {
        aciertos: base.aciertos,
        total,
        puntaje: base.puntaje,
        rachaMax: base.rachaMax,
        tiempoPromedioMs: base.tiempoPromedioMs,
        recordAnterior: ctx.record_anterior,
      },
      mejoresAciertos: mejores,
      rachaDias: racha.racha,
      yaGanadas: ctx.insignias,
    });

    const recordNuevo = Math.max(ctx.record_anterior, base.puntaje);
    const resumen = {
      aula: activa.aula,
      puntaje: base.puntaje,
      aciertos: base.aciertos,
      total,
      calificacion: base.calificacion,
      tiempo_promedio_ms: base.tiempoPromedioMs,
      racha_max: base.rachaMax,
      record: {
        anterior: ctx.record_anterior,
        nuevo: recordNuevo,
        es_nuevo: base.puntaje > ctx.record_anterior,
        diferencia: base.puntaje - ctx.record_anterior,
      },
      por_tema: desempenoPorTema(activa.respuestas, banco.temas),
      revision: armarRevision(activa.preguntas, activa.respuestas, porId),
      insignias_nuevas: insigniasNuevas,
      racha_dias: racha.racha,
      modo_pruebas: modoPruebas,
    };

    const guardado = await datos.guardarRondaTerminada({
      activaId: activa.id,
      matricula: activa.matricula,
      aula: activa.aula,
      inicio: activa.inicio,
      fin: t,
      semana: ctx.semana,
      hoy: ctx.hoy,
      puntaje: base.puntaje,
      aciertos: base.aciertos,
      tiempoPromedioMs: base.tiempoPromedioMs,
      respuestas: activa.respuestas,
      acertadas: activa.respuestas.filter((r) => r.acierto).map((r) => r.id),
      falladas: activa.respuestas.filter((r) => !r.acierto).map((r) => r.id),
      insignias: insigniasNuevas,
      rachaDias: racha.racha,
      resumen,
    });
    // El SQL es quien decide si la ronda cuenta para el Salón de la Fama (semana 1 a 6).
    resumen.salon = { cuenta: guardado.cuenta_salon, semana: ctx.semana };
    return { resumen, jugador: guardado.jugador };
  }

  // La Clínica (Sesión 6) comparte función con las rondas: sus acciones se suman aquí (ver clinica.js).
  const clinica = crearClinica({ datos, casos, bancos, modoPruebas, ahora, azar, nuevoId });
  const operaciones = { iniciar, responder, terminar, ...clinica };

  /** Recibe el cuerpo ya leído del POST. Devuelve { estado, cuerpo }; nunca lanza. */
  return async function manejar(cuerpo) {
    try {
      const operacion = Object.hasOwn(operaciones, cuerpo?.accion) ? operaciones[cuerpo.accion] : null;
      if (!operacion) throw new ErrorRonda('solicitud_invalida', 400);
      return { estado: 200, cuerpo: await operacion(cuerpo) };
    } catch (e) {
      if (e instanceof ErrorRonda) return { estado: e.estado, cuerpo: { error: e.codigo, ...e.extra } };
      console.error('error inesperado en rondas:', e);
      return { estado: 500, cuerpo: { error: 'servidor' } };
    }
  };
}
