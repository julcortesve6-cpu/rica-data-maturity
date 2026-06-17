import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SQL = 'ALTER TABLE public.encuestas ADD COLUMN IF NOT EXISTS categoria text;'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/[^\x20-\x7E]/g, '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/[^\x20-\x7E]/g, '').trim()
  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? ''

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
    'apikey': key,
  }

  // Intento 1: pg_meta interno de Supabase (usado por el SQL Editor)
  try {
    const r1 = await fetch(`${url}/pg/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: SQL }),
    })
    if (r1.ok) return NextResponse.json({ success: true })
  } catch {}

  // Intento 2: endpoint alternativo de pg_meta
  try {
    const r2 = await fetch(`${url}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql: SQL }),
    })
    if (r2.ok) return NextResponse.json({ success: true })
  } catch {}

  // Intento 3: Management API con PAT (si está configurado en Vercel)
  const pat = (process.env.SUPABASE_PAT ?? '').trim()
  if (pat && projectRef) {
    try {
      const r3 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pat}` },
        body: JSON.stringify({ query: SQL }),
      })
      if (r3.ok) return NextResponse.json({ success: true })
      const t = await r3.text()
      return NextResponse.json({ error: `PAT configurado pero falló: ${t}`, needsPat: false }, { status: 500 })
    } catch {}
  }

  return NextResponse.json({ needsPat: true, projectRef }, { status: 500 })
}
