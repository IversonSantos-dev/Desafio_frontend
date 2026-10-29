import { Link, useLocation } from '@tanstack/react-router'
import { LogIn, LogOut, Search, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useCart } from '@/features/cart/hooks/useCart'

export function Header() {
  const { user, logout } = useAuth()
  const { data: cart } = useCart()
  const location = useLocation()
  const pathname = location.pathname

  const cartItemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0

  const isHome = pathname === '/'
  const isMarket =
    pathname.startsWith('/nft') || pathname.startsWith('/cart') || pathname.startsWith('/checkout')

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#241612] bg-[#140D0A]/95 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo KURIO */}
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <span className="font-mono text-xl font-bold tracking-[0.2em] text-white sm:text-2xl">
            KURIO
          </span>
        </Link>

        {/* Links de navegação centrais (Figma: Início | Mercado | Criadores | Aprenda) */}
        <nav
          className="hidden items-center gap-8 font-mono text-xs sm:text-sm md:flex"
          aria-label="Navegação principal"
        >
          <Link
            to="/"
            className={`pb-1 transition-colors ${
              isHome
                ? 'border-b-2 border-[#D28A4C] font-bold text-[#D28A4C]'
                : 'text-[#9E8C7E] hover:text-white'
            }`}
          >
            Início
          </Link>
          <Link
            to="/"
            search={{ sort: 'recent' }}
            className={`pb-1 transition-colors ${
              isMarket && !isHome
                ? 'border-b-2 border-[#D28A4C] font-bold text-[#D28A4C]'
                : 'text-[#9E8C7E] hover:text-white'
            }`}
          >
            Mercado
          </Link>
          <a href="#criadores" className="pb-1 text-[#9E8C7E] transition-colors hover:text-white">
            Criadores
          </a>
          <a
            href="#diario-da-cunhagem"
            className="pb-1 text-[#9E8C7E] transition-colors hover:text-white"
          >
            Aprenda
          </a>
        </nav>

        {/* Ações da direita: Busca, Carrinho, Botão Entrar */}
        <div className="flex items-center gap-3 font-mono sm:gap-4">
          {/* Ícone de Busca */}
          <Link
            to="/"
            aria-label="Buscar no catálogo"
            className="flex h-9 w-9 items-center justify-center text-[#9E8C7E] transition-colors hover:text-white"
          >
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>

          {/* Botão de Carrinho com badge numérico */}
          <Link
            to="/cart"
            aria-label={`Carrinho com ${cartItemCount} itens`}
            className="relative flex h-9 w-9 items-center justify-center text-white transition-colors hover:text-[#D28A4C]"
          >
            <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#D28A4C] px-1 text-[9px] font-bold text-[#140D0A]">
              {cartItemCount}
            </span>
          </Link>

          {/* Autenticação: Botão Entrar ou Perfil do Colecionador */}
          {user ? (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/profile"
                aria-label={`Perfil de ${user.name}`}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-[#35201A] bg-[#241612] px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:border-[#D28A4C] sm:px-3"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D28A4C]/20 text-[10px] font-bold text-[#D28A4C]">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="hidden max-w-[100px] truncate sm:inline-block">{user.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                title="Sair da conta"
                aria-label="Sair da conta"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#35201A] text-[#9E8C7E] transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              aria-label="Conectar"
              className="flex items-center gap-2 rounded-xl bg-[#D28A4C] px-3.5 py-2 text-xs font-bold text-[#140D0A] shadow-md transition-all hover:bg-[#c37a3c] active:scale-95 sm:px-4"
            >
              <LogIn className="h-4 w-4 stroke-[2.5]" />
              <span>Entrar</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
