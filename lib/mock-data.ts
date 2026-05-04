// Seeded PRNG (LCG) — garante os mesmos valores no server e no client
function createRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1)
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61)
    return ((s ^ (s >>> 14)) >>> 0) / 0x100000000
  }
}

const rng = createRng(20260504)

function seededBetween(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min
}

export type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'refunded'
export type PaymentMethod = 'Cartão' | 'MB WAY' | 'Multibanco' | 'SEPA'

export interface Payment {
  id: string
  customer: string
  email: string
  amount: number        // centavos de EUR
  status: PaymentStatus
  date: string
  product: string
  method: PaymentMethod
}

export interface DailySale {
  date: string     // "DD/MM" display label
  isoDate: string  // "YYYY-MM-DD" for filtering
  receita: number  // centavos de EUR
  vendas: number
  falhas: number
}

function formatDate(daysAgo: number) {
  const d = new Date('2026-05-04')
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

// Nomes portugueses de Portugal (PT-PT)
const names = [
  'Ana Silva',        'Carlos Santos',    'Fernanda Costa',   'Rafael Oliveira',
  'João Ferreira',    'Maria Rodrigues',  'Beatriz Alves',    'Pedro Mendes',
  'Inês Rocha',       'Tiago Nunes',      'Catarina Vieira',  'Rui Barbosa',
  'Sofia Cardoso',    'Miguel Pinto',     'Isabel Castro',    'Mateus Ribeiro',
  'Margarida Martins','Filipe Carvalho',  'Natália Gomes',    'Hugo Costa',
]

// Planos e produtos em EUR (Portugal)
const products = [
  'Plano Starter',   'Plano Pro',        'Plano Business',
  'Plano Enterprise','Add-on Analytics', 'Add-on Pixels',    'Créditos Extra',
]

const methods: PaymentMethod[] = ['Cartão', 'Cartão', 'MB WAY', 'MB WAY', 'Multibanco', 'SEPA']

const statuses: PaymentStatus[] = [
  'succeeded', 'succeeded', 'succeeded', 'succeeded', 'succeeded',
  'succeeded', 'succeeded', 'failed',    'pending',   'refunded',
]

export const recentPayments: Payment[] = Array.from({ length: 50 }, (_, i) => {
  const status  = statuses[seededBetween(0, statuses.length - 1)]
  // Preços típicos SaaS Portugal: €9,90 a €199,90 (em centavos)
  const amount  = seededBetween(990, 19990)
  const daysAgo = seededBetween(0, 29)
  const name    = names[seededBetween(0, names.length - 1)]
  const first   = name.split(' ')[0].toLowerCase()
  const domain  = seededBetween(0, 1) === 0 ? 'gmail.com' : 'outlook.pt'
  return {
    id:       `pay_${Math.floor(rng() * 0xffffffffffff).toString(36).padStart(10, '0')}`,
    customer: name,
    email:    `${first}@${domain}`,
    amount,
    status,
    date:     formatDate(daysAgo),
    product:  products[seededBetween(0, products.length - 1)],
    method:   methods[seededBetween(0, methods.length - 1)],
  }
}).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

export const dailySales: DailySale[] = Array.from({ length: 30 }, (_, i) => {
  const vendas  = seededBetween(8, 60)
  const falhas  = seededBetween(1, 8)
  // Ticket médio EUR: €15 a €120 por venda
  const receita = vendas * seededBetween(1500, 12000)
  const day     = new Date('2026-05-04')
  day.setDate(day.getDate() - (29 - i))
  const label   = `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`
  const isoDate = day.toISOString().split('T')[0]
  return { date: label, isoDate, receita, vendas, falhas }
})

const totalVendas   = dailySales.reduce((s, d) => s + d.vendas,  0)
const totalFalhas   = dailySales.reduce((s, d) => s + d.falhas,  0)
const totalReceita  = dailySales.reduce((s, d) => s + d.receita, 0)
const totalPag      = totalVendas + totalFalhas
const taxaConversao = ((totalVendas / totalPag) * 100).toFixed(1)

export const dashboardStats = {
  receitaTotal:       totalReceita,
  totalPagamentos:    totalPag,
  vendas:             totalVendas,
  falhas:             totalFalhas,
  taxaConversao:      parseFloat(taxaConversao),
  ticketMedio:        Math.floor(totalReceita / totalVendas),
  crescimentoReceita: 12.4,
  crescimentoVendas:  8.7,
}

// Re-exporta utilitários de moeda para compatibilidade
export { formatEUR, formatBRL, eurToBrlStr, EUR_TO_BRL_RATE } from '@/lib/utils/currency'
