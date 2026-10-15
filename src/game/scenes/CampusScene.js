import { CAMPUS } from '../../textos.js';
import { MOVIMIENTO, PROXIMIDAD } from '../../config.js';
import { estaAbierta } from '../aulas.js';
import { mover } from '../colisiones.js';
import { combinarEntrada, direccionDe, vectorTeclado } from '../entrada.js';
import {
  ARBOLES, BANCAS, CARTELES, EDIFICIOS, ESTATUAS, FAROLAS, FUENTE, LUGARES, MUNDO_PX, OBSTACULOS,
  PANTALLA, SPAWN, TILE, distanciaALugar, dentroDeLugar,
} from '../mapa.js';
import { avanzarResistencia, barrasEncendidas, crearResistencia } from '../resistencia.js';
import { crearTexturas } from '../texturas.js';

const PROFUNDIDAD_ETIQUETAS = 100000;
const CICLO_PASOS = [1, 0, 2, 0];

/**
 * Campus: mapa de 3 × 3 pantallas con avatar, colisiones, carreras con resistencia y
 * tarjetas de proximidad. Recibe Phaser como parámetro para vivir en el mismo bloque
 * diferido que Phaser y no engordar la carga inicial.
 *
 * Todo lo que toca la página (joystick, minimapa, tarjetas) llega por `opciones`:
 *   controles        { vector, correr } que escribe el joystick y el botón CORRER
 *   alCambiarLugar   (idLugar | null)   → se llama al acercarse o alejarse de una puerta
 *   alAccion         ()                 → tecla E / Enter
 *   alMover          ({ x, y, vista })  → posición para el minimapa (unas 10 veces por segundo)
 *   alResistencia    (barras, agotada)  → para el indicador del botón CORRER
 */
