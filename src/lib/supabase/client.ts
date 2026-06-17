import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  // Eliminar cualquier carácter no-ASCII que pueda colarse por encoding del env var
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/[^\x20-\x7E]/g, '').trim()
  return createBrowserClient(url, key)
}
