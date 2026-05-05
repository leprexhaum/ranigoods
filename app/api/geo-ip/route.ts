import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const CALLING_CODES: Record<string, string> = {
  PT: '+351', BR: '+55',  ES: '+34',  FR: '+33',
  IT: '+39',  DE: '+49',  GB: '+44',  US: '+1',
  NL: '+31',  BE: '+32',  AT: '+43',  CH: '+41',
  PL: '+48',  SE: '+46',  NO: '+47',  DK: '+45',
  FI: '+358', IE: '+353', LU: '+352', GR: '+30',
  CZ: '+420', HU: '+36',  RO: '+40',  SK: '+421',
  HR: '+385', BG: '+359', SI: '+386', LT: '+370',
  LV: '+371', EE: '+372', MX: '+52',  AR: '+54',
  CO: '+57',  CL: '+56',  PE: '+51',  VE: '+58',
  CA: '+1',   AU: '+61',  NZ: '+64',  JP: '+81',
  CN: '+86',  IN: '+91',  ZA: '+27',  NG: '+234',
  AO: '+244', MZ: '+258', CV: '+238',
}

export async function GET(req: NextRequest) {
  const countryCode = req.headers.get('x-vercel-ip-country') ?? 'PT'
  return NextResponse.json({
    countryCode,
    callingCode: CALLING_CODES[countryCode] ?? '+351',
  })
}
