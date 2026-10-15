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
