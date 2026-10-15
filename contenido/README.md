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
