import { PolicyLayout } from '../_components/PolicyLayout'

export const metadata = {
  title: 'Política de Reembolso — TechPag',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  )
}

export default function ReembolsoPage() {
  return (
    <PolicyLayout title="Política de Reembolso" updated="2026">
      <Section title="1. Natureza do Serviço">
        <p>A TechPag fornece software digital na modalidade SaaS (Software as a Service). O acesso ao serviço é disponibilizado de forma imediata após confirmação do pagamento.</p>
      </Section>

      <Section title="2. Direito de Reembolso">
        <p>Em conformidade com a legislação europeia de proteção ao consumidor, o cliente pode solicitar reembolso no prazo de até 14 dias a contar da data de contratação do serviço.</p>
      </Section>

      <Section title="3. Exceções">
        <p>O reembolso pode ser recusado nos seguintes casos:</p>
        <ul>
          <li>O serviço já tenha sido utilizado de forma significativa</li>
          <li>Haja evidência de abuso ou uso indevido da plataforma</li>
          <li>A solicitação seja feita fora do prazo legal de 14 dias</li>
        </ul>
      </Section>

      <Section title="4. Processamento">
        <p>Os reembolsos aprovados são processados através da Stripe e devolvidos ao método de pagamento original. O prazo de processamento pode variar entre 5 a 10 dias úteis, dependendo da instituição financeira do cliente.</p>
      </Section>

      <Section title="5. Como Solicitar">
        <p>Para solicitar um reembolso, envie um email para <a href="mailto:contact@pagstech.shop">contact@pagstech.shop</a> com o assunto "Solicitação de Reembolso" e inclua o seu nome, email de registo e motivo do pedido.</p>
      </Section>
    </PolicyLayout>
  )
}
