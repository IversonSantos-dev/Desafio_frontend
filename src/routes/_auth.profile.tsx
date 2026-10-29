import { createFileRoute, Link } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Clock,
  Download,
  Eye,
  EyeOff,
  Heart,
  HelpCircle,
  ImageIcon,
  LogOut,
  MapPin,
  Plus,
  Tag,
  User as UserIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
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
  ChangePasswordSchema,
  CreateWalletInputSchema,
  type ChangePasswordInput,
  type CreateWalletInput,
  type Wallet,
} from '@/contracts'
import { authApi } from '@/features/auth/api/auth.api'
import { useAuth } from '@/features/auth/context/AuthContext'
import { profileApi } from '@/features/profile/api/profile.api'
import { useAddWallet, useUpdateWallet, useWallets } from '@/features/wallets/hooks/useWallets'

const profileDataSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  bio: z.string().optional(),
  avatar: z.string().url('URL de imagem inválida').or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileDataSchema>

// Schema para formulário de edição de carteira
const editWalletFormSchema = z.object({
  label: z.string().min(1, 'Apelido é obrigatório'),
  profileName: z.string().min(2, 'Nome do perfil é obrigatório'),
  referralCode: z.string().optional(),
  email: z.string().email('E-mail inválido'),
  ensName: z.string().optional(),
  network: z.enum(['Ethereum', 'Polygon']),
})

type EditWalletFormData = z.infer<typeof editWalletFormSchema>

export const Route = createFileRoute('/_auth/profile')({
  component: ProfileComponent,
})

