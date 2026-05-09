'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Loader2 } from 'lucide-react'
import type { CheckoutProduct } from '@/lib/types/checkout'
import { captureUrlParams, getStoredUrlParams } from '@/lib/url-params'
import { useCheckoutPixels } from '@/lib/hooks/useCheckoutPixels'
import { AddressForm, emptyAddress } from '../components/AddressForm'
import type { AddressData } from '../components/AddressForm'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

// ─── Shadow tokens (fiel ao clo-stripe) ──────────────────────────────────────

const SH_DEFAULT      = 'rgb(224,224,224) 0px 0px 0px 1px, rgba(0,0,0,0.07) 0px 2px 4px 0px, rgba(0,0,0,0.05) 0px 1px 1.5px 0px'
const SH_FOCUS        = 'rgb(0,116,212) 0px 0px 0px 2px, rgba(0,0,0,0.07) 0px 2px 4px 0px, rgba(0,0,0,0.05) 0px 1px 1.5px 0px'
const SH_ERROR        = 'rgb(223,27,65) 0px 0px 0px 1px, rgba(0,0,0,0.07) 0px 2px 4px 0px, rgba(0,0,0,0.05) 0px 1px 1.5px 0px'
const SH_ERROR_FOCUS  = 'rgb(223,27,65) 0px 0px 0px 2px, rgba(0,0,0,0.07) 0px 2px 4px 0px, rgba(0,0,0,0.05) 0px 1px 1.5px 0px'

function inputShadow(focused: boolean, hasError: boolean) {
  if (hasError && focused) return SH_ERROR_FOCUS
  if (hasError)            return SH_ERROR
  if (focused)             return SH_FOCUS
  return SH_DEFAULT
}

const INPUT_BASE: React.CSSProperties = {
  height: '36px',
  padding: '8px 12px',
  fontSize: '14px',
  fontWeight: 400,
  color: 'rgba(26,26,26,0.9)',
  backgroundColor: 'rgb(255,255,255)',
  border: 'none',
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

function inputStyle(
  focused: boolean,
  hasError: boolean,
  borderRadius: string,
  extra?: React.CSSProperties,
): React.CSSProperties {
  return { ...INPUT_BASE, borderRadius, boxShadow: inputShadow(focused, hasError), ...extra }
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: 'rgba(26,26,26,0.6)',
  lineHeight: '20px',
  marginBottom: '4px',
  display: 'block',
}

const H2_STYLE: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 500,
  color: 'rgba(26,26,26,0.9)',
  lineHeight: '24px',
  margin: '0 0 12px 0',
}

const ERROR_STYLE: React.CSSProperties = {
  fontSize: '13px',
  color: 'rgb(223,27,65)',
  lineHeight: '18px',
  marginTop: '4px',
  display: 'block',
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}
function fmtExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  if (d.length >= 3) return d.slice(0, 2) + ' / ' + d.slice(2)
  if (d.length === 2) return d + ' / '
  return d
}
function fmtPostalCode(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 7)
  return d.length > 4 ? d.slice(0, 4) + '-' + d.slice(4) : d
}
function fmtPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 9)
  if (d.length > 6) return d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6)
  if (d.length > 3) return d.slice(0, 3) + ' ' + d.slice(3)
  return d
}

// ─── Validators ───────────────────────────────────────────────────────────────

function valEmail(v: string)      { return !v ? 'O email é obrigatório.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Email inválido.' : '' }
function valName(v: string)       { return !v.trim() ? 'O nome é obrigatório.' : v.trim().split(/\s+/).length < 2 ? 'Introduza o nome completo.' : '' }
function valRequired(v: string, l: string) { return !v.trim() ? `${l} é obrigatório.` : '' }
function valPostalCode(v: string) { return !v ? 'Código postal obrigatório.' : !/^\d{4}-\d{3}$/.test(v) ? 'Formato: XXXX-XXX' : '' }
function valPhone(v: string) {
  const d = v.replace(/\D/g, '')
  if (!d) return ''
  if (d.length !== 9) return 'O número deve ter 9 dígitos.'
  if (!/^[29]/.test(d)) return 'Número inválido.'
  return ''
}
function valCardNumber(v: string) {
  const d = v.replace(/\s/g, '')
  if (!d) return 'Número do cartão obrigatório.'
  if (d.length < 13) return 'Número inválido.'
  let sum = 0, alt = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i], 10)
    if (alt) { n *= 2; if (n > 9) n -= 9 }
    sum += n; alt = !alt
  }
  return sum % 10 !== 0 ? 'Número inválido.' : ''
}
function valExpiry(v: string) {
  const c = v.replace(/\s/g, '')
  if (!c) return 'Validade obrigatória.'
  const m = c.match(/^(\d{2})\/(\d{2})$/)
  if (!m) return 'Formato: MM / AA'
  const mo = parseInt(m[1], 10), yr = parseInt('20' + m[2], 10)
  if (mo < 1 || mo > 12) return 'Mês inválido.'
  const now = new Date()
  if (new Date(yr, mo - 1, 1) < new Date(now.getFullYear(), now.getMonth(), 1)) return 'Cartão expirado.'
  return ''
}
function valCvc(v: string) { return !v ? 'CVC obrigatório.' : !/^\d{3,4}$/.test(v) ? 'CVC inválido.' : '' }

