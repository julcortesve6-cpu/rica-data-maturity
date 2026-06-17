import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SurveyBuilder from '@/components/admin/SurveyBuilder'

export default async function EditarEncuestaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: encuesta } = await supabase
    .from('encuestas')
    .select(`*, secciones(*, preguntas(*))`)
    .eq('id', id)
    .single()

  if (!encuesta) notFound()

  const secciones = (encuesta.secciones ?? [])
    .sort((a: any, b: any) => a.orden - b.orden)
    .map((s: any) => ({
      ...s,
      preguntas: (s.preguntas ?? []).sort((a: any, b: any) => a.orden - b.orden),
    }))

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <a href="/admin/dashboard" className="hover:text-[#003087]">Dashboard</a>
          <span>/</span>
          <span className="text-gray-600">{encuesta.titulo}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{encuesta.titulo}</h1>
        {encuesta.descripcion && (
          <p className="text-gray-500 text-sm mt-1">{encuesta.descripcion}</p>
        )}
      </div>

      <SurveyBuilder
        encuestaId={id}
        tokenPublico={encuesta.token_publico}
        seccionesIniciales={secciones}
        activa={encuesta.activa}
      />
    </div>
  )
}
