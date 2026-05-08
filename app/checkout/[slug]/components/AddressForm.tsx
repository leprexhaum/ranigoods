'use client'

import { useState, useCallback, useRef } from 'react'
import { Loader2 } from 'lucide-react'

// ─── Lista completa de países ─────────────────────────────────────────────────

export const COUNTRIES = [
  { code: 'PT',    name: 'Portugal' },
  { code: 'PT-MA', name: 'Portugal — Madeira' },
  { code: 'PT-AC', name: 'Portugal — Açores' },
  { code: 'ES',    name: 'Espanha' },
  { code: 'FR',    name: 'França' },
  { code: 'DE',    name: 'Alemanha' },
  { code: 'IT',    name: 'Itália' },
  { code: 'GB',    name: 'Reino Unido' },
  { code: 'IE',    name: 'Irlanda' },
  { code: 'NL',    name: 'Países Baixos' },
  { code: 'BE',    name: 'Bélgica' },
  { code: 'LU',    name: 'Luxemburgo' },
  { code: 'CH',    name: 'Suíça' },
  { code: 'AT',    name: 'Áustria' },
  { code: 'SE',    name: 'Suécia' },
  { code: 'NO',    name: 'Noruega' },
  { code: 'DK',    name: 'Dinamarca' },
  { code: 'FI',    name: 'Finlândia' },
  { code: 'PL',    name: 'Polónia' },
  { code: 'CZ',    name: 'República Checa' },
  { code: 'SK',    name: 'Eslováquia' },
  { code: 'HU',    name: 'Hungria' },
  { code: 'RO',    name: 'Roménia' },
  { code: 'BG',    name: 'Bulgária' },
  { code: 'HR',    name: 'Croácia' },
  { code: 'SI',    name: 'Eslovénia' },
  { code: 'GR',    name: 'Grécia' },
  { code: 'CY',    name: 'Chipre' },
  { code: 'MT',    name: 'Malta' },
  { code: 'EE',    name: 'Estónia' },
  { code: 'LV',    name: 'Letónia' },
  { code: 'LT',    name: 'Lituânia' },
  { code: 'BR',    name: 'Brasil' },
  { code: 'US',    name: 'Estados Unidos' },
  { code: 'CA',    name: 'Canadá' },
  { code: 'MX',    name: 'México' },
  { code: 'AR',    name: 'Argentina' },
  { code: 'CL',    name: 'Chile' },
  { code: 'CO',    name: 'Colômbia' },
  { code: 'PE',    name: 'Peru' },
  { code: 'UY',    name: 'Uruguai' },
  { code: 'JP',    name: 'Japão' },
  { code: 'CN',    name: 'China' },
  { code: 'KR',    name: 'Coreia do Sul' },
  { code: 'IN',    name: 'Índia' },
  { code: 'AU',    name: 'Austrália' },
  { code: 'NZ',    name: 'Nova Zelândia' },
  { code: 'ZA',    name: 'África do Sul' },
  { code: 'AO',    name: 'Angola' },
  { code: 'MZ',    name: 'Moçambique' },
  { code: 'CV',    name: 'Cabo Verde' },
  { code: 'ST',    name: 'São Tomé e Príncipe' },
  { code: 'GW',    name: 'Guiné-Bissau' },
  { code: 'TL',    name: 'Timor-Leste' },
]

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AddressData {
  recipientName: string
  line1:         string
  line2:         string
  postalCode:    string
  locality:      string
  city:          string
  country:       string
  nif:           string
}

export interface AddressFormProps {
  contactName: string
  data:        AddressData
  onChange:    (data: AddressData) => void
  required?:   boolean
}

// ─── Estilos Stripe-like ──────────────────────────────────────────────────────

const base   = 'relative flex items-center bg-white border border-[#E0E6EB] focus-within:border-[#0570DE] focus-within:shadow-[0_0_0_3px_rgba(5,112,222,0.16)] focus-within:z-10 transition-all'
const top    = `${base} rounded-t-[5px]`
const mid    = `${base} border-t-0`
const bot    = `${base} border-t-0 rounded-b-[5px]`
const single = `${base} rounded-[5px]`
const inp    = 'flex-1 h-12 bg-transparent text-[15px] text-[#30313D] placeholder-[#8792A2] px-3 focus:outline-none'
const inpDis = 'flex-1 h-12 bg-transparent text-[15px] text-[#30313D] px-3 focus:outline-none cursor-default select-none'
const sel    = 'flex-1 h-12 bg-transparent text-[15px] text-[#30313D] px-3 focus:outline-none appearance-none cursor-pointer'

