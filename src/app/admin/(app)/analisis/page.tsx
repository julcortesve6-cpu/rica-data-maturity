import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CATEGORIAS, getCategoriaStyle } from '@/lib/categorias'
import { BarChart3, Users, ClipboardList, TrendingUp, ExternalLink } from 'lucide-react'
import MigrationBanner from '@/components/admin/MigrationBanner'

export default async function AnalisisPage() {
  const supabase = await createClient()

  const { data: encuestas, error } = await supabase
    .from('encuestas')
    .select('*, respuestas_empleado(count)')
    .order('fecha_creacion', { ascending: false })

  const needsMigration = (error?.message?.toLowerCase().includes('categoria') ?? false)
    || (!!encuestas && encuestas.length > 0 && !('categoria' in (encuestas[0] as any)))

  const lista = ((encuestas ?? []) as any[]).map((e: any) => ({
    ...e,
    respuestas: e.respuestas_empleado?.[0]?.count ?? 0,
    categoria: e.categoria ?? null,
  }))

  // Agrupar por categoría
  const grupos = CATEGORIAS.map(cat => ({
    ...cat,
    encuestas: lista.filter(e => e.categoria === cat.value),
  }))

  const sinCategoria = lista.filter(e => !e.categoria)
  const totalRespuestas = lista.reduce((a, e) => a + e.respuestas, 0)
  const totalActivas = lista.filter(e => e.activa).length

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <MigrationBanner visible={needsMigration} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Análisis de resultados</h1>
        <p className="text-gray-500 text-sm mt-1">Vista consolidada por categoría de encuesta</p>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total encuestas" value={lista.length} icon={<ClipboardList className="w-5 h-5" />} color="blue" />
        <StatCard label="Encuestas activas" value={totalActivas} icon={<TrendingUp className="w-5 h-5" />} color="green" />
        <StatCard label="Total respuestas" value={totalRespuestas} icon={<Users className="w-5 h-5" />} color="red" />
        <StatCard label="Categorías" value={grupos.filter(g => g.encuestas.length > 0).length} icon={<BarChart3 className="w-5 h-5" />} color="gray" />
      </div>

      {/* Resumen por categoría */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {grupos.map(cat => (
          <div key={cat.value} className={`rounded-xl border p-4 ${cat.color}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cat.dot}`} />
              <p className="text-xs font-bold truncate">{cat.value}</p>
            </div>
            <p className="text-2xl font-bold mb-0.5">{cat.encuestas.length}</p>
            <p className="text-xs opacity-70">{cat.encuestas.reduce((a, e) => a + e.respuestas, 0)} respuestas</p>
          </div>
        ))}
      </div>

      {/* Grupos por categoría */}
      <div className="space-y-8">
        {grupos.map(cat => cat.encuestas.length > 0 && (
          <GrupoCategoria
            key={cat.value}
            titulo={cat.value}
            colorClass={cat.color}
            dotClass={cat.dot}
            encuestas={cat.encuestas}
          />
        ))}

        {sinCategoria.length > 0 && (
          <GrupoCategoria
            titulo="Sin categoría"
            colorClass="bg-gray-50 text-gray-600 border-gray-200"
            dotClass="bg-gray-400"
            encuestas={sinCategoria}
          />
        )}
      </div>
    </div>
  )
}

function GrupoCategoria({ titulo, colorClass, dotClass, encuestas }: {
  titulo: string
  colorClass: string
  dotClass: string
  encuestas: any[]
}) {
  const totalResp = encuestas.reduce((a, e) => a + e.respuestas, 0)
  const activas = encuestas.filter(e => e.activa).length

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-3 h-3 rounded-full ${dotClass}`} />
        <h2 className="text-base font-bold text-gray-900">{titulo}</h2>
        <span className="text-xs text-gray-400">{encuestas.length} encuesta{encuestas.length !== 1 ? 's' : ''} · {totalResp} respuestas · {activas} activa{activas !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
        {encuestas.map(e => {
          const cat = getCategoriaStyle(e.categoria)
          return (
            <div key={e.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-gray-900 truncate">{e.titulo}</p>
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    e.activa ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {e.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                {e.descripcion && (
                  <p className="text-xs text-gray-400 truncate">{e.descripcion}</p>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center hidden sm:block">
                  <p className="text-lg font-bold text-gray-900">{e.respuestas}</p>
                  <p className="text-[10px] text-gray-400">resp.</p>
                </div>

                <Link
                  href={`/admin/encuestas/${e.id}/resultados`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#003087] hover:bg-[#001f5b] rounded-lg transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Resultados
                </Link>

                <Link
                  href={`/encuesta/${e.token_publico}`}
                  target="_blank"
                  className="p-1.5 text-gray-400 hover:text-[#003087] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-[#003087]',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-[#E31837]',
    gray: 'bg-gray-50 text-gray-700',
  }
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  )
}
