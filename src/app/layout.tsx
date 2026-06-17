import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'RicaInsights — Evaluación de Madurez de Datos',
  description: 'Plataforma corporativa de evaluación de madurez de datos y cultura data-driven para Grupo Rica.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
