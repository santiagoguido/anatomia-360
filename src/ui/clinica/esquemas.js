// Esquemas anatómicos de la Clínica: dibujos PROPIOS en SVG (nunca copiados del libro), en el estilo pixel art del juego.
// Cada base es una lista de formas con `id` (las que un caso puede resaltar) y un `tono` (qué tejido es).
// Se muestran SOLO en el desenlace de un caso: el servidor manda { base, resaltar: [ids], pie } y aquí se dibuja.
// Sin DOM al importar: `formasDe` y `esquemaComoTexto` se prueban con Node; `crearEsquema` arma el SVG del navegador.
import { s } from '../../utils/dom.js';

export const TONOS = {
  hueso: '#BFA181',
  musculo: '#1B7A76',
  nervio: '#E8DCC6',
  arteria: '#C8554A',
  vena: '#4A7FC8',
  viscera: '#3D6385',
  cartilago: '#9FB3C8',
  ligamento: '#8A6D4E',
  fascia: '#9FB3C8',
  zona: '#2A5078',
  piel: '#1B3A5A',
};
export const RESALTE = { relleno: '#1FA6A2', trazo: '#FFFFFF' };
const TRAZO = '#0A1828';

// Constructores de formas: poligono, rectángulo, elipse, círculo y trazo (línea gruesa).
const P = (id, tono, puntos) => ({ id, tono, tipo: 'poligono', puntos });
const R = (id, tono, x, y, w, h) => ({ id, tono, tipo: 'rect', x, y, w, h });
const E = (id, tono, cx, cy, rx, ry) => ({ id, tono, tipo: 'elipse', cx, cy, rx, ry });
const C = (id, tono, cx, cy, r) => E(id, tono, cx, cy, r, r);
const T = (id, tono, d, ancho = 2.5) => ({ id, tono, tipo: 'trazo', d, ancho });
// Contorno sin relleno (fascias, límites).
const O = (id, tono, cx, cy, rx, ry, ancho = 1.5) => ({ id, tono, tipo: 'contorno', cx, cy, rx, ry, ancho });

