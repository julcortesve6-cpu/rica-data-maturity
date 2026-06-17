export const CATEGORIAS = [
  {
    value: 'Gobierno, Datos e IA',
    color: 'bg-blue-50 text-[#003087] border-blue-100',
    dot: 'bg-[#003087]',
    tab: 'text-[#003087] border-[#003087]',
  },
  {
    value: 'Madurez de seguridad',
    color: 'bg-red-50 text-[#E31837] border-red-100',
    dot: 'bg-[#E31837]',
    tab: 'text-[#E31837] border-[#E31837]',
  },
  {
    value: 'NPS TI',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dot: 'bg-emerald-600',
    tab: 'text-emerald-700 border-emerald-600',
  },
  {
    value: 'Talento y Cultura',
    color: 'bg-violet-50 text-violet-700 border-violet-100',
    dot: 'bg-violet-600',
    tab: 'text-violet-700 border-violet-600',
  },
] as const

export type Categoria = typeof CATEGORIAS[number]['value']

export function getCategoriaStyle(value: string | null | undefined) {
  return CATEGORIAS.find(c => c.value === value) ?? null
}
