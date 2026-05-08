import { prisma } from '@/lib/prisma'
import { promises as dns } from 'dns'

const PROXY_HOST = process.env.NEXT_PUBLIC_PROXY_HOST ?? 'proxy.techpags.shop'

export interface CustomDomainRecord {
  id:         string
  userId:     string
  domain:     string
  status:     'pending' | 'active' | 'failed'
  failReason: string
  verifiedAt: string | null
  createdAt:  string
}

function toRecord(r: {
  id: string; userId: string; domain: string; status: string;
  failReason: string; verifiedAt: Date | null; createdAt: Date;
}): CustomDomainRecord {
  return {
    id:         r.id,
    userId:     r.userId,
    domain:     r.domain,
    status:     r.status as CustomDomainRecord['status'],
    failReason: r.failReason,
    verifiedAt: r.verifiedAt?.toISOString() ?? null,
    createdAt:  r.createdAt.toISOString(),
  }
}

async function resolveIps(host: string): Promise<string[]> {
  try {
    return await dns.resolve4(host)
  } catch {
    return []
  }
}

/** Verificação HTTP via Cloudflare Worker.
 *  O worker responde a /.well-known/techpags-verify/{token} com o token em texto.
 *  Funciona mesmo com proxy Cloudflare ligado (laranja).
 */
async function checkHttp(domain: string): Promise<{ ok: boolean; reason: string }> {
  const token = `techpags-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const url   = `https://${domain}/.well-known/techpags-verify/${token}`
  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const body = await res.text()
    if (res.ok && body.trim() === token) {
      return { ok: true, reason: '' }
    }
    return {
      ok:     false,
      reason: `Verificação HTTP falhou — o domínio não respondeu corretamente (status ${res.status})`,
    }
  } catch {
    return {
      ok:     false,
      reason: 'Verificação HTTP falhou — o domínio não está acessível. Verifique se o CNAME está correto e o proxy está ativo.',
    }
  }
}

async function checkCname(domain: string): Promise<{ ok: boolean; reason: string }> {
  // 1. Tenta CNAME direto (proxy Cloudflare desligado — DNS only)
  try {
    const addresses = await dns.resolveCname(domain)
    const found = addresses.some(a => a.replace(/\.$/, '') === PROXY_HOST.replace(/\.$/, ''))
    if (found) return { ok: true, reason: '' }
    // CNAME existe mas aponta para outro lugar — falha imediata
    return { ok: false, reason: `CNAME aponta para ${addresses[0] ?? 'desconhecido'}, esperado ${PROXY_HOST}` }
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOTFOUND') {
      return { ok: false, reason: 'Domínio não encontrado — verifique se o DNS foi configurado' }
    }
    // ENODATA = sem CNAME visível (proxy Cloudflare ligado ou Flattening)
    if (code !== 'ENODATA') {
      return { ok: false, reason: 'Erro ao consultar DNS' }
    }
  }

  // 2. Fallback: Cloudflare Flattening (CNAME raiz @) — compara IPs
  const [domainIps, proxyIps] = await Promise.all([
    resolveIps(domain),
    resolveIps(PROXY_HOST),
  ])

  if (domainIps.length > 0 && proxyIps.length > 0) {
    const proxySet = new Set(proxyIps)
    if (domainIps.some(ip => proxySet.has(ip))) {
      return { ok: true, reason: '' }
    }
  }

  // 3. Fallback HTTP: proxy Cloudflare ligado (laranja) oculta o CNAME e os IPs.
  //    Verifica se o domínio responde ao endpoint do worker.
  return checkHttp(domain)
}

export const domainService = {
  async list(userId: string): Promise<CustomDomainRecord[]> {
    const rows = await prisma.customDomain.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(toRecord)
  },

  async create(userId: string, domain: string): Promise<CustomDomainRecord> {
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    const row = await prisma.customDomain.create({
      data: { userId, domain: clean, status: 'pending' },
    })
    return toRecord(row)
  },

  async verify(id: string, userId: string): Promise<CustomDomainRecord | null> {
    const row = await prisma.customDomain.findFirst({ where: { id, userId } })
    if (!row) return null

    const { ok, reason } = await checkCname(row.domain)

    const updated = await prisma.customDomain.update({
      where: { id },
      data: {
        status:     ok ? 'active' : 'failed',
        failReason: ok ? '' : reason,
        verifiedAt: ok ? new Date() : null,
      },
    })
    return toRecord(updated)
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await prisma.customDomain.deleteMany({ where: { id, userId } })
    return result.count > 0
  },

  async getByDomain(domain: string): Promise<CustomDomainRecord | null> {
    const row = await prisma.customDomain.findUnique({ where: { domain } })
    return row ? toRecord(row) : null
  },
}
