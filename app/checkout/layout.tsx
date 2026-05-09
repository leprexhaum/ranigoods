import { Inter, Be_Vietnam_Pro } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
})

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${beVietnamPro.variable} font-sans`}>
      {children}
    </div>
  )
}
