import { crearEstado } from './estado.js';
import { crearPortada } from './ui/pantallas/portada.js';
import { crearRegistro } from './ui/pantallas/registro.js';
import { crearPrivacidad } from './ui/pantallas/privacidad.js';
import { crearBienvenida } from './ui/pantallas/bienvenida.js';
import { crearCampus } from './ui/pantallas/campus.js';

const PANTALLAS = {
  portada: crearPortada,
  registro: crearRegistro,
  privacidad: crearPrivacidad,
  bienvenida: crearBienvenida,
  campus: crearCampus,
};

/**
 * Arma el juego. Todo lo externo entra por parámetros (api, almacén, Phaser),
 * así las pantallas se pueden probar sin Supabase ni navegador.
 */
export function crearApp({ raiz, api, almacen, iniciarJuego, configurado = true }) {
  const estado = crearEstado();
  let actual = null;

  const ctx = { api, almacen, estado, iniciarJuego, configurado, irA };

  function irA(nombre, params = {}) {
    actual?.alSalir?.();
    const pantalla = PANTALLAS[nombre](ctx, params);
    if (pantalla.redirigir) return irA(pantalla.redirigir, pantalla.params);
    actual = pantalla;
    raiz.replaceChildren(pantalla.el);
    pantalla.alMontar?.();
    // Lleva el foco al campo o título principal para lectores de pantalla y teclado.
    const destino = pantalla.el.querySelector('[data-foco]') ?? pantalla.el.querySelector('h1');
    destino?.focus({ preventScroll: true });
  }

  irA('portada');
  return { irA, estado };
}
