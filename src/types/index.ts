export type TipoPregunta = 'escala_ad' | 'texto_libre' | 'opcion_multiple'

export interface OpcionPregunta {
  valor: string
  label: string
  pide_justificacion: boolean
}

export interface Pregunta {
  id: string
  seccion_id: string
  texto: string
  ayuda?: string
  tipo: TipoPregunta
  opciones_json?: OpcionPregunta[]
  requerida: boolean
  orden: number
}

export interface Seccion {
  id: string
  encuesta_id: string
  titulo: string
  descripcion?: string
  orden: number
  preguntas?: Pregunta[]
}

export interface Encuesta {
  id: string
  titulo: string
  descripcion?: string
  token_publico: string
  creado_por: string
  activa: boolean
  fecha_creacion: string
  secciones?: Seccion[]
  _count?: { respuestas: number }
}

export interface RespuestaDetalle {
  pregunta_id: string
  valor_seleccionado: string
  texto_justificacion?: string
}

export interface RespuestaEmpleado {
  id: string
  encuesta_id: string
  nombre_empleado: string
  codigo_empleado: string
  completada: boolean
  fecha_respuesta?: string
  analisis_ia?: string
  respuestas_detalle?: RespuestaDetalle[]
}

export interface AnalisisSeccion {
  nombre: string
  puntaje: number
  diagnostico: string
  brechas: string[]
  recomendaciones: string[]
}

export interface AnalisisCompleto {
  puntaje_global: number
  nivel_madurez: string
  resumen_ejecutivo: string
  secciones: AnalisisSeccion[]
  prioridades: string[]
  proximos_pasos: string[]
}
