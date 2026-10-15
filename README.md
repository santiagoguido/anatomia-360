# Anatomía 360 · Sesión 2: campus pixel art

Juego web pixel art (Phaser 3 + Supabase + Netlify) para Anatomía de 1.er semestre, UMSNH.
Esta sesión agrega el **campus**: mapa de 3 × 3 pantallas con avatar, joystick, sprint, colisiones,
minimapa, tarjetas al acercarse a una puerta y aulas que se abren por fecha. Las puertas todavía no
llevan a las rondas, la Clínica, el Salón de la Fama ni Control Escolar (Sesiones 3 en adelante).

**Si ya hiciste la Sesión 1 no tienes que tocar Supabase:** esta sesión usa la función `estado_aulas()`
que ya estaba en `schema.sql`.

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
| Cuando una puerta ya lleve a algún lado | `ctx.entrarALugar` en `src/ui/pantallas/campus.js` |

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

## Estructura
`src/ui/pantallas/` pantallas · `src/ui/campus/` joystick, botón correr, minimapa y tarjeta ·
`src/game/` Phaser (`scenes/CampusScene.js`) y la lógica pura que se prueba sin navegador
(`mapa`, `colisiones`, `entrada`, `resistencia`, `aulas`, `tarjetas`, `avatarFrames`) ·
`src/api/` Supabase · `src/textos.js` todos los textos · `src/config.js` reglas ·
`supabase/schema.sql` base de datos · `tests/` pruebas.
