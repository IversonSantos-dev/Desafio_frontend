import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
        outline: 'text-foreground',
        mythic:
          'border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 font-bold',
        legendary:
          'border-purple-500/50 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 font-bold',
        epic: 'border-blue-500/50 bg-blue-500/20 text-blue-300',
        rare: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300',
        common: 'border-zinc-500/50 bg-zinc-500/20 text-zinc-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
