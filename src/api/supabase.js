import { createClient } from '@supabase/supabase-js';
import { TIEMPO_MAXIMO_MS } from '../config.js';
import { ErrorApp, clasificarError, clasificarRespuestaRondas } from './errores.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const CLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configurado = Boolean(URL && CLAVE);

let cliente = null;
function obtenerCliente() {
  if (!configurado) throw new ErrorApp('sin_configuracion');
  // Sin inicio de sesión: no se guarda nada de autenticación en el navegador.
  cliente ??= createClient(URL, CLAVE, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cliente;
}

async function rpc(funcion, argumentos) {
  const supabase = obtenerCliente();
  const control = new AbortController();
  let agotado = false;
  const temporizador = setTimeout(() => {
    agotado = true;
    control.abort();
  }, TIEMPO_MAXIMO_MS);
  try {
    const { data, error } = await supabase.rpc(funcion, argumentos).abortSignal(control.signal);
    if (error) throw new ErrorApp(clasificarError(error, { agotado }), error.message);
    return data;
  } catch (e) {
    if (e instanceof ErrorApp) throw e;
    throw new ErrorApp(clasificarError(e, { agotado }), e?.message);
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Llama a la Edge Function `rondas`. La clave publicable va SOLO en `apikey` (no en Authorization:
 * no es un JWT). Devuelve el JSON de la respuesta o lanza ErrorApp con el código del problema.
 */
async function llamarRondas(cuerpo) {
  if (!configurado) throw new ErrorApp('sin_configuracion');
  const control = new AbortController();
  let agotado = false;
  const temporizador = setTimeout(() => {
    agotado = true;
    control.abort();
  }, TIEMPO_MAXIMO_MS);
  try {
    const respuesta = await fetch(`${URL.replace(/\/$/, '')}/functions/v1/rondas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CLAVE },
      body: JSON.stringify(cuerpo),
      signal: control.signal,
    });
    let datos = null;
    try {
      datos = await respuesta.json();
    } catch {
      /* el gateway puede contestar sin JSON */
    }
    if (!respuesta.ok) throw new ErrorApp(clasificarRespuestaRondas(respuesta.status, datos), datos?.error ?? String(respuesta.status));
    return datos;
  } catch (e) {
    if (e instanceof ErrorApp) throw e;
    throw new ErrorApp(clasificarError(e, { agotado }), e?.message);
  } finally {
    clearTimeout(temporizador);
  }
}

export const api = {
  /** Devuelve el jugador (objeto) o null si esa matrícula no está registrada. */
  recuperarJugador(matricula) {
    return rpc('recuperar_jugador', { p_matricula: matricula });
  },

  /** Registra a un jugador nuevo. Si ya existía, no lo cambia y devuelve ya_existia: true. */
  registrarJugador({ matricula, nombre, genero }) {
    return rpc('registrar_jugador', { p_matricula: matricula, p_nombre: nombre, p_genero: genero });
  },

  /**
   * Calendario de aulas con la hora del SERVIDOR: para cada aula, si ya está abierta y
   * cuántos segundos faltan. Devuelve un arreglo de filas (ver supabase/schema.sql → estado_aulas).
   */
  estadoAulas() {
    return rpc('estado_aulas', {});
  },

  /** Marca la última entrada del jugador. Si falla no importa: no se espera ni se muestra. */
  registrarAcceso(matricula) {
    rpc('registrar_acceso', { p_matricula: matricula }).catch(() => {});
  },

  // ---- Salón de la Fama y Control Escolar (Sesión 5) ----

  /**
   * Todo el Salón en una llamada, con la semana y la hora del SERVIDOR: { estado: 'antes' | 'activo', semana, semanas,
   * top10, mi_posicion, jugadores, ganadores }. `semana` (opcional) es cualquier fecha de la semana que se quiere ver.
   */
  salonDeLaFama({ matricula, semana = null }) {
    return rpc('salon_de_la_fama', { p_matricula: matricula, p_semana: semana });
  },

  /** Resultados de UN jugador (por aula y por tema), récord total, racha e insignias. null si la matrícula no existe. */
  controlEscolar(matricula) {
    return rpc('control_escolar', { p_matricula: matricula });
  },

  // ---- Rondas (Edge Function `rondas`; ver supabase/functions/rondas) ----

  /** Empieza una ronda: devuelve { ronda_id, total, tiempo_ms, pausa_ms, preguntas: [{ enunciado, opciones }] }. */
  iniciarRonda({ matricula, aula }) {
    return llamarRondas({ accion: 'iniciar', matricula, aula });
  },

  /** Contesta la pregunta `indice` con la posición A–D (0–3) o null si se acabó el tiempo. Devuelve solo acierto/fallo y puntos. */
  responderPregunta({ rondaId, indice, opcion }) {
    return llamarRondas({ accion: 'responder', ronda_id: rondaId, indice, opcion });
  },

  /** Califica y guarda la ronda: devuelve { resumen, jugador }. Se puede repetir sin guardar dos veces. */
  terminarRonda(rondaId) {
    return llamarRondas({ accion: 'terminar', ronda_id: rondaId });
  },
};
