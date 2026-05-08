'use client'

import { useState, useCallback, useRef } from 'react'
import { Loader2, MapPin } from 'lucide-react'

// ─── Lista completa de países ─────────────────────────────────────────────────

export const COUNTRIES = [
  { code: 'PT', name: 'Portugal' },
  { code: 'PT-MA', name: 'Portugal — Madeira' },
  { code: 'PT-AC', name: 'Portugal — Açores' },
  { code: 'ES', name: 'Espanha' },
  { code: 'FR', name: 'França' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'IT', name: 'Itália' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'NL', name: 'Países Baixos' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'LU', name: 'Luxemburgo' },
  { code: 'CH', name: 'Suíça' },
  { code: 'AT', name: 'Áustria' },
  { code: 'SE', name: 'Suécia' },
  { code: 'NO', name: 'Noruega' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'FI', name: 'Finlândia' },
  { code: 'PL', name: 'Polónia' },
  { code: 'CZ', name: 'República Checa' },
  { code: 'SK', name: 'Eslováquia' },
  { code: 'HU', name: 'Hungria' },
  { code: 'RO', name: 'Roménia' },
  { code: 'BG', name: 'Bulgária' },
  { code: 'HR', name: 'Croácia' },
  { code: 'SI', name: 'Eslovénia' },
  { code: 'GR', name: 'Grécia' },
  { code: 'CY', name: 'Chipre' },
  { code: 'MT', name: 'Malta' },
  { code: 'EE', name: 'Estónia' },
  { code: 'LV', name: 'Letónia' },
  { code: 'LT', name: 'Lituânia' },
  { code: 'BR', name: 'Brasil' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'CA', name: 'Canadá' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colômbia' },
  { code: 'PE', name: 'Peru' },
  { code: 'UY', name: 'Uruguai' },
  { code: 'JP', name: 'Japão' },
  { code: 'CN', name: 'China' },
  { code: 'KR', name: 'Coreia do Sul' },
  { code: 'IN', name: 'Índia' },
  { code: 'AU', name: 'Austrália' },
  { code: 'NZ', name: 'Nova Zelândia' },
  { code: 'ZA', name: 'África do Sul' },
  { code: 'AO', name: 'Angola' },
  { code: 'MZ', name: 'Moçambique' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'ST', name: 'São Tomé e Príncipe' },
  { code: 'GW', name: 'Guiné-Bissau' },
  { code: 'TL', name: 'Timor-Leste' },
]

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AddressData {
  recipientName: string
  line1: string
  line2: string
  postalCode: string
  locality: string
  city: string
  country: string
  nif: string
}

interface AddressFormProps {
  contactName: string          // nome preenchido na secção de contacto
  data: AddressData
  onChange: (data: AddressData) => void
  inputCls: string
  required?: boolean
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function AddressForm({ contactName, data, onChange, inputCls, required = true }: AddressFormProps) {
  const [sameAsContact, setSameAsContact] = useState(true)
  const [lookingUp, setLookingUp]         = useState(false)
  const [cpError, setCpError]             = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = useCallback((field: keyof AddressData, value: string) => {
    onChange({ ...data, [field]: value })
  }, [data, onChange])

  // Quando checkbox muda
  const handleSameAsContact = (checked: boolean) => {
    setSameAsContact(checked)
    if (checked) {
      onChange({ ...data, recipientName: contactName })
    } else {
      onChange({ ...data, recipientName: '' })
    }
  }

  // Sincroniza nome quando contactName muda e checkbox está ativa
  const prevContactName = useRef(contactName)
  if (sameAsContact && contactName !== prevContactName.current) {
    prevContactName.current = contactName
    if (data.recipientName !== contactName) {
      onChange({ ...data, recipientName: contactName })
    }
  }

  // Lookup de código postal português (geoapi.pt)
  const lookupPostalCode = useCallback(async (cp: string) => {
    const clean = cp.replace(/\s/g, '')
    // Formato português: XXXX-XXX
    if (!/^\d{4}-\d{3}$/.test(clean)) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLookingUp(true)
      setCpError('')
      try {
        const res = await fetch(`https://json.geoapi.pt/cp/${clean}`)
        if (!res.ok) throw new Error('Código postal não encontrado')
        const json = await res.json() as {
          Localidade?: string
          Concelho?: string
          Distrito?: string
          'Designação Postal'?: string
          partes?: { Artéria?: string }[]
        }
        const locality = json['Designação Postal'] || json.Localidade || ''
        const city     = json.Concelho || json.Distrito || ''
        // Sugerir primeira rua se disponível e line1 estiver vazio
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
    <div className="space-y-3">

      {/* Título da secção */}
      <p className="text-[12px] font-medium text-[#30313D] uppercase tracking-wide flex items-center gap-1.5">
        <MapPin size={13} className="text-[#8792A2]" />
        Onde pretende receber
      </p>

      {/* Nome do destinatário */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            id="same-as-contact"
            type="checkbox"
            checked={sameAsContact}
            onChange={e => handleSameAsContact(e.target.checked)}
            className="w-4 h-4 rounded border-[#C0C8D2] text-[#0570DE] accent-[#0570DE] cursor-pointer"
          />
          <label htmlFor="same-as-contact" className="text-[13px] text-[#6D6E78] cursor-pointer select-none">
            {contactName
              ? <><strong className="text-[#30313D] font-medium">{contactName}</strong> é quem vai receber</>
              : 'Mesma pessoa do contacto vai receber'
            }
          </label>
        </div>
        {!sameAsContact && (
          <input
            className={inputCls}
            type="text"
            value={data.recipientName}
            onChange={e => set('recipientName', e.target.value)}
            placeholder="Nome de quem vai receber"
            required={required}
            autoComplete="name"
          />
        )}
      </div>

      {/* País */}
      <select
        className={inputCls}
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

      {/* Código postal com lookup automático (só PT) */}
      <div className="relative">
        <input
          className={inputCls}
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
      {cpError && <p className="text-[12px] text-red-500">{cpError}</p>}

      {/* Localidade (preenchida automaticamente) */}
      <input
        className={inputCls}
        type="text"
        value={data.locality}
        onChange={e => set('locality', e.target.value)}
        placeholder="Localidade / Freguesia"
        required={required}
        autoComplete="address-level3"
      />

      {/* Cidade / Concelho */}
      <input
        className={inputCls}
        type="text"
        value={data.city}
        onChange={e => set('city', e.target.value)}
        placeholder="Cidade / Concelho"
        required={required}
        autoComplete="address-level2"
      />

      {/* Morada */}
      <input
        className={inputCls}
        type="text"
        value={data.line1}
        onChange={e => set('line1', e.target.value)}
        placeholder="Morada (rua, avenida, travessa…)"
        required={required}
        autoComplete="address-line1"
      />

      {/* Complemento */}
      <input
        className={inputCls}
        type="text"
        value={data.line2}
        onChange={e => set('line2', e.target.value)}
        placeholder="Nº porta, andar, apartamento (opcional)"
        autoComplete="address-line2"
      />

      {/* NIF (opcional) */}
      <input
        className={inputCls}
        type="text"
        value={data.nif}
        onChange={e => set('nif', e.target.value)}
        placeholder="NIF / Contribuinte (opcional)"
        autoComplete="off"
        maxLength={20}
      />
    </div>
  )
}

export const emptyAddress = (): AddressData => ({
  recipientName: '',
  line1: '',
  line2: '',
  postalCode: '',
  locality: '',
  city: '',
  country: 'PT',
  nif: '',
})
