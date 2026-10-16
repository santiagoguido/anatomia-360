import { crearEstado } from './estado.js';
import { crearPortada } from './ui/pantallas/portada.js';
import { crearRegistro } from './ui/pantallas/registro.js';
import { crearPrivacidad } from './ui/pantallas/privacidad.js';
import { crearBienvenida } from './ui/pantallas/bienvenida.js';
import { crearCampus } from './ui/pantallas/campus.js';
import { crearRonda } from './ui/pantallas/ronda.js';
import { crearResultado } from './ui/pantallas/resultado.js';
import { crearSalon } from './ui/pantallas/salon.js';
import { crearControl } from './ui/pantallas/control.js';
import { crearClinica } from './ui/pantallas/clinica.js';
import { crearExpedientes } from './ui/pantallas/expedientes.js';

const PANTALLAS = {
  portada: crearPortada,
  registro: crearRegistro,
  privacidad: crearPrivacidad,
  bienvenida: crearBienvenida,
  campus: crearCampus,
  ronda: crearRonda,
  resultado: crearResultado,
  salon: crearSalon,
  control: crearControl,
  clinica: crearClinica,
  expedientes: crearExpedientes,
};

/**
 * Arma el juego. Todo lo externo entra por parámetros (api, almacén, Phaser),
 * así las pantallas se pueden probar sin Supabase ni navegador.
 */
export function crearApp({ raiz, api, almacen, iniciarJuego, configurado = true }) {
  const estado = crearEstado();
  let actual = null;

  const ctx = { api, almacen, estado, iniciarJuego, configurado, irA, entrarALugar };

  /**
   * Punto de enganche de las puertas del campus. Devuelve true si el lugar ya lleva a algún lado.
   * Hoy: las 6 aulas → ronda, Salón de la Fama, Control Escolar y la Clínica (Sesión 6).
   */
  function entrarALugar(lugar) {
    if (lugar.tipo === 'aula') {
      irA('ronda', { aula: lugar.numero });
      return true;
    }
    if (lugar.tipo === 'salon') {
      irA('salon');
      return true;
    }
    if (lugar.tipo === 'control') {
      irA('control');
      return true;
    }
    if (lugar.tipo === 'clinica') {
      irA('clinica');
      return true;
    }
    return false;
  }

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