function detectBrand(v: string): 'visa' | 'mastercard' | null {
  const d = v.replace(/\s/g, '')
  if (/^4/.test(d)) return 'visa'
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'mastercard'
  return null
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function VisaIcon() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect x="0.25" y="0.25" width="23.5" height="15.5" rx="2" fill="white" stroke="black" strokeOpacity="0.2" strokeWidth="0.5"/>
      <path fillRule="nonzero" fill="#1434CB" d="M2.788,5.914 C2.265,5.628 1.668,5.397 1,5.237 L1.028,5.112 L3.765,5.112 C4.136,5.125 4.437,5.237 4.535,5.631 L5.13,8.467 L5.312,9.321 L6.978,5.112 L8.777,5.112 L6.103,11.278 L4.304,11.278 L2.788,5.914 Z M10.1,11.284 L8.399,11.284 L9.463,5.112 L11.164,5.112 L10.1,11.284 Z M16.267,5.263 L16.035,6.596 L15.882,6.53 C15.574,6.405 15.167,6.281 14.614,6.294 C13.943,6.294 13.642,6.563 13.635,6.825 C13.635,7.114 13.999,7.305 14.594,7.587 C15.574,8.027 16.029,8.566 16.022,9.268 C16.008,10.549 14.846,11.376 13.061,11.376 C12.298,11.369 11.563,11.218 11.164,11.048 L11.402,9.662 L11.626,9.761 C12.179,9.991 12.543,10.089 13.222,10.089 C13.712,10.089 14.237,9.898 14.244,9.485 C14.244,9.216 14.02,9.019 13.362,8.716 C12.718,8.421 11.857,7.928 11.871,7.042 C11.878,5.84 13.061,5 14.741,5 C15.399,5 15.931,5.138 16.267,5.263 Z M18.528,9.097 L19.942,9.097 C19.872,8.789 19.55,7.311 19.55,7.311 L19.431,6.78 C19.347,7.009 19.2,7.384 19.207,7.371 C19.207,7.371 18.668,8.743 18.528,9.097 Z M20.628,5.112 L22,11.284 L20.425,11.284 C20.425,11.284 20.271,10.575 20.222,10.358 L18.038,10.358 C17.975,10.522 17.681,11.284 17.681,11.284 L15.896,11.284 L18.423,5.624 C18.598,5.223 18.906,5.112 19.312,5.112 L20.628,5.112 Z"/>
    </svg>
  )
}

function MastercardIcon() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect width="24" height="16" rx="2" fill="#252525"/>
      <circle cx="9" cy="8" r="5" fill="#EB001B"/>
      <circle cx="15" cy="8" r="5" fill="#F79E1B"/>
      <path d="M12 3.99963C13.2144 4.91184 14 6.36418 14 8C14 9.63582 13.2144 11.0882 12 12.0004C10.7856 11.0882 10 9.63582 10 8C10 6.36418 10.7856 4.91184 12 3.99963Z" fill="#FF5F00"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" style={{ color: 'rgba(26,26,26,0.4)' }}>
      <path d="M10 6H9V4C9 2.346 7.654 1 6 1C4.346 1 3 2.346 3 4V6H2C1.448 6 1 6.448 1 7V12C1 12.552 1.448 13 2 13H10C10.552 13 11 12.552 11 12V7C11 6.448 10.552 6 10 6ZM4 4C4 2.897 4.897 2 6 2C7.103 2 8 2.897 8 4V6H4V4ZM6 10C5.448 10 5 9.552 5 9C5 8.448 5.448 8 6 8C6.552 8 7 8.448 7 9C7 9.552 6.552 10 6 10Z" fill="currentColor"/>
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: 'rgba(26,26,26,0.35)' }}>
      <path d="M2 3H14C14.552 3 15 3.448 15 4V12C15 12.552 14.552 13 14 13H2C1.448 13 1 12.552 1 12V4C1 3.448 1.448 3 2 3Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 4L8 8.5L15 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: 'rgba(26,26,26,0.35)' }}>
      <path d="M8 8C10.21 8 12 6.21 12 4C12 1.79 10.21 0 8 0C5.79 0 4 1.79 4 4C4 6.21 5.79 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor"/>
    </svg>
  )
}

function StripeLogo() {
  return (
    <svg focusable="false" width="33" height="15" viewBox="0 0 33 15" role="img" fill="currentColor">
      <g fillRule="evenodd">
        <path d="M32.956 7.925c0-2.313-1.12-4.138-3.261-4.138-2.15 0-3.451 1.825-3.451 4.12 0 2.719 1.535 4.092 3.74 4.092 1.075 0 1.888-.244 2.502-.587V9.605c-.614.307-1.319.497-2.213.497-.876 0-1.653-.307-1.753-1.373h4.418c0-.118.018-.588.018-.804zm-4.463-.859c0-1.02.624-1.445 1.193-1.445.55 0 1.138.424 1.138 1.445h-2.33zM22.756 3.787c-.885 0-1.454.415-1.77.704l-.118-.56H18.88v10.535l2.259-.48.009-2.556c.325.235.804.57 1.6.57 1.616 0 3.089-1.302 3.089-4.166-.01-2.62-1.5-4.047-3.08-4.047zm-.542 6.225c-.533 0-.85-.19-1.066-.425l-.009-3.352c.235-.262.56-.443 1.075-.443.822 0 1.391.922 1.391 2.105 0 1.211-.56 2.115-1.39 2.115zM18.04 2.766V.932l-2.268.479v1.843zM15.772 3.94h2.268v7.905h-2.268zM13.342 4.609l-.144-.669h-1.952v7.906h2.259V6.488c.533-.696 1.436-.57 1.716-.47V3.94c-.289-.108-1.346-.307-1.879.669zM8.825 1.98l-2.205.47-.009 7.236c0 1.337 1.003 2.322 2.34 2.322.741 0 1.283-.135 1.581-.298V9.876c-.289.117-1.716.533-1.716-.804V5.865h1.716V3.94H8.816l.009-1.96zM2.718 6.235c0-.352.289-.488.767-.488.687 0 1.554.208 2.241.578V4.202a5.958 5.958 0 0 0-2.24-.415c-1.835 0-3.054.957-3.054 2.557 0 2.493 3.433 2.096 3.433 3.17 0 .416-.361.552-.867.552-.75 0-1.708-.307-2.467-.723v2.15c.84.362 1.69.515 2.467.515 1.879 0 3.17-.93 3.17-2.548-.008-2.692-3.45-2.213-3.45-3.225z"/>
      </g>
    </svg>
  )
}

