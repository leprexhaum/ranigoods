import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, ArrowRight, Zap, Users, Briefcase, FileText, Share2, BarChart2 } from 'lucide-react'

export const metadata = {
  title: 'TechPag — Gestão de Cobranças Simples e Profissional',
  description: 'A TechPag é uma plataforma de gestão de cobranças e faturamento digital que permite a empresas e profissionais organizar pagamentos de forma simples e segura.',
}

export default function LandingPage() {
  return (
    <div className="bg-ep-base text-ep-primary">

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-ep-accent/5 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-ep-accent/3 blur-2xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-ep-surface border border-ep-border-default rounded-full px-4 py-1.5 text-xs text-ep-secondary mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-ep-accent animate-pulse" />
            Plataforma em fase de expansão — acesso sob solicitação
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Gestão de Cobranças{' '}
            <span className="text-gradient-accent">Simples e Profissional</span>
          </h1>
          <p className="text-lg md:text-xl text-ep-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            A TechPag é uma plataforma de gestão de cobranças e faturamento digital que permite a empresas e profissionais organizar pagamentos de forma simples e segura.
          </p>
          <p className="text-ep-secondary mb-10 text-base">
            Organize, automatize e acompanhe suas cobranças digitais num só lugar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contato"
              className="inline-flex items-center gap-2 bg-ep-accent text-ep-base font-semibold px-8 py-3.5 rounded-md hover:bg-ep-accent-light transition-colors text-base"
            >
              Solicitar acesso <ArrowRight size={18} />
            </Link>
            <Link
              href="#como-funciona"
              className="inline-flex items-center gap-2 border border-ep-border-default text-ep-secondary px-8 py-3.5 rounded-md hover:border-ep-accent hover:text-ep-accent transition-colors text-base"
            >
              Como funciona
            </Link>
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section className="py-24 border-t border-ep-border-subtle">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Para quem é a TechPag</h2>
            <p className="text-ep-secondary text-lg max-w-xl mx-auto">
              Desenvolvida para profissionais e empresas que buscam organização no faturamento digital.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap size={24} className="text-ep-accent" />,
                title: 'Freelancers',
                desc: 'Profissionais que precisam cobrar clientes de forma simples e profissional.',
              },
              {
                icon: <Briefcase size={24} className="text-ep-accent" />,
                title: 'Empresas',
                desc: 'Organizações que desejam organizar e automatizar suas cobranças.',
              },
              {
                icon: <Users size={24} className="text-ep-accent" />,
                title: 'Prestadores de Serviços',
                desc: 'Quem precisa de uma solução eficiente para faturamento digital.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-ep-surface border border-ep-border-subtle rounded-lg p-8 hover:border-ep-border-default transition-colors"
              >
                <div className="w-12 h-12 rounded-md bg-ep-raised flex items-center justify-center mb-5">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                <p className="text-ep-secondary text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24 border-t border-ep-border-subtle bg-ep-surface/30">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como funciona na prática</h2>
            <p className="text-ep-secondary text-lg max-w-xl mx-auto">
              Com a TechPag, você organiza todo o ciclo de cobrança digital dos seus clientes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', icon: <FileText size={20} className="text-ep-accent" />, title: 'Criar uma cobrança', desc: 'Gere uma cobrança digital personalizada para cada cliente.' },
              { step: '02', icon: <Zap size={20} className="text-ep-accent" />, title: 'Definir condições', desc: 'Estabeleça valores e condições de pagamento de forma flexível.' },
              { step: '03', icon: <Share2 size={20} className="text-ep-accent" />, title: 'Compartilhar', desc: 'Envie a cobrança ao cliente de maneira simples e organizada.' },
              { step: '04', icon: <BarChart2 size={20} className="text-ep-accent" />, title: 'Acompanhar status', desc: 'Monitore o status do pagamento em tempo real.' },
            ].map((item) => (
              <div key={item.step} className="relative bg-ep-surface border border-ep-border-subtle rounded-lg p-6 hover:border-ep-accent/30 transition-colors">
                <span className="text-4xl font-bold text-ep-border-default absolute top-4 right-5 select-none">{item.step}</span>
                <div className="w-10 h-10 rounded-md bg-ep-raised flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-ep-secondary text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 bg-ep-raised border border-ep-border-default rounded-lg p-6 text-center">
            <p className="text-ep-secondary text-sm">
              <span className="text-ep-accent font-medium">Exemplo:</span> um profissional pode gerar uma cobrança de €50 por um serviço prestado e acompanhar o pagamento de forma organizada.
            </p>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-24 border-t border-ep-border-subtle">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Planos e acesso</h2>
            <p className="text-ep-secondary text-lg max-w-xl mx-auto">
              A TechPag encontra-se atualmente em fase inicial de expansão. Oferecemos acesso sob solicitação.
            </p>
          </div>
          <div className="max-w-lg mx-auto bg-ep-surface border border-ep-accent/30 rounded-lg p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-ep-accent/10 flex items-center justify-center mx-auto mb-6">
              <Zap size={28} className="text-ep-accent" />
            </div>
            <h3 className="text-xl font-bold mb-6">Acesso disponível para:</h3>
            <ul className="space-y-3 text-ep-secondary text-sm mb-8 text-left max-w-xs mx-auto">
              {['Empresas', 'Profissionais independentes', 'Parceiros estratégicos'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-ep-accent flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/contato"
              className="inline-flex items-center gap-2 bg-ep-accent text-ep-base font-semibold px-8 py-3 rounded-md hover:bg-ep-accent-light transition-colors"
            >
              Entre em contato para solicitar acesso <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Contato / Processo seletivo */}
      <section id="contato" className="py-24 border-t border-ep-border-subtle bg-ep-surface/30">
        <div className="mx-auto max-w-2xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Entre em contato</h2>
            <p className="text-ep-secondary text-lg">
              Estamos em fase de crescimento e buscamos parceiros e profissionais interessados em trabalhar conosco.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* Disclaimer */}
      <div className="border-t border-ep-border-subtle py-4 text-center">
        <p className="text-xs text-ep-muted">A TechPag é uma plataforma de software e não atua como instituição financeira.</p>
      </div>
    </div>
  )
}

function ContactForm() {
  return (
    <form
      action="/api/contact"
      method="POST"
      className="bg-ep-surface border border-ep-border-subtle rounded-lg p-8 space-y-5"
    >
      <div>
        <label className="block text-sm font-medium text-ep-secondary mb-1.5">Nome completo</label>
        <input
          type="text"
          name="name"
          required
          className="w-full bg-ep-raised border border-ep-border-default rounded-md px-4 py-2.5 text-sm text-ep-primary placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
          placeholder="Seu nome"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ep-secondary mb-1.5">Email</label>
        <input
          type="email"
          name="email"
          required
          className="w-full bg-ep-raised border border-ep-border-default rounded-md px-4 py-2.5 text-sm text-ep-primary placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
          placeholder="seu@email.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ep-secondary mb-1.5">Telefone</label>
        <input
          type="tel"
          name="phone"
          className="w-full bg-ep-raised border border-ep-border-default rounded-md px-4 py-2.5 text-sm text-ep-primary placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
          placeholder="+351 000 000 000"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ep-secondary mb-1.5">Mensagem</label>
        <textarea
          name="message"
          rows={4}
          required
          className="w-full bg-ep-raised border border-ep-border-default rounded-md px-4 py-2.5 text-sm text-ep-primary placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors resize-none"
          placeholder="Descreva seu interesse ou necessidade..."
        />
      </div>
      <button
        type="submit"
        className="w-full bg-ep-accent text-ep-base font-semibold py-3 rounded-md hover:bg-ep-accent-light transition-colors text-sm"
      >
        Enviar
      </button>
    </form>
  )
}
