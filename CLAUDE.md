# TechPag — ranigoods

## Idioma
Sempre responda em **português** (pt-BR).

## Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Prisma 7 + pg adapter, PostgreSQL (Railway)
- Stripe para pagamentos
- Resend para emails

## Design System
Cores via prefixo `ep-` (definidas em `tailwind.config.js` e `globals.css`):
- `ep-base` (#0d0d0d) — fundo principal
- `ep-surface` (#1a1a1a) — cards e painéis
- `ep-raised` (#262626) — inputs e elementos elevados
- `ep-accent` (#aaff00) — cor de destaque (verde-limão)
- `ep-primary` (#f7fff0) — texto principal
- `ep-secondary` (#b3b3b3) — texto secundário

## Convenções
- Rotas autenticadas em `app/(app)/`
- Rotas de auth em `app/(auth)/`
- Rotas públicas de marketing em `app/(marketing)/`
- Serviços em `lib/services/`
- Domínio principal: `techpags.shop`
- Email de contato: `contact@pagstech.shop`

## Workflow
- Sempre rodar `npm run build` antes de commitar
- Fazer commit + push após qualquer alteração
