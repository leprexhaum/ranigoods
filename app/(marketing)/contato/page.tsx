import { MapPin, Mail, Phone } from 'lucide-react'

export const metadata = {
  title: 'Contato — TechPag',
}

export default function ContatoPage() {
  return (
    <div className="min-h-screen bg-ep-base">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-14 text-center">
          <h1 className="text-4xl font-bold text-ep-primary mb-3">Contato</h1>
          <p className="text-ep-secondary text-lg">TechPag</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Info */}
          <div className="space-y-8">
            <div className="bg-ep-surface border border-ep-border-subtle rounded-lg p-8">
              <h2 className="text-lg font-semibold text-ep-primary mb-6">Informações de Contato</h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-md bg-ep-raised flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-ep-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ep-primary mb-1">Endereço</p>
                    <p className="text-sm text-ep-secondary leading-relaxed">
                      Carreira de São Tiago, Nº 22 A<br />
                      7320-157 Castelo de Vide<br />
                      Portugal
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-md bg-ep-raised flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-ep-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ep-primary mb-1">Email</p>
                    <a
                      href="mailto:contact@pagstech.shop"
                      className="text-sm text-ep-accent hover:text-ep-accent-light transition-colors"
                    >
                      contact@pagstech.shop
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-md bg-ep-raised flex items-center justify-center flex-shrink-0">
                    <Phone size={18} className="text-ep-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ep-primary mb-1">Telefone</p>
                    <a href="tel:+351212307800" className="text-sm text-ep-secondary hover:text-ep-accent transition-colors block">
                      +351 21 230 7800
                    </a>
                    <a href="tel:+351937642189" className="text-sm text-ep-secondary hover:text-ep-accent transition-colors block">
                      +351 937 642 189
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-ep-surface border border-ep-border-subtle rounded-lg p-8">
              <h2 className="text-lg font-semibold text-ep-primary mb-4">Responsável</h2>
              <p className="text-sm text-ep-secondary">William Ferrugini Amaral</p>
              <p className="text-sm text-ep-muted mt-1">NIF: 307338061</p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-ep-surface border border-ep-border-subtle rounded-lg p-8">
            <h2 className="text-lg font-semibold text-ep-primary mb-6">Envie uma mensagem</h2>
            <form action="/api/contact" method="POST" className="space-y-5">
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
                  rows={5}
                  required
                  className="w-full bg-ep-raised border border-ep-border-default rounded-md px-4 py-2.5 text-sm text-ep-primary placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors resize-none"
                  placeholder="Como podemos ajudar?"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-ep-accent text-ep-base font-semibold py-3 rounded-md hover:bg-ep-accent-light transition-colors text-sm"
              >
                Enviar mensagem
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
