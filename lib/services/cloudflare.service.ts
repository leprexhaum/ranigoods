import { logger } from '@/lib/logger'

const API_BASE = 'https://api.cloudflare.com/client/v4'

function getHeaders() {
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN não configurado')
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function getAccountId() {
  const id = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!id) throw new Error('CLOUDFLARE_ACCOUNT_ID não configurado')
  return id
}

function getWorkerName() {
  return process.env.CLOUDFLARE_WORKER_NAME ?? 'techpags-proxy'
}

interface CfResponse<T = unknown> {
  success: boolean
  errors: { code: number; message: string }[]
  result: T
}

async function cfFetch<T = unknown>(path: string, init?: RequestInit): Promise<CfResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...getHeaders(), ...(init?.headers ?? {}) },
  })
  return res.json() as Promise<CfResponse<T>>
}

// ─── Zone ────────────────────────────────────────────────────────────────────

interface CfZone {
  id: string
  name: string
  status: string
  name_servers: string[]
}

async function createZone(domain: string): Promise<{ zoneId: string; nameservers: string[] }> {
  logger.info('DOMÍNIO', 'Criando zona Cloudflare', { domain })
  const res = await cfFetch<CfZone>('/zones', {
    method: 'POST',
    body: JSON.stringify({
      name: domain,
      account: { id: getAccountId() },
      type: 'full',
    }),
  })

  if (!res.success) {
    const code = res.errors?.[0]?.code
    if (code === 1061 || res.errors?.[0]?.message?.includes('already exists')) {
      return getExistingZone(domain)
    }
    const msg = res.errors?.[0]?.message ?? 'Erro ao criar zona'
    throw new Error(msg)
  }

  return {
    zoneId: res.result.id,
    nameservers: res.result.name_servers,
  }
}

async function getExistingZone(domain: string): Promise<{ zoneId: string; nameservers: string[] }> {
  const res = await cfFetch<CfZone[]>(`/zones?name=${encodeURIComponent(domain)}&account.id=${getAccountId()}`)
  if (!res.success || !res.result?.length) {
    throw new Error('Zona já existe mas não foi possível recuperar os dados')
  }
  const zone = res.result[0]
  return {
    zoneId: zone.id,
    nameservers: zone.name_servers,
  }
}

async function checkZoneStatus(zoneId: string): Promise<'active' | 'pending' | 'moved' | string> {
  const res = await cfFetch<CfZone>(`/zones/${zoneId}`)
  if (!res.success) throw new Error(res.errors?.[0]?.message ?? 'Erro ao verificar zona')
  return res.result.status
}

async function deleteZone(zoneId: string): Promise<void> {
  if (!zoneId) return
  logger.info('DOMÍNIO', 'Removendo zona Cloudflare', { zoneId })
  const res = await cfFetch(`/zones/${zoneId}`, { method: 'DELETE' })
  if (!res.success) {
    const code = res.errors?.[0]?.code
    if (code === 1000) return
    throw new Error(res.errors?.[0]?.message ?? 'Erro ao deletar zona')
  }
}

// ─── SSL ─────────────────────────────────────────────────────────────────────

async function configureSsl(zoneId: string): Promise<void> {
  await cfFetch(`/zones/${zoneId}/settings/ssl`, {
    method: 'PATCH',
    body: JSON.stringify({ value: 'full' }),
  })

  await cfFetch(`/zones/${zoneId}/settings/always_use_https`, {
    method: 'PATCH',
    body: JSON.stringify({ value: 'on' }),
  })

  await cfFetch(`/zones/${zoneId}/settings/min_tls_version`, {
    method: 'PATCH',
    body: JSON.stringify({ value: '1.2' }),
  })

  await cfFetch(`/zones/${zoneId}/settings/automatic_https_rewrites`, {
    method: 'PATCH',
    body: JSON.stringify({ value: 'on' }),
  })
}

