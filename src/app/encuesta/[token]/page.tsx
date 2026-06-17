import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EncuestaPublica from '@/components/survey/EncuestaPublica'

export default async function EncuestaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: encuesta } = await supabase
    .from('encuestas')
    .select(`*, secciones(*, preguntas(*))`)
    .eq('token_publico', token)
    .eq('activa', true)
    .single()

  if (!encuesta) notFound()

  const secciones = (encuesta.secciones ?? [])
    .sort((a: any, b: any) => a.orden - b.orden)
    .map((s: any) => ({
      ...s,
      preguntas: (s.preguntas ?? []).sort((a: any, b: any) => a.orden - b.orden),
    }))

  return (
    <EncuestaPublica
      encuestaId={encuesta.id}
      titulo={encuesta.titulo}
      descripcion={encuesta.descripcion}
      secciones={secciones}
    />
  )
}
