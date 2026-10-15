import { h } from '../../utils/dom.js';
import { ERRORES, PRIVACIDAD } from '../../textos.js';
import { esGenero } from '../../utils/validacion.js';
import { crearBoton } from '../componentes.js';

function tarjeta(id, titulo, puntos) {
  return h(
    'section',
    { class: 'bloque', 'aria-labelledby': id },
    h('h2', { id, class: 'bloque__titulo' }, titulo),
    h('ul', { class: 'lista' }, ...puntos.map((p) => h('li', {}, p))),
  );
}

/**
 * modo "registro": última pantalla antes del campus; aquí se guarda al jugador.
 * modo "consulta": se abre desde la portada ("Cómo se juega") y solo se lee.
 */
export function crearPrivacidad(ctx, { modo = 'registro' } = {}) {
  const { api, estado, almacen } = ctx;
  const { matricula, nombre, genero } = estado.registro;

  // Si se llegó aquí sin haber completado el registro, se regresa al inicio.
  if (modo === 'registro' && (!matricula || !nombre || !esGenero(genero))) {
    return { redirigir: 'registro' };
  }

  let ocupado = false;
  const error = h('p', { id: 'error-privacidad', class: 'error', role: 'alert' });

  const entrar = async () => {
    if (ocupado) return;
    error.textContent = '';
    ocupado = true;
    botonEntrar.setAttribute('aria-busy', 'true');
    botonEntrar.textContent = 'Guardando…';
    try {
      const jugador = await api.registrarJugador({ matricula, nombre, genero });
      if (jugador.ya_existia) {
        // Alguien registró esa matrícula mientras tanto: no se pisa, se recupera.
        return ctx.irA('bienvenida', {
          jugador,
          aviso: 'Esa matrícula ya estaba registrada, así que recuperamos su progreso.',
        });
      }
      almacen.guardar(jugador.matricula);
      estado.iniciarSesion(jugador);
      ctx.irA('campus');
    } catch (e) {
      error.textContent = ERRORES[e.codigo] ?? ERRORES.servidor;
      ocupado = false;
      botonEntrar.setAttribute('aria-busy', 'false');
      botonEntrar.textContent = 'Entrar al campus';
    }
  };

  const botonEntrar = crearBoton({ texto: 'Entrar al campus', onClick: entrar });

  const acciones =
    modo === 'registro'
      ? h(
          'div',
          { class: 'privacidad__pie' },
          h('p', { class: 'privacidad__aceptacion' }, PRIVACIDAD.aceptacion),
          error,
          h('div', { class: 'acciones' }, crearBoton({ texto: 'Atrás', variante: 'secundario', onClick: () => !ocupado && ctx.irA('registro', { paso: 3 }) }), botonEntrar),
        )
      : h('div', { class: 'privacidad__pie' }, h('div', { class: 'acciones' }, crearBoton({ texto: 'Volver', foco: true, onClick: () => ctx.irA('portada') })));

  const el = h(
    'section',
    { class: 'pantalla privacidad', 'aria-labelledby': 'privacidad-titulo' },
    h('h1', { id: 'privacidad-titulo', class: 'titulo-pantalla', tabindex: '-1' }, PRIVACIDAD.titulo),
    h(
      'div',
      { class: 'privacidad__bloques' },
      tarjeta('bloque-datos', PRIVACIDAD.datos.titulo, PRIVACIDAD.datos.puntos),
      tarjeta('bloque-reglas', PRIVACIDAD.reglas.titulo, PRIVACIDAD.reglas.puntos),
    ),
    acciones,
  );
  return { el };
}
