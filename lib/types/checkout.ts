export type CheckoutTemplate = 'single_step' | 'promo' | 'info_product' | 'dropshipping' | 'stripe_split'

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
  id?:     string
  author:  string
  rating:  number
  comment: string
}

export interface CheckoutProduct {
  id:               string
  name:             string
  description:      string
  imageUrl:         string
  price:            number
  currency:         string
  interval:         string
  slug:             string
  paymentMethods:   string[]
  shippingOptions:  ShippingOption[]
  orderBumps:       OrderBump[]
  reviews:          CheckoutReview[]
  showReviews:      boolean
  checkoutTemplate: CheckoutTemplate
  checkoutLanguage: string
  countdownMinutes: number
  active:           boolean
  successUrl:       string
  logoUrl:          string
  brandName:        string
  legalName:        string
  requirePhone:     boolean
  requireAddress:   boolean
}

export interface CheckoutAddress {
  line1:      string
  line2?:     string
  locality?:  string
  city:       string
  postalCode: string
  country:    string
}

export interface CreatePaymentIntentRequest {
  customerName:   string
  customerEmail:  string
  customerPhone?: string
  shippingId?:    string
  bumpIds?:       string[]
  urlParams?:     Record<string, string>
  address?:       CheckoutAddress
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
  status:       'pending' | 'paid' | 'failed' | 'processing'
  amount:       number
  currency:     string
  customerName: string
  productName:  string
  successUrl:   string
  createdAt:    string
}
