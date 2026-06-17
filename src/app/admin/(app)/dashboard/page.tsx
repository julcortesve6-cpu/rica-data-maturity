import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PlusCircle, ClipboardList, Users, Link2, BarChart3 } from 'lucide-react'
import EncuestasList from '@/components/admin/EncuestasList'
import MigrationBanner from '@/components/admin/MigrationBanner'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Detectar si la columna categoria existe
  const { error: colErr } = await supabase.from('encuestas').select('categoria').limit(1)
  const needsMigration = !!colErr?.message?.toLowerCase().includes('categoria')

  const { data: encuestas } = await supabase
    .from('encuestas')
    .select('*, respuestas_empleado(count)')
    .order('fecha_creacion', { ascending: false })

  const total = encuestas?.length ?? 0
  const activas = encuestas?.filter(e => e.activa).length ?? 0
  const totalRespuestas = encuestas?.reduce(
    (acc, e) => acc + (e.respuestas_empleado?.[0]?.count ?? 0), 0
  ) ?? 0

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <MigrationBanner visible={needsMigration} />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona tus encuestas de madurez de datos</p>
        </div>
        <Link
          href="/admin/encuestas/nueva"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#003087] hover:bg-[#001f5b] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Nueva encuesta
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={ClipboardList} label="Total encuestas" value={total} color="blue" />
        <StatCard icon={Link2} label="Encuestas activas" value={activas} color="green" />
        <StatCard icon={Users} label="Total respuestas" value={totalRespuestas} color="red" />
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Mis encuestas</h2>
        {!encuestas || encuestas.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-1">Aún no tienes encuestas</p>
            <p className="text-gray-400 text-sm mb-6">Crea tu primera encuesta de madurez de datos</p>
            <Link
              href="/admin/encuestas/nueva"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#003087] text-white rounded-lg text-sm font-medium hover:bg-[#001f5b] transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Crear encuesta
            </Link>
          </div>
        ) : (
          <EncuestasList
            encuestas={encuestas.map(e => ({
              ...e,
              respuestas: e.respuestas_empleado?.[0]?.count ?? 0,
              categoria: e.categoria ?? null,
            }))}
          />
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: number
  color: 'blue' | 'green' | 'red'
}) {
  const colors = {
    blue: 'bg-blue-50 text-[#003087]',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-[#E31837]',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-gray-500 text-sm">{label}</p>
      </div>
    </div>
  )
}
