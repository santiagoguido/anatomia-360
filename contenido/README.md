# Banco de preguntas · Anatomía 360

`preguntas/aula-N.json`: 100 preguntas por aula (50 por tema). **Este JSON es la fuente de verdad: edítalo directamente.**

## Campos de cada pregunta
| Campo | Qué es |
|---|---|
| `id` | `a1-t1-001`: aula, tema (t1/t2) y número |
| `patron` | `P09` viñeta clínica · `P02` disección · `P04` función · `P10` límites y contenidos · `P13` imagen |
| `dificultad` | 1 básica, 2 media, 3 alta |
| `opciones` / `correcta` | 4 opciones; `correcta` es la posición (0 = A … 3 = D). El juego mezcla el orden en cada ronda |
| `explicacion` | 2–3 líneas para la retroalimentación al final de la ronda |
| `referencia` | `fuente` (clave en `fuente.referencias` del encabezado), capítulo, sección, `pagina` y `cita`: la cita bibliográfica formal lista para mostrar en la retroalimentación |
| `imagen` | solo en `P13`: descripción del esquema SVG que falta dibujar (`estado: "pendiente"`). Cuando el SVG esté listo, cambia a `"lista"`: **una P13 con la imagen pendiente nunca se sirve**, aunque esté aprobada |
| `estado` | `borrador` → cambiar a `aprobada` cuando Santi la revise. **La Edge Function solo sirve las `aprobada`** (los borradores solo con el interruptor de pruebas, que nunca va en producción). Una ronda necesita 13 aprobadas por tema: `npm run banco:resumen` lo comprueba |

| `nota_revision` | solo en algunas: avisa cuando el dato clínico va más allá del texto de Moore y conviene confirmarlo |

## Importante
Las respuestas correctas **no viajan al navegador**: viven solo en la Edge Function `rondas` y el juego recibe enunciado y opciones. Esta carpeta sigue siendo la **fuente de verdad**; después de editar un JSON ejecuta `npm run funcion:preparar` (copia lo necesario a `supabase/functions/_shared/banco/`) y vuelve a desplegar la función. `npm test` falla si olvidas la copia.

La obra se cita siempre de forma formal (autores, año, título, edición y editorial); nunca se menciona el archivo digital de donde se consultó.

`npm test` valida todos los bancos `aula-N.json` (100 preguntas, 50 por tema, reparto de patrones, una sola correcta, sin "todas las anteriores", correcta no delatada por longitud).


---

# Casos clínicos de la Clínica (Sesión 6)

`casos/semana-N.json`: **8 casos por semana**. Cada archivo lleva los casos cuyo tema más tardío pertenece a esa semana (un caso con temas
de las aulas 1 y 2 va en `semana-2.json`). **Este JSON es la fuente de verdad**: edítalo directamente.

## Campos de cada caso
| Campo | Qué es |
|---|---|
| `id` | `c1-01`: semana y número |
| `titulo` | nombre del caso. **Solo se ve al terminar** (en el desenlace y en Expedientes), para no adelantar el diagnóstico |
| `temas` | ids de tema de `contenido/preguntas/` (`musculos-triangulos`, `vascularizacion-cuello`…). De ahí sale en qué aulas debe estar abierto |
| `paciente`, `presentacion`, `motivo` | ficha del paciente y lo que dice la Dra. Zamudio al presentarlo |
| `exploraciones` | las 6 (`inspeccion`, `fuerza`, `sensibilidad`, `pulsos`, `reflejos`, `arcos`), cada una con `util` (true/false) y su `hallazgo`. **Exactamente 4 útiles** |
| `pasos` | 3 pasos: `funcion`, `estructura`, `nivel`. Cada uno con `pregunta`, 4 `opciones`, `correcta` (0 = A…), `pista`. El juego mezcla A–D en cada guardia |
| `desenlace` | `texto` (voz de la doctora), `explicacion` y `esquema` (`base`, `resaltar`, `pie`) |
| `referencia` | capítulo, sección, páginas y la `cita` formal de Moore, como en las preguntas |
| `nota_revision` | avisa cuándo el dato clínico va más allá del extracto de Moore y conviene confirmarlo |
| `estado` | `borrador` → cambiar a `aprobado` cuando lo revises. **La función solo sirve los `aprobado`** |

## Esquemas
Los esquemas son **dibujos propios** (nunca copiados del libro), definidos en `src/ui/clinica/esquemas.js`. Un caso solo elige una `base`
(`cuello-lateral`, `cuello-axial`, `cuello-anterior`, `faringe-posterior`, `faringe-abierta`, `tiroides-posterior`, `carotida`, `raiz-cuello`) y los
`resaltar` (ids de estructuras de esa base). `npm test` comprueba que cada id exista. Para una estructura nueva, agrega la forma a la base.

`npm test` valida todos los casos: 6 exploraciones con 4 útiles, 3 pasos de 4 opciones distintas, sin «todas las anteriores», correcta no delatada
por longitud, esquema válido, cita formal con páginas dentro del rango del libro y sin mención al archivo digital. Después de editar un JSON:
`npm run funcion:preparar` (copia a `supabase/functions/_shared/casos/`) y volver a desplegar la función.
