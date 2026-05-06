import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? 'placeholder')
}

function fmtAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('pt-PT', {
    style:    'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function multibancoHtml(params: {
  name: string; entity: string; reference: string
  amount: number; currency: string; expiresAt: string
}): string {
  const { name, entity, reference, amount, currency, expiresAt } = params
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instruções de Pagamento Multibanco</title></head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="background:#635bff;padding:28px 40px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Instruções de Pagamento</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:14px;">Multibanco</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;color:#374151;font-size:15px;">Olá, <strong>${name}</strong>.</p>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">Para concluir o seu pagamento, utilize os seguintes dados no seu homebanking ou numa caixa Multibanco:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Entidade</p>
                <p style="margin:4px 0 0;color:#111827;font-size:22px;font-weight:700;letter-spacing:.1em;">${entity}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Referência</p>
                <p style="margin:4px 0 0;color:#111827;font-size:22px;font-weight:700;letter-spacing:.1em;">${reference}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                <p style="margin:0;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Valor</p>
                <p style="margin:4px 0 0;color:#111827;font-size:22px;font-weight:700;">${fmtAmount(amount, currency)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Prazo de pagamento</p>
                <p style="margin:4px 0 0;color:#111827;font-size:15px;font-weight:600;">${fmtDate(expiresAt)}</p>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">Após o pagamento, receberá uma confirmação por email. O prazo de processamento é de até 1 dia útil.</p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f3f4f6;background:#f9fafb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Pagamento processado com segurança via Stripe</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export const emailService = {
  async sendMultibancoEmail(params: {
    to:        string
    name:      string
    entity:    string
    reference: string
    amount:    number
    currency:  string
    expiresAt: string
  }): Promise<void> {
    try {
      await getResend().emails.send({
        from:    process.env.RESEND_FROM_EMAIL ?? 'noreply@techpags.com',
        to:      params.to,
        subject: `Instruções de pagamento Multibanco — Ref. ${params.reference}`,
        html:    multibancoHtml(params),
      })
    } catch (err) {
      console.error('[email] sendMultibancoEmail failed:', err)
    }
  },
}
