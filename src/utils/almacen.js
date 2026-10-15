import { CLAVE_ALMACEN } from '../config.js';

/** Guarda solo la última matrícula escrita para rellenar el campo. Falla en silencio. */
export function crearAlmacen(clave = CLAVE_ALMACEN) {
  return {
    leer() {
      try {
        return localStorage.getItem(clave) ?? '';
      } catch {
        return '';
      }
    },
    guardar(valor) {
      try {
        localStorage.setItem(clave, valor);
      } catch {
        /* navegación privada o almacenamiento bloqueado: no pasa nada */
      }
    },
    borrar() {
      try {
        localStorage.removeItem(clave);
      } catch {
        /* igual */
      }
    },
  };
}
