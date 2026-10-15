// Todos los textos que ve el alumno y que conviene poder editar en un solo lugar.

export const CREDITOS = {
  antes: 'Proyecto didáctico desarrollado por la ',
  docente: 'Dra. Sandra Zamudio',
  despues:
    ' para los alumnos de la UMSNH, con la finalidad de mejorar los conocimientos teóricos de Anatomía Humana.',
};

export const AVISO_MATRICULA = {
  titulo: 'Guarda tu récord',
  antes: 'Usa siempre ',
  enfasis: 'la misma matrícula',
  despues: '. Así tus puntos se suman y puedes mejorar tu récord.',
  calendario: 'Las aulas se abren cada lunes según el calendario de prácticas.',
};

export const PRIVACIDAD = {
  titulo: 'Aviso de privacidad y reglas',
  datos: {
    titulo: 'Tus datos',
    puntos: [
      'Guardamos tu matrícula, tu nombre, tu género (para elegir tu avatar) y tus resultados: puntajes, rondas, insignias y racha.',
      'En el Salón de la Fama y en Control Escolar se ven tu nombre, tus puntos y tu matrícula con los primeros números ocultos (••••4521).',
      'Tu docente puede ver resultados por matrícula y por tema, para saber qué reforzar en clase.',
      'No hay contraseña: tu matrícula es tu acceso. Usa solo la tuya.',
    ],
  },
  reglas: {
    titulo: 'Cómo se juega',
    puntos: [
      'Las aulas se abren cada lunes a las 00:00 (hora de la Ciudad de México) y ya no se cierran. El Aula 1 está abierta desde el inicio.',
      'Cada ronda tiene 25 preguntas al azar del aula, con 42 segundos para cada una.',
      'Tu récord de cada aula es tu mejor ronda: repetir mucho no lo infla, mejorar sí.',
      'Si sales a mitad de una ronda, esa ronda se anula.',
    ],
  },
  aceptacion: 'Al entrar al campus aceptas este aviso.',
};

// Mensajes de error: dicen qué pasó y qué hacer.
export const ERRORES = {
  red: 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.',
  tiempo: 'La conexión tardó demasiado. Inténtalo de nuevo.',
  servidor: 'Algo falló en el servidor. Espera un momento e inténtalo de nuevo.',
  matricula_invalida: 'Revisa tu matrícula: de 7 a 10 caracteres, solo letras y números.',
  nombre_invalido: 'Revisa tu nombre: escribe nombre y apellido, solo con letras.',
  genero_invalido: 'Elige Femenino o Masculino para continuar.',
  // Estos dos solo aparecen si falta configurar algo al montar el proyecto:
  sin_configuracion:
    'El juego aún no está conectado a Supabase. Falta el archivo .env (README, paso 3).',
  esquema_faltante:
    'Supabase no tiene las tablas del juego. Ejecuta supabase/schema.sql (README, paso 2).',
  clave_invalida:
    'Supabase rechazó la clave. Revisa VITE_SUPABASE_ANON_KEY en el .env o en Netlify.',
};

// ---- Campus (Sesión 2) ------------------------------------------------------------

export const CAMPUS = {
  cargando: 'Cargando el campus…',
  reintentar: 'Reintentar',
  menu: 'Menú',
  cerrar: 'Cerrar',
  salir: 'Salir',
  insignias: 'Insignias',
  sinInsignias: 'Todavía no ganas insignias. Se consiguen jugando rondas.',
  recordTotal: 'Récord total',
  racha: (n) => `${n} ${n === 1 ? 'día' : 'días'} de racha`,
  insigniasGanadas: (n) => `Insignias: ${n} ${n === 1 ? 'ganada' : 'ganadas'}`,
  mapa: 'Mapa',
  mapaAria: 'Minimapa del campus completo',
  joystick: 'Joystick para mover al avatar',
  correr: 'Correr',
  correrAria: 'Mantén presionado para correr',
  ayudaTeclado: 'Mover: WASD o flechas · Correr: Shift · Entrar: E',
  girar: 'Gira tu celular para jugar en horizontal.',
  carteles: { oeste: '◀ Control Escolar', este: 'Aulas 4–6 ▶' },
  etiquetas: {
    'aula-1': 'AULA 1',
    'aula-2': 'AULA 2',
    'aula-3': 'AULA 3',
    'aula-4': 'AULA 4',
    'aula-5': 'AULA 5',
    'aula-6': 'AULA 6',
    clinica: 'CLÍNICA',
    'salon-fama': 'SALÓN FAMA',
    'control-escolar': 'CONTROL ESCOLAR',
    biblioteca: 'BIBLIOTECA',
    cafeteria: 'CAFETERÍA',
  },
  estado: { disponible: 'Disponible', bloqueada: 'Bloqueada' },
  tarjeta: {
    aulaTitulo: (n) => `AULA ${n} · SEMANA ${n}`,
    ultimoPuntaje: 'Último puntaje',
    tuRecord: 'Tu récord',
    sinPuntaje: '—',
    rondas: (n) => (n === 0 ? 'Todavía no juegas esta aula' : `${n} ${n === 1 ? 'ronda jugada' : 'rondas jugadas'}`),
    entrar: 'Entrar',
    aunBloqueada: 'Aún bloqueada',
    seAbre: (fecha) => `Se abre el ${fecha}`,
    permanece: 'Una vez abierta, queda disponible hasta el final del curso.',
    clinicaTitulo: 'CLÍNICA',
    clinicaSemanas: (n) => (n <= 1 ? 'Casos con los temas de la semana 1' : n === 2 ? 'Casos con los temas de las semanas 1 y 2' : `Casos con los temas de las semanas 1 a ${n}`),
    clinicaBoton: 'Iniciar guardia · 5 pacientes',
    mejorGuardia: 'Mejor guardia',
    expedientes: 'Expedientes',
    salonTitulo: 'SALÓN DE LA FAMA',
    salonLinea: (n) => `Top 10 de la semana ${n}`,
    salonNota: 'Los puntos de tus mejores rondas de la semana.',
    salonBoton: 'Ver el Top 10',
    controlTitulo: 'CONTROL ESCOLAR',
    controlLinea: 'Tus resultados por aula y por tema.',
    controlNota: 'Aquí ves en qué temas te va mejor y cuáles conviene repasar.',
    controlBoton: 'Ver mis resultados',
  },
  temasCortos: {
    1: ['Cuello', 'Faringe'],
    2: ['Laringe y tiroides', 'Vasos del cuello'],
    3: ['Hombro y brazo', 'Plexo braquial'],
    4: ['Antebrazo y mano', 'Vasos del miembro superior'],
    5: ['Glúteo y muslo', 'Plexo lumbosacro'],
    6: ['Rodilla, pierna y pie', 'Vasos del miembro inferior'],
  },
  pronto: 'Esta zona se abre en la próxima actualización del juego.',
};
