export type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'refunded' | 'processing' | 'disputed'
export type PaymentMethod = 'Cartão' | 'MB WAY' | 'Multibanco' | 'SEPA' | 'Pix' | 'Boleto'

export interface Payment {
  id: string
  customer: string
  email: string
  amount: number
  status: PaymentStatus
  date: string
  createdAt: string
  product: string
  method: PaymentMethod
  cardLast4: string
  cardBrand: string
  cardCountry: string
  riskLevel: string
  riskScore: number
  fee: number
  net: number
  stripeCustomerId: string
  balanceTxId: string
  refundedAmount: number
}

export interface PaymentsQuery {
  status?: PaymentStatus | 'all'
  search?: string
  start?: string
  end?: string
  page?: number
  limit?: number
  method?: PaymentMethod | 'all'
}

export interface PaymentsResponse {
  data: Payment[]
  total: number
  page: number
  limit: number
  pages: number
}
