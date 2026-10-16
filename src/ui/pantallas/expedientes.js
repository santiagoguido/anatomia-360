import { h } from '../../utils/dom.js';
import { CLINICA_UI as T, ERRORES } from '../../textos.js';
import { esReintentable } from '../../api/errores.js';
import { crearBoton } from '../componentes.js';
import { crearEsquema, leyenda } from '../clinica/esquemas.js';
import { formatoPuntos } from '../clinica/modelo.js';

/** Los casos que el jugador ya resolvió, con su desenlace (el servidor manda el contenido: aquí no hay respuestas guardadas). */
export function crearExpedientes(ctx) {
  const jugador = ctx.estado.jugador;
  if (!jugador) return { redirigir: 'portada' };
  const E = T.expedientesPantalla;
  let cerrado = false;

  const cuerpo = h('div', { class: 'ronda__caja clinica__caja' });
  const el = h('section', { class: 'pantalla ronda clinica', 'aria-label': E.titulo }, cuerpo);
  const volver = () => ctx.irA('clinica');

  const cabecera = () =>
    h('header', { class: 'ronda__cabecera' }, h('button', { type: 'button', class: 'ronda__salir', onClick: volver }, T.salir), h('h1', { class: 'ronda__aula', tabindex: '-1', 'data-foco': '' }, E.titulo));

  function mensaje(texto, aviso, acciones = []) {
    cuerpo.replaceChildren(cabecera(), h('p', { class: aviso ? 'error' : 'ronda__estado-texto', role: aviso ? 'alert' : 'status' }, texto), acciones.length ? h('div', { class: 'acciones' }, ...acciones) : null);
  }

  function tarjeta(e) {
    return h(
      'details',
      { class: 'revision' },
      h('summary', {}, h('strong', {}, e.titulo), h('span', { class: 'revision__sin' }, `${E.semana(e.semana)} · ${E.puntos(formatoPuntos(e.puntos))}`)),
      h(
        'div',
        { class: 'revision__cuerpo' },
        h('p', { class: 'clinica__ficha' }, h('strong', {}, e.paciente.nombre), ` · ${e.paciente.edad} · ${e.paciente.ocupacion}`),
        h('p', {}, h('strong', {}, `${T.motivo}: `), e.motivo),
        h('figure', { class: 'clinica__esquema' }, crearEsquema(e.esquema), h('figcaption', {}, e.esquema.pie, leyenda(e.esquema).length ? h('ul', { class: 'clinica__leyenda' }, ...leyenda(e.esquema).map((l) => h('li', {}, l.nombre))) : null)),
        h('p', { class: 'revision__explicacion' }, e.explicacion),
        h('p', { class: 'revision__fuente' }, h('strong', {}, `${T.fuente}: `), e.cita),
      ),
    );
  }

  async function cargar() {
    mensaje(E.cargando, false);
    try {
      let r = null;
      for (let intento = 1; !r; intento++) {
        try {
          r = await ctx.api.expedientes({ matricula: jugador.matricula });
        } catch (e) {
          if (!esReintentable(e.codigo) || intento >= 3) throw e;
          await new Promise((ok) => setTimeout(ok, 700 * intento));
        }
      }
      if (cerrado) return;
      if (!r.expedientes.length) return mensaje(E.vacio, false, [crearBoton({ texto: T.volverCampus, variante: 'secundario', onClick: volver })]);
      cuerpo.replaceChildren(cabecera(), ...r.expedientes.map(tarjeta), h('div', { class: 'acciones acciones--fondo' }, crearBoton({ texto: T.volverCampus, variante: 'secundario', onClick: volver })));
      cuerpo.querySelector('[data-foco]')?.focus({ preventScroll: true });
    } catch (e) {
      if (!cerrado) mensaje(ERRORES[e.codigo] ?? ERRORES.servidor, true, [crearBoton({ texto: T.reintentar, onClick: cargar }), crearBoton({ texto: T.volverCampus, variante: 'secundario', onClick: volver })]);
    }
  }

  return { el, alMontar: cargar, alSalir() { cerrado = true; } };
}
