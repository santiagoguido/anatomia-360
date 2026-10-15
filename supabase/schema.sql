-- =============================================================================
-- Anatomía 360 · Sesión 1 · Esquema de Supabase
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
--           (la mejor guardia de la Clínica se suma en la Sesión 6).
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

-- Se quita todo acceso directo a las tablas para anon / authenticated.
revoke all on table public.aulas, public.jugadores, public.progreso_aula,
                    public.rondas, public.puntaje_semanal
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
begin
  select coalesce(sum(t.mejor), 0)::integer, coalesce(sum(t.n), 0)::integer
    into v_puntaje, v_rondas
  from (
    select max(r.puntaje) as mejor, count(*) as n
    from public.rondas r
    where r.matricula = p_matricula and r.semana = p_semana
    group by r.aula
  ) t;

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

-- Que la API de Supabase detecte las funciones nuevas sin esperar.
notify pgrst, 'reload schema';
