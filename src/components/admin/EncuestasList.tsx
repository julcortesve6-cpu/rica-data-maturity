'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import EncuestaCard from './EncuestaCard'
import { CATEGORIAS } from '@/lib/categorias'

interface Encuesta {
  id: string
  titulo: string
  descripcion?: string
  token_publico: string
  activa: boolean
  fecha_creacion: string
  categoria?: string | null
  respuestas: number
}

export default function EncuestasList({ encuestas }: { encuestas: Encuesta[] }) {
  const [query, setQuery] = useState('')
  const [tabActiva, setTabActiva] = useState<string>('todas')

  const porCategoria = encuestas.filter(e =>
    tabActiva === 'todas' || (e.categoria ?? '') === tabActiva
  ).filter(e =>
    e.titulo.toLowerCase().includes(query.toLowerCase()) ||
    (e.descripcion ?? '').toLowerCase().includes(query.toLowerCase())
  )

  const conteoTab = (val: string) =>
    val === 'todas'
      ? encuestas.length
      : encuestas.filter(e => (e.categoria ?? '') === val).length

  return (
    <div className="space-y-4">
      {/* Tabs de categoría */}
      <div className="flex gap-1 flex-wrap">
        <TabBtn
          active={tabActiva === 'todas'}
          onClick={() => setTabActiva('todas')}
          count={conteoTab('todas')}
          color="text-gray-700 border-gray-400"
        >
          Todas
        </TabBtn>
        {CATEGORIAS.map(cat => (
          <TabBtn
            key={cat.value}
            active={tabActiva === cat.value}
            onClick={() => setTabActiva(cat.value)}
            count={conteoTab(cat.value)}
            color={cat.tab}
          >
            {cat.value}
          </TabBtn>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre o descripción..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
            ✕
          </button>
        )}
      </div>

      {query && (
        <p className="text-xs text-gray-400 px-1">
          {porCategoria.length === 0 ? 'Sin resultados' : `${porCategoria.length} resultado${porCategoria.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {porCategoria.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-10 text-center">
          <p className="text-gray-400 text-sm">
            {query ? `Sin resultados para "${query}"` : 'No hay encuestas en esta categoría'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {porCategoria.map((e, idx) => (
            <div key={e.id} className="flex items-start gap-3">
              <span className="mt-5 text-sm font-bold text-gray-300 w-6 text-right shrink-0 select-none">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <EncuestaCard encuesta={e} respuestas={e.respuestas} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TabBtn({ children, active, onClick, count, color }: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  count: number
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        active
          ? `border-b-2 bg-white shadow-sm ${color}`
          : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-white'
      }`}
    >
      {children}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        active ? 'bg-current/10' : 'bg-gray-100 text-gray-500'
      }`}>
        {count}
      </span>
    </button>
  )
}
