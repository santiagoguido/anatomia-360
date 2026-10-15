// Reglas fijas del proyecto. Si una regla cambia, se cambia aquí y en supabase/schema.sql.

export const MATRICULA = {
  min: 7,
  max: 10,
  // Solo números, o con letras al inicio o al final (ya en minúsculas y sin espacios).
  patron: /^[a-z]*[0-9]+[a-z]*$/,
  ejemplos: ['26000123', 'a0123456x'],
};

export const NOMBRE = { min: 3, max: 60 };

export const GENEROS = ['femenino', 'masculino'];

// Tiempo máximo de espera por una llamada a Supabase.
export const TIEMPO_MAXIMO_MS = 12000;

// Solo para rellenar el campo de matrícula la próxima vez; se borra al salir.
export const CLAVE_ALMACEN = 'a360:matricula';

// ---- Campus (Sesión 2) ------------------------------------------------------

export const ZONA_HORARIA = 'America/Mexico_City';

// Primer lunes del segundo parcial (00:00 CDMX = 06:00 UTC; México ya no usa horario de verano).
export const INICIO_CURSO = '2026-10-19T06:00:00Z';
export const SEMANAS_CURSO = 6;

// Respaldo si Supabase no responde: mismas fechas que supabase/schema.sql (tabla `aulas`).
// La hora real de apertura siempre la manda el servidor; esto solo evita un campus sin aulas.
export const CALENDARIO_AULAS = [
  { numero: 1, titulo: 'Aula 1', temas: ['Músculos y triángulos del cuello', 'Faringe y esófago'], abre_en: '2026-10-01T06:00:00Z' },
  { numero: 2, titulo: 'Aula 2', temas: ['Laringe, tráquea y glándula tiroides', 'Vascularización del cuello'], abre_en: '2026-10-26T06:00:00Z' },
  { numero: 3, titulo: 'Aula 3', temas: ['Hombro, brazo y codo', 'Plexo braquial'], abre_en: '2026-11-02T06:00:00Z' },
  { numero: 4, titulo: 'Aula 4', temas: ['Antebrazo y mano', 'Vascularización del miembro superior'], abre_en: '2026-11-09T06:00:00Z' },
  { numero: 5, titulo: 'Aula 5', temas: ['Glúteo y muslo', 'Plexo lumbosacro'], abre_en: '2026-11-16T06:00:00Z' },
  { numero: 6, titulo: 'Aula 6', temas: ['Rodilla, pierna y pie', 'Vascularización del miembro inferior'], abre_en: '2026-11-23T06:00:00Z' },
];

// Movimiento del avatar (píxeles por segundo) y resistencia al correr.
export const MOVIMIENTO = {
  caminar: 82,
  correr: 144,
  resistencia: { consumo: 0.34, recarga: 0.22, umbral: 0.25, barras: 5 },
};

// Distancia (en tiles de 16 px) a la que aparece la tarjeta de un lugar, y a la que se esconde.
export const PROXIMIDAD = { entrar: 2, salir: 3 };

// Temas de cada aula (los ids son los de contenido/preguntas/aula-N.json: así se rotulan los resultados por tema
// en Control Escolar). Una prueba comprueba que coincidan con el banco.
export const TEMAS_AULA = {
  1: [{ id: 'musculos-triangulos', nombre: 'Músculos y triángulos del cuello' }, { id: 'faringe-esofago', nombre: 'Faringe y esófago' }],
  2: [{ id: 'laringe-traquea-tiroides', nombre: 'Laringe, tráquea y glándula tiroides' }, { id: 'vascularizacion-cuello', nombre: 'Vascularización del cuello' }],
  3: [{ id: 'hombro-brazo-codo', nombre: 'Hombro, brazo y codo' }, { id: 'plexo-braquial', nombre: 'Plexo braquial' }],
  4: [{ id: 'antebrazo-mano', nombre: 'Antebrazo y mano' }, { id: 'vascularizacion-miembro-superior', nombre: 'Vascularización del miembro superior' }],
  5: [{ id: 'gluteo-muslo', nombre: 'Glúteo y muslo' }, { id: 'plexo-lumbosacro', nombre: 'Plexo lumbosacro' }],
  6: [{ id: 'rodilla-pierna-pie', nombre: 'Rodilla, pierna y pie' }, { id: 'vascularizacion-miembro-inferior', nombre: 'Vascularización del miembro inferior' }],
};
