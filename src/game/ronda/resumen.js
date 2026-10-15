// Arma la revisión de las preguntas falladas que se muestra al final de la ronda. Puro.

/**
 * `preguntas`: [{ id, orden }] de la ronda; `respuestas`: las registradas; `porId`: id → pregunta completa del banco.
 * Las posiciones (elegida, correcta) son las que vio el alumno, ya con A–D mezcladas.
 * Solo se incluyen las falladas o sin contestar: las acertadas nunca revelan su clave.
 */
export function armarRevision(preguntas, respuestas, porId) {
  const revision = [];
  preguntas.forEach((rp, indice) => {
    const r = respuestas[indice];
    if (r?.acierto) return;
    const p = porId.get(rp.id);
    const elegida = r?.contestada ? rp.orden.indexOf(r.opcion) : null;
    revision.push({
      indice,
      enunciado: p.enunciado,
      opciones: rp.orden.map((i) => p.opciones[i]),
      elegida: elegida === -1 ? null : elegida,
      correcta: rp.orden.indexOf(p.correcta),
      explicacion: p.explicacion,
      cita: p.referencia?.cita ?? null,
    });
  });
  return revision;
}
