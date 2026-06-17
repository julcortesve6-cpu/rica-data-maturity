-- =============================================
-- RicaInsights — Schema de base de datos
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Habilitar extensión UUID
create extension if not exists "pgcrypto";

-- =============================================
-- TABLA: encuestas
-- =============================================
create table public.encuestas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  token_publico text unique not null,
  creado_por uuid references auth.users(id) on delete cascade,
  activa boolean default true,
  analisis_ia text,
  fecha_creacion timestamptz default now()
);

-- =============================================
-- TABLA: secciones
-- =============================================
create table public.secciones (
  id uuid primary key default gen_random_uuid(),
  encuesta_id uuid references public.encuestas(id) on delete cascade not null,
  titulo text not null,
  descripcion text,
  orden int not null default 0
);

-- =============================================
-- TABLA: preguntas
-- =============================================
create table public.preguntas (
  id uuid primary key default gen_random_uuid(),
  seccion_id uuid references public.secciones(id) on delete cascade not null,
  texto text not null,
  ayuda text,
  tipo text not null check (tipo in ('escala_ad', 'texto_libre', 'opcion_multiple')),
  opciones_json jsonb,
  requerida boolean default true,
  orden int not null default 0
);

-- =============================================
-- TABLA: respuestas_empleado
-- =============================================
create table public.respuestas_empleado (
  id uuid primary key default gen_random_uuid(),
  encuesta_id uuid references public.encuestas(id) on delete cascade not null,
  nombre_empleado text not null,
  codigo_empleado text not null,
  completada boolean default false,
  fecha_respuesta timestamptz,
  analisis_ia text,
  -- Garantiza una sola respuesta por empleado por encuesta
  unique(encuesta_id, codigo_empleado)
);

-- =============================================
-- TABLA: respuestas_detalle
-- =============================================
create table public.respuestas_detalle (
  id uuid primary key default gen_random_uuid(),
  respuesta_empleado_id uuid references public.respuestas_empleado(id) on delete cascade not null,
  pregunta_id uuid references public.preguntas(id) on delete cascade not null,
  valor_seleccionado text,
  texto_justificacion text
);

-- =============================================
-- ÍNDICES para performance
-- =============================================
create index on public.secciones(encuesta_id);
create index on public.preguntas(seccion_id);
create index on public.respuestas_empleado(encuesta_id);
create index on public.respuestas_empleado(codigo_empleado);
create index on public.respuestas_detalle(respuesta_empleado_id);
create index on public.encuestas(token_publico);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas
alter table public.encuestas enable row level security;
alter table public.secciones enable row level security;
alter table public.preguntas enable row level security;
alter table public.respuestas_empleado enable row level security;
alter table public.respuestas_detalle enable row level security;

-- Encuestas: solo el admin autenticado puede gestionar
create policy "Admin puede gestionar sus encuestas"
  on public.encuestas for all
  using (auth.uid() = creado_por);

-- Encuestas: lectura pública para encuestas activas (para el link compartido)
create policy "Lectura pública de encuestas activas"
  on public.encuestas for select
  using (activa = true);

-- Secciones: admin puede gestionar, público puede leer si la encuesta está activa
create policy "Admin puede gestionar secciones"
  on public.secciones for all
  using (
    exists (
      select 1 from public.encuestas e
      where e.id = encuesta_id and e.creado_por = auth.uid()
    )
  );

create policy "Lectura pública de secciones"
  on public.secciones for select
  using (
    exists (
      select 1 from public.encuestas e
      where e.id = encuesta_id and e.activa = true
    )
  );

-- Preguntas: mismo patrón
create policy "Admin puede gestionar preguntas"
  on public.preguntas for all
  using (
    exists (
      select 1 from public.secciones s
      join public.encuestas e on e.id = s.encuesta_id
      where s.id = seccion_id and e.creado_por = auth.uid()
    )
  );

create policy "Lectura pública de preguntas"
  on public.preguntas for select
  using (
    exists (
      select 1 from public.secciones s
      join public.encuestas e on e.id = s.encuesta_id
      where s.id = seccion_id and e.activa = true
    )
  );

-- Respuestas: solo admin puede leer, cualquiera puede insertar (empleados sin cuenta)
create policy "Admin puede leer respuestas"
  on public.respuestas_empleado for select
  using (
    exists (
      select 1 from public.encuestas e
      where e.id = encuesta_id and e.creado_por = auth.uid()
    )
  );

create policy "Inserción pública de respuestas"
  on public.respuestas_empleado for insert
  with check (true);

-- Respuestas detalle
create policy "Admin puede leer detalles"
  on public.respuestas_detalle for select
  using (
    exists (
      select 1 from public.respuestas_empleado re
      join public.encuestas e on e.id = re.encuesta_id
      where re.id = respuesta_empleado_id and e.creado_por = auth.uid()
    )
  );

create policy "Inserción pública de detalles"
  on public.respuestas_detalle for insert
  with check (true);
