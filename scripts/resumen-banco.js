// Muestra cuántas preguntas puede servir el servidor en cada aula y tema (npm run banco:resumen).
// Una ronda necesita 12 y 13 servibles por tema. "Servible" = estado "aprobada" y, si lleva imagen, imagen "lista".
import { readdirSync, readFileSync } from 'node:fs';
import { esServible } from '../src/game/ronda/seleccion.js';

const dir = new URL('../contenido/preguntas/', import.meta.url);
let faltan = 0;
for (const f of readdirSync(dir).filter((n) => /^aula-\d+\.json$/.test(n)).sort()) {
  const banco = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  console.log(`\nAula ${banco.aula}`);
  for (const t of banco.temas) {
    const delTema = banco.preguntas.filter((p) => p.tema === t.id);
    const aprobadas = delTema.filter((p) => p.estado === 'aprobada').length;
    const servibles = delTema.filter((p) => esServible(p)).length;
    const sinImagen = aprobadas - servibles;
    const marca = servibles >= 13 ? 'OK ' : 'FALTAN';
    if (servibles < 13) faltan++;
    console.log(`  ${marca} ${t.nombre}: ${servibles} servibles (${aprobadas} aprobadas de ${delTema.length}${sinImagen ? `; ${sinImagen} con imagen pendiente` : ''})`);
  }
}
console.log(faltan ? `\n${faltan} tema(s) sin las 13 preguntas servibles que necesita una ronda.` : '\nTodos los temas pueden armar rondas.');
