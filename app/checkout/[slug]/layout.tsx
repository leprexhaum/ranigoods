import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

interface Props {
  params: { slug: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug, active: true },
    select: { name: true, description: true, brandName: true, legalName: true, logoUrl: true, imageUrl: true },
  })

  if (!product) {
    return { title: 'Checkout' }
  }

  const title = product.brandName || product.name
  const description = product.description || `Checkout — ${product.name}`
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

export default function CheckoutSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
