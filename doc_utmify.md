Documentação da API para envio de vendas - Utmify

1- Formato da Requisição 2
1.1- Endpoint 2
1.2- Headers 2
1.3- Payload 2
1.3.1- Body 2
1.3.2- Customer 2
1.3.3- Product 3
1.3.4- TrackingParameters 3
1.3.5- Commission 3
2- Descrição dos Parâmetros 4
2.1- Headers 4
2.2- Body 4
2.3- Customer 5
2.4- Product 5
2.5- TrackingParameters 6
2.6- Commission 7
3- Exemplos Práticos de Requisições 7
3.1- Pix Gerado e Pago 7
3.1.1- Pix Gerado 7
3.1.2- Pix Pago 8
3.2- Cartão de Crédito Pago e Reembolsado 9
3.2.1- Cartão Pago 10
3.2.2- Cartão Reembolsado 11
4- Perguntas Frequentes 13

1- Formato da Requisição

Para enviar uma requisição à nossa API, será necessário criar uma credencial de API, que será utilizada nos headers desta requisição. Para obter uma credencial, basta acessar (ou criar) a sua conta gratuita na Utmify e seguir o caminho: Integrações > Webhooks > Credenciais de API > Adicionar Credencial > Criar Credencial.

1.1- Endpoint

Para enviar as informações dos pedidos, devem ser enviadas requisições do tipo POST para o seguinte endpoint: https://api.utmify.com.br/api-credentials/orders.

1.2- Headers

Nos headers da requisição deve ser informada a credencial de api gerada no seguinte formato:

{
‘x-api-token’: string
}

1.3- Payload

O body da requisição deve seguir o formato abaixo:

1.3.1- Body

{
orderId: string,
platform: string,
paymentMethod: 'credit_card' | 'boleto' | 'pix' | 'paypal' | 'free_price',
status: 'waiting_payment' | 'paid' | 'refused' | 'refunded' | 'chargedback',
createdAt: 'YYYY-MM-DD HH:MM:SS', // UTC
approvedDate: 'YYYY-MM-DD HH:MM:SS' | null, // UTC
refundedAt: 'YYYY-MM-DD HH:MM:SS' | null, // UTC
customer: Customer,
products: Product[],
trackingParameters: TrackingParameters,
commission: Commission,
isTest?: boolean
}

1.3.2- Customer

{
name: string,
email: string,
phone: string | null,
document: string | null,
country?: string, // ISO 3166-1 alfa-2
ip?: string
}

1.3.3- Product

{
id: string,
name: string,
planId: string | null,
planName: string | null,
quantity: number,
priceInCents: number
}

1.3.4- TrackingParameters

{
src: string | null,
sck: string | null,
utm_source: string | null,
utm_campaign: string | null,
utm_medium: string | null,
utm_content: string | null,
utm_term: string | null
}

1.3.5- Commission

{
totalPriceInCents: number,
gatewayFeeInCents: number,
userCommissionInCents: number,
currency?: 'BRL' | 'USD' | 'EUR' | 'GBP' | 'ARS' | 'CAD' | 'COP' | 'MXN' | 'PYG' | 'CLP' | 'PEN' | 'PLN'
}

2- Descrição dos Parâmetros

2.1- Headers

Parâmetro
Exemplo
Descrição
x-api-token
“KVRxalfMiBfm8Rm1nP5YxfwYzArNsA0VLeWC”
Credencial de API gerada no Dashboard da Utmify.
É através desse token que será identificado o cliente e o dashboard que receberão o pedido.

2.2- Body

Parâmetro
Exemplo
Descrição
orderId
“FC72D9AK9”
Identificação do pedido na plataforma de vendas.
platform
“GlobalPay”
Nome da plataforma que está integrando com a Utmify. Recomendado que seja informado no formato PascalCase.
paymentMethod
“credit_card”
Meio de pagamento utilizado na transação.
status
“paid”
Status do pagamento da transação.
createdAt
“2024-07-25 15:34:14”
Data em que o pedido foi criado (UTC).
Deve ser informada sempre a mesma data quando o status do pedido for atualizado.
Atenção: serão aceitos somente pedidos de até 7 dias anteriores e no máximo 45 dias para reembolsos ou chargebacks. O descumprimento pode resultar em bloqueio.
approvedDate
“2024-07-25 15:41:12”
Data em que o pagamento do pedido foi realizado (UTC).
Caso o pedido ainda não tenha sido pago, deve ser informado o valor null.
refundedAt
null
Data em que o pedido foi reembolsado (UTC).
Caso o pedido não tenha sido reembolsado, deve ser informado o valor null.
customer
Customer
Informações do cliente que realizou a compra na plataforma de vendas.
products
Array de Product
Informações dos produtos presentes na transação.
trackingParameters
TrackingParameters
Parâmetros de url.
Devem ser extraídos da url do checkout no momento da compra pela plataforma de vendas e enviados à Utmify através do Webhook.
commission
Commission
Valores da transação
isTest
false
Define se o envio trata-se de um teste.
Caso true, será realizada a validação das informações enviadas normalmente, mas a transação não será salva na Utmify.
Para salvar o pedido, basta não passar esse campo na requisição ou deixar o seu valor como false.

