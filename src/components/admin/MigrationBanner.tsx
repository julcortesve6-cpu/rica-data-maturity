'use client'

import { useState } from 'react'
import { AlertTriangle, Copy, CheckCircle2, X, Zap, Loader2, ExternalLink } from 'lucide-react'

const SQL = `ALTER TABLE public.encuestas ADD COLUMN IF NOT EXISTS categoria text;`

export default function MigrationBanner({ visible }: { visible: boolean }) {
  const [copied, setCopied] = useState(false)
  const [copiedPat, setCopiedPat] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [needsPat, setNeedsPat] = useState(false)
  const [migrateError, setMigrateError] = useState<string | null>(null)

  if (!visible || dismissed) return null

  function handleCopy() {
    navigator.clipboard.writeText(SQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handleCopyPat(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedPat(true)
    setTimeout(() => setCopiedPat(false), 2500)
  }

  async function handleRunMigration() {
    setRunning(true)
    setMigrateError(null)
    setNeedsPat(false)
    try {
      const res = await fetch('/api/admin/migrate', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setDone(true)
        setTimeout(() => window.location.reload(), 1200)
      } else if (json.needsPat) {
        setNeedsPat(true)
      } else {
        setMigrateError(json.error ?? 'Error desconocido')
      }
    } catch {
      setMigrateError('No se pudo conectar.')
    } finally {
      setRunning(false)
    }
  }

  if (done) {
    return (
      <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-700 text-sm font-medium">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        Migración ejecutada. Recargando...
      </div>
    )
  }

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-800 mb-1">Migración pendiente — columna de categorías</p>

          {!needsPat && (
            <>
              <p className="text-xs text-amber-700 mb-3">
                La columna <code className="bg-amber-100 px-1 rounded">categoria</code> no existe en la base de datos.
              </p>
              <button
                onClick={handleRunMigration}
                disabled={running}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {running ? 'Ejecutando...' : 'Ejecutar migración automáticamente'}
              </button>
              {migrateError && (
                <p className="mt-2 text-xs text-red-700">{migrateError}</p>
              )}
            </>
          )}

          {/* Instrucciones PAT cuando el automático falla */}
          {needsPat && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-amber-800">
                Sigue estos 4 pasos para desbloquear la migración:
              </p>

              {/* Paso 1 */}
              <div className="bg-white border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-900 mb-1">Paso 1 — Obtener un token de Supabase</p>
                <p className="text-xs text-amber-700 mb-2">
                  Entra a Supabase con tu cuenta (<strong>ronalito18@gmail.com</strong>) y ve a:
                </p>
                <a
                  href="https://supabase.com/dashboard/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  supabase.com → Account → Access Tokens
                </a>
                <p className="text-xs text-amber-600 mt-2">
                  Haz clic en <strong>"Generate new token"</strong>, ponle nombre <em>Rica</em> y copia el token generado.
                </p>
              </div>

              {/* Paso 2 */}
              <div className="bg-white border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-900 mb-1">Paso 2 — Agregar el token en Vercel</p>
                <p className="text-xs text-amber-700 mb-2">
                  Entra a Vercel y ve a la configuración de variables de entorno:
                </p>
                <a
                  href="https://vercel.com/videonet-s-projects/rica-data-maturity/settings/environment-variables"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Abrir Vercel → Environment Variables
                </a>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-amber-700">Crea una nueva variable:</p>
                  <div className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1 font-mono text-xs">
                    <span>Key: <strong>SUPABASE_PAT</strong></span>
                    <button onClick={() => handleCopyPat('SUPABASE_PAT')} className="ml-1 p-0.5 rounded hover:bg-gray-200">
                      {copiedPat ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-gray-500" />}
                    </button>
                  </div>
                  <p className="text-xs text-amber-600">Value: <em>el token que copiaste en el paso 1</em></p>
                  <p className="text-xs text-amber-600">Marca los 3 entornos: Production, Preview, Development → Save.</p>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="bg-white border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-900 mb-1">Paso 3 — Reiniciar</p>
                <p className="text-xs text-amber-700">
                  Después de guardar en Vercel, vuelve aquí y haz clic en el botón de abajo.
                </p>
              </div>

              <button
                onClick={handleRunMigration}
                disabled={running}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {running ? 'Ejecutando...' : 'Reintentar migración'}
              </button>
            </div>
          )}

          {/* SQL manual siempre disponible como último recurso */}
          <details className="mt-3 text-xs text-amber-700">
            <summary className="cursor-pointer hover:text-amber-900">Ver SQL manual (último recurso)</summary>
            <div className="mt-2 flex items-center gap-2 bg-amber-100 rounded-lg px-3 py-2 font-mono text-amber-900 break-all">
              <span className="flex-1">{SQL}</span>
              <button onClick={handleCopy} className="shrink-0 p-1 rounded hover:bg-amber-200">
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-600" />}
              </button>
            </div>
          </details>
        </div>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-amber-400 hover:text-amber-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
