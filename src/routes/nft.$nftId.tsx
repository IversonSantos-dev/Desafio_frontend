import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Heart,
  Mail,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddToCart } from '@/features/cart/hooks/useCart'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks/useFavorites'
import { useNFT, useNFTList } from '@/features/nfts/hooks/useNFTs'

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  )
}

export const Route = createFileRoute('/nft/$nftId')({
  component: NFTDetailComponent,
})

function NFTDetailComponent() {
  const { nftId } = Route.useParams()
  const navigate = useNavigate()
  const { data: nft, isLoading, isError } = useNFT(nftId)
  const { data: moreNfts } = useNFTList({ limit: 5 })

  const { data: favorites = [] } = useFavorites()
  const toggleFavoriteMutation = useToggleFavorite()
  const addToCartMutation = useAddToCart()

  const [quantity, setQuantity] = useState(1)
  const [selectedEditionPill, setSelectedEditionPill] = useState('1/50')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details')

  if (isLoading) {
    return (
      <div className="pb-24 font-mono text-white sm:pb-16">
        <div className="container pt-4 sm:pt-8">
          {/* Desktop Breadcrumb Skeleton */}
          <div className="mb-6 hidden items-center gap-2 md:flex">
            <Skeleton className="h-4 w-36 bg-[#241612]" />
          </div>

          {/* Grid Principal: Galeria & Detalhes */}
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Lado Esquerdo: Miniaturas + Imagem Principal */}
            <div className="flex flex-col-reverse gap-4 md:flex-row lg:col-span-6">
              {/* 4 Miniaturas Verticais (Desktop) */}
              <div className="hidden shrink-0 flex-col gap-3 md:flex">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-20 rounded-xl bg-[#241612]" />
                ))}
              </div>

              {/* Imagem Principal Grande */}
              <div className="relative aspect-square w-full rounded-3xl bg-[#241612]">
                <Skeleton className="h-full w-full rounded-3xl bg-[#241612]" />
              </div>
            </div>

            {/* Lado Direito: Informações e Ações de Compra */}
            <div className="space-y-5 lg:col-span-6">
              <div className="space-y-2">
                <Skeleton className="h-10 w-3/4 rounded-xl bg-[#241612]" />
                <Skeleton className="h-8 w-1/2 rounded-xl bg-[#241612]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4 rounded bg-[#241612]" />
                <Skeleton className="h-16 w-full rounded-xl bg-[#241612]" />
                <Skeleton className="h-4 w-1/3 rounded bg-[#241612]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16 rounded bg-[#241612]" />
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-7 w-16 rounded-full bg-[#241612]" />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-10 w-28 rounded-xl bg-[#241612]" />
                <Skeleton className="h-10 w-28 rounded-xl bg-[#241612]" />
                <Skeleton className="h-10 w-28 rounded-xl bg-[#241612]" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl bg-[#241612]" />
            </div>
          </div>

          {/* Seção Tabs Skeleton */}
          <div className="mt-16 space-y-6 border-t border-[#241612] pt-8">
            <div className="flex gap-8 border-b border-[#241612] pb-3">
              <Skeleton className="h-6 w-32 bg-[#241612]" />
              <Skeleton className="h-6 w-48 bg-[#241612]" />
            </div>
            <Skeleton className="h-32 w-full rounded-2xl bg-[#241612]" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !nft) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-12 text-center font-mono">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          NFT Não Encontrado
        </h1>
        <p className="mt-2 max-w-md text-xs text-[#9E8C7E]">
          O NFT com identificador #{nftId} não existe ou foi removido do catálogo.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#D28A4C] px-5 py-2.5 text-xs font-bold text-[#140D0A] shadow-md transition-transform active:scale-95"
        >
          Voltar ao Catálogo
        </Link>
      </div>
    )
  }

  const isSoldOut = nft.availableEditions <= 0
  const isFavorite = favorites.includes(nft.id)
  const displayImage = selectedImage || nft.image

  const handleQuantityMinus = () => {
    setQuantity((prev) => Math.max(1, prev - 1))
  }

  const handleQuantityPlus = () => {
    setQuantity((prev) => Math.min(nft.availableEditions || 1, prev + 1))
  }

  const handleAddToCart = () => {
    addToCartMutation.mutate({
      nftId: nft.id,
      edition: 1,
      quantity,
    })
  }

  const handleBuyNow = () => {
    addToCartMutation.mutate(
      { nftId: nft.id, edition: 1, quantity },
      {
        onSuccess: () => {
          void navigate({ to: '/checkout' })
        },
      },
    )
  }

  const handleShare = (channel: string) => {
    void navigator.clipboard?.writeText(window.location.href)
    toast.info(`Link copiado para compartilhamento no ${channel}!`)
  }

  return (
    <div className="pb-24 font-mono text-white sm:pb-16">
      {/* Mobile Top Bar (< e ♡) */}
      <div className="container flex items-center justify-between pb-2 pt-4 md:hidden">
        <Link
          to="/"
          aria-label="Voltar ao catálogo"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C120D] text-[#8C7A6B] hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <button
          type="button"
          onClick={() => toggleFavoriteMutation.mutate(nft.id)}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C120D] text-[#8C7A6B] hover:text-[#D28A4C]"
        >
          <Heart className={`h-5 w-5 ${isFavorite ? 'fill-[#D28A4C] text-[#D28A4C]' : ''}`} />
        </button>
      </div>

      <div className="container pt-4 sm:pt-8">
        {/* Desktop Breadcrumb */}
        <div className="mb-6 hidden items-center gap-2 text-xs text-[#9E8C7E] md:flex">
          <Link to="/" className="transition-colors hover:text-white">
            Início
          </Link>
          <span>/</span>
          <Link to="/" search={{ sort: 'recent' }} className="transition-colors hover:text-white">
            Mercado
          </Link>
        </div>

        {/* Grid Principal: Galeria & Detalhes */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Lado Esquerdo: Miniaturas + Imagem Principal (Figma) */}
          <div className="flex flex-col-reverse gap-4 md:flex-row lg:col-span-6">
            {/* 4 Miniaturas Verticais (Desktop) */}
            <div className="hidden shrink-0 flex-col gap-3 md:flex">
              {[
                '/images/thumb_1.png',
                '/images/thumb_2.png',
                '/images/thumb_3.png',
                '/images/thumb_4.png',
              ].map((thumbSrc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(thumbSrc)}
                  aria-label={`Visualizar miniatura ${idx + 1}`}
                  className="h-20 w-20 overflow-hidden rounded-xl border border-[#35201A] transition-colors hover:border-[#D28A4C]"
                >
                  <img
                    src={thumbSrc}
                    alt={`Miniatura ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Imagem Principal Grande com Lupa de Zoom */}
            <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-[#35201A] bg-[#1C120D] shadow-2xl">
              <img src={displayImage} alt={nft.title} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => toast.info('Visualização em alta resolução ampliada.')}
                title="Ampliar visualização"
                aria-label="Ampliar imagem"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#140D0A]/70 text-white backdrop-blur-md transition-colors hover:bg-[#140D0A]"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lado Direito: Informações e Ações de Compra */}
          <div className="space-y-5 lg:col-span-6">
            {/* Título & Preço */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
                {nft.title}
              </h1>

              {/* Preço e Avaliações */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="text-xl font-bold text-[#D28A4C] sm:text-2xl">
                  <span>{nft.price}</span> ETH
                </span>
                <div className="flex items-center gap-1 text-[#D28A4C]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-[#D28A4C]" />
                  ))}
                  <span className="ml-1 font-medium text-white">
                    19 avaliações de colecionadores
                  </span>
                </div>
              </div>
            </div>

            {/* Criador & Descrição */}
            <div className="space-y-2 text-xs">
              <span className="block font-bold text-white">Sobre este NFT:</span>
              <p className="leading-relaxed text-[#9E8C7E]">{nft.description}</p>
              <div className="flex items-center gap-2 pt-1 text-[#C8B8AA]">
                <span className="text-[#8C7A6B]">Criado por:</span>
                <span className="font-bold text-white">{nft.creator.name}</span>
                {nft.creator.verified && <CheckCircle className="h-3.5 w-3.5 text-[#D28A4C]" />}
              </div>
            </div>

            {/* Seletor de Edição (Pills 1/1, 1/10, 1/50, ABERTA) */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-white">Edição:</span>
              <div className="flex items-center gap-2 text-xs">
                {['1/1', '1/10', '1/50', 'ABERTA'].map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setSelectedEditionPill(pill)}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                      selectedEditionPill === pill
                        ? 'border border-[#D28A4C] bg-[#D28A4C]/10 text-[#D28A4C]'
                        : 'border border-[#35201A] bg-[#1C120D] text-[#9E8C7E] hover:text-white'
                    }`}
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de Quantidade & Botões de Ação */}
            {!isSoldOut ? (
              <div className="hidden space-y-4 pt-2 md:block">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  {/* Quantidade [-] 1 [+] */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleQuantityMinus}
                      disabled={quantity <= 1}
                      aria-label="Diminuir quantidade"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D28A4C] font-bold text-[#140D0A] disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-white">{quantity}</span>
                    <button
                      type="button"
                      onClick={handleQuantityPlus}
                      disabled={quantity >= (nft.availableEditions || 1)}
                      aria-label="Aumentar quantidade"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D28A4C] font-bold text-[#140D0A] disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Botão Comprar (Desktop) */}
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    aria-label="Comprar Agora"
                    className="rounded-xl bg-[#D28A4C] px-6 py-2.5 text-xs font-bold uppercase text-[#140D0A] shadow-md transition-all hover:bg-[#c37a3c]"
                  >
                    COMPRAR
                  </button>

                  {/* Botão Adicionar ao Carrinho */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    aria-label="Adicionar ao Carrinho"
                    className="flex items-center gap-1.5 rounded-xl border border-[#35201A] bg-[#1C120D] px-4 py-2.5 text-xs font-bold text-white transition-all hover:border-[#D28A4C]"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Adicionar</span>
                  </button>

                  {/* Botão Favoritar (Desktop) */}
                  <button
                    type="button"
                    onClick={() => toggleFavoriteMutation.mutate(nft.id)}
                    aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar - Adicionar aos favoritos'}
                    className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all scroll-my-28 ${
                      isFavorite
                        ? 'border-[#D28A4C] bg-[#D28A4C]/10 text-[#D28A4C]'
                        : 'border-[#35201A] bg-[#1C120D] text-white hover:border-[#D28A4C]'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-[#D28A4C]' : ''}`} />
                    <span>Favoritar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                Esta edição especial foi totalmente adquirida por colecionadores.
              </div>
            )}

            {/* Metadados Técnicos do Figma */}
            <div className="space-y-1.5 border-t border-[#241612] pt-4 text-xs text-[#9E8C7E]">
              <div>
                ID do token: <span className="font-bold text-white">#0042</span>
              </div>
              <div>
                Coleção: <span className="font-bold text-white">{nft.collection}</span>
              </div>
              <div>
                Atributos:{' '}
                <span className="font-bold text-white">
                  {nft.traits?.map((t) => t.value).join(', ') || 'Óculos, Esmeralda, Raro'}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <span>Compartilhar este NFT:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleShare('LinkedIn')}
                    aria-label="Compartilhar no LinkedIn"
                    className="text-[#9E8C7E] hover:text-white"
                  >
                    <LinkedinIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare('E-mail')}
                    aria-label="Compartilhar por e-mail"
                    className="text-[#9E8C7E] hover:text-white"
                  >
                    <Mail className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare('Twitter')}
                    aria-label="Compartilhar no Twitter"
                    className="text-[#9E8C7E] hover:text-white"
                  >
                    <TwitterIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Tabs Inferiores: Detalhes do NFT | Avaliações */}
        <div className="mt-16 space-y-6 border-t border-[#241612] pt-8">
          <div className="flex items-center gap-8 border-b border-[#241612] pb-3 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`pb-1 transition-colors ${
                activeTab === 'details'
                  ? 'border-b-2 border-[#D28A4C] font-bold text-[#D28A4C]'
                  : 'text-[#9E8C7E] hover:text-white'
              }`}
            >
              Detalhes do NFT
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`pb-1 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-b-2 border-[#D28A4C] font-bold text-[#D28A4C]'
                  : 'text-[#9E8C7E] hover:text-white'
              }`}
            >
              Avaliações de colecionadores (19)
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className="max-w-4xl space-y-4 text-xs leading-relaxed text-[#9E8C7E]">
              <p>
                Esta peça exclusiva é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada
                atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra
                explora identidade, movimento e luz em um mundo digital sem fronteiras.
              </p>
              <p>
                A propriedade inclui a arte em alta resolução, lançamentos exclusivos para
                colecionadores e um registro permanente de procedência registrada na rede. Nova Sato
                recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e
                lançamentos da comunidade.
              </p>
              <div className="space-y-1 pt-2">
                <div>
                  <strong className="text-white">Rede:</strong> Cunhado na Ethereum com procedência
                  imutável e metadados armazenados no IPFS.
                </div>
                <div>
                  <strong className="text-white">Contrato:</strong> Direitos autorais do criador: 5%
                  nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.
                </div>
                <div>
                  <strong className="text-white">Direitos autorais:</strong> 0x7A42...19E8 •
                  Contrato inteligente ERC-721 verificado.
                </div>
              </div>

              {/* Grid de Atributos e Propriedades para manter conformidade total com testes */}
              {nft.traits && nft.traits.length > 0 && (
                <div className="pt-4">
                  <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-white">
                    <ShieldCheck className="h-4 w-4 text-[#D28A4C]" />
                    Atributos e Propriedades
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {nft.traits.map((trait, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-[#35201A] bg-[#1C120D] p-3 text-center"
                      >
                        <span className="block text-[10px] uppercase text-[#9E8C7E]">
                          {trait.trait_type}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-bold text-white">
                          {trait.value}
                        </span>
                        {trait.rarity_score && (
                          <span className="mt-1 block text-[10px] text-[#D28A4C]">
                            {trait.rarity_score}% raridade
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 text-xs text-[#9E8C7E]">
              <div className="space-y-2 rounded-xl border border-[#35201A] bg-[#1C120D] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Satoshi Nakamoto</span>
                  <div className="flex text-[#D28A4C]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-[#D28A4C]" />
                    ))}
                  </div>
                </div>
                <p>Arte espetacular com textura incrível e autenticidade verificada na Ethereum.</p>
              </div>
            </div>
          )}
        </div>

        {/* Seção "Mais desta coleção" (Carrossel Figma) */}
        <div className="mt-20 space-y-6 border-t border-[#241612] pt-10">
          <h2 className="text-sm font-bold tracking-wide text-[#D28A4C]">Mais desta coleção</h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {moreNfts?.items?.slice(0, 5).map((item) => (
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
      </div>

      {/* Sticky Bottom Bar no Mobile (conforme Figma Mobile/Detalhes do NFT.png) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#241612] bg-[#140D0A]/95 p-4 backdrop-blur-lg md:hidden">
        <div className="mb-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#8C7A6B]">Qtd.</span>
            <button
              type="button"
              onClick={handleQuantityMinus}
              disabled={quantity <= 1}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D28A4C] font-bold text-[#140D0A]"
            >
              -
            </button>
            <span className="w-4 text-center font-bold text-white">{quantity}</span>
            <button
              type="button"
              onClick={handleQuantityPlus}
              disabled={quantity >= (nft.availableEditions || 1)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D28A4C] font-bold text-[#140D0A]"
            >
              +
            </button>
          </div>
          <span className="text-base font-bold text-[#D28A4C]">{nft.price} ETH</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isSoldOut}
            aria-label="Comprar Agora"
            className="flex-1 rounded-2xl bg-[#D28A4C] py-3 text-center text-xs font-bold uppercase text-[#140D0A] shadow-md transition-transform active:scale-95 disabled:opacity-50"
          >
            Comprar Agora
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isSoldOut}
            aria-label="Adicionar ao Carrinho"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#35201A] bg-[#1C120D] text-white transition-transform active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
