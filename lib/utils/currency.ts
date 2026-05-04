// Taxa de câmbio de referência — 1 EUR = R$ X
// Actualizar conforme necessidade; usado para conversão informativa
export const EUR_TO_BRL_RATE = 6.20

// IOF sobre compras internacionais com cartão (Brasil)
export const IOF_RATE = 0.0638

// Formata centavos de EUR para string — ex: 2990 → "29,90 €"
export function formatEUR(eurCents: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style:    'currency',
    currency: 'EUR',
  }).format(eurCents / 100)
}

// Formata centavos de BRL para string — ex: 18538 → "R$ 185,38"
export function formatBRL(brlCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
  }).format(brlCents / 100)
}

// Converte centavos de EUR para centavos de BRL
// includeIOF = true: adiciona IOF 6,38% (custo real p/ comprador BR)
export function eurToBrlCents(eurCents: number, includeIOF = false): number {
  const multiplier = includeIOF ? EUR_TO_BRL_RATE * (1 + IOF_RATE) : EUR_TO_BRL_RATE
  return Math.round(eurCents * multiplier)
}

// Converte centavos EUR e retorna string formatada em BRL
export function eurToBrlStr(eurCents: number, includeIOF = false): string {
  return formatBRL(eurToBrlCents(eurCents, includeIOF))
}
