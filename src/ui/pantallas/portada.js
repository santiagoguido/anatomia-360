import { h } from '../../utils/dom.js';
import { AVISO_MATRICULA, ERRORES } from '../../textos.js';
import { crearBoton, crearFondoCampus, crearIcono } from '../componentes.js';

export function crearPortada(ctx) {
  const el = h(
    'section',
    { class: 'pantalla portada', 'aria-labelledby': 'portada-titulo' },
    h('div', { class: 'portada__fondo', 'aria-hidden': 'true' }, crearFondoCampus()),
    h(
      'div',
      { class: 'portada__cuerpo' },
      h(
        'div',
        { class: 'portada__principal' },
        h('p', { class: 'etiqueta' }, h('span', { class: 'etiqueta__marca' }), 'ANATOMÍA HUMANA · SEGUNDO PARCIAL'),
        h('h1', { id: 'portada-titulo', class: 'titulo', tabindex: '-1' }, 'Anatomía ', h('span', { class: 'titulo__numero' }, '360')),
        h(
          'p',
          { class: 'portada__texto' },
          'Recorre el campus, entra a las aulas y resuelve casos en la clínica. Cuello y miembros, del 19 de octubre al 27 de noviembre.',
        ),
        h(
          'ul',
          { class: 'datos' },
          h('li', {}, h('strong', {}, '6'), ' aulas'),
          h('li', {}, h('strong', {}, '1'), ' clínica'),
          h('li', {}, h('strong', {}, 'Top 10'), ' semanal'),
        ),
        !ctx.configurado && h('p', { class: 'aviso-config', role: 'status' }, ERRORES.sin_configuracion),
        h(
          'div',
          { class: 'acciones' },
          crearBoton({ texto: 'Comenzar', foco: true, onClick: () => ctx.irA('registro') }),
          crearBoton({ texto: 'Cómo se juega', variante: 'secundario', onClick: () => ctx.irA('privacidad', { modo: 'consulta' }) }),
        ),
      ),
      h(
        'aside',
        { class: 'tarjeta', 'aria-labelledby': 'tarjeta-titulo' },
        h('div', { class: 'tarjeta__icono' }, crearIcono('trofeo')),
        h('h2', { id: 'tarjeta-titulo', class: 'tarjeta__titulo' }, AVISO_MATRICULA.titulo),
        h('p', { class: 'tarjeta__texto' }, AVISO_MATRICULA.antes, h('strong', {}, AVISO_MATRICULA.enfasis), AVISO_MATRICULA.despues),
        h('p', { class: 'tarjeta__nota' }, AVISO_MATRICULA.calendario),
      ),
    ),
  );
  return { el };
}
