// Edge Function `rondas` · Anatomía 360. Una sola función con tres operaciones (campo `accion`):
//   iniciar   → { matricula, aula }                       → enunciados y opciones SIN la correcta
//   responder → { ronda_id, indice, opcion|null }         → solo acierto/fallo y puntos
//   terminar  → { ronda_id }                              → califica, guarda y devuelve el resumen
//   guardia_iniciar / guardia_explorar / guardia_pista / guardia_responder / guardia_siguiente / expedientes
//             → la Clínica (Sesión 6): guardias de 5 casos clínicos (ver _shared/servidor/clinica.js)
// La lógica está en _shared/servidor/manejador.js (se prueba con Node); aquí solo se conecta a Deno y Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { crearManejador } from '../_shared/servidor/manejador.js';
import { NOMBRE_INTERRUPTOR, interruptorActivo } from '../_shared/servidor/interruptor.js';
import { crearDatos } from './datos.ts';
import aula1 from '../_shared/banco/aula-1.js';
import aula2 from '../_shared/banco/aula-2.js';
import aula3 from '../_shared/banco/aula-3.js';
import aula4 from '../_shared/banco/aula-4.js';
import aula5 from '../_shared/banco/aula-5.js';
import aula6 from '../_shared/banco/aula-6.js';
// Todos los casos clínicos de la Clínica (lo genera `npm run funcion:preparar`; al llegar nuevas semanas no hay que tocar este archivo).
import casos from '../_shared/casos/todos.js';

const bancos = { 1: aula1, 2: aula2, 3: aula3, 4: aula4, 5: aula5, 6: aula6 };

// El navegador la llama con la clave publicable en `apikey` (no en Authorization).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type, x-client-info, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function claveSecreta(): string {
  const json = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (json) {
    try {
      const clave = JSON.parse(json)['default'];
      if (clave) return clave;
    } catch { /* cae a la clave legada */ }
  }
  const legada = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!legada) throw new Error('La función no encuentra la clave secreta de Supabase.');
  return legada;
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, claveSecreta(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const modoPruebas = interruptorActivo(Deno.env.get(NOMBRE_INTERRUPTOR));
if (modoPruebas) {
  console.warn(`⚠️ ${NOMBRE_INTERRUPTOR} está ACTIVO: todas las aulas se tratan como abiertas y se sirven borradores. No debe estar así en producción.`);
}

const manejar = crearManejador({ datos: crearDatos(supabase), bancos, casos, modoPruebas });

const responder = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return responder(405, { error: 'solicitud_invalida' });

  let cuerpo: unknown;
  try {
    const texto = await req.text();
    if (texto.length > 4096) return responder(413, { error: 'solicitud_invalida' });
    cuerpo = JSON.parse(texto);
  } catch {
    return responder(400, { error: 'solicitud_invalida' });
  }
  const { estado, cuerpo: salida } = await manejar(cuerpo);
  return responder(estado, salida);
});
