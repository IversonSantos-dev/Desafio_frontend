import type * as React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-testid="skeleton"
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-xl bg-muted/40 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent motion-reduce:before:hidden',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
