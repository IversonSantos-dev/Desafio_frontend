import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
// Inline SVG icons for Social Networks
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95C18.05 21.45 22 17.19 22 12z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z" />
    </svg>
  )
}

export function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('')

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) return
    toast.success('Inscrição confirmada! Você receberá nossos alertas de lançamentos.')
    setNewsletterEmail('')
  }

  return (
    <footer className="mt-auto border-t border-[#241612] bg-[#140D0A] font-mono text-xs text-[#9E8C7E]">
      {/* 1. SEÇÃO DE DESTAQUES & NEWSLETTER */}
      <div className="border-b border-[#241612] bg-[#1C120D]/60 py-12">
        <div className="container grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Segurança da carteira */}
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D28A4C] text-lg font-bold text-[#140D0A] shadow-md">
              W
            </div>
            <h3 className="text-sm font-bold text-white">Segurança da carteira</h3>
            <p className="text-xs leading-relaxed text-[#9E8C7E]">
              Proteja sua carteira e colecione arte digital verificada com confiança.
            </p>
          </div>

          {/* Card 2: Criadores em destaque */}
          <div className="space-y-3" id="criadores">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D28A4C] text-lg font-bold text-[#140D0A] shadow-md">
              C
            </div>
            <h3 className="text-sm font-bold text-white">Criadores em destaque</h3>
            <p className="text-xs leading-relaxed text-[#9E8C7E]">
              Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.
            </p>
          </div>

          {/* Card 3: Alertas de lançamentos */}
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D28A4C] text-lg font-bold text-[#140D0A] shadow-md">
              D
            </div>
            <h3 className="text-sm font-bold text-white">Alertas de lançamentos</h3>
            <p className="text-xs leading-relaxed text-[#9E8C7E]">
              Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.
            </p>
          </div>

          {/* Card 4: Newsletter */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Antecipe-se ao próximo lançamento</h3>
            <form onSubmit={handleNewsletterSubmit} className="flex">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="seu melhor e-mail..."
                aria-label="Assinar newsletter de lançamentos"
                className="w-full rounded-l-xl border border-[#35201A] bg-[#241612] px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-[#8C7A6B] focus:border-[#D28A4C]"
              />
              <button
                type="submit"
                className="rounded-r-xl bg-[#D28A4C] px-4 py-2.5 font-bold text-[#140F0C] transition-colors hover:bg-[#c37a3c]"
              >
                Enviar
              </button>
            </form>
            <p className="text-[11px] leading-relaxed text-[#8C7A6B]">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </div>
        </div>
      </div>

      {/* 2. BARRA HORIZONTAL MID-FOOTER */}
      <div className="border-b border-[#241612] bg-[#261710] py-4">
        <div className="container flex flex-col items-center justify-between gap-4 text-xs text-[#C8B8AA] sm:flex-row">
          <span className="text-sm font-bold tracking-[0.2em] text-white">KURIO</span>
          <span className="text-center sm:text-left">
            Feito para colecionadores, criadores e cultura
          </span>
          <a href="mailto:contato@email.com" className="transition-colors hover:text-white">
            contato@email.com
          </a>
          <span>+55 11 4002 8922</span>
        </div>
      </div>

      {/* 3. COLUNAS DE LINKS & REDES SOCIAIS */}
      <div className="container py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Coluna 1 */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Meu perfil</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/profile" className="transition-colors hover:text-white">
                  Meu perfil
                </Link>
              </li>
              <li>
                <Link to="/profile" className="transition-colors hover:text-white">
                  Minha coleção
                </Link>
              </li>
              <li>
                <Link to="/profile" className="transition-colors hover:text-white">
                  Atividade
                </Link>
              </li>
              <li>
                <span className="cursor-default text-[#7A6A5E]">Estúdio do criador</span>
              </li>
              <li>
                <Link to="/favorites" className="transition-colors hover:text-white">
                  Lista de interesse
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 2 */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Central de ajuda</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="cursor-pointer transition-colors hover:text-white">
                  Central de ajuda
                </span>
              </li>
              <li>
                <span className="cursor-pointer transition-colors hover:text-white">
                  Como comprar NFTs
                </span>
              </li>
              <li>
                <Link to="/wallets" className="transition-colors hover:text-white">
                  Carteira e segurança
                </Link>
              </li>
              <li>
                <span className="cursor-pointer transition-colors hover:text-white">
                  Política do mercado
                </span>
              </li>
              <li>
                <span className="cursor-pointer transition-colors hover:text-white">
                  Denunciar item
                </span>
              </li>
            </ul>
          </div>

          {/* Coluna 3 */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Coleções</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  to="/"
                  search={{ collection: 'Cyber Punks' }}
                  className="transition-colors hover:text-white"
                >
                  Arte digital
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  search={{ collection: 'Cosmic Voyagers' }}
                  className="transition-colors hover:text-white"
                >
                  Fotografia
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  search={{ collection: 'Neon Genesis' }}
                  className="transition-colors hover:text-white"
                >
                  Música
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  search={{ collection: 'Ether Ethereals' }}
                  className="transition-colors hover:text-white"
                >
                  Arte 3D
                </Link>
              </li>
              <li>
                <Link to="/" className="transition-colors hover:text-white">
                  Utilidade
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Redes sociais & Carteiras compatíveis */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white">Redes sociais</h4>
            <div className="flex items-center gap-2">
              <a
                href="#facebook"
                aria-label="Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#35201A] bg-[#241612] text-[#9E8C7E] transition-colors hover:border-[#D28A4C] hover:text-white"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
              <a
                href="#instagram"
                aria-label="Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#35201A] bg-[#241612] text-[#9E8C7E] transition-colors hover:border-[#D28A4C] hover:text-white"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href="#twitter"
                aria-label="Twitter"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#35201A] bg-[#241612] text-[#9E8C7E] transition-colors hover:border-[#D28A4C] hover:text-white"
              >
                <TwitterIcon className="h-4 w-4" />
              </a>
              <a
                href="#linkedin"
                aria-label="LinkedIn"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#35201A] bg-[#241612] text-[#9E8C7E] transition-colors hover:border-[#D28A4C] hover:text-white"
              >
                <LinkedinIcon className="h-4 w-4" />
              </a>
              <a
                href="#youtube"
                aria-label="YouTube"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#35201A] bg-[#241612] text-[#9E8C7E] transition-colors hover:border-[#D28A4C] hover:text-white"
              >
                <YoutubeIcon className="h-4 w-4" />
              </a>
            </div>

            <div className="pt-2">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-white">
                Carteiras compatíveis
              </span>
              <div className="inline-flex items-center rounded-lg border border-[#35201A] bg-[#241612] px-3 py-1.5 text-[10px] text-[#D28A4C]">
                METAMASK • WALLETCONNECT • COINBASE
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. COPYRIGHT BOTTOM BAR */}
      <div className="border-t border-[#241612] py-4 text-center text-[11px] text-[#7A6A5E]">
        <p>© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}