export const ESQUEMAS = {
  'cuello-lateral': {
    titulo: 'Cuello, vista lateral derecha',
    etiquetas: {
      ecm: 'Esternocleidomastoideo',
      trapecio: 'Trapecio',
      'nc-xi': 'Nervio accesorio (NC XI)',
      'triangulo-occipital': 'Triángulo occipital',
      'punto-nervioso': 'Punto nervioso del cuello',
      frenico: 'Nervio frénico',
      vye: 'Vena yugular externa',
    },
    formas: [
      P(null, 'piel', '48,8 122,8 138,30 130,52 110,57 96,55 72,59 52,40'),
      T(null, 'hueso', 'M52,40 L72,59 L96,55 L110,57', 2),
      P(null, 'piel', '72,57 112,56 124,96 152,112 152,138 36,138 36,112 66,96'),
      P('triangulo-occipital', 'zona', '117,57 122,57 131,93 103,93'),
      P('trapecio', 'musculo', '121,55 129,59 152,108 126,106 127,80'),
      P('ecm', 'musculo', '108,52 117,54 91,114 78,112'),
      T(null, 'musculo', 'M103,92 L131,88', 2),
      T(null, 'hueso', 'M56,116 L150,108', 4),
      T('frenico', 'nervio', 'M100,70 L90,106', 2),
      T('vye', 'vena', 'M112,58 L99,108', 2),
      T('nc-xi', 'nervio', 'M106,74 L122,80 L139,90', 2.5),
      C('punto-nervioso', 'hueso', 103, 84, 3.5),
    ],
  },

  'cuello-axial': {
    titulo: 'Corte transversal del cuello (esquema)',
    etiquetas: {
      'lamina-superficial': 'Lámina superficial de la fascia cervical profunda',
      'lamina-prevertebral': 'Lámina prevertebral',
      'espacio-retrofaringeo': 'Espacio retrofaríngeo',
      vye: 'Vena yugular externa',
      'vaina-carotidea': 'Vaina carotídea',
    },
    formas: [
      E(null, 'piel', 100, 70, 80, 61),
      E('lamina-superficial-fondo', 'piel', 100, 70, 73, 55),
      O('lamina-superficial', 'fascia', 100, 70, 73, 55, 2),
      E(null, 'musculo', 44, 44, 16, 9),
      E(null, 'musculo', 156, 44, 16, 9),
      P(null, 'musculo', '56,112 144,112 132,98 68,98'),
      E(null, 'musculo', 100, 105, 20, 7),
      O('lamina-prevertebral', 'fascia', 100, 88, 46, 29, 2),
      C(null, 'hueso', 100, 92, 13),
      C(null, 'zona', 100, 92, 5),
      E('espacio-retrofaringeo', 'zona', 100, 72, 22, 3.5),
      C(null, 'viscera', 100, 62, 10),
      C(null, 'cartilago', 100, 38, 10),
      E(null, 'viscera', 79, 48, 9, 14),
      E(null, 'viscera', 121, 48, 9, 14),
      O('vaina-carotidea', 'fascia', 66, 62, 10, 10, 1.5),
      C(null, 'arteria', 63, 62, 3.5),
      C(null, 'vena', 70, 63, 4.5),
      O('vaina-carotidea', 'fascia', 134, 62, 10, 10, 1.5),
      C(null, 'arteria', 137, 62, 3.5),
      C(null, 'vena', 130, 63, 4.5),
      C('vye', 'vena', 140, 26, 3.5),
    ],
  },

  'cuello-anterior': {
    titulo: 'Hioides, laringe y tiroides, vista anterior',
    etiquetas: {
      hioides: 'Hueso hioides',
      'cartilago-tiroides': 'Cartílago tiroides',
      cricoides: 'Arco del cartílago cricoides',
      'lig-cricotiroideo': 'Ligamento cricotiroideo medio',
      cricotiroideo: 'Músculo cricotiroideo',
      'a-tiroidea-superior': 'Arteria tiroidea superior',
      'n-laringeo-externo': 'Ramo externo del nervio laríngeo superior',
      tiroides: 'Glándula tiroides',
    },
    formas: [
      T(null, 'hueso', 'M46,12 Q100,30 154,12', 2),
      P('hioides', 'hueso', '76,26 124,26 120,32 100,37 80,32'),
      P('cartilago-tiroides', 'cartilago', '82,42 100,46 118,42 116,66 100,71 84,66'),
      P('cricotiroideo', 'musculo', '82,67 92,71 90,83 80,76'),
      P('cricotiroideo', 'musculo', '118,67 108,71 110,83 120,76'),
      R('lig-cricotiroideo', 'ligamento', 92, 70, 16, 6),
      R('cricoides', 'hueso', 88, 77, 24, 9),
      R(null, 'cartilago', 89, 90, 22, 5),
      R(null, 'cartilago', 89, 98, 22, 5),
      R(null, 'cartilago', 89, 106, 22, 5),
      R(null, 'cartilago', 89, 114, 22, 5),
      R(null, 'cartilago', 89, 122, 22, 5),
      P('tiroides', 'viscera', '74,94 88,90 90,120 78,122'),
      P('tiroides', 'viscera', '126,94 112,90 110,120 122,122'),
      R('tiroides', 'viscera', 88, 102, 24, 6),
      T('a-tiroidea-superior', 'arteria', 'M58,14 Q68,44 80,94', 2.5),
      T('n-laringeo-externo', 'nervio', 'M63,16 Q75,46 85,88', 1.8),
    ],
  },

  'faringe-posterior': {
    titulo: 'Faringe, vista posterior (esquema)',
    etiquetas: {
      'constrictor-superior': 'Constrictor superior',
      'constrictor-medio': 'Constrictor medio',
      'constrictor-inferior': 'Constrictor inferior',
      cricofaringeo: 'Cricofaríngeo (esfínter esofágico superior)',
      'zona-zenker': 'Zona débil sobre el cricofaríngeo',
      esofago: 'Esófago',
    },
    formas: [
      R(null, 'hueso', 40, 5, 120, 8),
      P('constrictor-superior', 'musculo', '50,14 150,14 142,44 58,44'),
      P('constrictor-medio', 'musculo', '58,45 142,45 136,74 64,74'),
      P('constrictor-inferior', 'musculo', '64,75 136,75 126,100 74,100'),
      T(null, 'fascia', 'M100,14 L100,100', 1),
      P('zona-zenker', 'zona', '88,90 112,90 100,103'),
      P('cricofaringeo', 'musculo', '77,102 123,102 121,113 79,113'),
      R('esofago', 'viscera', 82, 114, 36, 22),
    ],
  },

  'faringe-abierta': {
    titulo: 'Pared anterior de la faringe, vista desde atrás (esquema)',
    etiquetas: {
      'receso-piriforme': 'Receso piriforme',
      'entrada-laringe': 'Entrada de la laringe',
      epiglotis: 'Epiglotis',
      esofago: 'Esófago',
    },
    formas: [
      R(null, 'hueso', 40, 5, 120, 8),
      P(null, 'piel', '46,14 154,14 140,112 60,112'),
      P(null, 'viscera', '58,16 142,16 130,40 70,40'),
      P('epiglotis', 'cartilago', '86,34 114,34 108,52 100,56 92,52'),
      E('entrada-laringe', 'zona', 100, 72, 10, 15),
      T(null, 'cartilago', 'M90,58 L88,86', 2),
      T(null, 'cartilago', 'M110,58 L112,86', 2),
      E('receso-piriforme', 'zona', 78, 84, 8, 17),
      E('receso-piriforme', 'zona', 122, 84, 8, 17),
      R('esofago', 'viscera', 86, 112, 28, 24),
    ],
  },

  'tiroides-posterior': {
    titulo: 'Tiroides y paratiroides, vista posterior',
    etiquetas: {
      tiroides: 'Glándula tiroides',
      paratiroides: 'Glándulas paratiroides',
      'a-tiroidea-inferior': 'Arteria tiroidea inferior',
      'n-recurrente-izq': 'Nervio laríngeo recurrente izquierdo',
    },
    formas: [
      R(null, 'cartilago', 86, 8, 28, 124),
      R(null, 'viscera', 94, 30, 12, 102),
      E('tiroides', 'viscera', 70, 70, 17, 31),
      E('tiroides', 'viscera', 130, 70, 17, 31),
      T('a-tiroidea-inferior', 'arteria', 'M34,108 Q56,104 70,90', 2.5),
      T('a-tiroidea-inferior', 'arteria', 'M166,108 Q144,104 130,90', 2.5),
      C('paratiroides', 'hueso', 78, 52, 3.8),
      C('paratiroides', 'hueso', 78, 86, 3.8),
      C('paratiroides', 'hueso', 122, 52, 3.8),
      C('paratiroides', 'hueso', 122, 86, 3.8),
      T('n-recurrente-izq', 'nervio', 'M92,132 L90,84 L90,34', 2),
      T(null, 'nervio', 'M108,132 L110,84 L110,34', 2),
    ],
  },

  carotida: {
    titulo: 'Bifurcación de la carótida, vista lateral (esquema)',
    etiquetas: {
      'seno-carotideo': 'Seno carotídeo',
      'n-seno-carotideo': 'Nervio del seno carotídeo (NC IX)',
      'n-hipogloso': 'Nervio hipogloso (NC XII)',
      'carotida-externa': 'Arteria carótida externa',
      vyi: 'Vena yugular interna',
    },
    formas: [
      T('vyi', 'vena', 'M126,132 L122,12', 7),
      T(null, 'nervio', 'M112,132 L109,14', 2),
      T(null, 'arteria', 'M98,132 L98,72', 7),
      T('carotida-interna', 'arteria', 'M98,72 L86,10', 6),
      T('carotida-externa', 'arteria', 'M100,72 L116,12', 6),
      T(null, 'arteria', 'M110,44 L128,44', 3),
      T(null, 'arteria', 'M112,30 L90,26', 3),
      E('seno-carotideo', 'arteria', 95, 64, 8, 9),
      C(null, 'hueso', 105, 68, 3),
      T('n-seno-carotideo', 'nervio', 'M89,58 Q76,48 72,26', 2),
      T('n-hipogloso', 'nervio', 'M66,34 Q98,52 138,44', 2.5),
    ],
  },

  'raiz-cuello': {
    titulo: 'Raíz del cuello, vista anterior (esquema)',
    etiquetas: {
      'tronco-simpatico': 'Tronco simpático cervical',
      'ganglio-estrellado': 'Ganglio cervicotorácico (estrellado)',
      'a-subclavia': 'Arteria subclavia',
      'costilla-1': 'Primera costilla',
      clavicula: 'Clavícula',
    },
    formas: [
      R(null, 'cartilago', 92, 8, 16, 96),
      E(null, 'viscera', 82, 32, 9, 16),
      E(null, 'viscera', 118, 32, 9, 16),
      P(null, 'musculo', '68,46 78,46 72,82 62,82'),
      P(null, 'musculo', '132,46 122,46 128,82 138,82'),
      T('costilla-1', 'hueso', 'M20,100 Q52,74 90,104', 6),
      T('costilla-1', 'hueso', 'M180,100 Q148,74 110,104', 6),
      T('a-subclavia', 'arteria', 'M92,102 Q58,54 24,86', 4.5),
      T('a-subclavia', 'arteria', 'M108,102 Q142,54 176,86', 4.5),
      T('clavicula', 'hueso', 'M16,60 L96,88', 5),
      T('clavicula', 'hueso', 'M184,60 L104,88', 5),
      T('tronco-simpatico', 'nervio', 'M56,10 L56,96', 2),
      T('tronco-simpatico', 'nervio', 'M144,10 L144,96', 2),
      C('ganglio-estrellado', 'hueso', 56, 90, 5),
      C('ganglio-estrellado', 'hueso', 144, 90, 5),
    ],
  },
};

