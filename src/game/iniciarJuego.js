/**
 * Arranca Phaser dentro de `contenedor`. Phaser pesa ~1.2 MB, así que se carga
 * solo cuando el jugador entra al campus (la portada y el registro abren rápido,
 * incluso en celulares de gama baja).
 *
 * `opciones` (todas las manda la pantalla del campus):
 *   jugador, controles, aulasIniciales, alCambiarLugar, alAccion, alMover, alResistencia
 * Devuelve { destruir, actualizarAulas } para que la página controle el juego.
 */
export async function iniciarJuego(contenedor, opciones) {
  // Las fuentes pixel deben estar listas antes de que Phaser dibuje texto.
  if (document.fonts?.load) {
    await Promise.allSettled([
      document.fonts.load('16px "Pixelify Sans"'),
      document.fonts.load('16px "Press Start 2P"'),
    ]);
  }

  const [{ default: Phaser }, { crearCampusScene }] = await Promise.all([
    import('phaser'),
    import('./scenes/CampusScene.js'),
  ]);

  const juego = new Phaser.Game({
    type: Phaser.AUTO,
    parent: contenedor,
    backgroundColor: '#174230',
    pixelArt: true, // pixeles nítidos, sin suavizado
    roundPixels: true,
    banner: false,
    disableContextMenu: true, // evita el menú al mantener presionado en el celular
    input: { activePointers: 3 },
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [crearCampusScene(Phaser)],
    callbacks: {
      preBoot: (g) => {
        g.registry.set('opciones', opciones);
        g.registry.set('aulas', opciones.aulasIniciales ?? []);
      },
    },
  });

  // Espera a que Phaser termine de arrancar (si ya arrancó, no hay nada que esperar).
  if (!juego.isRunning) {
    await new Promise((resolver) => juego.events.once(Phaser.Core.Events.READY, resolver));
  }

  return {
    /** Cambia qué aulas se ven abiertas (cuando el servidor confirma o llega la hora). */
    actualizarAulas(aulas) {
      juego.registry.set('aulas', aulas);
      juego.events.emit('a360:aulas', aulas);
    },
    destruir() {
      juego.destroy(true);
    },
  };
}