2.3- Customer

Parâmetro
Exemplo
Descrição
name
“Lucas Sampaio”
Nome do comprador.
email
“lusampa2020@gmail.com”
E-mail do comprador.
phone
“11991560063”
Telefone do comprador.
document
“43887057481”
CPF ou CNPJ do comprador.
country
“BR”
País do comprador no formato ISO 3166-1 alfa-2.
Não é um campo obrigatório.
ip
“204.97.192.73”
Ip do comprador.
Não é um campo obrigatório, porém, é recomendado o envio para um melhor rastreamento das vendas.

2.4- Product

Parâmetro
Exemplo
Descrição
id
“FGC1375Z5”
Identificação do produto.
name
“Calça”
Nome do produto.
planId
“FTS7743C3”
Id do plano (caso a plataforma disponibilize opção de múltiplos planos para o mesmo produto).
Caso não possua essa opção, informe como null.
planName
“Promoção de Natal”
Nome do plano (caso a plataforma disponibilize opção de múltiplos planos para o mesmo produto).
Caso não possua essa opção, informe como null.
quantity
2
Quantidade comprada do produto.
priceInCents
11990
Preço do produto na plataforma de vendas.

2.5- TrackingParameters

Parâmetro
Exemplo
Descrição
src
null
Valor do src extraído da url do checkout.
Caso o checkout não possua essa variável no momento do pedido, enviar como null.
sck
null
Valor do sck extraído da url do checkout.
Caso o checkout não possua essa variável no momento do pedido, enviar como null.
utm_source
“FB”
Valor do utm_source extraído da url do checkout.
Caso o checkout não possua essa variável no momento do pedido, enviar como null.
utm_campaign
“Vendas 2024/07/10|126351623512736523”
Valor do utm_campaign extraído da url do checkout.
Caso o checkout não possua essa variável no momento do pedido, enviar como null.
utm_medium
“ABO|1273612873681723”
Valor do utm_medium extraído da url do checkout.
Caso o checkout não possua essa variável no momento do pedido, enviar como null.
utm_content
“VIDEO 01|2412937293769713”
Valor do utm_content extraído da url do checkout.
Caso o checkout não possua essa variável no momento do pedido, enviar como null.
utm_term
“Instagram_Reels”
Valor do utm_term extraído da url do checkout.
Caso o checkout não possua essa variável no momento do pedido, enviar como null.

2.6- Commission

Parâmetro
Exemplo
Descrição
totalPriceInCents
14990
Valor total da transação, em centavos.
gatewayFeeInCents
1500
Valor recebido pela plataforma, em centavos.
userCommissionInCents
13490
Valor recebido pelo vendedor, em centavos.
Esse valor não pode ser 0, a não ser que o usuário realmente não tenha recebido nada pela venda.
Caso a plataforma não queira informar a comissão do usuário (não recomendado), deve deixar esse valor igual ao totalPriceInCents.
currency
“USD”
Moeda da compra.
Caso em reais, não é necessário informar esse campo.

3- Exemplos Práticos de Requisições

Neste tópico, serão apresentados alguns exemplos práticos realistas de como devem ser enviadas as informações e atualizações do pedido.

3.1- Pix Gerado e Pago

Um cliente realizou um pedido via pix na loja GlobalPay através do checkout com a url:
https://checkout.globalpay.com/11c4ca3b-4afa-487f-b92b-aeb2c9e86d3d?utm_source=FB&utm_campaign=CAMPANHA_2|413591587909524&utm_medium=CONJUNTO_2|498046723566488&utm_content=ANUNCIO_2|504346051220592&utm_term=Instagram_Feed.