// ─── CustomCheckbox ───────────────────────────────────────────────────────────

function CustomCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
        backgroundColor: checked ? 'rgb(0,116,212)' : 'rgb(255,255,255)',
        border: checked ? 'none' : '1.5px solid rgb(200,200,200)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

// ─── FieldError ───────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string }) {
  if (!msg) return null
  return <span style={ERROR_STYLE}>{msg}</span>
}


// ─── LeftColumn ───────────────────────────────────────────────────────────────

interface LeftColumnProps {
  product: CheckoutProduct
  total: number
  selectedBumps: string[]
  selectedShip: string
}

function LeftColumn({ product, total, selectedBumps, selectedShip }: LeftColumnProps) {
  const brandName = product.brandName || product.name

  const intervalLabel = product.interval && product.interval !== 'unit'
    ? product.interval === 'month' ? 'por mês'
    : product.interval === 'year'  ? 'por ano'
    : product.interval === 'week'  ? 'por semana'
    : `por ${product.interval}`
    : null

  return (
    <div style={{
      width: '420px',
      backgroundColor: 'rgb(1,43,93)',
      padding: '40px 80px 48px 0',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      flexShrink: 0,
    }}
    className="ss-left"
    >
      {/* Logo */}
      <div style={{ marginBottom: '24px' }}>
        {product.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.logoUrl}
            alt={brandName}
            style={{ height: '32px', width: 'auto', maxWidth: '160px', objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
            {brandName}
          </span>
        )}
      </div>

      {/* Imagem do produto */}
      {product.imageUrl && (
        <div style={{ borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgb(255,255,255)', marginBottom: '16px', width: '100%', aspectRatio: '1' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>
      )}

      {/* Info do produto */}
      <div style={{ marginTop: product.imageUrl ? '0' : '8px' }}>
        <p style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.65)', lineHeight: '21px', margin: '0 0 4px 0' }}>
          {product.name}
        </p>
        <p style={{ fontSize: '28px', fontWeight: 600, color: 'rgb(255,255,255)', lineHeight: '36px', margin: '0 0 4px 0' }}>
          {fmt(total, product.currency)}
          {intervalLabel && (
            <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.65)', marginLeft: '6px' }}>
              {intervalLabel}
            </span>
          )}
        </p>
        {product.description && (
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.65)', lineHeight: '18px', margin: 0 }}>
            {product.description}
          </p>
        )}
      </div>

      {/* Line items (bumps + envio) */}
      {(selectedBumps.length > 0 || selectedShip) && (
        <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {selectedBumps.map(id => {
            const b = product.orderBumps.find(b => b.id === id)
            if (!b) return null
            return (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{b.name}</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>+{fmt(b.price, product.currency)}</span>
              </div>
            )
          })}
          {selectedShip && (() => {
            const s = product.shippingOptions.find(s => s.id === selectedShip)
            if (!s || s.price === 0) return null
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{s.label}</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>+{fmt(s.price, product.currency)}</span>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}


// ─── ContactSection ───────────────────────────────────────────────────────────

interface ContactSectionProps {
  email: string; setEmail: (v: string) => void
  name: string;  setName:  (v: string) => void
  phone: string; setPhone: (v: string) => void
  countryCode: string; callingCode: string
  requirePhone: boolean
  focused: string | null; setFocused: (v: string | null) => void
  touched: Record<string, boolean>; touch: (id: string) => void
  submitted: boolean
}

function FlagPTIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <g fill="none" transform="translate(0 2)">
        <path fill="#24B47E" d="M6,12 L2,12 C0.8954305,12 0,11.1045695 0,10 L0,2 C0,0.8954305 0.8954305,0 2,0 L6,0 L6,12 Z"/>
        <path fill="#E25950" d="M14,12 L6,12 L6,0 L14,0 C15.1045695,0 16,0.8954305 16,2 L16,10 C16,11.1045695 15.1045695,12 14,12 Z"/>
        <path fill="#FCD669" d="M5.975,3 C7.645,3 9,4.343 9,5.999 C9,7.655 7.645,8.998 5.975,8.998 C4.324,8.97 3,7.636 3,5.999 C3,4.363 4.324,3.028 5.975,3.001 L5.975,3 Z"/>
        <path fill="#E25950" d="M5.94,4.001 C6.669,3.979 7.351,4.355 7.722,4.983 C8.093,5.61 8.093,6.39 7.722,7.017 C7.351,7.645 6.669,8.021 5.94,7.999 C4.859,7.967 4,7.081 4,6 C4,4.919 4.859,4.033 5.94,4.001 Z"/>
        <path fill="#FFF" d="M5,5 L7,5 L7,6.5 C7,7.052 6.552,7.5 6,7.5 C5.448,7.5 5,7.052 5,6.5 L5,5 Z"/>
      </g>
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ color: 'rgba(26,26,26,0.4)' }}>
      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ContactSection({
  email, setEmail, name, setName,
  focused, setFocused, touched, touch, submitted,
}: Omit<ContactSectionProps, 'phone' | 'setPhone' | 'countryCode' | 'callingCode' | 'requirePhone'>) {
  const show = (id: string) => submitted || touched[id]
  const errEmail = valEmail(email)
  const errName  = valName(name)

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={H2_STYLE}>Informações de envio</h2>

      {/* Dados de contacto — email + nome agrupados */}
      <div style={{ marginBottom: '12px' }}>
        <label style={LABEL_STYLE}>Dados de contacto</label>
        <div style={{ position: 'relative' }}>
          <input
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused('email')}
            onBlur={() => touch('email')}
            autoComplete="email"
            style={inputStyle(focused === 'email', !!(show('email') && errEmail), '6px 6px 0px 0px', { paddingLeft: '36px' })}
          />
          <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(26,26,26,0.35)', display: 'flex' }}>
            <EmailIcon />
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Nome completo"
            value={name}
            onChange={e => setName(e.target.value)}
            onFocus={() => setFocused('name')}
            onBlur={() => touch('name')}
            autoComplete="name"
            style={inputStyle(focused === 'name', !!(show('name') && errName), '0px 0px 6px 6px', { paddingLeft: '36px' })}
          />
          <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(26,26,26,0.35)', display: 'flex' }}>
            <PersonIcon />
          </div>
        </div>
        {show('email') && <FieldError msg={errEmail} />}
        {show('name')  && <FieldError msg={errName} />}
      </div>
    </section>
  )
}


// ─── ShippingSection ──────────────────────────────────────────────────────────

interface ShippingSectionProps {
  product: CheckoutProduct
  selectedShip: string
  setSelectedShip: (v: string) => void
}

function ShippingSection({ product, selectedShip, setSelectedShip }: ShippingSectionProps) {
  if (product.shippingOptions.length === 0) return null
  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={H2_STYLE}>Método de envio</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {product.shippingOptions.map((opt, i) => {
          const isFirst = i === 0
          const isLast  = i === product.shippingOptions.length - 1
          const br = isFirst && isLast ? '6px' : isFirst ? '6px 6px 0 0' : isLast ? '0 0 6px 6px' : '0'
          const selected = selectedShip === opt.id
          return (
            <label
              key={opt.id}
              onClick={() => setSelectedShip(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', cursor: 'pointer',
                boxShadow: selected ? SH_FOCUS : SH_DEFAULT,
                borderRadius: br, backgroundColor: 'rgb(255,255,255)',
                transition: 'box-shadow 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                  border: selected ? '5px solid rgb(0,116,212)' : '2px solid rgb(200,200,200)',
                  backgroundColor: 'rgb(255,255,255)',
                  transition: 'border 0.15s',
                }} />
                <span style={{ fontSize: '14px', color: 'rgba(26,26,26,0.9)' }}>{opt.label}</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(26,26,26,0.9)' }}>
                {opt.price === 0 ? 'Grátis' : fmt(opt.price, product.currency)}
              </span>
              <input type="radio" name="ss-shipping" value={opt.id} checked={selected} onChange={() => setSelectedShip(opt.id)} className="sr-only" />
            </label>
          )
        })}
      </div>
    </section>
  )
}

