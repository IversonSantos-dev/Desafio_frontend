import { Link, useLocation } from '@tanstack/react-router'
import { Heart, Home, ShoppingBag, User } from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useCart } from '@/features/cart/hooks/useCart'
import { useFavorites } from '@/features/favorites/hooks/useFavorites'

export function MobileBottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const { data: cart } = useCart()
  const { data: favorites = [] } = useFavorites()

  const pathname = location.pathname
  const cartItemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0
  const favoriteCount = favorites.length

  const isHome = pathname === '/'
  const isFavorites = pathname.startsWith('/favorites')
  const isCart = pathname.startsWith('/cart')
  const isProfile =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register')

  if (pathname.startsWith('/nft/')) {
    return null
  }

  return (
    <nav
      aria-label="Navegação inferior mobile"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      <div className="relative mx-auto flex h-20 max-w-md items-center justify-around rounded-t-[32px] border-t border-[#241612] bg-[#140D0A]/95 px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] backdrop-blur-lg">
        {/* 1. Início */}
        <Link
          to="/"
          aria-label="Início"
          className={`flex flex-col items-center justify-center transition-colors ${
            isHome ? 'text-[#D28A4C]' : 'text-[#8C7A6B] hover:text-[#D28A4C]'
          }`}
        >
          <Home className="h-6 w-6 stroke-[2.2]" />
          <span className="sr-only">Início</span>
        </Link>

        {/* 2. Favoritos */}
        <Link
          to="/favorites"
          aria-label="Favoritos"
          className={`relative flex flex-col items-center justify-center transition-colors ${
            isFavorites ? 'text-[#D28A4C]' : 'text-[#8C7A6B] hover:text-[#D28A4C]'
          }`}
        >
          <Heart className={`h-6 w-6 stroke-[2.2] ${isFavorites ? 'fill-[#D28A4C]' : ''}`} />
          {favoriteCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#D28A4C] px-1 text-[9px] font-bold text-[#140D0A]">
              {favoriteCount}
            </span>
          )}
          <span className="sr-only">Favoritos</span>
        </Link>

        {/* 3. Botão Central Elevated Cutout */}
        <div className="relative -top-5 flex flex-col items-center">
          <Link
            to="/"
            aria-label="Explorar Coleções"
            className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#140D0A] bg-gradient-to-br from-[#E09455] via-[#D28A4C] to-[#B86D33] text-[#140D0A] shadow-lg shadow-[#D28A4C]/30 transition-transform active:scale-90"
          >
            {/* Viewfinder / Scanner icon matching Início.png */}
            <svg
              className="h-7 w-7 fill-none stroke-current stroke-[2.2] text-[#140D0A]"
              viewBox="0 0 24 24"
            >
              <path
                d="M7 4H4v3M17 4h3v3M7 20H4v-3M17 20h3v-3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="7" y1="12" x2="17" y2="12" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        {/* 4. Carrinho */}
        <Link
          to="/cart"
          aria-label="Carrinho de compras"
          className={`relative flex flex-col items-center justify-center transition-colors ${
            isCart ? 'text-[#D28A4C]' : 'text-[#8C7A6B] hover:text-[#D28A4C]'
          }`}
        >
          <ShoppingBag className="h-6 w-6 stroke-[2.2]" />
          {cartItemCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#D28A4C] px-1 text-[9px] font-bold text-[#140D0A]">
              {cartItemCount}
            </span>
          )}
          <span className="sr-only">Carrinho</span>
        </Link>

        {/* 5. Perfil / Login */}
        <Link
          to={user ? '/profile' : '/login'}
          aria-label={user ? 'Meu Perfil' : 'Entrar na Conta'}
          className={`flex flex-col items-center justify-center transition-colors ${
            isProfile ? 'text-[#D28A4C]' : 'text-[#8C7A6B] hover:text-[#D28A4C]'
          }`}
        >
          <User className="h-6 w-6 stroke-[2.2]" />
          <span className="sr-only">{user ? 'Meu Perfil' : 'Entrar'}</span>
        </Link>
      </div>
    </nav>
  )
}
