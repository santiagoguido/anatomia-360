import { h } from '../../utils/dom.js';
import { CAMPUS } from '../../textos.js';
import { vectorJoystick } from '../../game/entrada.js';

/** Joystick táctil (también responde al mouse). Llama a `alCambiar({ x, y, fuerza })` al moverse y con fuerza 0 al soltar. */
export function crearJoystick({ alCambiar }) {
  const palanca = h('div', { class: 'joystick__palanca' });
  const el = h('div', { class: 'joystick', role: 'application', 'aria-label': CAMPUS.joystick }, palanca);

  let punteroId = null;
  let centro = { x: 0, y: 0 };
  let radio = 36;

  const llevar = (e) => {
    const dx = e.clientX - centro.x;
    const dy = e.clientY - centro.y;
    const dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(dist, radio) / dist;
    palanca.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    alCambiar(vectorJoystick(dx, dy, radio));
  };

  const soltar = (e) => {
    if (e.pointerId !== punteroId) return;
    punteroId = null;
    palanca.style.transform = '';
    el.classList.remove('joystick--activo');
    alCambiar({ x: 0, y: 0, fuerza: 0 });
  };

  el.addEventListener('pointerdown', (e) => {
    if (punteroId !== null) return;
    punteroId = e.pointerId;
    el.setPointerCapture(e.pointerId);
    const caja = el.getBoundingClientRect();
    centro = { x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 };
    radio = caja.width * 0.35;
    el.classList.add('joystick--activo');
    llevar(e);
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId === punteroId) llevar(e);
  });
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  return { el };
}
