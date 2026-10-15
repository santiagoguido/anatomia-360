// Base de datos falsa en memoria para probar el manejador de la función sin Supabase.
// Imita la semántica del SQL de supabase/schema.sql (sección 7): una ronda activa por matrícula,
// respuestas en orden, guardado atómico y Salón solo en las semanas 1 a 6.
import { readFileSync } from 'node:fs';
import { fechaCdmx } from '../../src/game/aulas.js';
import { SALON } from '../../src/game/ronda/reglas.js';

export const DIA_MS = 86400000;
export const ms = (iso) => Date.parse(iso);

const iso = (serial) => new Date(serial * DIA_MS).toISOString().slice(0, 10);

/** Los 6 bancos reales, con todas las preguntas "aprobadas" (y las P13 con imagen lista) para poder armar rondas. */
export function cargarBancos({ aprobar = true } = {}) {
  const bancos = {};
  for (let n = 1; n <= 6; n++) {
    const banco = JSON.parse(readFileSync(new URL(`../../contenido/preguntas/aula-${n}.json`, import.meta.url), 'utf8'));
    if (aprobar) {
      for (const p of banco.preguntas) {
        p.estado = 'aprobada';
        if (p.imagen) p.imagen.estado = 'lista';
      }
    }
    bancos[n] = banco;
  }
  return bancos;
}

const APERTURA = {
  1: '2026-10-01T06:00:00Z', 2: '2026-10-26T06:00:00Z', 3: '2026-11-02T06:00:00Z',
  4: '2026-11-09T06:00:00Z', 5: '2026-11-16T06:00:00Z', 6: '2026-11-23T06:00:00Z',
};

export function crearDatosFalsos({ ahora, jugadores = ['a0123456x'] } = {}) {
  const tabla = {
    jugadores: new Map(),
    progreso: new Map(), // `${matricula}:${aula}` → { record, ultimo, rondas, vistas:Set, falladas:Set }
    rondas: [],
    activas: new Map(), // id → fila
    semanal: new Map(), // `${semana}:${matricula}` → puntaje
  };
  for (const m of jugadores) {
    tabla.jugadores.set(m, { matricula: m, nombre: 'Ana Prueba', record_total: 0, racha_dias: 0, ultimo_dia_jugado: null, insignias: [] });
  }
  const llamadas = { aulaAbierta: 0 };

  const hoyCdmx = () => {
    const f = fechaCdmx(ahora());
    return { hoy: iso(f.serial), semana: iso(f.serial - f.diaSemana) };
  };
  const clave = (m, a) => `${m}:${a}`;
  const jugadorJson = (m) => {
    const j = tabla.jugadores.get(m);
    if (!j) return null;
    return {
      ...j,
      progreso: [...tabla.progreso].filter(([k]) => k.startsWith(`${m}:`)).map(([k, p]) => ({
        aula: Number(k.split(':')[1]), ultimo_puntaje: p.ultimo, record: p.record, rondas_jugadas: p.rondas,
      })),
    };
  };

  return {
    tabla,
    llamadas,
    aulaAbierta: async (aula) => {
      llamadas.aulaAbierta += 1;
      return ms(APERTURA[aula]) <= ahora();
    },
    jugadorJson: async (m) => jugadorJson(m),
    progresoAula: async (m, a) => {
      const p = tabla.progreso.get(clave(m, a));
      return p ? { vistas: [...p.vistas], falladas: [...p.falladas] } : null;
    },
    crearRondaActiva: async (f) => {
      for (const [id, r] of tabla.activas) if (r.matricula === f.matricula) tabla.activas.delete(id);
      tabla.activas.set(f.id, { ...f, respuestas: [], terminada: false, resumen: null });
    },
    leerRondaActiva: async (id) => {
      const r = tabla.activas.get(id);
      return r ? structuredClone(r) : null;
    },
    guardarRespuesta: async (id, indice, registro) => {
      const r = tabla.activas.get(id);
      if (!r || r.terminada || r.respuestas.length !== indice) return false;
      r.respuestas.push(structuredClone(registro));
      return true;
    },
    eliminarRondaActiva: async (id) => { tabla.activas.delete(id); },
    contextoCierre: async (m, aula) => {
      const j = tabla.jugadores.get(m);
      const mejores = {};
      for (const r of tabla.rondas.filter((x) => x.matricula === m)) mejores[r.aula] = Math.max(mejores[r.aula] ?? 0, r.aciertos);
      return {
        ...hoyCdmx(),
        racha_dias: j.racha_dias,
        ultimo_dia_jugado: j.ultimo_dia_jugado,
        insignias: [...j.insignias],
        record_anterior: tabla.progreso.get(clave(m, aula))?.record ?? 0,
        mejores_aciertos: mejores,
      };
    },
    guardarRondaTerminada: async (a) => {
      const activa = tabla.activas.get(a.activaId);
      if (!activa || activa.terminada || activa.matricula !== a.matricula) {
        throw Object.assign(new Error('ronda_no_encontrada'), { codigo: 'conflicto' });
      }
      activa.terminada = true;
      // Como la base real: guarda una COPIA del resumen e incluye si la ronda cuenta para el Salón.
      const cuentaSalon = a.semana >= SALON.primerLunes && a.semana <= SALON.ultimoLunes;
      activa.resumen = { ...structuredClone(a.resumen), salon: { cuenta: cuentaSalon, semana: a.semana } };
      tabla.rondas.push({ matricula: a.matricula, aula: a.aula, puntaje: a.puntaje, aciertos: a.aciertos, semana: a.semana, respuestas: a.respuestas });
      const p = tabla.progreso.get(clave(a.matricula, a.aula)) ?? { record: 0, ultimo: 0, rondas: 0, vistas: new Set(), falladas: new Set() };
      p.record = Math.max(p.record, a.puntaje);
      p.ultimo = a.puntaje;
      p.rondas += 1;
      for (const id of [...a.acertadas, ...a.falladas]) p.vistas.add(id);
      for (const id of [...a.acertadas, ...a.falladas]) p.falladas.delete(id);
      for (const id of a.falladas) p.falladas.add(id);
      tabla.progreso.set(clave(a.matricula, a.aula), p);
      const j = tabla.jugadores.get(a.matricula);
      j.record_total = [...tabla.progreso].filter(([k]) => k.startsWith(`${a.matricula}:`)).reduce((s, [, x]) => s + x.record, 0);
      j.racha_dias = a.rachaDias;
      j.ultimo_dia_jugado = a.hoy;
      j.insignias = [...new Set([...j.insignias, ...a.insignias])];
      const cuenta = a.semana >= SALON.primerLunes && a.semana <= SALON.ultimoLunes;
      if (cuenta) {
        const porAula = new Map();
        for (const r of tabla.rondas.filter((x) => x.matricula === a.matricula && x.semana === a.semana)) {
          porAula.set(r.aula, Math.max(porAula.get(r.aula) ?? 0, r.puntaje));
        }
        tabla.semanal.set(`${a.semana}:${a.matricula}`, [...porAula.values()].reduce((s, n) => s + n, 0));
      }
      return { jugador: jugadorJson(a.matricula), cuenta_salon: cuenta };
    },
  };
}
