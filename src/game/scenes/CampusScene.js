const COLOR = {
  fondo: '#0A1828',
  rejilla: 0x1e3a57,
  suelo: 0x10263d,
  dorado: 0xbfa181,
  turquesa: 0x178582,
};

/**
 * Campus vacío: es el destino tras el registro. El mapa real (3 × 3 pantallas,
 * avatar, joystick, colisiones y minimapa) se construye en la Sesión 2.
 * Recibe Phaser como parámetro para que este archivo viva en el mismo bloque
 * diferido que Phaser y no engorde la carga inicial.
 */
export function crearCampusScene(Phaser) {
  return class CampusScene extends Phaser.Scene {
    constructor() {
      super({ key: 'Campus' });
    }

    create() {
      const { width, height } = this.scale;
      this.cameras.main.setBackgroundColor(COLOR.fondo);

      // Rejilla de 16 px: anticipa los tiles del mapa.
      this.suelo = this.add.grid(0, 0, width, height, 16, 16, COLOR.suelo, 0.6, COLOR.rejilla, 0.5).setOrigin(0, 0);

      // Marca de la plaza central, donde aparecerá el avatar.
      this.plaza = this.add.rectangle(width / 2, height / 2, 144, 144, COLOR.turquesa, 0.12).setStrokeStyle(4, COLOR.dorado, 0.9);

      this.titulo = this.add
        .text(width / 2, height / 2 - 10, 'Campus en construcción', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '9px',
          color: '#BFA181',
          align: 'center',
          wordWrap: { width: 128 },
          lineSpacing: 6,
        })
        .setOrigin(0.5);

      this.nota = this.add
        .text(width / 2, height / 2 + 30, 'El mapa llega en la Sesión 2', {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: '14px',
          color: '#9FB3C8',
          align: 'center',
        })
        .setOrigin(0.5);

      this.scale.on('resize', this.reacomodar, this);
      this.events.once('shutdown', () => this.scale.off('resize', this.reacomodar, this));
    }

    reacomodar({ width, height }) {
      this.suelo.setSize(width, height);
      this.plaza.setPosition(width / 2, height / 2);
      this.titulo.setPosition(width / 2, height / 2 - 10);
      this.nota.setPosition(width / 2, height / 2 + 30);
    }
  };
}
