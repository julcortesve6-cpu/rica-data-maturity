'use client'

import { useState, useTransition, useEffect } from 'react'
import Image from 'next/image'
import { guardarRespuestas, verificarRespuesta } from '@/app/actions/respuestas'
import { toast } from 'sonner'
import type { RespuestaDetalle } from '@/types'
import {
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, User, Hash,
  Layers, Clock, FileText, Target, Landmark, ShieldCheck, BarChart2,
  Lightbulb, PieChart, X,
} from 'lucide-react'

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
      secciones={secciones}
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
      <ByTIBot seccionActual={seccionActual} totalSecciones={totalSecciones} />
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

const COMPONENTES = [
  { label: 'Gobierno', Icon: Landmark },
  { label: 'Calidad', Icon: ShieldCheck },
  { label: 'Inteligencia de negocios', Icon: BarChart2 },
  { label: 'Cultura e innovación', Icon: Lightbulb },
]

function PantallaBienvenida({ titulo, descripcion, nombre, codigo, isPending, secciones, onNombre, onCodigo, onSubmit }: any) {
  const numSecciones = secciones?.length ?? 4

  return (
    <div
      className="min-h-screen relative overflow-x-hidden flex flex-col items-center justify-center px-4 pt-16 pb-36"
      style={{ background: 'linear-gradient(135deg, #001440 0%, #002070 60%, #001a4d 100%)' }}
    >
      <ByTIBot mensaje="¡Hola! Soy byTI 👋 Ingresa tu nombre y código de empleado para comenzar. Tus respuestas son completamente confidenciales." />
      {/* Cuadrícula de puntos decorativa — superior derecha */}
      <div
        className="absolute top-0 right-0 w-72 h-72 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1.5px, transparent 1.5px)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* Cuadrícula de puntos decorativa — inferior izquierda */}
      <div
        className="absolute bottom-0 left-0 w-48 h-48 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1.5px, transparent 1.5px)',
          backgroundSize: '18px 18px',
        }}
      />

      {/* Ícono decorativo izquierda */}
      <div className="absolute left-8 top-1/3 opacity-10 pointer-events-none hidden lg:block">
        <BarChart2 className="w-24 h-24 text-white" />
      </div>
      {/* Ícono decorativo derecha */}
      <div className="absolute right-8 top-1/2 opacity-10 pointer-events-none hidden lg:block">
        <PieChart className="w-20 h-20 text-white" />
      </div>

      {/* Logo Rica sobre la tarjeta */}
      <div className="mb-5 z-10 relative">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden border-2 border-white/20">
          <Image src="/logo-rica.jpeg" alt="Rica" width={64} height={64} className="object-contain" />
        </div>
      </div>

      {/* Contenedor de la tarjeta con robots posicionados */}
      <div className="relative w-full max-w-lg z-10">

        {/* SofIA — superpuesta esquina superior derecha, mirando hacia la encuesta */}
        <div
          className="absolute -top-24 -right-4 md:-right-12 w-44 md:w-60 z-20 pointer-events-none select-none"
          style={{
            maskImage: 'radial-gradient(ellipse 58% 68% at 50% 46%, black 30%, rgba(0,0,0,0.75) 50%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(ellipse 58% 68% at 50% 46%, black 30%, rgba(0,0,0,0.75) 50%, transparent 72%)',
            filter: 'drop-shadow(0 8px 24px rgba(0,20,80,0.5)) drop-shadow(0 0 8px rgba(100,160,255,0.15))',
            transform: 'scaleX(-1)',
          }}
        >
          <Image
            src="/sofia.jpeg"
            alt="SofIA"
            width={240}
            height={240}
            className="object-contain w-full h-full"
          />
        </div>


        {/* Tarjeta blanca */}
        <div className="bg-white rounded-3xl shadow-2xl px-7 py-8">

          {/* Título */}
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#003087] mb-2 leading-tight pr-20">
            {titulo}
          </h1>

          {/* Descripción */}
          {descripcion && (
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">{descripcion}</p>
          )}

          {/* Pills de información */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-[#003087] text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" />
              {numSecciones} componentes
            </span>
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-[#003087] text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              Menos de 10 min
            </span>
          </div>

          {/* ¿De qué se trata? */}
          <div className="bg-blue-50 rounded-2xl p-4 mb-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <FileText className="text-[#003087]" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#003087] mb-1.5">¿De qué se trata?</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Esta encuesta está basada en una guía reconocida llamada DAMA, que nos ayuda a entender qué tan bien estamos gestionando y aprovechando nuestros datos como empresa.
                </p>
                <p className="text-xs text-gray-500 leading-relaxed mt-1.5">
                  Con tus respuestas podremos conocer nuestro nivel actual de madurez de datos e identificar oportunidades claras de mejora.
                </p>
              </div>
            </div>
          </div>

          {/* ¿Qué vamos a revisar? */}
          <div className="bg-red-50 rounded-2xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Target className="text-[#E31837]" style={{ width: 18, height: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 mb-1">¿Qué vamos a revisar?</p>
                <p className="text-xs text-gray-500 mb-3">La encuesta se divide en {numSecciones} componentes clave:</p>
                <div className="grid grid-cols-2 gap-2">
                  {COMPONENTES.map(({ label, Icon }) => (
                    <div key={label} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs text-gray-700 font-medium">
                      <Icon className="w-3.5 h-3.5 text-[#003087] shrink-0" />
                      <span className="truncate">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Antes de comenzar */}
          <div className="mb-6">
            <p className="text-sm font-bold text-gray-900 mb-2.5">Antes de comenzar</p>
            <ul className="space-y-2">
              {[
                'Responde según tu realidad actual',
                'Si identificamos oportunidades, te pediremos una breve explicación',
                'No hay respuestas buenas o malas',
                'Tiempo estimado: 8 a 10 minutos',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Formulario */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all uppercase"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 leading-tight">Este código nos ayuda a asegurar una sola respuesta por colaborador.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || !nombre.trim() || !codigo.trim()}
              className="w-full py-4 px-4 bg-[#003087] hover:bg-[#001f5b] disabled:opacity-60 text-white rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {isPending ? (
                <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verificando...</>
              ) : (
                <>Comenzar encuesta <ChevronRight className="w-5 h-5" /></>
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-blue-300/50 text-xs mt-12 z-10 relative pb-6">
        © 2026 Grupo Rica · República Dominicana
      </p>
    </div>
  )
}

const MENSAJES_ENCUESTA = [
  "¡Comencemos! Responde según tu experiencia real del día a día. No hay respuestas buenas ni malas.",
  "¡Vas muy bien! Cada respuesta ayuda a entender cómo gestionamos los datos en la organización.",
  "Si seleccionas C o D, te pediremos una breve explicación. ¡Es la información más valiosa del diagnóstico!",
  "¡Excelente avance! Un diagnóstico honesto genera mejoras reales. Sigue así 💪",
  "¡Último tramo! Tus aportes son clave para que Grupo Rica siga creciendo en madurez de datos 🚀",
]

function ByTIBot({ mensaje, seccionActual = 0, totalSecciones = 1 }: {
  mensaje?: string
  seccionActual?: number
  totalSecciones?: number
}) {
  const [visible, setVisible] = useState(true)
  const [animKey, setAnimKey] = useState(0)

  const idx = Math.min(
    Math.round((seccionActual / Math.max(totalSecciones - 1, 1)) * (MENSAJES_ENCUESTA.length - 1)),
    MENSAJES_ENCUESTA.length - 1
  )
  const texto = mensaje ?? MENSAJES_ENCUESTA[idx]

  useEffect(() => {
    setVisible(true)
    setAnimKey(k => k + 1)
  }, [seccionActual, mensaje])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        maxWidth: 260,
      }}
    >
      {/* Burbuja de mensaje */}
      {visible && (
        <div
          key={animKey}
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid #f0f0f0',
            padding: '12px 16px',
            position: 'relative',
            animation: 'bytiIn 0.3s ease-out',
          }}
        >
          <button
            onClick={() => setVisible(false)}
            style={{ position: 'absolute', top: 8, right: 8, color: '#ccc', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
          <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, paddingRight: 16, margin: 0 }}>
            {texto}
          </p>
          {/* Flecha */}
          <div style={{
            position: 'absolute',
            bottom: -7,
            right: 36,
            width: 14,
            height: 14,
            background: '#fff',
            border: '1px solid #f0f0f0',
            borderTop: 'none',
            borderLeft: 'none',
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}

      {/* byTI */}
      <button
        onClick={() => setVisible(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        title="byTI"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/byti-laptop.png"
          alt="byTI"
          style={{ width: 88, height: 'auto', display: 'block', filter: 'drop-shadow(0 4px 12px rgba(0,48,135,0.25))' }}
        />
      </button>

      <style>{`
        @keyframes bytiIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function PantallaGracias({ nombre }: { nombre: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: 'linear-gradient(135deg, #001440 0%, #002070 60%, #001a4d 100%)' }}
    >
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
