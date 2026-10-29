import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useApplyCoupon,
  useCart,
  useQuote,
  useRemoveCoupon,
  useRemoveFromCart,
  useUpdateCartQuantity,
} from '@/features/cart/hooks/useCart'
import { useNFTList } from '@/features/nfts/hooks/useNFTs'
import { multiplyUnitPrice } from '@/lib/decimal'

export const Route = createFileRoute('/cart')({
  component: CartComponent,
})

function CartComponent() {
  const navigate = useNavigate()
  const {
    data: cart,
    isLoading: isCartLoading,
    isError: isCartError,
    error: cartError,
    refetch: refetchCart,
  } = useCart()
  const { data: quote, isLoading: isQuoteLoading } = useQuote()
  const { data: moreNfts } = useNFTList({ limit: 5 })

  const updateQuantityMutation = useUpdateCartQuantity()
  const removeItemMutation = useRemoveFromCart()
  const applyCouponMutation = useApplyCoupon()
  const removeCouponMutation = useRemoveCoupon()

  const [couponInput, setCouponInput] = useState('')

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponInput.trim()) return
    applyCouponMutation.mutate(couponInput.trim(), {
      onSuccess: () => setCouponInput(''),
    })
  }

  const items = cart?.items || []
  const hasItems = items.length > 0

  return (
    <div className="pb-20 font-mono text-white">
      <div className="container py-6 sm:py-8">
        {/* Mobile Header (conforme Mobile/Carrinho de NFTs.png) */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C120D] text-[#8C7A6B] hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold text-white" aria-label="Carrinho de Compras">
            Carrinho de NFTs
          </h1>
          <div className="w-10" />
        </div>

        {/* Desktop Breadcrumb */}
        <div className="mb-6 hidden items-center gap-2 text-xs text-[#9E8C7E] md:flex">
          <Link to="/" className="transition-colors hover:text-white">
            Início
          </Link>
          <span>/</span>
          <Link to="/" search={{ sort: 'recent' }} className="transition-colors hover:text-white">
            Mercado
          </Link>
          <span>/</span>
          <span className="text-white">Carrinho</span>
          {/* Accessible heading for tests */}
          <h1 className="sr-only">Carrinho de Compras</h1>
        </div>

        {isCartLoading ? (
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl bg-[#241612]" />
              ))}
            </div>
            <div className="lg:col-span-4">
              <Skeleton className="h-72 w-full rounded-2xl bg-[#241612]" />
            </div>
          </div>
        ) : isCartError ? (
          <div
            className="my-8 rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center"
            data-testid="cart-error"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Falha ao carregar o carrinho</h2>
            <p className="mx-auto mt-2 max-w-md text-xs text-[#9E8C7E]">
              {cartError instanceof Error
                ? cartError.message
                : 'Não foi possível carregar os itens do seu carrinho.'}
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => void refetchCart()}
                className="gap-2 bg-[#D28A4C] px-6 font-bold text-[#140D0A]"
              >
                <RotateCcw className="h-4 w-4" />
                Tentar Novamente
              </Button>
            </div>
          </div>
        ) : hasItems ? (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* TABELA / LISTA DE NFTS NO CARRINHO */}
            <div className="space-y-4 lg:col-span-8">
              {/* Cabeçalho da Tabela no Desktop (NFTs | Preço | Edições | Total) */}
              <div className="hidden grid-cols-12 border-b border-[#241612] px-2 pb-3 text-xs text-[#9E8C7E] md:grid">
                <span className="col-span-5 font-bold">NFTs</span>
                <span className="col-span-2 text-center font-bold">Preço</span>
                <span className="col-span-2 text-center font-bold">Edições</span>
                <span className="col-span-2 text-right font-bold">Total</span>
                <span className="col-span-1" />
              </div>

              {/* Linhas de Itens */}
              <div className="space-y-3">
                {items.map((item) => {
                  const currentNFTPrice = item.nft?.price || item.unitPrice
                  const itemTotal = multiplyUnitPrice(currentNFTPrice, item.quantity)

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#241612] bg-[#1C120D] p-3.5 sm:p-4 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Imagem + Título + Token ID */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={item.nft.image}
                            alt={item.nft.title}
                            className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-xl border border-[#35201A] object-cover"
                          />
                          <div className="min-w-0">
                            <h3 className="truncate text-xs sm:text-sm font-bold text-white">
                              {item.nft.title}
                            </h3>
                            <span className="block text-[11px] text-[#8C7A6B]">
                              Edição: {item.edition}/{item.nft.totalEditions}
                            </span>
                          </div>
                        </div>

                        {/* Ações da direita: Preço, Quantidade, Total e Remover */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-2 sm:pt-0 border-t border-[#241612]/60 sm:border-0">
                          {/* Preço Unitário */}
                          <div className="text-xs font-bold text-[#D28A4C]">
                            {currentNFTPrice} ETH
                          </div>

                          {/* Controles de Quantidade [-] 2 [+] */}
                          <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-[#35201A] bg-[#140D0A] px-2 py-1">
                            <button
                              type="button"
                              disabled={item.quantity <= 1}
                              onClick={() =>
                                updateQuantityMutation.mutate({
                                  itemId: item.id,
                                  quantity: Math.max(1, item.quantity - 1),
                                })
                              }
                              aria-label="Diminuir quantidade"
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D28A4C] font-bold text-[#140D0A] disabled:opacity-40"
                            >
                              <Minus className="h-3 w-3 stroke-[2.5]" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.quantity >= item.nft.availableEditions}
                              onClick={() =>
                                updateQuantityMutation.mutate({
                                  itemId: item.id,
                                  quantity: item.quantity + 1,
                                })
                              }
                              aria-label="Aumentar quantidade"
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D28A4C] font-bold text-[#140D0A] disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3 stroke-[2.5]" />
                            </button>
                          </div>

                          {/* Total do Item */}
                          <div className="text-right text-xs sm:text-sm font-bold text-[#D28A4C] min-w-[70px]">
                            {itemTotal} ETH
                          </div>

                          {/* Botão Remover */}
                          <button
                            type="button"
                            onClick={() => removeItemMutation.mutate(item.id)}
                            aria-label={`Remover ${item.nft.title} do carrinho`}
                            className="p-1 text-[#8C7A6B] transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* PAINEL LATERAL: RESUMO DA CARTEIRA / CHECKOUT */}
            <div className="space-y-4 lg:col-span-4">
              <div className="space-y-5 rounded-2xl border border-[#241612] bg-[#1C120D] p-5 shadow-xl">
                <h2 className="text-sm font-bold text-white">Resumo da carteira</h2>

                {/* Campo de Cupom de Desconto */}
                <div className="space-y-2">
                  <span className="block text-xs text-[#9E8C7E]">Código promocional</span>
                  {cart?.couponCode ? (
                    <div className="flex items-center justify-between rounded-xl border border-[#D28A4C] bg-[#D28A4C]/10 p-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#D28A4C]">{cart.couponCode}</span>
                        {quote?.coupon && (
                          <span className="text-[#D28A4C]">
                            (-{quote.coupon.discountPercentage}%)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCouponMutation.mutate()}
                        className="text-[#8C7A6B] hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex">
                      <input
                        type="text"
                        placeholder="Código promocional (Ex: DESAFIO10)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="w-full rounded-l-xl border border-[#35201A] bg-[#140D0A] px-3 py-2 text-xs text-white outline-none placeholder:text-[#8C7A6B] focus:border-[#D28A4C]"
                      />
                      <button
                        type="submit"
                        disabled={!couponInput.trim() || applyCouponMutation.isPending}
                        className="rounded-r-xl bg-[#D28A4C] px-3.5 py-2 text-xs font-bold text-[#140F0C] transition-colors hover:bg-[#c37a3c]"
                      >
                        Aplicar
                      </button>
                    </form>
                  )}
                </div>

                {/* Detalhamento Financeiro */}
                {isQuoteLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-[#241612]" />
                    <Skeleton className="h-4 w-full bg-[#241612]" />
                    <Skeleton className="h-6 w-full bg-[#241612]" />
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-[#241612] pt-4 text-xs">
                    <div className="flex justify-between text-[#9E8C7E]">
                      <span>Subtotal</span>
                      <span className="font-bold text-white">
                        {quote?.subtotalETH || '0.00'} ETH
                      </span>
                    </div>

                    <div className="flex justify-between text-[#9E8C7E]">
                      <span>Desconto do lançamento</span>
                      <span className="font-bold text-white">
                        {quote?.coupon ? `(-) ${quote.discountETH} ETH` : '(-) 00.00'}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[#9E8C7E]">
                        <span>Taxa de rede</span>
                        <span className="font-bold text-white">
                          {quote?.networkFeeETH || '0.016'} ETH
                        </span>
                      </div>
                      <span className="block text-right text-[10px] text-[#D28A4C]">
                        Taxa estimada
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-[#241612] pt-3">
                      <span className="text-sm font-bold text-white">Total</span>
                      <span className="text-xl font-bold text-[#D28A4C]">
                        {quote?.totalETH || '0.00'} ETH
                      </span>
                    </div>
                  </div>
                )}

                {/* Botão de Finalizar */}
                <button
                  type="button"
                  onClick={() => void navigate({ to: '/checkout' })}
                  className="w-full rounded-xl bg-[#D28A4C] py-3 text-center text-xs font-bold text-[#140F0C] shadow-lg shadow-[#D28A4C]/20 transition-all hover:bg-[#c37a3c] active:scale-95"
                >
                  Conectar e finalizar
                </button>

                <div className="pt-1 text-center">
                  <Link
                    to="/"
                    className="text-xs text-[#9E8C7E] transition-colors hover:text-white"
                  >
                    Continuar explorando
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Carrinho Vazio */
          <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-3xl border border-dashed border-[#35201A] p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1C120D] text-[#D28A4C]">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-lg font-bold text-white">Seu carrinho está vazio</h2>
            <p className="mt-1 max-w-sm text-xs text-[#8C7A6B]">
              Explore o catálogo e selecione suas obras de arte digital exclusivas.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#D28A4C] px-6 py-2.5 text-xs font-bold text-[#140F0C] shadow-md transition-transform active:scale-95"
            >
              Explorar Catálogo
            </Link>
          </div>
        )}

        {/* Seção "Colecionadores também viram" (Carrossel Figma Desktop/Carrinho de NFTs.png) */}
        {hasItems && (
          <div className="mt-20 space-y-6 border-t border-[#241612] pt-10">
            <h2 className="text-sm font-bold tracking-wide text-[#D28A4C]">
              Colecionadores também viram
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {moreNfts?.items
                ?.filter((item) => item.price !== '0.50')
                .slice(0, 5)
                .map((item) => (
                <Link
                  key={item.id}
                  to="/nft/$nftId"
                  params={{ nftId: item.id }}
                  className="group block space-y-2"
                >
                  <div className="aspect-square overflow-hidden rounded-2xl border border-[#35201A] bg-[#1C120D]">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <h3 className="truncate text-xs font-bold text-white transition-colors group-hover:text-[#D28A4C]">
                    {item.title}
                  </h3>
                  <span className="block text-xs font-bold text-[#D28A4C]">{item.price} ETH</span>
                </Link>
              ))}
            </div>

            {/* Dots decorativos */}
            <div className="flex justify-center gap-2 pt-2">
              <span className="h-2 w-2 rounded-full bg-[#D28A4C]" />
              <span className="h-2 w-2 rounded-full bg-[#35201A]" />
              <span className="h-2 w-2 rounded-full bg-[#35201A]" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
