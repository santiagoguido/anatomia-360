import { h, s } from '../../utils/dom.js';
import { CAMPUS } from '../../textos.js';
import { crearBoton, crearIcono } from '../componentes.js';
import { crearJoystick } from '../campus/joystick.js';
import { crearBotonCorrer } from '../campus/botonCorrer.js';
import { crearMinimapa } from '../campus/minimapa.js';
import { crearPanel } from '../campus/panel.js';
import { crearTarjetaLugar } from '../campus/tarjetaLugar.js';
import { aulasDesdeCalendario, estaAbierta, etiquetaSemana, normalizarAulas } from '../../game/aulas.js';
import { lugarPorId } from '../../game/mapa.js';
import { modeloTarjeta } from '../../game/tarjetas.js';

const SINCRONIZAR_CADA_MS = 60000;
const ESPERA_MINIMA_MS = 3000; // entre una consulta al servidor y la siguiente

const iniciales = (nombre) =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const iconoMenu = () =>
  s(
    'svg',
    { viewBox: '0 0 7 6', 'aria-hidden': 'true', 'shape-rendering': 'crispEdges' },
    ...[0, 2, 4].map((y) => s('rect', { x: 0, y, width: 7, height: 1, fill: 'currentColor' })),
  );

/**
 * Pantalla del campus: el lienzo de Phaser más, en HTML, la barra superior, el minimapa,
 * la tarjeta de proximidad y los controles táctiles. Aquí vive el estado de las aulas
 * (qué está abierto), que se pide al servidor y se reparte al juego y a las tarjetas.
 */
