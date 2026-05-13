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

function getWorkerOrigin() {
  return process.env.CLOUDFLARE_WORKER_ORIGIN ?? 'http://10.13.0.41:8080'
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
    // Zone already exists in this account — fetch existing zone data
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
    if (code === 1000) return // zone not found — already deleted
    throw new Error(res.errors?.[0]?.message ?? 'Erro ao deletar zona')
  }
}

// ─── DNS Records ─────────────────────────────────────────────────────────────

async function createDnsRecords(zoneId: string, domain: string): Promise<void> {
  // A record com IP dummy (100.64.0.1 — CGNAT, não roteável) + proxy ON
  // O Worker intercepta antes de chegar ao IP
  await cfFetch(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'A',
      name: '@',
      content: '100.64.0.1',
      proxied: true,
      ttl: 1,
    }),
  })

  // www CNAME → root
  await cfFetch(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'CNAME',
      name: 'www',
      content: domain,
      proxied: true,
      ttl: 1,
    }),
  })
}

// ─── SSL ─────────────────────────────────────────────────────────────────────

async function configureSsl(zoneId: string): Promise<void> {
  // SSL mode: Full (Strict)
  await cfFetch(`/zones/${zoneId}/settings/ssl`, {
    method: 'PATCH',
    body: JSON.stringify({ value: 'full' }),
  })

  // Always Use HTTPS
  await cfFetch(`/zones/${zoneId}/settings/always_use_https`, {
    method: 'PATCH',
    body: JSON.stringify({ value: 'on' }),
  })

  // Minimum TLS 1.2
  await cfFetch(`/zones/${zoneId}/settings/min_tls_version`, {
    method: 'PATCH',
    body: JSON.stringify({ value: '1.2' }),
  })

  // Auto HTTPS Rewrites
  await cfFetch(`/zones/${zoneId}/settings/automatic_https_rewrites`, {
    method: 'PATCH',
    body: JSON.stringify({ value: 'on' }),
  })
}

// ─── Worker ──────────────────────────────────────────────────────────────────

function buildWorkerScript(domain: string): string {
  const origin = getWorkerOrigin()
  return `export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = "${origin}";
    const newUrl = new URL(url.pathname + url.search, origin);
    const headers = new Headers(request.headers);
    headers.set("x-real-host", "${domain}");
    headers.set("x-forwarded-proto", "https");
    headers.delete("cf-connecting-ip");
    const resp = await fetch(newUrl, {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      redirect: "manual",
    });
    const respHeaders = new Headers(resp.headers);
    respHeaders.delete("x-powered-by");
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: respHeaders,
    });
  }
};`
}

function workerName(domain: string): string {
  return `techpags-proxy-${domain.replace(/\./g, '-')}`
}

async function setupWorkerRoute(zoneId: string, domain: string): Promise<void> {
  const accountId = getAccountId()
  const name = workerName(domain)
  const script = buildWorkerScript(domain)

  // Upload worker script
  const formData = new FormData()
  const metadata = JSON.stringify({
    main_module: 'worker.js',
    compatibility_date: '2024-01-01',
  })
  formData.append('metadata', new Blob([metadata], { type: 'application/json' }))
  formData.append('worker.js', new Blob([script], { type: 'application/javascript+module' }), 'worker.js')

  const uploadRes = await fetch(
    `${API_BASE}/accounts/${accountId}/workers/scripts/${name}`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
      body: formData,
    }
  )
  const uploadData = await uploadRes.json() as CfResponse
  if (!uploadData.success) {
    throw new Error(uploadData.errors?.[0]?.message ?? 'Erro ao fazer upload do Worker')
  }

  // Create worker route for the zone
  await cfFetch(`/zones/${zoneId}/workers/routes`, {
    method: 'POST',
    body: JSON.stringify({
      pattern: `${domain}/*`,
      script: name,
    }),
  })

  // Also route www
  await cfFetch(`/zones/${zoneId}/workers/routes`, {
    method: 'POST',
    body: JSON.stringify({
      pattern: `www.${domain}/*`,
      script: name,
    }),
  })
}

async function deleteWorker(domain: string): Promise<void> {
  const accountId = getAccountId()
  const name = workerName(domain)
  logger.info('DOMÍNIO', 'Removendo worker', { domain, workerName: name })
  await fetch(
    `${API_BASE}/accounts/${accountId}/workers/scripts/${name}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    }
  )
}

// ─── Full Setup ──────────────────────────────────────────────────────────────

async function setupDomain(zoneId: string, domain: string): Promise<void> {
  logger.info('DOMÍNIO', 'Setup completo iniciado', { domain, zoneId })
  await createDnsRecords(zoneId, domain)
  await configureSsl(zoneId)
  await setupWorkerRoute(zoneId, domain)
  logger.info('DOMÍNIO', 'Setup completo finalizado', { domain, zoneId })
}

export const cloudflareService = {
  createZone,
  checkZoneStatus,
  deleteZone,
  createDnsRecords,
  configureSsl,
  setupWorkerRoute,
  setupDomain,
  deleteWorker,
}
