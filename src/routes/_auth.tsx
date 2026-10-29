import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/context/AuthContext'

export const Route = createFileRoute('/_auth')({
  component: AuthGuardLayout,
})

function AuthGuardLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({
        to: '/login',
        search: { redirect: window.location.pathname },
      })
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading) {
    return (
      <div className="container space-y-4 py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-full">
      <Outlet />
    </div>
  )
}