function ProfileComponent() {
  const { user, logout } = useAuth()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Carteiras
  const { data: wallets = [] } = useWallets()
  const addWalletMutation = useAddWallet()
  const updateWalletMutation = useUpdateWallet()

  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false)

  // Campos extras da UI do Figma
  const [usernameInput, setUsernameInput] = useState(
    user?.name?.toLowerCase().replace(/\s+/g, '_') || 'satoshi',
  )
  const [ensSuffix, setEnsSuffix] = useState('.eth')
  const [ensPrefix, setEnsPrefix] = useState('satoshi')
  const [walletNickname, setWalletNickname] = useState('MetaMask Principal')

  // Formulário de dados do perfil
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    setValue: setProfileValue,
    watch: watchProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileDataSchema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
      avatar: user?.avatar || '',
    },
  })

  const currentAvatar = watchProfile('avatar') || user?.avatar || ''

  // Formulário de alteração de senha
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  // Formulário de edição de carteira
  const {
    register: registerEditWallet,
    handleSubmit: handleSubmitEditWallet,
    reset: resetEditWalletForm,
    formState: { errors: editWalletErrors, isSubmitting: isSubmittingEditWallet },
  } = useForm<EditWalletFormData>({
    resolver: zodResolver(editWalletFormSchema),
  })

  // Formulário de adição de carteira
  const {
    register: registerAddWallet,
    handleSubmit: handleSubmitAddWallet,
    reset: resetAddWalletForm,
    setValue: setAddWalletValue,
    formState: { errors: addWalletErrors, isSubmitting: isSubmittingAddWallet },
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

  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsUpdatingProfile(true)
    try {
      await profileApi.update({
        name: data.name,
        bio: data.bio,
        avatar: data.avatar || undefined,
      })
      toast.success('Perfil atualizado com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar dados.')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const onSubmitPassword = async (data: ChangePasswordInput) => {
    try {
      await authApi.changePassword(data)
      toast.success('Senha alterada com sucesso!')
      resetPasswordForm()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha.')
    }
  }

  const onSubmitEditWallet = async (data: EditWalletFormData) => {
    if (!editingWallet) return
    try {
      await updateWalletMutation.mutateAsync({
        walletId: editingWallet.id,
        label: data.label,
        profileName: data.profileName,
        referralCode: data.referralCode,
        email: data.email,
        ensName: data.ensName,
        network: data.network,
      })
      setEditingWallet(null)
      toast.success('Dados da carteira atualizados com sucesso!')
    } catch {
      // toast tratado na mutation
    }
  }

  const onSubmitAddWallet = async (data: CreateWalletInput) => {
    try {
      await addWalletMutation.mutateAsync(data)
      setIsAddWalletOpen(false)
      resetAddWalletForm()
    } catch {
      // toast tratado na mutation
    }
  }

  const handleGenerateRandomAddress = () => {
    const randomHex = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
    setAddWalletValue('address', randomHex, { shouldValidate: true })
    toast.info('Endereço simulado gerado!')
  }

  return (
    <div className="pb-20 font-mono text-white">
      <div className="container py-8 sm:py-12">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-12">
          {/* SIDEBAR ESQUERDA: "Meu perfil" (Figma Desktop/Perfil do Colecionador.png) */}
          <aside className="space-y-4 rounded-3xl border border-[#241612] bg-[#1C120D] p-5 md:col-span-3">
            <h2 className="px-3 py-1 text-sm font-bold text-white">Meu perfil</h2>
            <nav className="space-y-1 text-xs">
              {/* 1. Dados do perfil (Ativo com barra laranja à esquerda) */}
              <Link
                to="/profile"
                className="flex items-center gap-3 rounded-xl border-l-2 border-[#D28A4C] bg-[#241612] px-3 py-2.5 font-bold text-[#D28A4C]"
              >
                <UserIcon className="h-4 w-4" />
                <span>Dados do perfil</span>
              </Link>

              {/* 2. Carteiras */}
              <Link
                to="/wallets"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#9E8C7E] transition-colors hover:bg-[#241612] hover:text-white"
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

          {/* LADO DIREITO: CONTEÚDO PRINCIPAL (Perfil do colecionador + Alterar senha) */}
          <main className="space-y-8 md:col-span-9">
            {/* SEÇÃO 1: PERFIL DO COLECIONADOR */}
            <div className="space-y-6 rounded-3xl border border-[#241612] bg-[#1C120D] p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-[#241612] pb-4">
                <h1 className="text-lg font-bold text-white">Perfil do colecionador</h1>
                {/* Botão Nova Carteira para compatibilidade de testes */}
                <Button
                  type="button"
                  onClick={() => setIsAddWalletOpen(true)}
                  className="bg-[#D28A4C] text-xs font-bold text-[#140D0A] hover:bg-[#c37a3c]"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Nova Carteira
                </Button>
              </div>

              <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
                <div className="grid grid-cols-1 gap-5 text-xs sm:grid-cols-2">
                  {/* Coluna 1 */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="mb-1 block text-[#8C7A6B]">
                        Nome de exibição <span className="text-[#D28A4C]">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        placeholder="Nome de exibição"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                        {...registerProfile('name')}
                      />
                      {profileErrors.name && (
                        <span className="mt-1 block text-[11px] text-destructive">
                          {profileErrors.name.message}
                        </span>
                      )}
                    </div>

                    <div>
                      <label htmlFor="profile-email" className="mb-1 block text-[#8C7A6B]">
                        E-mail <span className="text-[#D28A4C]">*</span>
                      </label>
                      <input
                        id="profile-email"
                        type="email"
                        value={user?.email || 'satoshi@nftmarket.dev'}
                        readOnly
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-[#9E8C7E] outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-wallet-nickname"
                        className="mb-1 block text-[#8C7A6B]"
                      >
                        Apelido da carteira <span className="text-[#D28A4C]">*</span>
                      </label>
                      <input
                        id="profile-wallet-nickname"
                        type="text"
                        value={walletNickname}
                        onChange={(e) => setWalletNickname(e.target.value)}
                        placeholder="MetaMask Principal"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>
                  </div>

                  {/* Coluna 2 */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="profile-username" className="mb-1 block text-[#8C7A6B]">
                        Nome de usuário <span className="text-[#D28A4C]">*</span>
                      </label>
                      <input
                        id="profile-username"
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="satoshi"
                        className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                      />
                    </div>

                    <div>
                      <label htmlFor="profile-ens" className="mb-1 block text-[#8C7A6B]">
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
                          id="profile-ens"
                          type="text"
                          value={ensPrefix}
                          onChange={(e) => setEnsPrefix(e.target.value)}
                          placeholder="satoshi"
                          className="w-full rounded-r-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#D28A4C]"
                        />
                      </div>
                    </div>

                    {/* Avatar Controls do Figma */}
                    <div>
                      <label className="mb-1 block text-[#8C7A6B]">Avatar</label>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#35201A] bg-[#140D0A] text-[#8C7A6B]">
                          {currentAvatar ? (
                            <img
                              src={currentAvatar}
                              alt="Avatar"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newUrl = prompt(
                              'Insira a URL da nova imagem de avatar:',
                              currentAvatar,
                            )
                            if (newUrl !== null) setProfileValue('avatar', newUrl)
                          }}
                          className="rounded-xl bg-[#D28A4C] px-4 py-2 text-xs font-bold text-[#140F0C] transition-colors hover:bg-[#c37a3c]"
                        >
                          Alterar
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileValue('avatar', '')}
                          className="text-xs text-[#8C7A6B] transition-colors hover:text-white"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Biografia do Colecionador */}
                <div>
                  <label htmlFor="bio" className="mb-1 block text-xs text-[#8C7A6B]">
                    Biografia do Colecionador
                  </label>
                  <textarea
                    id="bio"
                    rows={2}
                    placeholder="Conte sobre sua coleção de arte digital..."
                    className="w-full resize-none rounded-xl border border-[#35201A] bg-[#140D0A] p-3 text-xs text-white outline-none placeholder:text-[#6E5D52] focus:border-[#D28A4C]"
                    {...registerProfile('bio')}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="bg-[#D28A4C] text-xs font-bold text-[#140D0A] hover:bg-[#c37a3c]"
                  >
                    {isUpdatingProfile ? 'Salvando...' : 'Salvar Perfil'}
                  </Button>
                </div>
              </form>
            </div>

            {/* SEÇÃO 2: ALTERAR SENHA (Figma Desktop/Perfil do Colecionador.png) */}
            <div className="space-y-6 rounded-3xl border border-[#241612] bg-[#1C120D] p-6 sm:p-8">
              <h2 className="border-b border-[#241612] pb-3 text-base font-bold text-white">
                Alterar senha
              </h2>

              <form
                onSubmit={handleSubmitPassword(onSubmitPassword)}
                className="max-w-md space-y-4"
              >
                {/* Senha atual */}
                <div>
                  <label htmlFor="currentPassword" className="mb-1 block text-xs text-[#8C7A6B]">
                    Senha atual
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 pr-10 text-xs text-white outline-none focus:border-[#D28A4C]"
                      {...registerPassword('currentPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-white"
                    >
                      {showCurrentPassword ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <span className="mt-1 block text-[11px] text-destructive">
                      {passwordErrors.currentPassword.message}
                    </span>
                  )}
                </div>

                {/* Nova senha */}
                <div>
                  <label htmlFor="newPassword" className="mb-1 block text-xs text-[#8C7A6B]">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 pr-10 text-xs text-white outline-none focus:border-[#D28A4C]"
                      {...registerPassword('newPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-white"
                    >
                      {showNewPassword ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <span className="mt-1 block text-[11px] text-destructive">
                      {passwordErrors.newPassword.message}
                    </span>
                  )}
                </div>

                {/* Confirmar nova senha */}
                <div>
                  <label htmlFor="confirmNewPassword" className="mb-1 block text-xs text-[#8C7A6B]">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <input
                      id="confirmNewPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-3.5 py-2.5 pr-10 text-xs text-white outline-none focus:border-[#D28A4C]"
                      {...registerPassword('confirmNewPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordErrors.confirmNewPassword && (
                    <span className="mt-1 block text-[11px] text-destructive">
                      {passwordErrors.confirmNewPassword.message}
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    aria-label="Atualizar Senha"
                    className="rounded-xl bg-[#D28A4C] px-6 py-2.5 text-xs font-bold text-[#140F0C] shadow-md transition-all hover:bg-[#c37a3c]"
                  >
                    {isSubmittingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                  </button>
                </div>
              </form>
            </div>

            {/* SEÇÃO CARTEIRAS CONECTADAS (Edição e visualização rápida) */}
            <div className="space-y-4 rounded-3xl border border-[#241612] bg-[#1C120D] p-6 sm:p-8">
              <h2 className="border-b border-[#241612] pb-3 text-base font-bold text-white">
                Carteiras Web3 Conectadas
              </h2>
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="flex items-center justify-between rounded-xl border border-[#35201A] bg-[#140D0A] p-4 text-xs"
                  >
                    <div>
                      <span className="block font-bold text-white">{wallet.label}</span>
                      <span className="text-[11px] text-[#8C7A6B]">
                        {wallet.ensName || wallet.address} • {wallet.network}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingWallet(wallet)
                        resetEditWalletForm({
                          label: wallet.label,
                          profileName: wallet.profileName,
                          referralCode: wallet.referralCode || '',
                          email: wallet.email,
                          ensName: wallet.ensName || '',
                          network: wallet.network,
                        })
                      }}
                      aria-label={`Editar carteira ${wallet.label}`}
                      className="border-[#D28A4C] text-xs font-bold text-[#D28A4C] hover:bg-[#D28A4C]/10"
                    >
                      Editar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* MODAL EDITAR CARTEIRA */}
      <Dialog open={!!editingWallet} onOpenChange={(open) => !open && setEditingWallet(null)}>
        <DialogContent className="max-w-md border-[#2D2118] bg-[#16120E] font-mono">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              Editar Dados da Carteira
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8C7A6B]">
              Atualize as informações da carteira.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEditWallet(onSubmitEditWallet)} className="space-y-3.5 pt-2">
            <div>
              <label
                htmlFor="edit-wallet-label"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Apelido da carteira *
              </label>
              <Input
                id="edit-wallet-label"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerEditWallet('label')}
              />
              {editWalletErrors.label && (
                <span className="mt-1 block text-[11px] text-destructive">
                  {editWalletErrors.label.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-wallet-profile"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Nome do perfil *
              </label>
              <Input
                id="edit-wallet-profile"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerEditWallet('profileName')}
              />
            </div>

            <div>
              <label
                htmlFor="edit-wallet-email"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                E-mail *
              </label>
              <Input
                id="edit-wallet-email"
                type="email"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerEditWallet('email')}
              />
            </div>

            <div>
              <label
                htmlFor="edit-wallet-ens"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Nome ENS
              </label>
              <Input
                id="edit-wallet-ens"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerEditWallet('ensName')}
              />
            </div>

            <div>
              <label
                htmlFor="edit-wallet-network"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Rede Blockchain
              </label>
              <select
                id="edit-wallet-network"
                className="w-full rounded-xl border border-[#2D2118] bg-[#120F0D] px-3 py-2 text-xs text-white outline-none"
                {...registerEditWallet('network')}
              >
                <option value="Ethereum">Ethereum</option>
                <option value="Polygon">Polygon</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingWallet(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEditWallet}
                className="bg-[#D28A4C] text-xs font-bold text-[#140D0A]"
              >
                {isSubmittingEditWallet ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ADICIONAR NOVA CARTEIRA */}
      <Dialog open={isAddWalletOpen} onOpenChange={setIsAddWalletOpen}>
        <DialogContent className="max-w-md border-[#2D2118] bg-[#16120E] font-mono">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              Conectar Nova Carteira Web3
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8C7A6B]">
              Preencha os dados completos da carteira do colecionador.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAddWallet(onSubmitAddWallet)} className="space-y-3 pt-2">
            <div>
              <label
                htmlFor="add-wallet-label"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Apelido da carteira *
              </label>
              <Input
                id="add-wallet-label"
                placeholder="Ex: Reserva, Cold Storage"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerAddWallet('label')}
              />
              {addWalletErrors.label && (
                <span className="mt-1 block text-[11px] text-destructive">
                  {addWalletErrors.label.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="add-wallet-profile"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Nome do perfil *
              </label>
              <Input
                id="add-wallet-profile"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerAddWallet('profileName')}
              />
            </div>

            <div>
              <label
                htmlFor="add-wallet-email"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                E-mail *
              </label>
              <Input
                id="add-wallet-email"
                type="email"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerAddWallet('email')}
              />
            </div>

            <div>
              <label
                htmlFor="add-wallet-ens"
                className="mb-1 block text-xs font-semibold text-[#8C7A6B]"
              >
                Nome ENS
              </label>
              <Input
                id="add-wallet-ens"
                placeholder="Ex: nova.kurio.eth"
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerAddWallet('ensName')}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="add-wallet-address"
                  className="text-xs font-semibold text-[#8C7A6B]"
                >
                  Endereço 0x *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateRandomAddress}
                  aria-label="Gerar Aleatório"
                  className="text-[10px] text-[#D28A4C] hover:underline"
                >
                  Gerar Aleatório
                </button>
              </div>
              <Input
                id="add-wallet-address"
                placeholder="0x..."
                className="border-[#2D2118] bg-[#120F0D] text-xs"
                {...registerAddWallet('address')}
              />
              {addWalletErrors.address && (
                <span className="mt-1 block text-[11px] text-destructive">
                  {addWalletErrors.address.message}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddWalletOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingAddWallet}
                aria-label="Cadastrar Carteira"
                className="bg-[#D28A4C] text-xs font-bold text-[#140D0A]"
              >
                {isSubmittingAddWallet ? 'Cadastrando...' : 'Cadastrar Carteira'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
