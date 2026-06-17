'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

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
            <div className="w-40 h-40 bg-white rounded-3xl flex items-center justify-center shadow-xl overflow-hidden">
              <Image src="/logo-rica.jpeg" alt="Rica" width={160} height={160} className="object-contain" />
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
              { label: 'Gobierno', icon: '🏛️' },
              { label: 'Calidad', icon: '✅' },
              { label: 'Cultura', icon: '🧠' },
              { label: 'Analítica', icon: '📊' },
              { label: 'Innovación', icon: '🚀' },
              { label: 'IA', icon: '✨' },
            ].map(({ label, icon }) => (
              <div
                key={label}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-3 text-center hover:bg-white/15 transition-colors"
              >
                <span className="text-lg block mb-1">{icon}</span>
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
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow overflow-hidden border border-gray-100">
              <Image src="/logo-rica.jpeg" alt="Rica" width={40} height={40} className="object-contain" />
            </div>
            <span className="text-[#003087] font-bold text-xl">Rica</span>
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
