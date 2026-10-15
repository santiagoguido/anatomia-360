// Ayudantes mínimos para armar pantallas sin librerías.
// Todo el texto entra como nodo de texto (nunca como HTML), así que un nombre
// escrito por un alumno no puede inyectar código.

const SVG_NS = 'http://www.w3.org/2000/svg';

function aplicar(el, props) {
  for (const [clave, valor] of Object.entries(props ?? {})) {
    if (valor === false || valor == null) continue;
    if (clave.length > 2 && clave.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(clave.slice(2).toLowerCase(), valor);
    } else if (valor === true) {
      el.setAttribute(clave, '');
    } else {
      el.setAttribute(clave, String(valor));
    }
  }
}

function anexar(el, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo == null || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

/** Elemento HTML. Ejemplo: h('button', { class: 'boton', onClick: fn }, 'Texto') */
export function h(etiqueta, props, ...hijos) {
  const el = document.createElement(etiqueta);
  aplicar(el, props);
  anexar(el, hijos);
  return el;
}

/** Elemento SVG. */
export function s(etiqueta, props, ...hijos) {
  const el = document.createElementNS(SVG_NS, etiqueta);
  aplicar(el, props);
  anexar(el, hijos);
  return el;
}