// ─── OrderBumpsSection ────────────────────────────────────────────────────────

interface OrderBumpsSectionProps {
  product: CheckoutProduct
  selectedBumps: string[]
  setSelectedBumps: (v: string[]) => void
}

function OrderBumpsSection({ product, selectedBumps, setSelectedBumps }: OrderBumpsSectionProps) {
  if (product.orderBumps.length === 0) return null

  const toggle = (id: string) => {
    setSelectedBumps(
      selectedBumps.includes(id)
        ? selectedBumps.filter(b => b !== id)
        : [...selectedBumps, id],
    )
  }

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={H2_STYLE}>Adicionar ao pedido</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {product.orderBumps.map(bump => {
          const checked = selectedBumps.includes(bump.id)
          return (
            <div
              key={bump.id}
              onClick={() => toggle(bump.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px', cursor: 'pointer',
                boxShadow: checked ? SH_FOCUS : SH_DEFAULT,
                borderRadius: '6px', backgroundColor: 'rgb(255,255,255)',
                transition: 'box-shadow 0.15s',
              }}
            >
              <div style={{ marginTop: '2px' }}>
                <CustomCheckbox checked={checked} onChange={() => toggle(bump.id)} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(26,26,26,0.9)' }}>{bump.name}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgb(0,116,212)', marginLeft: '8px', flexShrink: 0 }}>
                    +{fmt(bump.price, product.currency)}
                  </span>
                </div>
                {bump.description && (
                  <p style={{ fontSize: '12px', color: 'rgba(26,26,26,0.55)', marginTop: '2px', lineHeight: '16px' }}>
                    {bump.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}


// ─── PaymentSection ───────────────────────────────────────────────────────────

interface PaymentSectionProps {
  clientSecret: string
  stripePromise: ReturnType<typeof loadStripe> | null
  paymentId: string
  paymentAmount: number
  product: CheckoutProduct
  onAddPaymentInfo?: () => void
}

function PollingScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px 0' }}>
      <Loader2 size={36} style={{ color: 'rgb(0,116,212)', animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: '14px', color: 'rgba(26,26,26,0.6)', textAlign: 'center' }}>A verificar pagamento…</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function PaymentForm({ paymentId, successUrl, amount, currency, brandName, legalName, onAddPaymentInfo }: {
  paymentId: string; successUrl: string; amount: number; currency: string
  brandName: string; legalName: string; onAddPaymentInfo?: () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)

  const pollAndRedirect = async () => {
    setPolling(true)
    const dest = successUrl || `${window.location.origin}/checkout/success?payment_id=${paymentId}&status=paid`
    let attempts = 0
    const poll = async (): Promise<void> => {
      try {
        const res  = await fetch(`/api/checkout/payment/${paymentId}`)
        const data = await res.json()
        if (data.status === 'paid') {
          try {
            const ur = await fetch(`/api/checkout/payment/${paymentId}/upsell`)
            if (ur.ok) {
              const u = await ur.json()
              if (u?.upsell) { window.location.href = `/checkout/upsell/${paymentId}`; return }
            }
          } catch { /* segue */ }
          window.location.href = dest; return
        }
        if (data.status === 'failed') { setError('Pagamento recusado. Tente novamente.'); setPolling(false); setLoading(false); return }
        if (attempts < 30) { attempts++; setTimeout(poll, 1500) }
        else { window.location.href = dest }
      } catch {
        if (attempts < 30) { attempts++; setTimeout(poll, 1500) }
        else { window.location.href = dest }
      }
    }
    poll()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true); setError('')
    onAddPaymentInfo?.()
    const returnUrl = successUrl || `${window.location.origin}/checkout/success?payment_id=${paymentId}`
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    })
    if (err) { setError(err.message ?? 'Erro ao processar pagamento'); setLoading(false); return }
    if (paymentIntent) { pollAndRedirect(); return }
  }

  if (polling) return <PollingScreen />

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px',
          backgroundColor: 'rgb(255,245,245)', border: '1px solid rgb(254,202,202)',
          borderRadius: '6px', padding: '12px', marginTop: '12px',
          color: 'rgb(185,28,28)', fontSize: '13px',
        }}>
          <span>⚠</span> {error}
        </div>
      )}

      {/* Botão pagar com shimmer */}
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: '100%', height: '48px', marginTop: '16px', marginBottom: '8px',
          backgroundColor: 'rgb(255,240,42)', color: 'rgb(0,0,0)',
          fontSize: '16px', fontWeight: 500, borderRadius: '6px', border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          position: 'relative', overflow: 'hidden', fontFamily: 'inherit',
          boxShadow: 'rgba(50,50,93,0.1) 0px 0px 0px 1px inset, rgba(50,50,93,0.1) 0px 2px 5px 0px, rgba(0,0,0,0.07) 0px 1px 1px 0px',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.95)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none' }}
      >
        {loading
          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> A processar…</>
          : <>Pagar {fmt(amount, currency)}</>
        }
        {!loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
            background: 'linear-gradient(to right, rgba(255,240,42,0) 0%, rgb(255,255,75) 50%, rgba(255,240,42,0) 100%)',
            animation: 'ss-shimmer 2s infinite linear',
          }} />
        )}
      </button>

      <p style={{ fontSize: '12px', color: 'rgba(26,26,26,0.6)', textAlign: 'center', lineHeight: '16px' }}>
        Ao confirmar, autoriza a <strong style={{ fontWeight: 500, color: 'rgba(26,26,26,0.9)' }}>{legalName || brandName}</strong> a efetuar cobranças conforme as condições acordadas.
      </p>
    </form>
  )
}

