# Anatomía 360 · Sesiones 2 a 5: campus, rondas, Salón de la Fama y Control Escolar

Juego web pixel art (Phaser 3 + Supabase + Netlify) para Anatomía de 1.er semestre, UMSNH.
Esta sesión agrega el **campus**: mapa de 3 × 3 pantallas con avatar, joystick, sprint, colisiones,
minimapa, tarjetas al acercarse a una puerta y aulas que se abren por fecha.
**Sesión 4:** las puertas de las 6 aulas ya llevan a la ronda (25 preguntas, 42 s cada una), con calificación
en una Edge Function de Supabase, retroalimentación, récord, racha de días e insignias. **Sesión 5:** el Salón de la Fama (Top 10 semanal) y Control Escolar (tu expediente) ya funcionan.
La Clínica llega en la Sesión 6.

**Si ya hiciste las Sesiones 1–3, para la Sesión 4 SÍ tienes que tocar Supabase:** vuelve a ejecutar
`supabase/schema.sql` completo (es seguro, no borra jugadores) y despliega la función (ver "Motor de rondas").

## Cómo se juega
| | Celular / tablet | Computadora |
|---|---|---|
| Mover | joystick (abajo a la izquierda) | WASD o flechas |
| Correr | mantener **CORRER** (abajo a la derecha) | mantener Shift |
| Entrar a un lugar | botón de la tarjeta | botón de la tarjeta, o tecla E / Enter |

Correr gasta una resistencia de 5 barras (unos 3 s seguidos); al vaciarse hay que esperar a recuperar un poco.

## El campus
Cada pantalla mide 52 × 24 tiles de 16 px (el tamaño de un celular en horizontal). El minimapa dibuja el campus completo, 1 píxel por tile.

| | Oeste | Centro | Este |
|---|---|---|---|
| **Norte** | jardín y biblioteca | jardín | estanque |
| **Medio** | Control Escolar | plaza con fuente, Aulas 1-3, Clínica, Salón de la Fama | Aulas 4, 5 y 6 |
| **Sur** | cafetería | jardín | estanque |

El avatar aparece en la plaza. Las aulas abren cada lunes a las 00:00 (CDMX) y el juego pregunta
la hora **al servidor**, no al teléfono: si el reloj del alumno está mal, no se abre nada antes de tiempo.
Un aula bloqueada se ve apagada y con candado; su tarjeta muestra la fecha y una cuenta regresiva.
Si no hay internet, el campus usa el calendario de `src/config.js` (solo como respaldo).

## Qué cambiar y dónde
| Quiero cambiar… | Archivo |
|---|---|
| Fechas de las aulas | `supabase/schema.sql` (vuelve a ejecutarlo) **y** `CALENDARIO_AULAS` en `src/config.js` |
| Velocidad, correr, resistencia, distancia de las tarjetas | `MOVIMIENTO` y `PROXIMIDAD` en `src/config.js` |
| Dónde está cada edificio, camino, banca o árbol | `src/game/mapa.js` (todo en tiles; `npm test` avisa si algo queda inalcanzable) |
| Colores y dibujo de edificios, árboles, fuente | `src/game/texturas.js` |
| Textos de tarjetas, carteles y menú | `src/textos.js` → `CAMPUS` |
| Cuando una puerta ya lleve a algún lado | `entrarALugar` en `src/app.js` (el campus la llama desde `src/ui/pantallas/campus.js`) |

## 1. Correrlo en tu computadora
Necesitas Node 20.19 o más nuevo.

```bash
npm install
cp .env.example .env     # después llena los dos valores (paso 3)
npm run dev              # abre http://localhost:5173
npm test                 # pruebas de lógica: validación, mapa, colisiones, calendario… (opcional)
```

## 2. Crear las tablas en Supabase
1. Crea un proyecto en supabase.com (plan gratuito).
2. Abre **SQL Editor → New query**.
3. Pega TODO el contenido de `supabase/schema.sql` y pulsa **Run**. Debe terminar con "Success".
   Se puede volver a ejecutar sin borrar jugadores (solo re-sincroniza las fechas de las aulas).

## 3. Variables de entorno
En Supabase pulsa **Connect** (o **Project Settings → API Keys**) y copia:

