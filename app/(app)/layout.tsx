import { AuthProvider }  from '@/components/providers/AuthProvider'
import AppShell          from '@/components/AppShell'
import PixelProvider     from '@/components/providers/PixelProvider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PixelProvider>
        <AppShell>{children}</AppShell>
      </PixelProvider>
    </AuthProvider>
  )
}
