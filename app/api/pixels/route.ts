import { NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'

export async function GET() {
  return NextResponse.json(await pixelService.getAll())
}
