export type CheckoutTemplate = 'single_step' | 'promo' | 'minimal'

export interface OrderBump {
  id:          string
  name:        string
  description: string
  price:       number
  currency:    string
}

export interface ShippingOption {
  id:    string
  label: string
  price: number
}

export interface CheckoutReview {
  author:  string
  rating:  number
  comment: string
}

export interface CheckoutProduct {
  id:               string
  name:             string
  price:            number
  currency:         string
  interval:         string
  slug:             string
  paymentMethods:   string[]
  shippingOptions:  ShippingOption[]
  orderBumps:       OrderBump[]
  reviews:          CheckoutReview[]
  checkoutTemplate: CheckoutTemplate
  successUrl:       string
}

export interface CreatePaymentIntentRequest {
  customerName:   string
  customerEmail:  string
  customerPhone?: string
  shippingId?:    string
  bumpIds?:       string[]
}

export interface CreatePaymentIntentResponse {
  clientSecret:    string
  paymentIntentId: string
  publishableKey:  string
  paymentId:       string
  amount:          number
  currency:        string
}

export interface CheckoutPaymentDetail {
  id:           string
  status:       'pending' | 'paid' | 'failed'
  amount:       number
  currency:     string
  customerName: string
  productName:  string
  successUrl:   string
  createdAt:    string
}
