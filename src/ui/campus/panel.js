import { h } from '../../utils/dom.js';
import { CAMPUS } from '../../textos.js';
import { crearBoton } from '../componentes.js';

/** Ventana sencilla encima del juego (menú, insignias). Se cierra con Escape, con el botón o tocando afuera. */
export function crearPanel({ titulo, contenido, acciones = [], alCerrar, textoCerrar = CAMPUS.cerrar }) {
  const cerrar = crearBoton({ texto: textoCerrar, variante: 'secundario', onClick: alCerrar, foco: true });
  const el = h(
    'div',
    { class: 'panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'panel-titulo' },
    h(
      'div',
      { class: 'panel__caja' },
      h('h2', { id: 'panel-titulo', class: 'panel__titulo', tabindex: '-1' }, titulo),
      h('div', { class: 'panel__contenido' }, contenido),
      h('div', { class: 'acciones' }, ...acciones, cerrar),
    ),
  );
  el.addEventListener('pointerdown', (e) => {
    if (e.target === el) alCerrar();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') alCerrar();
  });
  return { el, enfocar: () => cerrar.focus() };
}
