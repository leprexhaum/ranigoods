export type CheckoutTemplate = 'stripe_split'

export interface CheckoutColors {
  panelBg:    string
  formBg:     string
  accent:     string
  buttonBg:   string
  buttonText: string
}

export const DEFAULT_CHECKOUT_COLORS: CheckoutColors = {
  panelBg:    '#012B5D',
  formBg:     '#FFFFFF',
  accent:     '#0074D4',
  buttonBg:   '#FFF02A',
  buttonText: '#000000',
}

export const CHECKOUT_PRESETS: Record<string, CheckoutColors> = {
  padrao:      { panelBg: '#012B5D', formBg: '#FFFFFF', accent: '#0074D4', buttonBg: '#FFF02A', buttonText: '#000000' },
  dark:        { panelBg: '#1A1A2E', formBg: '#16213E', accent: '#0F3460', buttonBg: '#E94560', buttonText: '#FFFFFF' },
  verde:       { panelBg: '#1B4332', formBg: '#FFFFFF', accent: '#2D6A4F', buttonBg: '#40916C', buttonText: '#FFFFFF' },
  roxo:        { panelBg: '#2D1B69', formBg: '#FFFFFF', accent: '#7C3AED', buttonBg: '#A78BFA', buttonText: '#FFFFFF' },
  coral:       { panelBg: '#1F2937', formBg: '#FFFFFF', accent: '#F97316', buttonBg: '#FB923C', buttonText: '#FFFFFF' },
  minimalista: { panelBg: '#FFFFFF', formBg: '#FFFFFF', accent: '#111827', buttonBg: '#111827', buttonText: '#FFFFFF' },
}

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
  checkoutColors?:  Partial<CheckoutColors>
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
