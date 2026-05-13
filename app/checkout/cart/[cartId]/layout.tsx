import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

interface Props {
  params: { cartId: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cart = await prisma.cart.findUnique({
    where: { id: params.cartId },
    include: { items: { include: { product: true }, take: 1 } },
  })

  if (!cart || !cart.items[0]) {
    return { title: 'Checkout' }
  }

  const product = cart.items[0].product
  const title = product.brandName || product.name
  const description = `Checkout — ${product.name}`
  const image = product.logoUrl || product.imageUrl || undefined

  return {
    title,
    description,
    icons: image ? { icon: image, apple: image } : undefined,
    openGraph: {
      title,
      description,
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default function CartCheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
