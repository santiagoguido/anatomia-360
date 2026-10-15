import { h } from '../../utils/dom.js';
import { CAMPUS } from '../../textos.js';
import { CAMINOS, EDIFICIOS, ESTANQUES, MUNDO, PANTALLA, PANTALLAS, PLAZA, TILE } from '../../game/mapa.js';

const COLOR = {
  pasto: '#174230', camino: '#7a6c52', plaza: '#8a7a5e', agua: '#1b5e6b',
  aulaAbierta: '#178582', aulaCerrada: '#2e4a66', clinica: '#e8dcc6', salon: '#bfa181', control: '#bfa181', deco: '#16304b',
};

/** Minimapa del campus completo: 1 píxel por tile (156 × 72). Muestra edificios, aulas abiertas, al jugador y lo que se ve en pantalla. */
export function crearMinimapa() {
  const lienzo = h('canvas', { class: 'minimapa__lienzo', width: MUNDO.w, height: MUNDO.h, 'aria-hidden': 'true' });
  const el = h(
    'div',
    { class: 'minimapa', role: 'img', 'aria-label': CAMPUS.mapaAria },
    h('span', { class: 'minimapa__titulo' }, CAMPUS.mapa),
    lienzo,
  );
  const ctx = lienzo.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const base = document.createElement('canvas');
  base.width = MUNDO.w;
  base.height = MUNDO.h;
  const b = base.getContext('2d');

  let abiertas = new Map();
  let ultimo = null;

  const relleno = (color, r) => {
    b.fillStyle = color;
    b.fillRect(r.x, r.y, r.w, r.h);
  };

  function pintarBase() {
    b.fillStyle = COLOR.pasto;
    b.fillRect(0, 0, MUNDO.w, MUNDO.h);
    for (const c of CAMINOS) relleno(COLOR.camino, c);
    relleno(COLOR.plaza, PLAZA);
    for (const e of ESTANQUES) relleno(COLOR.agua, e);
    for (const e of EDIFICIOS) {
      let color = COLOR[e.tipo];
      if (e.tipo === 'aula') color = abiertas.get(e.numero) ? COLOR.aulaAbierta : COLOR.aulaCerrada;
      relleno(color, e);
    }
    // Líneas tenues entre pantallas: se ve que el campus es de 3 × 3.
    b.fillStyle = 'rgba(255,255,255,0.1)';
    for (let c = 1; c < PANTALLAS.columnas; c += 1) b.fillRect(c * PANTALLA.w, 0, 1, MUNDO.h);
    for (let f = 1; f < PANTALLAS.filas; f += 1) b.fillRect(0, f * PANTALLA.h, MUNDO.w, 1);
  }

  function dibujar() {
    ctx.drawImage(base, 0, 0);
    if (!ultimo) return;
    const { x, y, vista } = ultimo;
    if (vista) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(vista.x / TILE) + 0.5, Math.round(vista.y / TILE) + 0.5, Math.round(vista.w / TILE), Math.round(vista.h / TILE));
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(x / TILE) - 1, Math.round(y / TILE) - 1, 3, 3);
    ctx.fillStyle = '#0a1828';
    ctx.fillRect(Math.round(x / TILE), Math.round(y / TILE), 1, 1);
  }

  pintarBase();
  dibujar();

  return {
    el,
    /** Posición del jugador y rectángulo que se ve en pantalla, en píxeles del mundo. */
    actualizar(datos) {
      ultimo = datos;
      dibujar();
    },
    /** Pinta de turquesa las aulas abiertas. `estado` = Map(numero de aula → abierta). */
    marcarAulas(estado) {
      abiertas = new Map(estado);
      pintarBase();
      dibujar();
    },
  };
}
