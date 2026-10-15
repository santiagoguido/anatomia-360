import { h } from '../../utils/dom.js';
import { CONTROL as T, ERRORES } from '../../textos.js';
import { crearBoton } from '../componentes.js';
import { formatoCalificacion, formatoPuntos } from '../ronda/modelo.js';
import {
  insigniasConEstado, resumenGeneral, tarjetasAula, temasConResultados, temasParaRepasar, textoInsignias,
} from '../control/modelo.js';

const metrica = (etiqueta, valor) => h('div', { class: 'metrica' }, h('span', {}, etiqueta), h('strong', {}, valor));

const barra = (porcentaje, nivel) =>
  h('div', { class: 'ronda__barra', 'aria-hidden': 'true' }, h('div', { class: `ronda__barra-relleno control__nivel--${nivel}`, style: `width:${porcentaje ?? 0}%` }));

/**
 * Control Escolar: el expediente del propio alumno (récord, racha, resultados por aula y por tema, temas a repasar e
 * insignias). Cada alumno ve solo lo suyo; la lista completa para la docente llega en la Sesión 12.
 */
export function crearControl(ctx) {
  const jugador = ctx.estado.jugador;
  if (!jugador) return { redirigir: 'portada' };

  let cerrado = false;
  const cuerpo = h('div', { class: 'pagina__caja' });
  const el = h('section', { class: 'pantalla pagina', 'aria-label': 'Control Escolar' }, cuerpo);
  const volver = () => ctx.irA('campus');

  const encabezado = () =>
    h(
      'header',
      { class: 'pagina__cabecera' },
      h('button', { type: 'button', class: 'ronda__salir', onClick: volver }, T.volver),
      h('h1', { class: 'pagina__titulo', tabindex: '-1', 'data-foco': '' }, T.titulo),
    );

  const pie = () => h('div', { class: 'acciones acciones--fondo' }, crearBoton({ texto: T.volver, onClick: volver }));

  function mostrarMensaje(contenido) {
    cuerpo.replaceChildren(encabezado(), ...contenido, pie());
    cuerpo.querySelector('[data-foco]')?.focus({ preventScroll: true });
  }

  function pintar(datos) {
    const resumen = resumenGeneral(datos);
    const temas = temasConResultados(datos.por_tema);
    const repasar = temasParaRepasar(temas);
    const insignias = insigniasConEstado(datos.insignias);

    const secciones = [
      h('p', { class: 'pagina__sub' }, h('strong', {}, datos.nombre)),
      h(
        'div',
        { class: 'metricas metricas--cuatro' },
        metrica(T.recordTotal, formatoPuntos(datos.record_total)),
        metrica(T.racha, String(datos.racha_dias)),
        metrica(T.rondas, String(resumen.rondas)),
        metrica(T.aciertos, resumen.porcentaje === null ? '—' : `${resumen.porcentaje}%`),
      ),
    ];

    if (resumen.rondas === 0) secciones.push(h('p', { class: 'pagina__aviso' }, T.sinRondas));

    secciones.push(
      h(
        'section',
        { class: 'pagina__bloque' },
        h('h2', { class: 'pagina__subtitulo' }, T.porAula),
        h(
          'div',
          { class: 'aulas-resumen' },
          ...tarjetasAula(datos.por_aula).map((a) =>
            h(
              'article',
              { class: `aula-resumen${a.jugada ? '' : ' aula-resumen--vacia'}` },
              h('h3', { class: 'aula-resumen__titulo' }, T.aula(a.aula)),
              a.jugada
                ? h(
                    'dl',
                    { class: 'aula-resumen__datos' },
                    h('div', {}, h('dt', {}, T.record), h('dd', {}, formatoPuntos(a.record))),
                    h('div', {}, h('dt', {}, T.ultimo), h('dd', {}, formatoPuntos(a.ultimo))),
                    h('div', {}, h('dt', {}, T.mejorCalificacion), h('dd', {}, formatoCalificacion(a.mejorCalificacion))),
                    h('div', {}, h('dt', {}, T.rondas), h('dd', {}, String(a.rondas))),
                  )
                : h('p', { class: 'aula-resumen__vacio' }, T.aulaSinJugar),
            ),
          ),
        ),
      ),
      h(
        'section',
        { class: 'pagina__bloque' },
        h('h2', { class: 'pagina__subtitulo' }, T.porTema),
        h('p', { class: 'ayuda' }, T.porTemaAyuda),
        h(
          'ul',
          { class: 'temas' },
          ...temas.map((t) =>
            h(
              'li',
              { class: 'tema' },
              h(
                'div',
                { class: 'tema__fila' },
                h('span', {}, h('strong', {}, `A${t.aula} `), t.nombre),
                h('strong', {}, t.total ? `${t.porcentaje}% · ${t.aciertos}/${t.total}` : '—'),
              ),
              barra(t.porcentaje, t.nivel),
              h('span', { class: `control__etiqueta control__etiqueta--${t.nivel}` }, t.total ? T.niveles[t.nivel] : T.temaSinDatos),
            ),
          ),
        ),
      ),
      h(
        'section',
        { class: 'pagina__bloque' },
        h('h2', { class: 'pagina__subtitulo' }, T.repasar),
        h('p', { class: 'ayuda' }, T.repasarNota),
        repasar.length === 0
          ? h('p', { class: 'pagina__aviso' }, T.nadaQueRepasar)
          : h('ol', { class: 'repasar' }, ...repasar.map((t) => h('li', {}, h('strong', {}, t.nombre), h('span', {}, `Aula ${t.aula} · ${t.porcentaje}% de aciertos (${t.aciertos}/${t.total})`)))),
      ),
      h(
        'section',
        { class: 'pagina__bloque' },
        h('h2', { class: 'pagina__subtitulo' }, T.insignias),
        h('p', { class: 'ayuda' }, textoInsignias(insignias)),
        h(
          'ul',
          { class: 'insignias' },
          ...insignias.map((i) =>
            h(
              'li',
              { class: `insignia${i.ganada ? ' insignia--ganada' : ''}` },
              h('strong', {}, i.nombre),
              h('span', {}, i.descripcion),
              h('em', {}, i.ganada ? T.ganada : T.porGanar),
            ),
          ),
        ),
      ),
      h('p', { class: 'ayuda pagina__nota' }, T.privado),
    );
    mostrarMensaje(secciones);
  }

  async function cargar() {
    mostrarMensaje([h('p', { class: 'pagina__aviso', role: 'status' }, T.cargando)]);
    try {
      const datos = await ctx.api.controlEscolar(jugador.matricula);
      if (cerrado) return;
      if (!datos) throw Object.assign(new Error('sin jugador'), { codigo: 'jugador_no_encontrado' });
      pintar(datos);
    } catch (e) {
      if (cerrado) return;
      mostrarMensaje([
        h('p', { class: 'error', role: 'alert' }, ERRORES[e.codigo] ?? ERRORES.servidor),
        h('div', { class: 'acciones' }, crearBoton({ texto: 'Reintentar', onClick: cargar })),
      ]);
    }
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
