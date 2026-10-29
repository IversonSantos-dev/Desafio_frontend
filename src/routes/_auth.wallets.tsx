import { createFileRoute, Link } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Clock,
  Download,
  Edit2,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  Tag,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import {
  CreateWalletInputSchema,
  type CreateWalletInput,
  type Wallet,
} from '@/contracts'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useAddWallet, useUpdateWallet, useWallets } from '@/features/wallets/hooks/useWallets'

export const Route = createFileRoute('/_auth/wallets')({
  component: WalletsComponent,
})

function WalletsComponent() {
  const { user, logout } = useAuth()
  const { data: wallets = [], refetch } = useWallets()
  const addWalletMutation = useAddWallet()
  const updateWalletMutation = useUpdateWallet()

  const primaryWallet = wallets.find((w) => w.type === 'primary') || wallets[0]
  const secondaryWallet = wallets.find((w) => w.type === 'secondary')

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [isSameAsPrimary, setIsSameAsPrimary] = useState(false)

  // Form states matching Desktop Figma Carteiras.png
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [walletNetwork, setWalletNetwork] = useState<'Ethereum' | 'Polygon'>('Ethereum')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletType, setWalletType] = useState('MetaMask')
  const [walletEmail, setWalletEmail] = useState(user?.email || '')
  const [walletLabel, setWalletLabel] = useState('')
  const [profileName, setProfileName] = useState(user?.name || '')
  const [secondaryEns, setSecondaryEns] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [ensSuffix, setEnsSuffix] = useState('.eth')
  const [ensPrefix, setEnsPrefix] = useState('')

  // Sincroniza dados da carteira principal quando carregados
  const [syncedWalletId, setSyncedWalletId] = useState<string | null>(null)
  if (primaryWallet && syncedWalletId !== primaryWallet.id) {
    setSyncedWalletId(primaryWallet.id)
    setWalletLabel(primaryWallet.label || 'Carteira Principal')
    setWalletAddress(primaryWallet.address || '')
    setWalletNetwork(primaryWallet.network || 'Ethereum')
    setProfileName(primaryWallet.profileName || user?.name || '')
    setWalletEmail(primaryWallet.email || user?.email || '')
    if (primaryWallet.ensName) {
      if (primaryWallet.ensName.endsWith('.xyz')) {
        setEnsSuffix('.xyz')
        setEnsPrefix(primaryWallet.ensName.replace(/\.xyz$/, ''))
      } else {
        setEnsSuffix('.eth')
        setEnsPrefix(primaryWallet.ensName.replace(/\.eth$/, ''))
      }
    }
    setReferralCode(primaryWallet.referralCode || '')
  }

  // Formulário de adição de carteira
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    setValue: setValueAdd,
    reset: resetAdd,
    formState: { errors: addErrors, isSubmitting: isAdding },
  } = useForm<CreateWalletInput>({
    resolver: zodResolver(CreateWalletInputSchema),
    defaultValues: {
      label: '',
      profileName: user?.name || '',
      referralCode: '',
      email: user?.email || '',
      ensName: '',
      address: '',
      network: 'Ethereum',
      type: 'secondary',
    },
  })

  // Formulário de edição de carteira existente
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    setValue: setValueEdit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditing },
  } = useForm<CreateWalletInput>({
    resolver: zodResolver(CreateWalletInputSchema),
    defaultValues: {
      label: '',
      profileName: '',
      referralCode: '',
      email: '',
      ensName: '',
      address: '',
      network: 'Ethereum',
      type: 'secondary',
    },
  })

  const openEditModal = (wallet: Wallet) => {
    setEditingWallet(wallet)
    setValueEdit('label', wallet.label)
    setValueEdit('profileName', wallet.profileName)
    setValueEdit('email', wallet.email)
    setValueEdit('address', wallet.address)
    setValueEdit('network', wallet.network)
    setValueEdit('ensName', wallet.ensName || '')
    setValueEdit('referralCode', wallet.referralCode || '')
    setValueEdit('type', wallet.type)
  }

  const onSubmitMainWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletLabel.trim()) {
      toast.error('Informe um apelido para a carteira.')
      return
    }
    const finalAddress =
      walletAddress.trim() ||
      `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`

    try {
      if (primaryWallet) {
        await updateWalletMutation.mutateAsync({
          walletId: primaryWallet.id,
          label: walletLabel.trim(),
          profileName: profileName.trim() || user?.name || 'Colecionador',
          email: walletEmail.trim() || user?.email || 'colecionador@nftmarket.dev',
          ensName: ensPrefix.trim() ? `${ensPrefix.trim()}${ensSuffix}` : undefined,
          referralCode: referralCode.trim() || undefined,
          address: finalAddress,
          network: walletNetwork,
          type: 'primary',
        })
        toast.success('Carteira principal atualizada com sucesso!')
      } else {
        await addWalletMutation.mutateAsync({
          label: walletLabel.trim(),
          profileName: profileName.trim() || user?.name || 'Colecionador',
          email: walletEmail.trim() || user?.email || 'colecionador@nftmarket.dev',
          ensName: ensPrefix.trim() ? `${ensPrefix.trim()}${ensSuffix}` : undefined,
          referralCode: referralCode.trim() || undefined,
          address: finalAddress,
          network: walletNetwork,
          type: 'primary',
        })
        toast.success('Carteira principal salva com sucesso!')
      }
      void refetch()
    } catch {
      // toast tratado na mutation
    }
  }

  const handleToggleSameAsPrimary = async () => {
    const nextVal = !isSameAsPrimary
    setIsSameAsPrimary(nextVal)

    if (nextVal && primaryWallet) {
      try {
        if (secondaryWallet) {
          await updateWalletMutation.mutateAsync({
            walletId: secondaryWallet.id,
            label: `${primaryWallet.label} (Cópia Secundária)`,
            address: primaryWallet.address,
            network: primaryWallet.network,
            profileName: primaryWallet.profileName,
            email: primaryWallet.email,
            ensName: primaryWallet.ensName,
            referralCode: primaryWallet.referralCode,
            type: 'secondary',
          })
          toast.success('Carteira secundária sincronizada com a principal!')
        } else {
          await addWalletMutation.mutateAsync({
            label: `${primaryWallet.label} (Cópia Secundária)`,
            address: primaryWallet.address,
            network: primaryWallet.network,
            profileName: primaryWallet.profileName,
            email: primaryWallet.email,
            ensName: primaryWallet.ensName,
            referralCode: primaryWallet.referralCode,
            type: 'secondary',
          })
          toast.success('Carteira secundária criada idêntica à principal!')
        }
        void refetch()
      } catch {
        // toast tratado na mutation
      }
    }
  }

  const onSubmitAdd = async (data: CreateWalletInput) => {
    try {
      await addWalletMutation.mutateAsync(data)
      setIsAddDialogOpen(false)
      resetAdd()
      void refetch()
    } catch {
      // toast tratado na mutation
    }
  }

  const onSubmitEdit = async (data: CreateWalletInput) => {
    if (!editingWallet) return
    try {
      await updateWalletMutation.mutateAsync({
        walletId: editingWallet.id,
        ...data,
      })
      setEditingWallet(null)
      resetEdit()
      void refetch()
    } catch {
      // toast tratado na mutation
    }
  }

  const handleGenerateRandomAddress = () => {
    const randomHex = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
    setWalletAddress(randomHex)
    setValueAdd('address', randomHex, { shouldValidate: true })
    toast.info('Endereço simulado gerado!')
  }

  const handleDecorativeAction = (name: string) => {
    toast.info(`Demonstração: a seção "${name}" não faz parte do escopo do desafio.`)
  }

  return (
    <div className="pb-20 font-mono text-white">
      <div className="container py-8 sm:py-12">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-12">
          {/* SIDEBAR ESQUERDA: "Meu perfil" (Figma Desktop/Carteiras.png) */}
          <aside className="space-y-4 rounded-3xl border border-[#241612] bg-[#1C120D] p-5 md:col-span-3">
            <h2 className="px-3 py-1 text-sm font-bold text-white">Meu perfil</h2>
            <nav className="space-y-1 text-xs" aria-label="Navegação do perfil e carteiras">
              {/* 1. Dados do perfil */}
              <Link
                to="/profile"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
              >
                <User className="h-4 w-4" />
                <span>Dados do perfil</span>
              </Link>

              {/* 2. Carteiras (Ativo com borda laranja à esquerda) */}
              <Link
                to="/wallets"
                className="flex items-center gap-3 rounded-xl border-l-2 border-[#D28A4C] bg-[#241612] px-3 py-2.5 font-bold text-[#D28A4C]"
              >
                <MapPin className="h-4 w-4" />
                <span>Carteiras</span>
              </Link>

              {/* 3. Atividade (Informativo / Fora de escopo) */}
              <button
                type="button"
                onClick={() => handleDecorativeAction('Atividade')}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4" />
                  <span>Atividade</span>
                </div>
                <span className="rounded bg-[#241612] px-1.5 py-0.5 text-[9px] text-[#8C7A6B]">
                  Demo
                </span>
              </button>

              {/* 4. Lista de interesse */}
              <Link
                to="/favorites"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
              >
                <Heart className="h-4 w-4" />
                <span>Lista de interesse</span>
              </Link>

              {/* 5. Ofertas */}
              <button
                type="button"
                onClick={() => handleDecorativeAction('Ofertas')}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4" />
                  <span>Ofertas</span>
                </div>
                <span className="rounded bg-[#241612] px-1.5 py-0.5 text-[9px] text-[#8C7A6B]">
                  Demo
                </span>
              </button>

              {/* 6. Arquivos baixados */}
              <button
                type="button"
                onClick={() => handleDecorativeAction('Arquivos baixados')}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <Download className="h-4 w-4" />
                  <span>Arquivos baixados</span>
                </div>
                <span className="rounded bg-[#241612] px-1.5 py-0.5 text-[9px] text-[#8C7A6B]">
                  Demo
                </span>
              </button>

              {/* 7. Suporte */}
              <button
                type="button"
                onClick={() => handleDecorativeAction('Suporte')}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-4 w-4" />
                  <span>Suporte</span>
                </div>
                <span className="rounded bg-[#241612] px-1.5 py-0.5 text-[9px] text-[#8C7A6B]">
                  Demo
                </span>
              </button>

              {/* 8. Sair */}
              <button
                type="button"
                onClick={() => void logout()}
                aria-label="Sair da conta"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[#9E8C7E] transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </nav>
          </aside>

          {/* LADO DIREITO: CARTEIRAS (Figma Desktop/Carteiras.png) */}
          <main className="space-y-8 md:col-span-9">
            {/* CARTEIRA PRINCIPAL CONTAINER */}
            <div className="space-y-6 rounded-3xl border border-[#241612] bg-[#1C120D] p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-[#241612] pb-4">
                <div>
                  <h1 className="text-lg font-bold text-white">Carteira principal</h1>
                  <p className="mt-1 text-xs text-[#9E8C7E]">
                    Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDialogOpen(true)}
                  className="text-xs font-bold text-[#D28A4C] hover:underline"
                >
                  Adicionar nova
                </button>
              </div>

              {/* Formulário da Carteira Principal (Figma) */}
              <form onSubmit={onSubmitMainWallet} className="space-y-6">
                <div className="grid grid-cols-1 gap-5 text-xs sm:grid-cols-2">
                  {/* Coluna 1 */}
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label htmlFor="wallet-display-name" className="text-[#8C7A6B]">
                          Nome de exibição <span className="text-[#D28A4C]">*</span>
                        </label>
                        <span className="text-[10px] text-[#8C7A6B]">(Informativo perfil)</span>
                      </div>
                      <input
                        id="wallet-display-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Nome de exibição"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>

                    <div>
                      <label htmlFor="wallet-network" className="mb-1 block text-[#8C7A6B]">
                        Rede <span className="text-[#D28A4C]">*</span>
                      </label>
                      <select
                        id="wallet-network"
                        value={walletNetwork}
                        onChange={(e) =>
                          setWalletNetwork(e.target.value as 'Ethereum' | 'Polygon')
                        }
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      >
                        <option value="Ethereum">Ethereum Mainnet</option>
                        <option value="Polygon">Polygon POS</option>
                      </select>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label htmlFor="wallet-address" className="text-[#8C7A6B]">
                          Endereço da carteira <span className="text-[#D28A4C]">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateRandomAddress}
                          className="text-[10px] text-[#D28A4C] hover:underline"
                        >
                          Gerar simulado
                        </button>
                      </div>
                      <input
                        id="wallet-address"
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="Endereço 0x da carteira"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label htmlFor="wallet-type" className="text-[#8C7A6B]">
                          Tipo de carteira <span className="text-[#D28A4C]">*</span>
                        </label>
                        <span className="text-[10px] text-[#8C7A6B]">(Provedor Web3)</span>
                      </div>
                      <select
                        id="wallet-type"
                        value={walletType}
                        onChange={(e) => setWalletType(e.target.value)}
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      >
                        <option value="MetaMask">MetaMask</option>
                        <option value="Coinbase Wallet">Coinbase Wallet</option>
                        <option value="WalletConnect">WalletConnect</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="wallet-email" className="mb-1 block text-[#8C7A6B]">
                        E-mail vinculado <span className="text-[#D28A4C]">*</span>
                      </label>
                      <input
                        id="wallet-email"
                        type="email"
                        value={walletEmail}
                        onChange={(e) => setWalletEmail(e.target.value)}
                        placeholder="E-mail"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>
                  </div>

                  {/* Coluna 2 */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="wallet-label" className="mb-1 block text-[#8C7A6B]">
                        Apelido da carteira <span className="text-[#D28A4C]">*</span>
                      </label>
                      <input
                        id="wallet-label"
                        type="text"
                        value={walletLabel}
                        onChange={(e) => setWalletLabel(e.target.value)}
                        placeholder="Apelido da carteira"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>

                    <div>
                      <label htmlFor="profile-name" className="mb-1 block text-[#8C7A6B]">
                        Nome do perfil <span className="text-[#D28A4C]">*</span>
                      </label>
                      <input
                        id="profile-name"
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Nome do perfil"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>

                    <div>
                      <label htmlFor="secondary-ens" className="mb-1 block text-[#8C7A6B]">
                        ENS ou carteira secundária (opcional)
                      </label>
                      <input
                        id="secondary-ens"
                        type="text"
                        value={secondaryEns}
                        onChange={(e) => setSecondaryEns(e.target.value)}
                        placeholder="ENS ou carteira secundária (opcional)"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>

                    <div>
                      <label htmlFor="referral-code" className="mb-1 block text-[#8C7A6B]">
                        Código de indicação <span className="text-[#D28A4C]">*</span>
                      </label>
                      <input
                        id="referral-code"
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        placeholder="Código de indicação"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>

                    <div>
                      <label htmlFor="ens-prefix" className="mb-1 block text-[#8C7A6B]">
                        Nome ENS <span className="text-[#D28A4C]">*</span>
                      </label>
                      <div className="flex">
                        <select
                          id="ens-suffix"
                          aria-label="Sufixo ENS"
                          value={ensSuffix}
                          onChange={(e) => setEnsSuffix(e.target.value)}
                          className="rounded-l-xl border border-r-0 border-[#35201A] bg-[#1E1410] px-2.5 py-2.5 text-xs text-[#D28A4C] outline-none"
                        >
                          <option value=".eth">.eth</option>
                          <option value=".xyz">.xyz</option>
                        </select>
                        <input
                          id="ens-prefix"
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

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updateWalletMutation.isPending || addWalletMutation.isPending}
                    className="rounded-xl bg-[#D28A4C] px-6 py-2.5 text-xs font-bold text-[#140F0C] shadow-md transition-all hover:bg-[#c37a3c]"
                  >
                    {updateWalletMutation.isPending || addWalletMutation.isPending
                      ? 'Salvando...'
                      : 'Salvar carteira'}
                  </button>
                </div>
              </form>
            </div>

            {/* SEÇÃO CARTEIRA SECUNDÁRIA (Figma Desktop/Carteiras.png) */}
            <div className="space-y-4 rounded-3xl border border-[#241612] bg-[#1C120D] p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-base font-bold text-white">Carteira secundária</h2>
                <div className="flex items-center gap-4 text-xs">
                  <label htmlFor="same-as-primary" className="flex cursor-pointer items-center gap-2 text-[#8C7A6B]">
                    <input
                      id="same-as-primary"
                      type="checkbox"
                      checked={isSameAsPrimary}
                      onChange={handleToggleSameAsPrimary}
                      className="h-4 w-4 rounded accent-[#D28A4C]"
                    />
                    <span>Igual à carteira principal</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddDialogOpen(true)}
                    className="font-bold text-[#D28A4C] hover:underline"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
              {secondaryWallet ? (
                <div className="rounded-xl border border-[#35201A] bg-[#140D0A] p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">{secondaryWallet.label}</span>
                      <span className="block text-[11px] text-[#8C7A6B]">
                        {secondaryWallet.address} ({secondaryWallet.network})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#D28A4C]">
                        {secondaryWallet.balanceETH} ETH
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditModal(secondaryWallet)}
                        aria-label={`Editar carteira ${secondaryWallet.label}`}
                        className="rounded-lg border border-[#35201A] p-1.5 text-[#9E8C7E] hover:border-[#D28A4C] hover:text-white"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#8C7A6B]">
                  Você ainda não adicionou uma carteira secundária.
                </p>
              )}
            </div>

            {/* Lista com carteiras cadastradas e edição ativa */}
            {wallets.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white">Carteiras cadastradas</h3>
                  <span className="text-[11px] text-[#8C7A6B]">
                    {wallets.length} {wallets.length === 1 ? 'carteira' : 'carteiras'}
                  </span>
                </div>
                <div className="space-y-2">
                  {wallets.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between rounded-xl border border-[#35201A] bg-[#140D0A] p-3 text-xs transition-colors hover:border-[#D28A4C]/50"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{w.label}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                              w.type === 'primary'
                                ? 'bg-[#D28A4C]/20 text-[#D28A4C]'
                                : 'bg-[#241612] text-[#8C7A6B]'
                            }`}
                          >
                            {w.type === 'primary' ? 'Principal' : 'Secundária'}
                          </span>
                        </div>
                        <span className="block text-[11px] text-[#8C7A6B]">
                          {w.address} • {w.network}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#D28A4C]">{w.balanceETH} ETH</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(w)}
                          aria-label={`Editar carteira ${w.label}`}
                          className="h-8 border border-[#35201A] text-xs text-[#9E8C7E] hover:border-[#D28A4C] hover:text-white"
                        >
                          <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL ADICIONAR NOVA CARTEIRA */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md border-[#2D2118] bg-[#16120E] font-mono">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              Cadastrar Nova Carteira Web3
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8C7A6B]">
              Preencha os dados completos da carteira do colecionador.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd(onSubmitAdd)} className="space-y-3 pt-2">
            <div>
              <label
                htmlFor="modal-add-wallet-label"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Apelido da carteira *
              </label>
              <Input
                id="modal-add-wallet-label"
                aria-invalid={!!addErrors.label}
                aria-describedby={addErrors.label ? 'add-wallet-label-error' : undefined}
                placeholder="Ex: Reserva, Cold Storage"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerAdd('label')}
              />
              {addErrors.label && (
                <span
                  id="add-wallet-label-error"
                  role="alert"
                  className="mt-1 block text-[11px] text-destructive"
                >
                  {addErrors.label.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="modal-add-wallet-profile"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Nome do perfil *
              </label>
              <Input
                id="modal-add-wallet-profile"
                aria-invalid={!!addErrors.profileName}
                aria-describedby={addErrors.profileName ? 'add-wallet-profile-error' : undefined}
                placeholder="Seu nome público"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerAdd('profileName')}
              />
              {addErrors.profileName && (
                <span
                  id="add-wallet-profile-error"
                  role="alert"
                  className="mt-1 block text-[11px] text-destructive"
                >
                  {addErrors.profileName.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="modal-add-wallet-email"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                E-mail vinculado *
              </label>
              <Input
                id="modal-add-wallet-email"
                type="email"
                aria-invalid={!!addErrors.email}
                aria-describedby={addErrors.email ? 'add-wallet-email-error' : undefined}
                placeholder="contato@carteira.dev"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerAdd('email')}
              />
              {addErrors.email && (
                <span
                  id="add-wallet-email-error"
                  role="alert"
                  className="mt-1 block text-[11px] text-destructive"
                >
                  {addErrors.email.message}
                </span>
              )}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="modal-add-wallet-address"
                  className="text-xs font-semibold text-[#8C7A6B]"
                >
                  Endereço público (0x...) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const randomHex = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
                    setValueAdd('address', randomHex, { shouldValidate: true })
                  }}
                  className="text-[10px] text-[#D28A4C] hover:underline"
                >
                  Gerar Aleatório
                </button>
              </div>
              <Input
                id="modal-add-wallet-address"
                aria-invalid={!!addErrors.address}
                aria-describedby={addErrors.address ? 'add-wallet-address-error' : undefined}
                placeholder="0x..."
                className="border-[#2D2118] bg-[#120F0D] font-mono text-xs"
                {...registerAdd('address')}
              />
              {addErrors.address && (
                <span
                  id="add-wallet-address-error"
                  role="alert"
                  className="mt-1 block text-[11px] text-destructive"
                >
                  {addErrors.address.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="modal-add-wallet-network"
                  className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
                >
                  Rede
                </label>
                <select
                  id="modal-add-wallet-network"
                  {...registerAdd('network')}
                  className="w-full rounded-md border border-[#2D2118] bg-[#120F0D] px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="Ethereum">Ethereum</option>
                  <option value="Polygon">Polygon</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="modal-add-wallet-type"
                  className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
                >
                  Tipo
                </label>
                <select
                  id="modal-add-wallet-type"
                  {...registerAdd('type')}
                  className="w-full rounded-md border border-[#2D2118] bg-[#120F0D] px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="secondary">Secundária</option>
                  <option value="primary">Principal</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isAdding}
                className="w-full bg-[#D28A4C] text-xs font-bold text-[#140D0A] hover:bg-[#c37a3c]"
              >
                {isAdding ? 'Cadastrando...' : 'Cadastrar Carteira'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR CARTEIRA EXISTENTE */}
      <Dialog open={!!editingWallet} onOpenChange={(open) => !open && setEditingWallet(null)}>
        <DialogContent className="max-w-md border-[#2D2118] bg-[#16120E] font-mono">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              Editar Dados da Carteira
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8C7A6B]">
              Atualize as informações e preferências da carteira cadastrada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="space-y-3 pt-2">
            <div>
              <label
                htmlFor="modal-edit-wallet-label"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Apelido da carteira *
              </label>
              <Input
                id="modal-edit-wallet-label"
                aria-invalid={!!editErrors.label}
                aria-describedby={editErrors.label ? 'edit-wallet-label-error' : undefined}
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerEdit('label')}
              />
              {editErrors.label && (
                <span
                  id="edit-wallet-label-error"
                  role="alert"
                  className="mt-1 block text-[11px] text-destructive"
                >
                  {editErrors.label.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="modal-edit-wallet-profile"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Nome do perfil *
              </label>
              <Input
                id="modal-edit-wallet-profile"
                aria-invalid={!!editErrors.profileName}
                aria-describedby={editErrors.profileName ? 'edit-wallet-profile-error' : undefined}
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerEdit('profileName')}
              />
              {editErrors.profileName && (
                <span
                  id="edit-wallet-profile-error"
                  role="alert"
                  className="mt-1 block text-[11px] text-destructive"
                >
                  {editErrors.profileName.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="modal-edit-wallet-email"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                E-mail vinculado *
              </label>
              <Input
                id="modal-edit-wallet-email"
                type="email"
                aria-invalid={!!editErrors.email}
                aria-describedby={editErrors.email ? 'edit-wallet-email-error' : undefined}
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerEdit('email')}
              />
              {editErrors.email && (
                <span
                  id="edit-wallet-email-error"
                  role="alert"
                  className="mt-1 block text-[11px] text-destructive"
                >
                  {editErrors.email.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="modal-edit-wallet-address"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Endereço público (0x...) *
              </label>
              <Input
                id="modal-edit-wallet-address"
                aria-invalid={!!editErrors.address}
                aria-describedby={editErrors.address ? 'edit-wallet-address-error' : undefined}
                className="border-[#2D2118] bg-[#120F0D] font-mono text-xs"
                {...registerEdit('address')}
              />
              {editErrors.address && (
                <span
                  id="edit-wallet-address-error"
                  role="alert"
                  className="mt-1 block text-[11px] text-destructive"
                >
                  {editErrors.address.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="modal-edit-wallet-network"
                  className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
                >
                  Rede
                </label>
                <select
                  id="modal-edit-wallet-network"
                  {...registerEdit('network')}
                  className="w-full rounded-md border border-[#2D2118] bg-[#120F0D] px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="Ethereum">Ethereum</option>
                  <option value="Polygon">Polygon</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="modal-edit-wallet-type"
                  className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
                >
                  Tipo
                </label>
                <select
                  id="modal-edit-wallet-type"
                  {...registerEdit('type')}
                  className="w-full rounded-md border border-[#2D2118] bg-[#120F0D] px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="secondary">Secundária</option>
                  <option value="primary">Principal</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isEditing}
                className="w-full bg-[#D28A4C] text-xs font-bold text-[#140D0A] hover:bg-[#c37a3c]"
              >
                {isEditing ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
