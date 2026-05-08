import { PolicyLayout } from '../_components/PolicyLayout'

export const metadata = {
  title: 'Política de Cookies — TechPag',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  )
}

export default function CookiesPage() {
  return (
    <PolicyLayout title="Política de Cookies" updated="2026">
      <Section title="1. O que são Cookies">
        <p>Cookies são pequenos ficheiros de texto armazenados no seu dispositivo quando visita um website. Permitem que o site reconheça o seu dispositivo e memorize determinadas informações sobre a sua visita.</p>
      </Section>

      <Section title="2. Tipos de Cookies Utilizados">
        <ul>
          <li><strong style={{color: '#f7fff0'}}>Essenciais:</strong> necessários para o funcionamento básico da plataforma, como autenticação e segurança de sessão.</li>
          <li><strong style={{color: '#f7fff0'}}>Analíticos:</strong> utilizados para compreender como os utilizadores interagem com a plataforma, de forma anónima.</li>
          <li><strong style={{color: '#f7fff0'}}>Funcionais:</strong> permitem memorizar as suas preferências e personalizar a experiência de utilização.</li>
        </ul>
      </Section>

      <Section title="3. Finalidade">
        <p>Os cookies são utilizados para:</p>
        <ul>
          <li>Garantir o correto funcionamento do site e da plataforma</li>
          <li>Melhorar a experiência de utilização</li>
          <li>Análise de tráfego e comportamento de utilização</li>
        </ul>
      </Section>

      <Section title="4. Gestão de Cookies">
        <p>Pode desativar ou eliminar cookies através das definições do seu navegador. Note que a desativação de cookies essenciais pode afetar o funcionamento da plataforma.</p>
        <p>Consulte a documentação do seu navegador para instruções sobre como gerir cookies:</p>
        <ul>
          <li>Google Chrome: Definições → Privacidade e segurança → Cookies</li>
          <li>Mozilla Firefox: Opções → Privacidade e Segurança</li>
          <li>Safari: Preferências → Privacidade</li>
        </ul>
      </Section>

      <Section title="5. Consentimento">
        <p>Ao continuar a utilizar o nosso website, aceita o uso de cookies conforme descrito nesta política. Pode retirar o seu consentimento a qualquer momento através das definições do navegador.</p>
      </Section>

      <Section title="6. Contato">
        <p>Para questões sobre a nossa política de cookies: <a href="mailto:contact@pagstech.shop">contact@pagstech.shop</a></p>
      </Section>
    </PolicyLayout>
  )
}
