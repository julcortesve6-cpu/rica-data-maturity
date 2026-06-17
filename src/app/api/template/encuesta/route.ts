import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const wb = XLSX.utils.book_new()

  // ── Hoja 1: Instrucciones ─────────────────────────────────────────────
  const instrucciones = [
    ['PLANTILLA DE ENCUESTA — GRUPO RICA', '', '', '', '', ''],
    [''],
    ['INSTRUCCIONES DE USO'],
    [''],
    ['1. Llena la hoja "Preguntas" con las secciones y preguntas de la encuesta.'],
    ['2. NO modifiques los encabezados de columna (fila 1 de la hoja Preguntas).'],
    ['3. TIPOS DE PREGUNTA disponibles:'],
    ['   • ESCALA_AD    → Opciones fijas: A (Óptimo), B (Bueno), C (Regular), D (Deficiente)'],
    ['   • OPCION_MULTIPLE → Opciones personalizadas. Define las opciones en la columna "Opciones".'],
    ['   • TEXTO_LIBRE  → Campo de texto libre. No requiere opciones.'],
    ['   • SI_NO        → Opciones Sí / No.'],
    ['   • ESCALA_1_5   → Escala numérica del 1 al 5.'],
    [''],
    ['4. Columna "Opciones": para OPCION_MULTIPLE, separa cada opción con el carácter | (pipe).'],
    ['   Ejemplo: Power BI|Tableau|Excel|Ninguna'],
    [''],
    ['5. Columna "Pide justificación en": escribe las opciones que deben solicitar justificación.'],
    ['   Sepáralas con | igual que las opciones.'],
    ['   Ejemplo para ESCALA_AD: C|D'],
    ['   Ejemplo para OPCION_MULTIPLE: Ninguna|Raramente'],
    [''],
    ['6. Columna "Requerida": escribe SI o NO.'],
    [''],
    ['7. Las secciones se agrupan automáticamente por el número de sección (columna 1).'],
    ['   Coloca el nombre de la sección sólo en la primera pregunta de cada sección.'],
    [''],
    ['NOTA: La sección "Datos de quien diligencia" (Dirección y Rol) se agrega automáticamente.'],
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instrucciones)
  wsInstr['!cols'] = [{ wch: 90 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

  // ── Hoja 2: Preguntas ─────────────────────────────────────────────────
  const headers = [
    '#\nSección',
    'Nombre Sección',
    'Descripción Sección\n(opcional)',
    '#\nPregunta',
    'Texto de la Pregunta',
    'Ayuda / Descripción\n(opcional)',
    'Tipo\n(ESCALA_AD / OPCION_MULTIPLE\n/ TEXTO_LIBRE / SI_NO / ESCALA_1_5)',
    'Requerida\n(SI / NO)',
    'Opciones\n(separar con |)\nSolo para OPCION_MULTIPLE',
    'Pide justificación en\n(separar con |)',
  ]

  const ejemplos = [
    [1, 'Gobierno de Datos', 'Evalúa el marco formal de gobierno de datos', 1,
      '¿Existe una política formal de gestión de datos documentada?',
      'Considera políticas escritas, comités y responsables asignados formalmente.',
      'ESCALA_AD', 'SI', '', 'C|D'],
    [1, '', '', 2,
      '¿Qué herramienta de visualización/BI utilizan principalmente?', '',
      'OPCION_MULTIPLE', 'SI', 'Power BI|Tableau|Excel|Google Data Studio|Ninguna', 'Ninguna'],
    [1, '', '', 3,
      '¿Tienen un catálogo de datos documentado y actualizado?', '',
      'SI_NO', 'SI', '', 'No'],
    [1, '', '', 4,
      '¿Cómo calificarías la madurez del gobierno de datos en tu área?', '',
      'ESCALA_1_5', 'SI', '', ''],
    [1, '', '', 5,
      'Describe los principales retos de gobierno de datos que enfrenta tu equipo.', '',
      'TEXTO_LIBRE', 'NO', '', ''],
    [2, 'Calidad de Datos', 'Evalúa procesos y prácticas de calidad', 1,
      '¿Con qué frecuencia se realizan auditorías de calidad de datos?', '',
      'ESCALA_AD', 'SI', '', 'C|D'],
    [2, '', '', 2,
      '¿Qué porcentaje de los datos considera de alta calidad?',
      'Basado en su percepción y experiencia actual.',
      'OPCION_MULTIPLE', 'SI', 'Menos del 25%|25% - 50%|51% - 75%|Más del 75%',
      'Menos del 25%|25% - 50%'],
    [3, 'Cultura Data-Driven', 'Mide adopción de cultura basada en datos', 1,
      '¿Las decisiones en tu área se basan principalmente en datos?', '',
      'ESCALA_AD', 'SI', '', 'C|D'],
    [3, '', '', 2,
      '¿Tu equipo recibe capacitación regular en analítica o datos?', '',
      'SI_NO', 'SI', '', 'No'],
  ]

  const wsData = [headers, ...ejemplos]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  ws['!cols'] = [
    { wch: 8 }, { wch: 22 }, { wch: 28 }, { wch: 9 },
    { wch: 52 }, { wch: 32 }, { wch: 20 }, { wch: 11 },
    { wch: 40 }, { wch: 32 },
  ]
  ws['!rows'] = [{ hpt: 50 }]

  XLSX.utils.book_append_sheet(wb, ws, 'Preguntas')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Plantilla_Encuesta_Rica.xlsx"',
      'Cache-Control': 'no-store',
    },
  })
}
