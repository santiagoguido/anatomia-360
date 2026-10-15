// Prepara la Edge Function: copia a supabase/functions/_shared/ lo que ella necesita.
//   · src/game/ronda/*.js   → _shared/game/ronda/   (reglas, puntuación, selección, insignias… tal cual)
//   · src/servidor/*.js     → _shared/servidor/     (manejador e interruptor, tal cual)
//   · contenido/preguntas/  → _shared/banco/aula-N.js (solo los campos que usa la función)
// `contenido/` sigue siendo la fuente de verdad: los archivos de _shared/ son GENERADOS (se suben a git
// para que el despliegue no dependa de nada más, y una prueba falla si quedan desactualizados).
//
//   npm run funcion:preparar    escribe los archivos
//   npm run funcion:verificar   solo comprueba (termina con error si hay diferencias)
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = 'supabase/functions/_shared';
const AVISO = '// ARCHIVO GENERADO por scripts/sincronizar-funcion.js. No lo edites: cambia el original y ejecuta `npm run funcion:preparar`.\n';

const COPIAS = [
  ['src/game/ronda', `${DESTINO}/game/ronda`],
  ['src/servidor', `${DESTINO}/servidor`],
];

const leer = (ruta) => readFileSync(join(RAIZ, ruta), 'utf8');

/** Campos de una pregunta que la función necesita (la cita completa va en `cita`; nada de notas internas). */
export function reducirPregunta(p) {
  return {
    id: p.id,
    tema: p.tema,
    patron: p.patron,
    dificultad: p.dificultad,
    enunciado: p.enunciado,
    opciones: p.opciones,
    correcta: p.correcta,
    explicacion: p.explicacion,
    referencia: { cita: p.referencia.cita },
    imagen: p.imagen ? { id: p.imagen.id, estado: p.imagen.estado } : null,
    estado: p.estado,
  };
}

export function moduloBanco(banco) {
  const cabecera = { aula: banco.aula, temas: banco.temas };
  const preguntas = banco.preguntas.map((p) => `  ${JSON.stringify(reducirPregunta(p))}`).join(',\n');
  return `${AVISO}export default {\n  "aula": ${banco.aula},\n  "temas": ${JSON.stringify(cabecera.temas)},\n  "preguntas": [\n${preguntas}\n  ]\n};\n`;
}

/** Devuelve { ruta relativa a la raíz → contenido } con todo lo que debe existir. */
export function generar() {
  const salida = new Map();
  for (const [origen, destino] of COPIAS) {
    for (const f of readdirSync(join(RAIZ, origen)).filter((n) => n.endsWith('.js')).sort()) {
      salida.set(`${destino}/${f}`, AVISO + leer(`${origen}/${f}`));
    }
  }
  const dirBanco = join(RAIZ, 'contenido/preguntas');
  for (const f of readdirSync(dirBanco).filter((n) => /^aula-\d+\.json$/.test(n)).sort()) {
    const banco = JSON.parse(readFileSync(join(dirBanco, f), 'utf8'));
    salida.set(`${DESTINO}/banco/${f.replace('.json', '.js')}`, moduloBanco(banco));
  }
  return salida;
}

function archivosActuales() {
  const base = join(RAIZ, DESTINO);
  const lista = [];
  const recorrer = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) recorrer(ruta);
      else lista.push(relative(RAIZ, ruta).split('\\').join('/'));
    }
  };
  if (existsSync(base)) recorrer(base);
  return lista;
}

/** Compara lo generado con lo que hay en disco. Devuelve la lista de diferencias (vacía = al día). */
export function diferencias() {
  const esperado = generar();
  const problemas = [];
  for (const [ruta, contenido] of esperado) {
    if (!existsSync(join(RAIZ, ruta))) problemas.push(`falta ${ruta}`);
    else if (leer(ruta) !== contenido) problemas.push(`desactualizado ${ruta}`);
  }
  for (const ruta of archivosActuales()) if (!esperado.has(ruta)) problemas.push(`sobra ${ruta}`);
  return problemas;
}

function escribir() {
  const esperado = generar();
  for (const ruta of archivosActuales()) if (!esperado.has(ruta)) rmSync(join(RAIZ, ruta));
  for (const [ruta, contenido] of esperado) {
    mkdirSync(dirname(join(RAIZ, ruta)), { recursive: true });
    writeFileSync(join(RAIZ, ruta), contenido);
  }
  console.log(`Listo: ${esperado.size} archivos en ${DESTINO}/`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--verificar')) {
    const problemas = diferencias();
    if (problemas.length) {
      console.error(`La función no está al día:\n  ${problemas.join('\n  ')}\nEjecuta: npm run funcion:preparar`);
      process.exit(1);
    }
    console.log('La carpeta _shared de la función está al día.');
  } else escribir();
}
