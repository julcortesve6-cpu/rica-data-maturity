import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const TIPOS_VALIDOS = ['ESCALA_AD', 'OPCION_MULTIPLE', 'TEXTO_LIBRE', 'SI_NO', 'ESCALA_1_5']

function tipoToDb(tipo: string) {
  if (tipo === 'ESCALA_AD') return 'escala_ad'
  if (tipo === 'TEXTO_LIBRE') return 'texto_libre'
  return 'opcion_multiple'
}

function buildOpciones(tipo: string, opcionesRaw: string, justRaw: string) {
  const justOpts = justRaw ? justRaw.split('|').map(s => s.trim()).filter(Boolean) : []

  if (tipo === 'ESCALA_AD') {
    return [
      { valor: 'A', etiqueta: 'A — Óptimo', pide_justificacion: justOpts.includes('A') },
      { valor: 'B', etiqueta: 'B — Bueno', pide_justificacion: justOpts.includes('B') },
      { valor: 'C', etiqueta: 'C — Regular', pide_justificacion: justOpts.includes('C') },
      { valor: 'D', etiqueta: 'D — Deficiente', pide_justificacion: justOpts.includes('D') },
    ]
  }

  if (tipo === 'SI_NO') {
    return [
      { valor: 'Sí', etiqueta: 'Sí', pide_justificacion: justOpts.some(j => /^s[ií]/i.test(j)) },
      { valor: 'No', etiqueta: 'No', pide_justificacion: justOpts.some(j => /^no/i.test(j)) },
    ]
  }

  if (tipo === 'ESCALA_1_5') {
    return [1, 2, 3, 4, 5].map(n => ({
      valor: String(n),
      etiqueta: `${n}`,
      pide_justificacion: justOpts.includes(String(n)),
    }))
  }

  if (tipo === 'OPCION_MULTIPLE' && opcionesRaw) {
    const opts = opcionesRaw.split('|').map(s => s.trim()).filter(Boolean)
    return opts.map(o => ({ valor: o, etiqueta: o, pide_justificacion: justOpts.includes(o) }))
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('archivo') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    const sheetName = wb.SheetNames.find(n => n === 'Preguntas') ?? wb.SheetNames[1]
    if (!sheetName) {
      return NextResponse.json({ error: 'El archivo no tiene una hoja llamada "Preguntas".' }, { status: 422 })
    }

    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })

    // Encontrar fila de encabezados (contiene "Sección" o "#")
    const headerIdx = rows.findIndex(r =>
      r.some((c: any) => String(c).includes('Secci') || String(c).trim() === '#\nSección' || String(c).trim() === '#')
    )
    if (headerIdx === -1) {
      return NextResponse.json({ error: 'No se encontró la fila de encabezados en la hoja "Preguntas".' }, { status: 422 })
    }

    const dataRows = rows.slice(headerIdx + 1).filter(r =>
      r.some((c: any) => c !== null && c !== undefined && String(c).trim() !== '')
    )

    if (dataRows.length === 0) {
      return NextResponse.json({ error: 'La hoja "Preguntas" no tiene filas de datos.' }, { status: 422 })
    }

    // Map: secNum → { titulo, descripcion, orden, preguntas[] }
    const seccionesMap = new Map<string, any>()
    const seccionesOrder: string[] = []
    const errores: string[] = []

    for (const [rowIdx, row] of dataRows.entries()) {
      const lineNum = headerIdx + 2 + rowIdx

      const secNum    = String(row[0] ?? '').trim()
      const secNombre = String(row[1] ?? '').trim()
      const secDesc   = String(row[2] ?? '').trim()
      const _pregNum  = row[3]
      const pregTexto = String(row[4] ?? '').trim()
      const ayuda     = String(row[5] ?? '').trim()
      const tipoRaw   = String(row[6] ?? '').trim().toUpperCase()
      const requerida = String(row[7] ?? '').trim().toUpperCase() === 'SI'
      const opcionesR = String(row[8] ?? '').trim()
      const justR     = String(row[9] ?? '').trim()

      if (!pregTexto) continue

      if (!secNum || !secNombre && seccionesOrder.length === 0) {
        errores.push(`Fila ${lineNum}: falta número o nombre de sección.`)
        continue
      }

      if (!TIPOS_VALIDOS.includes(tipoRaw)) {
        errores.push(`Fila ${lineNum}: tipo "${tipoRaw}" no válido. Usa: ${TIPOS_VALIDOS.join(', ')}.`)
        continue
      }

      if (tipoRaw === 'OPCION_MULTIPLE' && !opcionesR) {
        errores.push(`Fila ${lineNum}: OPCION_MULTIPLE requiere valores en la columna "Opciones".`)
        continue
      }

      const secKey = secNum || `auto-${seccionesOrder.length}`
      if (!seccionesMap.has(secKey)) {
        const nombreSec = secNombre || (seccionesMap.size === 0 ? 'Sección 1' : `Sección ${secNum}`)
        seccionesMap.set(secKey, {
          titulo: nombreSec,
          descripcion: secDesc || null,
          orden: seccionesOrder.length + 1,
          preguntas: [],
        })
        seccionesOrder.push(secKey)
      } else if (secNombre && seccionesMap.get(secKey).titulo !== secNombre) {
        // Allow updating section title if repeated
        seccionesMap.get(secKey).titulo = secNombre
      }

      const seccion = seccionesMap.get(secKey)
      seccion.preguntas.push({
        texto: pregTexto,
        ayuda: ayuda || null,
        tipo: tipoToDb(tipoRaw),
        requerida,
        orden: seccion.preguntas.length,
        opciones_json: buildOpciones(tipoRaw, opcionesR, justR),
      })
    }

    if (errores.length > 0 && seccionesOrder.length === 0) {
      return NextResponse.json({ error: errores.join(' | ') }, { status: 422 })
    }

    const secciones = seccionesOrder.map(k => seccionesMap.get(k))
    const totalPreguntas = secciones.reduce((a, s) => a + s.preguntas.length, 0)

    return NextResponse.json({ secciones, totalPreguntas, advertencias: errores })
  } catch (err: any) {
    console.error('[import/encuesta]', err)
    return NextResponse.json({ error: 'No se pudo leer el archivo. Verifica que sea un Excel (.xlsx) válido.' }, { status: 500 })
  }
}
