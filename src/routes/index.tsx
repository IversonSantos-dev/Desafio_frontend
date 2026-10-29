import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { NFT } from '@/contracts'
import { useAddToCart } from '@/features/cart/hooks/useCart'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks/useFavorites'
import { useNFTList } from '@/features/nfts/hooks/useNFTs'

export const catalogSearchSchema = z.object({
  q: z.string().optional(),
  collection: z.string().optional(),
  rarity: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  sort: z.enum(['recent', 'price_asc', 'price_desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

const HERO_IMAGES = [
  '/images/nft_neon_vessel.png',
  '/images/nft_golden_beat.png',
  '/images/featured_sidebar.png',
]

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): CatalogSearch =>
    catalogSearchSchema.parse(search),
  component: HomeComponent,
})

function HomeComponent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })

  const [heroIndex, setHeroIndex] = useState(() => {
    if (
      typeof window !== 'undefined' &&
      (window.navigator as unknown as { webdriver?: boolean }).webdriver
    ) {
      return 0
    }
    return Math.floor(Math.random() * 3)
  })

  const {
    q = '',
    collection = '',
    rarity = '',
    minPrice = '',
    maxPrice = '',
    sort = 'recent',
    page = 1,
  } = search

  const [prevQ, setPrevQ] = useState(q)
  const [searchInput, setSearchInput] = useState(q)
  const [priceSliderValue, setPriceSliderValue] = useState(maxPrice || '12.30')
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  if (prevQ !== q) {
    setPrevQ(q)
    setSearchInput(q)
  }

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== q) {
        void navigate({
          search: (prev) => ({
            ...prev,
            q: searchInput || undefined,
            page: 1,
          }),
        })
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput, q, navigate])

  const { data, isLoading, isError, error, refetch } = useNFTList({
    q: q || undefined,
    collection: collection || undefined,
    rarity: rarity || undefined,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    sort,
    page,
    limit: 8, // 8 itens por página (2 páginas para os 12 NFTs)
  })

  const { data: favorites = [] } = useFavorites()
  const toggleFavoriteMutation = useToggleFavorite()
  const addToCartMutation = useAddToCart()

  const handleFilterChange = (newFilters: Partial<CatalogSearch>) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...newFilters,
        page: 1,
      }),
    })
  }

  const handleClearFilters = () => {
    setSearchInput('')
    setPriceSliderValue('12.30')
    void navigate({
      search: () => ({
        sort: 'recent',
        page: 1,
      }),
    })
  }

  const handleApplyPriceFilter = () => {
    handleFilterChange({
      minPrice: '0.02',
      maxPrice: priceSliderValue,
    })
  }

  const hasActiveFilters = !!(
    q ||
    collection ||
    rarity ||
    minPrice ||
    maxPrice ||
    sort !== 'recent'
  )

  return (
    <div className="font-mono text-white">
      {/* 1. HERO SECTION (Desktop e Mobile adaptado perfeitamente ao Figma) */}
      <section className="container pb-8 pt-6 sm:pb-12 sm:pt-10">
        {/* Hero Card / Container */}
        <div className="relative grid items-center gap-8 overflow-hidden rounded-3xl border border-[#241612] bg-[#160E0B]/80 p-6 shadow-2xl sm:p-12 md:grid-cols-12">
          {/* Lado Esquerdo: Textos do Figma */}
          <div className="z-10 space-y-4 sm:space-y-6 md:col-span-7">
            <span className="block text-xs font-bold uppercase tracking-wider text-[#D28A4C] sm:text-sm">
              Bem-vindo à Kurio
            </span>

            <h1 className="text-2xl font-bold uppercase leading-tight tracking-tight text-white sm:text-4xl sm:leading-tight lg:text-5xl">
              <span className="hidden md:inline">
                SEJA DONO DO FUTURO
                <br />
                DA ARTE DIGITAL
              </span>
              <span className="md:hidden">
                SEJA DONO DA
                <br />
                CULTURA DIGITAL
              </span>
              <span className="sr-only"> - Descubra, Negocie e Colecione NFTs Raros</span>
            </h1>

            <p className="max-w-lg text-xs leading-relaxed text-[#9E8C7E] sm:text-sm">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
              digital rara, apoie artistas e tenha uma parte da cultura da internet.
            </p>

            <div className="pt-2">
              <a
                href="#catalogo"
                className="inline-flex items-center gap-2 rounded-xl bg-[#D28A4C] px-6 py-3 text-xs font-bold uppercase text-[#140D0A] shadow-lg shadow-[#D28A4C]/25 transition-transform hover:bg-[#c37a3c] active:scale-95 sm:text-sm"
              >
                <span>EXPLORAR</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* Três pontos decorativos e navegáveis do carrossel */}
            <div
              className="flex items-center gap-1 pt-2"
              role="tablist"
              aria-label="Slides do banner"
            >
              {HERO_IMAGES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={heroIndex === idx}
                  onClick={() => setHeroIndex(idx)}
                  aria-label={`Ver arte em destaque ${idx + 1}`}
                  className="flex h-6 w-6 items-center justify-center rounded-full transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D28A4C]"
                >
                  <span
                    className={`h-2 rounded-full transition-all ${
                      heroIndex === idx
                        ? 'w-6 bg-[#D28A4C]'
                        : 'w-2 bg-[#38220F] hover:bg-[#523318]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Lado Direito: Imagem Hero (sem macaco, aleatório entre as 3 artes digitais) */}
          <div className="z-10 flex justify-center md:col-span-5">
            <div className="relative aspect-square w-full max-w-[340px] overflow-hidden rounded-3xl border border-[#35201A] shadow-2xl sm:max-w-[420px]">
              <img
                src={HERO_IMAGES[heroIndex]}
                alt="Arte Digital em Destaque"
                className="h-full w-full object-cover transition-opacity duration-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATÁLOGO PRINCIPAL & SIDEBAR (Layout Figma de 2 colunas) */}
      <section id="catalogo" className="container pb-16">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* COLUNA PRINCIPAL: TABS, BUSCA, GRID DE CARDS E PAGINAÇÃO */}
          <main className="space-y-6 lg:col-span-9 lg:col-start-4">
            {/* Barra Superior: Tabs & Ordenação */}
            <div className="flex flex-col gap-4 border-b border-[#241612] pb-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Tabs: Todos os NFTs | Novos lançamentos | Em alta */}
              <div className="flex items-center gap-6 overflow-x-auto text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => handleFilterChange({ sort: 'recent', collection: undefined })}
                  className={`whitespace-nowrap pb-1 transition-colors ${
                    sort === 'recent' && !collection
                      ? 'border-b-2 border-[#D28A4C] font-bold text-[#D28A4C]'
                      : 'text-[#9E8C7E] hover:text-white'
                  }`}
                >
                  Todos os NFTs
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange({ sort: 'recent' })}
                  className="whitespace-nowrap pb-1 text-[#9E8C7E] transition-colors hover:text-white"
                >
                  Novos lançamentos
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange({ sort: 'price_desc' })}
                  className={`whitespace-nowrap pb-1 transition-colors ${
                    sort === 'price_desc'
                      ? 'border-b-2 border-[#D28A4C] font-bold text-[#D28A4C]'
                      : 'text-[#9E8C7E] hover:text-white'
                  }`}
                >
                  Em alta
                </button>
              </div>

              {/* Controles de Filtro e Ordenação */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#9E8C7E]">
                {/* Filtrar por Coleção */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="collection-select" className="text-xs">
                    Coleção:
                  </label>
                  <select
                    id="collection-select"
                    aria-label="Filtrar por Coleção"
                    value={collection || ''}
                    onChange={(e) =>
                      handleFilterChange({
                        collection: e.target.value || undefined,
                      })
                    }
                    className="cursor-pointer rounded-lg border border-[#35201A] bg-[#1C120D] px-2.5 py-1 text-xs font-medium text-white outline-none focus:border-[#D28A4C]"
                  >
                    <option value="">Todas as Coleções</option>
                    <option value="Cyber Punks">Cyber Punks</option>
                    <option value="Cosmic Voyagers">Cosmic Voyagers</option>
                    <option value="Neon Genesis">Neon Genesis</option>
                  </select>
                </div>

                {/* Ordenar por Dropdown */}
                <div className="flex items-center gap-1.5 text-xs text-[#9E8C7E]">
                  <ArrowUpDown className="h-3.5 w-3.5 text-[#D28A4C]" />
                  <label htmlFor="sort-select" className="text-xs">
                    Ordenar por:
                  </label>
                  <select
                    id="sort-select"
                    aria-label="Ordenar por"
                    value={sort}
                    onChange={(e) =>
                      handleFilterChange({
                        sort: e.target.value as 'recent' | 'price_asc' | 'price_desc',
                      })
                    }
                    className="cursor-pointer rounded-lg border border-[#35201A] bg-[#1C120D] px-2.5 py-1 text-xs font-medium text-white outline-none focus:border-[#D28A4C]"
                  >
                    <option value="recent">Listados recentemente</option>
                    <option value="price_asc">Menor Preço</option>
                    <option value="price_desc">Maior Preço</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Barra de Busca (Desktop, Tablet e Mobile) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
                <Input
                  type="search"
                  placeholder="Buscar por título ou coleção..."
                  aria-label="Buscar por título"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="rounded-xl border-[#241612] bg-[#1C120D] pl-10 text-xs text-white placeholder:text-[#8C7A6B]"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                aria-label="Abrir filtros"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D28A4C] text-[#140D0A] shadow-md transition-transform active:scale-95 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Tags de Filtros Ativos */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-[#8C7A6B]">Filtros ativos:</span>
                {q && (
                  <Badge
                    variant="secondary"
                    className="gap-1 border-[#35201A] bg-[#241612] text-[#D28A4C]"
                  >
                    Busca: {q}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleFilterChange({ q: undefined })}
                    />
                  </Badge>
                )}
                {collection && (
                  <Badge
                    variant="secondary"
                    className="gap-1 border-[#35201A] bg-[#241612] text-[#D28A4C]"
                  >
                    {collection}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleFilterChange({ collection: undefined })}
                    />
                  </Badge>
                )}
                {rarity && (
                  <Badge
                    variant="secondary"
                    className="gap-1 border-[#35201A] bg-[#241612] text-[#D28A4C]"
                  >
                    {rarity}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleFilterChange({ rarity: undefined })}
                    />
                  </Badge>
                )}
                {(minPrice || maxPrice) && (
                  <Badge
                    variant="secondary"
                    className="gap-1 border-[#35201A] bg-[#241612] text-[#D28A4C]"
                  >
                    {minPrice || '0'} - {maxPrice || '∞'} ETH
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() =>
                        handleFilterChange({ minPrice: undefined, maxPrice: undefined })
                      }
                    />
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-6 text-xs text-[#8C7A6B] hover:text-white"
                >
                  Limpar todos
                </Button>
              </div>
            )}

            {/* Grid de Cards de NFTs */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden border-[#241612] bg-[#1C120D]">
                    <Skeleton className="aspect-square w-full bg-[#241612]" />
                    <CardContent className="space-y-2 p-4">
                      <Skeleton className="h-4 w-3/4 bg-[#241612]" />
                      <Skeleton className="h-4 w-1/3 bg-[#241612]" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isError ? (
              <div
                className="my-8 rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center"
                data-testid="catalog-error"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-white">Falha ao carregar catálogo</h2>
                <p className="mx-auto mt-2 max-w-md text-xs text-[#9E8C7E]">
                  {error instanceof Error
                    ? error.message
                    : 'Não foi possível buscar a lista de ativos digitais. Tente novamente.'}
                </p>
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={() => void refetch()}
                    className="gap-2 bg-[#D28A4C] px-6 font-bold text-[#140D0A]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            ) : data?.items && data.items.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                  {data.items.map((nft) => (
                    <FigmaNFTCard
                      key={nft.id}
                      nft={nft}
                      isFavorite={favorites.includes(nft.id)}
                      onToggleFavorite={() => toggleFavoriteMutation.mutate(nft.id)}
                      onAddToCart={() =>
                        addToCartMutation.mutate({ nftId: nft.id, edition: 1, quantity: 1 })
                      }
                    />
                  ))}
                </div>

                {/* Paginação Estilo Figma: [1] [2] [3] [4] [>] e Botões de navegação */}
                {data.totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() =>
                        void navigate({
                          search: (prev) => ({ ...prev, page: Math.max(1, page - 1) }),
                        })
                      }
                      className="gap-1 border-[#35201A] bg-[#1C120D] text-white hover:bg-[#241612]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>

                    <div className="flex items-center gap-1.5 px-2">
                      {Array.from({ length: Math.min(4, data.totalPages) }).map((_, idx) => {
                        const pageNum = idx + 1
                        const isActive = pageNum === data.page
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() =>
                              void navigate({ search: (prev) => ({ ...prev, page: pageNum }) })
                            }
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                              isActive
                                ? 'bg-[#D28A4C] text-[#140D0A]'
                                : 'border border-[#35201A] bg-[#1C120D] text-white hover:border-[#D28A4C]'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    <div className="px-1 text-xs text-[#8C7A6B]">
                      Página <span className="font-bold text-white">{data.page}</span> de{' '}
                      <span className="font-bold text-white">{data.totalPages}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() =>
                        void navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })
                      }
                      className="gap-1 border-[#35201A] bg-[#1C120D] text-white hover:bg-[#241612]"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[#35201A] p-8 text-center">
                <p className="text-base font-bold text-white">Nenhum NFT encontrado</p>
                <p className="mt-1 text-xs text-[#8C7A6B]">
                  Ajuste os termos de busca ou filtros aplicados.
                </p>
                <Button
                  onClick={handleClearFilters}
                  className="mt-4 bg-[#D28A4C] text-xs font-bold text-[#140D0A]"
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </main>

          {/* SIDEBAR ESQUERDA (Desktop - Coleções, Faixa de Preço, Rede, NFT em Destaque) */}
          <aside
            className={`space-y-8 lg:col-span-3 lg:col-start-1 lg:row-start-1 ${isMobileFilterOpen ? 'block' : 'hidden lg:block'}`}
          >
            {/* Bloco 1: Coleções */}
            <div className="space-y-3.5 rounded-2xl border border-[#241612] bg-[#1C120D] p-5">
              <h3 className="text-sm font-bold text-white">Coleções</h3>
              <ul className="space-y-2 text-xs text-[#9E8C7E]">
                {[
                  { name: 'Arte digital', count: 33, key: 'Cyber Punks' },
                  { name: 'Fotografia', count: 12, key: 'Cosmic Voyagers' },
                  { name: 'Música', count: 65, key: 'Neon Genesis' },
                  { name: 'Arte 3D', count: 39, key: 'Ether Ethereals' },
                  { name: 'Colecionáveis', count: 23, key: '' },
                  { name: 'Generativa', count: 17, key: '' },
                  { name: 'Jogos', count: 19, key: '' },
                  { name: 'Assinaturas', count: 13, key: '' },
                  { name: 'Utilidade', count: 18, key: '' },
                ].map((item) => (
                  <li key={item.name}>
                    <button
                      type="button"
                      onClick={() => handleFilterChange({ collection: item.key || undefined })}
                      className={`flex w-full items-center justify-between transition-colors hover:text-[#D28A4C] ${
                        collection === item.key ? 'font-bold text-[#D28A4C]' : ''
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="text-[#6E5D52]">({item.count})</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bloco 2: Faixa de Preço */}
            <div className="space-y-3.5 rounded-2xl border border-[#241612] bg-[#1C120D] p-5">
              <h3 className="text-sm font-bold text-white">Faixa de preço</h3>
              <div className="space-y-2">
                <label htmlFor="price-range-slider" className="sr-only">
                  Faixa de preço máxima em ETH
                </label>
                <input
                  id="price-range-slider"
                  type="range"
                  min="0.02"
                  max="12.30"
                  step="0.1"
                  aria-label="Faixa de preço máxima em ETH"
                  value={priceSliderValue}
                  onChange={(e) => setPriceSliderValue(e.target.value)}
                  className="w-full cursor-pointer accent-[#D28A4C]"
                />
                <div className="flex items-center justify-between text-xs text-[#9E8C7E]">
                  <span>Preço: 0,02 - {priceSliderValue} ETH</span>
                </div>
                <button
                  type="button"
                  onClick={handleApplyPriceFilter}
                  className="w-full rounded-xl border border-[#D28A4C] bg-[#D28A4C]/10 py-1.5 text-xs font-bold text-[#D28A4C] transition-colors hover:bg-[#D28A4C] hover:text-[#140D0A]"
                >
                  Aplicar
                </button>
              </div>
            </div>

            {/* Bloco 3: Rede */}
            <div className="space-y-3.5 rounded-2xl border border-[#241612] bg-[#1C120D] p-5">
              <h3 className="text-sm font-bold text-white">Rede</h3>
              <ul className="space-y-2 text-xs text-[#9E8C7E]">
                {[
                  { name: 'Ethereum', count: 119 },
                  { name: 'Polygon', count: 78 },
                  { name: 'Solana', count: 86 },
                ].map((item) => (
                  <li key={item.name} className="flex items-center justify-between">
                    <span className="cursor-pointer hover:text-white">{item.name}</span>
                    <span className="text-[#6E5D52]">({item.count})</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bloco 4: NFT EM DESTAQUE (Card do Figma) */}
            <div className="space-y-2.5 rounded-2xl border border-[#241612] bg-[#1C120D] p-4">
              <span className="block text-[11px] font-bold tracking-wider text-[#D28A4C]">
                NFT EM DESTAQUE
              </span>
              <span className="block text-xs font-bold text-white">OFERTA LIMITADA</span>
              <div className="aspect-square overflow-hidden rounded-xl border border-[#35201A]">
                <img
                  src="/images/featured_sidebar.png"
                  alt="NFT em Destaque"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* 3. PROMO BANNERS SECTION (Conforme Figma Desktop/Início.png) */}
      <section className="container pb-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Banner 1: Lançamentos gênesis */}
          <div className="flex flex-col items-center gap-6 overflow-hidden rounded-3xl border border-[#241612] bg-[#160E0B] p-6 shadow-xl sm:flex-row">
            <div className="h-48 w-full shrink-0 overflow-hidden rounded-2xl border border-[#35201A] sm:w-48">
              <img
                src="/images/promo_genesis.png"
                alt="Lançamentos Gênesis"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white sm:text-lg">
                Lançamentos gênesis de edição limitada
              </h3>
              <p className="text-xs leading-relaxed text-[#9E8C7E]">
                Colecione edições escassas diretamente dos criadores antes da revelação pública.
              </p>
              <Link
                to="/"
                search={{ sort: 'recent' }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D28A4C] px-4 py-2 text-xs font-bold text-[#140F0C] transition-colors hover:bg-[#c37a3c]"
              >
                <span>Explorar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Banner 2: Arte digital selecionada */}
          <div className="flex flex-col items-center gap-6 overflow-hidden rounded-3xl border border-[#241612] bg-[#160E0B] p-6 shadow-xl sm:flex-row">
            <div className="h-48 w-full shrink-0 overflow-hidden rounded-2xl border border-[#35201A] sm:w-48">
              <img
                src="/images/promo_curated.png"
                alt="Arte digital selecionada"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white sm:text-lg">
                Arte digital selecionada e muito mais
              </h3>
              <p className="text-xs leading-relaxed text-[#9E8C7E]">
                Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.
              </p>
              <Link
                to="/"
                search={{ sort: 'recent' }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D28A4C] px-4 py-2 text-xs font-bold text-[#140F0C] transition-colors hover:bg-[#c37a3c]"
              >
                <span>Explorar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DIÁRIO DA CUNHAGEM (Blog / Magazine do Figma) */}
      <section id="diario-da-cunhagem" className="container pb-20">
        <div className="mb-10 space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Diário da Cunhagem
          </h2>
          <p className="mx-auto max-w-xl text-xs text-[#9E8C7E] sm:text-sm">
            Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Artigo 1 */}
          <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-[#241612] bg-[#1C120D] p-4 shadow-md">
            <div className="space-y-3">
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#35201A]">
                <img
                  src="/images/blog_1.png"
                  alt="Artigo 1"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="block text-[10px] text-[#9E8C7E]">
                12 de setembro | Leitura de 6 min
              </span>
              <h3 className="text-sm font-bold text-white">Como funciona a propriedade de NFTs</h3>
              <p className="text-xs leading-relaxed text-[#9E8C7E]">
                Aprenda a colecionar, negociar e verificar ativos digitais.
              </p>
            </div>
            <a
              href="#artigo-1"
              className="inline-block pt-2 text-xs font-bold text-[#D28A4C] hover:underline"
            >
              Ler mais →
            </a>
          </div>

          {/* Artigo 2 */}
          <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-[#241612] bg-[#1C120D] p-4 shadow-md">
            <div className="space-y-3">
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#35201A]">
                <img
                  src="/images/blog_2.png"
                  alt="Artigo 2"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="block text-[10px] text-[#9E8C7E]">
                13 de setembro | Leitura de 2 min
              </span>
              <h3 className="text-sm font-bold text-white">10 artistas digitais para acompanhar</h3>
              <p className="text-xs leading-relaxed text-[#9E8C7E]">
                Conheça criadores que moldam a cultura digital.
              </p>
            </div>
            <a
              href="#artigo-2"
              className="inline-block pt-2 text-xs font-bold text-[#D28A4C] hover:underline"
            >
              Ler mais →
            </a>
          </div>

          {/* Artigo 3 */}
          <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-[#241612] bg-[#1C120D] p-4 shadow-md">
            <div className="space-y-3">
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#35201A]">
                <img
                  src="/images/blog_3.png"
                  alt="Artigo 3"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="block text-[10px] text-[#9E8C7E]">
                15 de setembro | Leitura de 3 min
              </span>
              <h3 className="text-sm font-bold text-white">Raridade, atributos e procedência</h3>
              <p className="text-xs leading-relaxed text-[#9E8C7E]">
                Entenda raridade, procedência, direitos autorais e utilidade.
              </p>
            </div>
            <a
              href="#artigo-3"
              className="inline-block pt-2 text-xs font-bold text-[#D28A4C] hover:underline"
            >
              Ler mais →
            </a>
          </div>

          {/* Artigo 4 */}
          <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-[#241612] bg-[#1C120D] p-4 shadow-md">
            <div className="space-y-3">
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#35201A]">
                <img
                  src="/images/blog_4.png"
                  alt="Artigo 4"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="block text-[10px] text-[#9E8C7E]">
                15 de setembro | Leitura de 2 min
              </span>
              <h3 className="text-sm font-bold text-white">Como proteger sua carteira</h3>
              <p className="text-xs leading-relaxed text-[#9E8C7E]">
                Proteja sua carteira, seus ativos e sua identidade.
              </p>
            </div>
            <a
              href="#artigo-4"
              className="inline-block pt-2 text-xs font-bold text-[#D28A4C] hover:underline"
            >
              Ler mais →
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

interface FigmaNFTCardProps {
  nft: NFT
  isFavorite: boolean
  onToggleFavorite: () => void
  onAddToCart: () => void
}

function FigmaNFTCard({ nft, isFavorite, onToggleFavorite, onAddToCart }: FigmaNFTCardProps) {
  const isSoldOut = nft.availableEditions <= 0
  const isRare = ['Mythic', 'Legendary', 'Epic', 'Rare'].includes(nft.rarity)

  return (
    <div className="group relative flex flex-col space-y-2.5 transition-all scroll-my-24">
      {/* Container da Imagem com cantos arredondados */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[#2E1E18] bg-[#1C120D]">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block h-full w-full">
          <img
            src={nft.image}
            alt={nft.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Badge RARO no canto superior esquerdo (conforme Figma) */}
        {isRare && (
          <div className="absolute left-0 top-0">
            <span className="rounded-br-xl bg-[#D28A4C] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#140D0A] shadow-sm">
              RARO
            </span>
          </div>
        )}

        {/* Botão Favorito no mobile/desktop */}
        <button
          type="button"
          aria-label={
            isFavorite
              ? `Remover ${nft.title} dos favoritos`
              : `Adicionar ${nft.title} aos favoritos`
          }
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleFavorite()
          }}
          className={`absolute right-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-transform active:scale-90 scroll-my-24 ${
            isFavorite
              ? 'bg-[#140D0A]/80 text-[#D28A4C]'
              : 'bg-[#140D0A]/60 text-white/80 hover:text-white'
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-[#D28A4C] stroke-[#D28A4C]' : ''}`} />
        </button>

        {/* Hover overlay bar no Desktop com 3 ícones: Cart, Heart, Magnifier (conforme Figma Desktop/Login.png) */}
        <div className="absolute inset-x-0 bottom-0 hidden items-center justify-center gap-4 bg-[#140D0A]/90 py-2.5 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 sm:flex">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddToCart()
            }}
            disabled={isSoldOut}
            aria-label={`Comprar ou adicionar ${nft.title} ao carrinho`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-colors hover:text-[#D28A4C] disabled:opacity-40"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite()
            }}
            aria-label={
              isFavorite
                ? `Desfavoritar ${nft.title}`
                : `Favoritar ${nft.title}`
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-colors hover:text-[#D28A4C]"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-[#D28A4C] text-[#D28A4C]' : ''}`} />
          </button>
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            aria-label={`Ver detalhes de ${nft.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-colors hover:text-[#D28A4C]"
          >
            <Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Dados do Card: Título e Preço alinhados como no Figma */}
      <div className="space-y-1">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }}>
          <h2 className="truncate text-sm font-bold text-white transition-colors hover:text-[#D28A4C]">
            {nft.title}
          </h2>
        </Link>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#D28A4C]">{nft.price} ETH</span>
            {nft.id === 'nft_3' && (
              <span className="text-[11px] text-[#9E8C7E] line-through">2.29 ETH</span>
            )}
          </div>
          {isSoldOut ? (
            <span className="text-[10px] font-bold uppercase text-red-400">Esgotado</span>
          ) : (
            <button
              type="button"
              onClick={onAddToCart}
              aria-label={`Comprar ou adicionar ${nft.title} ao carrinho`}
              className="text-[10px] font-bold uppercase text-[#D28A4C] underline sm:hidden"
            >
              Comprar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
