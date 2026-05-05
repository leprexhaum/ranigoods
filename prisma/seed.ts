import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada')
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma  = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database…')

  // Garantir que existe uma linha de Settings
  await prisma.settings.upsert({
    where:  { id: 1 },
    update: {},
    create: {
      id:          1,
      companyName: '',
      nif:         '',
      email:       '',
      timezone:    'Europe/Lisbon',
      stripeKey:   '',
      stripeSecret: '',
      webhookSecret: '',
    },
  })
  console.log('  ✓ settings')

  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
