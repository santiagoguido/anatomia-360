import { h } from '../../utils/dom.js';
import { ERRORES, SALON as T } from '../../textos.js';
import { crearBoton } from '../componentes.js';
import { formatoPuntos } from '../ronda/modelo.js';
import {
  estadoSalon, filasTop10, listaGanadores, mensajeAntes, mensajeMiLugar, opcionesSemana, textoJugadores, textoVacio,
} from '../salon/modelo.js';

/**
 * Salón de la Fama: Top 10 de la semana (con la hora y la semana que manda el servidor), la posición del jugador
 * y los ganadores de las semanas ya terminadas. Se ven nombres y matrículas con los primeros números ocultos.
 */
export function crearSalon(ctx) {
  const jugador = ctx.estado.jugador;
  if (!jugador) return { redirigir: 'portada' };

  let cerrado = false;
  let datos = null;
  let pestana = 'top10';
  let cargando = true;
  let errorCodigo = null;

  const cuerpo = h('div', { class: 'pagina__caja' });
  const el = h('section', { class: 'pantalla pagina', 'aria-label': 'Salón de la Fama' }, cuerpo);

  const volver = () => ctx.irA('campus');

  async function cargar(semana = null) {
    cargando = true;
    errorCodigo = null;
    pintar();
    try {
      const r = await ctx.api.salonDeLaFama({ matricula: jugador.matricula, semana });
      if (cerrado) return;
      datos = r;
    } catch (e) {
      if (cerrado) return;
      errorCodigo = e.codigo ?? 'servidor';
    }
    cargando = false;
    pintar();
  }

  const encabezado = () =>
    h(
      'header',
      { class: 'pagina__cabecera' },
      h('button', { type: 'button', class: 'ronda__salir', onClick: volver }, T.volver),
      h('h1', { class: 'pagina__titulo', tabindex: '-1', 'data-foco': '' }, T.titulo),
    );

  function filaTop(f) {
    return h(
      'li',
      { class: `top__fila${f.es_tuyo ? ' top__fila--tuyo' : ''}`, 'aria-current': f.es_tuyo ? 'true' : null },
      h('span', { class: `top__lugar${f.medalla ? ` top__lugar--${f.medalla}` : ''}` }, String(f.posicion)),
      h('span', { class: 'top__nombre' }, h('strong', {}, f.nombre), f.es_tuyo && h('span', { class: 'top__tu' }, T.tu), h('span', { class: 'top__matricula' }, f.matricula_oculta)),
      h('span', { class: 'top__puntos' }, formatoPuntos(f.puntaje)),
    );
  }

  function panelTop10() {
    const estado = estadoSalon(datos);
    if (estado === 'vacio') return [h('p', { class: 'pagina__aviso' }, textoVacio(datos))];
    const mio = mensajeMiLugar(datos);
    return [
      h('p', { class: 'ayuda pagina__sub' }, textoJugadores(datos)),
      h(
        'ol',
        { class: 'top', 'aria-label': 'Top 10' },
        h('li', { class: 'top__encabezado', 'aria-hidden': 'true' }, h('span', {}, T.columnas.lugar), h('span', {}, T.columnas.nombre), h('span', {}, T.columnas.puntos)),
        ...filasTop10(datos.top10).map(filaTop),
      ),
      h('p', { class: `pagina__mi-lugar pagina__mi-lugar--${mio.tono}`, role: 'status' }, mio.texto),
    ];
  }

  function panelGanadores() {
    const lista = listaGanadores(datos.ganadores);
    return [
      h('h2', { class: 'pagina__subtitulo' }, T.ganadoresTitulo),
      lista.length === 0
        ? h('p', { class: 'pagina__aviso' }, T.sinGanadores)
        : h(
            'ul',
            { class: 'ganadores' },
            ...lista.map((g) =>
              h(
                'li',
                { class: `ganador${g.es_tuyo ? ' ganador--tuyo' : ''}` },
                h('span', { class: 'ganador__semana' }, g.titulo),
                h('strong', { class: 'ganador__nombre' }, g.nombre, g.es_tuyo && h('span', { class: 'top__tu' }, T.tu)),
                h('span', { class: 'top__matricula' }, g.matricula_oculta),
                h('span', { class: 'ganador__puntos' }, `${formatoPuntos(g.puntaje)} pts`),
                g.es_tuyo && h('span', { class: 'ganador__tuyo' }, T.ganadorTuyo),
              ),
            ),
          ),
    ];
  }

  function cuerpoActivo() {
    const semanas = opcionesSemana(datos);
    return [
      h(
        'div',
        { class: 'semanas', role: 'group', 'aria-label': T.semanasAria },
        ...semanas.map((s) =>
          h(
            'button',
            { type: 'button', class: `semana${s.seleccionada ? ' semana--activa' : ''}`, 'aria-pressed': String(s.seleccionada), onClick: () => cargar(s.lunes) },
            h('strong', {}, s.etiqueta),
            h('span', {}, s.actual ? T.semanaActual : s.fecha),
          ),
        ),
      ),
      h(
        'div',
        { class: 'pestanas', role: 'group' },
        ...['top10', 'ganadores'].map((id) =>
          h('button', { type: 'button', class: `pestana${pestana === id ? ' pestana--activa' : ''}`, 'aria-pressed': String(pestana === id), onClick: () => { pestana = id; pintar(); } }, T.pestanas[id]),
        ),
      ),
      ...(pestana === 'top10' ? panelTop10() : panelGanadores()),
      h('p', { class: 'ayuda pagina__nota' }, T.nota),
    ];
  }

  function pintar() {
    let contenido;
    if (cargando && !datos) contenido = [h('p', { class: 'pagina__aviso', role: 'status' }, T.cargando)];
    else if (errorCodigo) {
      contenido = [
        h('p', { class: 'error', role: 'alert' }, ERRORES[errorCodigo] ?? ERRORES.servidor),
        h('div', { class: 'acciones' }, crearBoton({ texto: T.actualizar, onClick: () => cargar(datos?.semana ?? null) })),
      ];
    } else if (datos.estado === 'antes') contenido = [h('p', { class: 'pagina__aviso' }, mensajeAntes(datos))];
    else contenido = cuerpoActivo();

    const pie = h(
      'div',
      { class: 'acciones acciones--fondo' },
      datos && !errorCodigo && datos.estado === 'activo' && crearBoton({ texto: T.actualizar, variante: 'secundario', onClick: () => cargar(datos.semana) }),
      crearBoton({ texto: T.volver, onClick: volver }),
    );
    const antes = cuerpo.contains(document.activeElement) ? document.activeElement : null;
    cuerpo.replaceChildren(encabezado(), ...contenido, pie);
    if (cargando) cuerpo.setAttribute('aria-busy', 'true');
    else cuerpo.removeAttribute('aria-busy');
    if (!antes) cuerpo.querySelector('[data-foco]')?.focus({ preventScroll: true });
  }

  return {
    el,
    alMontar() {
      cargar();
    },
    alSalir() {
      cerrado = true;
    },
  };
}
