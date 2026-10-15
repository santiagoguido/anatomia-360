// Todo el arte del campus se dibuja con rectángulos al arrancar: no hay imágenes que descargar,
// y cambiar un color o una forma es editar un número. Phaser solo se usa para guardar cada dibujo como textura.
import { ICONOS, PALETA } from '../ui/sprites.js';
import { DIRECCIONES, PASOS, cuadroAvatar } from './avatarFrames.js';
import { CAMINOS, EDIFICIOS, ESTANQUES, MUNDO, MUNDO_PX, PLAZA, TILE } from './mapa.js';
import { mulberry32 } from '../utils/azar.js';

const hex = (s) => parseInt(s.slice(1), 16);

const C = {
  pasto: 0x174230, pastoClaro: 0x1c4a37, mota: 0x2c6b4e,
  camino: 0x7a6c52, caminoMarca: 0x5e533f, caminoBorde: 0x9c8a68,
  plaza: 0x8a7a5e, plazaClara: 0x94846a,
  agua: 0x1b5e6b, aguaClara: 0x2a8a94, orilla: 0x0f4f4d, hoja: 0x2f7a55,
  dorado: 0xbfa181, crema: 0xe8dcc6, sombra: 0x081321, puerta: 0x0a1828,
};

/** Dibuja con `pix(color, x, y, ancho, alto, alfa)` y guarda el resultado como textura `clave`. */
function lienzo(scene, clave, ancho, alto, dibujar) {
  if (scene.textures.exists(clave)) scene.textures.remove(clave);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const pix = (color, x, y, w, h, alfa = 1) => {
    g.fillStyle(color, alfa);
    g.fillRect(x, y, w, h);
  };
  dibujar(pix);
  g.generateTexture(clave, ancho, alto);
  g.destroy();
}

// ---- Suelo --------------------------------------------------------------------

function suelo(scene) {
  lienzo(scene, 'suelo', MUNDO_PX.w, MUNDO_PX.h, (pix) => {
    const azar = mulberry32(20261019);
    pix(C.pasto, 0, 0, MUNDO_PX.w, MUNDO_PX.h);
    for (let ty = 0; ty < MUNDO.h; ty += 1) {
      for (let tx = ty % 2; tx < MUNDO.w; tx += 2) pix(C.pastoClaro, tx * TILE, ty * TILE, TILE, TILE);
    }
    for (let i = 0; i < 1100; i += 1) pix(C.mota, Math.floor(azar() * (MUNDO_PX.w / 4)) * 4, Math.floor(azar() * (MUNDO_PX.h / 4)) * 4, 4, 4);

    for (const e of ESTANQUES) estanque(pix, e, azar);

    for (const c of CAMINOS) {
      const x = c.x * TILE; const y = c.y * TILE; const w = c.w * TILE; const h = c.h * TILE;
      pix(C.camino, x, y, w, h);
      for (let fila = 0; fila < h / 8; fila += 1) {
        for (let cx = (fila % 2) * 8; cx < w; cx += 16) pix(C.caminoMarca, x + cx, y + fila * 8, 2, 8);
      }
      pix(C.caminoBorde, x, y, w, 2);
    }

    // Plaza: octágono hecho con tiles (se quitan las esquinas).
    for (let ty = 0; ty < PLAZA.h; ty += 1) {
      for (let tx = 0; tx < PLAZA.w; tx += 1) {
        const dx = Math.min(tx, PLAZA.w - 1 - tx);
        const dy = Math.min(ty, PLAZA.h - 1 - ty);
        if (dx + dy < 2) continue;
        pix((tx + ty) % 2 === 0 ? C.plaza : C.plazaClara, (PLAZA.x + tx) * TILE, (PLAZA.y + ty) * TILE, TILE, TILE);
      }
    }

    // Flores sueltas, solo sobre el pasto.
    const sobreCamino = (px, py) => [...CAMINOS, PLAZA, ...ESTANQUES, ...EDIFICIOS].some((r) => px >= r.x * TILE && px < (r.x + r.w) * TILE && py >= r.y * TILE && py < (r.y + r.h) * TILE);
    for (let i = 0; i < 220; i += 1) {
      const px = Math.floor(azar() * (MUNDO_PX.w / 2)) * 2;
      const py = Math.floor(azar() * (MUNDO_PX.h / 2)) * 2;
      if (!sobreCamino(px, py)) pix(azar() < 0.5 ? C.dorado : C.crema, px, py, 2, 2);
    }
  });
}