export function crearCampus(ctx) {
  const jugador = ctx.estado.jugador;
  if (!jugador) return { redirigir: 'portada' };

  const controles = { vector: { x: 0, y: 0, fuerza: 0 }, correr: false };
  let aulas = aulasDesdeCalendario();
  let abiertasAntes = new Map();
  let juego = null;
  let cerrado = false;
  let lugarActual = null;
  let panel = null;
  let disparador = null;
  let temporizadorAviso = null;
  let sincronizando = false;
  let ultimaSincronizacion = 0;
  const relojes = [];

  // ---- Piezas --------------------------------------------------------------------

  const contenedor = h('div', { class: 'campus__juego', id: 'juego' });
  const estadoCarga = h('div', { class: 'campus__estado', role: 'status' }, CAMPUS.cargando);
  const aviso = h('p', { class: 'aviso-campus', role: 'status', hidden: true });
  const minimapa = crearMinimapa();
  const tarjeta = crearTarjetaLugar({ alEntrar: (lugar) => entrar(lugar) });
  const joystick = crearJoystick({ alCambiar: (v) => { controles.vector = v; } });
  const botonCorrer = crearBotonCorrer({ alCambiar: (b) => { controles.correr = b; } });

  // ---- Acciones ---------------------------------------------------------------------

  const salir = () => {
    ctx.almacen.borrar();
    ctx.estado.cerrarSesion();
    ctx.irA('portada');
  };

  function avisar(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { aviso.hidden = true; }, 3200);
  }

  function modeloDe(lugar) {
    return modeloTarjeta(lugar, { aulas, jugador: ctx.estado.jugador, ahoraMs: Date.now() });
  }

  function refrescarTarjeta() {
    const lugar = lugarActual ? lugarPorId(lugarActual) : null;
    const modelo = lugar ? modeloDe(lugar) : null;
    if (lugar && modelo) tarjeta.mostrar(lugar, modelo);
    else tarjeta.ocultar();
  }

  /** Cada destino (ronda, Clínica, Salón de la Fama, Control Escolar) se conecta aquí en las siguientes sesiones. */
  function entrar(lugar) {
    const modelo = modeloDe(lugar);
    if (!modelo?.boton.habilitado) return;
    if (ctx.entrarALugar) ctx.entrarALugar(lugar, { aulas });
    else avisar(CAMPUS.pronto);
  }

  function abrirPanel({ titulo, contenido, acciones }) {
    cerrarPanel();
    disparador = document.activeElement;
    panel = crearPanel({ titulo, contenido, acciones, alCerrar: cerrarPanel });
    el.append(panel.el);
    panel.enfocar();
  }

  function cerrarPanel() {
    if (!panel) return;
    panel.el.remove();
    panel = null;
    disparador?.focus?.({ preventScroll: true });
  }

  const abrirMenu = () =>
    abrirPanel({
      titulo: CAMPUS.menu,
      contenido: h('p', {}, `${jugador.nombre} · ${jugador.matricula_oculta}`),
      acciones: [crearBoton({ texto: CAMPUS.salir, onClick: salir })],
    });

  const abrirInsignias = () => {
    const lista = jugador.insignias ?? [];
    abrirPanel({
      titulo: CAMPUS.insignias,
      contenido: lista.length ? h('ul', { class: 'chips' }, ...lista.map((i) => h('li', {}, i))) : h('p', {}, CAMPUS.sinInsignias),
    });
  };

  // ---- Aulas abiertas -----------------------------------------------------------------

  const abiertasAhora = () => new Map(aulas.map((a) => [a.numero, estaAbierta(a)]));

  function repartirAulas() {
    abiertasAntes = abiertasAhora();
    juego?.actualizarAulas(aulas);
    minimapa.marcarAulas(abiertasAntes);
    refrescarTarjeta();
  }

  /** Pregunta al servidor qué aulas están abiertas (su reloj manda, no el del teléfono). Si falla, se queda con el calendario local. */
  async function sincronizarAulas() {
    if (!ctx.api?.estadoAulas || sincronizando) return;
    // Un desfase de menos de un segundo entre el teléfono y el servidor no debe convertirse en consultas sin parar.
    if (Date.now() - ultimaSincronizacion < ESPERA_MINIMA_MS) return;
    sincronizando = true;
    ultimaSincronizacion = Date.now();
    try {
      const filas = await ctx.api.estadoAulas();
      if (cerrado) return;
      if (Array.isArray(filas) && filas.length > 0) aulas = normalizarAulas(filas);
    } catch {
      /* sin conexión: sigue el calendario que ya tenía */
    } finally {
      sincronizando = false;
    }
    repartirAulas();
  }

  function cadaSegundo() {
    const ahora = abiertasAhora();
    const cambio = [...ahora].some(([n, abierta]) => abiertasAntes.get(n) !== abierta);
    if (cambio) {
      repartirAulas(); // se abre al instante...
      sincronizarAulas(); // ...y se confirma con el servidor
    } else {
      refrescarTarjeta();
    }
    etiquetaFecha.textContent = etiquetaSemana();
  }

  // ---- Carga del juego ----------------------------------------------------------------

  const cargar = async () => {
    estadoCarga.replaceChildren(CAMPUS.cargando);
    estadoCarga.hidden = false;
    try {
      const controlador = await ctx.iniciarJuego(contenedor, {
        jugador,
        controles,
        aulasIniciales: aulas,
        alCambiarLugar: (id) => { lugarActual = id; refrescarTarjeta(); },
        alAccion: () => {
          const lugar = lugarActual ? lugarPorId(lugarActual) : null;
          if (lugar && !panel) entrar(lugar);
        },
        alMover: (datos) => minimapa.actualizar(datos),
        alResistencia: (barras, agotada) => botonCorrer.mostrar(barras, agotada),
      });
      if (cerrado) return controlador.destruir();
      juego = controlador;
      estadoCarga.hidden = true;
      repartirAulas();
      sincronizarAulas();
    } catch {
      if (cerrado) return;
      estadoCarga.replaceChildren(
        h('p', {}, 'No se pudo cargar el campus. Revisa tu internet e inténtalo de nuevo.'),
        crearBoton({ texto: CAMPUS.reintentar, onClick: cargar }),
      );
    }
  };

  // ---- Pantalla -------------------------------------------------------------------------

  const racha = jugador.racha_dias ?? 0;
  const insignias = jugador.insignias?.length ?? 0;
  const etiquetaFecha = h('span', {}, etiquetaSemana());

  const hud = h(
    'header',
    { class: 'hud' },
    h(
      'div',
      { class: 'hud__jugador' },
      h('span', { class: 'hud__iniciales', 'aria-hidden': 'true' }, iniciales(jugador.nombre)),
      h(
        'div',
        { class: 'hud__textos' },
        h('h1', { class: 'hud__nombre', tabindex: '-1', 'data-foco': '' }, jugador.nombre),
        h('span', { class: 'hud__record' }, `${CAMPUS.recordTotal} `, h('strong', {}, (jugador.record_total ?? 0).toLocaleString('en-US'))),
      ),
    ),
    h('div', { class: 'hud__chip hud__semana' }, etiquetaFecha),
    h('div', { class: 'hud__chip hud__racha' }, crearIcono('llama'), h('span', {}, CAMPUS.racha(racha))),
    h(
      'button',
      { type: 'button', class: 'hud__boton', 'aria-label': CAMPUS.insigniasGanadas(insignias), onClick: abrirInsignias },
      crearIcono('medalla'),
      String(insignias),
    ),
    h('button', { type: 'button', class: 'hud__boton hud__boton--icono', 'aria-label': CAMPUS.menu, onClick: abrirMenu }, iconoMenu()),
  );

  const el = h(
    'section',
    { class: 'pantalla campus', 'aria-label': 'Campus' },
    contenedor,
    hud,
    minimapa.el,
    tarjeta.el,
    h('div', { class: 'controles' }, joystick.el, botonCorrer.el),
    h('p', { class: 'ayuda-teclado' }, CAMPUS.ayudaTeclado),
    aviso,
    estadoCarga,
    h('div', { class: 'campus__girar' }, h('p', {}, CAMPUS.girar)),
  );

  const alVolverALaPagina = () => {
    if (!document.hidden) sincronizarAulas();
  };

  return {
    el,
    alMontar() {
      cargar();
      relojes.push(setInterval(cadaSegundo, 1000), setInterval(sincronizarAulas, SINCRONIZAR_CADA_MS));
      document.addEventListener('visibilitychange', alVolverALaPagina);
    },
    alSalir() {
      cerrado = true;
      relojes.forEach(clearInterval);
      clearTimeout(temporizadorAviso);
      document.removeEventListener('visibilitychange', alVolverALaPagina);
      juego?.destruir();
      juego = null;
    },
  };
}
