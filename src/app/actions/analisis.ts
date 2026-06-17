'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { revalidatePath } from 'next/cache'

const clean = (s: string) => (s ?? '').replace(/[^\x20-\x7E]/g, '').trim()

export async function generarAnalisis(encuestaId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const adminClient = createAdminClient()

    const { data: encuesta, error: errEnc } = await adminClient
      .from('encuestas')
      .select(`
        titulo, descripcion,
        secciones(titulo, descripcion, orden,
          preguntas(id, texto, tipo, opciones_json, orden)
        )
      `)
      .eq('id', encuestaId)
      .single()

    if (errEnc || !encuesta) return { error: 'No se encontró la encuesta.' }

    const { data: respuestas, error: errResp } = await adminClient
      .from('respuestas_empleado')
      .select(`
        nombre_empleado, codigo_empleado, fecha_respuesta,
        respuestas_detalle(pregunta_id, valor_seleccionado, texto_justificacion)
      `)
      .eq('encuesta_id', encuestaId)
      .eq('completada', true)

    if (errResp) return { error: 'Error al cargar las respuestas.' }
    if (!respuestas || respuestas.length === 0) return { error: 'No hay respuestas suficientes para generar el análisis.' }

    const resumenPorPregunta: Record<string, { conteos: Record<string, number>; justificaciones: string[] }> = {}
    for (const r of respuestas) {
      for (const d of (r.respuestas_detalle ?? []) as any[]) {
        if (!resumenPorPregunta[d.pregunta_id]) {
          resumenPorPregunta[d.pregunta_id] = { conteos: {}, justificaciones: [] }
        }
        if (d.valor_seleccionado) {
          resumenPorPregunta[d.pregunta_id].conteos[d.valor_seleccionado] =
            (resumenPorPregunta[d.pregunta_id].conteos[d.valor_seleccionado] ?? 0) + 1
        }
        if (d.texto_justificacion?.trim()) {
          resumenPorPregunta[d.pregunta_id].justificaciones.push(d.texto_justificacion.trim())
        }
      }
    }

    const prompt = buildPrompt(encuesta, respuestas.length, resumenPorPregunta)

    const apiKey = clean(process.env.ANTHROPIC_API_KEY ?? '')
    if (!apiKey) return { error: 'API key de IA no configurada.' }

    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      system: `Eres un experto consultor en gobierno de datos, analítica empresarial y transformación digital con más de 15 años de experiencia.
Trabajas para Grupo Rica en República Dominicana, una empresa del sector alimentario.
Tu rol es analizar los resultados de encuestas de madurez de datos y generar informes ejecutivos detallados, precisos y accionables.
Responde siempre en español, con un tono profesional pero accesible.
Estructura tu respuesta en secciones claramente delimitadas con encabezados Markdown (##, ###).
Sé específico, usa los datos reales de las respuestas para fundamentar tus conclusiones.`,
    })

    const analisisTexto = message.content[0].type === 'text' ? message.content[0].text : ''

    await adminClient
      .from('encuestas')
      .update({ analisis_ia: analisisTexto })
      .eq('id', encuestaId)

    revalidatePath(`/admin/encuestas/${encuestaId}/resultados`)
    return { success: true, analisis: analisisTexto }

  } catch (err: any) {
    console.error('[generarAnalisis]', err)
    const msg: string = err?.message ?? ''
    if (msg.includes('credit') || msg.includes('saldo') || err?.status === 400) {
      return { error: 'Saldo insuficiente en la cuenta de IA. Recarga créditos en console.anthropic.com → Billing.' }
    }
    if (err?.status === 401 || msg.includes('API key')) {
      return { error: 'API key de IA inválida o no configurada. Verifica las variables de entorno.' }
    }
    if (err?.status === 529 || msg.includes('overloaded')) {
      return { error: 'El servicio de IA está sobrecargado. Intenta de nuevo en unos minutos.' }
    }
    return { error: 'Error al generar el análisis. Intenta de nuevo.' }
  }
}

function buildPrompt(
  encuesta: any,
  totalRespondentes: number,
  resumen: Record<string, { conteos: Record<string, number>; justificaciones: string[] }>
): string {
  const secciones = (encuesta.secciones ?? []).sort((a: any, b: any) => a.orden - b.orden)

  let prompt = `# Análisis de Encuesta: "${encuesta.titulo}"

**Total de respondentes:** ${totalRespondentes}
${encuesta.descripcion ? `**Descripción:** ${encuesta.descripcion}` : ''}

## Datos de respuestas por sección y pregunta:

`
  for (const seccion of secciones) {
    prompt += `### ${seccion.titulo}\n`
    if (seccion.descripcion) prompt += `${seccion.descripcion}\n`
    prompt += '\n'

    const preguntas = (seccion.preguntas ?? []).sort((a: any, b: any) => a.orden - b.orden)
    for (const pregunta of preguntas) {
      const r = resumen[pregunta.id]
      if (!r) continue
      prompt += `**Pregunta:** ${pregunta.texto}\n`
      if (Object.keys(r.conteos).length > 0) {
        prompt += 'Distribución de respuestas:\n'
        for (const [opcion, count] of Object.entries(r.conteos)) {
          const pct = Math.round((count / totalRespondentes) * 100)
          prompt += `  - ${opcion}: ${count} (${pct}%)\n`
        }
      }
      if (r.justificaciones.length > 0) {
        prompt += 'Justificaciones de los empleados:\n'
        r.justificaciones.slice(0, 5).forEach(j => { prompt += `  - "${j}"\n` })
      }
      prompt += '\n'
    }
  }

  prompt += `
## Instrucciones para el análisis:

Por favor genera un informe ejecutivo completo que incluya:

1. **Resumen ejecutivo** — Diagnóstico general del nivel de madurez de datos (máx. 3 párrafos)

2. **Nivel de madurez global** — Puntuación 1-4 (1=Inicial, 2=En desarrollo, 3=Definido, 4=Gestionado) con justificación

3. **Análisis por dimensión** — Para cada sección:
   - Puntaje de madurez (1-4)
   - Diagnóstico basado en las respuestas
   - Fortalezas encontradas
   - Brechas críticas

4. **Hallazgos más relevantes** — Los 5 hallazgos más importantes con su evidencia

5. **Plan de acción recomendado** — Mínimo 8 recomendaciones priorizadas (Alta/Media/Baja)

6. **Próximos pasos** — 3-5 acciones concretas para los próximos 90 días

Fundamenta todas las conclusiones en los datos reales. Usa ejemplos de las justificaciones cuando sea relevante.
`
  return prompt
}
