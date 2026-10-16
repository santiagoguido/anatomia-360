// Lógica de la Clínica (Sesión 6): guardias de 5 casos. Vive en la MISMA Edge Function `rondas` (nuevas acciones).
// Sin Deno, sin Supabase y sin DOM: todo lo externo entra por parámetros, así se prueba con Node.
// Este archivo se copia a supabase/functions/_shared/ (npm run funcion:preparar).
//
// Reglas de seguridad (las mismas ideas que las rondas):
//  · Las respuestas correctas, las pistas y el desenlace viven aquí; al navegador solo le llegan lo que ya puede ver.
//  · El servidor lleva la cuenta de exploraciones, pistas e intentos. El navegador no calcula puntos.
//  · Una sola guardia activa por matrícula (empezar otra anula la anterior). Salir a mitad de guardia la anula.
//  · Solo salen casos aprobados cuyos temas están en aulas ya abiertas (reloj de la BASE, no el del teléfono).
//  · Cada operación se puede repetir sin riesgo si se perdió la contestación (idempotentes).
import { ErrorRonda } from '../game/ronda/errores.js';
import { actualizarRachaDias } from '../game/ronda/dias.js';
import { CLINICA, MAXIMO_GUARDIA } from '../game/clinica/reglas.js';
import { puntosDePaso, puntuarCaso, puntuarGuardia } from '../game/clinica/puntuacion.js';
import { armarGuardia, aulasDeCaso, mapaTemas } from '../game/clinica/seleccion.js';
import { evaluarInsigniasClinica } from '../game/clinica/insignias.js';

const MATRICULA = /^[a-z0-9]{7,10}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const entero = (v) => typeof v === 'number' && Number.isInteger(v);

function matriculaValida(valor) {
  const m = String(valor ?? '').toLowerCase().replace(/\s+/g, '');
  if (!MATRICULA.test(m) || !/[0-9]/.test(m)) throw new ErrorRonda('solicitud_invalida', 400);
  return m;
}

function guardiaIdValido(valor) {
  if (typeof valor !== 'string' || !UUID.test(valor)) throw new ErrorRonda('solicitud_invalida', 400);
  return valor;
}

/**
 * @param datos  Además de lo de las rondas (aulaAbierta, jugadorJson): contextoClinica(matricula), crearGuardiaActiva(fila),
 *   leerGuardiaActiva(id), actualizarGuardia(id, version, casos, actual), guardarGuardiaTerminada(args), expedientesDe(matricula)
 *   (ver supabase/functions/rondas/datos.ts y tests/ayudas/datosFalsos.js)
 * @param casos  Todos los casos de todas las semanas (los JSON de contenido/casos/ ya reducidos por el script de sincronización)
 * @param bancos { 1: { temas }, ... } para saber a qué aula pertenece cada tema
 */