function PaymentSection({ clientSecret, stripePromise, paymentId, paymentAmount, product, onAddPaymentInfo }: PaymentSectionProps) {
  const brandName = product.brandName || product.name

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={H2_STYLE}>Método de pagamento</h2>

      {!clientSecret ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px 0', color: 'rgba(26,26,26,0.5)', fontSize: '13px' }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          A preparar pagamento…
        </div>
      ) : (
        stripePromise && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              fonts: [
                {
                  cssSrc: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap',
                },
              ],
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary:    'rgb(0,116,212)',
                  colorBackground: '#ffffff',
                  colorText:       'rgba(26,26,26,0.9)',
                  colorDanger:     'rgb(223,27,65)',
                  fontFamily:      '"Be Vietnam Pro", -apple-system, "system-ui", "Segoe UI", sans-serif',
                  borderRadius:    '6px',
                  spacingUnit:     '4px',
                },
                rules: {
                  '.Input': { border: 'none', boxShadow: 'rgb(224,224,224) 0px 0px 0px 1px, rgba(0,0,0,0.07) 0px 2px 4px 0px', padding: '8px 12px' },
                  '.Input:focus': { boxShadow: 'rgb(0,116,212) 0px 0px 0px 2px, rgba(0,0,0,0.07) 0px 2px 4px 0px' },
                  '.Label': { fontSize: '13px', fontWeight: '500', color: 'rgba(26,26,26,0.6)' },
                  '.Tab': { border: 'none', boxShadow: 'rgb(224,224,224) 0px 0px 0px 1px' },
                  '.Tab--selected': { boxShadow: 'rgb(0,116,212) 0px 0px 0px 2px' },
                },
              },
            }}
          >
            <PaymentForm
              paymentId={paymentId}
              successUrl={product.successUrl}
              amount={paymentAmount}
              currency={product.currency}
              brandName={brandName}
              legalName={product.legalName || ''}
              onAddPaymentInfo={onAddPaymentInfo}
            />
          </Elements>
        )
      )}
    </section>
  )
}


