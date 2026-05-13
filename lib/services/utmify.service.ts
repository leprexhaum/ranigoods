// Mapeamento de métodos de pagamento Stripe → UTMify
import { logger } from '@/lib/logger'

const METHOD_MAP: Record<string, 'credit_card' | 'boleto' | 'pix' | 'paypal' | 'free_price'> = {
  card:        'credit_card',
  boleto:      'boleto',
  pix:         'pix',
  paypal:      'paypal',
  mb_way:      'credit_card', // MB WAY não tem equivalente, usar credit_card
  multibanco:  'credit_card',
  sepa_debit:  'credit_card',
}

// Mapeamento de moedas Stripe → UTMify
const CURRENCY_MAP: Record<string, string> = {
  eur: 'EUR', usd: 'USD', brl: 'BRL', gbp: 'GBP',
  ars: 'ARS', cad: 'CAD', cop: 'COP', mxn: 'MXN',
  pyg: 'PYG', clp: 'CLP', pen: 'PEN', pln: 'PLN',
}

// Formata data para o formato exigido pela UTMify: 'YYYY-MM-DD HH:MM:SS' (UTC)
function toUtmifyDate(date: Date | string | null): string | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

export interface UtmifyOrderInput {
  orderId:       string
  stripeMethod:  string          // raw do Stripe: 'card', 'pix', etc.
  currency:      string          // lowercase: 'eur', 'usd', etc.
  createdAt:     Date            // quando o PI foi criado
  approvedAt:    Date            // quando foi aprovado (agora)
  customer: {
    name:     string
    email:    string
    phone:    string
    document: string
    ip?:      string
  }
  products: Array<{
    id:       string
    name:     string
    quantity: number
    priceInCents: number
  }>
  trackingParameters: {
    src?:          string
    sck?:          string
    utm_source?:   string
    utm_campaign?: string
    utm_medium?:   string
    utm_content?:  string
    utm_term?:     string
  }
  // Valores em centavos
  totalPriceInCents:     number
  gatewayFeeInCents?:    number
}

export const utmifyService = {
  resolveMethod(stripeMethod: string): 'credit_card' | 'boleto' | 'pix' | 'paypal' | 'free_price' {
    return METHOD_MAP[stripeMethod] ?? 'credit_card'
  },

  async sendOrder(token: string, input: UtmifyOrderInput): Promise<void> {
    const currency = CURRENCY_MAP[input.currency.toLowerCase()] ?? 'EUR'
    const gatewayFee = input.gatewayFeeInCents ?? 0
    const userCommission = input.totalPriceInCents - gatewayFee

    const payload = {
      orderId:       input.orderId,
      platform:      'TechPags',
      paymentMethod: utmifyService.resolveMethod(input.stripeMethod),
      status:        'paid',
      createdAt:     toUtmifyDate(input.createdAt)!,
      approvedDate:  toUtmifyDate(input.approvedAt)!,
      refundedAt:    null,
      customer: {
        name:     input.customer.name     || 'Cliente',
        email:    input.customer.email    || '',
        phone:    input.customer.phone    || null,
        document: input.customer.document || null,
        country:  'PT',
        ...(input.customer.ip ? { ip: input.customer.ip } : {}),
      },
      products: input.products.map(p => ({
        id:           p.id,
        name:         p.name,
        planId:       p.id,
        planName:     p.name,
        quantity:     p.quantity,
        priceInCents: p.priceInCents,
      })),
      trackingParameters: {
        src:          input.trackingParameters.src          ?? null,
        sck:          input.trackingParameters.sck          ?? null,
        utm_source:   input.trackingParameters.utm_source   ?? null,
        utm_campaign: input.trackingParameters.utm_campaign ?? null,
        utm_medium:   input.trackingParameters.utm_medium   ?? null,
        utm_content:  input.trackingParameters.utm_content  ?? null,
        utm_term:     input.trackingParameters.utm_term     ?? null,
      },
      commission: {
        totalPriceInCents:     input.totalPriceInCents,
        gatewayFeeInCents:     gatewayFee,
        userCommissionInCents: userCommission > 0 ? userCommission : input.totalPriceInCents,
        currency,
      },
      isTest: false,
    }

    try {
      const res = await fetch('https://api.utmify.com.br/api-credentials/orders', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token':  token,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        logger.error('UTMIFY', 'Envio falhado', { piId: input.orderId, status: res.status, body: text })
      } else {
        logger.info('UTMIFY', 'Conversão registada com sucesso', { piId: input.orderId, amount: input.totalPriceInCents, currency })
      }
    } catch (err) {
      logger.error('UTMIFY', 'Envio falhado', { piId: input.orderId, error: err instanceof Error ? err.message : String(err) })
    }
  },
}
