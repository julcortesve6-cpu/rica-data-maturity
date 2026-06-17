import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ResultadosView from '@/components/admin/ResultadosView'

export default async function ResultadosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: encuesta } = await supabase
    .from('encuestas')
    .select(`
      *,
      secciones(*, preguntas(*)),
      respuestas_empleado(*, respuestas_detalle(*))
    `)
    .eq('id', id)
    .single()

  if (!encuesta) notFound()

  const secciones = (encuesta.secciones ?? [])
    .sort((a: any, b: any) => a.orden - b.orden)
    .map((s: any) => ({
      ...s,
      preguntas: (s.preguntas ?? []).sort((a: any, b: any) => a.orden - b.orden),
    }))

  const respuestas = (encuesta.respuestas_empleado ?? [])
    .filter((r: any) => r.completada)
    .sort((a: any, b: any) => new Date(b.fecha_respuesta).getTime() - new Date(a.fecha_respuesta).getTime())

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <a href="/admin/dashboard" className="hover:text-[#003087]">Dashboard</a>
          <span>/</span>
          <a href={`/admin/encuestas/${id}`} className="hover:text-[#003087]">{encuesta.titulo}</a>
          <span>/</span>
          <span className="text-gray-600">Resultados</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Resultados</h1>
        <p className="text-gray-500 text-sm mt-1">{encuesta.titulo}</p>
      </div>

      <ResultadosView
        encuestaId={id}
        secciones={secciones}
        respuestas={respuestas}
        analisisExistente={encuesta.analisis_ia}
      />
    </div>
  )
}
