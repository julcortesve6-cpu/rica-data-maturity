'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { crearEncuesta, crearEncuestaDesdeImport } from '@/app/actions/encuestas'
import { toast } from 'sonner'
import {
  FileSpreadsheet, Upload, Download, CheckCircle2,
  ChevronRight, AlertTriangle, X, Layers, HelpCircle,
  FileText, ToggleLeft, Hash, AlignLeft,
} from 'lucide-react'
import { CATEGORIAS } from '@/lib/categorias'

type Modo = 'manual' | 'excel'

interface ParsedSeccion {
  titulo: string
  descripcion: string | null
  orden: number
  preguntas: {
    texto: string
    ayuda: string | null
    tipo: string
    requerida: boolean
    opciones_json: any[] | null
  }[]
}

interface ParseResult {
  secciones: ParsedSeccion[]
  totalPreguntas: number
  advertencias: string[]
}

const TIPO_LABEL: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  escala_ad:       { label: 'Escala A-D',     color: 'bg-blue-50 text-blue-700',   icon: <Hash className="w-3 h-3" /> },
  opcion_multiple: { label: 'Opción múltiple', color: 'bg-violet-50 text-violet-700', icon: <Layers className="w-3 h-3" /> },
  texto_libre:     { label: 'Texto libre',     color: 'bg-gray-100 text-gray-600',  icon: <AlignLeft className="w-3 h-3" /> },
}

