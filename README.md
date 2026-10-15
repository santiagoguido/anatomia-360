# Anatomía 360 · Sesión 1: base técnica

Juego web pixel art (Phaser 3 + Supabase + Netlify) para Anatomía de 1.er semestre, UMSNH.
Esta sesión incluye: portada, registro por pasos, aviso de privacidad, recuperación de jugador por
matrícula y un campus vacío. El mapa se hace en la Sesión 2.

## 1. Correrlo en tu computadora
Necesitas Node 20.19 o más nuevo.

```bash
npm install
cp .env.example .env     # después llena los dos valores (paso 3)
npm run dev              # abre http://localhost:5173
npm test                 # pruebas de validación (opcional)
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
`src/ui/pantallas/` pantallas · `src/game/` Phaser · `src/api/` Supabase · `src/textos.js` todos los textos ·
`src/config.js` reglas (formato de matrícula) · `supabase/schema.sql` base de datos.
