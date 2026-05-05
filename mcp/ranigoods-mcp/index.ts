import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const API_KEY  = process.env.RANIGOODS_API_KEY  ?? ''
const BASE_URL = process.env.RANIGOODS_BASE_URL ?? 'https://seudominio.com'

if (!API_KEY) {
  console.error('RANIGOODS_API_KEY não configurada')
  process.exit(1)
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data
}

const server = new Server(
  { name: 'ranigoods-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_cart',
      description: 'Cria um carrinho de compras com um ou mais produtos e retorna o link de checkout',
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Lista de produtos e quantidades',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string', description: 'ID do produto' },
                quantity:  { type: 'number', description: 'Quantidade (mínimo 1)' },
              },
              required: ['productId', 'quantity'],
            },
          },
          urlParams: {
            type: 'object',
            description: 'Parâmetros UTM opcionais (utm_source, utm_campaign, etc.)',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['items'],
      },
    },
    {
      name: 'get_cart_status',
      description: 'Consulta o status de um carrinho pelo ID',
      inputSchema: {
        type: 'object',
        properties: {
          cartId: { type: 'string', description: 'ID do carrinho' },
        },
        required: ['cartId'],
      },
    },
    {
      name: 'list_products',
      description: 'Lista os produtos disponíveis na sua conta',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'archived'],
            description: 'Filtrar por status (padrão: active)',
          },
        },
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'create_cart': {
        const { items, urlParams } = args as { items: { productId: string; quantity: number }[]; urlParams?: Record<string, string> }
        const result = await apiRequest('/api/v1/carts', {
          method: 'POST',
          body:   JSON.stringify({ items, urlParams }),
        })
        return {
          content: [{
            type: 'text',
            text: [
              `Carrinho criado com sucesso!`,
              `ID: ${result.cartId}`,
              `Link de checkout: ${result.checkoutUrl}`,
              `Total: ${(result.total / 100).toFixed(2)} ${result.currency}`,
              `Expira em: ${new Date(result.expiresAt).toLocaleString('pt-PT')}`,
              `Itens: ${result.items.map((i: { name: string; quantity: number }) => `${i.name} x${i.quantity}`).join(', ')}`,
            ].join('\n'),
          }],
        }
      }

      case 'get_cart_status': {
        const { cartId } = args as { cartId: string }
        const result = await apiRequest(`/api/v1/carts/${cartId}`)
        return {
          content: [{
            type: 'text',
            text: [
              `Carrinho: ${result.id}`,
              `Status: ${result.status}`,
              `Total: ${(result.total / 100).toFixed(2)} ${result.currency}`,
              `Expira em: ${new Date(result.expiresAt).toLocaleString('pt-PT')}`,
              `Itens: ${result.items.map((i: { name: string; quantity: number }) => `${i.name} x${i.quantity}`).join(', ')}`,
            ].join('\n'),
          }],
        }
      }

      case 'list_products': {
        const { status = 'active' } = (args ?? {}) as { status?: string }
        const products = await apiRequest(`/api/products?status=${status}`)
        if (!products.length) {
          return { content: [{ type: 'text', text: 'Nenhum produto encontrado.' }] }
        }
        const lines = products.map((p: { id: string; name: string; price: number; currency: string; stock: number; slug: string }) =>
          `• ${p.name} — ID: ${p.id} | Preço: ${(p.price / 100).toFixed(2)} ${p.currency} | Estoque: ${p.stock === -1 ? 'ilimitado' : p.stock} | Slug: ${p.slug ?? 'sem slug'}`
        )
        return { content: [{ type: 'text', text: `Produtos (${products.length}):\n${lines.join('\n')}` }] }
      }

      default:
        throw new Error(`Tool desconhecida: ${name}`)
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Erro: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('RaniGoods MCP server iniciado')
}

main().catch(console.error)