// ─── Custom Domains (vincula hostname ao Worker global) ─────────────────────

interface CfWorkerDomain {
  id: string
  zone_id: string
  zone_name: string
  hostname: string
  service: string
  environment: string
}

async function createCustomDomain(zoneId: string, hostname: string): Promise<CfWorkerDomain> {
  const accountId = getAccountId()
  const workerName = getWorkerName()

  // Remover DNS records conflitantes antes de criar Custom Domain
  await removeConflictingDnsRecords(zoneId, hostname)

  // Remover Worker Routes conflitantes
  await removeConflictingWorkerRoutes(zoneId, hostname)

  logger.info('DOMÍNIO', 'Criando Custom Domain', { hostname, worker: workerName })

  const res = await cfFetch<CfWorkerDomain>(
    `/accounts/${accountId}/workers/domains`,
    {
      method: 'PUT',
      body: JSON.stringify({
        hostname,
        zone_id: zoneId,
        service: workerName,
        environment: 'production',
      }),
    }
  )

  if (!res.success) {
    const msg = res.errors?.[0]?.message ?? 'Erro ao criar Custom Domain'
    throw new Error(msg)
  }

  logger.info('DOMÍNIO', 'Custom Domain criado', { hostname, id: res.result.id })
  return res.result
}

async function deleteCustomDomain(hostname: string): Promise<void> {
  const accountId = getAccountId()

  // Buscar o domain ID pelo hostname
  const listRes = await cfFetch<CfWorkerDomain[]>(
    `/accounts/${accountId}/workers/domains?hostname=${encodeURIComponent(hostname)}`
  )

  if (!listRes.success || !listRes.result?.length) {
    logger.warn('DOMÍNIO', 'Custom Domain não encontrado para remoção', { hostname })
    return
  }

  const domainId = listRes.result[0].id
  const res = await cfFetch(`/accounts/${accountId}/workers/domains/${domainId}`, {
    method: 'DELETE',
  })

  if (!res.success) {
    const msg = res.errors?.[0]?.message ?? 'Erro ao remover Custom Domain'
    logger.warn('DOMÍNIO', 'Falha ao remover Custom Domain', { hostname, error: msg })
    return
  }

  logger.info('DOMÍNIO', 'Custom Domain removido', { hostname })
}

async function checkCustomDomainExists(hostname: string): Promise<boolean> {
  const accountId = getAccountId()
  const res = await cfFetch<CfWorkerDomain[]>(
    `/accounts/${accountId}/workers/domains?hostname=${encodeURIComponent(hostname)}`
  )
  return res.success && (res.result?.length ?? 0) > 0
}

// ─── Cleanup helpers ────────────────────────────────────────────────────────

async function removeConflictingDnsRecords(zoneId: string, hostname: string): Promise<void> {
  const parts = hostname.split('.')
  const subdomain = parts[0]
  const domain = parts.slice(1).join('.')

  // Remover CNAME do subdomínio
  const cnameRes = await cfFetch<{ id: string; name: string; type: string; meta?: { read_only?: boolean } }[]>(
    `/zones/${zoneId}/dns_records?name=${hostname}`
  )
  if (cnameRes.success && cnameRes.result?.length) {
    for (const record of cnameRes.result) {
      if (record.meta?.read_only) continue
      logger.info('DOMÍNIO', 'Removendo DNS record conflitante', { name: record.name, type: record.type })
      await cfFetch(`/zones/${zoneId}/dns_records/${record.id}`, { method: 'DELETE' })
    }
  }

  // Remover registro A raiz se existir (não é mais necessário com Custom Domains)
  const aRes = await cfFetch<{ id: string; name: string; type: string; meta?: { read_only?: boolean } }[]>(
    `/zones/${zoneId}/dns_records?type=A&name=${domain}`
  )
  if (aRes.success && aRes.result?.length) {
    for (const record of aRes.result) {
      if (record.meta?.read_only) continue
      logger.info('DOMÍNIO', 'Removendo registro A conflitante', { name: record.name })
      await cfFetch(`/zones/${zoneId}/dns_records/${record.id}`, { method: 'DELETE' })
    }
  }
}

