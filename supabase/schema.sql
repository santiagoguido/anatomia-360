-- =============================================================================
-- Anatomía 360 · Esquema de Supabase (Sesión 1 + rondas de la Sesión 4 + Clínica de la Sesión 6)
-- -----------------------------------------------------------------------------
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
-- Es seguro volver a ejecutarlo: no borra datos de jugadores. Solo vuelve a
-- sincronizar las fechas y temas de la tabla `aulas` con las de este archivo.
--
-- Modelo de seguridad (no hay PIN ni inicio de sesión):
--   · Las tablas NO se pueden leer ni escribir directamente con la clave pública
--     (anon). Todo pasa por funciones (RPC) que validan los datos.
--   · Los puntajes y las rondas NO los puede escribir el navegador: solo la
--     Edge Function de la Sesión 4, con la clave secreta (service_role).
--   · La matrícula completa nunca se devuelve en rankings; sale como ••••4521.
-- =============================================================================


-- 1. UTILIDADES -----------------------------------------------------------------

-- Matrícula en minúsculas y sin espacios (así se guarda siempre).
create or replace function public.normalizar_matricula(p text)
returns text
language sql immutable parallel safe
set search_path = ''
as $$
  select lower(regexp_replace(coalesce(p, ''), '\s+', '', 'g'))
$$;

-- ••••4521: oculta todo menos los últimos 4 caracteres.
create or replace function public.enmascarar_matricula(p text)
returns text
language sql immutable parallel safe
set search_path = ''
as $$
  select '••••' || right(coalesce(p, ''), 4)
$$;

-- Lunes de la semana (hora de Ciudad de México) a la que pertenece un momento.
-- Las semanas del juego van de lunes 00:00 a domingo 23:59.
create or replace function public.semana_cdmx(p_momento timestamptz default now())
returns date
language sql stable parallel safe
set search_path = ''
as $$
  select date_trunc('week', p_momento at time zone 'America/Mexico_City')::date
$$;


-- ¿Esa semana (lunes) cuenta para el Salón de la Fama? Solo las semanas 1 a 6 del curso:
-- del lunes 19 oct al lunes 23 nov de 2026. Las rondas de la semana 0 (antes del 19 oct) guardan
-- récord personal pero no suman al Top 10. Mismas fechas que SALON en src/game/ronda/reglas.js.
create or replace function public.salon_primer_lunes()
returns date language sql immutable parallel safe set search_path = ''
as $$ select date '2026-10-19' $$;

create or replace function public.salon_ultimo_lunes()
returns date language sql immutable parallel safe set search_path = ''
as $$ select date '2026-11-23' $$;

create or replace function public.semana_cuenta_para_salon(p_semana date)
returns boolean
language sql immutable parallel safe
set search_path = ''
as $$
  select p_semana between public.salon_primer_lunes() and public.salon_ultimo_lunes()
$$;


-- 2. TABLAS ---------------------------------------------------------------------

-- Aulas y su calendario de apertura (datos públicos).
create table if not exists public.aulas (
  numero   smallint primary key check (numero between 1 and 6),
  titulo   text        not null,
  temas    text[]      not null,
  abre_en  timestamptz not null
);

-- Jugadores: la matrícula es la llave. No hay contraseña.
create table if not exists public.jugadores (
  matricula            text primary key
                         check (matricula ~ '^[a-z0-9]{7,10}$' and matricula ~ '[0-9]'),
  nombre               text        not null check (char_length(nombre) between 3 and 60),
  genero               text        not null check (genero in ('femenino', 'masculino')),
  acepto_privacidad_en timestamptz not null default now(),
  creado_en            timestamptz not null default now(),
  ultimo_acceso        timestamptz not null default now(),
  record_total         integer     not null default 0 check (record_total >= 0),
  racha_dias           integer     not null default 0 check (racha_dias >= 0),
  ultimo_dia_jugado    date,
  insignias            text[]      not null default '{}'
);

-- Progreso de cada jugador en cada aula.
create table if not exists public.progreso_aula (
  matricula          text     not null references public.jugadores (matricula)
                              on delete cascade on update cascade,
  aula               smallint not null references public.aulas (numero),
  ultimo_puntaje     integer  not null default 0 check (ultimo_puntaje between 0 and 5000),
  record             integer  not null default 0 check (record between 0 and 5000),
  rondas_jugadas     integer  not null default 0 check (rondas_jugadas >= 0),
  preguntas_vistas   text[]   not null default '{}',
  preguntas_falladas text[]   not null default '{}',
  actualizado_en     timestamptz not null default now(),
  primary key (matricula, aula)
);

-- Cada ronda terminada (la escribe solo la Edge Function de la Sesión 4).
create table if not exists public.rondas (
  id                 uuid     primary key default gen_random_uuid(),
  matricula          text     not null references public.jugadores (matricula)
                              on delete cascade on update cascade,
  aula               smallint not null references public.aulas (numero),
  puntaje            integer  not null check (puntaje between 0 and 5000),
  aciertos           smallint not null check (aciertos between 0 and 25),
  tiempo_promedio_ms integer  check (tiempo_promedio_ms >= 0),
  inicio             timestamptz not null,
  fin                timestamptz not null,
  semana             date     not null,
  respuestas         jsonb    not null default '[]'::jsonb,
  check (fin >= inicio)
);
create index if not exists rondas_matricula_aula_idx on public.rondas (matricula, aula);
create index if not exists rondas_semana_idx         on public.rondas (semana, matricula);

