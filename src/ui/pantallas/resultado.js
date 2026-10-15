import { h } from '../../utils/dom.js';
import { RESULTADO } from '../../textos.js';
import { crearBoton } from '../componentes.js';
import {
  LETRAS, formatoCalificacion, formatoPuntos, formatoSegundos, mensajeRecord, mensajeSalon, nombreInsignia, porcentaje, tituloResultado,
} from '../ronda/modelo.js';

const metrica = (etiqueta, valor) => h('div', { class: 'metrica' }, h('span', {}, etiqueta), h('strong', {}, valor));

function tarjetaRevision(item, numero, abierta) {
  const opciones = item.opciones.map((texto, i) => {
    const esCorrecta = i === item.correcta;
    const esElegida = i === item.elegida;
    return h(
      'li',
      { class: `revision__opcion${esCorrecta ? ' revision__opcion--correcta' : ''}${esElegida ? ' revision__opcion--elegida' : ''}` },
      h('span', { class: 'ronda__letra', 'aria-hidden': 'true' }, LETRAS[i]),
      h('span', { class: 'revision__texto' }, texto),
      esCorrecta && h('span', { class: 'revision__etiqueta' }, RESULTADO.correcta),
      esElegida && !esCorrecta && h('span', { class: 'revision__etiqueta revision__etiqueta--mal' }, RESULTADO.tuRespuesta),
    );
  });
  return h(
    'details',
    { class: 'revision', open: abierta },
    h('summary', {}, h('strong', {}, RESULTADO.pregunta(numero)), item.elegida === null ? h('span', { class: 'revision__sin' }, RESULTADO.sinContestar) : null),
    h(
      'div',
      { class: 'revision__cuerpo' },
      h('p', { class: 'revision__enunciado' }, item.enunciado),
      h('ul', { class: 'revision__opciones' }, ...opciones),
      h('p', { class: 'revision__explicacion' }, h('strong', {}, `${RESULTADO.porQue}: `), item.explicacion),
      item.cita && h('p', { class: 'revision__fuente' }, h('strong', {}, `${RESULTADO.fuente}: `), item.cita),
    ),
  );
}

/** Retroalimentación al terminar una ronda: calificación, puntos, récord, desempeño por tema y revisión de las falladas. */
export function crearResultado(ctx, { resumen } = {}) {
  if (!ctx.estado.jugador) return { redirigir: 'portada' };
  if (!resumen) return { redirigir: 'campus' };

  const record = mensajeRecord(resumen.record);
  const insignias = resumen.insignias_nuevas ?? [];

  const el = h(
    'section',
    { class: 'pantalla resultado', 'aria-label': RESULTADO.titulo },
    h(
      'div',
      { class: 'resultado__caja' },
      resumen.modo_pruebas && h('p', { class: 'ronda__modo-pruebas', role: 'alert' }, 'MODO DE PRUEBAS DEL SERVIDOR ACTIVO. Esto no debe verse en producción.'),
      h('header', { class: 'resultado__encabezado' },
        h('p', { class: 'ronda__aula' }, `AULA ${resumen.aula}`),
        h('h1', { class: 'resultado__titulo', tabindex: '-1', 'data-foco': '' }, tituloResultado(resumen.aciertos, resumen.total)),
      ),
      h(
        'div',
        { class: 'resultado__nota' },
        h('strong', { class: 'resultado__calificacion' }, formatoCalificacion(resumen.calificacion)),
        h('span', {}, RESULTADO.sobreDiez),
        h('p', {}, RESULTADO.aciertos(resumen.aciertos, resumen.total)),
      ),
      h(
        'div',
        { class: 'metricas metricas--tres' },
        metrica(RESULTADO.puntos, formatoPuntos(resumen.puntaje)),
        metrica(RESULTADO.tiempoPromedio, formatoSegundos(resumen.tiempo_promedio_ms)),
        metrica(RESULTADO.rachaMax, String(resumen.racha_max)),
      ),
      h(
        'div',
        { class: `resultado__record resultado__record--${record.tono}`, role: 'status' },
        h('p', {}, record.texto),
        h('p', { class: 'resultado__record-detalle' },
          `${RESULTADO.record.estaRonda}: ${formatoPuntos(resumen.puntaje)} · ${RESULTADO.record.tuRecord}: ${formatoPuntos(resumen.record.nuevo)}`),
      ),
      h('p', { class: 'ayuda resultado__salon' }, mensajeSalon(resumen.salon)),
      insignias.length > 0 &&
        h('section', { class: 'resultado__bloque' },
          h('h2', { class: 'resultado__subtitulo' }, RESULTADO.insigniasNuevas),
          h('ul', { class: 'chips chips--insignias' }, ...insignias.map((id) => h('li', {}, nombreInsignia(id))))),
      h(
        'section',
        { class: 'resultado__bloque' },
        h('h2', { class: 'resultado__subtitulo' }, RESULTADO.porTema),
        h(
          'ul',
          { class: 'temas' },
          ...resumen.por_tema.map((t) =>
            h('li', { class: 'tema' },
              h('div', { class: 'tema__fila' }, h('span', {}, t.nombre), h('strong', {}, `${t.aciertos}/${t.total}`)),
              h('div', { class: 'ronda__barra', 'aria-hidden': 'true' }, h('div', { class: 'ronda__barra-relleno', style: `width:${porcentaje(t.aciertos, t.total)}%` })),
            ),
          ),
        ),
      ),
      h(
        'section',
        { class: 'resultado__bloque' },
        h('h2', { class: 'resultado__subtitulo' }, RESULTADO.revision),
        resumen.revision.length === 0
          ? h('p', { class: 'resultado__perfecta' }, RESULTADO.sinErrores)
          : h('div', { class: 'revisiones' }, ...resumen.revision.map((item, i) => tarjetaRevision(item, item.indice + 1, i === 0))),
      ),
      h(
        'div',
        { class: 'acciones acciones--fondo' },
        crearBoton({ texto: RESULTADO.otraRonda, onClick: () => ctx.irA('ronda', { aula: resumen.aula }) }),
        crearBoton({ texto: RESULTADO.volverCampus, variante: 'secundario', onClick: () => ctx.irA('campus') }),
      ),
    ),
  );

  return { el };
}
