# Análise Completa — Bugs e Problemas Encontrados

## 🔴 CRÍTICOS (quebram funcionalidade)

### 1. Upsell nunca funciona
**Arquivo:** Todos os templates de checkout (SingleStep, Dropshipping, InfoProduct, Promo)
**Linha:** ~43-44 no `pollAndRedirect`
**Problema:** Verificam `upsell?.available` mas a rota `/api/checkout/payment/[id]/upsell` retorna `{ upsell: { ... } }` ou `{ upsell: null }`. O campo `available` não existe.
**Impacto:** O redirect para `/checkout/upsell/${paymentId}` nunca acontece. Upsells não funcionam.
**Correção:** Mudar verificação para `if (upsell?.upsell)` ou adicionar `available: true` na resposta da rota.

### 2. `/checkout/success` e `/checkout/upsell/*` retornam 404 em domínios customizados
**Arquivo:** `middleware.ts`, linha 46
**Problema:** `pathname.split('/')[2]` extrai o "slug". Para `/checkout/success` extrai `"success"`, para `/checkout/upsell/abc` extrai `"upsell"` — nunca bate com o slug real do produto.
**Impacto:** Após pagamento em domínio customizado, utilizador vê 404 em vez da página de sucesso.
**Correção:** Verificar se pathname é `/checkout/success` ou `/checkout/upsell/*` antes de validar o slug.

### 3. `cart.currency` não existe no schema
**Arquivo:** `app/api/checkout/cart/[cartId]/session/route.ts`, linha 41
**Problema:** Usa `cart.currency.toLowerCase()` mas o modelo `Cart` no schema não tem campo `currency`.
**Impacto:** Sessão de pagamento do carrinho nunca é criada (crash em runtime).
**Correção:** Adicionar campo `currency` ao modelo `Cart` no schema, ou obter currency do primeiro produto.

---

## 🟠 ALTOS (segurança/dados)

### 4. `payment/[id]/update` sem autenticação
**Arquivo:** `app/api/checkout/payment/[id]/update/route.ts`
**Problema:** Rota PATCH sem qualquer verificação de autenticação ou ownership.
**Impacto:** Qualquer pessoa com um paymentId pode alterar nome, email e telefone de qualquer pagamento.
**Severidade:** Alta — risco de phishing/fraude.
**Correção:** Adicionar verificação de que o request vem do mesmo IP/session que criou o pagamento, ou exigir um token temporário.

### 5. `page.tsx` não verifica `r.ok`
**Arquivo:** `app/checkout/[slug]/page.tsx`, linha 27
**Problema:** `.then(r => r.json())` sem verificar `r.ok`. Se API retornar 404, o `.json()` resolve com `{ error: '...' }` e `setProduct` recebe objeto inválido.
**Impacto:** Template crasha ao tentar renderizar com objeto de erro.
**Correção:** Verificar `r.ok` antes de `.json()` ou validar `if (!d.id) setPageError(...)`.

### 6. `upsell/accept` marca como `declined` em erro técnico
**Arquivo:** `app/api/checkout/payment/[id]/upsell/accept/route.ts`, linha 81
**Problema:** Qualquer erro do Stripe (timeout, rate limit) marca `upsellStatus: 'declined'` permanentemente.
**Impacto:** Utilizador perde oferta sem ter recusado.
**Correção:** Marcar como `failed` ou deixar como `none` para permitir retry.

### 7. `cart.items` não tem `name` nem `imageUrl`
**Arquivo:** `app/api/checkout/cart/[cartId]/session/route.ts`, linhas 43-44
**Problema:** Usa `item.name` e `item.imageUrl` mas `CartItem` no schema só tem `productId`, `quantity`, `unitPrice`.
**Impacto:** Line items do Stripe ficam sem nome (aparecem como vazios).
**Correção:** `cartService.getById` deve fazer join com `Product` para obter estes campos.

---

## 🟡 MÉDIOS

### 8. `DropshippingCheckout` ignora `requireAddress`
**Arquivo:** `app/checkout/[slug]/templates/DropshippingCheckout.tsx`, linha 248
**Problema:** `AddressForm` sempre renderizado, independentemente de `product.requireAddress`.
**Impacto:** Produtos dropshipping com `requireAddress: false` ainda mostram formulário de morada.
**Correção:** Envolver `AddressForm` em `{product.requireAddress && ...}`.

### 9. `InfoProductCheckout` tem `+351` hardcoded
**Arquivo:** `app/checkout/[slug]/templates/InfoProductCheckout.tsx`, linha 228
**Problema:** Código de chamada fixo em `+351`.
**Impacto:** Código errado para clientes de outros países.
**Correção:** Usar geo-ip como no `SingleStepCheckout`.

