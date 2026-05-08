import { PolicyLayout } from '../_components/PolicyLayout'

export const metadata = {
  title: 'Política de Privacidade — TechPag',
}

export default function PrivacidadePage() {
  return (
    <PolicyLayout title="Política de Privacidade" updated="2026">
      <Section title="1. Dados Coletados">
        <p>Coletamos os seguintes dados pessoais:</p>
        <ul>
          <li>Nome</li>
          <li>Email</li>
          <li>Telefone</li>
          <li>Endereço IP</li>
          <li>Dados de uso da plataforma</li>
        </ul>
      </Section>

      <Section title="2. Base Legal (GDPR)">
        <p>Tratamos os seus dados com base nas seguintes bases legais:</p>
        <ul>
          <li>Execução de contrato</li>
          <li>Consentimento do utilizador</li>
          <li>Obrigações legais aplicáveis</li>
        </ul>
      </Section>

      <Section title="3. Finalidade">
        <p>Os dados são utilizados para:</p>
        <ul>
          <li>Prestação do serviço contratado</li>
          <li>Comunicação com o utilizador</li>
          <li>Garantia de segurança da plataforma</li>
        </ul>
      </Section>

      <Section title="4. Compartilhamento">
        <p>Os dados podem ser partilhados com:</p>
        <ul>
          <li>Stripe (processamento de pagamentos)</li>
          <li>Serviços de hospedagem e infraestrutura</li>
        </ul>
      </Section>

      <Section title="5. Transferências Internacionais">
        <p>Se necessário, os dados podem ser transferidos para fora da União Europeia com as garantias adequadas previstas no GDPR.</p>
      </Section>

      <Section title="6. Retenção">
        <p>Os dados são mantidos apenas pelo período estritamente necessário para a prestação do serviço ou cumprimento de obrigações legais.</p>
      </Section>

      <Section title="7. Direitos do Utilizador">
        <p>O utilizador tem direito a:</p>
        <ul>
          <li>Acesso aos seus dados pessoais</li>
          <li>Correção de dados incorretos</li>
          <li>Exclusão dos seus dados</li>
          <li>Portabilidade dos dados</li>
        </ul>
      </Section>

      <Section title="8. Segurança">
        <p>Implementamos medidas técnicas e organizacionais adequadas para proteger os seus dados contra acesso não autorizado, perda ou destruição.</p>
      </Section>

      <Section title="9. Cookies">
        <p>Utilizamos cookies para melhorar a experiência de utilização. Consulte a nossa <a href="/cookies">Política de Cookies</a> para mais informações.</p>
      </Section>

      <Section title="10. Contato">
        <p>Para exercer os seus direitos ou esclarecer dúvidas, contacte-nos através de: <a href="mailto:contact@pagstech.shop">contact@pagstech.shop</a></p>
      </Section>
    </PolicyLayout>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  )
}