export const BASES = Object.keys(ESQUEMAS);

/** Ids que un caso puede resaltar en una base (las formas con id, sin los de fondo). */
export function idsDeBase(base) {
  return new Set((ESQUEMAS[base]?.formas ?? []).map((f) => f.id).filter(Boolean));
}

/** Formas listas para dibujar: cada una con sus atributos ya resueltos (relleno, trazo y si está resaltada). */
export function formasDe(spec) {
  const base = ESQUEMAS[spec?.base];
  if (!base) return [];
  const resaltar = new Set(spec.resaltar ?? []);
  const hayResalte = [...resaltar].some((id) => idsDeBase(spec.base).has(id));
  return base.formas.map((f) => {
    const resaltada = Boolean(f.id) && resaltar.has(f.id);
    const atenuada = hayResalte && !resaltada;
    const relleno = resaltada ? RESALTE.relleno : TONOS[f.tono];
    const comun = { 'data-id': f.id ?? undefined, class: resaltada ? 'esq__forma esq__forma--resaltada' : 'esq__forma', opacity: atenuada ? 0.78 : 1 };
    switch (f.tipo) {
      case 'poligono': return { etiqueta: 'polygon', atributos: { ...comun, points: f.puntos, fill: relleno, stroke: resaltada ? RESALTE.trazo : TRAZO, 'stroke-width': resaltada ? 1.5 : 1 } };
      case 'rect': return { etiqueta: 'rect', atributos: { ...comun, x: f.x, y: f.y, width: f.w, height: f.h, fill: relleno, stroke: resaltada ? RESALTE.trazo : TRAZO, 'stroke-width': resaltada ? 1.5 : 1 } };
      case 'elipse': return { etiqueta: 'ellipse', atributos: { ...comun, cx: f.cx, cy: f.cy, rx: f.rx, ry: f.ry, fill: relleno, stroke: resaltada ? RESALTE.trazo : TRAZO, 'stroke-width': resaltada ? 1.5 : 1 } };
      case 'contorno': return { etiqueta: 'ellipse', atributos: { ...comun, cx: f.cx, cy: f.cy, rx: f.rx, ry: f.ry, fill: 'none', stroke: resaltada ? RESALTE.relleno : TONOS[f.tono], 'stroke-width': resaltada ? f.ancho + 1.5 : f.ancho, 'stroke-dasharray': resaltada ? undefined : '4 2' } };
      default: return { etiqueta: 'path', atributos: { ...comun, d: f.d, fill: 'none', stroke: resaltada ? RESALTE.relleno : TONOS[f.tono], 'stroke-width': resaltada ? f.ancho + 1.5 : f.ancho, 'stroke-linecap': 'square', 'stroke-linejoin': 'miter' } };
    }
  });
}

