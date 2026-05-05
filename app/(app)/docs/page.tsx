'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import clsx from 'clsx'

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group">
      <pre className={clsx('bg-[#0d1117] text-[#e6edf3] rounded-lg p-4 text-xs font-mono overflow-x-auto', `language-${lang}`)}>
        <code>{code.trim()}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-ep-primary font-semibold text-base border-b border-ep-border-subtle pb-2">{title}</h2>
      {children}
    </div>
  )
}

function Badge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    POST:   'bg-green-500/10 text-green-400 border-green-500/20',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border', colors[method] ?? colors.GET)}>
      {method}
    </span>
  )
}

const BASE = typeof window !== 'undefined' ? window.location.origin : 'https://seudominio.com'

export default function DocsPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-ep-primary text-lg md:text-xl font-bold">Documentação da API</h1>
        <p className="text-ep-secondary text-sm mt-1">
          Integre o carrinho de compras no seu sistema via API REST.
        </p>
      </div>

      <Section title="Autenticação">
        <p className="text-ep-secondary text-sm">
          Todas as rotas da API pública requerem uma API Key no header <code className="bg-ep-raised px-1 rounded text-xs font-mono">Authorization</code>.
          Gere a sua chave em <a href="/api-keys" className="text-ep-accent hover:underline">API Keys</a>.
        </p>
        <CodeBlock code={`Authorization: Bearer rg_sua_api_key_aqui`} />
      </Section>

      <Section title="Base URL">
        <CodeBlock code={BASE} />
      </Section>

      <Section title="Criar Carrinho">
        <div className="flex items-center gap-2">
          <Badge method="POST" />
          <code className="text-ep-primary text-xs font-mono">/api/v1/carts</code>
        </div>
        <p className="text-ep-secondary text-sm">
          Cria um carrinho com um ou mais produtos. Os produtos devem estar cadastrados no sistema e pertencer à sua conta.
          O carrinho expira em 24 horas.
        </p>
        <div className="space-y-2">
          <p className="text-ep-muted text-xs font-medium uppercase tracking-wide">Request Body</p>
          <CodeBlock lang="json" code={`{
  "items": [
    { "productId": "prod_123", "quantity": 2 },
    { "productId": "prod_456", "quantity": 1 }
  ],
  "urlParams": {
    "utm_source": "facebook",
    "utm_campaign": "verao2025"
  }
}`} />
        </div>
        <div className="space-y-2">
          <p className="text-ep-muted text-xs font-medium uppercase tracking-wide">Response 201</p>
          <CodeBlock lang="json" code={`{
  "cartId": "clxxx123",
  "checkoutUrl": "${BASE}/checkout/cart/clxxx123",
  "expiresAt": "2026-05-06T12:00:00.000Z",
  "total": 4500,
  "currency": "EUR",
  "items": [
    {
      "id": "item_1",
      "productId": "prod_123",
      "name": "Produto A",
      "quantity": 2,
      "unitPrice": 1500,
      "currency": "EUR"
    }
  ]
}`} />
        </div>
        <div className="space-y-2">
          <p className="text-ep-muted text-xs font-medium uppercase tracking-wide">Exemplo cURL</p>
          <CodeBlock code={`curl -X POST ${BASE}/api/v1/carts \\
  -H "Authorization: Bearer rg_sua_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      { "productId": "prod_123", "quantity": 1 }
    ]
  }'`} />
        </div>
        <div className="space-y-2">
          <p className="text-ep-muted text-xs font-medium uppercase tracking-wide">Exemplo JavaScript</p>
          <CodeBlock lang="javascript" code={`const res = await fetch('${BASE}/api/v1/carts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rg_sua_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    items: [{ productId: 'prod_123', quantity: 1 }],
  }),
})

const { checkoutUrl } = await res.json()
window.location.href = checkoutUrl // redirecionar o cliente`} />
        </div>
      </Section>

      <Section title="Consultar Status do Carrinho">
        <div className="flex items-center gap-2">
          <Badge method="GET" />
          <code className="text-ep-primary text-xs font-mono">/api/v1/carts/:cartId</code>
        </div>
        <p className="text-ep-secondary text-sm">
          Retorna o estado atual do carrinho. O campo <code className="bg-ep-raised px-1 rounded text-xs font-mono">status</code> pode ser:
          <code className="bg-ep-raised px-1 rounded text-xs font-mono ml-1">pending</code>,
          <code className="bg-ep-raised px-1 rounded text-xs font-mono ml-1">paid</code>,
          <code className="bg-ep-raised px-1 rounded text-xs font-mono ml-1">expired</code>.
        </p>
        <CodeBlock code={`curl ${BASE}/api/v1/carts/clxxx123 \\
  -H "Authorization: Bearer rg_sua_api_key"`} />
      </Section>

      <Section title="Erros comuns">
        <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ep-border-subtle">
                <th className="text-left text-ep-muted font-medium px-4 py-2">Código</th>
                <th className="text-left text-ep-muted font-medium px-4 py-2">Significado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ep-border-subtle">
              {[
                ['401', 'API key inválida ou ausente'],
                ['400', 'Dados inválidos (produto não encontrado, estoque insuficiente, etc.)'],
                ['403', 'Produto não pertence à sua conta'],
                ['410', 'Carrinho expirado ou já pago'],
                ['500', 'Erro interno do servidor'],
              ].map(([code, msg]) => (
                <tr key={code}>
                  <td className="px-4 py-2 font-mono text-ep-danger">{code}</td>
                  <td className="px-4 py-2 text-ep-secondary">{msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Notas importantes">
        <ul className="text-ep-secondary text-sm space-y-1.5 list-disc list-inside">
          <li>Todos os valores monetários são em <strong>centavos</strong> (ex: 1500 = €15,00)</li>
          <li>Todos os produtos do carrinho devem ter a mesma moeda</li>
          <li>O carrinho expira em 24 horas após a criação</li>
          <li>O estoque só é decrementado após confirmação do pagamento</li>
          <li>Após o pagamento, o pedido aparece na tela de Pagamentos → Carrinho API</li>
        </ul>
      </Section>
    </div>
  )
}
