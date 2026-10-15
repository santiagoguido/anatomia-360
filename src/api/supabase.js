import { createClient } from '@supabase/supabase-js';
import { TIEMPO_MAXIMO_MS } from '../config.js';
import { ErrorApp, clasificarError } from './errores.js';

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
};
