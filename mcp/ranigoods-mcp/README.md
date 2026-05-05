# RaniGoods MCP Server

MCP server para integrar o carrinho de compras do RaniGoods com Claude Desktop e outros clientes MCP.

## Tools disponíveis

- `list_products` — lista os produtos da sua conta
- `create_cart` — cria um carrinho e retorna o link de checkout
- `get_cart_status` — consulta o status de um carrinho

## Instalação

```bash
cd mcp/ranigoods-mcp
npm install
npm run build
```

## Configuração no Claude Desktop

Edite `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ranigoods": {
      "command": "node",
      "args": ["/caminho/para/ranigoods/mcp/ranigoods-mcp/dist/index.js"],
      "env": {
        "RANIGOODS_API_KEY": "rg_sua_api_key_aqui",
        "RANIGOODS_BASE_URL": "https://seudominio.com"
      }
    }
  }
}
```

## Uso em desenvolvimento (sem build)

```json
{
  "mcpServers": {
    "ranigoods": {
      "command": "npx",
      "args": ["tsx", "/caminho/para/ranigoods/mcp/ranigoods-mcp/index.ts"],
      "env": {
        "RANIGOODS_API_KEY": "rg_sua_api_key_aqui",
        "RANIGOODS_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Exemplo de uso no Claude

> "Lista os meus produtos disponíveis"
> "Cria um carrinho com 2 unidades do produto prod_123"
> "Qual o status do carrinho clxxx123?"
