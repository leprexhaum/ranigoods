import { PolicyLayout } from '../_components/PolicyLayout'

export const metadata = {
  title: 'Termos de Serviço — TechPag',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  )
}

export default function TermosPage() {
  return (
    <PolicyLayout title="Termos de Serviço" updated="2026">
      <Section title="1. Identificação da Empresa">
        <p>Este website é operado por:</p>
        <ul>
          <li>TechPag</li>
          <li>Responsável: William Ferrugini Amaral</li>
          <li>NIF: 307338061</li>
          <li>Endereço: Carreira de São Tiago, Nº 22 A, 7320-157 Castelo de Vide, Portugal</li>
          <li>Email: <a href="mailto:contact@pagstech.shop">contact@pagstech.shop</a></li>
        </ul>
      </Section>

      <Section title="2. Descrição do Serviço">
        <p>A TechPag é uma plataforma SaaS (Software as a Service) que permite a criação, gestão e organização de cobranças digitais.</p>
        <p>A TechPag não atua como instituição financeira e não processa pagamentos diretamente. Todos os pagamentos são processados por provedores terceiros, nomeadamente a Stripe.</p>
      </Section>

      <Section title="3. Aceitação dos Termos">
        <p>Ao utilizar a plataforma, o utilizador declara que leu, compreendeu e aceita estes Termos de Serviço na sua totalidade.</p>
      </Section>

      <Section title="4. Elegibilidade">
        <p>Para utilizar a plataforma, o utilizador deve:</p>
        <ul>
          <li>Ter pelo menos 18 anos de idade</li>
          <li>Possuir capacidade legal para celebrar contratos</li>
          <li>Fornecer informações verdadeiras e atualizadas</li>
        </ul>
      </Section>

      <Section title="5. Uso Aceitável">
        <p>É estritamente proibido utilizar a plataforma para:</p>
        <ul>
          <li>Atividades ilegais ou fraudulentas</li>
          <li>Fraudes ou esquemas financeiros</li>
          <li>Comercialização de produtos proibidos pela Stripe</li>
          <li>Violação de leis aplicáveis em Portugal ou na União Europeia</li>
        </ul>
      </Section>

      <Section title="6. Conta de Utilizador">
        <p>O utilizador é inteiramente responsável por:</p>
        <ul>
          <li>Manter a segurança e confidencialidade da sua conta</li>
          <li>Todas as atividades realizadas através da sua conta</li>
        </ul>
      </Section>

      <Section title="7. Pagamentos">
        <ul>
          <li>A TechPag não armazena dados financeiros dos utilizadores</li>
          <li>Os pagamentos são processados exclusivamente pela Stripe</li>
          <li>O utilizador concorda com os Termos de Serviço da Stripe</li>
        </ul>
      </Section>

      <Section title="8. Propriedade Intelectual">
        <p>Todo o conteúdo da plataforma, incluindo código, design, textos e logótipos, pertence à TechPag. É proibida a reprodução, distribuição ou utilização sem autorização expressa.</p>
      </Section>

      <Section title="9. Limitação de Responsabilidade">
        <p>A TechPag não será responsável por:</p>
        <ul>
          <li>Falhas de serviços terceiros (Stripe, servidores de hospedagem)</li>
          <li>Perdas indiretas ou consequentes</li>
          <li>Interrupções temporárias do serviço</li>
        </ul>
      </Section>

      <Section title="10. Suspensão e Encerramento">
        <p>A TechPag reserva-se o direito de suspender ou encerrar contas em caso de:</p>
        <ul>
          <li>Violação destes Termos de Serviço</li>
          <li>Risco de fraude ou abuso da plataforma</li>
        </ul>
      </Section>

      <Section title="11. Lei Aplicável">
        <p>Estes Termos de Serviço são regidos pela legislação portuguesa e pela regulamentação da União Europeia aplicável.</p>
      </Section>

      <Section title="12. Contato">
        <p>Para questões relacionadas com estes termos: <a href="mailto:contact@pagstech.shop">contact@pagstech.shop</a></p>
      </Section>
    </PolicyLayout>
  )
}