function estanque(pix, e, azar) {
  const x = e.x * TILE; const y = e.y * TILE; const w = e.w * TILE; const h = e.h * TILE;
  pix(C.orilla, x, y + 4, w, h - 8);
  pix(C.orilla, x + 4, y, w - 8, h);
  pix(C.agua, x + 4, y + 8, w - 8, h - 16);
  pix(C.agua, x + 8, y + 4, w - 16, h - 8);
  for (let i = 0; i < 14; i += 1) pix(C.aguaClara, x + 12 + Math.floor(azar() * ((w - 32) / 4)) * 4, y + 10 + Math.floor(azar() * ((h - 24) / 4)) * 4, 8, 2);
  for (let i = 0; i < 4; i += 1) {
    const lx = x + 16 + Math.floor(azar() * ((w - 48) / 4)) * 4;
    const ly = y + 14 + Math.floor(azar() * ((h - 36) / 4)) * 4;
    pix(C.hoja, lx, ly, 8, 6);
    pix(C.agua, lx + 6, ly + 2, 2, 2);
  }
}

// ---- Mobiliario -------------------------------------------------------------------

function arboles(scene) {
  for (const variante of [0, 1]) {
    lienzo(scene, `arbol-${variante}`, 32, 40, (pix) => {
      pix(0x5a3e2b, 12, 28, 8, 12);
      pix(0x3d2a1d, 12, 28, 2, 12);
      pix(0x1f5c40, 4, 24, 24, 8);
      pix(0x2f7a55, 0, 8, 32, 18);
      pix(0x2f7a55, 4, 0, 24, 10);
      pix(0x1f5c40, 0, 22, 32, 4);
      if (variante === 0) { pix(0x47a06e, 8, 4, 8, 6); pix(0x47a06e, 4, 12, 6, 6); pix(0x47a06e, 20, 14, 6, 4); }
      else { pix(0x47a06e, 18, 4, 8, 6); pix(0x47a06e, 22, 12, 6, 6); pix(0x47a06e, 6, 14, 6, 4); }
    });
  }
}

function mobiliario(scene) {
  lienzo(scene, 'banca', 32, 12, (pix) => {
    pix(0x8a6238, 0, 0, 32, 3);
    pix(0x6b4a2e, 0, 3, 32, 5);
    pix(0x3a2a1c, 2, 8, 3, 4);
    pix(0x3a2a1c, 27, 8, 3, 4);
  });
  lienzo(scene, 'farola', 8, 28, (pix) => {
    pix(0x2e4a66, 2, 0, 4, 2);
    pix(C.dorado, 1, 2, 6, 6);
    pix(C.crema, 2, 3, 4, 4);
    pix(0x2e4a66, 3, 8, 2, 18);
    pix(0x2e4a66, 1, 26, 6, 2);
  });
  lienzo(scene, 'estatua', 24, 28, (pix) => {
    pix(0x6e7f91, 0, 18, 24, 10);
    pix(0x8fa0b2, 2, 16, 20, 4);
    pix(0xc9d6e3, 7, 6, 10, 12);
    pix(0xe8eef5, 9, 0, 6, 7);
    pix(0xc9d6e3, 4, 8, 3, 8);
    pix(0xc9d6e3, 17, 8, 3, 8);
  });
  lienzo(scene, 'sombra', 14, 5, (pix) => {
    pix(0x000000, 3, 0, 8, 5, 0.32);
    pix(0x000000, 1, 1, 12, 3, 0.32);
  });
}

