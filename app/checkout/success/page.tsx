import { Suspense } from 'react'
import SuccessContent from './SuccessContent'

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-20 h-20 rounded-full bg-[#e5e7eb] animate-pulse" />
        <div className="space-y-3 w-full max-w-xs text-center">
          <div className="h-6 w-48 bg-[#e5e7eb] rounded animate-pulse mx-auto" />
          <div className="h-4 w-64 bg-[#e5e7eb] rounded animate-pulse mx-auto" />
        </div>
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f3f4f6]">
            <div className="h-4 w-32 bg-[#e5e7eb] rounded animate-pulse" />
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="h-4 w-full bg-[#e5e7eb] rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-[#e5e7eb] rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-[#e5e7eb] rounded animate-pulse" />
          </div>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
