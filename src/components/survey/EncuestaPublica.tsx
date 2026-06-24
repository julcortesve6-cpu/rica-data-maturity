'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Image from 'next/image'
import { guardarRespuestas, verificarRespuesta } from '@/app/actions/respuestas'
import { toast } from 'sonner'
import type { RespuestaDetalle } from '@/types'
import {
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, User, Hash,
  Layers, Clock, FileText, Target, Landmark, ShieldCheck, BarChart2,
  Lightbulb, PieChart, X, Heart, Info, Database,
} from 'lucide-react'

type Paso = 'bienvenida' | 'encuesta' | 'gracias'

const ICONOS_SECCION = [Landmark, ShieldCheck, BarChart2, Lightbulb, Database, FileText]

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
  const [reaccionBot, setReaccionBot] = useState<string | null>(null)
  const colaReacciones = useRef<string[]>([])
  const idxReaccion = useRef(0)

  useEffect(() => {
    const shuffled = [...REACCIONES_RESPUESTA]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    colaReacciones.current = shuffled
    idxReaccion.current = 0
  }, [])

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
    if (idxReaccion.current >= colaReacciones.current.length) {
      const reshuffled = [...REACCIONES_RESPUESTA]
      for (let i = reshuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [reshuffled[i], reshuffled[j]] = [reshuffled[j], reshuffled[i]]
      }
      colaReacciones.current = reshuffled
      idxReaccion.current = 0
    }
    const r = colaReacciones.current[idxReaccion.current++]
    setReaccionBot(r + '_' + Date.now())
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

  const SectionIcon = ICONOS_SECCION[seccionActual % ICONOS_SECCION.length]
  const tiempoEstimado = Math.max(1, Math.ceil(seccion.preguntas.length * 0.5))

  return (
    <div className="min-h-screen bg-[#f0f4f8] pb-24">
      <ByTIBot seccionActual={seccionActual} totalSecciones={totalSecciones} reaccion={reaccionBot} />

      {/* ── Header sticky ── */}
      <header className="bg-white sticky top-0 z-40 shadow-md">

        {/* Fila 1 — branding */}
        <div className="border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-gray-100">
              <Image src="/logo-rica.jpeg" alt="Rica" width={28} height={28} className="object-contain" />
            </div>
            <span className="text-[11px] font-extrabold text-[#003087] uppercase tracking-[0.15em] shrink-0">Grupo Rica</span>
            <div className="w-px h-3.5 bg-gray-200 shrink-0" />
            <p className="text-[11px] text-gray-400 truncate flex-1">{titulo}</p>
          </div>
        </div>

        {/* Fila 2 — usuario + progreso */}
        <div className="border-b-[3px] border-[#003087]">
          <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">

            {/* Avatar + nombre · código */}
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full pl-1 pr-3 py-1 shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#003087] flex items-center justify-center text-white text-[10px] font-extrabold shrink-0">
                {nombre.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-gray-800">{nombre}</span>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-xs text-gray-500 font-mono">{codigo}</span>
            </div>

            {/* Barra de progreso */}
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-[#003087]">Paso {seccionActual + 1} de {totalSecciones}</span>
                <span className="text-[10px] text-gray-400 font-medium">{progreso}% completado</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progreso}%`, background: 'linear-gradient(90deg, #003087, #1a5cb8)' }}
                />
              </div>
            </div>

            {/* Tiempo */}
            <div className="hidden sm:flex items-center gap-1.5 bg-[#003087] text-white px-3 py-1.5 rounded-xl shrink-0 text-[11px] font-semibold">
              <Clock className="w-3 h-3" />
              ~{tiempoEstimado} min
            </div>

          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── Tarjeta de sección ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-6 relative overflow-hidden">
          {/* Cuadrícula decorativa */}
          <div className="absolute top-0 right-36 w-44 h-full opacity-[0.06] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, #003087 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />

          <div className="flex items-start gap-4 pr-40">
            {/* Ícono de sección */}
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <SectionIcon className="w-7 h-7 text-[#003087]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-[#003087] uppercase tracking-widest">Componente</span>
              <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mt-0.5 mb-2 leading-tight">{seccion.titulo}</h2>
              {seccion.descripcion && (
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{seccion.descripcion}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Heart className="w-3.5 h-3.5 text-[#E31837] shrink-0" />
                Tu respuesta nos ayuda a identificar oportunidades de mejora.
              </div>
            </div>
          </div>

          {/* SofIA decorativa */}
          <div className="absolute right-0 bottom-0 h-full w-40 flex items-end justify-end pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sofia-reading.png" alt="" aria-hidden
              style={{ height: '100%', width: 'auto', maxWidth: 160, objectFit: 'contain', objectPosition: 'bottom' }} />
          </div>
        </div>

        {/* ── Preguntas ── */}
        <div className="space-y-4">
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
      </div>

      {/* ── Footer de navegación ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => { setSeccionActual(Math.max(0, seccionActual - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={seccionActual === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <span className="text-xs text-gray-400 hidden sm:block">
            {seccionActual + 1} / {totalSecciones} secciones
          </span>

          <button
            onClick={siguienteSeccion}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 text-sm text-white bg-[#003087] hover:bg-[#001f5b] disabled:opacity-60 rounded-xl transition-all font-bold shadow-md"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : seccionActual === totalSecciones - 1 ? (
              <>Enviar encuesta <CheckCircle2 className="w-4 h-4" /></>
            ) : (
              <>Guardar y continuar <ChevronRight className="w-4 h-4" /></>
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
  const esEscala = pregunta.tipo === 'escala_ad'

  return (
    <div className={`bg-white rounded-2xl shadow-sm transition-all border-2 ${error ? 'border-red-200' : 'border-transparent'}`}>
      {/* Cabecera de la pregunta */}
      <div className="p-5 pb-4">
        <div className="flex items-start gap-3">
          {/* Número */}
          <span className="w-8 h-8 rounded-full bg-[#003087] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <p className="text-base font-bold text-gray-900 leading-snug flex-1">
                {pregunta.texto}
                {pregunta.requerida && <span className="text-[#E31837] ml-1">*</span>}
              </p>
              <Info className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
            </div>
            {pregunta.ayuda && (
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{pregunta.ayuda}</p>
            )}
          </div>
        </div>
      </div>

      {/* Opciones */}
      <div className="px-5 pb-5">
        {pregunta.tipo === 'texto_libre' ? (
          <textarea
            value={respuesta?.valor_seleccionado ?? ''}
            onChange={e => onChange(pregunta.id, e.target.value)}
            rows={3}
            placeholder="Escriba su respuesta aquí..."
            className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] resize-none transition-all"
          />
        ) : pregunta.tipo === 'opcion_multiple' ? (
          <div className="relative">
            <select
              value={respuesta?.valor_seleccionado ?? ''}
              onChange={e => onChange(pregunta.id, e.target.value)}
              className={`w-full px-4 py-3 pr-10 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all bg-white appearance-none cursor-pointer ${
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
              return (
                <button
                  key={op.valor}
                  onClick={() => onChange(pregunta.id, op.valor)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                    isSelected
                      ? 'border-[#003087] bg-blue-50'
                      : 'border-gray-150 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 font-bold text-sm transition-all ${
                    isSelected
                      ? 'border-[#003087] bg-[#003087] text-white'
                      : 'border-gray-300 text-gray-400 bg-white'
                  }`}>
                    {esEscala ? op.valor : (
                      <span className={`w-3 h-3 rounded-full transition-all ${isSelected ? 'bg-white' : 'bg-transparent border border-gray-300'}`} />
                    )}
                  </span>
                  <span className={`flex-1 ${isSelected ? 'text-[#003087] font-semibold' : 'text-gray-700'}`}>
                    {op.etiqueta}
                  </span>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-[#003087] shrink-0" />}
                </button>
              )
            })}

            {/* Nota C/D */}
            {esEscala && (
              <div className="flex items-start gap-1.5 mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                Si seleccionas C o D, es posible que te pidamos un breve comentario para entender mejor tu respuesta.
              </div>
            )}
          </div>
        )}

        {/* Justificación condicional */}
        {pideJustificacion && (
          <div className="mt-4 rounded-2xl overflow-hidden border border-amber-200 shadow-sm">
            <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-3 flex items-center gap-2">
              <span className="text-lg">💬</span>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Cuéntanos un poco más</p>
                <p className="text-amber-100 text-xs leading-tight">Tu explicación es la información más valiosa del diagnóstico</p>
              </div>
            </div>
            <div className="bg-amber-50 p-4">
              <textarea
                value={respuesta?.texto_justificacion ?? ''}
                onChange={e => onJustificacion(pregunta.id, e.target.value)}
                rows={3}
                placeholder="¿Qué situación específica refleja esta respuesta? Describe brevemente..."
                className="w-full px-4 py-3 text-sm bg-white border-2 border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none transition-all placeholder:text-gray-300"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
      </div>
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

        {/* SofIA — superpuesta esquina superior derecha */}
        <div
          className="absolute -top-36 -right-4 md:-right-10 w-36 md:w-44 z-20 pointer-events-none select-none"
          style={{ filter: 'drop-shadow(0 8px 28px rgba(0,20,80,0.35))' }}
        >
          <Image
            src="/sofia-wave.png"
            alt="SofIA"
            width={240}
            height={260}
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

const REACCIONES_RESPUESTA = [
  // ── Lote 1 — cultura de datos y honestidad ──
  "¡Dato capturado! Los diagnósticos honestos valen más que mil dashboards bonitos 📊",
  "¡Recibido! Si los datos mienten, el negocio tropieza. Tú nos diste la verdad 🙏",
  "¡Guardado! Un dashboard sin datos honestos no es un dashboard, es decoración 🎨",
  "¡Listo! Sin filtros, sin maquillaje, con datos reales. Así se hace 💯",
  "¡Anotado! La diferencia entre datos e información eres exactamente tú: tu perspectiva 🧠",
  "¡Guardado! Los mejores insights vienen de la realidad, no del wishful thinking 🔍",
  "¡Capturado! Cada respuesta cierra una brecha... aunque sea chiquita. Las brechas chiquitas importan 🔧",
  "¡Dato recibido! La madurez no se decreta, se diagnostica. Así como tú lo estás haciendo 🔬",
  "¡Perfecto! Cuando todos respondan así, el análisis de IA va a tener material de calidad 🏆",
  "¡Registrado! La calidad de un diagnóstico es proporcional a la honestidad de sus respuestas 📏",
  // ── Lote 2 — jerga técnica con humor ──
  "¡Al data lake! El que importa... el del diagnóstico real, no el del servidor olvidado 🌊",
  "¡Guardado! Si el gobierno de datos fuera tan sencillo como responder esto... 😄",
  "¡Registrado! Cada respuesta es un KPI que va directo al tablero de Grupo Rica ⚡",
  "¡Al repositorio! Tu respuesta pasó todos los controles de calidad... incluso los manuales 🏅",
  "¡Listo! Más valioso que un report en tiempo real: un diagnóstico que diga la verdad ✨",
  "¡Anotado! Dato ingresado, validado y libre de duplicados. Como debería ser siempre 🧹",
  "¡Capturado! Si esto fuera un pipeline, acabas de pasar la validación de calidad con éxito ✅",
  "¡Registrado! Aquí no hay nulls ni valores vacíos. Respuesta completa, diagnóstico feliz 🎉",
  "¡Guardado! Esto va al análisis. No al archivo compartido que nadie abre 📂✨",
  "¡Sumado! Un solo dato bien tomado vale más que un lago lleno de basura 💎",
  // ── Lote 3 — avance por módulos ──
  "¡Avanzamos! Cada sección que completas es un nivel de madurez que se revela 🎯",
  "¡Capturado! Spoiler: el próximo módulo tiene preguntas igual de interesantes 😉",
  "¡Sumado al análisis! La madurez de datos es un viaje y acabas de dar un paso más 🗺️",
  "¡Registrado! Cuando este diagnóstico cierre, Grupo Rica tendrá su mapa del tesoro 🗺️✨",
  "¡Avanzamos! ¿Ves? La analítica no duele cuando tú eres el dato 😊",
  "¡Listo! Las decisiones data-driven empiezan exactamente así: con alguien que responde con verdad 🎯",
  "¡Registrado! Oficialmente más informado que el 80% de los servidores que nadie monitorea 📡",
  "¡Capturado! Incluso los pipelines más avanzados empezaron con una primera respuesta 🚀",
  "¡Guardado! Si este fuera un sprint de datos, acabas de cerrar una historia de usuario con éxito 🏃",
  "¡Perfecto! El pipeline sigue fluyendo. Tú eres la fuente y estás funcionando perfecto 🌊⚡",
  // ── Lote 4 — impacto real y cultura ──
  "¡Perfecto! Aquí no hay respuestas malas, solo oportunidades de mejora con nombre y apellido 💡",
  "¡Anotado! Los datos sin contexto son ruido. Tus respuestas son música 🎵",
  "¡Capturado! Algún día un dashboard hermoso mostrará el impacto de este momento 📈",
  "¡Sumado! No existe IA que mejore sin datos de calidad... y acabas de aportar los tuyos 🤖",
  "¡Anotado! En Grupo Rica los datos se tratan con cariño... como acabas de hacer tú 💙",
  "¡Registrado! Esto es gobernanza en acción: registrar, documentar y nunca olvidar 📋",
  "¡Sumado! Los KPIs empiezan aquí: con alguien que se tomó el tiempo de responder con honestidad ⏱️",
  "¡Dato anotado! Cada respuesta es una semilla en el jardín de la cultura de datos 🌱",
  "¡Guardado! Medir es poder. Y tú acabas de sumarle poder al diagnóstico de Rica 💪",
  "¡Registrado! El modelo de IA que analizará esto agradece profundamente tu honestidad 🤝",
  // ── Lote 5 — guiños de analista con humor ──
  "¡Anotado! Esto es lo que los consultores llaman 'dato primario de calidad'. Sin pagar consultoría 😄",
  "¡Capturado! No todos los héroes usan capa. Algunos responden encuestas de madurez de datos 🦸",
  "¡Perfecto! Si cada área respondiera así, los comités de datos serían reuniones cortas 🙌",
  "¡Registrado! En algún lugar, un analista acaba de sonreír sin saber por qué 😊",
  "¡Guardado! La diferencia entre un dato y un insight eres tú, que lo viviste en el día a día 🌟",
  "¡Capturado! Este dato no va a dormir en un Excel olvidado. Va a transformar algo real 💥",
  "¡Anotado! Respuesta que no está en el sistema no existe. Esta ya existe y cuenta 📌",
  "¡Registrado! Datos como estos son los que hacen que los reportes ejecutivos valgan la pena leer 📑",
  "¡Guardado! En el mundo de los datos, el que no mide no mejora... y tú acabas de medir 📐",
  "¡Dato guardado! Esto es exactamente lo que separa una empresa que usa datos de una que los acumula 🗂️",
]

function ByTIBot({ mensaje, seccionActual = 0, totalSecciones = 1, reaccion }: {
  mensaje?: string
  seccionActual?: number
  totalSecciones?: number
  reaccion?: string | null
}) {
  const [visible, setVisible] = useState(true)
  const [animKey, setAnimKey] = useState(0)
  const [textoActual, setTextoActual] = useState('')

  const idx = Math.min(
    Math.round((seccionActual / Math.max(totalSecciones - 1, 1)) * (MENSAJES_ENCUESTA.length - 1)),
    MENSAJES_ENCUESTA.length - 1
  )

  useEffect(() => {
    setTextoActual(mensaje ?? MENSAJES_ENCUESTA[idx])
    setVisible(true)
    setAnimKey(k => k + 1)
  }, [seccionActual, mensaje])

  useEffect(() => {
    if (!reaccion) return
    setTextoActual(reaccion.replace(/_\d+$/, ''))
    setVisible(true)
    setAnimKey(k => k + 1)
  }, [reaccion])

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
            {textoActual}
          </p>
          <p style={{ fontSize: 11, color: '#003087', fontWeight: 700, margin: '6px 0 0 0' }}>byTI</p>
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
        style={{
          background: '#fff',
          border: '2px solid #e8eef8',
          borderRadius: 20,
          cursor: 'pointer',
          padding: '6px 10px 0 10px',
          boxShadow: '0 4px 20px rgba(0,48,135,0.18)',
          display: 'flex',
          alignItems: 'flex-end',
          overflow: 'hidden',
        }}
        title="byTI"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/byti-laptop.png"
          alt="byTI"
          style={{ width: 110, height: 'auto', display: 'block' }}
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
