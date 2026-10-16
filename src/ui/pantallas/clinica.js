import { h } from '../../utils/dom.js';
import { CLINICA_UI as T, ERRORES } from '../../textos.js';
import { esReintentable } from '../../api/errores.js';
import { crearBoton } from '../componentes.js';
import { crearAvatar } from '../sprites.js';
import { crearPanel } from '../campus/panel.js';
import { crearEsquema, leyenda } from '../clinica/esquemas.js';
import { LETRAS } from '../ronda/modelo.js';
import { estadoExploracion, formatoPuntos, mensajeMejor, mensajeSalon, metricasClinica, nombreInsignia, textoPaso } from '../clinica/modelo.js';

const INTENTOS = 3; // por llamada al servidor (todas las operaciones de la guardia se pueden repetir sin riesgo)
const ESPERA_INTENTO_MS = 700;
const PAUSA_RESPUESTA_MS = 1100;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const metrica = (etiqueta, valor) => h('div', { class: 'metrica' }, h('span', {}, etiqueta), h('strong', {}, valor));

/**
 * Pantalla de la Clínica: sala de guardia (inicio), los 5 pacientes y el resumen de la guardia.
 * Esta pantalla NO conoce las respuestas, las pistas ni el desenlace hasta que el servidor los manda, y no calcula puntos:
 * manda cada acción al servidor y dibuja lo que él contesta. Salir a mitad de guardia la anula.
 */
