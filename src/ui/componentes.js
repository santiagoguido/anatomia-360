import { h, s } from '../utils/dom.js';
import { CREDITOS } from '../textos.js';
import { crearIcono } from './sprites.js';

export { crearIcono };

export function crearBoton({ texto, variante = 'primario', tipo = 'button', onClick, id, foco = false }) {
  return h(
    'button',
    { type: tipo, id, class: `boton boton--${variante}`, onClick, 'data-foco': foco ? '' : null },
    texto,
  );
}

/** Franja inferior de la portada. El texto completo es el que pidió la Dra. Zamudio. */
export function crearCreditos() {
  return h(
    'footer',
    { class: 'creditos' },
    h('span', { class: 'creditos__etiqueta' }, 'CRÉDITOS'),
    h('p', { class: 'creditos__texto' }, CREDITOS.antes, h('strong', {}, CREDITOS.docente), CREDITOS.despues),
  );
}

const PASOS = ['Matrícula', 'Nombre', 'Género'];

/** Indicador de pasos del registro (1 a 3). */
export function crearPasos(actual) {
  return h(
    'ol',
    { class: 'pasos', 'aria-label': 'Pasos del registro' },
    ...PASOS.map((nombre, i) => {
      const n = i + 1;
      const estado = n < actual ? 'hecho' : n === actual ? 'actual' : 'pendiente';
      return h(
        'li',
        { class: `paso paso--${estado}`, 'aria-current': estado === 'actual' ? 'step' : null },
        h('span', { class: 'paso__marca' }, estado === 'hecho' ? crearIcono('check') : String(n)),
        h('span', { class: 'paso__nombre' }, nombre),
        estado === 'hecho' && h('span', { class: 'solo-lectores' }, ' (completado)'),
      );
    }),
  );
}

/** Dato con etiqueta, como "Matrícula 26000123". */
export function crearFicha(etiqueta, valor) {
  return h('div', { class: 'ficha' }, etiqueta, h('strong', {}, valor));
}

/** Ilustración decorativa de la portada: un campus muy tenue al fondo, en pixel art. */
export function crearFondoCampus() {
  const r = (x, y, w, hh, fill) => s('rect', { x, y, width: w, height: hh, fill });
  const techo = (x, y, ancho) => [
    r(x + 12, y - 12, ancho - 24, 12, '#0F4F4D'),
    r(x + 24, y - 24, ancho - 48, 12, '#0F4F4D'),
    r(x + 36, y - 36, Math.max(ancho - 72, 12), 12, '#0F4F4D'),
  ];
  const arbol = (x, y) => [
    r(x + 14, y + 36, 8, 14, '#0F4F4D'),
    r(x + 6, y, 24, 12, '#1E4A3E'),
    r(x, y + 12, 36, 12, '#1E4A3E'),
    r(x + 6, y + 24, 24, 12, '#1E4A3E'),
  ];
  return s(
    'svg',
    { class: 'fondo-campus', viewBox: '0 0 374 190', 'shape-rendering': 'crispEdges', 'aria-hidden': 'true', preserveAspectRatio: 'xMaxYMax meet' },
    r(0, 110, 374, 80, '#306255'),
    r(50, 60, 120, 70, '#16304B'),
    ...techo(50, 60, 120),
    r(100, 96, 20, 34, '#0A1828'),
    r(64, 76, 12, 12, '#1FA6A2'),
    r(144, 76, 12, 12, '#1FA6A2'),
    r(210, 40, 150, 90, '#16304B'),
    ...techo(210, 40, 150),
    r(272, 94, 26, 36, '#0A1828'),
    r(226, 56, 14, 14, '#1FA6A2'),
    r(334, 56, 14, 14, '#1FA6A2'),
    ...arbol(4, 78),
    ...arbol(330, 134),
    r(150, 146, 76, 24, '#1E3A57'),
    r(162, 152, 52, 12, '#1FA6A2'),
  );
}
