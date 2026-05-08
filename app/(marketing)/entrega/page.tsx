import { PolicyLayout } from '../_components/PolicyLayout'

export const metadata = {
  title: 'Política de Entrega — TechPag',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  )
}

export default function EntregaPage() {
  return (
    <PolicyLayout title="Política de Entrega" updated="2026">
      <Section title="1. Tipo de Serviço">
        <p>A TechPag é um serviço digital (SaaS — Software as a Service). Não existe entrega física de qualquer produto.</p>
      </Section>

      <Section title="2. Disponibilização do Acesso">
        <p>O acesso à plataforma é disponibilizado de forma imediata após a confirmação do pagamento e ativação da conta. O utilizador receberá as credenciais de acesso por email.</p>
      </Section>

      <Section title="3. Forma de Entrega">
        <p>O serviço é entregue exclusivamente de forma online, através da plataforma web acessível em <a href="https://techpags.shop">techpags.shop</a>. Não existe instalação de software necessária.</p>
      </Section>

      <Section title="4. Interrupções de Serviço">
        <p>Podem ocorrer interrupções temporárias do serviço devido a:</p>
        <ul>
          <li>Manutenções programadas (comunicadas com antecedência)</li>
          <li>Falhas técnicas imprevistas</li>
          <li>Atualizações de segurança</li>
        </ul>
        <p>A TechPag envidará todos os esforços para minimizar o impacto de eventuais interrupções.</p>
      </Section>

      <Section title="5. Contato">
        <p>Para questões relacionadas com o acesso ao serviço: <a href="mailto:contact@pagstech.shop">contact@pagstech.shop</a></p>
      </Section>
    </PolicyLayout>
  )
}
