'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { LayoutDashboard, PlusCircle, LogOut, BarChart3 } from 'lucide-react'

const nav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/encuestas/nueva', label: 'Nueva encuesta', icon: PlusCircle },
  { href: '/admin/analisis', label: 'Análisis de resultados', icon: BarChart3 },
]

export default function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/admin/login')
  }

  return (
    <aside className="rica-sidebar w-64 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-4 py-6 border-b border-white/10 flex justify-center">
        <div className="w-[66px] h-[66px] bg-white rounded-2xl flex items-center justify-center shadow overflow-hidden">
          <Image src="/logo-rica.jpeg" alt="Rica" width={66} height={66} className="object-contain" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-blue-300/60 text-xs font-semibold uppercase tracking-widest px-3 mb-3">
          Menú principal
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-white/15 text-white'
                  : 'text-blue-100/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}

      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#E31837] flex items-center justify-center text-white text-xs font-bold">
            {userEmail[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{userEmail}</p>
            <p className="text-blue-300/60 text-xs">Administrador</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100/70 hover:bg-white/8 hover:text-red-300 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