-- Puntaje semanal de cada jugador: de aquí sale el Top 10 (carga rápido).
-- puntaje = suma de la mejor ronda de cada aula de esa semana
--           + la mejor guardia de la Clínica de esa semana (Sesión 6).
create table if not exists public.puntaje_semanal (
  semana         date    not null,
  matricula      text    not null references public.jugadores (matricula)
                         on delete cascade on update cascade,
  puntaje        integer not null default 0 check (puntaje >= 0),
  rondas         integer not null default 0 check (rondas >= 0),
  alcanzado_en   timestamptz not null default now(),  -- desempate: gana quien llegó antes
  actualizado_en timestamptz not null default now(),
  primary key (semana, matricula)
);
create index if not exists puntaje_semanal_top_idx
  on public.puntaje_semanal (semana, puntaje desc, alcanzado_en asc);


-- Guardias de la Clínica terminadas (Sesión 6). Las escribe solo la Edge Function.
-- Máximo 3,500 = 5 casos × 700 (reglas en src/game/clinica/reglas.js; una prueba comprueba que coincidan).
create table if not exists public.guardias (
  id        uuid        primary key default gen_random_uuid(),
  matricula text        not null references public.jugadores (matricula)
                        on delete cascade on update cascade,
  puntaje   integer     not null check (puntaje between 0 and 3500),
  casos     jsonb       not null default '[]'::jsonb,
  inicio    timestamptz not null,
  fin       timestamptz not null,
  semana    date        not null,
  check (fin >= inicio)
);
create index if not exists guardias_matricula_idx on public.guardias (matricula, puntaje desc);
create index if not exists guardias_semana_idx    on public.guardias (semana, matricula);

-- Expedientes: cada caso clínico que el jugador resolvió (los 3 pasos acertados). Se archiva una sola vez por caso;
-- si lo vuelve a resolver solo se conserva su mejor puntaje. El contenido del caso vive en contenido/casos/.
create table if not exists public.expedientes (
  matricula   text        not null references public.jugadores (matricula)
                          on delete cascade on update cascade,
  caso_id     text        not null,
  puntos      integer     not null check (puntos between 0 and 700),
  resuelto_en timestamptz not null default now(),
  primary key (matricula, caso_id)
);


-- 3. CALENDARIO DE AULAS --------------------------------------------------------
-- Se abren a las 00:00 (CDMX) del lunes de su semana; el Aula 1 ya está abierta.
insert into public.aulas (numero, titulo, temas, abre_en) values
  (1, 'Aula 1', array['Músculos y triángulos del cuello', 'Faringe y esófago'],
      timestamp '2026-10-01 00:00' at time zone 'America/Mexico_City'),
  (2, 'Aula 2', array['Laringe, tráquea y glándula tiroides', 'Vascularización del cuello'],
      timestamp '2026-10-26 00:00' at time zone 'America/Mexico_City'),
  (3, 'Aula 3', array['Hombro, brazo y codo', 'Plexo braquial'],
      timestamp '2026-11-02 00:00' at time zone 'America/Mexico_City'),
  (4, 'Aula 4', array['Antebrazo y mano', 'Vascularización del miembro superior'],
      timestamp '2026-11-09 00:00' at time zone 'America/Mexico_City'),
  (5, 'Aula 5', array['Glúteo y muslo', 'Plexo lumbosacro'],
      timestamp '2026-11-16 00:00' at time zone 'America/Mexico_City'),
  (6, 'Aula 6', array['Rodilla, pierna y pie', 'Vascularización del miembro inferior'],
      timestamp '2026-11-23 00:00' at time zone 'America/Mexico_City')
on conflict (numero) do update
  set titulo = excluded.titulo, temas = excluded.temas, abre_en = excluded.abre_en;


-- 4. SEGURIDAD A NIVEL DE FILA (RLS) --------------------------------------------
alter table public.aulas           enable row level security;
alter table public.jugadores       enable row level security;
alter table public.progreso_aula   enable row level security;
alter table public.rondas          enable row level security;
alter table public.puntaje_semanal enable row level security;
alter table public.guardias        enable row level security;
alter table public.expedientes     enable row level security;

-- Se quita todo acceso directo a las tablas para anon / authenticated.
revoke all on table public.aulas, public.jugadores, public.progreso_aula,
                    public.rondas, public.puntaje_semanal, public.guardias, public.expedientes
  from public, anon, authenticated;

-- Solo el calendario de aulas es público (no tiene datos personales).
grant select on table public.aulas to anon, authenticated;
drop policy if exists aulas_lectura_publica on public.aulas;
create policy aulas_lectura_publica on public.aulas
  for select to anon, authenticated using (true);

-- El resto: denegado de forma explícita (solo las funciones de abajo y la
-- clave secreta del servidor pueden tocarlas; service_role se salta RLS).
drop policy if exists jugadores_sin_acceso_directo on public.jugadores;
create policy jugadores_sin_acceso_directo on public.jugadores
  for all to anon, authenticated using (false) with check (false);

drop policy if exists progreso_sin_acceso_directo on public.progreso_aula;
create policy progreso_sin_acceso_directo on public.progreso_aula
  for all to anon, authenticated using (false) with check (false);

