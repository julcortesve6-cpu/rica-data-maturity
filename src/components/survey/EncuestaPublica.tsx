'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { guardarRespuestas, verificarRespuesta } from '@/app/actions/respuestas'
import { toast } from 'sonner'
import type { RespuestaDetalle } from '@/types'
import { ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, User, Hash } from 'lucide-react'

type Paso = 'bienvenida' | 'encuesta' | 'gracias'

interface Props {
  encuestaId: string
  titulo: string
  descripcion?: string
  secciones: any[]
}

export default function EncuestaPublica({ encuestaId, titulo, descripcion, secciones }: Props) {
  const [paso, setPaso] = useState<Paso>('bienvenida')
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [seccionActual, setSeccionActual] = useState(0)
  const [respuestas, setRespuestas] = useState<Record<string, RespuestaDetalle>>({})
  const [isPending, startTransition] = useTransition()
  const [errores, setErrores] = useState<Record<string, string>>({})

  const seccion = secciones[seccionActual]
  const totalSecciones = secciones.length
  const progreso = totalSecciones > 0 ? Math.round(((seccionActual) / totalSecciones) * 100) : 0

  function handleRespuesta(preguntaId: string, valor: string, justificacion?: string) {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: { pregunta_id: preguntaId, valor_seleccionado: valor, texto_justificacion: justificacion }
    }))
    // Limpiar error si existe
    if (errores[preguntaId]) {
      setErrores(prev => { const n = { ...prev }; delete n[preguntaId]; return n })
    }
  }

  function handleJustificacion(preguntaId: string, texto: string) {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: { ...prev[preguntaId], texto_justificacion: texto }
    }))
  }

  function validarSeccion(): boolean {
    const nuevosErrores: Record<string, string> = {}
    for (const p of seccion.preguntas) {
      if (!p.requerida) continue
      const r = respuestas[p.id]
      if (!r?.valor_seleccionado) {
        nuevosErrores[p.id] = 'Esta pregunta es obligatoria'
        continue
      }
      // Verificar justificación requerida
      if (p.tipo !== 'texto_libre' && p.opciones_json) {
        const opcion = p.opciones_json.find((o: any) => o.valor === r.valor_seleccionado)
        if (opcion?.pide_justificacion && !r.texto_justificacion?.trim()) {
          nuevosErrores[p.id] = 'Por favor explica brevemente tu respuesta'
        }
      }
    }
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  function siguienteSeccion() {
    if (!validarSeccion()) {
      toast.error('Por favor responde todas las preguntas obligatorias')
      return
    }
    if (seccionActual < totalSecciones - 1) {
      setSeccionActual(seccionActual + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      handleEnviar()
    }
  }

  function handleIniciar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !codigo.trim()) return

    startTransition(async () => {
      const existente = await verificarRespuesta(encuestaId, codigo)
      if (existente) {
        toast.error('Este código de empleado ya respondió esta encuesta.')
        return
      }
      setPaso('encuesta')
    })
  }

  function handleEnviar() {
    startTransition(async () => {
      const listaRespuestas = Object.values(respuestas)
      const result = await guardarRespuestas(encuestaId, nombre, codigo, listaRespuestas)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setPaso('gracias')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  if (paso === 'bienvenida') {
    return <PantallaBienvenida
      titulo={titulo}
      descripcion={descripcion}
      nombre={nombre}
      codigo={codigo}
      isPending={isPending}
      onNombre={setNombre}
      onCodigo={setCodigo}
      onSubmit={handleIniciar}
    />
  }

  if (paso === 'gracias') {
    return <PantallaGracias nombre={nombre} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fb] to-[#eef2f8]">
      {/* Header */}
      <div className="rica-gradient text-white py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            <Image src="/logo-rica.jpeg" alt="Rica" width={32} height={32} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{titulo}</p>
            <p className="text-blue-200 text-xs">{nombre} · {codigo}</p>
          </div>
          <span className="text-blue-200 text-xs shrink-0">
            {seccionActual + 1} / {totalSecciones}
          </span>
        </div>
        {/* Barra de progreso */}
        <div className="max-w-2xl mx-auto mt-3">
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-white rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sección actual */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">{seccion.titulo}</h2>
          {seccion.descripcion && (
            <p className="text-gray-500 text-sm mt-1 italic">{seccion.descripcion}</p>
          )}
        </div>

        <div className="space-y-6">
          {seccion.preguntas.map((pregunta: any, idx: number) => (
            <PreguntaItem
              key={pregunta.id}
              pregunta={pregunta}
              index={idx}
              respuesta={respuestas[pregunta.id]}
              error={errores[pregunta.id]}
              onChange={handleRespuesta}
              onJustificacion={handleJustificacion}
            />
          ))}
        </div>

        {/* Navegación */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => { setSeccionActual(Math.max(0, seccionActual - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={seccionActual === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <button
            onClick={siguienteSeccion}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 text-sm text-white bg-[#003087] hover:bg-[#001f5b] disabled:opacity-60 rounded-xl transition-all font-semibold"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : seccionActual === totalSecciones - 1 ? (
              <>Enviar encuesta <CheckCircle2 className="w-4 h-4" /></>
            ) : (
              <>Siguiente <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function PreguntaItem({ pregunta, index, respuesta, error, onChange, onJustificacion }: {
  pregunta: any
  index: number
  respuesta?: RespuestaDetalle
  error?: string
  onChange: (id: string, valor: string, justificacion?: string) => void
  onJustificacion: (id: string, texto: string) => void
}) {
  const opcionSeleccionada = pregunta.opciones_json?.find(
    (o: any) => o.valor === respuesta?.valor_seleccionado
  )
  const pideJustificacion = opcionSeleccionada?.pide_justificacion

  return (
    <div className={`bg-white rounded-2xl border p-6 transition-all ${error ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="mb-4">
        <div className="flex items-start gap-2">
          <span className="text-xs font-bold text-gray-400 mt-0.5 shrink-0">{index + 1}.</span>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-snug">
              {pregunta.texto}
              {pregunta.requerida && <span className="text-[#E31837] ml-1">*</span>}
            </p>
            {pregunta.ayuda && (
              <p className="text-xs text-gray-400 mt-1 leading-relaxed italic">{pregunta.ayuda}</p>
            )}
          </div>
        </div>
      </div>

      {/* Opciones */}
      {pregunta.tipo === 'texto_libre' ? (
        <textarea
          value={respuesta?.valor_seleccionado ?? ''}
          onChange={e => onChange(pregunta.id, e.target.value)}
          rows={3}
          placeholder="Escriba su respuesta aquí..."
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] resize-none transition-all"
        />
      ) : pregunta.tipo === 'opcion_multiple' ? (
        <div className="relative">
          <select
            value={respuesta?.valor_seleccionado ?? ''}
            onChange={e => onChange(pregunta.id, e.target.value)}
            className={`w-full px-4 py-3 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all bg-white appearance-none cursor-pointer ${
              respuesta?.valor_seleccionado ? 'border-[#003087] text-gray-900' : 'border-gray-200 text-gray-400'
            }`}
          >
            <option value="">Selecciona una opción...</option>
            {(pregunta.opciones_json ?? []).map((op: any) => (
              <option key={op.valor} value={op.valor}>{op.etiqueta}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {(pregunta.opciones_json ?? []).map((op: any) => {
            const isSelected = respuesta?.valor_seleccionado === op.valor
            const esEscala = pregunta.tipo === 'escala_ad'
            return (
              <button
                key={op.valor}
                onClick={() => onChange(pregunta.id, op.valor)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
                  isSelected
                    ? 'border-[#003087] bg-[#003087]/5 text-[#003087] font-medium'
                    : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-gray-100'
                }`}
              >
                {esEscala ? (
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                    isSelected ? 'border-[#003087] bg-[#003087] text-white' : 'border-gray-300 text-gray-400'
                  }`}>
                    {op.valor}
                  </span>
                ) : (
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'border-[#003087]' : 'border-gray-300'
                  }`}>
                    {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-[#003087]" />}
                  </span>
                )}
                {op.etiqueta}
              </button>
            )
          })}
        </div>
      )}

      {/* Justificación condicional */}
      {pideJustificacion && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-semibold text-amber-700 mb-2">
            Por favor, explica brevemente: ¿por qué seleccionaste esta opción? *
          </p>
          <textarea
            value={respuesta?.texto_justificacion ?? ''}
            onChange={e => onJustificacion(pregunta.id, e.target.value)}
            rows={2}
            placeholder="Escribe tu justificación..."
            className="w-full px-3 py-2 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none transition-all"
          />
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

function PantallaBienvenida({ titulo, descripcion, nombre, codigo, isPending, onNombre, onCodigo, onSubmit }: any) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001f5b] to-[#003087] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
            <Image src="/logo-rica.jpeg" alt="Rica" width={80} height={80} className="object-contain" />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">{titulo}</h1>
          {descripcion && (
            <p className="text-gray-500 text-sm text-center mb-6 leading-relaxed">{descripcion}</p>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
            <p className="text-xs font-semibold text-[#003087] mb-2">Instrucciones</p>
            <ul className="text-xs text-gray-600 space-y-1 leading-relaxed">
              <li>• Responde con honestidad basándote en la situación actual</li>
              <li>• Cuando tu respuesta corresponda a baja madurez (C o D), se solicitará una breve justificación</li>
              <li>• La encuesta no tiene respuestas correctas o incorrectas</li>
              <li>• Tiempo estimado: 10 a 15 minutos</li>
            </ul>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nombre completo <span className="text-[#E31837]">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => onNombre(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Código de empleado <span className="text-[#E31837]">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  value={codigo}
                  onChange={e => onCodigo(e.target.value.toUpperCase())}
                  placeholder="EMP-001"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all uppercase"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Este código garantiza una sola respuesta por empleado</p>
            </div>

            <button
              type="submit"
              disabled={isPending || !nombre.trim() || !codigo.trim()}
              className="w-full py-3 px-4 bg-[#003087] hover:bg-[#001f5b] disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verificando...</>
              ) : (
                <>Comenzar encuesta <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300/60 text-xs mt-6">
          © 2026 Grupo Rica · República Dominicana
        </p>
      </div>
    </div>
  )
}

function PantallaGracias({ nombre }: { nombre: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001f5b] to-[#003087] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">¡Gracias, {nombre.split(' ')[0]}!</h1>
        <p className="text-blue-200 text-base leading-relaxed mb-8">
          Tu respuesta ha sido registrada exitosamente. Tus aportes son valiosos para mejorar la cultura de datos en Grupo Rica.
        </p>
        <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-2 overflow-hidden">
            <Image src="/logo-rica.jpeg" alt="Rica" width={40} height={40} className="object-contain" />
          </div>
          <p className="text-blue-300 text-xs mt-1">Evaluación de Madurez de Datos</p>
        </div>
      </div>
    </div>
  )
}