### 10. `addressLocality` não é gravado
**Arquivo:** `lib/services/checkout.service.ts`
**Problema:** `AddressData` tem `locality` e `city` mas só `city` é gravado na BD.
**Impacto:** Informação de freguesia/localidade é perdida.
**Correção:** Adicionar campo `addressLocality` ao schema `CheckoutPayment` e gravar no service.

### 11. `AbandonedCart` criado com dados vazios
**Arquivo:** Todos os templates, `useEffect` inicial
**Problema:** `createPaymentIntent` chamado antes do utilizador preencher qualquer campo.
**Impacto:** Registo de carrinho abandonado fica com nome/email vazios — inutilizável para recuperação.
**Correção:** Só criar `AbandonedCart` após primeiro blur de email, ou fazer upsert no update.

### 12. `product.duplicate` não copia `legalName`
**Arquivo:** `lib/services/product.service.ts`, linha 185-227
**Problema:** Copia `brandName` mas não `legalName`.
**Impacto:** Produto duplicado fica sem nome legal no texto do checkout.
**Correção:** Adicionar `legalName: existing.legalName` ao create.

### 13. `by-domain` retorna primeiro produto ativo por ordem de criação
**Arquivo:** `app/api/products/by-domain/route.ts`, linha 26
**Problema:** `orderBy: { createdAt: 'asc' }` — sempre retorna o produto mais antigo.
**Impacto:** Utilizador com múltiplos produtos não pode escolher qual aparece no domínio.
**Correção:** Adicionar campo `customDomainProductId` ao modelo `CustomDomain` para escolha explícita.

### 14. Middleware faz fetch interno em cada request
**Arquivo:** `middleware.ts`, linha 48
**Problema:** Fetch para `/api/products/by-domain` em cada request de domínio customizado, sem cache.
**Impacto:** Latência e carga desnecessária em produção.
**Correção:** Cache em memória com TTL de 60s.

### 15. Rate limiter em memória não funciona em multi-instância
**Arquivo:** `app/api/checkout/[slug]/payment-intent/route.ts`, linha 13
**Problema:** `Map` local — cada instância tem o seu próprio.
**Impacto:** Atacante pode contornar distribuindo requests por instâncias.
**Correção:** Usar Redis ou similar.

### 16. `stripe.customers.list` sem verificação de tenant
**Arquivo:** `app/api/checkout/[slug]/payment-intent/route.ts`, linha 82
**Problema:** Lista customers por email sem filtrar por merchant.
**Impacto:** Reutilização de customer de outro merchant (improvável mas possível).
**Correção:** Adicionar metadata `merchantId` ao customer e filtrar.

### 17. Lookup de CEP expõe IP a serviço externo
**Arquivo:** `app/checkout/[slug]/components/AddressForm.tsx`, linha 150
**Problema:** Fetch direto para `geoapi.pt` do browser.
**Impacto:** Potencial problema RGPD (IP exposto sem consentimento).
**Correção:** Proxiar via `/api/postal-lookup`.

### 18. `upsell/accept` não verifica tipo de payment method
**Arquivo:** `app/api/checkout/payment/[id]/upsell/accept/route.ts`, linha 53
**Problema:** Tenta `off_session: true` sem verificar se o método suporta.
**Impacto:** MBWay/Multibanco falham com erro genérico.
**Correção:** Verificar `payment_method_details.type` antes de tentar.

### 19. `x-real-host` header pode ser forjado
**Arquivo:** `middleware.ts`, linha 18
**Problema:** Assume que `x-real-host` é sempre injetado pelo Worker e é confiável.
**Impacto:** Se app exposta diretamente, cliente pode forjar header e contornar isolamento.
**Correção:** Validar header secreto injetado pelo Worker.

### 20. `urlParams` sem validação de tipo
**Arquivo:** `app/api/checkout/cart/[cartId]/session/route.ts`, linha 31
**Problema:** Verifica `typeof === 'object'` mas não valida valores internos.
**Impacto:** Atacante pode enviar `{ key: { nested: 'object' } }` que é gravado no JSON.
**Correção:** Iterar e converter todos os valores para string.

---

## Resumo por Severidade

- **Críticos:** 3 (upsell, 404 em domínios, cart.currency)
- **Altos:** 4 (auth, page.tsx, upsell declined, cart items)
- **Médios:** 13

**Total:** 20 problemas identificados