function fuente(scene) {
  for (const chispa of [0, 1]) {
    lienzo(scene, `fuente-${chispa}`, 80, 56, (pix) => {
      const y0 = 8;
      pix(0x2e4a66, 8, y0, 64, 48);
      pix(0x2e4a66, 4, y0 + 4, 72, 40);
      pix(0x2e4a66, 0, y0 + 8, 80, 32);
      pix(0x4a6a88, 8, y0, 64, 2);
      pix(0x178582, 12, y0 + 8, 56, 32);
      pix(0x178582, 8, y0 + 12, 64, 24);
      pix(0x1fa6a2, 16, y0 + 12, 48, 24);
      const brillos = chispa === 0 ? [[18, 16], [52, 30], [26, 32], [58, 20]] : [[24, 14], [46, 34], [18, 28], [60, 26]];
      for (const [bx, by] of brillos) pix(0x5fd3d0, bx, y0 + by, 6, 2);
      pix(C.dorado, 32, y0 + 14, 16, 16);
      pix(C.crema, 36, y0 + 10, 8, 8);
      pix(C.crema, 38, 0 + 2, 4, 14);
      pix(0x5fd3d0, chispa === 0 ? 34 : 42, 4, 2, 2);
      pix(0x5fd3d0, chispa === 0 ? 44 : 36, 8, 2, 2);
    });
  }
}

// ---- Edificios ----------------------------------------------------------------------

const TEMAS = {
  aulaAbierta: { muro: 0x16304b, sombra: 0x10263d, techo: 0x178582, techoClaro: 0x1fa6a2, ventana: 0x1fa6a2, brillo: 0xc9f3f1 },
  aulaCerrada: { muro: 0x10263d, sombra: 0x0b1b2e, techo: 0x2e4a66, techoClaro: 0x3a5a7a, ventana: 0x1e3a57, brillo: 0x2e4a66 },
  clinica: { muro: 0x2e4a66, sombra: 0x1e3a57, techo: 0xe8dcc6, techoClaro: 0xf6efe2, ventana: 0x5fd3d0, brillo: 0xc9f3f1 },
  salon: { muro: 0x16304b, sombra: 0x10263d, techo: 0xbfa181, techoClaro: 0xd8bf9a, ventana: 0xe8dcc6, brillo: 0xffffff },
  control: { muro: 0x16304b, sombra: 0x10263d, techo: 0xbfa181, techoClaro: 0xd8bf9a, ventana: 0x1fa6a2, brillo: 0xc9f3f1 },
  deco: { muro: 0x16304b, sombra: 0x10263d, techo: 0x0f4f4d, techoClaro: 0x178582, ventana: 0x1fa6a2, brillo: 0xc9f3f1 },
};

function temaDe(e, abierta) {
  if (e.tipo === 'aula') return abierta ? TEMAS.aulaAbierta : TEMAS.aulaCerrada;
  return TEMAS[e.tipo];
}

function dibujarIcono(pix, nombre, x, y, escala, color) {
  ICONOS[nombre].forEach((fila, fy) => {
    [...fila].forEach((c, fx) => { if (c === '#') pix(color, x + fx * escala, y + fy * escala, escala, escala); });
  });
}

function emblema(pix, e, abierta, W, tema) {
  const cx = W / 2;
  if (e.tipo === 'aula' && !abierta) {
    // Candado: el aula todavía no abre.
    pix(C.dorado, cx - 4, 36, 8, 2);
    pix(C.dorado, cx - 4, 36, 2, 8);
    pix(C.dorado, cx + 2, 36, 2, 8);
    pix(C.dorado, cx - 6, 42, 12, 10);
    pix(C.puerta, cx - 1, 45, 2, 4);
  } else if (e.tipo === 'clinica') {
    pix(0x178582, cx - 8, 34, 16, 16);
    pix(0xffffff, cx - 2, 36, 4, 12);
    pix(0xffffff, cx - 6, 40, 12, 4);
  } else if (e.tipo === 'salon') {
    dibujarIcono(pix, 'trofeo', cx - 8, 34, 2, C.crema);
  } else if (e.tipo === 'control') {
    pix(C.crema, cx - 6, 34, 12, 16);
    pix(tema.muro, cx - 4, 38, 8, 2);
    pix(tema.muro, cx - 4, 42, 8, 2);
    pix(tema.muro, cx - 4, 46, 5, 2);
  }
}

