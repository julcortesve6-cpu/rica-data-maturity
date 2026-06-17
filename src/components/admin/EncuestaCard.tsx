'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  Users, Calendar, ExternalLink, BarChart3,
  Copy, CheckCircle2, ToggleLeft, ToggleRight,
  RotateCcw, Trash2, AlertTriangle, Save
} from 'lucide-react'
import { toast } from 'sonner'
import { toggleEncuestaActiva, reiniciarEncuesta, eliminarEncuesta, actualizarCategoria } from '@/app/actions/encuestas'
import { CATEGORIAS, getCategoriaStyle } from '@/lib/categorias'

interface Props {
  encuesta: {
    id: string
    titulo: string
    descripcion?: string
    token_publico: string
    activa: boolean
    fecha_creacion: string
    categoria?: string | null
  }
  respuestas: number
}

export default function EncuestaCard({ encuesta, respuestas }: Props) {
  const [copied, setCopied] = useState(false)
  const [activa, setActiva] = useState(encuesta.activa)
  const [modal, setModal] = useState<'reiniciar' | 'eliminar' | null>(null)
  const [isPending, startTransition] = useTransition()
  const [categoria, setCategoria] = useState(encuesta.categoria ?? '')
  const [categoriaSaved, setCategoriaSaved] = useState(encuesta.categoria ?? '')

  function handleGuardarCategoria() {
    startTransition(async () => {
      const result = await actualizarCategoria(encuesta.id, categoria || null)
      if (result?.error) {
        toast.error('No se pudo guardar la categoría: ' + result.error)
        setCategoria(categoriaSaved)
      } else {
        setCategoriaSaved(categoria)
        toast.success('Categoría guardada')
      }
    })
  }

  const catStyle = getCategoriaStyle(categoriaSaved)

  const surveyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/encuesta/${encuesta.token_publico}`

  function copyLink() {
    navigator.clipboard.writeText(surveyUrl)
    setCopied(true)
    toast.success('Link copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleEncuestaActiva(encuesta.id, !activa)
      setActiva(a => !a)
      toast.success(!activa ? 'Encuesta habilitada' : 'Encuesta deshabilitada')
    })
  }

  function handleReiniciar() {
    setModal(null)
    startTransition(async () => {
      const result = await reiniciarEncuesta(encuesta.id)
      if (result?.error) toast.error(result.error)
      else toast.success('Respuestas eliminadas — los empleados pueden volver a contestar')
    })
  }

  function handleEliminar() {
    setModal(null)
    startTransition(async () => {
      await eliminarEncuesta(encuesta.id)
    })
  }

  const fecha = new Date(encuesta.fecha_creacion).toLocaleDateString('es-DO', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

  return (
    <>
      <div className={`bg-white border rounded-xl p-5 hover:shadow-sm transition-all ${isPending ? 'opacity-60' : 'border-gray-100'}`}>
        {/* Fila principal */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">{encuesta.titulo}</h3>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                activa ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {activa ? 'Habilitada' : 'Deshabilitada'}
              </span>
              {catStyle && (
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium border ${catStyle.color}`}>
                  {categoria}
                </span>
              )}
            </div>
            {encuesta.descripcion && (
              <p className="text-gray-500 text-sm mb-3 line-clamp-1">{encuesta.descripcion}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {respuestas} {respuestas === 1 ? 'respuesta' : 'respuestas'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {fecha}
              </span>
            </div>
          </div>

          {/* Acciones principales */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar link'}
            </button>

            <Link
              href={`/admin/encuestas/${encuesta.id}/resultados`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#003087] hover:bg-[#001f5b] rounded-lg transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Resultados
            </Link>

            <Link
              href={`/encuesta/${encuesta.token_publico}`}
              target="_blank"
              className="p-1.5 text-gray-400 hover:text-[#003087] rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Categoría */}
        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-400 font-medium shrink-0">Categoría:</span>
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            disabled={isPending}
            className={`flex-1 px-2 py-1 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#003087]/20 transition-all ${
              catStyle && categoria === categoriaSaved ? catStyle.color : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
          >
            <option value="">Sin categoría</option>
            {CATEGORIAS.map(c => (
              <option key={c.value} value={c.value}>{c.value}</option>
            ))}
          </select>
          <button
            onClick={handleGuardarCategoria}
            disabled={isPending || categoria === categoriaSaved}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#003087] hover:bg-[#001f5b] text-white rounded-lg transition-colors disabled:opacity-40 shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium mr-1">Gestión:</span>

          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
              activa
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {activa ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            {activa ? 'Deshabilitar' : 'Habilitar'}
          </button>

          <button
            onClick={() => setModal('reiniciar')}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </button>

          <button
            onClick={() => setModal('eliminar')}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Modal de confirmación */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              modal === 'eliminar' ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${modal === 'eliminar' ? 'text-red-600' : 'text-amber-600'}`} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              {modal === 'reiniciar' ? 'Reiniciar encuesta' : 'Eliminar encuesta'}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-2 font-medium">{encuesta.titulo}</p>

            <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
              {modal === 'reiniciar'
                ? 'Se eliminarán todas las respuestas registradas. Los empleados podrán volver a contestar la encuesta. Esta acción no se puede deshacer.'
                : 'Se eliminará la encuesta, sus secciones, preguntas y todas las respuestas de forma permanente. Esta acción no se puede deshacer.'
              }
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={modal === 'reiniciar' ? handleReiniciar : handleEliminar}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                  modal === 'eliminar' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {modal === 'reiniciar' ? 'Sí, reiniciar' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
