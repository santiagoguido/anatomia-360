// Racha de días (días seguidos con al menos una ronda terminada). Las fechas son 'AAAA-MM-DD' en hora de CDMX.

const aDias = (iso) => Date.UTC(...iso.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)))) / 86400000;

/** Días de calendario entre dos fechas 'AAAA-MM-DD' (b − a). */
export function diasEntre(a, b) {
  return Math.round(aDias(b) - aDias(a));
}

/**
 * Nueva racha al terminar una ronda hoy.
 *  - Ya jugó hoy: no cambia.
 *  - Jugó ayer: +1.
 *  - Cualquier otro caso (primera vez o se saltó un día): vuelve a 1.
 */
export function actualizarRachaDias({ racha = 0, ultimoDia = null }, hoy) {
  if (!ultimoDia) return { racha: 1, ultimoDia: hoy };
  const diff = diasEntre(ultimoDia, hoy);
  if (diff === 0) return { racha: Math.max(racha, 1), ultimoDia };
  if (diff === 1) return { racha: racha + 1, ultimoDia: hoy };
  return { racha: 1, ultimoDia: hoy };
}
