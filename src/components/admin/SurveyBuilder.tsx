'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { guardarEstructuraEncuesta, toggleEncuestaActiva, reiniciarEncuesta, eliminarEncuesta } from '@/app/actions/encuestas'
import type { Seccion, Pregunta, OpcionPregunta, TipoPregunta } from '@/types'
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, Link2, Copy, CheckCircle2,
  GripVertical, ToggleLeft, ToggleRight, Eye, RotateCcw, AlertTriangle, Lock
} from 'lucide-react'

const DATOS_SECTION_TITULO = 'Datos de quien diligencia'

const OPCIONES_DEFAULT_ESCALA: OpcionPregunta[] = [
  { valor: 'A', label: 'A) Sí, completamente', pide_justificacion: false },
  { valor: 'B', label: 'B) Sí, parcialmente', pide_justificacion: false },
  { valor: 'C', label: 'C) En proceso / Ocasionalmente', pide_justificacion: true },
  { valor: 'D', label: 'D) No existe / No se realiza', pide_justificacion: true },
]

type SeccionLocal = Omit<Seccion, 'encuesta_id' | 'preguntas'> & {
  preguntas: Omit<Pregunta, 'seccion_id'>[]
}

interface Props {
  encuestaId: string
  tokenPublico: string
  seccionesIniciales: SeccionLocal[]
  activa: boolean
}

