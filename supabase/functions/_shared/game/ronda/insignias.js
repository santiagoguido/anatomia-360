// ARCHIVO GENERADO por scripts/sincronizar-funcion.js. No lo edites: cambia el original y ejecuta `npm run funcion:preparar`.
// Catálogo de insignias de la Sesión 4 y la regla para ganarlas. Puro.
// En la base se guarda el `id` (estable); el nombre que ve el alumno está aquí (y en textos.js para la pantalla).

export const INSIGNIAS = {
  'primer-dia': { nombre: 'Primer día de clases', descripcion: 'Terminar tu primera ronda.' },
  'ronda-perfecta': { nombre: 'Ronda perfecta', descripcion: '25 de 25 aciertos en una ronda.' },
  rayo: { nombre: 'Rayo', descripcion: '20 o más aciertos con un promedio menor a 15 segundos.' },
  'racha-10': { nombre: 'Racha de 10', descripcion: '10 aciertos seguidos en una ronda.' },
  'racha-25': { nombre: 'Racha de 25', descripcion: '25 aciertos seguidos en una ronda.' },
  constancia: { nombre: 'Constancia', descripcion: 'Jugar 3 días seguidos.' },
  'constancia-oro': { nombre: 'Constancia de oro', descripcion: 'Jugar 7 días seguidos.' },
  'dominio-cuello': { nombre: 'Dominio del cuello', descripcion: '22 o más aciertos en las Aulas 1 y 2.' },
  'senor-plexos': { nombre: 'Señor de los plexos', descripcion: '22 o más aciertos en las Aulas 3 y 5.' },
  vascular: { nombre: 'Vascular', descripcion: '22 o más aciertos en las Aulas 2, 4 y 6.' },
  remontada: { nombre: 'Remontada', descripcion: 'Subir el récord de un aula 1,000 puntos o más.' },
  'listo-departamental': { nombre: 'Listo para el departamental', descripcion: '20 o más aciertos en las 6 aulas.' },
  // Clínica (Sesión 6): las evalúa src/game/clinica/insignias.js
  'residente-de-guardia': { nombre: 'Residente de guardia', descripcion: 'Terminar 5 guardias en la Clínica.' },
  'ojo-clinico': { nombre: 'Ojo clínico', descripcion: 'Resolver un caso sin pistas y con 3 exploraciones o menos.' },
};

const todas = (mejores, aulas, minimo) => aulas.every((a) => (mejores[a] ?? 0) >= minimo);

/**
 * Insignias NUEVAS que gana el jugador al terminar una ronda.
 *  - ronda: { aciertos, total, puntaje, rachaMax, tiempoPromedioMs, recordAnterior }
 *  - mejoresAciertos: { [aula]: mejor número de aciertos en una ronda } YA incluyendo esta ronda.
 *    Un aula cerrada nunca tiene rondas, así que sus insignias solo se pueden ganar cuando abre.
 *  - rachaDias: la racha de días ya actualizada con la ronda de hoy.
 *  - yaGanadas: ids que ya tiene (no se repiten).
 */
export function evaluarInsignias({ ronda, mejoresAciertos = {}, rachaDias = 0, yaGanadas = [] }) {
  const logradas = new Set(['primer-dia']);
  if (ronda.aciertos >= ronda.total) logradas.add('ronda-perfecta');
  if (ronda.aciertos >= 20 && ronda.tiempoPromedioMs != null && ronda.tiempoPromedioMs < 15000) logradas.add('rayo');
  if (ronda.rachaMax >= 10) logradas.add('racha-10');
  if (ronda.rachaMax >= 25) logradas.add('racha-25');
  if (rachaDias >= 3) logradas.add('constancia');
  if (rachaDias >= 7) logradas.add('constancia-oro');
  if (todas(mejoresAciertos, [1, 2], 22)) logradas.add('dominio-cuello');
  if (todas(mejoresAciertos, [3, 5], 22)) logradas.add('senor-plexos');
  if (todas(mejoresAciertos, [2, 4, 6], 22)) logradas.add('vascular');
  if (todas(mejoresAciertos, [1, 2, 3, 4, 5, 6], 20)) logradas.add('listo-departamental');
  // Remontada: ya había un récord en esa aula y esta ronda lo supera por 1,000 o más.
  if (ronda.recordAnterior > 0 && ronda.puntaje - ronda.recordAnterior >= 1000) logradas.add('remontada');

  const tiene = new Set(yaGanadas);
  return Object.keys(INSIGNIAS).filter((id) => logradas.has(id) && !tiene.has(id));
}
