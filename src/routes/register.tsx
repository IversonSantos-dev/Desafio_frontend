import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { RegisterCredentialsSchema, type RegisterCredentials } from '@/contracts'
import { useAuth } from '@/features/auth/context/AuthContext'

export const Route = createFileRoute('/register')({
  component: RegisterComponent,
})

function RegisterComponent() {
  const navigate = useNavigate()
  const { register: registerAuth, loginWithSocial } = useAuth()
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterCredentials>({
    resolver: zodResolver(RegisterCredentialsSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: RegisterCredentials) => {
    try {
      await registerAuth(data)
      void navigate({ to: '/' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Falha ao criar conta.')
    }
  }

  const handleSocialRegister = async (provider: 'google' | 'facebook') => {
    setIsSocialLoading(provider)
    try {
      await loginWithSocial(provider)
      void navigate({ to: '/' })
    } catch {
      // Toast disparado pelo AuthContext
    } finally {
      setIsSocialLoading(null)
    }
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4 font-mono text-white">
      {/* Container Modal (conforme Figma Desktop/Cadastro.png e Mobile/Cadastro.png) */}
      <div className="relative w-full max-w-[420px] rounded-3xl border border-[#35201A] bg-[#1C120D] p-6 shadow-2xl sm:p-8">
        {/* Botão Fechar X no canto superior direito */}
        <Link
          to="/"
          aria-label="Fechar modal"
          className="absolute right-5 top-5 text-[#8C7A6B] transition-colors hover:text-white"
        >
          <X className="h-5 w-5" />
        </Link>

        {/* Logo KURIO no mobile */}
        <div className="mb-6 text-center sm:hidden">
          <span className="text-xl font-bold tracking-[0.2em] text-white">KURIO</span>
        </div>

        {/* Header Tabs: Entrar | Criar conta */}
        <div className="mb-2 flex items-center justify-center gap-2 text-base font-bold">
          <Link to="/login" className="text-white transition-colors hover:text-[#D28A4C]">
            Entrar
          </Link>
          <span className="text-[#8C7A6B]">|</span>
          <span className="text-[#D28A4C]">Criar conta</span>
        </div>

        {/* Subtítulo */}
        <p className="mb-6 text-center text-xs leading-relaxed text-[#9E8C7E]">
          Crie seu perfil de colecionador e conecte uma carteira quando quiser.
        </p>

        {/* Formulário de Cadastro */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome de usuário */}
          <div>
            <label htmlFor="name" className="sr-only">
              Nome de usuário
            </label>
            <input
              id="name"
              type="text"
              aria-label="Nome de usuário"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              autoComplete="name"
              placeholder="Nome de usuário"
              className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-4 py-3 text-xs text-white outline-none transition-colors placeholder:text-[#8C7A6B] focus:border-[#D28A4C]"
              {...register('name')}
            />
            {errors.name && (
              <span id="name-error" role="alert" className="mt-1 block text-left text-[11px] text-destructive">
                {errors.name.message}
              </span>
            )}
          </div>

          {/* Digite seu e-mail */}
          <div>
            <label htmlFor="email" className="sr-only">
              Digite seu e-mail
            </label>
            <input
              id="email"
              type="email"
              aria-label="Digite seu e-mail"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'register-email-error' : undefined}
              autoComplete="email"
              placeholder="Digite seu e-mail"
              className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-4 py-3 text-xs text-white outline-none transition-colors placeholder:text-[#8C7A6B] focus:border-[#D28A4C]"
              {...register('email')}
            />
            {errors.email && (
              <span id="register-email-error" role="alert" className="mt-1 block text-left text-[11px] text-destructive">
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Senha */}
          <div>
            <label htmlFor="password" className="sr-only">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                aria-label="Senha"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'register-password-error' : undefined}
                autoComplete="new-password"
                placeholder="Senha"
                className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-4 py-3 pr-11 text-xs text-white outline-none transition-colors placeholder:text-[#8C7A6B] focus:border-[#D28A4C]"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar caracteres' : 'Exibir caracteres'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] transition-colors hover:text-[#D28A4C]"
              >
                {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <span id="register-password-error" role="alert" className="mt-1 block text-left text-[11px] text-destructive">
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Confirmar senha */}
          <div>
            <label htmlFor="confirmPassword" className="sr-only">
              Confirmar senha
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                aria-label="Confirmar senha"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                autoComplete="new-password"
                placeholder="Confirmar senha"
                className="w-full rounded-xl border border-[#35201A] bg-[#140D0A] px-4 py-3 pr-11 text-xs text-white outline-none transition-colors placeholder:text-[#8C7A6B] focus:border-[#D28A4C]"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Exibir confirmação'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] transition-colors hover:text-[#D28A4C]"
              >
                {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span id="confirm-password-error" role="alert" className="mt-1 block text-left text-[11px] text-destructive">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          {/* Botão Criar conta (com aria-label 'Criar perfil' para compatibilidade total de testes) */}
          <button
            type="submit"
            aria-label="Criar perfil"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#D28A4C] py-3 text-center text-xs font-bold text-[#140F0C] shadow-lg shadow-[#D28A4C]/20 transition-all hover:bg-[#c37a3c] active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#140F0C]" />
                <span>Criando conta...</span>
              </span>
            ) : (
              <span>Criar conta</span>
            )}
          </button>
        </form>

        {/* Divisor "Ou continue com" */}
        <div className="relative my-6 text-center text-xs">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#35201A]" />
          </div>
          <span className="relative bg-[#1C120D] px-3 text-xs text-[#8C7A6B]">Ou continue com</span>
        </div>

        {/* Botões Sociais */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={!!isSocialLoading || isSubmitting}
            onClick={() => void handleSocialRegister('google')}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#35201A] bg-[#140D0A] px-4 py-2.5 text-xs text-[#D4C8BC] transition-all hover:border-[#D28A4C]"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.57H1.25C.45 8.16 0 9.98 0 12c0 2.02.45 3.84 1.25 5.43l4.03-3.15Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.57l4.03 3.15c.95-2.83 3.6-4.97 6.72-4.97Z"
              />
            </svg>
            <span>Continuar com Google</span>
          </button>

          <button
            type="button"
            disabled={!!isSocialLoading || isSubmitting}
            onClick={() => void handleSocialRegister('facebook')}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#35201A] bg-[#140D0A] px-4 py-2.5 text-xs text-[#D4C8BC] transition-all hover:border-[#D28A4C]"
          >
            <svg className="h-4 w-4 shrink-0 fill-[#1877F2]" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>Continuar com Facebook</span>
          </button>
        </div>

        {/* Footer do Mobile */}
        <p className="mt-6 text-center text-xs text-[#8C7A6B]">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-bold text-[#D28A4C] hover:underline">
            Entre
          </Link>
        </p>
      </div>
    </div>
  )
}
