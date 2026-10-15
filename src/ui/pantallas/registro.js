import { h } from '../../utils/dom.js';
import { MATRICULA } from '../../config.js';
import { ERRORES } from '../../textos.js';
import {
  validarMatricula,
  validarNombre,
  esGenero,
  normalizarMatricula,
  primerNombre,
  saludo,
  enmascararMatricula,
} from '../../utils/validacion.js';
import { crearBoton, crearFicha, crearIcono, crearPasos } from '../componentes.js';
import { crearAvatar } from '../sprites.js';

const TITULOS = {
  1: { titulo: 'Escribe tu matrícula', subtitulo: 'Es tu llave para guardar y recuperar tu avance.' },
  2: { titulo: '¿Cómo te llamas?', subtitulo: 'Nombre y apellido. Es el que verán en el ranking.' },
  3: { titulo: 'Identifica a tu avatar', subtitulo: 'Elige cómo se verá tu avatar en el campus.' },
};

/**
 * Registro por pasos: 1 matrícula, 2 nombre, 3 género.
 * Si la matrícula ya existe, salta a la pantalla de bienvenida (no se vuelve a registrar).
 */
export function crearRegistro(ctx, { paso = 1 } = {}) {
  const { api, estado, almacen } = ctx;
  if (!estado.registro.matricula && paso === 1) estado.registro.matricula = almacen.leer();

  let actual = paso;
  let ocupado = false;
  let campo = null; // el <input> del paso actual (pasos 1 y 2)
  let error = null; // el <p role="alert">
  let boton = null; // botón "Continuar"
  let panelAvatar = null;

  const el = h('section', { class: 'pantalla registro', 'aria-labelledby': 'registro-titulo' });

  const mostrarError = (texto, enCampo = campo) => {
    error.textContent = texto;
    enCampo?.setAttribute('aria-invalid', 'true');
  };
  const limpiarError = () => {
    error.textContent = '';
    campo?.removeAttribute('aria-invalid');
  };
  const ocupar = (si, textoNormal, textoOcupado) => {
    ocupado = si;
    boton.setAttribute('aria-busy', String(si));
    boton.textContent = si ? textoOcupado : textoNormal;
  };
  const ir = (n) => {
    actual = n;
    dibujar();
  };

  async function enviar(evento) {
    evento.preventDefault();
    if (ocupado) return;
    limpiarError();

    if (actual === 1) {
      const r = validarMatricula(campo.value);
      if (!r.ok) return mostrarError(r.error);
      ocupar(true, 'Continuar', 'Buscando…');
      try {
        const jugador = await api.recuperarJugador(r.valor);
        estado.registro.matricula = r.valor;
        if (jugador) return ctx.irA('bienvenida', { jugador });
        ir(2);
      } catch (e) {
        mostrarError(ERRORES[e.codigo] ?? ERRORES.servidor);
      } finally {
        ocupar(false, 'Continuar', 'Buscando…');
      }
      return;
    }

    if (actual === 2) {
      const r = validarNombre(campo.value);
      if (!r.ok) return mostrarError(r.error);
      estado.registro.nombre = r.valor;
      return ir(3);
    }

    if (!esGenero(estado.registro.genero)) return mostrarError(ERRORES.genero_invalido, null);
    ctx.irA('privacidad', { modo: 'registro' });
  }

  function atras() {
    if (ocupado) return;
    if (actual === 1) return ctx.irA('portada');
    ir(actual - 1);
  }

  // ---- Campos de cada paso ------------------------------------------------

  function campoMatricula() {
    campo = h('input', {
      id: 'campo-matricula',
      class: 'campo campo--matricula',
      name: 'matricula',
      type: 'text',
      inputmode: 'text',
      autocomplete: 'off',
      autocapitalize: 'none',
      autocorrect: 'off',
      spellcheck: 'false',
      'aria-describedby': 'ayuda-matricula error-registro',
      'data-foco': '',
      value: estado.registro.matricula,
    });
    campo.addEventListener('input', () => {
      const limpio = normalizarMatricula(campo.value).slice(0, MATRICULA.max + 2);
      if (limpio !== campo.value) campo.value = limpio;
      estado.registro.matricula = limpio;
      limpiarError();
    });
    return [
      h('label', { class: 'solo-lectores', for: 'campo-matricula' }, 'Matrícula'),
      campo,
      h(
        'p',
        { id: 'ayuda-matricula', class: 'ayuda' },
        `De ${MATRICULA.min} a ${MATRICULA.max} caracteres: solo números, o con letras al inicio o al final. Si ya jugaste antes, usa la misma matrícula para sumar tus puntos.`,
      ),
    ];
  }

  function campoNombre() {
    campo = h('input', {
      id: 'campo-nombre',
      class: 'campo',
      name: 'nombre',
      type: 'text',
      autocomplete: 'name',
      autocapitalize: 'words',
      spellcheck: 'false',
      maxlength: '60',
      placeholder: 'Nombre y apellido',
      'aria-describedby': 'ayuda-nombre error-registro',
      'data-foco': '',
      value: estado.registro.nombre,
    });
    campo.addEventListener('input', limpiarError);
    return [
      h('label', { class: 'solo-lectores', for: 'campo-nombre' }, 'Nombre y apellido'),
      campo,
      h('p', { id: 'ayuda-nombre', class: 'ayuda' }, 'Escríbelo como quieres que aparezca en el Salón de la Fama.'),
    ];
  }

  function camposGenero() {
    campo = null;
    const opcion = (valor, texto) => {
      const radio = h('input', { type: 'radio', name: 'genero', value: valor, checked: estado.registro.genero === valor });
      radio.addEventListener('change', () => {
        estado.registro.genero = valor;
        limpiarError();
        dibujarAvatar();
      });
      return h(
        'label',
        { class: 'opcion' },
        radio,
        h('span', { class: 'opcion__caja' }, h('span', { class: 'opcion__marca' }, crearIcono('check')), texto),
      );
    };
    const primero = opcion('femenino', 'Femenino');
    primero.querySelector('input').setAttribute('data-foco', '');
    return [
      h('fieldset', { class: 'opciones' }, h('legend', { class: 'solo-lectores' }, 'Género'), primero, opcion('masculino', 'Masculino')),
    ];
  }

  // ---- Panel lateral -------------------------------------------------------

  function dibujarAvatar() {
    const { genero, nombre } = estado.registro;
    if (!esGenero(genero)) {
      panelAvatar.replaceChildren(
        h('div', { class: 'avatar-vacio', 'aria-hidden': 'true' }, '?'),
        h('p', { class: 'lateral__texto' }, 'Elige una opción para ver tu avatar.'),
      );
      return;
    }
    panelAvatar.replaceChildren(
      crearAvatar(genero),
      h(
        'div',
        { class: 'lateral__saludo', 'aria-live': 'polite' },
        h('div', { class: 'lateral__nombre' }, `${saludo(genero)}, ${primerNombre(nombre)}`),
        h('div', { class: 'lateral__texto' }, 'Vista previa del avatar'),
      ),
    );
  }

  function lateral() {
    const { matricula } = estado.registro;
    if (actual === 3) {
      panelAvatar = h('aside', { class: 'lateral lateral--avatar' });
      dibujarAvatar();
      return panelAvatar;
    }
    if (actual === 1) {
      return h(
        'aside',
        { class: 'lateral' },
        h('h2', { class: 'lateral__titulo' }, 'Tu matrícula'),
        h('p', { class: 'lateral__texto' }, 'Con ella se guardan tus puntos y tu récord. No hay contraseña, así que usa siempre la tuya.'),
        h('p', { class: 'lateral__texto' }, 'Ejemplos de formato:'),
        h('ul', { class: 'ejemplos' }, ...MATRICULA.ejemplos.map((e) => h('li', {}, h('code', {}, e)))),
      );
    }
    return h(
      'aside',
      { class: 'lateral' },
      h('h2', { class: 'lateral__titulo' }, 'Así te verán'),
      h('p', { class: 'lateral__texto' }, 'En el Salón de la Fama aparecen tu nombre y tu matrícula con los primeros números ocultos.'),
      h('div', { class: 'fila-ejemplo' }, h('span', {}, 'Nombre Apellido'), h('span', { class: 'fila-ejemplo__matricula' }, enmascararMatricula(matricula))),
    );
  }

  // ---- Pantalla completa ---------------------------------------------------

  function dibujar() {
    const { matricula, nombre } = estado.registro;
    const { titulo, subtitulo } = TITULOS[actual];
    error = h('p', { id: 'error-registro', class: 'error', role: 'alert' });
    boton = crearBoton({ texto: 'Continuar', tipo: 'submit' });

    const campos = actual === 1 ? campoMatricula() : actual === 2 ? campoNombre() : camposGenero();

    const principal = h(
      'div',
      { class: 'registro__principal' },
      crearPasos(actual),
      actual > 1 && h('div', { class: 'fichas' }, crearFicha('Matrícula', matricula), actual > 2 && crearFicha('Nombre', nombre)),
      h(
        'header',
        { class: 'registro__encabezado' },
        h('h1', { id: 'registro-titulo', class: 'titulo-pantalla', tabindex: '-1' }, titulo),
        h('p', { class: 'subtitulo' }, subtitulo),
      ),
      h(
        'form',
        { class: 'registro__formulario', novalidate: true, onSubmit: enviar },
        ...campos,
        error,
        h('div', { class: 'acciones acciones--fondo' }, crearBoton({ texto: 'Atrás', variante: 'secundario', onClick: atras }), boton),
      ),
    );
    el.replaceChildren(principal, lateral());
    if (el.isConnected) (el.querySelector('[data-foco]') ?? el.querySelector('h1'))?.focus({ preventScroll: true });
  }

  dibujar();
  return { el };
}