drop policy if exists rondas_sin_acceso_directo on public.rondas;
create policy rondas_sin_acceso_directo on public.rondas
  for all to anon, authenticated using (false) with check (false);

drop policy if exists puntaje_semanal_sin_acceso_directo on public.puntaje_semanal;
create policy puntaje_semanal_sin_acceso_directo on public.puntaje_semanal
  for all to anon, authenticated using (false) with check (false);

drop policy if exists guardias_sin_acceso_directo on public.guardias;
create policy guardias_sin_acceso_directo on public.guardias
  for all to anon, authenticated using (false) with check (false);

drop policy if exists expedientes_sin_acceso_directo on public.expedientes;
create policy expedientes_sin_acceso_directo on public.expedientes
  for all to anon, authenticated using (false) with check (false);


-- 5. FUNCIONES PARA EL JUEGO (RPC) ---------------------------------------------

-- Interna: arma el JSON del jugador (sin las listas largas de preguntas).
create or replace function public._jugador_json(p_matricula text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'matricula',        j.matricula,
    'matricula_oculta', public.enmascarar_matricula(j.matricula),
    'nombre',           j.nombre,
    'genero',           j.genero,
    'record_total',     j.record_total,
    'racha_dias',       j.racha_dias,
    'insignias',        to_jsonb(j.insignias),
    'mejor_guardia',    coalesce((select max(g.puntaje) from public.guardias g where g.matricula = j.matricula), 0),
    'expedientes',      (select count(*)::int from public.expedientes e where e.matricula = j.matricula),
    'progreso', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'aula',           p.aula,
                 'ultimo_puntaje', p.ultimo_puntaje,
                 'record',         p.record,
                 'rondas_jugadas', p.rondas_jugadas)
               order by p.aula)
      from public.progreso_aula p
      where p.matricula = j.matricula
    ), '[]'::jsonb)
  )
  from public.jugadores j
  where j.matricula = p_matricula
$$;

-- Busca a un jugador por matrícula. Devuelve su JSON o null si no existe.
-- Solo lee: no cambia nada.
create or replace function public.recuperar_jugador(p_matricula text)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_mat text := public.normalizar_matricula(p_matricula);
begin
  if v_mat !~ '^[a-z0-9]{7,10}$' or v_mat !~ '[0-9]' then
    raise exception 'matricula_invalida' using errcode = '22023';
  end if;
  return public._jugador_json(v_mat);
end
$$;

