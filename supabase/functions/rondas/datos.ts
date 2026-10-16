// Acceso a la base de datos para la función `rondas`. Cumple la misma interfaz que el falso de las pruebas
// (tests/ayudas/datosFalsos.js). Todo pasa por la clave secreta, que solo existe dentro de la función.
import { ErrorRonda } from '../_shared/game/ronda/errores.js';

// deno-lint-ignore no-explicit-any
type Cliente = any;

export function crearDatos(supabase: Cliente) {
  async function rpc(funcion: string, argumentos: Record<string, unknown>) {
    const { data, error } = await supabase.rpc(funcion, argumentos);
    if (error) {
      // Otra llamada ya calificó esta ronda: el juego reintenta y recibe el mismo resumen.
      if (/ronda_no_encontrada|guardia_no_encontrada/.test(String(error.message))) throw new ErrorRonda('conflicto', 409);
      throw new Error(`${funcion}: ${error.message}`);
    }
    return data;
  }
  const iso = (ms: number) => new Date(ms).toISOString();

  return {
    aulaAbierta: async (aula: number) => (await rpc('aula_abierta', { p_aula: aula })) === true,

    jugadorJson: (matricula: string) => rpc('_jugador_json', { p_matricula: matricula }),

    async progresoAula(matricula: string, aula: number) {
      return await rpc('progreso_para_ronda', { p_matricula: matricula, p_aula: aula });
    },

    async crearRondaActiva(f: { id: string; matricula: string; aula: number; inicio: number; expira: number; preguntas: unknown }) {
      await rpc('crear_ronda_activa', {
        p_id: f.id,
        p_matricula: f.matricula,
        p_aula: f.aula,
        p_inicio: iso(f.inicio),
        p_expira: iso(f.expira),
        p_preguntas: f.preguntas,
      });
    },

    async leerRondaActiva(id: string) {
      const { data, error } = await supabase
        .from('rondas_activas')
        .select('id, matricula, aula, inicio, expira_en, preguntas, respuestas, terminada_en, resumen')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(`leer ronda: ${error.message}`);
      if (!data) return null;
      return {
        id: data.id,
        matricula: data.matricula,
        aula: data.aula,
        inicio: Date.parse(data.inicio),
        expira: Date.parse(data.expira_en),
        preguntas: data.preguntas,
        respuestas: data.respuestas,
        terminada: data.terminada_en !== null,
        resumen: data.resumen,
      };
    },

    async guardarRespuesta(id: string, indice: number, registro: unknown) {
      return (await rpc('registrar_respuesta', { p_id: id, p_indice: indice, p_registro: registro })) === true;
    },

    async eliminarRondaActiva(id: string) {
      const { error } = await supabase.from('rondas_activas').delete().eq('id', id);
      if (error) throw new Error(`eliminar ronda: ${error.message}`);
    },

    contextoCierre: (matricula: string, aula: number) => rpc('contexto_cierre', { p_matricula: matricula, p_aula: aula }),

    guardarRondaTerminada: (a: Record<string, any>) =>
      rpc('guardar_ronda_terminada', {
        p_activa_id: a.activaId,
        p_matricula: a.matricula,
        p_aula: a.aula,
        p_inicio: iso(a.inicio),
        p_fin: iso(a.fin),
        p_semana: a.semana,
        p_hoy: a.hoy,
        p_puntaje: a.puntaje,
        p_aciertos: a.aciertos,
        p_tiempo_promedio_ms: a.tiempoPromedioMs,
        p_respuestas: a.respuestas,
        p_acertadas: a.acertadas,
        p_falladas: a.falladas,
        p_insignias: a.insignias,
        p_racha_dias: a.rachaDias,
        p_resumen: a.resumen,
      }),

    // ---- Clínica (Sesión 6) ----

    contextoClinica: (matricula: string) => rpc('contexto_clinica', { p_matricula: matricula }),

    async crearGuardiaActiva(f: { id: string; matricula: string; inicio: number; expira: number; casos: unknown }) {
      await rpc('crear_guardia_activa', {
        p_id: f.id,
        p_matricula: f.matricula,
        p_inicio: iso(f.inicio),
        p_expira: iso(f.expira),
        p_casos: f.casos,
      });
    },

    async leerGuardiaActiva(id: string) {
      const { data, error } = await supabase
        .from('guardias_activas')
        .select('id, matricula, inicio, expira_en, casos, actual, version, terminada_en, resumen')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(`leer guardia: ${error.message}`);
      if (!data) return null;
      return {
        id: data.id,
        matricula: data.matricula,
        inicio: Date.parse(data.inicio),
        expira: Date.parse(data.expira_en),
        casos: data.casos,
        actual: data.actual,
        version: data.version,
        terminada: data.terminada_en !== null,
        resumen: data.resumen,
      };
    },

    async actualizarGuardia(id: string, version: number, casos: unknown, actual: number) {
      return (await rpc('actualizar_guardia', { p_id: id, p_version: version, p_casos: casos, p_actual: actual })) === true;
    },

    guardarGuardiaTerminada: (a: Record<string, any>) =>
      rpc('guardar_guardia_terminada', {
        p_activa_id: a.activaId,
        p_matricula: a.matricula,
        p_inicio: iso(a.inicio),
        p_fin: iso(a.fin),
        p_semana: a.semana,
        p_hoy: a.hoy,
        p_puntaje: a.puntaje,
        p_casos: a.casos,
        p_expedientes: a.expedientes,
        p_insignias: a.insignias,
        p_racha_dias: a.rachaDias,
        p_resumen: a.resumen,
      }),

    async expedientesDe(matricula: string) {
      return (await rpc('expedientes_de', { p_matricula: matricula })) ?? [];
    },
  };
}
