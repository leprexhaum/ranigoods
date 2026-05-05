import { prisma } from '@/lib/prisma'
import { productService } from '@/lib/services/product.service'

export interface CartItemInput {
  productId: string
  quantity:  number
}

export interface CartItemDetail {
  id:        string
  productId: string
  name:      string
  imageUrl:  string
  quantity:  number
  unitPrice: number
  currency:  string
  stock:     number
}

export interface CartDetail {
  id:            string
  userId:        string
  status:        string
  expiresAt:     string
  total:         number
  currency:      string
  checkoutTemplate: string
  checkoutLanguage: string
  requirePhone:  boolean
  logoUrl:       string
  brandName:     string
  items:         CartItemDetail[]
}

export const cartService = {
  async create(
    userId:    string,
    items:     CartItemInput[],
    urlParams: Record<string, string> = {},
  ): Promise<{ cartId: string; checkoutUrl: string; expiresAt: string; total: number; currency: string; items: CartItemDetail[] }> {
    if (!items.length) throw new Error('O carrinho precisa ter pelo menos um item')

    // Buscar todos os produtos de uma vez
    const productIds = [...new Set(items.map(i => i.productId))]
    const products   = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    })

    // Validar que todos existem e pertencem ao userId
    for (const item of items) {
      const p = products.find(p => p.id === item.productId)
      if (!p) throw new Error(`Produto ${item.productId} não encontrado`)
      if (p.userId !== userId) throw new Error(`Produto ${item.productId} não pertence a esta conta`)
      if (item.quantity < 1) throw new Error(`Quantidade inválida para ${item.productId}`)

      // Validar estoque
      if (p.stock !== -1 && p.stock < item.quantity) {
        throw new Error(`Produto "${p.name}" tem apenas ${p.stock} unidade(s) disponível(is)`)
      }
    }

    // Todos os produtos devem ter a mesma moeda
    const currencies = [...new Set(products.map(p => p.currency))]
    if (currencies.length > 1) throw new Error('Todos os produtos do carrinho devem ter a mesma moeda')
    const currency = currencies[0]

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const cart = await prisma.cart.create({
      data: {
        userId,
        expiresAt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        urlParams: urlParams as any,
        items: {
          create: items.map(item => {
            const p = products.find(p => p.id === item.productId)!
            return { productId: item.productId, quantity: item.quantity, unitPrice: p.price }
          }),
        },
      },
      include: { items: { include: { product: true } } },
    })

    const total = cart.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
    const checkoutUrl = `${baseUrl}/checkout/cart/${cart.id}`

    const itemDetails: CartItemDetail[] = cart.items.map(i => ({
      id:        i.id,
      productId: i.productId,
      name:      i.product.name,
      imageUrl:  i.product.imageUrl,
      quantity:  i.quantity,
      unitPrice: i.unitPrice,
      currency,
      stock:     i.product.stock,
    }))

    return { cartId: cart.id, checkoutUrl, expiresAt: expiresAt.toISOString(), total, currency, items: itemDetails }
  },

  async getById(cartId: string): Promise<CartDetail | null> {
    const cart = await prisma.cart.findUnique({
      where:   { id: cartId },
      include: { items: { include: { product: true } } },
    })
    if (!cart) return null

    const firstProduct = cart.items[0]?.product
    const total        = cart.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const currency     = cart.items[0]?.product.currency ?? 'EUR'

    return {
      id:               cart.id,
      userId:           cart.userId,
      status:           cart.status,
      expiresAt:        cart.expiresAt.toISOString(),
      total,
      currency,
      checkoutTemplate: firstProduct?.checkoutTemplate ?? 'single_step',
      checkoutLanguage: firstProduct?.checkoutLanguage ?? 'pt',
      requirePhone:     cart.items.some(i => i.product.requirePhone),
      logoUrl:          firstProduct?.logoUrl  ?? '',
      brandName:        firstProduct?.brandName ?? '',
      items: cart.items.map(i => ({
        id:        i.id,
        productId: i.productId,
        name:      i.product.name,
        imageUrl:  i.product.imageUrl,
        quantity:  i.quantity,
        unitPrice: i.unitPrice,
        currency:  i.product.currency,
        stock:     i.product.stock,
      })),
    }
  },

  async markPaid(cartId: string, stripeSessionId: string): Promise<void> {
    await prisma.cart.update({
      where: { id: cartId },
      data:  { status: 'paid', stripeSessionId },
    })
  },

  async expireOld(): Promise<number> {
    const result = await prisma.cart.updateMany({
      where: { status: 'pending', expiresAt: { lt: new Date() } },
      data:  { status: 'expired' },
    })
    return result.count
  },
}
