import { Suspense } from 'react'
import UpsellContent from './UpsellContent'

export default function UpsellPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="w-8 h-8 border-2 border-[#635bff] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <UpsellContent />
    </Suspense>
  )
}