-- Registra a un jugador nuevo. Si la matrícula ya existe NO cambia nada
-- (ni nombre ni género) y devuelve al jugador existente con ya_existia = true.
create or replace function public.registrar_jugador(
  p_matricula text,
  p_nombre    text,
  p_genero    text
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_mat   text := public.normalizar_matricula(p_matricula);
  v_nom   text := regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_gen   text := lower(btrim(coalesce(p_genero, '')));
  v_filas integer;
begin
  if v_mat !~ '^[a-z0-9]{7,10}$' or v_mat !~ '[0-9]' then
    raise exception 'matricula_invalida' using errcode = '22023';
  end if;
  if char_length(v_nom) not between 3 and 60
     or v_nom !~ '^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ''’. -]*$' then
    raise exception 'nombre_invalido' using errcode = '22023';
  end if;
  if v_gen not in ('femenino', 'masculino') then
    raise exception 'genero_invalido' using errcode = '22023';
  end if;

  insert into public.jugadores (matricula, nombre, genero)
  values (v_mat, v_nom, v_gen)
  on conflict (matricula) do nothing;
  get diagnostics v_filas = row_count;

  return public._jugador_json(v_mat) || jsonb_build_object('ya_existia', v_filas = 0);
end
$$;

-- Marca la última vez que el jugador entró (se llama al entrar al campus).
create or replace function public.registrar_acceso(p_matricula text)
returns void
language sql volatile security definer
set search_path = ''
as $$
  update public.jugadores
     set ultimo_acceso = now()
   where matricula = public.normalizar_matricula(p_matricula)
$$;

-- Calendario de aulas con la hora del SERVIDOR (no la del teléfono).
create or replace function public.estado_aulas()
returns table (
  numero             smallint,
  titulo             text,
  temas              text[],
  abre_en            timestamptz,
  abierta            boolean,
  segundos_para_abrir integer
)
language sql stable security definer
set search_path = ''
as $$
  select a.numero, a.titulo, a.temas, a.abre_en,
         a.abre_en <= now(),
         greatest(0, ceil(extract(epoch from (a.abre_en - now()))))::integer
  from public.aulas a
  order by a.numero
$$;

-- Top 10 de una semana (por defecto, la actual). Matrícula siempre oculta.
create or replace function public.top10_semanal(p_semana date default null)
returns table (
  posicion         integer,
  nombre           text,
  matricula_oculta text,
  puntaje          integer
)
language sql stable security definer
set search_path = ''
as $$
  select (row_number() over (order by s.puntaje desc, s.alcanzado_en asc))::integer,
         j.nombre,
         public.enmascarar_matricula(j.matricula),
         s.puntaje
  from public.puntaje_semanal s
  join public.jugadores j on j.matricula = s.matricula
  where s.semana = coalesce(p_semana, public.semana_cdmx())
    and s.puntaje > 0
  order by 1
  limit 10
$$;

-- Posición de un jugador en el ranking de la semana (para "estás en el lugar N").
create or replace function public.mi_posicion_semanal(p_matricula text, p_semana date default null)
returns table (posicion integer, puntaje integer, jugadores integer)
language sql stable security definer
set search_path = ''
as $$
  with ranking as (
    select s.matricula, s.puntaje,
           (row_number() over (order by s.puntaje desc, s.alcanzado_en asc))::integer as pos
    from public.puntaje_semanal s
    where s.semana = coalesce(p_semana, public.semana_cdmx())
      and s.puntaje > 0
  )
  select r.pos, r.puntaje, (select count(*)::integer from ranking)
  from ranking r
  where r.matricula = public.normalizar_matricula(p_matricula)
$$;

-- Interna (solo servidor): recalcula el puntaje semanal de un jugador a partir
-- de sus rondas. La llamará la Edge Function de la Sesión 4 al calificar.
create or replace function public.recalcular_puntaje_semanal(p_matricula text, p_semana date)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_puntaje integer;
  v_rondas  integer;
  v_guardia integer;
begin
  -- Semana 0 (o después del curso): no se escribe en el Salón de la Fama.
  if not public.semana_cuenta_para_salon(p_semana) then
    return;
  end if;

  select coalesce(sum(t.mejor), 0)::integer, coalesce(sum(t.n), 0)::integer
    into v_puntaje, v_rondas
  from (
    select max(r.puntaje) as mejor, count(*) as n
    from public.rondas r
    where r.matricula = p_matricula and r.semana = p_semana
    group by r.aula
  ) t;

  -- Sesión 6: la mejor guardia de la Clínica de esa semana se suma a la mejor ronda de cada aula.
  select coalesce(max(g.puntaje), 0)::integer into v_guardia
  from public.guardias g
  where g.matricula = p_matricula and g.semana = p_semana;
  v_puntaje := v_puntaje + v_guardia;

  insert into public.puntaje_semanal as s (semana, matricula, puntaje, rondas)
  values (p_semana, p_matricula, v_puntaje, v_rondas)
  on conflict (semana, matricula) do update
    set puntaje        = excluded.puntaje,
        rondas         = excluded.rondas,
        actualizado_en = now(),
        alcanzado_en   = case when excluded.puntaje <> s.puntaje
                              then now() else s.alcanzado_en end;
end
$$;


-- 6. PERMISOS DE EJECUCIÓN ------------------------------------------------------
-- Por defecto Supabase deja ejecutar funciones a cualquiera. Aquí se cierran las
-- de ESTE juego (solo estas, nada más del proyecto) y se abre lo que el
-- navegador necesita.
revoke execute on function
  public.normalizar_matricula(text),
  public.enmascarar_matricula(text),
  public.semana_cdmx(timestamptz),
  public._jugador_json(text),
  public.recuperar_jugador(text),
  public.registrar_jugador(text, text, text),
  public.registrar_acceso(text),
  public.estado_aulas(),
  public.top10_semanal(date),
  public.mi_posicion_semanal(text, date),
  public.recalcular_puntaje_semanal(text, date)
from public, anon, authenticated;

grant execute on function
  public.recuperar_jugador(text),
  public.registrar_jugador(text, text, text),
  public.registrar_acceso(text),
  public.estado_aulas(),
  public.top10_semanal(date),
  public.mi_posicion_semanal(text, date)
to anon, authenticated;

-- Solo el servidor (clave secreta) puede recalcular puntajes.
grant execute on function public.recalcular_puntaje_semanal(text, date) to service_role;

-- 7. MOTOR DE RONDAS (Sesión 4) -------------------------------------------------
-- Lo usa SOLO la Edge Function `rondas` con la clave secreta (service_role).
-- El navegador no puede leer ni escribir estas tablas ni ejecutar estas funciones.

-- Ronda en curso: una por matrícula (empezar otra anula la anterior). Guarda las preguntas
-- elegidas (ids y orden mezclado de A–D), las respuestas con su hora y, al terminar, el resumen.
create table if not exists public.rondas_activas (
  id           uuid        primary key,
  matricula    text        not null unique references public.jugadores (matricula)
                           on delete cascade on update cascade,
  aula         smallint    not null references public.aulas (numero),
  inicio       timestamptz not null,
  expira_en    timestamptz not null,
  preguntas    jsonb       not null,
  respuestas   jsonb       not null default '[]'::jsonb,
  terminada_en timestamptz,
  resumen      jsonb,
  check (jsonb_typeof(preguntas) = 'array' and jsonb_typeof(respuestas) = 'array')
);

alter table public.rondas_activas enable row level security;
revoke all on table public.rondas_activas from public, anon, authenticated;
drop policy if exists rondas_activas_sin_acceso_directo on public.rondas_activas;
create policy rondas_activas_sin_acceso_directo on public.rondas_activas
  for all to anon, authenticated using (false) with check (false);
grant select, insert, update, delete on table public.rondas_activas to service_role;

-- ¿El aula ya abrió? Con la hora de la BASE (la misma de estado_aulas()).
create or replace function public.aula_abierta(p_aula smallint)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select a.abre_en <= now() from public.aulas a where a.numero = p_aula), false)
$$;