async function removeConflictingWorkerRoutes(zoneId: string, hostname: string): Promise<void> {
  const routesRes = await cfFetch<{ id: string; pattern: string }[]>(`/zones/${zoneId}/workers/routes`)
  if (!routesRes.success || !routesRes.result?.length) return

  const pattern = `${hostname}/*`
  const conflicting = routesRes.result.filter(r => r.pattern === pattern)

  for (const route of conflicting) {
    logger.info('DOMÍNIO', 'Removendo Worker Route conflitante', { pattern: route.pattern })
    await cfFetch(`/zones/${zoneId}/workers/routes/${route.id}`, { method: 'DELETE' })
  }
}

async function cleanupLegacyWorkerRoutes(zoneId: string): Promise<void> {
  const routesRes = await cfFetch<{ id: string; pattern: string }[]>(`/zones/${zoneId}/workers/routes`)
  if (!routesRes.success || !routesRes.result?.length) return

  for (const route of routesRes.result) {
    logger.info('DOMÍNIO', 'Removendo Worker Route legada', { pattern: route.pattern })
    await cfFetch(`/zones/${zoneId}/workers/routes/${route.id}`, { method: 'DELETE' })
  }
}

// ─── Subdomains ─────────────────────────────────────────────────────────────

async function createSubdomainRecords(zoneId: string, domain: string, subdomain: string): Promise<void> {
  const hostname = `${subdomain}.${domain}`
  logger.info('DOMÍNIO', 'Configurando subdomínio via Custom Domain', { domain, subdomain, hostname })
  await createCustomDomain(zoneId, hostname)
}

async function deleteSubdomainRecords(_zoneId: string, domain: string, subdomain: string): Promise<void> {
  const hostname = `${subdomain}.${domain}`
  logger.info('DOMÍNIO', 'Removendo subdomínio', { domain, subdomain, hostname })
  await deleteCustomDomain(hostname)
}

async function ensureSubdomainInfra(zoneId: string, domain: string, subdomain: string): Promise<void> {
  const hostname = `${subdomain}.${domain}`

  const exists = await checkCustomDomainExists(hostname)
  if (exists) {
    logger.info('DOMÍNIO', 'Custom Domain já existe', { hostname })
    return
  }

  logger.info('DOMÍNIO', 'Custom Domain ausente, criando', { hostname })
  await createCustomDomain(zoneId, hostname)
}

// ─── Full Setup ──────────────────────────────────────────────────────────────

async function setupDomain(zoneId: string, domain: string): Promise<void> {
  logger.info('DOMÍNIO', 'Setup completo iniciado', { domain, zoneId })
  await configureSsl(zoneId)
  await cleanupLegacyWorkerRoutes(zoneId)
  logger.info('DOMÍNIO', 'Setup completo finalizado', { domain, zoneId })
}

// ─── Legacy cleanup ─────────────────────────────────────────────────────────

async function deleteLegacyWorker(domain: string): Promise<void> {
  const accountId = getAccountId()
  const name = `techpags-proxy-${domain.replace(/\./g, '-')}`
  logger.info('DOMÍNIO', 'Removendo worker legado', { domain, workerName: name })
  await fetch(
    `${API_BASE}/accounts/${accountId}/workers/scripts/${name}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    }
  )
}

export const cloudflareService = {
  createZone,
  checkZoneStatus,
  deleteZone,
  configureSsl,
  setupDomain,
  createCustomDomain,
  deleteCustomDomain,
  checkCustomDomainExists,
  createSubdomainRecords,
  deleteSubdomainRecords,
  ensureSubdomainInfra,
  cleanupLegacyWorkerRoutes,
  deleteLegacyWorker,
}