| Variable | De dónde sale |
|---|---|
| `VITE_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | **Publishable key** (`sb_publishable_...`). También sirve la clave `anon` legacy |

Nunca uses la clave `secret` / `service_role` en este proyecto.

## 4. Publicar en Netlify (con GitHub)
1. Sube esta carpeta a un repositorio de GitHub (`.env` y `node_modules` ya están en `.gitignore`).
2. Netlify → **Add new site → Import an existing project** → elige el repo.
   El comando de build (`npm run build`) y la carpeta (`dist`) vienen de `netlify.toml`.
3. **Site configuration → Environment variables**: agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. **Deploys → Trigger deploy**. Cada `git push` publica solo.

## Si algo falla
- *"Falta conectar con Supabase"*: no hay `.env` (local) o faltan las variables (Netlify; redeploya después de agregarlas).
- *"Supabase no tiene las tablas"*: no se ejecutó `schema.sql` (paso 2).
- *"Supabase rechazó la clave"*: revisa que `VITE_SUPABASE_ANON_KEY` sea la publishable/anon.
- Deploy detenido por "secrets scanning": revisa que `netlify.toml` esté en la raíz del repo.

## Operación
- Borrar a un jugador (sus rondas y puntajes se borran con él), en el SQL Editor:
  `delete from public.jugadores where matricula = 'a0123456x';`
- Cambiar la fecha de un aula: edita la tabla `aulas` (o `schema.sql` y vuelve a ejecutarlo).
- El proyecto gratuito de Supabase se pausa tras una semana sin actividad.

## Motor de rondas (Sesión 4)

### Cómo funciona
El navegador **nunca** conoce las respuestas correctas ni calcula puntos. Habla con la Edge Function
`supabase/functions/rondas` (una sola función, tres operaciones):

| Operación | Recibe | Devuelve |
|---|---|---|
| `iniciar` | matrícula, aula | 25 enunciados con sus 4 opciones (ya mezcladas), **sin** la correcta |
| `responder` | ronda, número de pregunta, opción A–D (o `null` si se acabó el tiempo) | solo acierto/fallo, puntos y racha |
| `terminar` | ronda | califica y guarda todo; devuelve el resumen con las falladas, sus explicaciones y citas |

Reglas que aplica el servidor: la hora de inicio y de cada respuesta es la suya; una sola respuesta por pregunta y
en orden; una sola ronda activa por matrícula (empezar otra anula la anterior); una ronda con tiempos imposibles
(promedio < 1.5 s, o 5 respuestas de menos de 0.8 s) se descarta sin guardar; y **iniciar, responder y terminar
rechazan un aula cerrada** según el reloj de la base (`aula_abierta()`, la misma hora que `estado_aulas()`).

Puntos: correcta 100 + bono de velocidad (hasta 50, proporcional al tiempo que sobró) + bono de racha
(+10 por acierto seguido, tope +50). Incorrecta o sin contestar: 0 y la racha vuelve a 0.
**El máximo teórico es 4,900** (la base permite hasta 5,000). Calificación = aciertos de 25 en escala de 10.

Decisiones tomadas en esta sesión (cámbialas en `src/game/ronda/reglas.js`, y el SQL si toca fechas):
- **Semana 0:** las rondas jugadas antes del lunes 19 oct guardan récord personal, racha e insignias, pero **no** suman al
  Top 10. El Salón arranca en la semana 1 (19 oct) y cuenta hasta la semana 6 (lunes 23 nov); rondas posteriores solo
  cuentan para el récord personal. La regla vive en SQL (`semana_cuenta_para_salon`).
- **Orden de las preguntas:** de cada tema salen 12 o 13 (al azar cuál), eligiendo primero no vistas, luego falladas y al
  final ya acertadas; en pantalla se presentan en ese mismo orden. "Fallada" = su última respuesta fue incorrecta o sin contestar.
- **Tiempos:** cada pregunta cuenta desde que el servidor contestó la anterior + 0.7 s de pausa (los acredita él). Una
  respuesta que llega hasta 1.5 s tarde por la red todavía vale.
- **Insignias** (se guarda el id; los nombres están en `src/game/ronda/insignias.js`): las que dependen de aulas cerradas
  solo se pueden ganar cuando esas aulas abren, porque el servidor no deja jugarlas antes.

### Archivos
| | |
|---|---|
| `src/game/ronda/` | reglas, puntuación, selección de preguntas, plausibilidad, insignias, racha de días (puros, con pruebas) |
| `src/servidor/` | `manejador.js` (la lógica de la función, sin Deno ni Supabase) e `interruptor.js` |
| `supabase/functions/rondas/` | `index.ts` (Deno) y `datos.ts` (acceso a la base) |
| `supabase/functions/_shared/` | **GENERADO** por `npm run funcion:preparar`: copia de `src/game/ronda`, `src/servidor` y de los bancos (`contenido/` sigue siendo la fuente) |
| `supabase/schema.sql` (sección 7) | `rondas_activas`, `aula_abierta`, `crear_ronda_activa`, `registrar_respuesta`, `contexto_cierre`, `guardar_ronda_terminada` |
| `src/ui/pantallas/ronda.js`, `resultado.js` | pantallas de la ronda y de la retroalimentación |

Cuando edites algo en `src/game/ronda/`, `src/servidor/` o `contenido/preguntas/`: `npm run funcion:preparar` y vuelve a
desplegar la función. `npm test` falla si la copia quedó desactualizada.

### Antes de que los alumnos jueguen: aprobar preguntas
La función solo sirve preguntas con `"estado": "aprobada"` (y las P13 solo con `imagen.estado: "lista"`). Mientras todo esté
en `borrador`, **ni siquiera el Aula 1 puede arrancar una ronda** (el juego dice que aún no hay preguntas listas).
`npm run banco:resumen` muestra cuántas servibles tiene cada tema; una ronda necesita 13 por tema. Tras aprobar:
`npm run funcion:preparar` y `supabase functions deploy rondas --use-api`.

### Desplegar la función (CLI de Supabase)
Necesitas la CLI (`brew install supabase/tap/supabase`, o antepón `npx` a cada comando `supabase`). No hace falta Docker con `--use-api`.

```bash
# 1) Base de datos: pega TODO supabase/schema.sql en SQL Editor → Run (se puede repetir sin borrar jugadores)
# 2) En esta carpeta:
npm install
npm run funcion:preparar          # copia lógica y bancos a supabase/functions/_shared
npm test                          # todo en verde antes de desplegar
supabase login
supabase link --project-ref TU_REF            # TU_REF = lo que va antes de .supabase.co en tu Project URL
supabase functions deploy rondas --use-api    # lee supabase/config.toml (verify_jwt = false para esta función)
supabase secrets list                         # NO debe aparecer A360_MODO_PRUEBAS
```
La función usa la clave secreta que Supabase ya le inyecta (`SUPABASE_SECRET_KEYS` o `SUPABASE_SERVICE_ROLE_KEY`); no hay
que configurarla ni ponerla en Netlify. Netlify no cambia: el juego deduce la URL de la función de `VITE_SUPABASE_URL`.

### Probar la función y comprobar que un aula cerrada rechaza rondas
Sustituye `TU_REF`, `TU_CLAVE_PUBLICABLE` y una matrícula ya registrada en el juego.

```bash
URL=https://TU_REF.supabase.co/functions/v1/rondas
KEY=TU_CLAVE_PUBLICABLE
llamar() { curl -s -w '\nHTTP %{http_code}\n' -X POST "$URL" -H "apikey: $KEY" -H 'Content-Type: application/json' -d "$1"; }