export function crearClinica(ctx) {
  const jugador = ctx.estado.jugador;
  if (!jugador) return { redirigir: 'portada' };

  let cerrado = false;
  let guardiaId = null;
  let vista = null;
  let ocupado = false;
  let pausa = null;
  let panel = null;
  let disparador = null;

  const cuerpo = h('div', { class: 'ronda__caja clinica__caja' });
  const el = h('section', { class: 'pantalla ronda clinica', 'aria-label': 'Clínica' }, cuerpo);

  const volverAlCampus = () => ctx.irA('campus');

  // ---- Utilidades ----------------------------------------------------------------------------------------------

  function pantallaMensaje({ texto, aviso = false, acciones = [] }) {
    cuerpo.replaceChildren(
      h(
        'div',
        { class: 'ronda__estado', role: aviso ? 'alert' : 'status' },
        h('h1', { class: 'ronda__estado-titulo', tabindex: '-1', 'data-foco': '' }, T.titulo),
        h('p', { class: aviso ? 'error' : 'ronda__estado-texto' }, texto),
        acciones.length ? h('div', { class: 'acciones' }, ...acciones) : null,
      ),
    );
    cuerpo.querySelector('[data-foco]')?.focus({ preventScroll: true });
  }

  function mostrarError(codigo, reintentar) {
    ocupado = false;
    pantallaMensaje({
      texto: ERRORES[codigo] ?? ERRORES.servidor,
      aviso: true,
      acciones: [
        reintentar && crearBoton({ texto: T.reintentar, onClick: reintentar }),
        crearBoton({ texto: T.volverCampus, variante: 'secundario', onClick: reintentar ? () => (guardiaId ? volverAlCampus() : mostrarSala()) : volverAlCampus }),
      ],
    });
  }

  async function conReintentos(llamada) {
    for (let intento = 1; ; intento++) {
      try {
        return await llamada();
      } catch (e) {
        if (cerrado) return null;
        if (!esReintentable(e.codigo) || intento >= INTENTOS) throw e;
        await esperar(ESPERA_INTENTO_MS * intento);
      }
    }
  }

  /** Ejecuta una acción del servidor y maneja el error igual en todas: reintento automático y pantalla de error si no se puede. */
  async function accion(llamada, alExito) {
    if (ocupado) return;
    ocupado = true;
    const repetir = async () => {
      try {
        const r = await conReintentos(llamada);
        if (cerrado || !r) return;
        ocupado = false;
        alExito(r);
      } catch (e) {
        if (!cerrado) mostrarError(e.codigo, esReintentable(e.codigo) ? () => { ocupado = true; repetir(); } : null);
      }
    };
    await repetir();
  }

  // ---- Sala de guardia (inicio) -------------------------------------------------------------------------------------

  function mostrarSala() {
    guardiaId = null;
    vista = null;
    const { mejor, expedientes } = metricasClinica(ctx.estado.jugador);
    cuerpo.replaceChildren(
      h('header', { class: 'ronda__cabecera' }, h('h1', { class: 'ronda__aula', tabindex: '-1', 'data-foco': '' }, T.titulo)),
      h(
        'div',
        { class: 'clinica__doctora' },
        crearAvatar('femenino'),
        h(
          'div',
          { class: 'clinica__dialogo' },
          h('p', { class: 'clinica__nombre' }, h('strong', {}, T.doctora), ` · ${T.rol}`),
          ...T.intro.map((l) => h('p', {}, l)),
        ),
      ),
      h('ul', { class: 'clinica__reglas' }, ...T.reglas.map((r) => h('li', {}, r))),
      h('div', { class: 'metricas' }, metrica(T.mejorGuardia, mejor > 0 ? formatoPuntos(mejor) : '—'), metrica(T.expedientes, String(expedientes))),
      h(
        'div',
        { class: 'acciones acciones--fondo' },
        crearBoton({ texto: T.iniciar, onClick: iniciar }),
        crearBoton({ texto: T.verExpedientes, variante: 'secundario', onClick: () => ctx.irA('expedientes') }),
        crearBoton({ texto: T.volverCampus, variante: 'secundario', onClick: volverAlCampus }),
      ),
    );
    cuerpo.querySelector('[data-foco]')?.focus({ preventScroll: true });
  }

  function iniciar() {
    pantallaMensaje({ texto: T.cargando });
    accion(
      () => ctx.api.iniciarGuardia({ matricula: jugador.matricula }),
      (r) => {
        guardiaId = r.guardia_id;
        vista = r.vista;
        mostrarCaso();
      },
    );
  }

  // ---- Un paciente ------------------------------------------------------------------------------------------------------

  const aplicarVista = (v) => {
    vista = v;
    mostrarCaso();
  };

  function bloquePaciente() {
    const p = vista.paciente;
    return h(
      'div',
      { class: 'clinica__paciente' },
      h('p', { class: 'clinica__ficha' }, h('strong', {}, p.nombre), ` · ${p.edad} · ${p.ocupacion}`),
      h(
        'div',
        { class: 'clinica__doctora clinica__doctora--corta' },
        crearAvatar('femenino'),
        h('div', { class: 'clinica__dialogo' }, h('p', { class: 'clinica__nombre' }, h('strong', {}, T.doctora)), ...vista.presentacion.map((l) => h('p', {}, l))),
      ),
      h('p', { class: 'clinica__motivo' }, h('strong', {}, `${T.motivo}: `), vista.motivo),
    );
  }

  function bloqueExploracion() {
    const est = estadoExploracion(vista);
    const botones = vista.exploraciones.map((e) =>
      h(
        'button',
        {
          type: 'button',
          class: `clinica__explorar${e.hecha ? ' clinica__explorar--hecha' : ''}`,
          'aria-pressed': e.hecha ? 'true' : 'false',
          disabled: vista.hecho || null,
          onClick: () => explorar(e.id),
        },
        T.exploraciones[e.id],
      ),
    );
    const hallazgos = vista.exploraciones.filter((e) => e.hecha);
    return h(
      'section',
      { class: 'clinica__exploracion', 'aria-label': T.explorar },
      h('h2', { class: 'clinica__subtitulo' }, T.explorar),
      h('p', { class: `clinica__ayuda${est.conBono ? '' : ' clinica__ayuda--sinbono'}` }, est.texto),
      h('div', { class: 'clinica__botones' }, ...botones),
      hallazgos.length
        ? h('ul', { class: 'clinica__hallazgos' }, ...hallazgos.map((e) => h('li', {}, h('strong', {}, `${T.exploraciones[e.id]}: `), e.hallazgo)))
        : null,
    );
  }

  function explorar(id) {
    accion(
      () => ctx.api.explorarCaso({ guardiaId, caso: vista.indice, exploracion: id }),
      (r) => aplicarVista(r.vista),
    );
  }

  function bloquePaso() {
    const p = vista.paso;
    const pista = p.pista_usada
      ? h('p', { class: 'clinica__pista' }, h('strong', {}, `${T.pistaUsada}: `), p.pista)
      : crearBoton({ texto: T.pista, variante: 'secundario', onClick: pedirPista });
    refs.mensaje = h('p', { class: 'ronda__mensaje', role: 'status', 'aria-live': 'polite' });
    refs.opciones = h(
      'div',
      { class: 'ronda__opciones', role: 'group' },
      ...p.opciones.map((texto, i) =>
        h(
          'button',
          { type: 'button', class: 'ronda__opcion', 'data-opcion': i, onClick: () => responder(i) },
          h('span', { class: 'ronda__letra', 'aria-hidden': 'true' }, LETRAS[i]),
          h('span', { class: 'ronda__texto' }, texto),
          h('span', { class: 'ronda__marca' }),
        ),
      ),
    );
    return h(
      'section',
      { class: 'clinica__paso', 'aria-label': T.pasoProgreso(p.indice + 1, p.total) },
      h('p', { class: 'clinica__etiqueta' }, `${T.pasoEtiqueta[p.tipo] ?? ''} · ${T.pasoProgreso(p.indice + 1, p.total)} · ${T.intento(p.intento, p.intentos_max)}`),
      h('p', { class: 'ronda__enunciado' }, p.pregunta),
      refs.opciones,
      refs.mensaje,
      pista,
    );
  }

  const refs = {};

  function pedirPista() {
    accion(
      () => ctx.api.pedirPista({ guardiaId, caso: vista.indice, paso: vista.paso.indice }),
      (r) => aplicarVista(r.vista),
    );
  }

  function responder(opcion) {
    if (ocupado) return;
    const p = vista.paso;
    const botones = [...refs.opciones.querySelectorAll('button')];
    botones.forEach((b) => { b.disabled = true; });
    botones[opcion]?.classList.add('ronda__opcion--elegida');
    refs.mensaje.textContent = T.enviando;
    accion(
      () => ctx.api.responderPaso({ guardiaId, caso: vista.indice, paso: p.indice, intento: p.intento, opcion }),
      (r) => {
        const { resultado } = r;
        const elegida = botones[opcion];
        elegida.classList.remove('ronda__opcion--elegida');
        elegida.classList.add(resultado.acierto ? 'ronda__opcion--bien' : 'ronda__opcion--mal');
        elegida.querySelector('.ronda__marca').textContent = resultado.acierto ? 'CORRECTA' : 'INCORRECTA';
        if (resultado.revelada && resultado.correcta !== null) {
          const buena = botones[resultado.correcta];
          buena.classList.add('ronda__opcion--bien');
          buena.querySelector('.ronda__marca').textContent = 'CORRECTA';
        }
        refs.mensaje.textContent = resultado.acierto ? T.correcto(resultado.puntos_paso) : resultado.revelada ? T.revelada : T.incorrectoOtraVez;
        refs.mensaje.className = `ronda__mensaje ronda__mensaje--${resultado.acierto ? 'bien' : 'mal'}`;
        if (resultado.revelada) {
          refs.opciones.after(crearBoton({ texto: T.continuar, onClick: () => aplicarVista(r.vista) }));
        } else {
          pausa = setTimeout(() => aplicarVista(r.vista), PAUSA_RESPUESTA_MS);
        }
      },
    );
  }

  function bloqueDesenlace() {
    const d = vista.desenlace;
    const ultimo = vista.indice + 1 >= vista.total;
    const esquema = d.esquema;
    return h(
      'section',
      { class: 'clinica__desenlace', 'aria-label': T.desenlace },
      h('p', { class: 'clinica__etiqueta' }, `${T.desenlace} · ${d.resuelto ? T.resuelto : T.noResuelto}`),
      h('h2', { class: 'clinica__titulo-caso' }, d.titulo),
      h('div', { class: 'clinica__doctora clinica__doctora--corta' }, crearAvatar('femenino'), h('div', { class: 'clinica__dialogo' }, h('p', { class: 'clinica__nombre' }, h('strong', {}, T.doctora)), h('p', {}, d.texto))),
      h('p', { class: 'clinica__puntos-caso' }, h('strong', {}, `+${formatoPuntos(d.puntos.total)}`), ` · ${T.desglose(d.puntos.por_pasos, d.puntos.bono, d.puntos.descuento)}`),
      d.ojo_clinico ? h('p', { class: 'clinica__ojo' }, `★ ${nombreInsignia('ojo-clinico')}`) : null,
      h(
        'figure',
        { class: 'clinica__esquema' },
        crearEsquema(esquema),
        h('figcaption', {}, esquema.pie, leyenda(esquema).length ? h('ul', { class: 'clinica__leyenda' }, ...leyenda(esquema).map((l) => h('li', {}, l.nombre))) : null),
      ),
      h('p', { class: 'revision__explicacion' }, d.explicacion),
      h('h3', { class: 'clinica__subtitulo' }, T.tusPasos),
      h(
        'ul',
        { class: 'clinica__pasos-resumen' },
        ...d.pasos.map((p) => h('li', { class: p.acertado ? 'clinica__paso-bien' : 'clinica__paso-mal' }, h('strong', {}, `${T.pasoEtiqueta[p.tipo]}: `), p.correcta, h('span', {}, ` — ${textoPaso(p)}`))),
      ),
      h(
        'details',
        { class: 'revision' },
        h('summary', {}, h('strong', {}, T.hallazgos)),
        h(
          'ul',
          { class: 'clinica__hallazgos' },
          ...d.exploraciones.map((e) =>
            h('li', {}, h('strong', {}, `${T.exploraciones[e.id]} `), h('span', { class: `clinica__tag clinica__tag--${e.util ? 'util' : 'no'}` }, e.util ? T.util : T.noUtil), e.hecha ? h('span', { class: 'clinica__tag' }, T.hecha) : null, h('br'), e.hallazgo),
          ),
        ),
      ),
      h('p', { class: 'revision__fuente' }, h('strong', {}, `${T.fuente}: `), d.cita),
      crearBoton({ texto: ultimo ? T.terminarGuardia : T.siguientePaciente, onClick: siguiente }),
    );
  }

  function mostrarCaso() {
    clearTimeout(pausa);
    const nodos = [
      vista.modo_pruebas && h('p', { class: 'ronda__modo-pruebas', role: 'alert' }, T.modoPruebas),
      h(
        'header',
        { class: 'ronda__cabecera' },
        h('button', { type: 'button', class: 'ronda__salir', onClick: abrirSalir }, T.salir),
        h('h1', { class: 'ronda__aula', tabindex: '-1', 'data-foco': '' }, T.titulo),
        h('span', { class: 'ronda__progreso-texto' }, T.paciente(vista.numero, vista.total)),
      ),
      h('div', { class: 'ronda__barra', 'aria-hidden': 'true' }, h('div', { class: 'ronda__barra-relleno', style: `width:${((vista.numero - (vista.hecho ? 0 : 1)) / vista.total) * 100}%` })),
      h('div', { class: 'ronda__fila' }, h('div', { class: 'ronda__chip' }, h('span', {}, T.puntos), h('strong', {}, formatoPuntos(vista.puntos_guardia)))),
      bloquePaciente(),
    ];
    if (vista.hecho) nodos.push(bloqueDesenlace());
    else {
      nodos.push(bloqueExploracion());
      nodos.push(vista.paso ? bloquePaso() : h('p', { class: 'clinica__aviso', role: 'status' }, T.faltaExplorar(estadoExploracion(vista).faltan)));
    }
    cuerpo.replaceChildren(...nodos);
    el.scrollTo?.({ top: 0 });
    cuerpo.querySelector('[data-foco]')?.focus({ preventScroll: true });
  }

  function siguiente() {
    accion(
      () => ctx.api.siguienteCaso({ guardiaId, caso: vista.indice }),
      (r) => {
        if (r.final) {
          // El servidor devuelve al jugador ya actualizado (récord total, racha, insignias): el campus lo usa tal cual.
          if (r.jugador) ctx.estado.iniciarSesion(r.jugador);
          mostrarResumen(r.resumen);
        } else aplicarVista(r.vista);
      },
    );
    if (vista.indice + 1 >= vista.total) pantallaMensaje({ texto: T.guardando });
  }

  // ---- Resumen de la guardia -------------------------------------------------------------------------------------------

  function mostrarResumen(resumen) {
    const R = T.resumen;
    const mejor = mensajeMejor(resumen.mejor);
    const insignias = resumen.insignias_nuevas ?? [];
    cuerpo.replaceChildren(
      resumen.modo_pruebas && h('p', { class: 'ronda__modo-pruebas', role: 'alert' }, T.modoPruebas),
      h('header', { class: 'resultado__encabezado' }, h('p', { class: 'ronda__aula' }, T.titulo), h('h1', { class: 'resultado__titulo', tabindex: '-1', 'data-foco': '' }, R.titulo)),
      h('div', { class: 'resultado__nota' }, h('strong', { class: 'resultado__calificacion' }, formatoPuntos(resumen.puntaje)), h('span', {}, `${R.puntaje} · ${T.maximo(resumen.maximo)}`)),
      h('p', { class: `resultado__record resultado__record--${mejor.tono}`, role: 'status' }, mejor.texto),
      h('p', {}, R.resueltos(resumen.resueltos, resumen.total)),
      h('ul', { class: 'clinica__pasos-resumen' }, ...resumen.casos.map((c) => h('li', { class: c.resuelto ? 'clinica__paso-bien' : 'clinica__paso-mal' }, R.casoLinea(c), h('span', {}, ` — ${formatoPuntos(c.puntos)}`)))),
      resumen.expedientes_nuevos > 0 ? h('p', {}, R.expedientesNuevos(resumen.expedientes_nuevos)) : null,
      insignias.length ? h('div', { class: 'resultado__insignias' }, h('h2', { class: 'clinica__subtitulo' }, R.insigniasNuevas), h('ul', { class: 'chips' }, ...insignias.map((id) => h('li', {}, nombreInsignia(id))))) : null,
      h('p', { class: 'resultado__salon' }, mensajeSalon(resumen.salon)),
      h(
        'div',
        { class: 'acciones acciones--fondo' },
        crearBoton({ texto: R.otra, onClick: mostrarSala }),
        crearBoton({ texto: T.verExpedientes, variante: 'secundario', onClick: () => ctx.irA('expedientes') }),
        crearBoton({ texto: T.volverCampus, variante: 'secundario', onClick: volverAlCampus }),
      ),
    );
    el.scrollTo?.({ top: 0 });
    cuerpo.querySelector('[data-foco]')?.focus({ preventScroll: true });
    guardiaId = null;
  }

  // ---- Salir (anula la guardia) -------------------------------------------------------------------------------------------

  function abrirSalir() {
    if (panel) return;
    disparador = document.activeElement;
    panel = crearPanel({
      titulo: T.salirTitulo,
      contenido: h('p', {}, T.salirTexto),
      acciones: [crearBoton({ texto: T.salirConfirmar, onClick: volverAlCampus })],
      textoCerrar: T.seguir,
      alCerrar: cerrarSalir,
    });
    el.append(panel.el);
    panel.enfocar();
  }

  function cerrarSalir() {
    if (!panel) return;
    panel.el.remove();
    panel = null;
    disparador?.focus?.({ preventScroll: true });
  }

  return {
    el,
    alMontar() {
      mostrarSala();
    },
    alSalir() {
      cerrado = true;
      clearTimeout(pausa);
    },
  };
}
