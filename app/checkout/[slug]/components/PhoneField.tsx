'use client'

import { useState, useRef } from 'react'

interface PhoneFieldProps {
  contactPhone: string        // telefone preenchido na secção de contacto
  value: string
  onChange: (v: string) => void
  countryCode: string
  callingCode: string
  inputCls: string
  required?: boolean
}

export function PhoneField({ contactPhone, value, onChange, countryCode, callingCode, inputCls, required = false }: PhoneFieldProps) {
  const [sameAsContact, setSameAsContact] = useState(true)

  const prevContactPhone = useRef(contactPhone)
  if (sameAsContact && contactPhone !== prevContactPhone.current) {
    prevContactPhone.current = contactPhone
    if (value !== contactPhone) onChange(contactPhone)
  }

  const handleCheckbox = (checked: boolean) => {
    setSameAsContact(checked)
    if (checked) onChange(contactPhone)
    else onChange('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          id="same-phone"
          type="checkbox"
          checked={sameAsContact}
          onChange={e => handleCheckbox(e.target.checked)}
          className="w-4 h-4 rounded border-[#C0C8D2] accent-[#0570DE] cursor-pointer"
        />
        <label htmlFor="same-phone" className="text-[13px] text-[#6D6E78] cursor-pointer select-none">
          {contactPhone
            ? <><strong className="text-[#30313D] font-medium">{contactPhone}</strong> é o mesmo número</>
            : 'Mesmo telefone do contacto'
          }
        </label>
      </div>
      {!sameAsContact && (
        <div className="relative flex items-center border border-[#E0E6EB] rounded-[5px] bg-white focus-within:border-[#0570DE] focus-within:shadow-[0_0_0_3px_rgba(5,112,222,0.16)] transition-all">
          <span className="pl-3 flex items-center gap-1.5 flex-shrink-0">
            <img
              src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`}
              alt={countryCode}
              className="w-5 h-auto"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <span className="text-[13px] text-[#30313D]">{callingCode}</span>
          </span>
          <input
            className="flex-1 h-11 bg-transparent text-[15px] text-[#30313D] placeholder-[#8792A2] pl-2 pr-3 focus:outline-none"
            type="tel"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="912 345 678"
            required={required}
            autoComplete="tel"
          />
        </div>
      )}
    </div>
  )
}
