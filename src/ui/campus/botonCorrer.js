import { h } from '../../utils/dom.js';
import { CAMPUS } from '../../textos.js';
import { MOVIMIENTO } from '../../config.js';

/** Botón CORRER: se mantiene presionado. Las barritas muestran cuánta resistencia queda. */
export function crearBotonCorrer({ alCambiar }) {
  const barras = Array.from({ length: MOVIMIENTO.resistencia.barras }, () =>
    h('span', { class: 'correr__barra correr__barra--encendida' }),
  );
  const el = h(
    'button',
    { type: 'button', class: 'correr', 'aria-label': CAMPUS.correrAria },
    h('span', { class: 'correr__texto' }, CAMPUS.correr),
    h('span', { class: 'correr__barras', 'aria-hidden': 'true' }, ...barras),
  );

  let punteroId = null;
  const soltar = (e) => {
    if (e.pointerId !== punteroId) return;
    punteroId = null;
    el.classList.remove('correr--presionado');
    alCambiar(false);
  };

  el.addEventListener('pointerdown', (e) => {
    if (punteroId !== null) return;
    punteroId = e.pointerId;
    el.setPointerCapture(e.pointerId);
    el.classList.add('correr--presionado');
    alCambiar(true);
    e.preventDefault();
  });
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    el,
    /** `encendidas` = barras con resistencia; `agotada` = no se puede correr hasta recuperar. */
    mostrar(encendidas, agotada) {
      barras.forEach((b, i) => b.classList.toggle('correr__barra--encendida', i < encendidas));
      el.classList.toggle('correr--agotada', agotada);
    },
  };
}
