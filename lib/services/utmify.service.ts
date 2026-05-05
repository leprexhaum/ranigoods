interface UtmifyCustomer {
  name:     string
  email:    string
  phone:    string
  document: string
}

interface UtmifyProduct {
  id:           string
  name:         string
  priceInCents: number
  quantity:     number
}

interface UtmifyTracking {
  utm_source?:   string
  utm_medium?:   string
  utm_campaign?: string
  utm_content?:  string
  utm_term?:     string
  src?:          string
  sck?:          string
}

interface UtmifyCommission {
  totalPriceInCents:     number
  gatewayFeeInCents:     number
  userCommissionInCents: number
}

export interface UtmifyOrderPayload {
  orderId:             string
  platform:            string
  paymentMethod:       string
  status:              string
  createdAt:           string
  approvedDate:        string | null
  customer:            UtmifyCustomer
  products:            UtmifyProduct[]
  trackingParameters:  UtmifyTracking
  commission:          UtmifyCommission
}

export const utmifyService = {
  async sendOrder(token: string, payload: UtmifyOrderPayload): Promise<void> {
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
        console.error('[utmify] HTTP', res.status, text)
      }
    } catch (err) {
      console.error('[utmify] sendOrder failed:', err)
    }
  },
}
