import { h } from '../../utils/dom.js';
import { crearBoton } from '../componentes.js';

/**
 * Tarjeta que aparece al acercarse a una puerta. Se vuelve a dibujar solo cuando cambia
 * algo (otro lugar, el aula abrió); la cuenta regresiva solo cambia su número, así el
 * botón no pierde el foco cada segundo.
 */
export function crearTarjetaLugar({ alEntrar }) {
  const el = h('aside', { class: 'tarjeta-lugar', hidden: true, 'aria-live': 'polite' });
  let firma = null;
  let valorCuenta = null;
  let actual = null;

  function construir(m) {
    const hijos = [
      h(
        'div',
        { class: 'tarjeta-lugar__cabecera' },
        h('span', { class: 'tarjeta-lugar__titulo' }, m.encabezado),
        h('span', { class: `sello sello--${m.estado.tono}` }, m.estado.texto),
      ),
      h('div', { class: 'tarjeta-lugar__lineas' }, ...m.lineas.map((l) => h('p', {}, l))),
    ];
    if (m.chips?.length) hijos.push(h('ul', { class: 'chips' }, ...m.chips.map((c) => h('li', {}, c))));
    if (m.metricas?.length) {
      hijos.push(
        h(
          'div',
          { class: 'metricas' },
          ...m.metricas.map((x) => h('div', { class: 'metrica' }, h('span', {}, x.etiqueta), h('strong', {}, x.valor))),
        ),
      );
    }
    valorCuenta = null;
    if (m.cuenta) {
      valorCuenta = h('strong', { class: 'cuenta__valor' }, m.cuenta.valor);
      hijos.push(h('div', { class: 'cuenta' }, h('span', {}, m.cuenta.etiqueta), valorCuenta));
    }
    if (m.nota) hijos.push(h('p', { class: 'tarjeta-lugar__nota' }, m.nota));
    const boton = crearBoton({ texto: m.boton.texto, onClick: () => actual && alEntrar(actual) });
    boton.disabled = !m.boton.habilitado;
    hijos.push(boton);
    el.classList.toggle('tarjeta-lugar--bloqueada', !m.abierta && m.tipo === 'aula');
    el.replaceChildren(...hijos);
  }

  return {
    el,
    /** Muestra la tarjeta del lugar `lugar` con los datos `modelo` (ver game/tarjetas.js). */
    mostrar(lugar, modelo) {
      actual = lugar;
      const nueva = JSON.stringify({ ...modelo, cuenta: modelo.cuenta ? modelo.cuenta.etiqueta : null });
      if (nueva !== firma) {
        firma = nueva;
        construir(modelo);
      } else if (valorCuenta && modelo.cuenta) {
        valorCuenta.textContent = modelo.cuenta.valor;
      }
      el.hidden = false;
    },
    ocultar() {
      actual = null;
      firma = null;
      el.hidden = true;
    },
  };
}
