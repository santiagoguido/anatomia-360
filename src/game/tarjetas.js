// Contenido de la tarjeta que aparece al acercarse a una puerta. Solo arma datos
// (sin DOM): la pantalla del campus los dibuja y las pruebas los revisan.
import { CAMPUS } from '../textos.js';
import { aulasAbiertas, estaAbierta, semanaDelCurso, textoFaltante, textoFechaApertura } from './aulas.js';

const T = CAMPUS.tarjeta;

const numero = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : T.sinPuntaje);

function modeloAula(lugar, { aulas, jugador, ahoraMs }) {
  const aula = aulas.find((a) => a.numero === lugar.numero);
  const temas = aula?.temas ?? [];
  const base = { id: lugar.id, tipo: 'aula', encabezado: T.aulaTitulo(lugar.numero), lineas: temas };

  if (aula && estaAbierta(aula, ahoraMs)) {
    const prog = jugador?.progreso?.find((p) => p.aula === lugar.numero);
    const rondas = prog?.rondas_jugadas ?? 0;
    return {
      ...base,
      abierta: true,
      estado: { texto: CAMPUS.estado.disponible, tono: 'ok' },
      metricas: [
        { etiqueta: T.ultimoPuntaje, valor: rondas > 0 ? numero(prog.ultimo_puntaje) : T.sinPuntaje },
        { etiqueta: T.tuRecord, valor: rondas > 0 ? numero(prog.record) : T.sinPuntaje },
      ],
      nota: T.rondas(rondas),
      boton: { texto: T.entrar, habilitado: true },
    };
  }

  return {
    ...base,
    abierta: false,
    estado: { texto: CAMPUS.estado.bloqueada, tono: 'bloqueada' },
    cuenta: aula
      ? { etiqueta: T.seAbre(textoFechaApertura(aula.abreEnMs)), valor: textoFaltante(aula, ahoraMs) }
      : null,
    nota: T.permanece,
    boton: { texto: T.aunBloqueada, habilitado: false },
  };
}

function modeloClinica(lugar, { aulas, ahoraMs }) {
  const abiertas = aulasAbiertas(aulas, ahoraMs);
  const chips = abiertas.flatMap((a) => CAMPUS.temasCortos[a.numero] ?? []);
  return {
    id: lugar.id,
    tipo: 'clinica',
    abierta: abiertas.length > 0,
    encabezado: T.clinicaTitulo,
    estado: { texto: CAMPUS.estado.disponible, tono: 'ok' },
    lineas: [T.clinicaSemanas(abiertas.length)],
    chips,
    metricas: [
      { etiqueta: T.mejorGuardia, valor: T.sinPuntaje },
      { etiqueta: T.expedientes, valor: T.sinPuntaje },
    ],
    boton: { texto: T.clinicaBoton, habilitado: abiertas.length > 0 },
  };
}

function modeloSalon(lugar, { ahoraMs }) {
  return {
    id: lugar.id,
    tipo: 'salon',
    abierta: true,
    encabezado: T.salonTitulo,
    estado: { texto: CAMPUS.estado.disponible, tono: 'ok' },
    lineas: [T.salonLinea(semanaDelCurso(ahoraMs).numero)],
    nota: T.salonNota,
    boton: { texto: T.salonBoton, habilitado: true },
  };
}

function modeloControl(lugar) {
  return {
    id: lugar.id,
    tipo: 'control',
    abierta: true,
    encabezado: T.controlTitulo,
    estado: { texto: CAMPUS.estado.disponible, tono: 'ok' },
    lineas: [T.controlLinea],
    nota: T.controlNota,
    boton: { texto: T.controlBoton, habilitado: true },
  };
}

/** Datos de la tarjeta de un lugar según las aulas abiertas, el progreso del jugador y la hora. */
export function modeloTarjeta(lugar, { aulas, jugador, ahoraMs = Date.now() }) {
  const ctx = { aulas, jugador, ahoraMs };
  switch (lugar.tipo) {
    case 'aula': return modeloAula(lugar, ctx);
    case 'clinica': return modeloClinica(lugar, ctx);
    case 'salon': return modeloSalon(lugar, ctx);
    case 'control': return modeloControl(lugar);
    default: return null;
  }
}
