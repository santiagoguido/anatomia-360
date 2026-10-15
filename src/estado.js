/** Lo que el juego recuerda mientras la página está abierta. */
export function crearEstado() {
  const estado = {
    /** Jugador con sesión (el JSON que devuelve Supabase), o null. */
    jugador: null,
    /** Datos que se van capturando en el registro por pasos. */
    registro: { matricula: '', nombre: '', genero: null },

    iniciarSesion(jugador) {
      estado.jugador = jugador;
    },
    limpiarRegistro() {
      estado.registro = { matricula: '', nombre: '', genero: null };
    },
    cerrarSesion() {
      estado.jugador = null;
      estado.limpiarRegistro();
    },
  };
  return estado;
}
