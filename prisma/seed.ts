import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { recentPayments, dailySales } from '../lib/mock-data'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:muieAihDtDgZjvFooFElIrqCxizmepJo@shinkansen.proxy.rlwy.net:45207/railway',
})
const prisma = new PrismaClient({ adapter })

const mockProducts = [
  { id: '1', name: 'Plano Starter',    price: 4990,  interval: 'mês',  sales: 312, revenue: BigInt(155688000), status: 'active',   stripeId: 'prod_starter'   },
  { id: '2', name: 'Plano Pro',        price: 9990,  interval: 'mês',  sales: 524, revenue: BigInt(523476000), status: 'active',   stripeId: 'prod_pro'       },
  { id: '3', name: 'Plano Business',   price: 19990, interval: 'mês',  sales: 198, revenue: BigInt(395800200), status: 'active',   stripeId: 'prod_biz'       },
  { id: '4', name: 'Plano Enterprise', price: 49990, interval: 'mês',  sales: 47,  revenue: BigInt(234953000), status: 'active',   stripeId: 'prod_ent'       },
  { id: '5', name: 'Add-on Analytics', price: 2990,  interval: 'mês',  sales: 89,  revenue: BigInt(26611000),  status: 'active',   stripeId: 'prod_analytics' },
  { id: '6', name: 'Add-on Pixels',    price: 1990,  interval: 'mês',  sales: 156, revenue: BigInt(31044000),  status: 'active',   stripeId: 'prod_pixels'    },
  { id: '7', name: 'Créditos Extras',  price: 9900,  interval: 'unit', sales: 43,  revenue: BigInt(425700),    status: 'archived', stripeId: 'prod_credits'   },
]

const defaultEvents = [
  { event: 'PageView',             enabled: true,  valueParam: false },
  { event: 'ViewContent',          enabled: true,  valueParam: false },
  { event: 'AddToCart',            enabled: true,  valueParam: true  },
  { event: 'InitiateCheckout',     enabled: true,  valueParam: true  },
  { event: 'AddPaymentInfo',       enabled: true,  valueParam: true  },
  { event: 'Purchase',             enabled: true,  valueParam: true  },
  { event: 'Lead',                 enabled: false, valueParam: false },
  { event: 'CompleteRegistration', enabled: false, valueParam: false },
  { event: 'Subscribe',            enabled: false, valueParam: true  },
  { event: 'StartTrial',           enabled: false, valueParam: true  },
  { event: 'Search',               enabled: false, valueParam: false },
]

const defaultAdsEvents = [
  { event: 'Purchase',             enabled: true,  valueParam: true  },
  { event: 'Lead',                 enabled: true,  valueParam: false },
  { event: 'CompleteRegistration', enabled: false, valueParam: false },
  { event: 'InitiateCheckout',     enabled: true,  valueParam: true  },
  { event: 'AddToCart',            enabled: false, valueParam: true  },
  { event: 'ViewContent',          enabled: false, valueParam: false },
  { event: 'PageView',             enabled: false, valueParam: false },
  { event: 'AddPaymentInfo',       enabled: false, valueParam: false },
  { event: 'Subscribe',            enabled: false, valueParam: true  },
  { event: 'StartTrial',           enabled: false, valueParam: true  },
  { event: 'Search',               enabled: false, valueParam: false },
]

const pixelConfigs = [
  { id: 'meta',       platform: 'meta',       name: 'Meta Pixel',         events: defaultEvents    },
  { id: 'ga4',        platform: 'ga4',        name: 'Google Analytics 4', events: defaultEvents    },
  { id: 'google_ads', platform: 'google_ads', name: 'Google Ads',         events: defaultAdsEvents },
  { id: 'tiktok',     platform: 'tiktok',     name: 'TikTok Pixel',       events: defaultEvents    },
]

async function main() {
  console.log('Seeding database…')

  await prisma.pixelLog.deleteMany()
  await prisma.pixelConfig.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.dailySale.deleteMany()
  await prisma.product.deleteMany()

  await prisma.payment.createMany({
    data: recentPayments.map(p => ({
      id:       p.id,
      customer: p.customer,
      email:    p.email,
      amount:   p.amount,
      status:   p.status,
      date:     p.date,
      product:  p.product,
      method:   p.method,
    })),
  })
  console.log(`  ✓ ${recentPayments.length} payments`)

  await prisma.dailySale.createMany({
    data: dailySales.map(d => ({
      date:    d.date,
      isoDate: d.isoDate,
      receita: d.receita,
      vendas:  d.vendas,
      falhas:  d.falhas,
    })),
  })
  console.log(`  ✓ ${dailySales.length} daily sales`)

  await prisma.product.createMany({ data: mockProducts })
  console.log(`  ✓ ${mockProducts.length} products`)

  await prisma.pixelConfig.createMany({
    data: pixelConfigs.map(p => ({
      id:              p.id,
      platform:        p.platform,
      name:            p.name,
      pixelId:         '',
      accessToken:     '',
      testEventCode:   '',
      conversionLabel: '',
      enabled:         false,
      events:          p.events,
      createdAt:       new Date('2026-05-04T00:00:00.000Z'),
      updatedAt:       new Date('2026-05-04T00:00:00.000Z'),
    })),
  })
  console.log(`  ✓ ${pixelConfigs.length} pixel configs`)

  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