// ─── AddressSection ───────────────────────────────────────────────────────────

interface AddressSectionProps {
  address: AddressData; setAddress: (v: AddressData) => void
  phone: string; setPhone: (v: string) => void
  focused: string | null; setFocused: (v: string | null) => void
  touched: Record<string, boolean>; touch: (id: string) => void
  submitted: boolean
}

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_BASE,
  borderRadius: '0px',
  boxShadow: SH_DEFAULT,
  paddingRight: '12px',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundColor: 'rgb(247,247,247)',
  color: 'rgba(26,26,26,0.4)',
  cursor: 'default',
  pointerEvents: 'none',
}

function AddressSection({
  address, setAddress,
  phone, setPhone,
  focused, setFocused, touched, touch, submitted,
}: AddressSectionProps) {
  const show = (id: string) => submitted || touched[id]
  const set  = (field: keyof AddressData, val: string) => setAddress({ ...address, [field]: val })

  const errName    = valName(address.recipientName)
  const errAddr1   = valRequired(address.line1, 'A morada')
  const errPostal  = valPostalCode(address.postalCode)
  const errCity    = valRequired(address.city, 'A cidade')
  const errPhone   = valPhone(phone)

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={H2_STYLE}>Informações de envio</h2>

      <div>
        <label style={LABEL_STYLE}>Morada de envio</label>

        {/* Nome completo */}
        <input
          type="text"
          placeholder="Nome completo"
          value={address.recipientName}
          onChange={e => set('recipientName', e.target.value)}
          onFocus={() => setFocused('addr_name')}
          onBlur={() => touch('addr_name')}
          autoComplete="name"
          style={inputStyle(focused === 'addr_name', !!(show('addr_name') && errName), '6px 6px 0px 0px')}
        />

        {/* País (desativado, visual only) */}
        <select style={SELECT_STYLE} defaultValue="PT" disabled>
          <option value="PT">Portugal</option>
          <option value="ES">Espanha</option>
          <option value="FR">França</option>
          <option value="DE">Alemanha</option>
          <option value="GB">Reino Unido</option>
          <option value="US">Estados Unidos</option>
        </select>

        {/* Linha morada 1 */}
        <input
          type="text"
          placeholder="Linha de morada 1"
          value={address.line1}
          onChange={e => set('line1', e.target.value)}
          onFocus={() => setFocused('addr_line1')}
          onBlur={() => touch('addr_line1')}
          autoComplete="address-line1"
          style={inputStyle(focused === 'addr_line1', !!(show('addr_line1') && errAddr1), '0px')}
        />

        {/* Linha morada 2 */}
        <input
          type="text"
          placeholder="Linha de morada 2"
          value={address.line2}
          onChange={e => set('line2', e.target.value)}
          onFocus={() => setFocused('addr_line2')}
          onBlur={() => touch('addr_line2')}
          autoComplete="address-line2"
          style={inputStyle(focused === 'addr_line2', false, '0px')}
        />

        {/* Código postal + Cidade */}
        <div style={{ display: 'flex', gap: '1px' }}>
          <input
            type="text"
            placeholder="Código postal"
            value={address.postalCode}
            onChange={e => set('postalCode', fmtPostalCode(e.target.value))}
            onFocus={() => setFocused('addr_postal')}
            onBlur={() => touch('addr_postal')}
            autoComplete="postal-code"
            style={inputStyle(focused === 'addr_postal', !!(show('addr_postal') && errPostal), '0px', { width: '50%' })}
          />
          <input
            type="text"
            placeholder="Cidade"
            value={address.city}
            onChange={e => set('city', e.target.value)}
            onFocus={() => setFocused('addr_city')}
            onBlur={() => touch('addr_city')}
            autoComplete="address-level2"
            style={inputStyle(focused === 'addr_city', !!(show('addr_city') && errCity), '0px', { width: '50%' })}
          />
        </div>

        {/* Erros morada */}
        {show('addr_name')   && <FieldError msg={errName} />}
        {show('addr_line1')  && <FieldError msg={errAddr1} />}
        {show('addr_postal') && <FieldError msg={errPostal} />}
        {show('addr_city')   && <FieldError msg={errCity} />}

        {/* Telefone com flag + chevron */}
        <div style={{ display: 'flex', position: 'relative', marginTop: '1px' }}>
          <div style={{
            width: '52px', height: '36px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '2px', backgroundColor: 'rgb(255,255,255)',
            boxShadow: SH_DEFAULT, borderRadius: '0px 0px 0px 6px', flexShrink: 0,
            paddingLeft: '8px', paddingRight: '4px', cursor: 'pointer',
            borderRight: '1px solid rgb(224,224,224)',
          }}>
            <FlagPTIcon />
            <ChevronDownIcon />
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="tel"
              placeholder="912 345 678"
              value={phone}
              onChange={e => setPhone(fmtPhone(e.target.value))}
              onFocus={() => setFocused('addr_phone')}
              onBlur={() => touch('addr_phone')}
              inputMode="tel"
              autoComplete="tel"
              style={inputStyle(focused === 'addr_phone', !!(show('addr_phone') && errPhone), '0px 0px 6px 0px', { width: '100%', paddingRight: '32px' })}
            />
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(26,26,26,0.35)', display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="8" cy="5" r="0.75" fill="currentColor"/>
              </svg>
            </div>
          </div>
        </div>
        {show('addr_phone') && <FieldError msg={errPhone} />}
      </div>
    </section>
  )
}

