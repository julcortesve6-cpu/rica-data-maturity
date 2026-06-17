'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { RespuestaDetalle } from '@/types'

export async function verificarRespuesta(encuestaId: string, codigoEmpleado: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('respuestas_empleado')
    .select('id, completada')
    .eq('encuesta_id', encuestaId)
    .eq('codigo_empleado', codigoEmpleado.trim().toUpperCase())
    .maybeSingle()

  return data
}

export async function guardarRespuestas(
  encuestaId: string,
  nombreEmpleado: string,
  codigoEmpleado: string,
  respuestas: RespuestaDetalle[]
) {
  const supabase = createAdminClient()
  const codigo = codigoEmpleado.trim().toUpperCase()

  // Verificar duplicado antes de insertar
  const { data: existente } = await supabase
    .from('respuestas_empleado')
    .select('id')
    .eq('encuesta_id', encuestaId)
    .eq('codigo_empleado', codigo)
    .maybeSingle()

  if (existente) {
    return { error: 'Este código de empleado ya respondió esta encuesta.' }
  }

  const { data: respuestaEmpleado, error: errEmp } = await supabase
    .from('respuestas_empleado')
    .insert({
      encuesta_id: encuestaId,
      nombre_empleado: nombreEmpleado.trim(),
      codigo_empleado: codigo,
      completada: true,
      fecha_respuesta: new Date().toISOString(),
    })
    .select()
    .single()

  if (errEmp) {
    if (errEmp.code === '23505') {
      return { error: 'Este código de empleado ya respondió esta encuesta.' }
    }
    return { error: 'Error al guardar la respuesta. Intenta de nuevo.' }
  }

  if (respuestas.length > 0) {
    const detalles = respuestas.map(r => ({
      respuesta_empleado_id: respuestaEmpleado.id,
      pregunta_id: r.pregunta_id,
      valor_seleccionado: r.valor_seleccionado,
      texto_justificacion: r.texto_justificacion,
    }))

    const { error: errDet } = await supabase.from('respuestas_detalle').insert(detalles)
    if (errDet) return { error: 'Error al guardar el detalle de respuestas.' }
  }

  return { success: true, id: respuestaEmpleado.id }
}
