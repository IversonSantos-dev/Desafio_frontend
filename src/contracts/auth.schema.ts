import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Nome deve conter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  createdAt: z.string(),
})

export const LoginCredentialsSchema = z.object({
  email: z.string().email('Insira um e-mail válido'),
  password: z.string().min(6, 'A senha deve conter no mínimo 6 caracteres'),
})

export const RegisterCredentialsSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Insira um e-mail válido'),
    password: z.string().min(6, 'A senha deve conter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirmação obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
  expiresAt: z.string(),
})

export const SessionSchema = z.object({
  user: UserSchema.nullable(),
  isAuthenticated: z.boolean(),
  token: z.string().nullable(),
})

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
    confirmNewPassword: z.string().min(6, 'Confirmação obrigatória'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'As novas senhas não coincidem',
    path: ['confirmNewPassword'],
  })

export type User = z.infer<typeof UserSchema>
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>
export type RegisterCredentials = z.infer<typeof RegisterCredentialsSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
export type Session = z.infer<typeof SessionSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
