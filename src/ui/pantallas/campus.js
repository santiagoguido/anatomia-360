import { h } from '../../utils/dom.js';
import { crearBoton, crearIcono } from '../componentes.js';

function dato(icono, etiqueta, valor) {
  return h(
    'div',
    { class: 'hud__dato' },
    crearIcono(icono),
    h('span', { class: 'solo-lectores' }, etiqueta),
    h('strong', {}, String(valor)),
  );
}

/** Pantalla del campus: el lienzo de Phaser más la barra superior (HUD) en HTML. */
export function crearCampus(ctx) {
  const jugador = ctx.estado.jugador;
  if (!jugador) return { redirigir: 'portada' };

  let juego = null;
  let cerrado = false;

  const contenedor = h('div', { class: 'campus__juego', id: 'juego' });
  const estadoCarga = h('div', { class: 'campus__estado', role: 'status' }, 'Cargando el campus…');

  const salir = () => {
    ctx.almacen.borrar();
    ctx.estado.cerrarSesion();
    ctx.irA('portada');
  };

  const cargar = async () => {
    estadoCarga.replaceChildren('Cargando el campus…');
    estadoCarga.hidden = false;
    try {
      const controlador = await ctx.iniciarJuego(contenedor, { jugador });
      if (cerrado) return controlador.destruir();
      juego = controlador;
      estadoCarga.hidden = true;
    } catch {
      if (cerrado) return;
      estadoCarga.replaceChildren(
        h('p', {}, 'No se pudo cargar el campus. Revisa tu internet e inténtalo de nuevo.'),
        crearBoton({ texto: 'Reintentar', onClick: cargar }),
      );
    }
  };

  const el = h(
    'section',
    { class: 'pantalla campus', 'aria-label': 'Campus' },
    contenedor,
    h(
      'header',
      { class: 'hud' },
      h('h1', { class: 'hud__nombre', tabindex: '-1', 'data-foco': '' }, jugador.nombre),
      dato('estrella', 'Puntos totales', jugador.record_total),
      dato('llama', 'Racha de días', jugador.racha_dias),
      dato('medalla', 'Insignias', jugador.insignias?.length ?? 0),
      crearBoton({ texto: 'Salir', variante: 'secundario', onClick: salir }),
    ),
    estadoCarga,
    h('div', { class: 'campus__girar' }, h('p', {}, 'Gira tu celular para jugar en horizontal.')),
  );

  return {
    el,
    alMontar: cargar,
    alSalir() {
      cerrado = true;
      juego?.destruir();
      juego = null;
    },
  };
}
