'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { nanoid } from 'nanoid'
import type { Seccion, Pregunta } from '@/types'

const opt = (vals: string[]) =>
  vals.map(v => ({ valor: v, etiqueta: v, pide_justificacion: false }))

const DATOS_SECTION_TITULO = 'Datos de quien diligencia'

const DATOS_PREGUNTAS = [
  {
    texto: 'Dirección',
    tipo: 'opcion_multiple' as const,
    requerida: true,
    orden: 0,
    ayuda: null,
    opciones_json: opt([
      'Finanzas', 'Comercial', 'Extensión y Acopio', 'Logística',
      'Compras', 'Calidad', 'Producción', 'Mantenimiento',
      'Exportaciones', 'Desarrollo corporativo', 'Tecnología',
    ]),
  },
  {
    texto: 'Rol',
    tipo: 'opcion_multiple' as const,
    requerida: true,
    orden: 1,
    ayuda: null,
    opciones_json: opt(['Director', 'Gerente', 'Coordinador', 'Ciudadano de Datos', 'Apoyo']),
  },
]

async function insertarSeccionDatos(encuestaId: string) {
  const adminClient = createAdminClient()
  const { data: sec } = await adminClient
    .from('secciones')
    .insert({ encuesta_id: encuestaId, titulo: DATOS_SECTION_TITULO, descripcion: null, orden: 0 })
    .select()
    .single()
  if (sec) {
    await adminClient.from('preguntas').insert(
      DATOS_PREGUNTAS.map(p => ({ ...p, seccion_id: sec.id }))
    )
  }
}

export async function crearEncuesta(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const titulo = formData.get('titulo') as string
  const descripcion = formData.get('descripcion') as string
  const token_publico = nanoid(12)

  const categoria = formData.get('categoria') as string | null

  const { data, error } = await supabase
    .from('encuestas')
    .insert({ titulo, descripcion, token_publico, creado_por: user.id, categoria: categoria || null })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await insertarSeccionDatos(data.id)

  redirect(`/admin/encuestas/${data.id}`)
}

export async function guardarEstructuraEncuesta(
  encuestaId: string,
  secciones: (Omit<Seccion, 'encuesta_id'> & { preguntas: Omit<Pregunta, 'seccion_id'>[] })[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const adminClient = createAdminClient()

  // Eliminar secciones existentes (cascade elimina preguntas)
  await adminClient.from('secciones').delete().eq('encuesta_id', encuestaId)

  // Re-insertar siempre la sección de datos demográficos en orden 0
  await insertarSeccionDatos(encuestaId)

  // Filtrar la sección de datos demográficos para no duplicarla
  const seccionesSinDatos = secciones.filter((s: any) => s.titulo !== DATOS_SECTION_TITULO)

  // Insertar secciones del survey empezando en orden 1
  for (const [i, seccion] of seccionesSinDatos.entries()) {
    const { data: seccionData, error: secErr } = await adminClient
      .from('secciones')
      .insert({
        encuesta_id: encuestaId,
        titulo: seccion.titulo,
        descripcion: seccion.descripcion,
        orden: i + 1,
      })
      .select()
      .single()

    if (secErr) throw new Error(secErr.message)

    if (seccion.preguntas?.length) {
      const preguntas = seccion.preguntas.map((p, idx) => ({
        seccion_id: seccionData.id,
        texto: p.texto,
        ayuda: p.ayuda,
        tipo: p.tipo,
        opciones_json: p.opciones_json,
        requerida: p.requerida,
        orden: idx,
      }))
      const { error: pErr } = await adminClient.from('preguntas').insert(preguntas)
      if (pErr) throw new Error(pErr.message)
    }
  }

  revalidatePath(`/admin/encuestas/${encuestaId}`)
}

export async function toggleEncuestaActiva(encuestaId: string, activa: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  await supabase.from('encuestas').update({ activa }).eq('id', encuestaId)
  revalidatePath('/admin/dashboard')
  revalidatePath(`/admin/encuestas/${encuestaId}`)
}

export async function reiniciarEncuesta(encuestaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('respuestas_empleado')
    .delete()
    .eq('encuesta_id', encuestaId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/encuestas/${encuestaId}/resultados`)
  revalidatePath(`/admin/encuestas/${encuestaId}`)
  return { success: true }
}

export async function actualizarCategoria(encuestaId: string, categoria: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  const { error } = await supabase.from('encuestas').update({ categoria }).eq('id', encuestaId)
  if (error) return { error: error.message }
  revalidatePath('/admin/dashboard')
  revalidatePath(`/admin/encuestas/${encuestaId}`)
  revalidatePath('/admin/analisis')
  return { success: true }
}

export async function crearEncuestaDesdeImport(
  titulo: string,
  descripcion: string,
  secciones: any[],
  categoria?: string | null
): Promise<{ error?: string; id?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const token_publico = nanoid(12)
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('encuestas')
      .insert({ titulo: titulo.trim(), descripcion: descripcion.trim() || null, token_publico, creado_por: user.id, categoria: categoria || null })
      .select()
      .single()

    if (error) return { error: error.message }

    // Sección de datos demográficos siempre en orden 0
    await insertarSeccionDatos(data.id)

    // Secciones importadas a partir del orden 1
    for (const [i, seccion] of secciones.entries()) {
      const { data: secData, error: secErr } = await adminClient
        .from('secciones')
        .insert({
          encuesta_id: data.id,
          titulo: seccion.titulo,
          descripcion: seccion.descripcion ?? null,
          orden: i + 1,
        })
        .select()
        .single()

      if (secErr) return { error: secErr.message }

      if (seccion.preguntas?.length) {
        const { error: pErr } = await adminClient.from('preguntas').insert(
          seccion.preguntas.map((p: any, idx: number) => ({
            seccion_id: secData.id,
            texto: p.texto,
            ayuda: p.ayuda ?? null,
            tipo: p.tipo,
            opciones_json: p.opciones_json ?? null,
            requerida: p.requerida ?? true,
            orden: idx,
          }))
        )
        if (pErr) return { error: pErr.message }
      }
    }

    revalidatePath('/admin/dashboard')
    return { id: data.id }
  } catch (err: any) {
    return { error: err?.message ?? 'Error inesperado al importar la encuesta.' }
  }
}

export async function eliminarEncuesta(encuestaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  await supabase.from('encuestas').delete().eq('id', encuestaId)
  revalidatePath('/admin/dashboard')
  redirect('/admin/dashboard')
}