// ─── RightColumn ──────────────────────────────────────────────────────────────

interface RightColumnProps {
  product: CheckoutProduct
  total: number
  selectedBumps: string[]; setSelectedBumps: (v: string[]) => void
  selectedShip: string;    setSelectedShip:  (v: string) => void
  email: string; setEmail: (v: string) => void
  name: string;  setName:  (v: string) => void
  phone: string; setPhone: (v: string) => void
  countryCode: string; callingCode: string
  address: AddressData; setAddress: (v: AddressData) => void
  clientSecret: string
  stripePromise: ReturnType<typeof loadStripe> | null
  paymentId: string; paymentAmount: number
  onAddPaymentInfo?: () => void
}

function RightColumn({
  product, total,
  selectedBumps, setSelectedBumps,
  selectedShip, setSelectedShip,
  email, setEmail, name, setName, phone, setPhone,
  countryCode, callingCode,
  address, setAddress,
  clientSecret, stripePromise, paymentId, paymentAmount,
  onAddPaymentInfo,
}: RightColumnProps) {
  const [focused,   setFocused]   = useState<string | null>(null)
  const [touched,   setTouched]   = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)

  const touch = useCallback((id: string) => {
    setTouched(t => ({ ...t, [id]: true }))
    setFocused(null)
  }, [])

  void submitted
  void setSubmitted

  return (
    <div style={{
      flex: 1,
      backgroundColor: 'rgb(255,255,255)',
      padding: '40px 0 48px 48px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    }}
    className="ss-right"
    >
      <ContactSection
        email={email} setEmail={setEmail}
        name={name}   setName={setName}
        focused={focused} setFocused={setFocused}
        touched={touched} touch={touch}
        submitted={submitted}
      />

      <AddressSection
        address={address} setAddress={setAddress}
        phone={phone} setPhone={setPhone}
        focused={focused} setFocused={setFocused}
        touched={touched} touch={touch}
        submitted={submitted}
      />

      <ShippingSection
        product={product}
        selectedShip={selectedShip}
        setSelectedShip={setSelectedShip}
      />

      <OrderBumpsSection
        product={product}
        selectedBumps={selectedBumps}
        setSelectedBumps={setSelectedBumps}
      />

      <PaymentSection
        clientSecret={clientSecret}
        stripePromise={stripePromise}
        paymentId={paymentId}
        paymentAmount={paymentAmount}
        product={product}
        onAddPaymentInfo={onAddPaymentInfo}
      />

      {/* Footer */}
      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
        <span style={{ color: 'rgba(26,26,26,0.6)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
          Powered by <span style={{ color: 'hsla(0,0%,10%,0.45)', display: 'flex' }}><StripeLogo /></span>
        </span>
        <span style={{ color: 'rgba(26,26,26,0.6)', fontSize: '12px' }}>|</span>
        <a href="https://stripe.com/legal/end-users" target="_blank" rel="noopener" style={{ color: 'rgba(26,26,26,0.6)', fontSize: '12px', textDecoration: 'none' }}>Termos</a>
        <a href="https://stripe.com/privacy" target="_blank" rel="noopener" style={{ color: 'rgba(26,26,26,0.6)', fontSize: '12px', textDecoration: 'none' }}>Privacidade</a>
      </footer>
    </div>
  )
}


// ─── MobileSummary ────────────────────────────────────────────────────────────

function MobileSummary({ product, total, selectedBumps, selectedShip, open, setOpen }: {
  product: CheckoutProduct; total: number
  selectedBumps: string[]; selectedShip: string
  open: boolean; setOpen: (v: boolean) => void
}) {
  const brandName = product.brandName || product.name
  return (
    <div style={{ backgroundColor: 'rgb(1,43,93)', borderBottom: '1px solid rgba(255,255,255,0.1)' }} className="ss-mobile-summary">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          {product.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.logoUrl} alt={brandName} style={{ height: '28px', width: 'auto', maxWidth: '120px', objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandName}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontSize: '13px', flexShrink: 0, marginLeft: '12px', fontFamily: 'inherit' }}
        >
          <span style={{ fontWeight: 500 }}>{fmt(total, product.currency)}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Painel expansível */}
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '600px' : '0',
        opacity: open ? 1 : 0,
        transition: 'max-height 0.3s ease, opacity 0.2s ease',
      }}>
        <div style={{ padding: '0 16px 20px' }}>
          {product.imageUrl && (
            <div style={{ borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgb(255,255,255)', marginBottom: '12px', width: '120px', height: '120px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
          )}
          <p style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(255,255,255,0.65)', margin: '0 0 4px 0' }}>{product.name}</p>
          {product.description && (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: '18px' }}>{product.description}</p>
          )}
          {(selectedBumps.length > 0 || selectedShip) && (
            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedBumps.map(id => {
                const b = product.orderBumps.find(b => b.id === id)
                if (!b) return null
                return (
                  <div key={id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{b.name}</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>+{fmt(b.price, product.currency)}</span>
                  </div>
                )
              })}
              {selectedShip && (() => {
                const s = product.shippingOptions.find(s => s.id === selectedShip)
                if (!s || s.price === 0) return null
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{s.label}</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>+{fmt(s.price, product.currency)}</span>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StripeSplitCheckout({ product }: { product: CheckoutProduct }) {
  const { trackEvent } = useCheckoutPixels(product.id)

  const [name,           setName]           = useState('')
  const [email,          setEmail]          = useState('')
  const [phone,          setPhone]          = useState('')
  const [address,        setAddress]        = useState<AddressData>(emptyAddress())
  const [selectedBumps,  setSelectedBumps]  = useState<string[]>([])
  const [selectedShip,   setSelectedShip]   = useState('')
  const [countryCode,    setCountryCode]    = useState('PT')
  const [callingCode,    setCallingCode]    = useState('+351')
  const [mobileSumOpen,  setMobileSumOpen]  = useState(false)

  const [clientSecret,   setClientSecret]   = useState('')
  const [publishableKey, setPublishableKey] = useState('')
  const [paymentId,      setPaymentId]      = useState('')
  const [paymentAmount,  setPaymentAmount]  = useState(0)

  const total = product.price
    + selectedBumps.reduce((s, id) => s + (product.orderBumps.find(b => b.id === id)?.price ?? 0), 0)
    + (product.shippingOptions.find(s => s.id === selectedShip)?.price ?? 0)

  useEffect(() => {
    captureUrlParams()
    const ship = product.shippingOptions?.length > 0 ? product.shippingOptions[0].id : ''
    if (ship) setSelectedShip(ship)

    const init = async () => {
      try {
        const urlParams = getStoredUrlParams()
        const res = await fetch(`/api/checkout/${product.slug}/payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName:  '',
            customerEmail: '',
            customerPhone: '',
            bumpIds:       [],
            shippingId:    ship || undefined,
            urlParams,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          setClientSecret(data.clientSecret)
          setPublishableKey(data.publishableKey)
          setPaymentId(data.paymentId)
          setPaymentAmount(data.amount)
        }
      } catch { /* silent */ }
    }
    init()

    trackEvent('InitiateCheckout', { value: product.price, currency: product.currency, content_ids: [product.id] })

    fetch('/api/geo-ip').then(r => r.json()).then(d => {
      if (d.countryCode) setCountryCode(d.countryCode)
      if (d.callingCode) setCallingCode(d.callingCode)
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stripePromise = useMemo(
    () => loadStripe(publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''),
    [publishableKey],
  )

  return (
    <>
      <style>{`
        @keyframes ss-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* Desktop: layout split */
        .ss-layout {
          display: flex;
          flex-direction: row;
          min-height: 100vh;
          background: linear-gradient(to right, rgb(1,43,93) 50%, rgb(255,255,255) 50%);
        }
        .ss-inner {
          display: flex;
          flex-direction: row;
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
        }
        .ss-mobile-summary { display: none; }
        .ss-left  { display: flex; }
        .ss-right { display: flex; }

        /* Mobile */
        @media (max-width: 768px) {
          .ss-layout {
            flex-direction: column;
            background: rgb(255,255,255);
          }
          .ss-inner {
            flex-direction: column;
            max-width: 100%;
          }
          .ss-mobile-summary { display: block; }
          .ss-left  { display: none !important; }
          .ss-right {
            min-height: unset !important;
            padding: 24px 16px !important;
          }
        }
      `}</style>

      <div className="ss-layout" style={{ fontFamily: "var(--font-be-vietnam-pro), 'Be Vietnam Pro', -apple-system, 'system-ui', 'Segoe UI', sans-serif" }}>

        {/* Mobile: header com resumo colapsável */}
        <MobileSummary
          product={product} total={total}
          selectedBumps={selectedBumps} selectedShip={selectedShip}
          open={mobileSumOpen} setOpen={setMobileSumOpen}
        />

        <div className="ss-inner">
          <LeftColumn
            product={product} total={total}
            selectedBumps={selectedBumps} selectedShip={selectedShip}
          />
          <RightColumn
            product={product} total={total}
            selectedBumps={selectedBumps} setSelectedBumps={setSelectedBumps}
            selectedShip={selectedShip}   setSelectedShip={setSelectedShip}
            email={email} setEmail={setEmail}
            name={name}   setName={setName}
            phone={phone} setPhone={setPhone}
            countryCode={countryCode} callingCode={callingCode}
            address={address} setAddress={setAddress}
            clientSecret={clientSecret}
            stripePromise={stripePromise}
            paymentId={paymentId}
            paymentAmount={paymentAmount}
            onAddPaymentInfo={() => trackEvent('AddPaymentInfo', { value: total, currency: product.currency, content_ids: [product.id] })}
          />
        </div>
      </div>
    </>
  )
}