export function crearClinica({ datos, casos = [], bancos, modoPruebas = false, ahora = Date.now, azar = Math.random, nuevoId = () => globalThis.crypto.randomUUID() }) {
  const porId = new Map(casos.map((c) => [c.id, c]));
  const aulaDeTema = mapaTemas(bancos);

  // ---- Vistas: lo que el navegador puede ver en cada momento ---------------------------------------------------

  function puntosAcumulados(activa) {
    return activa.casos.reduce((s, c) => s + (c.resultado?.total ?? 0), 0);
  }

  function vistaPaso(c, caso) {
    const paso = caso.pasos[c.paso];
    const estado = c.pasos[c.paso];
    const intentos = estado?.intentos.length ?? 0;
    const pistaUsada = c.pistas.includes(c.paso);
    return {
      indice: c.paso,
      total: CLINICA.pasos,
      tipo: paso.tipo,
      pregunta: paso.pregunta,
      opciones: c.ordenes[c.paso].map((i) => paso.opciones[i]),
      intento: intentos + 1,
      intentos_max: CLINICA.intentos,
      pista_usada: pistaUsada,
      pista: pistaUsada ? paso.pista : null,
    };
  }

  function desenlace(c, caso) {
    const r = c.resultado;
    return {
      titulo: caso.titulo,
      texto: caso.desenlace.texto,
      explicacion: caso.desenlace.explicacion,
      esquema: caso.desenlace.esquema,
      cita: caso.referencia.cita,
      exploraciones: CLINICA.exploraciones.map((id) => ({
        id,
        util: caso.exploraciones[id].util,
        hecha: c.exploraciones.includes(id),
        hallazgo: caso.exploraciones[id].hallazgo,
      })),
      pasos: caso.pasos.map((p, i) => ({
        tipo: p.tipo,
        pregunta: p.pregunta,
        correcta: p.opciones[p.correcta],
        acertado: c.pasos[i].acertado,
        intento: c.pasos[i].intento,
      })),
      puntos: { por_pasos: r.porPasos, bono: r.bono, descuento: r.descuento, total: r.total },
      resuelto: r.resuelto,
      ojo_clinico: r.ojoClinico,
    };
  }

  function vistaCaso(activa, indice) {
    const c = activa.casos[indice];
    const caso = porId.get(c.id);
    const listo = c.exploraciones.length >= CLINICA.exploracionesMinimas;
    return {
      guardia_id: activa.id,
      modo_pruebas: modoPruebas,
      indice,
      numero: indice + 1,
      total: activa.casos.length,
      paciente: caso.paciente,
      presentacion: caso.presentacion,
      motivo: caso.motivo,
      exploraciones: CLINICA.exploraciones.map((id) => {
        const hecha = c.exploraciones.includes(id);
        return { id, hecha, hallazgo: hecha ? caso.exploraciones[id].hallazgo : null };
      }),
      n_exploraciones: c.exploraciones.length,
      minimo_exploraciones: CLINICA.exploracionesMinimas,
      para_bono: CLINICA.exploracionesParaBono,
      listo_para_razonar: listo,
      // La pregunta del primer paso no se envía hasta explorar lo mínimo: así «no explorar nada» no es la mejor jugada.
      paso: !c.hecho && listo ? vistaPaso(c, caso) : null,
      pistas_usadas: c.pistas.length,
      hecho: c.hecho,
      desenlace: c.hecho ? desenlace(c, caso) : null,
      puntos_guardia: puntosAcumulados(activa),
    };
  }

  // ---- Utilidades de carga y guardado ---------------------------------------------------------------------------

  async function cargar(cuerpo, { permitirTerminada = false } = {}) {
    const id = guardiaIdValido(cuerpo.guardia_id);
    const activa = await datos.leerGuardiaActiva(id);
    if (!activa) throw new ErrorRonda('guardia_no_encontrada', 404);
    if (activa.terminada && !permitirTerminada) throw new ErrorRonda('guardia_terminada', 409);
    if (!activa.terminada && ahora() > activa.expira) throw new ErrorRonda('guardia_expirada', 410);
    return activa;
  }

  async function guardar(activa, actual = activa.actual) {
    if (!(await datos.actualizarGuardia(activa.id, activa.version, activa.casos, actual))) throw new ErrorRonda('conflicto', 409);
    activa.version += 1;
    activa.actual = actual;
  }

  /** Exige que la petición sea sobre el caso en curso (así no se mezclan pantallas de una guardia vieja). */
  function casoEnCurso(activa, cuerpo) {
    if (!entero(cuerpo.caso) || cuerpo.caso < 0 || cuerpo.caso >= activa.casos.length) throw new ErrorRonda('solicitud_invalida', 400);
    if (cuerpo.caso !== activa.actual) throw new ErrorRonda('fuera_de_orden', 409);
    return activa.casos[activa.actual];
  }

  // ---- Operaciones -------------------------------------------------------------------------------------------------

  async function guardia_iniciar(cuerpo) {
    const matricula = matriculaValida(cuerpo.matricula);
    if (!(await datos.jugadorJson(matricula))) throw new ErrorRonda('jugador_no_encontrado', 404);

    // Aulas abiertas con el reloj de la base: solo se consultan las que algún caso necesita.
    const necesarias = new Set();
    for (const c of casos) for (const a of aulasDeCaso(c, aulaDeTema) ?? []) necesarias.add(a);
    const aulasAbiertas = new Set();
    for (const a of necesarias) if (modoPruebas || (await datos.aulaAbierta(a))) aulasAbiertas.add(a);

    const ctx = await datos.contextoClinica(matricula);
    const elegidas = armarGuardia({ casos, archivados: ctx.archivados ?? [], aulasAbiertas, aulaDeTema, azar, permitirBorrador: modoPruebas });
    const inicio = ahora();
    const id = nuevoId();
    const inicial = elegidas.map((e) => ({ ...e, exploraciones: [], pistas: [], pasos: [], paso: 0, hecho: false, resultado: null }));
    await datos.crearGuardiaActiva({ id, matricula, inicio, expira: inicio + CLINICA.expiraMs, casos: inicial });
    const activa = { id, matricula, inicio, expira: inicio + CLINICA.expiraMs, casos: inicial, actual: 0, version: 0, terminada: false, resumen: null };
    return { guardia_id: id, total: inicial.length, maximo: MAXIMO_GUARDIA, vista: vistaCaso(activa, 0) };
  }

  async function guardia_explorar(cuerpo) {
    const activa = await cargar(cuerpo);
    const c = casoEnCurso(activa, cuerpo);
    if (!CLINICA.exploraciones.includes(cuerpo.exploracion)) throw new ErrorRonda('solicitud_invalida', 400);
    if (c.hecho) throw new ErrorRonda('fuera_de_orden', 409);
    if (!c.exploraciones.includes(cuerpo.exploracion)) {
      c.exploraciones.push(cuerpo.exploracion);
      await guardar(activa);
    }
    return { vista: vistaCaso(activa, activa.actual) };
  }

  async function guardia_pista(cuerpo) {
    const activa = await cargar(cuerpo);
    const c = casoEnCurso(activa, cuerpo);
    if (c.hecho || c.exploraciones.length < CLINICA.exploracionesMinimas) throw new ErrorRonda('fuera_de_orden', 409);
    if (!entero(cuerpo.paso) || cuerpo.paso !== c.paso) throw new ErrorRonda('fuera_de_orden', 409);
    if (!c.pistas.includes(c.paso)) {
      c.pistas.push(c.paso);
      await guardar(activa);
    }
    return { vista: vistaCaso(activa, activa.actual) };
  }

  /** Resultado de un paso ya registrado (sirve para responder y para repetir una respuesta que se perdió). */
  function resultadoDePaso(c, caso, indicePaso, intento) {
    const estado = c.pasos[indicePaso];
    const correctaPos = c.ordenes[indicePaso].indexOf(caso.pasos[indicePaso].correcta);
    const acierto = estado.acertado && estado.intento === intento;
    const cerrado = estado.acertado || estado.perdido;
    return {
      paso: indicePaso,
      intento,
      acierto,
      intentos_restantes: cerrado ? 0 : CLINICA.intentos - estado.intentos.length,
      revelada: estado.perdido,
      correcta: cerrado ? correctaPos : null,
      puntos_paso: acierto ? puntosDePaso(intento) : 0,
    };
  }

  async function guardia_responder(cuerpo) {
    const activa = await cargar(cuerpo);
    const c = casoEnCurso(activa, cuerpo);
    const caso = porId.get(c.id);
    const { paso: indicePaso, intento, opcion } = cuerpo;
    if (!entero(indicePaso) || indicePaso < 0 || indicePaso >= CLINICA.pasos) throw new ErrorRonda('solicitud_invalida', 400);
    if (!entero(intento) || intento < 1 || intento > CLINICA.intentos) throw new ErrorRonda('solicitud_invalida', 400);
    if (!entero(opcion) || opcion < 0 || opcion >= CLINICA.opciones) throw new ErrorRonda('solicitud_invalida', 400);

    // Repetición de algo ya guardado (se perdió la contestación): se devuelve lo mismo, nunca otra opción.
    const previo = c.pasos[indicePaso];
    if (previo && previo.intentos.length >= intento) {
      if (previo.intentos[intento - 1] !== opcion) throw new ErrorRonda('pregunta_ya_respondida', 409);
      return { resultado: resultadoDePaso(c, caso, indicePaso, intento), vista: vistaCaso(activa, activa.actual) };
    }
    if (c.exploraciones.length < CLINICA.exploracionesMinimas) throw new ErrorRonda('fuera_de_orden', 409);
    if (c.hecho || indicePaso !== c.paso) throw new ErrorRonda('fuera_de_orden', 409);

    const estado = (c.pasos[indicePaso] ??= { intentos: [], acertado: false, intento: null, perdido: false });
    if (intento !== estado.intentos.length + 1) throw new ErrorRonda('fuera_de_orden', 409);

    const correctaPos = c.ordenes[indicePaso].indexOf(caso.pasos[indicePaso].correcta);
    const acierto = opcion === correctaPos;
    estado.intentos.push(opcion);
    if (acierto) {
      estado.acertado = true;
      estado.intento = intento;
    } else if (intento >= CLINICA.intentos) {
      estado.perdido = true;
    }

    if (estado.acertado || estado.perdido) {
      c.paso = indicePaso + 1;
      if (c.paso >= CLINICA.pasos) {
        c.hecho = true;
        c.resultado = puntuarCaso({
          pasos: c.pasos.map((p) => ({ acertado: p.acertado, intento: p.intento })),
          exploraciones: c.exploraciones.length,
          pistas: c.pistas.length,
        });
      }
    }
    await guardar(activa);
    return { resultado: resultadoDePaso(c, caso, indicePaso, intento), vista: vistaCaso(activa, activa.actual) };
  }

  async function terminarGuardia(activa) {
    const t = ahora();
    const ctx = await datos.contextoClinica(activa.matricula);
    const racha = actualizarRachaDias({ racha: ctx.racha_dias, ultimoDia: ctx.ultimo_dia_jugado }, ctx.hoy);
    const resultados = activa.casos.map((c) => ({ c, caso: porId.get(c.id), r: c.resultado }));
    const puntaje = puntuarGuardia(resultados.map((x) => x.r));
    const ojoClinico = resultados.some((x) => x.r.ojoClinico);
    const insigniasNuevas = evaluarInsigniasClinica({
      guardiasTerminadas: (ctx.guardias_terminadas ?? 0) + 1,
      ojoClinico,
      yaGanadas: ctx.insignias,
    });
    const archivados = new Set(ctx.archivados ?? []);
    const resueltos = resultados.filter((x) => x.r.resuelto);
    const mejorAnterior = ctx.mejor_guardia ?? 0;

    const resumen = {
      puntaje,
      maximo: MAXIMO_GUARDIA,
      resueltos: resueltos.length,
      total: resultados.length,
      casos: resultados.map((x) => ({
        id: x.c.id,
        titulo: x.caso.titulo,
        resuelto: x.r.resuelto,
        puntos: x.r.total,
        exploraciones: x.c.exploraciones.length,
        pistas: x.c.pistas.length,
        ojo_clinico: x.r.ojoClinico,
      })),
      mejor: { anterior: mejorAnterior, nuevo: Math.max(mejorAnterior, puntaje), es_nuevo: puntaje > mejorAnterior, diferencia: puntaje - mejorAnterior },
      expedientes_nuevos: resueltos.filter((x) => !archivados.has(x.c.id)).length,
      insignias_nuevas: insigniasNuevas,
      racha_dias: racha.racha,
      modo_pruebas: modoPruebas,
    };

    const guardado = await datos.guardarGuardiaTerminada({
      activaId: activa.id,
      matricula: activa.matricula,
      inicio: activa.inicio,
      fin: t,
      semana: ctx.semana,
      hoy: ctx.hoy,
      puntaje,
      casos: resultados.map((x) => ({ id: x.c.id, puntos: x.r.total, resuelto: x.r.resuelto, exploraciones: x.c.exploraciones.length, pistas: x.c.pistas.length })),
      expedientes: resueltos.map((x) => ({ caso_id: x.c.id, puntos: x.r.total })),
      insignias: insigniasNuevas,
      rachaDias: racha.racha,
      resumen,
    });
    // El SQL es quien decide si la guardia cuenta para el Salón de la Fama (semanas 1 a 6).
    resumen.salon = { cuenta: guardado.cuenta_salon, semana: ctx.semana };
    return { final: true, resumen, jugador: guardado.jugador };
  }

  async function guardia_siguiente(cuerpo) {
    const activa = await cargar(cuerpo, { permitirTerminada: true });
    // Ya calificada (se perdió la contestación): se repite el mismo resumen, sin guardar nada otra vez.
    if (activa.terminada) return { final: true, resumen: activa.resumen, jugador: await datos.jugadorJson(activa.matricula) };

    if (!entero(cuerpo.caso) || cuerpo.caso < 0 || cuerpo.caso >= activa.casos.length) throw new ErrorRonda('solicitud_invalida', 400);
    // Repetición: ya se pasó al siguiente paciente.
    if (cuerpo.caso < activa.actual) return { final: false, vista: vistaCaso(activa, activa.actual) };
    const c = casoEnCurso(activa, cuerpo);
    if (!c.hecho) throw new ErrorRonda('fuera_de_orden', 409);

    if (activa.actual + 1 < activa.casos.length) {
      await guardar(activa, activa.actual + 1);
      return { final: false, vista: vistaCaso(activa, activa.actual) };
    }
    return terminarGuardia(activa);
  }

  async function expedientes(cuerpo) {
    const matricula = matriculaValida(cuerpo.matricula);
    const filas = await datos.expedientesDe(matricula);
    const lista = [];
    for (const f of filas ?? []) {
      const caso = porId.get(f.caso_id);
      if (!caso) continue; // un caso que ya no existe en el contenido
      lista.push({
        id: caso.id,
        titulo: caso.titulo,
        semana: caso.semana,
        resuelto_en: f.resuelto_en,
        puntos: f.puntos,
        paciente: caso.paciente,
        motivo: caso.motivo,
        texto: caso.desenlace.texto,
        explicacion: caso.desenlace.explicacion,
        esquema: caso.desenlace.esquema,
        cita: caso.referencia.cita,
      });
    }
    lista.sort((a, b) => String(b.resuelto_en).localeCompare(String(a.resuelto_en)));
    return { expedientes: lista };
  }

  return { guardia_iniciar, guardia_explorar, guardia_pista, guardia_responder, guardia_siguiente, expedientes };
}
