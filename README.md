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
| `imagen` | solo en `P13`: descripción del esquema SVG que falta dibujar (`estado: "pendiente"`) |
| `estado` | `borrador` → cambiar a `aprobada` cuando Santi la revise; la Edge Function (Sesión 4) solo debe servir las aprobadas |

| `nota_revision` | solo en algunas: avisa cuando el dato clínico va más allá del texto de Moore y conviene confirmarlo |

## Importante
Las respuestas correctas **no deben viajar al navegador**: en la Sesión 4 se mueven a la Edge Function y el juego solo recibe enunciado y opciones.

La obra se cita siempre de forma formal (autores, año, título, edición y editorial); nunca se menciona el archivo digital de donde se consultó.

`npm test` valida todos los bancos `aula-N.json` (100 preguntas, 50 por tema, reparto de patrones, una sola correcta, sin "todas las anteriores", correcta no delatada por longitud).
