'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, Mail, Landmark, ShieldCheck, Users, BarChart2, Lightbulb, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(error.message)
        return
      }
      router.push('/admin/dashboard')
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 rica-gradient flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border border-white/30" />
          <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full border border-white/20" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full border border-white/30" />
        </div>
        <div className="relative z-10 text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              {/* Anillo exterior animado */}
              <div className="absolute -inset-4 rounded-full border border-white/20 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute -inset-2 rounded-full border border-white/30" />
              {/* Contenedor logo con glass effect */}
              <div className="relative w-36 h-36 rounded-full bg-white/10 backdrop-blur-md border border-white/30 shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                  <Image src="/logo-rica.jpeg" alt="Rica" width={96} height={96} className="object-contain" />
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-white text-3xl font-bold mb-4 leading-tight">
            Plataforma de Madurez<br />de Datos
          </h1>
          <p className="text-blue-200 text-base max-w-sm mx-auto leading-relaxed">
            Mide, analiza y mejora la cultura data-driven de tu organización con inteligencia artificial.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3 max-w-sm mx-auto">
            {[
              { label: 'Gobierno', Icon: Landmark },
              { label: 'Calidad', Icon: ShieldCheck },
              { label: 'Cultura', Icon: Users },
              { label: 'Analítica', Icon: BarChart2 },
              { label: 'Innovación', Icon: Lightbulb },
              { label: 'IA', Icon: Sparkles },
            ].map(({ label, Icon }) => (
              <div
                key={label}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-3 text-center hover:bg-white/15 transition-colors"
              >
                <Icon className="w-5 h-5 text-white/90 mx-auto mb-1.5" />
                <span className="text-white text-xs font-semibold tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#003087] to-[#E31837] opacity-20 blur-sm" />
              <div className="relative w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md overflow-hidden border border-gray-100">
                <Image src="/logo-rica.jpeg" alt="Rica" width={48} height={48} className="object-contain" />
              </div>
            </div>
            <div>
              <span className="text-[#003087] font-bold text-xl block leading-none">Rica</span>
              <span className="text-gray-400 text-xs">Madurez de Datos</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido</h2>
            <p className="text-gray-500 text-sm mb-8">Ingresa tus credenciales de administrador</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@rica.com.do"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 px-4 bg-[#003087] hover:bg-[#001f5b] disabled:opacity-60 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Ingresando...
                  </>
                ) : 'Ingresar'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2026 Grupo Rica · República Dominicana
          </p>
        </div>
      </div>
    </div>
  )
}