# a) Aula cerrada → HTTP 403 {"error":"aula_cerrada"}   (Aulas 2–6 antes de su lunes)
llamar '{"accion":"iniciar","matricula":"a0123456x","aula":2}'

# b) Aula 1 abierta → HTTP 200 con "preguntas"; comprueba que NO viaja la respuesta:
llamar '{"accion":"iniciar","matricula":"a0123456x","aula":1}' | grep -c -E 'correcta|explicacion|cita'   # debe imprimir 0

# c) Calendario del servidor (SQL Editor): Aula 1 en true, 2–6 en false hasta su fecha
#    select numero, abierta, abre_en from public.estado_aulas();
```

**Responder y terminar también rechazan un aula cerrada, aunque el cliente arme la llamada a mano.** No hay forma legítima de
tener una ronda activa en un aula cerrada, así que se fabrica una en el SQL Editor (usa una matrícula de prueba registrada
en el juego, p. ej. `prueba001`, y un id de pregunta real del Aula 3):

```sql
delete from public.rondas_activas where matricula = 'prueba001';
insert into public.rondas_activas (id, matricula, aula, inicio, expira_en, preguntas)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'prueba001', 3, now(), now() + interval '1 hour',
        '[{"id":"a3-t1-001","orden":[0,1,2,3]}]');