// Ícone de pessoa (igual ao usado em "Informações de contacto")
function PersonIcon() {
  return (
    <svg focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.5 14.4H13.5C13.7209 14.4 13.9 14.2209 13.9 14C13.9 12.1222 12.3778 10.6 10.5 10.6H5.5C3.62223 10.6 2.1 12.1222 2.1 14C2.1 14.2209 2.27909 14.4 2.5 14.4ZM2.5 16H13.5C14.6046 16 15.5 15.1046 15.5 14C15.5 11.2386 13.2614 9 10.5 9H5.5C2.73858 9 0.5 11.2386 0.5 14C0.5 15.1046 1.39543 16 2.5 16Z" fill="#1A1A1A" fillOpacity="0.5"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M8 6.4C9.32548 6.4 10.4 5.32548 10.4 4C10.4 2.67452 9.32548 1.6 8 1.6C6.67452 1.6 5.6 2.67452 5.6 4C5.6 5.32548 6.67452 6.4 8 6.4ZM8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="#1A1A1A" fillOpacity="0.5"/>
    </svg>
  )
}

// Chevron para o select de país
function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-[#8792A2] flex-shrink-0 mr-3 pointer-events-none" viewBox="0 0 16 16" fill="none">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function AddressForm({ contactName, data, onChange, required = true }: AddressFormProps) {
  const [sameAsContact, setSameAsContact] = useState(true)
  const [lookingUp,     setLookingUp]     = useState(false)
  const [cpError,       setCpError]       = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = useCallback((field: keyof AddressData, value: string) => {
    onChange({ ...data, [field]: value })
  }, [data, onChange])

  // Sincroniza nome quando contactName muda e checkbox está ativa
  const prevContactName = useRef(contactName)
  if (sameAsContact && contactName !== prevContactName.current) {
    prevContactName.current = contactName
    if (data.recipientName !== contactName) {
      onChange({ ...data, recipientName: contactName })
    }
  }

  const handleSameAsContact = (checked: boolean) => {
    setSameAsContact(checked)
    onChange({ ...data, recipientName: checked ? contactName : '' })
  }

  // Lookup de código postal português (geoapi.pt)
  const lookupPostalCode = useCallback(async (cp: string) => {
    const clean = cp.replace(/\s/g, '')
    if (!/^\d{4}-\d{3}$/.test(clean)) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLookingUp(true)
      setCpError('')
      try {
        const res  = await fetch(`https://json.geoapi.pt/cp/${clean}`)
        if (!res.ok) throw new Error('não encontrado')
        const json = await res.json() as {
          Localidade?: string
          Concelho?:   string
          Distrito?:   string
          'Designação Postal'?: string
          partes?: { Artéria?: string }[]
        }
        const locality    = json['Designação Postal'] || json.Localidade || ''
        const city        = json.Concelho || json.Distrito || ''
        const firstStreet = json.partes?.[0]?.Artéria || ''
        onChange({
          ...data,
          postalCode: clean,
          locality,
          city,
          ...(firstStreet && !data.line1 ? { line1: firstStreet } : {}),
        })
      } catch {
        setCpError('Código postal não encontrado')
      } finally {
        setLookingUp(false)
      }
    }, 600)
  }, [data, onChange])

  const isPortugal = data.country === 'PT' || data.country === 'PT-MA' || data.country === 'PT-AC'

  return (
    <div>

      {/* Label da secção */}
      <p className="text-[12px] font-medium text-[#30313D] uppercase tracking-wide mb-2">
        Onde pretende receber
      </p>

      {/* ── Grupo 1: nome do destinatário ── */}
      <div className="mb-3">
        {/* Checkbox */}
        <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={sameAsContact}
            onChange={e => handleSameAsContact(e.target.checked)}
            className="w-4 h-4 rounded border-[#C0C8D2] accent-[#0570DE] cursor-pointer flex-shrink-0"
          />
          <span className="text-[13px] text-[#6D6E78]">
            {contactName
              ? <><strong className="text-[#30313D] font-medium">{contactName}</strong> é quem vai receber</>
              : 'Mesma pessoa do contacto vai receber'
            }
          </span>
        </label>

        {/* Campo nome — sempre visível, readonly quando checkbox ativa */}
        <div className={single} style={sameAsContact ? { backgroundColor: '#F6F9FC' } : {}}>
          <span className="pl-3 flex-shrink-0"><PersonIcon /></span>
          <input
            className={sameAsContact ? inpDis : inp}
            type="text"
            value={sameAsContact ? (contactName || '') : data.recipientName}
            onChange={e => { if (!sameAsContact) set('recipientName', e.target.value) }}
            placeholder="Nome de quem vai receber"
            required={required && !sameAsContact}
            autoComplete="name"
            readOnly={sameAsContact}
            tabIndex={sameAsContact ? -1 : 0}
          />
        </div>
      </div>

      {/* ── Grupo 2: código postal + localidade + cidade ── */}
      <div className="mb-3">
        {/* Código postal */}
        <div className={top}>
          <div className="relative flex-1 flex items-center">
            <input
              className={inp}
              type="text"
              value={data.postalCode}
              onChange={e => {
                set('postalCode', e.target.value)
                if (isPortugal) lookupPostalCode(e.target.value)
              }}
              placeholder={isPortugal ? 'Código postal (ex: 1000-001)' : 'Código postal'}
              required={required}
              autoComplete="postal-code"
              maxLength={isPortugal ? 8 : 20}
            />
            {lookingUp && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 size={14} className="animate-spin text-[#8792A2]" />
              </span>
            )}
          </div>
        </div>
        {cpError && <p className="text-[12px] text-red-500 px-1 pt-1 mb-1">{cpError}</p>}

        {/* Localidade */}
        <div className={mid}>
          <input
            className={inp}
            type="text"
            value={data.locality}
            onChange={e => set('locality', e.target.value)}
            placeholder="Localidade / Freguesia"
            required={required}
            autoComplete="address-level3"
          />
        </div>

        {/* Cidade */}
        <div className={bot}>
          <input
            className={inp}
            type="text"
            value={data.city}
            onChange={e => set('city', e.target.value)}
            placeholder="Cidade / Concelho"
            required={required}
            autoComplete="address-level2"
          />
        </div>
      </div>

      {/* ── Grupo 3: morada + complemento ── */}
      <div className="mb-3">
        <div className={top}>
          <input
            className={inp}
            type="text"
            value={data.line1}
            onChange={e => set('line1', e.target.value)}
            placeholder="Morada (rua, avenida, travessa…)"
            required={required}
            autoComplete="address-line1"
          />
        </div>
        <div className={bot}>
          <input
            className={inp}
            type="text"
            value={data.line2}
            onChange={e => set('line2', e.target.value)}
            placeholder="Nº porta, andar, apartamento (opcional)"
            autoComplete="address-line2"
          />
        </div>
      </div>

      {/* ── Grupo 4: NIF + país ── */}
      <div>
        {/* NIF */}
        <div className={top}>
          <input
            className={inp}
            type="text"
            value={data.nif}
            onChange={e => set('nif', e.target.value)}
            placeholder="NIF / Contribuinte (opcional)"
            autoComplete="off"
            maxLength={20}
          />
        </div>

        {/* País */}
        <div className={bot}>
          <select
            className={sel}
            value={data.country}
            onChange={e => {
              onChange({ ...data, country: e.target.value, postalCode: '', locality: '', city: '', line1: '', line2: '' })
              setCpError('')
            }}
            autoComplete="country"
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <ChevronIcon />
        </div>
      </div>

    </div>
  )
}

export const emptyAddress = (): AddressData => ({
  recipientName: '',
  line1:         '',
  line2:         '',
  postalCode:    '',
  locality:      '',
  city:          '',
  country:       'PT',
  nif:           '',
})
