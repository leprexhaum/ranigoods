import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { CheckoutColors } from '@/lib/types/checkout'
import { DEFAULT_CHECKOUT_COLORS } from '@/lib/types/checkout'

export const checkoutConfigService = {
  async getGlobal(): Promise<Partial<CheckoutColors>> {
    const settings = await prisma.settings.findFirst({ where: { id: 1 }, select: { checkoutColors: true } })
    if (!settings || !settings.checkoutColors) return {}
    const colors = settings.checkoutColors as Record<string, string>
    if (!colors || Object.keys(colors).length === 0) return {}
    return colors as Partial<CheckoutColors>
  },

  async setGlobal(colors: Partial<CheckoutColors>): Promise<void> {
    await prisma.settings.upsert({
      where: { id: 1 },
      create: { checkoutColors: colors as object },
      update: { checkoutColors: colors as object },
    })
    logger.info('CHECKOUT', 'Cores globais atualizadas', { colors: JSON.stringify(colors) })
  },

  async getForProduct(productId: string): Promise<Partial<CheckoutColors>> {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { checkoutColors: true } })
    if (!product || !product.checkoutColors) return {}
    const colors = product.checkoutColors as Record<string, string>
    if (!colors || Object.keys(colors).length === 0) return {}
    return colors as Partial<CheckoutColors>
  },

  async setForProduct(productId: string, colors: Partial<CheckoutColors>): Promise<void> {
    await prisma.product.update({ where: { id: productId }, data: { checkoutColors: colors as object } })
    logger.info('CHECKOUT', 'Cores do produto atualizadas', { productId, colors: JSON.stringify(colors) })
  },

  async resolve(productId: string): Promise<CheckoutColors> {
    const productColors = await this.getForProduct(productId)
    const globalColors = await this.getGlobal()
    return { ...DEFAULT_CHECKOUT_COLORS, ...globalColors, ...productColors }
  },
}
