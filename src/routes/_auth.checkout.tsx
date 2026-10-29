import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  Loader2,
  MoreVertical,
  Plus,
  Shield,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useCart, useQuote } from '@/features/cart/hooks/useCart'
import { useCreateOrder } from '@/features/orders/hooks/useOrders'
import { useAddWallet, useWallets } from '@/features/wallets/hooks/useWallets'
import { useSocket } from '@/lib/socket-context'

export const Route = createFileRoute('/_auth/checkout')({
  component: CheckoutComponent,
})

type WalletProvider = 'All' | 'MetaMask' | 'Coinbase Wallet' | 'WalletConnect'

function CheckoutComponent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: cart, isLoading: isCartLoading } = useCart()
  const { data: quote, isLoading: isQuoteLoading } = useQuote()
  const { data: wallets = [], isLoading: isWalletsLoading } = useWallets()
  const addWalletMutation = useAddWallet()

  const createOrderMutation = useCreateOrder()
  const { lastEvent } = useSocket()
  const [idempotencyKey, setIdempotencyKey] = useState(() => `idemp_${crypto.randomUUID()}`)

  const [selectedWalletId, setSelectedWalletId] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<WalletProvider>('Coinbase Wallet')
  const [hasPriceChangedAlert, setHasPriceChangedAlert] = useState<boolean>(false)
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false)
  const [newWalletLabel, setNewWalletLabel] = useState('')
  const [newWalletEns, setNewWalletEns] = useState('')

  // Form states matching Desktop Figma "Perfil do colecionador"
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [username, setUsername] = useState(
    user?.name?.toLowerCase().replace(/\s+/g, '_') || 'satoshi',
  )
  const [selectedNetwork, setSelectedNetwork] = useState('Ethereum')
  const [profileNameInput, setProfileNameInput] = useState(user?.name || '')
  const [secondaryEns, setSecondaryEns] = useState('')
  const [walletTypeInput, setWalletTypeInput] = useState('MetaMask')
  const [referralCodeInput, setReferralCodeInput] = useState('')
  const [emailInput, setEmailInput] = useState(user?.email || '')
  const [ensSuffix, setEnsSuffix] = useState('.eth')
  const [ensPrefix, setEnsPrefix] = useState('satoshi')
  const [useOtherWallet, setUseOtherWallet] = useState(false)
  const [collectorNotes, setCollectorNotes] = useState('')

  // Determina carteira ativa
  const primaryWallet = wallets.find((w) => w.type === 'primary') || wallets[0]
  const activeWallet = wallets.find((w) => w.id === selectedWalletId) || primaryWallet
  const effectiveWalletId = activeWallet?.id || ''
  const items = cart?.items || []

  // Alerta de alteração de preço em tempo real via Socket.IO
  useEffect(() => {
    if (lastEvent?.startsWith('nft.updated:')) {
      const updatedNftId = lastEvent.split(':')[1]
      const isInCart = items.some((i) => i.nftId === updatedNftId)
      if (isInCart) {
        setHasPriceChangedAlert(true)
        toast.warning(
          'Atenção: A cotação dos itens foi atualizada pela rede. Revise o valor antes de confirmar.',
        )
      }
    }
  }, [lastEvent, items])

  const handleConfirmOrder = () => {
    if (createOrderMutation.isPending) return

    if (!activeWallet) {
      toast.error('Selecione uma carteira para pagamento.')
      return
    }

    if (items.length === 0) {
      toast.error('Seu carrinho está vazio.')
      return
    }

    if (hasPriceChangedAlert) {
      toast.error(
        'A cotação foi recalculada na rede. Aceite o novo valor antes de confirmar o pedido.',
      )
      return
    }

    createOrderMutation.mutate(
      {
        idempotencyKey,
        walletAddress: activeWallet.address,
        network: activeWallet.network,
        items: items.map((i) => ({
          nftId: i.nftId,
          edition: i.edition,
          quantity: i.quantity,
        })),
        quoteVersion: quote?.quoteVersion || 1,
        couponCode: cart?.couponCode,
      },
      {
        onSuccess: (order) => {
          setIdempotencyKey(`idemp_${crypto.randomUUID()}`)
          void navigate({
            to: '/order-confirmation/$orderId',
            params: { orderId: order.id },
          })
        },
        onError: (err) => {
          if (err.message.includes('Cotação desatualizada')) {
            setHasPriceChangedAlert(true)
          }
        },
      },
    )
  }

  const handleCreateQuickWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWalletLabel.trim()) {
      toast.error('Informe um apelido para a carteira.')
      return
    }

    const randomHex = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
    try {
      const created = await addWalletMutation.mutateAsync({
        label: newWalletLabel.trim(),
        profileName: user?.name || 'Colecionador',
        email: user?.email || 'colecionador@nftmarket.dev',
        ensName: newWalletEns.trim() || undefined,
        address: randomHex,
        network: 'Ethereum',
        type: 'secondary',
      })
      setSelectedWalletId(created.id)
      setIsAddWalletOpen(false)
      setNewWalletLabel('')
      setNewWalletEns('')
    } catch {
      // toast tratado na mutation
    }
  }

  if (isCartLoading || isQuoteLoading || isWalletsLoading) {
    return (
      <div className="container max-w-5xl space-y-4 py-12 font-mono">
        <Skeleton className="h-8 w-48 bg-[#241612]" />
        <Skeleton className="h-44 w-full rounded-2xl bg-[#241612]" />
        <Skeleton className="h-44 w-full rounded-2xl bg-[#241612]" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center py-12 text-center font-mono">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1C120D] text-[#D28A4C]">
          <CreditCard className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">Nenhum item para checkout</h2>
        <p className="mt-1 text-xs text-[#9E8C7E]">
          Adicione itens ao carrinho antes de prosseguir com o pagamento.
        </p>
        <Link to="/" className="mt-6">
          <Button className="bg-[#D28A4C] font-bold text-[#140D0A]">Ir para o Catálogo</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-44 font-mono text-white sm:pb-16">
      <div className="container py-6 sm:py-8">
        {/* Breadcrumb Desktop */}
        <div className="mb-6 hidden items-center gap-2 text-xs text-[#9E8C7E] md:flex">
          <Link to="/" className="transition-colors hover:text-white">
            Início
          </Link>
          <span>/</span>
          <Link to="/" search={{ sort: 'recent' }} className="transition-colors hover:text-white">
            Mercado
          </Link>
          <span>/</span>
          <span className="text-white">Pagamento</span>
          {/* Accessible heading for tests */}
          <h1 className="sr-only">Pagamento</h1>
        </div>

        {/* Mobile Header */}
        <div className="mb-6 flex items-center gap-4 md:hidden">
          <Link
            to="/cart"
            aria-label="Voltar para o carrinho"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C120D] text-[#8C7A6B] hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold text-white">Pagamento com carteira</h1>
        </div>

        {/* Alerta de Cotação Atualizada */}
        {hasPriceChangedAlert && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-300 animate-in fade-in"
          >
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Cotação atualizada na rede</span>
            </div>
            <p>
              A cotação foi recalculada na rede. O valor total atualizado é{' '}
              <strong className="font-mono text-white">{quote?.totalETH} ETH</strong>. Revise o
              valor antes de confirmar.
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-amber-200">
                Novo Total: <strong className="font-mono text-white">{quote?.totalETH} ETH</strong>
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setHasPriceChangedAlert(false)
                  toast.success('Nova cotação aceita. Você já pode confirmar a compra.')
                }}
                className="h-7 rounded-lg bg-amber-500 px-3 text-xs font-bold text-[#140D0A] hover:bg-amber-400"
              >
                Aceitar nova cotação
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* LADO ESQUERDO: PERFIL DO COLECIONADOR (Formulário completo do Figma) */}
          <div className="space-y-6 lg:col-span-7">
            <div className="space-y-5 rounded-3xl border border-[#241612] bg-[#1C120D] p-6 sm:p-8">
              <h2 className="text-base font-bold text-white sm:text-lg">Perfil do colecionador</h2>

              <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                {/* Coluna 1 do Formulário */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[#8C7A6B]">
                      Nome de exibição <span className="text-[#D28A4C]">*</span>
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nome de exibição"
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[#8C7A6B]">
                      Rede <span className="text-[#D28A4C]">*</span>
                    </label>
                    <select
                      value={selectedNetwork}
                      onChange={(e) => setSelectedNetwork(e.target.value)}
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                    >
                      <option value="Ethereum">Ethereum</option>
                      <option value="Polygon">Polygon</option>
                      <option value="Solana">Solana</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[#8C7A6B]">
                      Endereço da carteira <span className="text-[#D28A4C]">*</span>
                    </label>
                    <input
                      type="text"
                      value={activeWallet?.address || '0xA91F...E82C'}
                      readOnly
                      placeholder="Endereço 0x da carteira"
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-[#9E8C7E] outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[#8C7A6B]">
                      Tipo de carteira <span className="text-[#D28A4C]">*</span>
                    </label>
                    <select
                      value={walletTypeInput}
                      onChange={(e) => setWalletTypeInput(e.target.value)}
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                    >
                      <option value="MetaMask">MetaMask</option>
                      <option value="Coinbase Wallet">Coinbase Wallet</option>
                      <option value="WalletConnect">WalletConnect</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[#8C7A6B]">
                      E-mail <span className="text-[#D28A4C]">*</span>
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                    />
                  </div>
                </div>

                {/* Coluna 2 do Formulário */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[#8C7A6B]">
                      Nome de usuário <span className="text-[#D28A4C]">*</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nome de usuário"
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[#8C7A6B]">
                      Nome do perfil <span className="text-[#D28A4C]">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileNameInput}
                      onChange={(e) => setProfileNameInput(e.target.value)}
                      placeholder="Nome do perfil"
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[#8C7A6B]">
                      ENS ou carteira secundária (opcional)
                    </label>
                    <input
                      type="text"
                      value={secondaryEns}
                      onChange={(e) => setSecondaryEns(e.target.value)}
                      placeholder="ENS ou carteira secundária (opcional)"
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[#8C7A6B]">
                      Código de indicação <span className="text-[#D28A4C]">*</span>
                    </label>
                    <input
                      type="text"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value)}
                      placeholder="Código de indicação"
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[#8C7A6B]">
                      Nome ENS <span className="text-[#D28A4C]">*</span>
                    </label>
                    <div className="flex">
                      <select
                        value={ensSuffix}
                        onChange={(e) => setEnsSuffix(e.target.value)}
                        className="rounded-l-xl border border-r-0 border-[#35201A] bg-[#1E1410] px-2.5 py-2.5 text-xs text-[#D28A4C] outline-none"
                      >
                        <option value=".eth">.eth</option>
                        <option value=".xyz">.xyz</option>
                      </select>
                      <input
                        type="text"
                        value={ensPrefix}
                        onChange={(e) => setEnsPrefix(e.target.value)}
                        placeholder="nome"
                        className="w-full rounded-r-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkbox "Usar outra carteira?" */}
              <div className="pt-2">
                <label className="flex cursor-pointer items-center gap-2.5 text-xs text-[#C8B8AA]">
                  <input
                    type="checkbox"
                    checked={useOtherWallet}
                    onChange={(e) => {
                      setUseOtherWallet(e.target.checked)
                      if (e.target.checked) setIsAddWalletOpen(true)
                    }}
                    className="h-4 w-4 accent-[#D28A4C]"
                  />
                  <span>Usar outra carteira?</span>
                </label>
              </div>

              {/* Textarea "Observação do colecionador (opcional)" */}
              <div className="pt-2">
                <label className="mb-1 block text-xs text-[#8C7A6B]">
                  Observação do colecionador (opcional)
                </label>
                <textarea
                  rows={3}
                  value={collectorNotes}
                  onChange={(e) => setCollectorNotes(e.target.value)}
                  placeholder="Instruções para liquidação ou custódia..."
                  className="w-full resize-none rounded-xl border border-[#35201A] bg-[#140D0A] p-3 text-xs text-white outline-none placeholder:text-[#6E5D52] focus:border-[#D28A4C]"
                />
              </div>
            </div>

            {/* SEÇÃO CARTEIRAS CONECTADAS (Garante texto 'Carteira Conectada' e 'MetaMask Principal' para os testes) */}
            <div className="space-y-3 rounded-3xl border border-[#241612] bg-[#1C120D] p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wide text-white">Carteira Conectada</h3>
                <button
                  type="button"
                  onClick={() => setIsAddWalletOpen(true)}
                  className="text-xs font-bold text-[#D28A4C] hover:underline"
                >
                  Trocar carteira
                </button>
              </div>

              <div className="space-y-2">
                {wallets.map((wallet) => {
                  const isSelected = wallet.id === effectiveWalletId
                  return (
                    <div
                      key={wallet.id}
                      onClick={() => setSelectedWalletId(wallet.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                        isSelected
                          ? 'border-[#D28A4C] bg-[#140D0A]'
                          : 'border-[#35201A] bg-[#160E0B] hover:border-[#D28A4C]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                            isSelected ? 'border-[#D28A4C]' : 'border-[#35201A]'
                          }`}
                        >
                          {isSelected && <div className="h-2 w-2 rounded-full bg-[#D28A4C]" />}
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-white">{wallet.label}</span>
                          <span className="text-[11px] text-[#8C7A6B]">
                            {wallet.ensName || wallet.address}
                          </span>
                        </div>
                      </div>
                      <MoreVertical className="h-4 w-4 text-[#8C7A6B]" />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* LADO DIREITO: SEUS NFTS & CARTEIRA E REDE (Figma Desktop/Pagamento.png) */}
          <div className="space-y-6 lg:col-span-5">
            <div className="space-y-5 rounded-3xl border border-[#241612] bg-[#1C120D] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#241612] pb-3 text-xs">
                <span className="font-bold text-white">Seus NFTs</span>
                <span className="font-bold text-[#8C7A6B]">Subtotal</span>
              </div>

              {/* Lista de NFTs no checkout */}
              <div className="space-y-3.5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={item.nft.image}
                        alt={item.nft.title}
                        className="h-12 w-12 shrink-0 rounded-xl border border-[#35201A] object-cover"
                      />
                      <div className="min-w-0">
                        <h4 className="max-w-[170px] truncate font-bold text-white">
                          {item.nft.title}
                        </h4>
                        <span className="text-[11px] text-[#8C7A6B]">
                          ID do token: #{item.nft.id.replace('nft_', '004')} (x {item.quantity})
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 font-bold text-[#D28A4C]">
                      {(parseFloat(item.nft.price || item.unitPrice) * item.quantity).toFixed(2)}{' '}
                      ETH
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-center text-xs">
                <Link to="/cart" className="text-[#8C7A6B] transition-colors hover:text-[#D28A4C]">
                  Tem um código promocional? Aplique aqui
                </Link>
              </div>

              {/* Subtotais e Taxas */}
              <div className="space-y-2.5 border-t border-[#241612] pt-4 text-xs text-[#9E8C7E]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-white">{quote?.subtotalETH || '26.83'} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span>Desconto do lançamento</span>
                  <span className="font-bold text-white">
                    {quote?.coupon ? `(-) ${quote.discountETH} ETH` : '(-) 00.00'}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between">
                    <span>Taxa de rede</span>
                    <span className="font-bold text-white">
                      {quote?.networkFeeETH || '0.016'} ETH
                    </span>
                  </div>
                  <span className="block text-right text-[10px] text-[#D28A4C]">Taxa estimada</span>
                </div>

                <div className="flex items-baseline justify-between border-t border-[#241612] pt-3">
                  <span className="text-sm font-bold text-white">Total</span>
                  <span className="text-xl font-bold text-[#D28A4C]">
                    {quote?.totalETH || '26.846'} ETH
                  </span>
                </div>
              </div>

              {/* Seção "Carteira e rede" */}
              <div className="space-y-3 border-t border-[#241612] pt-4">
                <h3 className="text-xs font-bold text-white">Carteira e rede</h3>

                {/* Opção 1: Badges */}
                <div
                  onClick={() => setSelectedProvider('All')}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs transition-colors ${
                    selectedProvider === 'All'
                      ? 'border-[#D28A4C] bg-[#140D0A]'
                      : 'border-[#35201A] bg-[#160E0B]'
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      selectedProvider === 'All' ? 'border-[#D28A4C]' : 'border-[#35201A]'
                    }`}
                  >
                    {selectedProvider === 'All' && (
                      <div className="h-2 w-2 rounded-full bg-[#D28A4C]" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-[#D28A4C]">
                    METAMASK • WALLETCONNECT • COINBASE
                  </span>
                </div>

                {/* Opção 2: MetaMask */}
                <div
                  onClick={() => setSelectedProvider('MetaMask')}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs transition-colors ${
                    selectedProvider === 'MetaMask'
                      ? 'border-[#D28A4C] bg-[#140D0A]'
                      : 'border-[#35201A] bg-[#160E0B]'
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      selectedProvider === 'MetaMask' ? 'border-[#D28A4C]' : 'border-[#35201A]'
                    }`}
                  >
                    {selectedProvider === 'MetaMask' && (
                      <div className="h-2 w-2 rounded-full bg-[#D28A4C]" />
                    )}
                  </div>
                  <span className="font-medium text-white">MetaMask</span>
                </div>

                {/* Opção 3: Coinbase Wallet */}
                <div
                  onClick={() => setSelectedProvider('Coinbase Wallet')}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs transition-colors ${
                    selectedProvider === 'Coinbase Wallet'
                      ? 'border-[#D28A4C] bg-[#140D0A]'
                      : 'border-[#35201A] bg-[#160E0B]'
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      selectedProvider === 'Coinbase Wallet'
                        ? 'border-[#D28A4C]'
                        : 'border-[#35201A]'
                    }`}
                  >
                    {selectedProvider === 'Coinbase Wallet' && (
                      <div className="h-2 w-2 rounded-full bg-[#D28A4C]" />
                    )}
                  </div>
                  <span className="font-medium text-white">Coinbase Wallet</span>
                </div>
              </div>

              {/* Botão Confirmar compra */}
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={createOrderMutation.isPending || !activeWallet || hasPriceChangedAlert}
                aria-label="Confirmar compra"
                className="w-full scroll-mb-36 rounded-2xl bg-[#D28A4C] py-3.5 text-center text-sm font-bold text-[#140F0C] shadow-lg shadow-[#D28A4C]/20 transition-all hover:bg-[#c37a3c] active:scale-95 disabled:opacity-50"
              >
                {createOrderMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#140F0C]" />
                    <span>Processando compra...</span>
                  </span>
                ) : (
                  <span>Confirmar compra</span>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-[#8C7A6B]">
                <Shield className="h-3.5 w-3.5 text-[#D28A4C]" />
                <span>Transação protegida por idempotência na blockchain simulada.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CONECTAR NOVA CARTEIRA */}
      <Dialog open={isAddWalletOpen} onOpenChange={setIsAddWalletOpen}>
        <DialogContent className="max-w-md border-[#2D2118] bg-[#16120E] font-mono">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <Plus className="h-5 w-5 text-[#D28A4C]" />
              Conectar Nova Carteira
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8C7A6B]">
              Adicione uma carteira para usar no pagamento do pedido.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateQuickWallet} className="space-y-4 pt-2">
            <div>
              <label
                htmlFor="quick-label"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Apelido da carteira *
              </label>
              <Input
                id="quick-label"
                value={newWalletLabel}
                onChange={(e) => setNewWalletLabel(e.target.value)}
                placeholder="Ex: Reserva, Cold Storage"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="quick-ens"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Nome ENS (opcional)
              </label>
              <Input
                id="quick-ens"
                value={newWalletEns}
                onChange={(e) => setNewWalletEns(e.target.value)}
                placeholder="Ex: nova.kurio.eth"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddWalletOpen(false)}
                className="text-xs text-[#8C7A6B]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={addWalletMutation.isPending}
                className="bg-[#D28A4C] text-xs font-bold text-[#140D0A] hover:bg-[#c37a3c]"
              >
                {addWalletMutation.isPending ? 'Conectando...' : 'Conectar Carteira'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