O produto comprado foi um óleo de motor de R$ 80,00 com R$ 20,00 de frete. A plataforma cobra R$ 1,00 por pix pago + 3% do valor do pedido. O pix foi gerado em 26/07/2024 às 11:35:13 (horário de Brasília) e pago 26/07/2024 às 11:43:37 (horário de Brasília).

A credencial de API do usuário da Utmify que realizou a venda, é: KVRxalfMiBfm8Rm1nP5YxfwYzArNsA0VLeWC.

3.1.1- Pix Gerado

POST https://api.utmify.com.br/api-credentials/orders
Headers: { "x-api-token": "KVRxalfMiBfm8Rm1nP5YxfwYzArNsA0VLeWC" }
Body: {
"orderId": "8e40b27e-0118-4699-8587-e892beedb403",
"platform": "GlobalPay",
"paymentMethod": "pix",
"status": "waiting_payment",
"createdAt": "2024-07-26 14:35:13",
"approvedDate": null,
"refundedAt": null,
"customer": {
"name": "Marcos Goncalves Rodrigues",
"email": "marcosgonrod@hotmail.com",
"phone": "19936387209",
"document": "29672656599",
"country": "BR",
"ip": "61.145.134.105"
},
"products": [
{
"id": "53d5ce96-a548-4c7b-a0bc-da8bfa0f9294",
"name": "Óleo de Motor",
"planId": null,
"planName": null,
"quantity": 1,
"priceInCents": 8000
}
],
"trackingParameters": {
"src": null,
"sck": null,
"utm_source": "FB",
"utm_campaign": "CAMPANHA_2|413591587909524",
"utm_medium": "CONJUNTO_2|498046723566488",
"utm_content": "ANUNCIO_2|504346051220592",
"utm_term": "Instagram_Feed"
},
"commission": {
"totalPriceInCents": 10000,
"gatewayFeeInCents": 400,
"userCommissionInCents": 9600
},
"isTest": false
}

3.1.2- Pix Pago

POST https://api.utmify.com.br/api-credentials/orders
Headers: { "x-api-token": "KVRxalfMiBfm8Rm1nP5YxfwYzArNsA0VLeWC" }
Body: {
"orderId": "8e40b27e-0118-4699-8587-e892beedb403",
"platform": "GlobalPay",
"paymentMethod": "pix",
"status": "paid",
"createdAt": "2024-07-26 14:35:13",
"approvedDate": "2024-07-26 14:43:37",
"refundedAt": null,
"customer": {
"name": "Marcos Goncalves Rodrigues",
"email": "marcosgonrod@hotmail.com",
"phone": "19936387209",
"document": "29672656599",
"country": "BR",
"ip": "61.145.134.105"
},
"products": [
{
"id": "53d5ce96-a548-4c7b-a0bc-da8bfa0f9294",
"name": "Óleo de Motor",
"planId": null,
"planName": null,
"quantity": 1,
"priceInCents": 8000
}
],
"trackingParameters": {
"src": null,
"sck": null,
"utm_source": "FB",
"utm_campaign": "CAMPANHA_2|413591587909524",
"utm_medium": "CONJUNTO_2|498046723566488",
"utm_content": "ANUNCIO_2|504346051220592",
"utm_term": "Instagram_Feed"
},
"commission": {
"totalPriceInCents": 10000,
"gatewayFeeInCents": 400,
"userCommissionInCents": 9600
},
"isTest": false
}

3.2- Cartão de Crédito Pago e Reembolsado

Um cliente realizou um pedido via cartão de crédito na data 15/07/2024 10:30:14 (horário de Brasília) e insatisfeito, solicitou reembolso no dia 18/07/2024 22:44:39 (horário de Brasília).

O pedido foi realizado na plataforma GlobalPay, em dólares, e continha uma camiseta de $35.00 e uma calça de $40.00. A plataforma cobra 5% de taxa por pedido.

O pedido foi realizado no checkout cuja url era: https://checkout.globalpay.com/23a92775-718d-458f-a92b-6daa68188a?utm_source=FB&utm_campaign=CAMPANHA_5|761832537749495&utm_medium=CONJUNTO_5|636393136432792&utm_content=ANUNCIO_5|525916699209785&utm_term=Facebook_Mobile_Feed.

A credencial de API do vendedor era: JHTbglkQnUhz7Tk2oQ4ZyuVYxBsOpC1XNdYD.

3.2.1- Cartão Pago

