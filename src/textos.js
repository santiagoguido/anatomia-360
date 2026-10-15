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