-- Qué preguntas ya vio y cuáles tiene falladas el jugador en un aula (null si nunca jugó).
create or replace function public.progreso_para_ronda(p_matricula text, p_aula smallint)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object('vistas', to_jsonb(p.preguntas_vistas), 'falladas', to_jsonb(p.preguntas_falladas))
  from public.progreso_aula p
  where p.matricula = p_matricula and p.aula = p_aula
$$;

-- Empieza una ronda: borra la activa anterior de esa matrícula y guarda la nueva.
create or replace function public.crear_ronda_activa(
  p_id uuid, p_matricula text, p_aula smallint,
  p_inicio timestamptz, p_expira timestamptz, p_preguntas jsonb
)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  delete from public.rondas_activas where matricula = p_matricula;
  insert into public.rondas_activas (id, matricula, aula, inicio, expira_en, preguntas)
  values (p_id, p_matricula, p_aula, p_inicio, p_expira, p_preguntas);
end
$$;

-- Agrega la respuesta número `p_indice` SOLO si es la siguiente en orden y la ronda sigue abierta.
-- Devuelve false si otra llamada se adelantó (así una pregunta no se contesta dos veces).
create or replace function public.registrar_respuesta(p_id uuid, p_indice integer, p_registro jsonb)
returns boolean
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  update public.rondas_activas
     set respuestas = respuestas || jsonb_build_array(p_registro)
   where id = p_id
     and terminada_en is null
     and jsonb_array_length(respuestas) = p_indice;
  return found;
end
$$;

-- Lo que la función necesita saber para calificar: fecha y semana de hoy (CDMX), racha de días,
-- insignias, récord anterior del aula y el mejor número de aciertos por aula (de rondas ya guardadas).
create or replace function public.contexto_cierre(p_matricula text, p_aula smallint)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'hoy',               (now() at time zone 'America/Mexico_City')::date,
    'semana',            public.semana_cdmx(),
    'racha_dias',        j.racha_dias,
    'ultimo_dia_jugado', j.ultimo_dia_jugado,
    'insignias',         to_jsonb(j.insignias),
    'record_anterior',   coalesce((select p.record from public.progreso_aula p
                                    where p.matricula = j.matricula and p.aula = p_aula), 0),
    'mejores_aciertos',  coalesce((select jsonb_object_agg(t.aula::text, t.mejor)
                                     from (select r.aula, max(r.aciertos) as mejor
                                             from public.rondas r
                                            where r.matricula = j.matricula
                                            group by r.aula) t), '{}'::jsonb)
  )
  from public.jugadores j
  where j.matricula = p_matricula
$$;

