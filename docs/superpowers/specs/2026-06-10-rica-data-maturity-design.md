# Rica Data Maturity — Design Spec
**Fecha:** 2026-06-10  
**Cliente:** Grupo Rica, República Dominicana  
**Proyecto:** Plataforma de evaluación de madurez de datos y cultura data-driven

---

## Objetivo
Plataforma web que permite a administradores crear encuestas de madurez de datos personalizadas, compartirlas con empleados vía link único, y obtener análisis experto generado por IA (Claude) sobre los resultados consolidados.

---

## Stack
- **Frontend/Backend:** Next.js 15 (App Router) + TypeScript
- **Base de datos + Auth:** Supabase (free tier) — PostgreSQL + Row Level Security
- **IA:** Claude API (`claude-sonnet-4-6`) — análisis narrativo experto
- **UI:** Tailwind CSS + shadcn/ui
- **Hosting:** Vercel (free tier)
- **Cuentas:** Corporativas nuevas (Supabase + Vercel + Anthropic)
- **Identidad visual:** Rica (#E31837 rojo, #003087 azul) + RicaInsights

---

## Modelo de Datos

```sql
-- Administradores (manejados por Supabase Auth)
-- email + password via auth.users

-- Encuestas
encuestas (
  id uuid PK,
  titulo text NOT NULL,
  descripcion text,
  token_publico text UNIQUE NOT NULL,  -- slug para el link
  creado_por uuid REFERENCES auth.users,
  activa boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now()
)

-- Secciones de la encuesta
secciones (
  id uuid PK,
  encuesta_id uuid REFERENCES encuestas ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  orden int NOT NULL
)

-- Preguntas
preguntas (
  id uuid PK,
  seccion_id uuid REFERENCES secciones ON DELETE CASCADE,
  texto text NOT NULL,
  ayuda text,                          -- texto de guía/contexto
  tipo text NOT NULL,                  -- 'escala_ad' | 'texto_libre' | 'opcion_multiple'
  opciones_json jsonb,                 -- [{label, valor, pide_justificacion}]
  requerida boolean DEFAULT true,
  orden int NOT NULL
)

-- Respuesta por empleado (una por encuesta)
respuestas_empleado (
  id uuid PK,
  encuesta_id uuid REFERENCES encuestas,
  nombre_empleado text NOT NULL,
  codigo_empleado text NOT NULL,
  completada boolean DEFAULT false,
  fecha_respuesta timestamptz,
  analisis_ia text,                    -- informe generado por Claude
  UNIQUE(encuesta_id, codigo_empleado) -- bloquea duplicados a nivel DB
)

-- Detalle de respuestas
respuestas_detalle (
  id uuid PK,
  respuesta_empleado_id uuid REFERENCES respuestas_empleado ON DELETE CASCADE,
  pregunta_id uuid REFERENCES preguntas,
  valor_seleccionado text,             -- 'A', 'B', 'C', 'D' o texto libre
  texto_justificacion text             -- activo cuando respuesta es C o D
)
```

---

## Módulos

### 1. Admin — Auth
- Login con email/password via Supabase Auth
- Rutas `/admin/*` protegidas por middleware Next.js
- Sin registro público (solo admin creado manualmente en Supabase)

### 2. Admin — Dashboard
- Lista de encuestas con: título, fecha, # respondentes, estado (activa/inactiva)
- Botón crear nueva encuesta
- Acceso a resultados por encuesta

### 3. Admin — Survey Builder
- Crear encuesta: título + descripción
- Agregar secciones (con título y descripción)
- Por sección, agregar preguntas:
  - Tipo `escala_ad`: 4 opciones A/B/C/D con labels personalizables, flag `pide_justificacion` por opción
  - Tipo `texto_libre`: campo de texto abierto
  - Tipo `opcion_multiple`: opciones personalizables (radio)
- Reordenar secciones y preguntas (drag or arrows)
- Preview de la encuesta antes de publicar
- Al publicar: genera `token_publico` → link copiable

### 4. Vista Empleado — `/encuesta/[token]`
- Pantalla bienvenida: logo RicaInsights, título encuesta, instrucciones
- Formulario: nombre completo + código de empleado
- Validación: consulta Supabase si el código ya respondió → error claro si duplicado
- Encuesta paginada por sección (progress bar)
- Justificación condicional: si respuesta es C o D, aparece campo de texto obligatorio
- Pantalla de cierre: agradecimiento + no permite volver atrás

### 5. Admin — Resultados
- Tabla de respondentes: nombre, código, área (si aplica), fecha, estado
- Métricas por sección (% de cada opción A/B/C/D)
- Botón "Generar análisis IA"
- El análisis se guarda en `encuestas.analisis_ia` y se muestra formateado

### 6. Análisis IA (Claude)
- Se invoca desde el admin con todas las respuestas consolidadas
- Prompt de sistema: rol de experto en gobierno de datos y transformación digital
- El informe incluye:
  - Diagnóstico general de madurez (puntuación global)
  - Análisis por dimensión/sección
  - Brechas críticas identificadas
  - Recomendaciones priorizadas
  - Próximos pasos sugeridos
- Respuesta almacenada en DB, renderizada con markdown

---

## Rutas Next.js

```
/                          → Redirect a /admin/login
/admin/login               → Formulario login
/admin/dashboard           → Lista de encuestas (protegida)
/admin/encuestas/nueva     → Crear encuesta
/admin/encuestas/[id]      → Editar encuesta
/admin/encuestas/[id]/resultados → Ver respuestas + análisis IA
/encuesta/[token]          → Vista pública empleado
/api/encuestas             → CRUD encuestas
/api/respuestas            → Guardar respuestas empleado
/api/analisis              → Invocar Claude y guardar análisis
```

---

## Consideraciones
- RLS en Supabase: solo el admin autenticado puede leer respuestas
- El link público no requiere auth pero valida código único
- Free tier Supabase: 500MB DB, 50K MAU auth — suficiente para piloto
- Free tier Vercel: sin límite de deploys, suficiente para uso corporativo inicial
