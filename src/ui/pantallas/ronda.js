import { h } from '../../utils/dom.js';
import { ERRORES, RONDA_UI } from '../../textos.js';
import { esReintentable } from '../../api/errores.js';
import { crearBoton } from '../componentes.js';
import { crearPanel } from '../campus/panel.js';
import {
  LETRAS, claseReloj, formatoPuntos, fraccionRestante, opcionDeTecla, segundosRestantes,
} from '../ronda/modelo.js';

const INTENTOS = 3; // por cada llamada al servidor (las tres operaciones se pueden repetir sin riesgo)
const ESPERA_INTENTO_MS = 700;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Pantalla de la ronda: 25 preguntas, 42 s cada una. Esta pantalla NO conoce las respuestas correctas ni calcula
 * puntos: manda cada respuesta al servidor y muestra lo que él contesta (acierto/fallo, puntos y racha).
 * Salir a mitad de ronda la anula (no se guarda nada).
 */
export function crearRonda(ctx, { aula } = {}) {
  const jugador = ctx.estado.jugador;
  if (!jugador) return { redirigir: 'portada' };
  if (!aula) return { redirigir: 'campus' };

  let cerrado = false;
  let ronda = null; // respuesta de iniciarRonda
  let indice = 0;
  let fase = 'cargando'; // cargando | esperando | enviando | pausa | calificando | error
  let inicioPregunta = 0;
  let puntos = 0;
  let racha = 0;
  let relojInterval = null;
  let pausaTimer = null;
  let panel = null;
  let disparador = null;

  // ---- Piezas fijas ----------------------------------------------------------------------------

  const cuerpo = h('div', { class: 'ronda__caja' });
  const el = h('section', { class: 'pantalla ronda', 'aria-label': `Ronda del ${RONDA_UI.aula(aula)}` }, cuerpo);

  const pantallaMensaje = ({ texto, aviso = false, acciones = [] }) => {
    cuerpo.replaceChildren(
      h(
        'div',
        { class: 'ronda__estado', role: aviso ? 'alert' : 'status' },
        h('h1', { class: 'ronda__estado-titulo', tabindex: '-1', 'data-foco': '' }, RONDA_UI.aula(aula)),
        h('p', { class: aviso ? 'error' : 'ronda__estado-texto' }, texto),
        acciones.length ? h('div', { class: 'acciones' }, ...acciones) : null,
      ),
    );
    cuerpo.querySelector('[data-foco]')?.focus({ preventScroll: true });
  };

  const volverAlCampus = () => ctx.irA('campus');

  function mostrarError(codigo, reintentar) {
    fase = 'error';
    detenerReloj();
    pantallaMensaje({
      texto: ERRORES[codigo] ?? ERRORES.servidor,
      aviso: true,
      acciones: [
        reintentar && crearBoton({ texto: RONDA_UI.reintentar, onClick: reintentar }),
        crearBoton({ texto: RONDA_UI.volverCampus, variante: 'secundario', onClick: volverAlCampus }),
      ],
    });
  }

  /** Repite una llamada si falló por red, tiempo o servidor. Las tres operaciones son idempotentes. */
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

  // ---- Pantalla de juego ---------------------------------------------------------------------------

  const refs = {};

  function armarJuego() {
    refs.progresoTexto = h('span', { class: 'ronda__progreso-texto' });
    refs.progresoBarra = h('div', { class: 'ronda__barra-relleno' });
    refs.puntos = h('strong', {}, '0');
    refs.racha = h('strong', {}, '0');
    refs.relojNumero = h('strong', { class: 'ronda__reloj-numero' }, String(ronda.tiempo_ms / 1000));
    refs.relojBarra = h('div', { class: 'ronda__barra-relleno ronda__barra-relleno--reloj' });
    refs.reloj = h(
      'div',
      { class: 'ronda__reloj ronda__reloj--normal', role: 'timer', 'aria-live': 'off' },
      h('span', { class: 'ronda__reloj-etiqueta' }, RONDA_UI.tiempo),
      refs.relojNumero,
      h('div', { class: 'ronda__barra ronda__barra--reloj', 'aria-hidden': 'true' }, refs.relojBarra),
    );
    refs.enunciado = h('p', { class: 'ronda__enunciado' });
    refs.opciones = h('div', { class: 'ronda__opciones', role: 'group' });
    refs.mensaje = h('p', { class: 'ronda__mensaje', role: 'status', 'aria-live': 'polite' });

    const botonSalir = h('button', { type: 'button', class: 'ronda__salir', onClick: abrirSalir }, RONDA_UI.salir);

    cuerpo.replaceChildren(
      ronda.modo_pruebas && h('p', { class: 'ronda__modo-pruebas', role: 'alert' }, RONDA_UI.modoPruebas),
      h(
        'header',
        { class: 'ronda__cabecera' },
        botonSalir,
        h('h1', { class: 'ronda__aula', tabindex: '-1', 'data-foco': '' }, RONDA_UI.aula(aula)),
        refs.progresoTexto,
      ),
      h('div', { class: 'ronda__barra', 'aria-hidden': 'true' }, refs.progresoBarra),
      h(
        'div',
        { class: 'ronda__fila' },
        h('div', { class: 'ronda__chip' }, h('span', {}, RONDA_UI.puntos), refs.puntos),
        h('div', { class: 'ronda__chip' }, h('span', {}, RONDA_UI.racha), refs.racha),
        refs.reloj,
      ),
      h('div', { class: 'ronda__pregunta' }, refs.enunciado),
      refs.opciones,
      refs.mensaje,
      h('p', { class: 'ronda__ayuda' }, RONDA_UI.ayudaTeclas),
    );
  }

  function mostrarPregunta() {
    const total = ronda.total;
    const p = ronda.preguntas[indice];
    fase = 'esperando';
    refs.progresoTexto.textContent = RONDA_UI.progreso(indice + 1, total);
    refs.progresoBarra.style.width = `${(indice / total) * 100}%`;
    refs.enunciado.textContent = p.enunciado;
    refs.mensaje.textContent = '';
    refs.opciones.replaceChildren(
      ...p.opciones.map((texto, i) =>
        h(
          'button',
          {
            type: 'button',
            class: 'ronda__opcion',
            'data-opcion': i,
            'aria-label': RONDA_UI.opcionAria(LETRAS[i], texto),
            onClick: () => contestar(i),
          },
          h('span', { class: 'ronda__letra', 'aria-hidden': 'true' }, LETRAS[i]),
          h('span', { class: 'ronda__texto' }, texto),
          h('span', { class: 'ronda__marca' }),
        ),
      ),
    );
    inicioPregunta = performance.now();
    pintarReloj();
    detenerReloj();
    relojInterval = setInterval(alLatir, 100);
    el.scrollTo?.({ top: 0 });
  }

  function pintarReloj() {
    const ahora = performance.now();
    const seg = segundosRestantes(inicioPregunta, ahora, ronda.tiempo_ms);
    refs.relojNumero.textContent = String(seg);
    refs.relojBarra.style.width = `${fraccionRestante(inicioPregunta, ahora, ronda.tiempo_ms) * 100}%`;
    const clase = claseReloj(seg);
    refs.reloj.className = `ronda__reloj ronda__reloj--${clase}`;
    refs.reloj.setAttribute('aria-label', RONDA_UI.relojAria(seg));
    return seg;
  }

  function alLatir() {
    if (fase !== 'esperando') return;
    const seg = pintarReloj();
    if (seg <= 0) contestar(null); // se acabó el tiempo: cuenta como no contestada
  }

  function detenerReloj() {
    clearInterval(relojInterval);
    relojInterval = null;
  }

  function botones() {
    return [...refs.opciones.querySelectorAll('button')];
  }

  async function contestar(opcion) {
    if (fase !== 'esperando') return;
    fase = 'enviando';
    detenerReloj();
    pintarReloj();
    const lista = botones();
    lista.forEach((b) => { b.disabled = true; });
    if (opcion !== null) lista[opcion]?.classList.add('ronda__opcion--elegida');
    refs.mensaje.textContent = opcion === null ? RONDA_UI.tiempoAgotado : RONDA_UI.enviando;

    const enviar = async () => {
      try {
        const r = await conReintentos(() => ctx.api.responderPregunta({ rondaId: ronda.ronda_id, indice, opcion }));
        if (cerrado || !r) return;
        mostrarResultado(r, opcion);
      } catch (e) {
        if (!cerrado) mostrarError(e.codigo, esReintentable(e.codigo) ? enviar : null);
      }
    };
    await enviar();
  }

  function mostrarResultado(r, opcion) {
    if (fase === 'error') {
      // Reintento después de un error: se vuelve a pintar la pantalla de juego en la misma pregunta.
      armarJuego();
      mostrarPregunta();
      fase = 'enviando';
      detenerReloj();
      refs.relojNumero.textContent = '–';
      refs.relojBarra.style.width = '0%';
      botones().forEach((b, i) => { b.disabled = true; if (i === opcion) b.classList.add('ronda__opcion--elegida'); });
    }
    fase = 'pausa';
    puntos = r.puntos_ronda;
    racha = r.racha;
    refs.puntos.textContent = formatoPuntos(puntos);
    refs.racha.textContent = String(racha);
    const elegida = opcion !== null && r.contestada ? botones()[opcion] : null;
    if (elegida) {
      elegida.classList.remove('ronda__opcion--elegida');
      elegida.classList.add(r.acierto ? 'ronda__opcion--bien' : 'ronda__opcion--mal');
      elegida.querySelector('.ronda__marca').textContent = r.acierto ? RONDA_UI.marcaCorrecta : RONDA_UI.marcaIncorrecta;
    }
    refs.mensaje.textContent = !r.contestada ? RONDA_UI.tiempoAgotado : r.acierto ? RONDA_UI.correcto(r.puntos) : RONDA_UI.incorrecto;
    refs.mensaje.className = `ronda__mensaje ronda__mensaje--${!r.contestada ? 'tiempo' : r.acierto ? 'bien' : 'mal'}`;
    pausaTimer = setTimeout(avanzar, ronda.pausa_ms);
  }

  function avanzar() {
    if (cerrado) return;
    indice += 1;
    if (indice >= ronda.total) {
      refs.progresoBarra.style.width = '100%';
      terminar();
    } else {
      refs.mensaje.className = 'ronda__mensaje';
      mostrarPregunta();
    }
  }

  async function terminar() {
    fase = 'calificando';
    pantallaMensaje({ texto: RONDA_UI.calificando });
    try {
      const resultado = await conReintentos(() => ctx.api.terminarRonda(ronda.ronda_id));
      if (cerrado || !resultado) return;
      // El servidor devuelve al jugador ya actualizado (récord, racha de días, insignias): el campus lo usa tal cual.
      if (resultado.jugador) ctx.estado.iniciarSesion(resultado.jugador);
      ctx.irA('resultado', { resumen: resultado.resumen });
    } catch (e) {
      if (cerrado) return;
      mostrarError(e.codigo, esReintentable(e.codigo) ? terminar : null);
    }
  }

  // ---- Salir (anula la ronda) --------------------------------------------------------------------------

  function abrirSalir() {
    if (panel || fase === 'calificando') return;
    disparador = document.activeElement;
    panel = crearPanel({
      titulo: RONDA_UI.salirTitulo,
      contenido: h('p', {}, RONDA_UI.salirTexto),
      acciones: [crearBoton({ texto: RONDA_UI.salirConfirmar, onClick: volverAlCampus })],
      textoCerrar: RONDA_UI.seguir,
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

  const alTeclado = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || panel || fase !== 'esperando') return;
    const opcion = opcionDeTecla(e.key);
    if (opcion === null || opcion >= (ronda?.preguntas[indice]?.opciones.length ?? 0)) return;
    e.preventDefault();
    contestar(opcion);
  };

  // ---- Arranque ----------------------------------------------------------------------------------------------

  async function empezar() {
    fase = 'cargando';
    pantallaMensaje({ texto: RONDA_UI.preparando });
    try {
      const r = await conReintentos(() => ctx.api.iniciarRonda({ matricula: jugador.matricula, aula }));
      if (cerrado || !r) return;
      ronda = r;
      indice = 0;
      puntos = 0;
      racha = 0;
      armarJuego();
      mostrarPregunta();
      refs.progresoTexto.closest('header')?.querySelector('[data-foco]')?.focus({ preventScroll: true });
    } catch (e) {
      if (!cerrado) mostrarError(e.codigo, esReintentable(e.codigo) ? empezar : null);
    }
  }

  return {
    el,
    alMontar() {
      document.addEventListener('keydown', alTeclado);
      empezar();
    },
    alSalir() {
      cerrado = true;
      detenerReloj();
      clearTimeout(pausaTimer);
      document.removeEventListener('keydown', alTeclado);
    },
  };
}