POST https://api.utmify.com.br/api-credentials/orders
Headers: { "x-api-token": "JHTbglkQnUhz7Tk2oQ4ZyuVYxBsOpC1XNdYD" }
Body: {
"orderId": "b101ea20-72c7-473d-bcc4-416fe4d8f3be",
"platform": "GlobalPay",
"paymentMethod": "credit_card",
"status": "paid",
"createdAt": "2024-07-15 13:30:14",
"approvedDate": "2024-07-15 13:30:14",
"refundedAt": null,
"customer": {
"name": "Lucas Pereira Barros",
"email": "lucaspbarros@gmail.com",
"phone": "21996972147",
"document": "24883871428",
"country": "US",
"ip": "242.53.157.167"
},
"products": [
{
"id": "ab341a39-52e1-4dda-92c8-ef336f2bb43c",
"name": "T-shirt",
"planId": "e7c5e019-3ac8-4ba1-9a11-2fcb4a4a598d",
"planName": "Winter T-shirts",
"quantity": 1,
"priceInCents": 3500
},
{
"id": "8d7eb04c-ee5c-4c51-b0dc-1bf104d3a37e",
"name": "Pants",
"planId": "49436d63-d345-4303-b4fd-f7da003e1a65",
"planName": "Winter Pants",
"quantity": 1,
"priceInCents": 4000
}
],
"trackingParameters": {
"src": null,
"sck": null,
"utm_source": "FB",
"utm_campaign": "CAMPANHA_5|761832537749495",
"utm_medium": "CONJUNTO_5|636393136432792",
"utm_content": "ANUNCIO_5|525916699209785",
"utm_term": "Facebook_Mobile_Feed"
},
"commission": {
"totalPriceInCents": 7500,
"gatewayFeeInCents": 375,
"userCommissionInCents": 7125,
"currency": "USD"
},
"isTest": false
}

3.2.2- Cartão Reembolsado

POST https://api.utmify.com.br/api-credentials/orders
Headers: { "x-api-token": "JHTbglkQnUhz7Tk2oQ4ZyuVYxBsOpC1XNdYD" }
Body: {
"orderId": "b101ea20-72c7-473d-bcc4-416fe4d8f3be",
"platform": "GlobalPay",
"paymentMethod": "credit_card",
"status": "refunded",
"createdAt": "2024-07-15 13:30:14",
"approvedDate": "2024-07-15 13:30:14",
"refundedAt": "2024-07-19 01:44:39",
"customer": {
"name": "Lucas Pereira Barros",
"email": "lucaspbarros@gmail.com",
"phone": "21996972147",
"document": "24883871428",
"country": "US",
"ip": "242.53.157.167"
},
"products": [
{
"id": "ab341a39-52e1-4dda-92c8-ef336f2bb43c",
"name": "T-shirt",
"planId": "e7c5e019-3ac8-4ba1-9a11-2fcb4a4a598d",
"planName": "Winter T-shirts",
"quantity": 1,
"priceInCents": 3500
},
{
"id": "8d7eb04c-ee5c-4c51-b0dc-1bf104d3a37e",
"name": "Pants",
"planId": "49436d63-d345-4303-b4fd-f7da003e1a65",
"planName": "Winter Pants",
"quantity": 1,
"priceInCents": 4000
}
],
"trackingParameters": {
"src": null,
"sck": null,
"utm_source": "FB",
"utm_campaign": "CAMPANHA_5|761832537749495",
"utm_medium": "CONJUNTO_5|636393136432792",
"utm_content": "ANUNCIO_5|525916699209785",
"utm_term": "Facebook_Mobile_Feed"
},
"commission": {
"totalPriceInCents": 7500,
"gatewayFeeInCents": 375,
"userCommissionInCents": 7125,
"currency": "USD"
},
"isTest": false
}

4- Perguntas Frequentes

Como faço para acessar a Utmify e realizar a integração?
Basta criar uma conta gratuita através do link: https://app.utmify.com.br/register.

Como sei se as informações que enviei estão corretas?
A nossa API realiza a validação de todos os dados enviados no payload. Serão retornados na resposta da requisição os campos inválidos e os formatos aceitos.

Como sei se os pedidos que enviei foram salvos corretamente?
Basta acessar a conta que foi utilizada para se obter a credencial e navegar até a aba “Resumo”. Nela estarão as informações dos pedidos salvos na plataforma, com opções de filtros por períodos específicos etc.

Recebi o seguinte erro: API_CREDENTIAL_NOT_FOUND. O que significa?
O erro em questão, indica que a Credencial de API não foi informada ou foi passada incorretamente através dos headers da requisição. Consulte o tópico Formato da Requisição para melhor esclarecimento.