```
```bash
llamar '{"accion":"responder","ronda_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","indice":0,"opcion":0}'   # 403 aula_cerrada
llamar '{"accion":"terminar","ronda_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}'                         # 403 aula_cerrada
```
```sql
delete from public.rondas_activas where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';   -- limpieza
```
Después del lunes 26 oct a las 00:00 (CDMX), el paso (a) con `aula: 2` debe dar 200: así se comprueba la apertura.

### Probar las Aulas 2–6 antes de su fecha (interruptor de desarrollo)
`A360_MODO_PRUEBAS` (variable de entorno de la función; apagada por defecto) hace que la función trate las 6 aulas como abiertas
**y** sirva preguntas en `borrador`. **Nunca debe existir en producción.** Cómo usarlo sin riesgo:

1. Crea un **segundo proyecto de Supabase solo para pruebas** (el plan gratuito permite dos), ejecuta `schema.sql` ahí y despliega la función.
2. Solo en ese proyecto: `supabase secrets set A360_MODO_PRUEBAS=1 --project-ref REF_DE_PRUEBAS`
3. Apunta un `npm run dev` local (o un deploy preview de Netlify) a ese proyecto con su propio `VITE_SUPABASE_URL` y clave.
   Con el interruptor encendido el juego muestra una franja roja de "MODO DE PRUEBAS" para que no se te olvide.
4. Al terminar: `supabase secrets unset A360_MODO_PRUEBAS --project-ref REF_DE_PRUEBAS`.

Nunca uses `supabase secrets set --env-file` con un archivo que contenga el interruptor ni lo pongas en `supabase/functions/.env`
(se carga solo). `tests/despliegue.test.js` falla si el interruptor aparece encendido en `config.toml`, `netlify.toml`,
`package.json`, algún `.env*` (salvo `*.local`), workflows de GitHub o un Dockerfile. En producción verifica además con `supabase secrets list`.

## Salón de la Fama y Control Escolar (Sesión 5)

**Para publicarlo:** vuelve a ejecutar `supabase/schema.sql` completo en SQL Editor (agrega dos funciones nuevas, no borra
nada) y sube los archivos a GitHub para que Netlify publique. **No hay que redesplegar la función `rondas`.**

| | |
|---|---|
| Salón de la Fama | Top 10 de la semana, tu lugar si no estás en el Top 10, pestañas por semana (1 a 6) y los ganadores de las semanas terminadas. Nombre y matrícula oculta (••••4521). Antes del lunes 19 oct dice cuándo arranca |
| Control Escolar | Solo tus resultados: récord total, racha, rondas, resultados por aula y por tema, "conviene repasar" e insignias (ganadas y por ganar) |
| La lista completa del grupo | **No está** en el juego: llega en la Sesión 12, con exportación a Excel para la docente |

- La semana y la hora las manda el servidor (`salon_de_la_fama()` en `schema.sql`), no el teléfono. Las fechas del Salón viven en
  `salon_primer_lunes()` / `salon_ultimo_lunes()` y en `SALON` de `src/game/ronda/reglas.js`; una prueba verifica que coincidan.
- Los temas se rotulan con `TEMAS_AULA` de `src/config.js`; una prueba verifica que coincida con `contenido/preguntas/`.
- Un tema se recomienda para repasar con 5 o más respuestas y menos de 80% de aciertos (`src/ui/control/modelo.js`).
- No hay PIN: igual que al recuperar tu sesión, quien conozca una matrícula puede pedir sus resultados por la API. En pantalla cada alumno ve solo lo suyo.
- Lista de revisión para probar en celular: `docs/PRUEBA_CELULAR.md`.

## Estructura
`src/ui/pantallas/` pantallas · `src/ui/campus/` joystick, botón correr, minimapa y tarjeta ·
`src/game/` Phaser (`scenes/CampusScene.js`) y la lógica pura que se prueba sin navegador
(`mapa`, `colisiones`, `entrada`, `resistencia`, `aulas`, `tarjetas`, `avatarFrames`) ·
`src/api/` Supabase · `src/textos.js` todos los textos · `src/config.js` reglas ·
`supabase/schema.sql` base de datos · `tests/` pruebas.