export function crearCampusScene(Phaser) {
  return class CampusScene extends Phaser.Scene {
    constructor() {
      super({ key: 'Campus' });
    }

    create() {
      this.op = this.registry.get('opciones') ?? {};
      this.controles = this.op.controles ?? { vector: { x: 0, y: 0, fuerza: 0 }, correr: false };

      this.cameras.main.setBackgroundColor('#174230');
      crearTexturas(this, this.op.jugador?.genero);

      this.add.image(0, 0, 'suelo').setOrigin(0, 0).setDepth(0);
      this.crearCarteles();
      this.crearMobiliario();
      this.crearEdificios();
      this.crearAvatar();
      this.crearCamara();
      this.crearTeclado();

      this.abiertas = new Map();
      this.aplicarAulas(this.registry.get('aulas') ?? []);
      this.game.events.on('a360:aulas', this.aplicarAulas, this);

      this.scale.on('resize', this.ajustarZoom, this);
      this.events.once('shutdown', () => {
        this.game.events.off('a360:aulas', this.aplicarAulas, this);
        this.scale.off('resize', this.ajustarZoom, this);
      });
    }

    // ---- Construcción -------------------------------------------------------------

    crearMobiliario() {
      for (const a of ARBOLES) {
        this.add.image(a.tx * TILE + 8, a.ty * TILE + 16, `arbol-${a.variante}`).setOrigin(0.5, 1).setDepth(a.ty * TILE + 16);
      }
      for (const b of BANCAS) this.add.image(b.x * TILE, b.y * TILE + 4, 'banca').setOrigin(0, 0).setDepth(b.y * TILE + 12);
      for (const f of FAROLAS) this.add.image(f.x * TILE + 4, f.y * TILE + 16, 'farola').setOrigin(0, 1).setDepth(f.y * TILE + 16);
      for (const s of ESTATUAS) this.add.image(s.x * TILE - 4, s.y * TILE + 16, 'estatua').setOrigin(0, 1).setDepth(s.y * TILE + 16);

      this.fuente = this.add
        .image(FUENTE.x * TILE, FUENTE.y * TILE - 8, 'fuente-0')
        .setOrigin(0, 0)
        .setDepth((FUENTE.y + FUENTE.h) * TILE);
      let chispa = 0;
      this.time.addEvent({
        delay: 550,
        loop: true,
        callback: () => {
          chispa = 1 - chispa;
          this.fuente.setTexture(`fuente-${chispa}`);
        },
      });
    }

    crearEdificios() {
      this.edificiosAula = new Map();
      // Fondo oscuro: algunas etiquetas caen sobre la calzada y sin él los ladrillos parecen tachar el texto.
      const estiloEtiqueta = {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#E8DCC6',
        align: 'center',
        backgroundColor: 'rgba(8, 19, 33, 0.8)',
        padding: { x: 6, y: 4 },
      };
      for (const e of EDIFICIOS) {
        const clave = e.tipo === 'aula' ? `edif-${e.id}-c` : `edif-${e.id}`;
        const imagen = this.add.image(e.x * TILE, e.y * TILE, clave).setOrigin(0, 0).setDepth((e.y + e.h) * TILE);
        const etiqueta = this.add
          .text((e.x + e.w / 2) * TILE, e.y * TILE - 4, CAMPUS.etiquetas[e.id] ?? '', estiloEtiqueta)
          .setOrigin(0.5, 1)
          .setDepth(PROFUNDIDAD_ETIQUETAS);
        if (e.tipo === 'aula') {
          etiqueta.setColor('#9FB3C8');
          this.edificiosAula.set(e.numero, { e, imagen, etiqueta });
        }
      }
    }

    crearCarteles() {
      for (const c of CARTELES) {
        const izquierda = c.alinear === 'izquierda';
        const texto = this.add
          .text(c.x, c.y, CAMPUS.carteles[c.clave], { fontFamily: '"Pixelify Sans", monospace', fontSize: '12px', color: '#E8DCC6' })
          .setPadding(8, 4, 8, 4)
          .setOrigin(izquierda ? 0 : 1, 0.5)
          .setDepth(2);
        this.add
          .rectangle(c.x, c.y, texto.width, texto.height, 0x0a1828)
          .setStrokeStyle(2, 0xbfa181)
          .setOrigin(izquierda ? 0 : 1, 0.5)
          .setDepth(1);
      }
    }

    crearAvatar() {
      this.pos = { x: SPAWN.x, y: SPAWN.y };
      this.mirada = { dir: 'abajo', espejo: false };
      this.resistencia = crearResistencia();
      this.tiempoPaso = 0;
      this.tiempoMapa = 0;
      this.lugarActual = null;
      this.barrasMostradas = -1;
      this.agotadaMostrada = null;

      this.sombra = this.add.image(this.pos.x, this.pos.y, 'sombra').setOrigin(0.5, 0.7);
      this.avatar = this.add.image(this.pos.x, this.pos.y, 'avatar-abajo-0').setOrigin(0.5, 1);
      this.foco = { x: this.pos.x, y: this.pos.y - 12 };
    }

    crearCamara() {
      const cam = this.cameras.main;
      cam.setBounds(0, 0, MUNDO_PX.w, MUNDO_PX.h);
      cam.setRoundPixels(true);
      cam.startFollow(this.foco, true, 0.16, 0.16);
      this.ajustarZoom();
      cam.centerOn(this.foco.x, this.foco.y);
    }

    crearTeclado() {
      // `false`: Phaser no se queda con las teclas, así Tab, Enter y Espacio siguen funcionando en los botones de la página.
      this.teclas = this.input.keyboard.addKeys(
        { izq: 'LEFT', der: 'RIGHT', arr: 'UP', aba: 'DOWN', a: 'A', d: 'D', w: 'W', s: 'S', shift: 'SHIFT', e: 'E', enter: 'ENTER' },
        false,
      );
      const accion = () => {
        const activo = document.activeElement?.tagName;
        if (activo === 'BUTTON' || activo === 'INPUT') return; // Enter ya activó ese botón
        this.op.alAccion?.();
      };
      this.teclas.e.on('down', () => this.op.alAccion?.());
      this.teclas.enter.on('down', accion);
    }

    /** Un zoom entero (nítido) que deja ver al menos una pantalla completa cuando cabe. */
    ajustarZoom() {
      const { width, height } = this.scale;
      const zoom = Math.max(1, Math.floor(Math.min(width / (PANTALLA.w * TILE), height / (PANTALLA.h * TILE))));
      this.cameras.main.setZoom(zoom);
    }

    // ---- Aulas abiertas / bloqueadas ---------------------------------------------

    aplicarAulas(lista) {
      const ahora = Date.now();
      for (const aula of lista) {
        const marca = this.edificiosAula?.get(aula.numero);
        if (!marca) continue;
        const abierta = estaAbierta(aula, ahora);
        if (this.abiertas.get(aula.numero) === abierta) continue;
        this.abiertas.set(aula.numero, abierta);
        marca.imagen.setTexture(`edif-${marca.e.id}-${abierta ? 'a' : 'c'}`);
        marca.etiqueta.setColor(abierta ? '#E8DCC6' : '#9FB3C8');
      }
    }

    // ---- Cada cuadro ----------------------------------------------------------------

    update(_tiempo, delta) {
      const dt = Math.min(delta, 50) / 1000;
      const t = this.teclas;
      const teclado = vectorTeclado(t.izq.isDown || t.a.isDown, t.der.isDown || t.d.isDown, t.arr.isDown || t.w.isDown, t.aba.isDown || t.s.isDown);
      const vec = combinarEntrada(this.controles.vector, teclado);
      const quiereMoverse = vec.fuerza > 0;

      const r = avanzarResistencia(this.resistencia, dt, this.controles.correr || t.shift.isDown, quiereMoverse);
      this.resistencia = r;
      this.mostrarResistencia(r);

      let seMovio = false;
      if (quiereMoverse) {
        const velocidad = (r.corre ? MOVIMIENTO.correr : MOVIMIENTO.caminar) * Math.max(vec.fuerza, 0.45);
        const res = mover(this.pos, vec.x * velocidad * dt, vec.y * velocidad * dt, OBSTACULOS, MUNDO_PX);
        seMovio = res.x !== this.pos.x || res.y !== this.pos.y;
        this.pos.x = res.x;
        this.pos.y = res.y;
        this.mirada = direccionDe(vec, this.mirada);
      }

      this.dibujarAvatar(delta, seMovio, r.corre);
      this.revisarLugares();
      this.avisarPosicion(delta);
    }

    dibujarAvatar(delta, seMovio, corre) {
      let paso = 0;
      if (seMovio) {
        this.tiempoPaso += delta * (corre ? 1.5 : 1);
        paso = CICLO_PASOS[Math.floor(this.tiempoPaso / 130) % CICLO_PASOS.length];
      } else {
        this.tiempoPaso = 0;
      }
      const x = Math.round(this.pos.x);
      const y = Math.round(this.pos.y);
      this.avatar.setTexture(`avatar-${this.mirada.dir}-${paso}`);
      this.avatar.setFlipX(this.mirada.dir === 'lado' && this.mirada.espejo);
      this.avatar.setPosition(x, y).setDepth(y);
      this.sombra.setPosition(x, y).setDepth(y - 1);
      this.foco.x = x;
      this.foco.y = y - 12;
    }

    revisarLugares() {
      const { x, y } = this.pos;
      const actual = this.lugarActual ? LUGARES.find((l) => l.id === this.lugarActual) : null;
      // Una vez cerca, la tarjeta se queda hasta alejarse un poco más (evita que parpadee en el borde).
      if (actual && dentroDeLugar(actual, x, y, PROXIMIDAD.salir)) return;

      let mejor = null;
      let mejorDist = Infinity;
      for (const lugar of LUGARES) {
        if (!dentroDeLugar(lugar, x, y, PROXIMIDAD.entrar)) continue;
        const d = distanciaALugar(lugar, x, y);
        if (d < mejorDist) { mejor = lugar; mejorDist = d; }
      }
      const id = mejor?.id ?? null;
      if (id !== this.lugarActual) {
        this.lugarActual = id;
        this.op.alCambiarLugar?.(id);
      }
    }

    mostrarResistencia(r) {
      const barras = barrasEncendidas(r.nivel);
      if (barras === this.barrasMostradas && r.agotada === this.agotadaMostrada) return;
      this.barrasMostradas = barras;
      this.agotadaMostrada = r.agotada;
      this.op.alResistencia?.(barras, r.agotada);
    }

    avisarPosicion(delta) {
      this.tiempoMapa += delta;
      if (this.tiempoMapa < 100) return;
      this.tiempoMapa = 0;
      const v = this.cameras.main.worldView;
      this.op.alMover?.({ x: this.pos.x, y: this.pos.y, vista: { x: v.x, y: v.y, w: v.width, h: v.height } });
    }
  };
}