export default function SurveyBuilder({ encuestaId, tokenPublico, seccionesIniciales, activa: activaInicial }: Props) {
  // Excluir la sección de datos demográficos — se gestiona automáticamente
  const [secciones, setSecciones] = useState<SeccionLocal[]>(
    seccionesIniciales.filter(s => s.titulo !== DATOS_SECTION_TITULO)
  )
  const [activa, setActiva] = useState(activaInicial)
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [expandida, setExpandida] = useState<string | null>(secciones[0]?.id ?? null)
  const [modal, setModal] = useState<'reiniciar' | 'eliminar' | null>(null)

  const surveyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/encuesta/${tokenPublico}`

  function copyLink() {
    navigator.clipboard.writeText(surveyUrl)
    setCopied(true)
    toast.success('Link copiado')
    setTimeout(() => setCopied(false), 2000)
  }

  function addSeccion() {
    const nueva: SeccionLocal = {
      id: `new_${Date.now()}`,
      titulo: 'Nueva sección',
      descripcion: '',
      orden: secciones.length,
      preguntas: [],
    }
    setSecciones([...secciones, nueva])
    setExpandida(nueva.id)
  }

  function updateSeccion(id: string, changes: Partial<SeccionLocal>) {
    setSecciones(secciones.map(s => s.id === id ? { ...s, ...changes } : s))
  }

  function removeSeccion(id: string) {
    setSecciones(secciones.filter(s => s.id !== id))
  }

  function moveSeccion(id: string, dir: -1 | 1) {
    const idx = secciones.findIndex(s => s.id === id)
    if (idx + dir < 0 || idx + dir >= secciones.length) return
    const arr = [...secciones]
    ;[arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]]
    setSecciones(arr.map((s, i) => ({ ...s, orden: i })))
  }

  function addPregunta(seccionId: string, tipo: TipoPregunta) {
    const nueva: Omit<Pregunta, 'seccion_id'> = {
      id: `new_${Date.now()}`,
      texto: 'Nueva pregunta',
      ayuda: '',
      tipo,
      opciones_json: tipo === 'escala_ad' ? OPCIONES_DEFAULT_ESCALA
        : tipo === 'opcion_multiple' ? [
          { valor: 'op1', label: 'Opción 1', pide_justificacion: false },
          { valor: 'op2', label: 'Opción 2', pide_justificacion: false },
        ] : undefined,
      requerida: true,
      orden: 0,
    }
    setSecciones(secciones.map(s => {
      if (s.id !== seccionId) return s
      return { ...s, preguntas: [...s.preguntas, { ...nueva, orden: s.preguntas.length }] }
    }))
  }

  function updatePregunta(seccionId: string, preguntaId: string, changes: Partial<Omit<Pregunta, 'seccion_id'>>) {
    setSecciones(secciones.map(s => {
      if (s.id !== seccionId) return s
      return { ...s, preguntas: s.preguntas.map(p => p.id === preguntaId ? { ...p, ...changes } : p) }
    }))
  }

  function removePregunta(seccionId: string, preguntaId: string) {
    setSecciones(secciones.map(s => {
      if (s.id !== seccionId) return s
      return { ...s, preguntas: s.preguntas.filter(p => p.id !== preguntaId) }
    }))
  }

  function movePregunta(seccionId: string, preguntaId: string, dir: -1 | 1) {
    setSecciones(secciones.map(s => {
      if (s.id !== seccionId) return s
      const arr = [...s.preguntas]
      const idx = arr.findIndex(p => p.id === preguntaId)
      if (idx + dir < 0 || idx + dir >= arr.length) return s
      ;[arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]]
      return { ...s, preguntas: arr.map((p, i) => ({ ...p, orden: i })) }
    }))
  }

  function handleGuardar() {
    startTransition(async () => {
      try {
        await guardarEstructuraEncuesta(encuestaId, secciones as any)
        toast.success('Encuesta guardada correctamente')
      } catch {
        toast.error('Error al guardar la encuesta')
      }
    })
  }

  function handleToggleActiva() {
    startTransition(async () => {
      try {
        await toggleEncuestaActiva(encuestaId, !activa)
        setActiva(!activa)
        toast.success(activa ? 'Encuesta desactivada' : 'Encuesta activada')
      } catch {
        toast.error('Error al cambiar el estado')
      }
    })
  }

  function handleReiniciar() {
    setModal(null)
    startTransition(async () => {
      const result = await reiniciarEncuesta(encuestaId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Respuestas eliminadas — la encuesta está lista para volver a contestarse')
      }
    })
  }

  function handleEliminar() {
    setModal(null)
    startTransition(async () => {
      await eliminarEncuesta(encuestaId)
    })
  }

  const totalPreguntas = secciones.reduce((acc, s) => acc + s.preguntas.length, 0)

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-800">{secciones.length}</span> secciones ·
          <span className="font-medium text-gray-800">{totalPreguntas}</span> preguntas
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200 max-w-xs truncate">
          <Link2 className="w-3.5 h-3.5 shrink-0 text-gray-400" />
          <span className="truncate text-xs">/encuesta/{tokenPublico}</span>
          <button onClick={copyLink} className="shrink-0 text-gray-400 hover:text-[#003087]">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button
          onClick={handleToggleActiva}
          disabled={isPending}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            activa
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          {activa ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {activa ? 'Habilitada' : 'Deshabilitada'}
        </button>

        <a
          href={`/encuesta/${tokenPublico}`}
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </a>

        <div className="w-px h-5 bg-gray-200 hidden sm:block" />

        <button
          onClick={() => setModal('reiniciar')}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar
        </button>

        <button
          onClick={() => setModal('eliminar')}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Eliminar
        </button>

        <button
          onClick={handleGuardar}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#003087] hover:bg-[#001f5b] disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {isPending ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Guardar
        </button>
      </div>

      {/* Sección automática — solo lectura */}
      <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl px-4 py-3 flex items-center gap-3">
        <Lock className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-600">Datos de quien diligencia</p>
          <p className="text-xs text-gray-400">Dirección · Rol — se incluye automáticamente en todas las encuestas</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5 font-medium shrink-0">Auto</span>
      </div>

      {/* Secciones */}
      {secciones.map((seccion, sIdx) => (
        <div key={seccion.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {/* Header de sección */}
          <div
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setExpandida(expandida === seccion.id ? null : seccion.id)}
          >
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <input
                value={seccion.titulo}
                onChange={e => { e.stopPropagation(); updateSeccion(seccion.id, { titulo: e.target.value }) }}
                onClick={e => e.stopPropagation()}
                className="font-semibold text-gray-900 bg-transparent border-none outline-none w-full text-sm"
                placeholder="Nombre de la sección"
              />
            </div>
            <span className="text-xs text-gray-400 shrink-0">{seccion.preguntas.length} preguntas</span>
            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={() => moveSeccion(seccion.id, -1)} disabled={sIdx === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => moveSeccion(seccion.id, 1)} disabled={sIdx === secciones.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => removeSeccion(seccion.id)} className="p-1 text-gray-400 hover:text-red-500 ml-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Contenido expandido */}
          {expandida === seccion.id && (
            <div className="border-t border-gray-100 p-4 space-y-3">
              <input
                value={seccion.descripcion ?? ''}
                onChange={e => updateSeccion(seccion.id, { descripcion: e.target.value })}
                placeholder="Descripción de la sección (opcional)"
                className="w-full px-3 py-2 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:border-[#003087]/30"
              />

              {/* Preguntas */}
              {seccion.preguntas.map((pregunta, pIdx) => (
                <PreguntaEditor
                  key={pregunta.id}
                  pregunta={pregunta}
                  index={pIdx}
                  total={seccion.preguntas.length}
                  onChange={changes => updatePregunta(seccion.id, pregunta.id, changes)}
                  onRemove={() => removePregunta(seccion.id, pregunta.id)}
                  onMove={dir => movePregunta(seccion.id, pregunta.id, dir)}
                />
              ))}

              {/* Agregar pregunta */}
              <div className="flex gap-2 pt-1">
                <span className="text-xs text-gray-400 self-center mr-1">+ Agregar:</span>
                <button
                  onClick={() => addPregunta(seccion.id, 'escala_ad')}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-[#003087] border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Escala A-D
                </button>
                <button
                  onClick={() => addPregunta(seccion.id, 'opcion_multiple')}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Opción múltiple
                </button>
                <button
                  onClick={() => addPregunta(seccion.id, 'texto_libre')}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Texto libre
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Agregar sección */}
      <button
        onClick={addSeccion}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 hover:border-[#003087]/30 rounded-xl text-sm text-gray-400 hover:text-[#003087] transition-all"
      >
        <Plus className="w-4 h-4" />
        Agregar sección
      </button>

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
                  modal === 'eliminar'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {modal === 'reiniciar' ? 'Sí, reiniciar' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreguntaEditor({ pregunta, index, total, onChange, onRemove, onMove }: {
  pregunta: Omit<Pregunta, 'seccion_id'>
  index: number
  total: number
  onChange: (changes: Partial<Omit<Pregunta, 'seccion_id'>>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const tipoLabel: Record<TipoPregunta, string> = {
    escala_ad: 'Escala A-D',
    opcion_multiple: 'Opción múltiple',
    texto_libre: 'Texto libre',
  }

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
      <div className="flex items-start gap-3">
        <span className="text-xs font-bold text-gray-400 mt-1 w-5 shrink-0">{index + 1}</span>
        <div className="flex-1 space-y-2">
          <textarea
            value={pregunta.texto}
            onChange={e => onChange({ texto: e.target.value })}
            placeholder="Texto de la pregunta"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#003087]/40 resize-none font-medium text-gray-800"
          />
          <input
            value={pregunta.ayuda ?? ''}
            onChange={e => onChange({ ayuda: e.target.value })}
            placeholder="Texto de ayuda / contexto (opcional)"
            className="w-full px-3 py-2 text-xs bg-white border border-gray-100 rounded-lg focus:outline-none focus:border-[#003087]/30 text-gray-500"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-[#003087] rounded-full font-medium">
              {tipoLabel[pregunta.tipo]}
            </span>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={pregunta.requerida}
                onChange={e => onChange({ requerida: e.target.checked })}
                className="rounded"
              />
              Obligatoria
            </label>
          </div>

          {/* Opciones para escala_ad y opcion_multiple */}
          {pregunta.tipo !== 'texto_libre' && pregunta.opciones_json && (
            <div className="space-y-1.5 mt-2">
              {pregunta.opciones_json.map((op, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-5">{op.valor}</span>
                  <input
                    value={op.label}
                    onChange={e => {
                      const nuevas = [...pregunta.opciones_json!]
                      nuevas[oIdx] = { ...nuevas[oIdx], label: e.target.value }
                      onChange({ opciones_json: nuevas })
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-white border border-gray-100 rounded-lg focus:outline-none focus:border-[#003087]/30"
                  />
                  {pregunta.tipo === 'escala_ad' && (
                    <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={op.pide_justificacion}
                        onChange={e => {
                          const nuevas = [...pregunta.opciones_json!]
                          nuevas[oIdx] = { ...nuevas[oIdx], pide_justificacion: e.target.checked }
                          onChange({ opciones_json: nuevas })
                        }}
                        className="rounded"
                      />
                      Justif.
                    </label>
                  )}
                </div>
              ))}
              {pregunta.tipo === 'opcion_multiple' && (
                <button
                  onClick={() => onChange({
                    opciones_json: [...(pregunta.opciones_json ?? []), {
                      valor: `op${(pregunta.opciones_json?.length ?? 0) + 1}`,
                      label: `Opción ${(pregunta.opciones_json?.length ?? 0) + 1}`,
                      pide_justificacion: false,
                    }]
                  })}
                  className="text-xs text-[#003087] hover:underline"
                >
                  + Agregar opción
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