-- Guarda una ronda terminada, TODO en una sola transacción: marca la activa como terminada,
-- inserta en `rondas`, actualiza progreso_aula (récord, última ronda, vistas y falladas), el jugador
-- (récord total, racha de días, insignias) y el puntaje semanal (solo semanas 1 a 6).
create or replace function public.guardar_ronda_terminada(
  p_activa_id uuid, p_matricula text, p_aula smallint,
  p_inicio timestamptz, p_fin timestamptz, p_semana date, p_hoy date,
  p_puntaje integer, p_aciertos integer, p_tiempo_promedio_ms integer,
  p_respuestas jsonb, p_acertadas text[], p_falladas text[],
  p_insignias text[], p_racha_dias integer, p_resumen jsonb
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_cuenta boolean := public.semana_cuenta_para_salon(p_semana);
begin
  -- El resumen guardado (para repetir `terminar` sin recalcular) incluye si la ronda cuenta para el Salón.
  update public.rondas_activas
     set terminada_en = now(),
         resumen = p_resumen || jsonb_build_object('salon', jsonb_build_object('cuenta', v_cuenta, 'semana', p_semana))
   where id = p_activa_id and matricula = p_matricula and terminada_en is null;
  if not found then
    raise exception 'ronda_no_encontrada';
  end if;

  insert into public.rondas
    (matricula, aula, puntaje, aciertos, tiempo_promedio_ms, inicio, fin, semana, respuestas)
  values
    (p_matricula, p_aula, p_puntaje, p_aciertos, p_tiempo_promedio_ms, p_inicio, p_fin, p_semana, p_respuestas);

  insert into public.progreso_aula as p
    (matricula, aula, ultimo_puntaje, record, rondas_jugadas, preguntas_vistas, preguntas_falladas)
  values
    (p_matricula, p_aula, p_puntaje, p_puntaje, 1, p_acertadas || p_falladas, p_falladas)
  on conflict (matricula, aula) do update
    set ultimo_puntaje     = excluded.ultimo_puntaje,
        record             = greatest(p.record, excluded.record),
        rondas_jugadas     = p.rondas_jugadas + 1,
        preguntas_vistas   = array(select distinct x
                                     from unnest(p.preguntas_vistas || p_acertadas || p_falladas) as x),
        -- Fallada = su última respuesta fue incorrecta o sin contestar; si ahora la acierta, sale de la lista.
        preguntas_falladas = array(select x from unnest(p.preguntas_falladas) as x
                                    where x <> all (p_acertadas) and x <> all (p_falladas)) || p_falladas,
        actualizado_en     = now();

  update public.jugadores j
     set record_total      = public.record_total_de(j.matricula),   -- Sesión 6: suma también la mejor guardia
         racha_dias        = p_racha_dias,
         ultimo_dia_jugado = p_hoy,
         insignias         = array(select u.x
                                     from unnest(j.insignias || p_insignias) with ordinality as u(x, n)
                                    group by u.x
                                    order by min(u.n))
   where j.matricula = p_matricula;

  if v_cuenta then
    perform public.recalcular_puntaje_semanal(p_matricula, p_semana);
  end if;

  return jsonb_build_object('jugador', public._jugador_json(p_matricula), 'cuenta_salon', v_cuenta);
end
$$;

-- Permisos: solo el servidor (clave secreta). Ni anon ni authenticated.
revoke execute on function
  public.semana_cuenta_para_salon(date),
  public.aula_abierta(smallint),
  public.progreso_para_ronda(text, smallint),
  public.crear_ronda_activa(uuid, text, smallint, timestamptz, timestamptz, jsonb),
  public.registrar_respuesta(uuid, integer, jsonb),
  public.contexto_cierre(text, smallint),
  public.guardar_ronda_terminada(uuid, text, smallint, timestamptz, timestamptz, date, date,
                                 integer, integer, integer, jsonb, text[], text[], text[], integer, jsonb)
from public, anon, authenticated;

grant execute on function
  public._jugador_json(text),
  public.semana_cuenta_para_salon(date),
  public.aula_abierta(smallint),
  public.progreso_para_ronda(text, smallint),
  public.crear_ronda_activa(uuid, text, smallint, timestamptz, timestamptz, jsonb),
  public.registrar_respuesta(uuid, integer, jsonb),
  public.contexto_cierre(text, smallint),
  public.guardar_ronda_terminada(uuid, text, smallint, timestamptz, timestamptz, date, date,
                                 integer, integer, integer, jsonb, text[], text[], text[], integer, jsonb)
to service_role;

-- 8. SALÓN DE LA FAMA Y CONTROL ESCOLAR (Sesión 5) --------------------------------
-- Las lee el navegador (anon). Solo devuelven nombre y matrícula OCULTA (••••4521) de otros jugadores;
-- el detalle completo de resultados (por aula y por tema) solo se devuelve para la matrícula que se pide.

-- Todo el Salón en una llamada y con la hora del SERVIDOR: la semana mostrada, las semanas disponibles,
-- el Top 10, la posición del jugador y los ganadores de las semanas ya terminadas.
-- Antes del lunes 19 oct devuelve { estado: 'antes' }; después de la semana 6 se queda en la última.
create or replace function public.salon_de_la_fama(p_matricula text, p_semana date default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_mat    text := public.normalizar_matricula(p_matricula);
  v_hoy    date := public.semana_cdmx();
  v_primer date := public.salon_primer_lunes();
  v_ultimo date := public.salon_ultimo_lunes();
  v_actual date;
  v_semana date;
begin
  if v_hoy < v_primer then
    return jsonb_build_object('estado', 'antes', 'primer_lunes', v_primer);
  end if;

  v_actual := least(v_hoy, v_ultimo);
  -- Se pide una semana: se lleva al lunes que le toca y se mantiene entre la semana 1 y la actual.
  v_semana := least(greatest(date_trunc('week', coalesce(p_semana, v_actual))::date, v_primer), v_actual);

  return jsonb_build_object(
    'estado',        'activo',
    'semana',        v_semana,
    'semana_actual', v_actual,
    'semanas',       (select jsonb_agg(d::date order by d) from generate_series(v_primer, v_actual, interval '7 days') d),
    'jugadores',     (select count(*)::int from public.puntaje_semanal s where s.semana = v_semana and s.puntaje > 0),
    'top10',         coalesce((
      select jsonb_agg(jsonb_build_object(
               'posicion', r.pos, 'nombre', r.nombre, 'matricula_oculta', r.mo,
               'puntaje', r.puntaje, 'es_tuyo', r.matricula = v_mat) order by r.pos)
      from (
        select (row_number() over (order by s.puntaje desc, s.alcanzado_en asc))::int as pos,
               j.nombre, public.enmascarar_matricula(j.matricula) as mo, s.puntaje, s.matricula
          from public.puntaje_semanal s
          join public.jugadores j on j.matricula = s.matricula
         where s.semana = v_semana and s.puntaje > 0
         order by 1
         limit 10
      ) r), '[]'::jsonb),
    'mi_posicion',   (
      select jsonb_build_object('posicion', t.pos, 'puntaje', t.puntaje)
        from (select s.matricula, s.puntaje,
                     (row_number() over (order by s.puntaje desc, s.alcanzado_en asc))::int as pos
                from public.puntaje_semanal s
               where s.semana = v_semana and s.puntaje > 0) t
       where t.matricula = v_mat),
    'ganadores',     coalesce((
      select jsonb_agg(jsonb_build_object(
               'semana', g.semana, 'nombre', g.nombre, 'matricula_oculta', g.mo,
               'puntaje', g.puntaje, 'es_tuyo', g.matricula = v_mat) order by g.semana)
      from (
        select distinct on (s.semana) s.semana, j.nombre,
               public.enmascarar_matricula(j.matricula) as mo, s.puntaje, s.matricula
          from public.puntaje_semanal s
          join public.jugadores j on j.matricula = s.matricula
         where s.puntaje > 0 and (s.semana < v_actual or v_hoy > v_ultimo)
         order by s.semana, s.puntaje desc, s.alcanzado_en asc
      ) g), '[]'::jsonb)
  );
end
$$;

-- Control Escolar de UN jugador: récord total, racha, insignias, resultados por aula y por tema
-- (de las respuestas de todas sus rondas). Devuelve null si la matrícula no existe.
create or replace function public.control_escolar(p_matricula text)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_mat text := public.normalizar_matricula(p_matricula);
begin
  if v_mat !~ '^[a-z0-9]{7,10}$' or v_mat !~ '[0-9]' then
    raise exception 'matricula_invalida' using errcode = '22023';
  end if;

  return (
    select jsonb_build_object(
      'nombre',       j.nombre,
      'record_total', j.record_total,
      'racha_dias',   j.racha_dias,
      'insignias',    to_jsonb(j.insignias),
      'rondas',       (select count(*)::int from public.rondas r where r.matricula = j.matricula),
      'por_aula',     coalesce((
        select jsonb_agg(jsonb_build_object(
                 'aula', p.aula, 'record', p.record, 'ultimo_puntaje', p.ultimo_puntaje,
                 'rondas_jugadas', p.rondas_jugadas,
                 'mejores_aciertos', coalesce((select max(r.aciertos) from public.rondas r
                                                where r.matricula = j.matricula and r.aula = p.aula), 0))
               order by p.aula)
          from public.progreso_aula p
         where p.matricula = j.matricula), '[]'::jsonb),
      'por_tema',     coalesce((
        select jsonb_agg(jsonb_build_object(
                 'aula', t.aula, 'tema', t.tema, 'aciertos', t.aciertos, 'total', t.total)
               order by t.aula, t.tema)
          from (select r.aula, e ->> 'tema' as tema,
                       (count(*) filter (where (e ->> 'acierto')::boolean))::int as aciertos,
                       count(*)::int as total
                  from public.rondas r
                 cross join lateral jsonb_array_elements(r.respuestas) as e
                 where r.matricula = j.matricula and e ? 'tema'
                 group by r.aula, e ->> 'tema') t), '[]'::jsonb)
    )
    from public.jugadores j
    where j.matricula = v_mat
  );
end
$$;

revoke execute on function
  public.salon_primer_lunes(),
  public.salon_ultimo_lunes(),
  public.salon_de_la_fama(text, date),
  public.control_escolar(text)
from public, anon, authenticated;

grant execute on function
  public.salon_de_la_fama(text, date),
  public.control_escolar(text)
to anon, authenticated;

grant execute on function public.salon_primer_lunes(), public.salon_ultimo_lunes() to service_role;

-- 9. LA CLÍNICA (Sesión 6) ---------------------------------------------------------
-- Guardias de 5 casos clínicos. Las usa SOLO la Edge Function `rondas` (acciones guardia_* y expedientes) con la clave
-- secreta (service_role). El navegador no puede leer ni escribir estas tablas ni ejecutar estas funciones.
--
-- Récord total = suma del récord de las 6 aulas (máx. 4,900 cada una) + la MEJOR guardia (máx. 3,500) = 32,900.
-- Puntaje semanal = mejor ronda de cada aula de la semana + mejor guardia de la semana (ver recalcular_puntaje_semanal).

-- Récord total de un jugador: sus 6 récords de aula + su mejor guardia.
create or replace function public.record_total_de(p_matricula text)
returns integer
language sql stable security definer
set search_path = ''
as $$
  select (coalesce((select sum(pa.record) from public.progreso_aula pa where pa.matricula = p_matricula), 0)
        + coalesce((select max(g.puntaje)  from public.guardias g       where g.matricula  = p_matricula), 0))::integer
$$;

-- Guardia en curso: una por matrícula (empezar otra anula la anterior). `casos` guarda los 5 casos elegidos con el orden
-- mezclado de las opciones y el avance de cada uno (exploraciones, pistas, intentos). `version` evita que dos
-- llamadas a la vez se pisen.
create table if not exists public.guardias_activas (
  id           uuid        primary key,
  matricula    text        not null unique references public.jugadores (matricula)
                           on delete cascade on update cascade,
  inicio       timestamptz not null,
  expira_en    timestamptz not null,
  casos        jsonb       not null,
  actual       smallint    not null default 0,
  version      integer     not null default 0,
  terminada_en timestamptz,
  resumen      jsonb,
  check (jsonb_typeof(casos) = 'array')
);

alter table public.guardias_activas enable row level security;
revoke all on table public.guardias_activas from public, anon, authenticated;
drop policy if exists guardias_activas_sin_acceso_directo on public.guardias_activas;
create policy guardias_activas_sin_acceso_directo on public.guardias_activas
  for all to anon, authenticated using (false) with check (false);
grant select, insert, update, delete on table public.guardias_activas to service_role;

-- Empieza una guardia: borra la activa anterior de esa matrícula y guarda la nueva.
create or replace function public.crear_guardia_activa(
  p_id uuid, p_matricula text, p_inicio timestamptz, p_expira timestamptz, p_casos jsonb
)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  delete from public.guardias_activas where matricula = p_matricula;
  insert into public.guardias_activas (id, matricula, inicio, expira_en, casos)
  values (p_id, p_matricula, p_inicio, p_expira, p_casos);
end
$$;

-- Guarda el avance SOLO si nadie se adelantó (misma versión) y la guardia sigue abierta. Devuelve false si hubo choque.
create or replace function public.actualizar_guardia(p_id uuid, p_version integer, p_casos jsonb, p_actual integer)
returns boolean
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  update public.guardias_activas
     set casos = p_casos, actual = p_actual, version = version + 1
   where id = p_id and version = p_version and terminada_en is null;
  return found;
end
$$;

-- Lo que la función necesita para armar y calificar una guardia: fecha y semana de hoy (CDMX), racha de días, insignias,
-- mejor guardia, cuántas guardias lleva y qué casos ya resolvió (sus expedientes).
create or replace function public.contexto_clinica(p_matricula text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'hoy',                 (now() at time zone 'America/Mexico_City')::date,
    'semana',              public.semana_cdmx(),
    'racha_dias',          j.racha_dias,
    'ultimo_dia_jugado',   j.ultimo_dia_jugado,
    'insignias',           to_jsonb(j.insignias),
    'mejor_guardia',       coalesce((select max(g.puntaje) from public.guardias g where g.matricula = j.matricula), 0),
    'guardias_terminadas', (select count(*)::int from public.guardias g where g.matricula = j.matricula),
    'archivados',          coalesce((select jsonb_agg(e.caso_id order by e.caso_id)
                                       from public.expedientes e where e.matricula = j.matricula), '[]'::jsonb)
  )
  from public.jugadores j
  where j.matricula = p_matricula
$$;

-- Guarda una guardia terminada, TODO en una sola transacción: marca la activa como terminada, inserta en `guardias`,
-- archiva los expedientes, actualiza al jugador (récord total, racha de días, insignias) y el puntaje semanal
-- (solo semanas 1 a 6, igual que las rondas).
create or replace function public.guardar_guardia_terminada(
  p_activa_id uuid, p_matricula text, p_inicio timestamptz, p_fin timestamptz, p_semana date, p_hoy date,
  p_puntaje integer, p_casos jsonb, p_expedientes jsonb, p_insignias text[], p_racha_dias integer, p_resumen jsonb
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_cuenta boolean := public.semana_cuenta_para_salon(p_semana);
begin
  update public.guardias_activas
     set terminada_en = now(),
         resumen = p_resumen || jsonb_build_object('salon', jsonb_build_object('cuenta', v_cuenta, 'semana', p_semana))
   where id = p_activa_id and matricula = p_matricula and terminada_en is null;
  if not found then
    raise exception 'guardia_no_encontrada';
  end if;

  insert into public.guardias (matricula, puntaje, casos, inicio, fin, semana)
  values (p_matricula, p_puntaje, p_casos, p_inicio, p_fin, p_semana);

  -- Un expediente se archiva una sola vez; si se resuelve otra vez solo sube su mejor puntaje.
  insert into public.expedientes as ex (matricula, caso_id, puntos)
  select p_matricula, x.e ->> 'caso_id', (x.e ->> 'puntos')::integer
    from jsonb_array_elements(p_expedientes) as x(e)
  on conflict (matricula, caso_id) do update
    set puntos = greatest(ex.puntos, excluded.puntos);

  update public.jugadores j
     set record_total      = public.record_total_de(j.matricula),
         racha_dias        = p_racha_dias,
         ultimo_dia_jugado = p_hoy,
         insignias         = array(select u.x
                                     from unnest(j.insignias || p_insignias) with ordinality as u(x, n)
                                    group by u.x
                                    order by min(u.n))
   where j.matricula = p_matricula;

  if v_cuenta then
    perform public.recalcular_puntaje_semanal(p_matricula, p_semana);
  end if;

  return jsonb_build_object('jugador', public._jugador_json(p_matricula), 'cuenta_salon', v_cuenta);
end
$$;

-- Los casos que el jugador ya resolvió (el contenido lo pone la función, desde contenido/casos/).
create or replace function public.expedientes_de(p_matricula text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('caso_id', e.caso_id, 'puntos', e.puntos, 'resuelto_en', e.resuelto_en)
                            order by e.resuelto_en desc), '[]'::jsonb)
  from public.expedientes e
  where e.matricula = p_matricula
$$;

-- Permisos: solo el servidor (clave secreta). Ni anon ni authenticated.
revoke execute on function
  public.record_total_de(text),
  public.crear_guardia_activa(uuid, text, timestamptz, timestamptz, jsonb),
  public.actualizar_guardia(uuid, integer, jsonb, integer),
  public.contexto_clinica(text),
  public.guardar_guardia_terminada(uuid, text, timestamptz, timestamptz, date, date,
                                   integer, jsonb, jsonb, text[], integer, jsonb),
  public.expedientes_de(text)
from public, anon, authenticated;

grant execute on function
  public.record_total_de(text),
  public.crear_guardia_activa(uuid, text, timestamptz, timestamptz, jsonb),
  public.actualizar_guardia(uuid, integer, jsonb, integer),
  public.contexto_clinica(text),
  public.guardar_guardia_terminada(uuid, text, timestamptz, timestamptz, date, date,
                                   integer, jsonb, jsonb, text[], integer, jsonb),
  public.expedientes_de(text)
to service_role;


-- Que la API de Supabase detecte las funciones nuevas sin esperar.
notify pgrst, 'reload schema';
