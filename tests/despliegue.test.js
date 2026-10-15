// Pruebas de "no romper producción": el interruptor de pruebas, la copia de la función, y que ningún secreto
// ni respuesta correcta llegue al navegador.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { RAIZ, diferencias } from '../scripts/sincronizar-funcion.js';
import { NOMBRE_INTERRUPTOR, interruptorActivo } from '../src/servidor/interruptor.js';
import { CALENDARIO_AULAS, INICIO_CURSO, SEMANAS_CURSO } from '../src/config.js';
import { SALON } from '../src/game/ronda/reglas.js';

const IGNORAR = new Set(['node_modules', 'dist', '.git', '.netlify', '.supabase']);

function recorrer(dir, salida = []) {
  for (const nombre of readdirSync(dir)) {
    if (IGNORAR.has(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) recorrer(ruta, salida);
    else salida.push(relative(RAIZ, ruta).split('\\').join('/'));
  }
  return salida;
}
const todos = recorrer(RAIZ);

/** ¿Este texto de configuración deja el interruptor encendido? (1 / true, con = o :, con o sin comillas) */
export function dejaInterruptorActivo(texto) {
  const patron = new RegExp(`${NOMBRE_INTERRUPTOR}["']?\\s*[:=]\\s*["']?\\s*(1|true)\\b`, 'i');
  return texto.split('\n').filter((l) => !l.trim().startsWith('#')).some((l) => patron.test(l));
}

/** Archivos que viajan con el despliegue (los `.local` son solo de tu computadora y están en .gitignore). */
const esConfiguracionDeDespliegue = (ruta) => {
  const nombre = ruta.split('/').pop();
  if (nombre.endsWith('.local')) return false;
  return (
    /(^|\/)\.env(\.[^/]*)?$/.test(ruta) ||
    /(^|\/)env\.ejemplo$/.test(ruta) ||
    ruta.endsWith('.toml') ||
    ruta === 'package.json' ||
    ruta.startsWith('.github/workflows/') ||
    /(^|\/)Dockerfile$/.test(ruta)
  );
};

test('el detector reconoce un interruptor encendido en distintos formatos', () => {
  for (const texto of [
    `${NOMBRE_INTERRUPTOR}=1`, `${NOMBRE_INTERRUPTOR}=true`, `${NOMBRE_INTERRUPTOR} = "1"`,
    `  ${NOMBRE_INTERRUPTOR}: true`, `supabase secrets set ${NOMBRE_INTERRUPTOR}=1`, `"${NOMBRE_INTERRUPTOR}": "true"`,
  ]) assert.equal(dejaInterruptorActivo(texto), true, texto);
  for (const texto of [`${NOMBRE_INTERRUPTOR}=`, `${NOMBRE_INTERRUPTOR}=0`, `${NOMBRE_INTERRUPTOR}=false`, `# ${NOMBRE_INTERRUPTOR}=1`, '']) {
    assert.equal(dejaInterruptorActivo(texto), false, texto);
  }
});

test('el interruptor de pruebas NO está activo en ningún archivo de configuración de despliegue', () => {
  const revisados = todos.filter(esConfiguracionDeDespliegue);
  assert.ok(revisados.includes('supabase/config.toml') && revisados.includes('netlify.toml') && revisados.includes('package.json'), `se esperaba revisar la configuración principal: ${revisados.join(', ')}`);
  const activos = revisados.filter((r) => dejaInterruptorActivo(readFileSync(join(RAIZ, r), 'utf8')));
  assert.deepEqual(activos, [], `${NOMBRE_INTERRUPTOR} no puede estar activo en producción. Quítalo de: ${activos.join(', ')}`);
});

test('el interruptor está documentado y apagado en supabase/functions/env.ejemplo', () => {
  const ruta = join(RAIZ, 'supabase/functions/env.ejemplo');
  assert.ok(existsSync(ruta), 'falta supabase/functions/env.ejemplo');
  const texto = readFileSync(ruta, 'utf8');
  assert.match(texto, new RegExp(`^${NOMBRE_INTERRUPTOR}=\\s*$`, 'm'), 'debe aparecer vacío (apagado)');
  assert.match(texto, /NUNCA/, 'debe advertir que no va en producción');
  assert.match(texto, /aulas/i);
  assert.match(texto, /borrador/i);
});

test('el interruptor está apagado por defecto: solo "1" o "true" lo encienden', () => {
  for (const apagado of [undefined, null, '', ' ', '0', 'false', 'no', 'si', 'yes', 'on', 'TRUE1', '2']) {
    assert.equal(interruptorActivo(apagado), false, String(apagado));
  }
  for (const encendido of ['1', 'true', 'TRUE', ' true ']) assert.equal(interruptorActivo(encendido), true, encendido);
});

test('la función lee el interruptor solo del entorno y no lo deja fijo en el código', () => {
  const index = readFileSync(join(RAIZ, 'supabase/functions/rondas/index.ts'), 'utf8');
  assert.match(index, /interruptorActivo\(Deno\.env\.get\(NOMBRE_INTERRUPTOR\)\)/);
  assert.ok(!/modoPruebas\s*=\s*(true|1)/.test(index));
  const manejador = readFileSync(join(RAIZ, 'src/servidor/manejador.js'), 'utf8');
  assert.match(manejador, /modoPruebas = false/, 'el manejador arranca apagado si nadie lo enciende');
});

test('el interruptor no aparece en el código del juego (navegador): el cliente no puede encenderlo', () => {
  const cliente = todos.filter((r) => r.startsWith('src/') && !r.startsWith('src/servidor/') && r.endsWith('.js'));
  const culpables = cliente.filter((r) => readFileSync(join(RAIZ, r), 'utf8').includes(NOMBRE_INTERRUPTOR));
  assert.deepEqual(culpables, []);
});

// ---- La función debe estar al día con el código y el banco -----------------------------------------------------

test('supabase/functions/_shared está al día con src/ y contenido/ (si falla: npm run funcion:preparar)', () => {
  assert.deepEqual(diferencias(), []);
});

test('lo que se copia a la función solo usa imports relativos (corre en Deno sin instalar nada)', () => {
  const copiados = todos.filter((r) => /^src\/(game\/ronda|servidor)\/.+\.js$/.test(r));
  assert.ok(copiados.length >= 8);
  for (const r of copiados) {
    const imports = [...readFileSync(join(RAIZ, r), 'utf8').matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
    for (const origen of imports) assert.ok(origen.startsWith('./') || origen.startsWith('../'), `${r} importa ${origen}`);
  }
});

test('el banco de la función no lleva notas internas ni el archivo digital del libro', () => {
  for (const f of readdirSync(join(RAIZ, 'supabase/functions/_shared/banco'))) {
    const texto = readFileSync(join(RAIZ, 'supabase/functions/_shared/banco', f), 'utf8');
    assert.ok(!texto.includes('nota_revision'), f);
    assert.ok(!/booksmedicos|\.pdf/i.test(texto), f);
    assert.ok(texto.includes('"correcta"'), 'la función SÍ necesita la correcta');
  }
});

// ---- Nada secreto ni de respuestas llega al navegador -----------------------------------------------------------

const archivosDelJuego = todos.filter((r) => r.startsWith('src/') && !r.startsWith('src/servidor/') && /\.(js|css)$/.test(r));
const archivosDeNetlify = ['netlify.toml', '.env.example', '.env', '.env.production'].filter((r) => existsSync(join(RAIZ, r)));

test('el código del juego no importa ni nombra el banco, la carpeta del servidor ni claves secretas', () => {
  for (const r of archivosDelJuego) {
    const texto = readFileSync(join(RAIZ, r), 'utf8');
    assert.ok(!/contenido\/preguntas|_shared|\bservidor\//.test(texto.replace(/\/\/.*$/gm, '')), `${r} referencia contenido o servidor`);
    assert.ok(!/service_role|SERVICE_ROLE|SECRET_KEYS|sb_secret_/.test(texto), `${r} nombra una clave secreta`);
  }
});

test('la configuración de Netlify y los .env del sitio no llevan la clave secreta', () => {
  for (const r of archivosDeNetlify) {
    const lineas = readFileSync(join(RAIZ, r), 'utf8').split('\n').filter((l) => !l.trim().startsWith('#'));
    for (const l of lineas) assert.ok(!/(SERVICE_ROLE|SECRET_KEYS?|sb_secret_)/i.test(l), `${r}: ${l}`);
  }
});

test('las variables que llegan al navegador (VITE_*) son solo la URL y la clave publicable', () => {
  const usadas = new Set();
  for (const r of archivosDelJuego) for (const m of readFileSync(join(RAIZ, r), 'utf8').matchAll(/import\.meta\.env\.(\w+)/g)) usadas.add(m[1]);
  assert.deepEqual([...usadas].sort(), ['VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_URL']);
});

// ---- Configuración de la función y del esquema --------------------------------------------------------------------

test('config.toml desactiva verify_jwt solo para la función rondas (la clave publicable no es un JWT)', () => {
  const t = readFileSync(join(RAIZ, 'supabase/config.toml'), 'utf8');
  assert.match(t, /\[functions\.rondas\]\s*\n\s*verify_jwt\s*=\s*false/);
});

const schema = readFileSync(join(RAIZ, 'supabase/schema.sql'), 'utf8');

test('schema.sql: las funciones del motor solo las ejecuta service_role', () => {
  const seccion = schema.slice(schema.indexOf('-- 7. MOTOR DE RONDAS'), schema.indexOf('-- 8. SALÓN DE LA FAMA'));
  const revoke = seccion.slice(seccion.lastIndexOf('revoke execute on function'), seccion.indexOf('grant execute on function', seccion.lastIndexOf('revoke execute on function')));
  const grant = seccion.slice(seccion.lastIndexOf('grant execute on function'));
  for (const f of ['aula_abierta', 'progreso_para_ronda', 'crear_ronda_activa', 'registrar_respuesta', 'contexto_cierre', 'guardar_ronda_terminada', 'semana_cuenta_para_salon']) {
    assert.ok(revoke.includes(`public.${f}(`), `${f} debe quitarse a anon/authenticated`);
    assert.ok(grant.includes(`public.${f}(`), `${f} debe darse a service_role`);
  }
  assert.match(revoke, /from public, anon, authenticated;/);
  assert.match(grant, /to service_role;/);
  assert.ok(!/grant execute on function[^;]*(aula_abierta|guardar_ronda_terminada|registrar_respuesta)[^;]*to anon/.test(schema));
});

test('schema.sql: el resumen guardado para repetir "terminar" incluye si la ronda cuenta para el Salón', () => {
  const guardar = schema.slice(schema.indexOf('function public.guardar_ronda_terminada'));
  const update = guardar.slice(guardar.indexOf('update public.rondas_activas'), guardar.indexOf('insert into public.rondas'));
  assert.match(update, /resumen\s*=\s*p_resumen\s*\|\|\s*jsonb_build_object\('salon'/);
});

test('schema.sql: rondas_activas está cerrada al navegador (RLS + sin permisos)', () => {
  assert.match(schema, /alter table public\.rondas_activas enable row level security/);
  assert.match(schema, /revoke all on table public\.rondas_activas from public, anon, authenticated/);
  assert.match(schema, /grant select, insert, update, delete on table public\.rondas_activas to service_role/);
});

test('schema.sql: el candado de la semana 0 usa las mismas fechas que SALON y el SQL lo aplica al recalcular', () => {
  assert.match(schema, new RegExp(`function public\\.salon_primer_lunes\\(\\)[^$]*\\$\\$ select date '${SALON.primerLunes}' \\$\\$`));
  assert.match(schema, new RegExp(`function public\\.salon_ultimo_lunes\\(\\)[^$]*\\$\\$ select date '${SALON.ultimoLunes}' \\$\\$`));
  assert.match(schema, /between public\.salon_primer_lunes\(\) and public\.salon_ultimo_lunes\(\)/);
  const recalcular = schema.slice(schema.indexOf('function public.recalcular_puntaje_semanal'));
  assert.ok(recalcular.indexOf('semana_cuenta_para_salon') < recalcular.indexOf('insert into public.puntaje_semanal'));
  // La semana 1 es el lunes del inicio del curso y la última, 5 lunes después.
  assert.equal(SALON.primerLunes, new Date(Date.parse(INICIO_CURSO) - 6 * 3600 * 1000).toISOString().slice(0, 10));
  const ultimo = new Date(Date.parse(`${SALON.primerLunes}T00:00:00Z`) + (SEMANAS_CURSO - 1) * 7 * 86400000).toISOString().slice(0, 10);
  assert.equal(SALON.ultimoLunes, ultimo);
});

test('el calendario de aulas de schema.sql coincide con el de config.js (regla dura)', () => {
  for (const a of CALENDARIO_AULAS) {
    const cdmx = new Date(Date.parse(a.abre_en) - 6 * 3600 * 1000).toISOString().slice(0, 10);
    assert.ok(schema.includes(`timestamp '${cdmx} 00:00' at time zone 'America/Mexico_City'`), `Aula ${a.numero}: ${cdmx}`);
  }
  // El Aula 1 ya abrió; las 2 a 6 abren en lunes consecutivos 26 oct, 2, 9, 16 y 23 nov, a las 00:00 CDMX.
  assert.deepEqual(CALENDARIO_AULAS.slice(1).map((a) => a.abre_en), [
    '2026-10-26T06:00:00Z', '2026-11-02T06:00:00Z', '2026-11-09T06:00:00Z', '2026-11-16T06:00:00Z', '2026-11-23T06:00:00Z',
  ]);
  assert.ok(Date.parse(CALENDARIO_AULAS[0].abre_en) <= Date.parse('2026-10-15T00:00:00Z'));
});

test('schema.sql: el Salón y Control Escolar los lee el navegador, pero no exponen matrículas completas', () => {
  const grant = schema.slice(schema.lastIndexOf('grant execute on function\n  public.salon_de_la_fama'));
  assert.match(grant.slice(0, 200), /public\.salon_de_la_fama\(text, date\),\s*public\.control_escolar\(text\)\s*to anon, authenticated;/);
  const salon = schema.slice(schema.indexOf('function public.salon_de_la_fama'), schema.indexOf('function public.control_escolar'));
  assert.ok(!/'matricula'\s*,/.test(salon), 'el Salón no debe devolver la matrícula completa de nadie');
  assert.ok(salon.includes('enmascarar_matricula'), 'las matrículas salen ocultas');
  const control = schema.slice(schema.indexOf('function public.control_escolar'));
  assert.ok(control.includes("where j.matricula = v_mat"), 'Control Escolar devuelve solo la matrícula pedida');
});
