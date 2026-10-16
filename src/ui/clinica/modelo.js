// Datos y textos de las pantallas de la Clínica. Sin DOM: se prueba con Node (tests/clinicaModelo.test.js).
import { CLINICA_UI } from '../../textos.js';
import { INSIGNIAS } from '../../game/ronda/insignias.js';
import { textoFechaApertura } from '../../game/aulas.js';
import { SALON } from '../../game/ronda/reglas.js';

export const formatoPuntos = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

export const nombreInsignia = (id) => INSIGNIAS[id]?.nombre ?? id;

/** Lo que se le dice al alumno sobre sus exploraciones: cuántas lleva y si aún alcanza el bono. */
export function estadoExploracion(vista) {
  const { n_exploraciones: n, minimo_exploraciones: minimo, para_bono: bono } = vista;
  return {
    texto: CLINICA_UI.explorarAyuda(n, minimo, bono),
    faltan: Math.max(0, minimo - n),
    conBono: n <= bono,
  };
}

/** Comparación de la guardia con la mejor anterior: { tono, texto }. */
export function mensajeMejor(mejor) {
  const R = CLINICA_UI.resumen;
  if (mejor.es_nuevo) return { tono: 'nuevo', texto: R.recordNuevo(mejor.diferencia, mejor.anterior) };
  if (mejor.diferencia === 0) return { tono: 'igual', texto: R.recordIgual };
  return { tono: 'menor', texto: R.recordFaltaron(-mejor.diferencia) };
}

/** Si la guardia suma al Salón de la Fama. Antes del 19 oct o después de la semana 6 solo cuenta para el récord personal. */
export function mensajeSalon(salon) {
  const R = CLINICA_UI.resumen.salon;
  if (salon?.cuenta) return R.cuenta;
  if (salon?.semana && salon.semana < SALON.primerLunes) {
    return `Esta guardia cuenta para tu récord personal. El Salón de la Fama semanal arranca el ${textoFechaApertura(Date.parse(`${SALON.primerLunes}T06:00:00Z`))}.`;
  }
  return R.noCuenta;
}

/** Texto de un paso ya resuelto, para el desenlace. */
export function textoPaso(p) {
  if (p.acertado) return p.intento === 1 ? 'Acertaste al primer intento' : 'Acertaste al segundo intento';
  return 'No lo lograste';
}

/** ¿Falta explorar para razonar? */
export const faltaExplorar = (vista) => !vista.listo_para_razonar;

/** Datos de la tarjeta de la Clínica en el campus: mejor guardia y expedientes del jugador. */
export function metricasClinica(jugador) {
  const mejor = Number(jugador?.mejor_guardia) || 0;
  const expedientes = Number(jugador?.expedientes) || 0;
  return { mejor, expedientes };
}
