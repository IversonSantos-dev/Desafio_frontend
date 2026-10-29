import { createFileRoute, Link } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Clock, Download, Heart, HelpCircle, LogOut, MapPin, Tag, User } from 'lucide-react'
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
import { CreateWalletInputSchema, type CreateWalletInput } from '@/contracts'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useAddWallet, useWallets } from '@/features/wallets/hooks/useWallets'

export const Route = createFileRoute('/_auth/wallets')({
  component: WalletsComponent,
})

function WalletsComponent() {
  const { user, logout } = useAuth()
  const { data: wallets = [], refetch } = useWallets()
  const addWalletMutation = useAddWallet()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Form states matching Desktop Figma Carteiras.png
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [walletNetwork, setWalletNetwork] = useState('Ethereum')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletType, setWalletType] = useState('MetaMask')
  const [walletEmail, setWalletEmail] = useState(user?.email || '')
  const [walletLabel, setWalletLabel] = useState('')
  const [profileName, setProfileName] = useState(user?.name || '')
  const [secondaryEns, setSecondaryEns] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [ensSuffix, setEnsSuffix] = useState('.eth')
  const [ensPrefix, setEnsPrefix] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
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
      type: 'primary',
    },
  })

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
      await addWalletMutation.mutateAsync({
        label: walletLabel.trim(),
        profileName: profileName.trim() || user?.name || 'Colecionador',
        email: walletEmail.trim() || user?.email || 'colecionador@nftmarket.dev',
        ensName: ensPrefix.trim() ? `${ensPrefix.trim()}${ensSuffix}` : undefined,
        referralCode: referralCode.trim() || undefined,
        address: finalAddress,
        network: walletNetwork === 'Polygon' ? 'Polygon' : 'Ethereum',
        type: 'primary',
      })
      toast.success('Carteira salva com sucesso!')
      void refetch()
    } catch {
      // toast tratado na mutation
    }
  }

  const onSubmitAdd = async (data: CreateWalletInput) => {
    try {
      await addWalletMutation.mutateAsync(data)
      setIsAddDialogOpen(false)
      reset()
      void refetch()
    } catch {
      // toast tratado na mutation
    }
  }

  const handleGenerateRandomAddress = () => {
    const randomHex = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
    setWalletAddress(randomHex)
    setValue('address', randomHex, { shouldValidate: true })
    toast.info('Endereço simulado gerado!')
  }

  return (
    <div className="pb-20 font-mono text-white">
      <div className="container py-8 sm:py-12">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-12">
          {/* SIDEBAR ESQUERDA: "Meu perfil" (Figma Desktop/Carteiras.png) */}
          <aside className="space-y-4 rounded-3xl border border-[#241612] bg-[#1C120D] p-5 md:col-span-3">
            <h2 className="px-3 py-1 text-sm font-bold text-white">Meu perfil</h2>
            <nav className="space-y-1 text-xs">
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

              {/* 3. Atividade */}
              <a
                href="#atividade"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
              >
                <Clock className="h-4 w-4" />
                <span>Atividade</span>
              </a>

              {/* 4. Lista de interesse */}
              <Link
                to="/favorites"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
              >
                <Heart className="h-4 w-4" />
                <span>Lista de interesse</span>
              </Link>

              {/* 5. Ofertas */}
              <a
                href="#ofertas"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
              >
                <Tag className="h-4 w-4" />
                <span>Ofertas</span>
              </a>

              {/* 6. Arquivos baixados */}
              <a
                href="#arquivos"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
              >
                <Download className="h-4 w-4" />
                <span>Arquivos baixados</span>
              </a>

              {/* 7. Suporte */}
              <a
                href="#suporte"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Suporte</span>
              </a>

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
                  Adicionar
                </button>
              </div>

              {/* Formulário da Carteira Principal (Figma) */}
              <form onSubmit={onSubmitMainWallet} className="space-y-6">
                <div className="grid grid-cols-1 gap-5 text-xs sm:grid-cols-2">
                  {/* Coluna 1 */}
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
                        value={walletNetwork}
                        onChange={(e) => setWalletNetwork(e.target.value)}
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      >
                        <option value="Ethereum">Selecione uma rede (Ethereum)</option>
                        <option value="Polygon">Polygon</option>
                      </select>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-[#8C7A6B]">
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
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="Endereço 0x da carteira"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[#8C7A6B]">
                        Tipo de carteira <span className="text-[#D28A4C]">*</span>
                      </label>
                      <select
                        value={walletType}
                        onChange={(e) => setWalletType(e.target.value)}
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      >
                        <option value="MetaMask">Selecione uma carteira (MetaMask)</option>
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
                      <label className="mb-1 block text-[#8C7A6B]">
                        Apelido da carteira <span className="text-[#D28A4C]">*</span>
                      </label>
                      <input
                        type="text"
                        value={walletLabel}
                        onChange={(e) => setWalletLabel(e.target.value)}
                        placeholder="Apelido da carteira"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[#8C7A6B]">
                        Nome do perfil <span className="text-[#D28A4C]">*</span>
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
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
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
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

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={addWalletMutation.isPending}
                    className="rounded-xl bg-[#D28A4C] px-6 py-2.5 text-xs font-bold text-[#140F0C] shadow-md transition-all hover:bg-[#c37a3c]"
                  >
                    {addWalletMutation.isPending ? 'Salvando...' : 'Salvar carteira'}
                  </button>
                </div>
              </form>
            </div>

            {/* SEÇÃO CARTEIRA SECUNDÁRIA (Figma Desktop/Carteiras.png) */}
            <div className="space-y-4 rounded-3xl border border-[#241612] bg-[#1C120D] p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Carteira secundária</h2>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex cursor-pointer items-center gap-2 text-[#8C7A6B]">
                    <input type="radio" name="sec-mode" className="accent-[#D28A4C]" />
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
              <p className="text-xs text-[#8C7A6B]">
                Você ainda não adicionou uma carteira secundária.
              </p>
            </div>

            {/* Lista com carteiras ativas */}
            {wallets.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-white">Carteiras cadastradas</h3>
                {wallets.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-xl border border-[#35201A] bg-[#140D0A] p-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{w.label}</span>
                      <span className="block text-[11px] text-[#8C7A6B]">{w.address}</span>
                    </div>
                    <span className="font-bold text-[#D28A4C]">{w.balanceETH} ETH</span>
                  </div>
                ))}
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

          <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-3 pt-2">
            <div>
              <label
                htmlFor="modal-wallet-label"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Apelido da carteira *
              </label>
              <Input
                id="modal-wallet-label"
                placeholder="Ex: Reserva, Cold Storage"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...register('label')}
              />
              {errors.label && (
                <span className="mt-1 block text-[11px] text-destructive">
                  {errors.label.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="modal-wallet-profile"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Nome do perfil *
              </label>
              <Input
                id="modal-wallet-profile"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...register('profileName')}
              />
            </div>

            <div>
              <label
                htmlFor="modal-wallet-email"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                E-mail *
              </label>
              <Input
                id="modal-wallet-email"
                type="email"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...register('email')}
              />
            </div>

            <div>
              <label
                htmlFor="modal-wallet-ens"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Nome ENS
              </label>
              <Input
                id="modal-wallet-ens"
                placeholder="Ex: satoshi.eth"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...register('ensName')}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="modal-wallet-address"
                  className="text-xs font-semibold text-[#8C7A6B]"
                >
                  Endereço 0x *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateRandomAddress}
                  className="text-[10px] text-[#D28A4C] hover:underline"
                >
                  Gerar simulado
                </button>
              </div>
              <Input
                id="modal-wallet-address"
                placeholder="0x..."
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...register('address')}
              />
              {errors.address && (
                <span className="mt-1 block text-[11px] text-destructive">
                  {errors.address.message}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddDialogOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#D28A4C] text-xs font-bold text-[#140D0A]"
              >
                Salvar Carteira
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
