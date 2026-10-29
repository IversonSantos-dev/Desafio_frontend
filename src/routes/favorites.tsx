import { createFileRoute, Link } from '@tanstack/react-router'
import { Heart, ShoppingBag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddToCart } from '@/features/cart/hooks/useCart'
import { useFavoriteNFTs, useToggleFavorite } from '@/features/favorites/hooks/useFavorites'

export const Route = createFileRoute('/favorites')({
  component: FavoritesComponent,
})

function FavoritesComponent() {
  const { data: favoriteNFTs = [], isLoading } = useFavoriteNFTs()
  const toggleFavoriteMutation = useToggleFavorite()
  const addToCartMutation = useAddToCart()

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-border/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/20 text-red-500">
            <Heart className="h-6 w-6 fill-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Meus Favoritos
            </h1>
            <p className="text-sm text-muted-foreground">
              {favoriteNFTs.length === 1
                ? '1 NFT salvo nos favoritos'
                : `${favoriteNFTs.length} NFTs salvos nos favoritos`}
            </p>
          </div>
        </div>

        <Link to="/" className="text-xs font-semibold text-primary hover:underline">
          Explorar Catálogo
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/60">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : favoriteNFTs.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {favoriteNFTs.map((nft) => (
            <Card
              key={nft.id}
              className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
            >
              <Link
                to="/nft/$nftId"
                params={{ nftId: nft.id }}
                className="relative block aspect-square overflow-hidden bg-muted/20"
              >
                <img
                  src={nft.image}
                  alt={nft.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                <div className="absolute left-3 top-3">
                  <Badge
                    variant={
                      nft.rarity.toLowerCase() as
                        'mythic' | 'legendary' | 'epic' | 'rare' | 'common'
                    }
                  >
                    {nft.rarity}
                  </Badge>
                </div>
              </Link>

              <button
                type="button"
                aria-label={`Remover ${nft.title} dos favoritos`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleFavoriteMutation.mutate(nft.id)
                }}
                className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-500 backdrop-blur-md transition-transform active:scale-90"
              >
                <Heart className="h-4 w-4 fill-red-500 stroke-red-500" />
              </button>

              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">{nft.collection}</span>
                  <span>{nft.creator.name}</span>
                </div>

                <Link to="/nft/$nftId" params={{ nftId: nft.id }}>
                  <h2 className="truncate text-base font-bold text-foreground transition-colors hover:text-primary">
                    {nft.title}
                  </h2>
                </Link>

                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <div>
                    <span className="block text-[11px] text-muted-foreground">Preço</span>
                    <span className="font-mono text-sm font-bold text-foreground">
                      {nft.price} <span className="font-sans text-xs text-primary">ETH</span>
                    </span>
                  </div>

                  <Button
                    size="sm"
                    disabled={nft.availableEditions <= 0}
                    onClick={() =>
                      addToCartMutation.mutate({ nftId: nft.id, edition: 1, quantity: 1 })
                    }
                    className="gap-1.5 rounded-lg px-3"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>{nft.availableEditions <= 0 ? 'Esgotado' : 'Comprar'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-foreground">Nenhum favorito salvo</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Explore o catálogo e clique no ícone de coração para salvar seus NFTs preferidos aqui.
          </p>
          <Link to="/" className="mt-6">
            <Button>Explorar Catálogo</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
