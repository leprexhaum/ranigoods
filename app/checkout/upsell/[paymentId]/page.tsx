import { Suspense } from 'react'
import UpsellContent from './UpsellContent'

export default function UpsellPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="flex justify-center">
            <div className="h-7 w-48 bg-[#e5e7eb] rounded-full animate-pulse" />
          </div>
          <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
            <div className="w-full h-48 bg-[#e5e7eb] animate-pulse" />
            <div className="px-6 py-6 space-y-4">
              <div className="h-6 w-3/4 bg-[#e5e7eb] rounded animate-pulse" />
              <div className="h-4 w-full bg-[#e5e7eb] rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-[#e5e7eb] rounded animate-pulse" />
              <div className="h-8 w-1/3 bg-[#e5e7eb] rounded animate-pulse" />
              <div className="h-12 w-full bg-[#d1d5db] rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    }>
      <UpsellContent />
    </Suspense>
  )
}