function edificio(scene, clave, e, abierta) {
  const W = e.w * TILE;
  const H = e.h * TILE;
  const t = temaDe(e, abierta);
  lienzo(scene, clave, W, H, (pix) => {
    // Muro
    pix(t.muro, 0, 33, W, H - 33);
    pix(t.sombra, 0, 33, 4, H - 33);
    pix(t.sombra, W - 4, 33, 4, H - 33);
    pix(t.sombra, 0, H - 4, W, 4);
    // Techo escalonado
    pix(t.techo, 8, 0, W - 16, 10);
    pix(t.techo, 4, 10, W - 8, 10);
    pix(t.techo, 0, 20, W, 10);
    pix(t.techoClaro, 8, 0, W - 16, 2);
    pix(t.techoClaro, 4, 10, W - 8, 2);
    pix(t.techoClaro, 0, 20, W, 2);
    pix(C.sombra, 0, 30, W, 3);
    // Ventanas, repartidas a los lados de la puerta
    const zonaPuerta = [W / 2 - 20, W / 2 + 20];
    for (let x = 12; x + 12 <= W - 12; x += 20) {
      if (x + 12 > zonaPuerta[0] && x < zonaPuerta[1]) continue;
      const y = 40;
      pix(0x2e4a66, x - 1, y - 1, 14, 16);
      pix(t.ventana, x, y, 12, 14);
      pix(t.brillo, x + 1, y + 1, 4, 3);
    }
    // Puerta
    const ph = Math.min(40, H - 46);
    pix(C.dorado, W / 2 - 14, H - ph - 2, 28, 2);
    pix(C.dorado, W / 2 - 14, H - ph - 2, 2, ph + 2);
    pix(C.dorado, W / 2 + 12, H - ph - 2, 2, ph + 2);
    pix(C.puerta, W / 2 - 12, H - ph, 24, ph);
    pix(C.dorado, W / 2 + 6, H - ph / 2, 3, 3);
    pix(0x8a7a5e, W / 2 - 18, H - 4, 36, 4);
    emblema(pix, e, abierta, W, t);
  });
}

function edificios(scene) {
  for (const e of EDIFICIOS) {
    if (e.tipo === 'aula') {
      edificio(scene, `edif-${e.id}-a`, e, true);
      edificio(scene, `edif-${e.id}-c`, e, false);
    } else {
      edificio(scene, `edif-${e.id}`, e, true);
    }
  }
}

// ---- Avatar ---------------------------------------------------------------------------

function avatar(scene, genero) {
  for (const dir of DIRECCIONES) {
    for (const paso of PASOS) {
      const filas = cuadroAvatar(genero, dir, paso);
      lienzo(scene, `avatar-${dir}-${paso}`, 16, 24, (pix) => {
        filas.forEach((fila, y) => {
          let x = 0;
          while (x < fila.length) {
            const c = fila[x];
            if (c === '.' || c === ' ') { x += 1; continue; }
            let fin = x;
            while (fin < fila.length && fila[fin] === c) fin += 1;
            pix(hex(PALETA[c]), x, y, fin - x, 1);
            x = fin;
          }
        });
      });
    }
  }
}

/** Genera todas las texturas del campus. Se llama una vez, al crear la escena. */
export function crearTexturas(scene, genero) {
  suelo(scene);
  arboles(scene);
  mobiliario(scene);
  fuente(scene);
  edificios(scene);
  avatar(scene, genero);
}
