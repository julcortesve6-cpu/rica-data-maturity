'use client'

import { useState, useTransition } from 'react'
import { generarAnalisis } from '@/app/actions/analisis'
import { toast } from 'sonner'
import {
  Users, Calendar, Sparkles, RefreshCw,
  ChevronDown, ChevronUp, MessageSquare, User, Building2, Briefcase, BarChart2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Props {
  encuestaId: string
  secciones: any[]
  respuestas: any[]
  analisisExistente: string | null
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DATOS_SECTION = 'Datos de quien diligencia'

// ─── Cálculo de puntuaciones ─────────────────────────────────────────────────

const VALOR_MAP: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 }

function calcularPuntuaciones(secciones: any[], respuestas: any[]) {
  return secciones
    .filter((sec: any) => sec.titulo !== DATOS_SECTION)
    .map(sec => {
      const pregsEscala = (sec.preguntas ?? []).filter((p: any) => p.tipo === 'escala_ad')
      if (pregsEscala.length === 0) return null

      let sumaPregs = 0
      let numPregs = 0
      for (const preg of pregsEscala) {
        const vals: number[] = []
        for (const r of respuestas) {
          const det = (r.respuestas_detalle ?? []).find((d: any) => d.pregunta_id === preg.id)
          if (det?.valor_seleccionado && VALOR_MAP[det.valor_seleccionado] !== undefined) {
            vals.push(VALOR_MAP[det.valor_seleccionado])
          }
        }
        if (vals.length > 0) {
          sumaPregs += vals.reduce((a, b) => a + b, 0) / vals.length
          numPregs++
        }
      }
      return {
        titulo: sec.titulo,
        score: numPregs > 0 ? sumaPregs / numPregs : 0,
      }
    })
    .filter(Boolean) as { titulo: string; score: number }[]
}

function nivelMadurez(score: number) {
  if (score >= 3.5) return { label: 'Optimizado', color: '#059669', bg: '#d1fae5' }
  if (score >= 2.5) return { label: 'Gestionado', color: '#003087', bg: '#dbeafe' }
  if (score >= 1.5) return { label: 'En desarrollo', color: '#d97706', bg: '#fef3c7' }
  return { label: 'Inicial', color: '#E31837', bg: '#fee2e2' }
}

// ─── Radar Chart SVG ─────────────────────────────────────────────────────────

function RadarChart({ puntuaciones }: { puntuaciones: { titulo: string; score: number }[] }) {
  const N = puntuaciones.length
  if (N < 3) return null

  const CX = 220, CY = 200, R = 120
  const LABEL_R = R + 50
  const LEVELS = [1, 2, 3, 4]

  const angle = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2

  const toXY = (i: number, val: number) => ({
    x: CX + (val / 4) * R * Math.cos(angle(i)),
    y: CY + (val / 4) * R * Math.sin(angle(i)),
  })

  const polygonPoints = (val: number) =>
    Array.from({ length: N }, (_, i) => {
      const pt = toXY(i, val)
      return `${pt.x},${pt.y}`
    }).join(' ')

  const dataPoints = puntuaciones.map((p, i) => toXY(i, p.score))
  const dataPolygon = dataPoints.map(pt => `${pt.x},${pt.y}`).join(' ')

  const labelPos = (i: number) => {
    const ang = angle(i)
    const x = CX + LABEL_R * Math.cos(ang)
    const y = CY + LABEL_R * Math.sin(ang)
    const anchor = Math.abs(Math.cos(ang)) < 0.15 ? 'middle' : Math.cos(ang) > 0 ? 'start' : 'end'
    return { x, y, anchor }
  }

  // Short label per dimension
  const shortLabel = (titulo: string) => {
    if (titulo.includes('Gobierno')) return 'Gobierno'
    if (titulo.includes('Calidad')) return 'Calidad'
    if (titulo.includes('Inteligencia') || titulo.includes('BI') || titulo.includes('Negocio')) return 'BI'
    if (titulo.includes('Cultura')) return 'Cultura'
    if (titulo.includes('Innovaci')) return 'Innovación'
    return titulo.split(' ')[0]
  }

  return (
    <svg viewBox="0 0 440 400" className="w-full max-w-sm mx-auto">
      {/* Grid levels */}
      {LEVELS.map(lv => (
        <polygon
          key={lv}
          points={polygonPoints(lv)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={lv === 4 ? 1.5 : 1}
        />
      ))}
      {/* Level labels */}
      {LEVELS.map(lv => (
        <text key={`lv-${lv}`} x={CX + 4} y={CY - (lv / 4) * R - 3} fontSize="8" fill="#9ca3af">
          {lv}
        </text>
      ))}

      {/* Axes */}
      {Array.from({ length: N }, (_, i) => {
        const end = toXY(i, 4)
        return <line key={i} x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="#e5e7eb" strokeWidth="1" />
      })}

      {/* Data polygon */}
      <polygon
        points={dataPolygon}
        fill="#003087"
        fillOpacity="0.18"
        stroke="#003087"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="5" fill="#003087" stroke="white" strokeWidth="1.5" />
      ))}

      {/* Score labels on points */}
      {dataPoints.map((pt, i) => (
        <text
          key={`sc-${i}`}
          x={pt.x}
          y={pt.y - 9}
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="#003087"
        >
          {puntuaciones[i].score.toFixed(1)}
        </text>
      ))}

      {/* Axis labels */}
      {puntuaciones.map((p, i) => {
        const lp = labelPos(i)
        return (
          <text
            key={`lbl-${i}`}
            x={lp.x}
            y={lp.y}
            textAnchor={lp.anchor as any}
            dominantBaseline="middle"
            fontSize="11"
            fontWeight="600"
            fill="#374151"
          >
            {shortLabel(p.titulo)}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ResultadosView({ encuestaId, secciones, respuestas, analisisExistente }: Props) {
  const [analisis, setAnalisis] = useState(analisisExistente)
  const [isPending, startTransition] = useTransition()
  const [expandidaSec, setExpandidaSec] = useState<string | null>(null)
  const [expandidaEmp, setExpandidaEmp] = useState<string | null>(null)

  // Identificar sección y preguntas de datos de quien diligencia
  const datosSection = secciones.find((s: any) => s.titulo === DATOS_SECTION)
  const datosQIds = new Set<string>((datosSection?.preguntas ?? []).map((p: any) => p.id))
  const dirQId = datosSection?.preguntas?.find((p: any) => p.texto === 'Dirección')?.id
  const rolQId = datosSection?.preguntas?.find((p: any) => p.texto === 'Rol')?.id

  const getMeta = (r: any) => ({
    direccion: (r.respuestas_detalle ?? []).find((d: any) => d.pregunta_id === dirQId)?.valor_seleccionado ?? null,
    rol: (r.respuestas_detalle ?? []).find((d: any) => d.pregunta_id === rolQId)?.valor_seleccionado ?? null,
  })

  // Conteo por área y por rol
  const areaConteo = respuestas.reduce<Record<string, number>>((acc, r: any) => {
    const { direccion } = getMeta(r)
    if (direccion) acc[direccion] = (acc[direccion] ?? 0) + 1
    return acc
  }, {})
  const areaEntries = Object.entries(areaConteo).sort(([, a], [, b]) => b - a)

  const rolConteo = respuestas.reduce<Record<string, number>>((acc, r: any) => {
    const { rol } = getMeta(r)
    if (rol) acc[rol] = (acc[rol] ?? 0) + 1
    return acc
  }, {})
  const rolEntries = Object.entries(rolConteo).sort(([, a], [, b]) => b - a)

  const puntuaciones = calcularPuntuaciones(secciones, respuestas)
  const scoreGlobal = puntuaciones.length > 0
    ? puntuaciones.reduce((a, p) => a + p.score, 0) / puntuaciones.length
    : 0
  const nivelGlobal = nivelMadurez(scoreGlobal)

  function handleGenerarAnalisis() {
    startTransition(async () => {
      toast.loading('Generando análisis con IA...', { id: 'analisis' })
      const result = await generarAnalisis(encuestaId)
      toast.dismiss('analisis')
      if (result.error) {
        toast.error(result.error)
      } else {
        setAnalisis(result.analisis ?? null)
        toast.success('Análisis generado correctamente')
      }
    })
  }

  // Mapa de preguntas
  const preguntaMap = new Map<string, any>()
  for (const sec of secciones) {
    for (const p of sec.preguntas) preguntaMap.set(p.id, { ...p, seccionTitulo: sec.titulo })
  }

  // Distribución — excluir sección de datos demográficos
  const distribucion = secciones
    .filter((sec: any) => sec.titulo !== DATOS_SECTION)
    .map(sec => {
      const preguntas = sec.preguntas.map((p: any) => {
        const conteos: Record<string, number> = {}
        for (const r of respuestas) {
          const det = (r.respuestas_detalle ?? []).find((d: any) => d.pregunta_id === p.id)
          if (det?.valor_seleccionado) {
            conteos[det.valor_seleccionado] = (conteos[det.valor_seleccionado] ?? 0) + 1
          }
        }
        return { ...p, conteos }
      })
      return { ...sec, preguntas }
    })

  return (
    <div className="space-y-6">
      {/* Stats rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBadge label="Respondentes" value={respuestas.length} color="blue" />
        <StatBadge label="Secciones" value={secciones.length} color="gray" />
        <StatBadge
          label="Total preguntas"
          value={secciones.reduce((a, s) => a + s.preguntas.length, 0)}
          color="gray"
        />
        <StatBadge
          label="Último envío"
          value={respuestas[0] ? new Date(respuestas[0].fecha_respuesta).toLocaleDateString('es-DO') : '—'}
          color="green"
          isText
        />
      </div>

      {/* ── Gráfica de madurez ──────────────────────────────────── */}
      {respuestas.length > 0 && puntuaciones.length >= 3 && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Índice de Madurez de Datos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Escala 1 (Inicial) → 4 (Optimizado)</p>
          </div>
          <div className="p-5 flex flex-col md:flex-row items-center gap-8">
            {/* Radar */}
            <div className="w-full md:w-1/2">
              <RadarChart puntuaciones={puntuaciones} />
            </div>

            {/* Scores por dimensión */}
            <div className="w-full md:w-1/2 space-y-4">
              {/* Score global */}
              <div
                className="rounded-xl p-4 flex items-center gap-4"
                style={{ background: nivelGlobal.bg }}
              >
                <div className="text-center min-w-[60px]">
                  <p className="text-3xl font-bold" style={{ color: nivelGlobal.color }}>
                    {scoreGlobal.toFixed(1)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: nivelGlobal.color }}>
                    / 4.0
                  </p>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Madurez Global</p>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: nivelGlobal.color, color: 'white' }}
                  >
                    {nivelGlobal.label}
                  </span>
                </div>
              </div>

              {/* Score por dimensión */}
              <div className="space-y-2.5">
                {puntuaciones.map((p, i) => {
                  const nv = nivelMadurez(p.score)
                  const pct = (p.score / 4) * 100
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[180px]">{p.titulo}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold" style={{ color: nv.color }}>{p.score.toFixed(1)}</span>
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: nv.bg, color: nv.color }}
                          >
                            {nv.label}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: nv.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Leyenda niveles */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-100">
                {[
                  { label: '1 — Inicial', color: '#E31837' },
                  { label: '2 — En desarrollo', color: '#d97706' },
                  { label: '3 — Gestionado', color: '#003087' },
                  { label: '4 — Optimizado', color: '#059669' },
                ].map(lv => (
                  <div key={lv.label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: lv.color }} />
                    <span className="text-[10px] text-gray-500">{lv.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabla de respondentes ────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#003087]" />
            Respondentes ({respuestas.length})
          </h2>
        </div>
        {respuestas.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Aún no hay respuestas para esta encuesta
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {respuestas.map((r: any) => {
              const isOpen = expandidaEmp === r.id
              const meta = getMeta(r)
              return (
                <div key={r.id}>
                  <button
                    onClick={() => setExpandidaEmp(isOpen ? null : r.id)}
                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50/70 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#003087]/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#003087]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.nombre_empleado}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.codigo_empleado}</p>
                    </div>
                    {(meta.direccion || meta.rol) && (
                      <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        {meta.direccion && (
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-100">
                            {meta.direccion}
                          </span>
                        )}
                        {meta.rol && (
                          <span className="text-xs px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full font-medium border border-violet-100">
                            {meta.rol}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 shrink-0 hidden sm:flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(r.fecha_respuesta).toLocaleDateString('es-DO', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium shrink-0">
                      Completada
                    </span>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />
                    }
                  </button>

                  {isOpen && (
                    <div className="bg-gray-50/60 border-t border-gray-100 px-5 py-4 space-y-3">
                      {/* Datos demográficos prominentes */}
                      {(meta.direccion || meta.rol) && (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-100 mb-4">
                          <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="flex items-center gap-2 flex-wrap">
                            {meta.direccion && (
                              <span className="text-sm font-semibold text-blue-800">{meta.direccion}</span>
                            )}
                            {meta.rol && (
                              <span className="text-xs px-2.5 py-1 bg-violet-100 text-violet-800 rounded-full font-medium">
                                {meta.rol}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Respuestas de {r.nombre_empleado}
                      </p>
                      {(r.respuestas_detalle ?? [])
                        .filter((det: any) => !datosQIds.has(det.pregunta_id))
                        .map((det: any) => {
                          const pregunta = preguntaMap.get(det.pregunta_id)
                          if (!pregunta) return null
                          return (
                            <div key={det.id} className="bg-white rounded-lg border border-gray-100 p-3">
                              <p className="text-xs text-gray-400 mb-0.5">{pregunta.seccionTitulo}</p>
                              <p className="text-sm text-gray-700 font-medium mb-2">{pregunta.texto}</p>
                              {det.valor_seleccionado && (
                                <div className="flex items-start gap-2 flex-wrap">
                                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-md ${
                                    det.valor_seleccionado === 'A' ? 'bg-blue-100 text-blue-700'
                                    : det.valor_seleccionado === 'B' ? 'bg-blue-50 text-blue-500'
                                    : det.valor_seleccionado === 'C' ? 'bg-amber-100 text-amber-700'
                                    : det.valor_seleccionado === 'D' ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {det.valor_seleccionado}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    {pregunta.opciones_json
                                      ? pregunta.opciones_json.find((o: any) => o.valor === det.valor_seleccionado)?.etiqueta ?? det.valor_seleccionado
                                      : det.valor_seleccionado
                                    }
                                  </span>
                                </div>
                              )}
                              {det.texto_justificacion?.trim() && (
                                <div className="mt-2 flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-100 rounded-md">
                                  <MessageSquare className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                  <p className="text-xs text-amber-800 italic">{det.texto_justificacion}</p>
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Participación por área ──────────────────────────────── */}
      {areaEntries.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#003087]" />
              Participación por área y rol
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{respuestas.length} respondentes en total</p>
          </div>
          <div className="p-5 grid md:grid-cols-2 gap-6">
            {/* Por área */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Dirección
              </p>
              <div className="space-y-2.5">
                {areaEntries.map(([area, count]) => {
                  const pct = Math.round((count / respuestas.length) * 100)
                  return (
                    <div key={area} className="flex items-center gap-3">
                      <span className="text-xs text-gray-700 w-36 truncate shrink-0">{area}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-[#003087] transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right shrink-0">
                        {count} ({pct}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Por rol */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Rol
              </p>
              <div className="space-y-2.5">
                {rolEntries.map(([rol, count]) => {
                  const pct = Math.round((count / respuestas.length) * 100)
                  return (
                    <div key={rol} className="flex items-center gap-3">
                      <span className="text-xs text-gray-700 w-36 truncate shrink-0">{rol}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-violet-500 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right shrink-0">
                        {count} ({pct}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Distribución por sección ─────────────────────────────── */}
      {respuestas.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#003087]" />
            Distribución de respuestas
          </h2>
          {distribucion.map((sec: any) => (
            <div key={sec.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                onClick={() => setExpandidaSec(expandidaSec === sec.id ? null : sec.id)}
              >
                <span className="font-semibold text-gray-900 text-sm">{sec.titulo}</span>
                {expandidaSec === sec.id
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </button>
              {expandidaSec === sec.id && (
                <div className="border-t border-gray-100 p-5 space-y-4">
                  {sec.preguntas.map((p: any, idx: number) => (
                    <div key={p.id}>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        <span className="text-gray-400 text-xs mr-1">{idx + 1}.</span>
                        {p.texto}
                      </p>
                      {p.tipo === 'texto_libre' ? (
                        <p className="text-xs text-gray-400 italic">Pregunta de texto abierto</p>
                      ) : Object.keys(p.conteos).length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Sin respuestas aún</p>
                      ) : (
                        <div className="space-y-1.5">
                          {['A', 'B', 'C', 'D'].map(v => {
                            const count = p.conteos[v] ?? 0
                            const pct = Math.round((count / respuestas.length) * 100)
                            return (
                              <div key={v} className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-400 w-5">{v}</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-2 rounded-full transition-all"
                                    style={{
                                      width: `${pct}%`,
                                      background: v === 'A' ? '#003087' : v === 'B' ? '#0047b3' : v === 'C' ? '#f59e0b' : '#E31837'
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 w-16 text-right">{count} ({pct}%)</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Análisis IA ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E31837]" />
            Análisis experto con IA
          </h2>
          <button
            onClick={handleGenerarAnalisis}
            disabled={isPending || respuestas.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#003087] hover:bg-[#001f5b] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isPending
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generando...</>
              : analisis
                ? <><RefreshCw className="w-3.5 h-3.5" />Regenerar análisis</>
                : <><Sparkles className="w-3.5 h-3.5" />Generar análisis</>
            }
          </button>
        </div>
        <div className="p-5">
          {!analisis ? (
            <div className="py-10 text-center">
              <Sparkles className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">
                {respuestas.length === 0
                  ? 'Necesitas al menos una respuesta para generar el análisis'
                  : 'Genera el análisis experto con Claude para obtener diagnóstico, brechas y recomendaciones'}
              </p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-600 prose-li:text-gray-600 prose-strong:text-gray-800">
              <ReactMarkdown>{analisis}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBadge({ label, value, color, isText }: {
  label: string, value: number | string, color: string, isText?: boolean
}) {
  const colors: Record<string, string> = {
    blue: 'text-[#003087]',
    green: 'text-emerald-700',
    gray: 'text-gray-700',
  }
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <p className={`font-bold ${isText ? 'text-base' : 'text-2xl'} ${colors[color]}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
