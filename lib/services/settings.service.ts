import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface AppSettings {
  companyName: string
  nif: string
  email: string
  timezone: string
  stripeKey: string
  stripeSecret: string
  webhookSecret: string
  notifyApproved: boolean
  notifyFailed: boolean
  notifyRefund: boolean
  notifyDaily: boolean
  notifyWeekly: boolean
}

export const settingsService = {
  async get(): Promise<AppSettings> {
    const row = await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    })
    return {
      companyName:    row.companyName,
      nif:            row.nif,
      email:          row.email,
      timezone:       row.timezone,
      stripeKey:      row.stripeKey,
      stripeSecret:   row.stripeSecret,
      webhookSecret:  row.webhookSecret,
      notifyApproved: row.notifyApproved,
      notifyFailed:   row.notifyFailed,
      notifyRefund:   row.notifyRefund,
      notifyDaily:    row.notifyDaily,
      notifyWeekly:   row.notifyWeekly,
    }
  },

  async update(data: Partial<AppSettings>): Promise<AppSettings> {
    logger.info('CONFIG', 'Atualizando configurações via service', { campos: Object.keys(data).join(',') })
    const row = await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    })
    return {
      companyName:    row.companyName,
      nif:            row.nif,
      email:          row.email,
      timezone:       row.timezone,
      stripeKey:      row.stripeKey,
      stripeSecret:   row.stripeSecret,
      webhookSecret:  row.webhookSecret,
      notifyApproved: row.notifyApproved,
      notifyFailed:   row.notifyFailed,
      notifyRefund:   row.notifyRefund,
      notifyDaily:    row.notifyDaily,
      notifyWeekly:   row.notifyWeekly,
    }
  },
}