/** Lista de { id, nombre } de lo resaltado, para la leyenda en texto (accesible). */
export function leyenda(spec) {
  const base = ESQUEMAS[spec?.base];
  if (!base) return [];
  const ids = idsDeBase(spec.base);
  return (spec.resaltar ?? []).filter((id) => ids.has(id)).map((id) => ({ id, nombre: base.etiquetas[id] ?? id }));
}

const VIEWBOX = '0 0 200 140';

/** SVG como texto (para pruebas y vistas previas). */
export function esquemaComoTexto(spec) {
  const interior = formasDe(spec)
    .map(({ etiqueta, atributos }) => {
      const attrs = Object.entries(atributos).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}="${v}"`).join(' ');
      return `<${etiqueta} ${attrs}/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="400" height="280"><rect width="200" height="140" fill="#081321"/>${interior}</svg>`;
}

/** SVG para el navegador. */
export function crearEsquema(spec) {
  const base = ESQUEMAS[spec?.base];
  const nombres = leyenda(spec).map((l) => l.nombre).join(', ');
  return s(
    'svg',
    { class: 'esquema', viewBox: VIEWBOX, role: 'img', 'aria-label': `${base?.titulo ?? 'Esquema'}${nombres ? `. Resaltado: ${nombres}` : ''}`, 'shape-rendering': 'crispEdges' },
    s('rect', { width: 200, height: 140, fill: '#081321' }),
    ...formasDe(spec).map(({ etiqueta, atributos }) => s(etiqueta, atributos)),
  );
}