export default function NuevaEncuestaClient() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('manual')
  const [isPending, startTransition] = useTransition()

  // Manual form state
  const [tituloManual, setTituloManual] = useState('')
  const [descManual, setDescManual] = useState('')
  const [categoriaManual, setCategoriaManual] = useState('')

  // Excel import state
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [tituloExcel, setTituloExcel] = useState('')
  const [descExcel, setDescExcel] = useState('')
  const [categoriaExcel, setCategoriaExcel] = useState('')

  // ── Manual submit ──────────────────────────────────────────────────────
  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget as HTMLFormElement)
    startTransition(async () => {
      await crearEncuesta(fd)
    })
  }

  // ── Excel: parse file ──────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setParseResult(null)
    setParseError(null)
    setParsing(true)

    try {
      const fd = new FormData()
      fd.append('archivo', file)
      const res = await fetch('/api/import/encuesta', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok || json.error) {
        setParseError(json.error ?? 'Error al procesar el archivo.')
      } else {
        setParseResult(json)
        if (!tituloExcel) {
          setTituloExcel(file.name.replace(/\.xlsx?$/i, '').replace(/[_-]/g, ' '))
        }
      }
    } catch {
      setParseError('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setParsing(false)
    }
  }

  // ── Excel: create survey ───────────────────────────────────────────────
  function handleExcelSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parseResult || !tituloExcel.trim()) return

    startTransition(async () => {
      const result = await crearEncuestaDesdeImport(tituloExcel, descExcel, parseResult.secciones, categoriaExcel || null)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Encuesta creada desde Excel')
      router.push(`/admin/encuestas/${result.id}`)
    })
  }

  function resetFile() {
    setParseResult(null)
    setParseError(null)
    setFileName(null)
    setTituloExcel('')
    setCategoriaExcel('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nueva encuesta</h1>
        <p className="text-gray-500 text-sm mt-1">
          Crea una encuesta manualmente o importa la estructura desde una plantilla Excel
        </p>
      </div>

      {/* Toggle modo */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {([['manual', 'Crear manualmente'], ['excel', 'Importar desde Excel']] as [Modo, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              modo === m ? 'bg-white shadow-sm text-[#003087]' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {m === 'excel' && <FileSpreadsheet className="w-4 h-4" />}
            {label}
          </button>
        ))}
      </div>

      {/* ── Modo manual ─────────────────────────────────────────────────── */}
      {modo === 'manual' && (
        <form onSubmit={handleManualSubmit} className="bg-white border border-gray-100 rounded-2xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre de la encuesta <span className="text-[#E31837]">*</span>
            </label>
            <input
              name="titulo"
              required
              value={tituloManual}
              onChange={e => setTituloManual(e.target.value)}
              placeholder="Ej: Evaluación de Madurez de Datos 2026 — Finanzas"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción / Objetivo
            </label>
            <textarea
              name="descripcion"
              rows={4}
              value={descManual}
              onChange={e => setDescManual(e.target.value)}
              placeholder="Ej: Conocer cómo las áreas utilizan, gestionan y aprovechan los datos..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
            <select
              name="categoria"
              value={categoriaManual}
              onChange={e => setCategoriaManual(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all bg-white"
            >
              <option value="">Sin categoría</option>
              {CATEGORIAS.map(c => (
                <option key={c.value} value={c.value}>{c.value}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending || !tituloManual.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#003087] hover:bg-[#001f5b] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {isPending
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <ChevronRight className="w-4 h-4" />
              }
              Crear y configurar encuesta
            </button>
            <a href="/admin/dashboard" className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
              Cancelar
            </a>
          </div>
        </form>
      )}

      {/* ── Modo Excel ──────────────────────────────────────────────────── */}
      {modo === 'excel' && (
        <div className="space-y-5">
          {/* Paso 1: Descargar plantilla */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <span className="text-emerald-700 font-bold text-sm">1</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Descarga la plantilla Excel</p>
                <p className="text-sm text-gray-500 mb-4">
                  La plantilla incluye ejemplos de todos los tipos de pregunta y las instrucciones detalladas.
                  La sección «Datos de quien diligencia» se agrega automáticamente a toda encuesta.
                </p>
                <a
                  href="/api/template/encuesta"
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar Plantilla_Encuesta_Rica.xlsx
                </a>
              </div>
            </div>

            {/* Tipos de pregunta reference */}
            <div className="mt-5 pt-5 border-t border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tipos de pregunta disponibles</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { tipo: 'ESCALA_AD', desc: 'A=Óptimo · B=Bueno · C=Regular · D=Deficiente', icon: <Hash className="w-3.5 h-3.5" />, color: 'bg-blue-50 border-blue-100 text-blue-800' },
                  { tipo: 'OPCION_MULTIPLE', desc: 'Lista de opciones personalizadas', icon: <Layers className="w-3.5 h-3.5" />, color: 'bg-violet-50 border-violet-100 text-violet-800' },
                  { tipo: 'TEXTO_LIBRE', desc: 'Campo de respuesta abierta', icon: <AlignLeft className="w-3.5 h-3.5" />, color: 'bg-gray-50 border-gray-100 text-gray-700' },
                  { tipo: 'SI_NO', desc: 'Respuesta binaria Sí / No', icon: <ToggleLeft className="w-3.5 h-3.5" />, color: 'bg-amber-50 border-amber-100 text-amber-800' },
                  { tipo: 'ESCALA_1_5', desc: 'Valoración numérica del 1 al 5', icon: <Hash className="w-3.5 h-3.5" />, color: 'bg-rose-50 border-rose-100 text-rose-800' },
                  { tipo: 'Justificación', desc: 'Configurable por opción en cualquier tipo', icon: <HelpCircle className="w-3.5 h-3.5" />, color: 'bg-orange-50 border-orange-100 text-orange-800' },
                ].map(t => (
                  <div key={t.tipo} className={`border rounded-lg p-2.5 ${t.color}`}>
                    <div className="flex items-center gap-1.5 mb-0.5 font-semibold text-xs">{t.icon} {t.tipo}</div>
                    <p className="text-[11px] opacity-80 leading-tight">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Paso 2: Subir archivo */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <span className="text-[#003087] font-bold text-sm">2</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Sube el archivo completado</p>
                <p className="text-sm text-gray-500 mb-4">Sólo archivos .xlsx</p>

                {!fileName ? (
                  <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-[#003087]/40 hover:bg-blue-50/30 transition-all">
                    <Upload className="w-8 h-8 text-gray-300" />
                    <span className="text-sm text-gray-500 font-medium">Haz clic o arrastra el archivo aquí</span>
                    <span className="text-xs text-gray-400">.xlsx únicamente</span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 truncate">{fileName}</span>
                    <button onClick={resetFile} className="text-gray-400 hover:text-gray-600 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {parsing && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-[#003087] rounded-full animate-spin" />
                    Procesando archivo...
                  </div>
                )}

                {parseError && (
                  <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-0.5">No se pudo procesar el archivo</p>
                      <p>{parseError}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Paso 3: Preview y confirmar */}
          {parseResult && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <span className="text-violet-700 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-0.5">Confirma y crea la encuesta</p>
                  <p className="text-sm text-gray-500">
                    Se detectaron <strong>{parseResult.secciones.length} secciones</strong> y{' '}
                    <strong>{parseResult.totalPreguntas} preguntas</strong>.
                  </p>
                </div>
              </div>

              {/* Advertencias */}
              {parseResult.advertencias.length > 0 && (
                <div className="mb-5 p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Advertencias ({parseResult.advertencias.length})
                  </div>
                  <ul className="space-y-1">
                    {parseResult.advertencias.map((a, i) => (
                      <li key={i} className="text-xs text-amber-700">• {a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview acordeón de secciones */}
              <div className="space-y-2 mb-6 max-h-72 overflow-y-auto pr-1">
                {parseResult.secciones.map((sec, si) => (
                  <details key={si} className="group bg-gray-50 rounded-xl border border-gray-100">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 w-5">{si + 1}</span>
                        <span className="text-sm font-semibold text-gray-800">{sec.titulo}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{sec.preguntas.length} preguntas</span>
                    </summary>
                    <div className="px-4 pb-3 space-y-1.5 border-t border-gray-100 pt-2">
                      {sec.preguntas.map((p, pi) => {
                        const ti = TIPO_LABEL[p.tipo] ?? { label: p.tipo, color: 'bg-gray-100 text-gray-600', icon: <FileText className="w-3 h-3" /> }
                        return (
                          <div key={pi} className="flex items-start gap-2.5 py-1.5">
                            <span className="text-xs text-gray-400 w-5 shrink-0 mt-0.5">{pi + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-700 leading-snug">{p.texto}</p>
                            </div>
                            <span className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${ti.color}`}>
                              {ti.icon}{ti.label}
                            </span>
                            {!p.requerida && (
                              <span className="shrink-0 text-[10px] text-gray-400 border border-gray-200 rounded-md px-1.5 py-0.5">Opcional</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </details>
                ))}
              </div>

              {/* Formulario final */}
              <form onSubmit={handleExcelSubmit} className="space-y-4 border-t border-gray-100 pt-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nombre de la encuesta <span className="text-[#E31837]">*</span>
                  </label>
                  <input
                    required
                    value={tituloExcel}
                    onChange={e => setTituloExcel(e.target.value)}
                    placeholder="Nombre de la encuesta"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción (opcional)</label>
                  <textarea
                    rows={2}
                    value={descExcel}
                    onChange={e => setDescExcel(e.target.value)}
                    placeholder="Objetivo o contexto de la encuesta"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoría</label>
                  <select
                    value={categoriaExcel}
                    onChange={e => setCategoriaExcel(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all bg-white"
                  >
                    <option value="">Sin categoría</option>
                    {CATEGORIAS.map(c => (
                      <option key={c.value} value={c.value}>{c.value}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isPending || !tituloExcel.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#003087] hover:bg-[#001f5b] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    {isPending
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />
                    }
                    Crear encuesta desde Excel
                  </button>
                  <button type="button" onClick={resetFile} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
                    Cambiar archivo
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
